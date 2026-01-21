import { Response } from "express";
import { z, ZodError } from "zod";
import { prisma } from "../config/database";
import { addEmailJobs } from "../queues/email.queue";
import { calculateScheduledTimes } from "../services/ratelimit.service";
import {
  AuthenticatedRequest,
  ApiResponse,
  EmailResponse,
  ScheduleEmailResponse,
  EmailJobData,
  PaginationInfo,
} from "../types";
import { EmailStatus } from "@prisma/client";
import path from "path";
import fs from "fs";

/**
 * Email Scheduling Controller
 *
 * Handles email scheduling, retrieval, and status management.
 */

// Validation schemas
export const scheduleEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(500),
  body: z.string().min(1, "Body is required"),
  recipients: z
    .array(z.string().email("Invalid email address"))
    .min(1, "At least one recipient is required"),
  startTime: z.string().datetime("Invalid datetime format"),
  delayBetweenEmails: z.number().int().min(0).max(3600).default(1),
  hourlyLimit: z.number().int().min(1).max(1000).default(100),
  senderId: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val))
    .refine(
      (val) =>
        val === undefined ||
        val === null ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          val,
        ),
      { message: "Invalid sender ID format" },
    ),
});

export const getEmailsQuerySchema = z.object({
  status: z
    .enum(["SCHEDULED", "PROCESSING", "SENT", "FAILED", "RATE_LIMITED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["scheduledAt", "createdAt", "sentAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Schedule emails
 */
export const scheduleEmails = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<ScheduleEmailResponse>>,
): Promise<void> => {
  try {
    const userId = req.userId!;

    // Parse FormData body (recipients are JSON stringified)
    const parsedBody = {
      ...req.body,
      recipients: req.body.recipients ? JSON.parse(req.body.recipients) : [],
      delayBetweenEmails: parseInt(req.body.delayBetweenEmails) || 30,
      hourlyLimit: parseInt(req.body.hourlyLimit) || 50,
    };

    const data = scheduleEmailSchema.parse(parsedBody);

    console.log(
      `📧 Scheduling ${data.recipients.length} emails for user ${userId}`,
    );
    console.log(
      `📧 Request data:`,
      JSON.stringify({ ...data, body: data.body.substring(0, 100) + "..." }),
    );

    // Process attachments from uploaded files
    const attachments = req.files
      ? (req.files as Express.Multer.File[]).map(file => ({
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: file.path,
      }))
      : [];

    console.log(`📎 Attachments: ${attachments.length} files`);

    let senderIdToUse = data.senderId;

    // If no senderId provided, try to get a default sender
    if (!senderIdToUse) {
      const defaultSender = await prisma.sender.findFirst({
        where: {
          userId,
          isActive: true,
          isDefault: true,
        },
      });

      if (!defaultSender) {
        // Try to get any active sender
        const anySender = await prisma.sender.findFirst({
          where: {
            userId,
            isActive: true,
          },
        });

        if (!anySender) {
          console.error("No sender found for user:", userId);
          res.status(400).json({
            success: false,
            error: "No sender configured. Please add a sender email first.",
          });
          return;
        }
        senderIdToUse = anySender.id;
      } else {
        senderIdToUse = defaultSender.id;
      }
    } else {
      // Validate the provided sender
      const sender = await prisma.sender.findFirst({
        where: {
          id: senderIdToUse,
          userId,
          isActive: true,
        },
      });

      if (!sender) {
        console.error("Invalid sender ID:", senderIdToUse, "for user:", userId);
        res.status(400).json({
          success: false,
          error: "Invalid or inactive sender",
        });
        return;
      }
    }

    console.log(`📧 Using sender ID: ${senderIdToUse}`);

    // Ensure senderIdToUse is defined at this point
    if (!senderIdToUse) {
      console.error("Sender ID is still undefined after validation");
      res.status(500).json({
        success: false,
        error: "Internal error: Sender ID resolution failed",
      });
      return;
    }

    // Calculate scheduled times respecting rate limits
    const startTime = new Date(data.startTime);
    console.log(`📧 Start time: ${startTime.toISOString()}`);

    const scheduledTimes = await calculateScheduledTimes(
      data.recipients.length,
      startTime,
      data.delayBetweenEmails,
      data.hourlyLimit,
      senderIdToUse,
    );

    console.log(`📧 Calculated ${scheduledTimes.length} scheduled times`);

    // Create batch record
    const batch = await prisma.emailBatch.create({
      data: {
        userId,
        totalEmails: data.recipients.length,
        scheduledEmails: data.recipients.length,
        startTime,
        delayBetweenEmails: data.delayBetweenEmails,
        hourlyLimit: data.hourlyLimit,
      },
    });

    console.log(`📧 Created batch: ${batch.id}`);

    // Create email records in database
    const emails = await Promise.all(
      data.recipients.map(async (recipient, index) => {
        return prisma.email.create({
          data: {
            userId,
            senderId: senderIdToUse,
            recipientEmail: recipient,
            subject: data.subject,
            body: data.body,
            scheduledAt: scheduledTimes[index],
            batchId: batch.id,
            batchIndex: index,
            status: "SCHEDULED",
            attachments: attachments.length > 0 ? attachments : null,
          },
        });
      }),
    );

    // Add jobs to queue
    try {
      const jobsData = emails.map((email, index) => ({
        data: {
          emailId: email.id,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          senderId: senderIdToUse,
          userId,
          batchId: batch.id,
          attemptNumber: 1,
          attachments: attachments.length > 0 ? attachments : undefined,
        } as EmailJobData,
        scheduledAt: scheduledTimes[index],
        priority: index,
      }));

      const jobIds = await addEmailJobs(jobsData);

      // Update emails with job IDs
      await Promise.all(
        emails.map((email, index) =>
          prisma.email.update({
            where: { id: email.id },
            data: { jobId: jobIds[index] },
          }),
        ),
      );

      console.log(
        `✅ Successfully scheduled ${emails.length} emails (batch: ${batch.id})`,
      );

      res.status(201).json({
        success: true,
        data: {
          batchId: batch.id,
          totalEmails: emails.length,
          scheduledEmails: emails,
        },
        message: `Successfully scheduled ${emails.length} emails`,
      });
      return;
    } catch (queueError) {
      console.error("❌ Failed to add jobs to queue:", queueError);

      // Mark emails as FAILED so the user sees them and can retry/delete
      await prisma.email.updateMany({
        where: { batchId: batch.id },
        data: {
          status: "FAILED",
          errorMessage:
            queueError instanceof Error
              ? queueError.message
              : "Failed to add to queue (System Error)",
        },
      });

      throw queueError;
    }
  } catch (error) {
    console.error("Error scheduling emails:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }

    // Handle Zod validation errors with 400 status
    if (error instanceof ZodError) {
      const errorMessages = error.errors.map(
        (e) => `${e.path.join(".")}: ${e.message}`,
      );
      res.status(400).json({
        success: false,
        error: "Validation failed: " + errorMessages.join(", "),
      });
      return;
    }

    // Provide more detailed error message
    let errorMessage = "Failed to schedule emails";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for specific error types
      if (
        error.message.includes("Redis") ||
        error.message.includes("ECONNREFUSED")
      ) {
        errorMessage = "Queue service unavailable. Please try again later.";
      } else if (
        error.message.includes("Prisma") ||
        error.message.includes("database")
      ) {
        errorMessage = "Database error. Please try again later.";
      }
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * Get scheduled emails
 */
export const getScheduledEmails = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<EmailResponse[]>>,
): Promise<void> => {
  try {
    const userId = req.userId!;
    const query = getEmailsQuerySchema.parse(req.query);

    const where = {
      userId,
      status: {
        in: ["SCHEDULED", "PROCESSING", "RATE_LIMITED"] as EmailStatus[],
      },
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              name: true,
              isDefault: true,
              isActive: true,
            },
          },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.email.count({ where }),
    ]);

    const pagination: PaginationInfo = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      hasMore: query.page * query.limit < total,
    };

    const emailResponses: EmailResponse[] = emails.map((email) => ({
      id: email.id,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      body: email.body,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      status: email.status,
      errorMessage: email.errorMessage,
      previewUrl: email.previewUrl,
      sender: email.sender,
      createdAt: email.createdAt,
      attachments: email.attachments as any,
    }));

    res.json({
      success: true,
      data: emailResponses,
      pagination,
    });
  } catch (error) {
    console.error("Error getting scheduled emails:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get scheduled emails",
    });
  }
};

/**
 * Get sent emails
 */
export const getSentEmails = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<EmailResponse[]>>,
): Promise<void> => {
  try {
    const userId = req.userId!;
    const query = getEmailsQuerySchema.parse(req.query);

    const where = {
      userId,
      status: {
        in: ["SENT", "FAILED"] as EmailStatus[],
      },
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              name: true,
              isDefault: true,
              isActive: true,
            },
          },
        },
        orderBy: { sentAt: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.email.count({ where }),
    ]);

    const pagination: PaginationInfo = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
      hasMore: query.page * query.limit < total,
    };

    const emailResponses: EmailResponse[] = emails.map((email) => ({
      id: email.id,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      body: email.body,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      status: email.status,
      errorMessage: email.errorMessage,
      previewUrl: email.previewUrl,
      sender: email.sender,
      createdAt: email.createdAt,
      attachments: email.attachments as any,
    }));

    res.json({
      success: true,
      data: emailResponses,
      pagination,
    });
  } catch (error) {
    console.error("Error getting sent emails:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get sent emails",
    });
  }
};

/**
 * Get email statistics
 */
export const getEmailStats = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const userId = req.userId!;

    const [scheduled, processing, sent, failed, rateLimited] =
      await Promise.all([
        prisma.email.count({ where: { userId, status: "SCHEDULED" } }),
        prisma.email.count({ where: { userId, status: "PROCESSING" } }),
        prisma.email.count({ where: { userId, status: "SENT" } }),
        prisma.email.count({ where: { userId, status: "FAILED" } }),
        prisma.email.count({ where: { userId, status: "RATE_LIMITED" } }),
      ]);

    res.json({
      success: true,
      data: {
        scheduled,
        processing,
        sent,
        failed,
        rateLimited,
        total: scheduled + processing + sent + failed + rateLimited,
      },
    });
  } catch (error) {
    console.error("Error getting email stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get email statistics",
    });
  }
};

/**
 * Get single email by ID
 */
export const getEmailById = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse<EmailResponse>>,
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const email = await prisma.email.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            name: true,
            isDefault: true,
            isActive: true,
          },
        },
      },
    });

    if (!email) {
      res.status(404).json({
        success: false,
        error: "Email not found",
      });
      return;
    }

    const emailResponse: EmailResponse = {
      id: email.id,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      body: email.body,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
      status: email.status,
      errorMessage: email.errorMessage,
      previewUrl: email.previewUrl,
      sender: email.sender,
      createdAt: email.createdAt,
      attachments: email.attachments as any,
    };

    res.json({
      success: true,
      data: emailResponse,
    });
  } catch (error) {
    console.error("Error getting email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get email",
    });
  }
};

/**
 * Delete an email (cancel if scheduled)
 */
export const cancelEmail = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const email = await prisma.email.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!email) {
      res.status(404).json({
        success: false,
        error: "Email not found",
      });
      return;
    }

    // If it's scheduled, we should ideally remove it from the queue
    // But for now, just deleting the record prevents it from being processed (worker checks existence)

    await prisma.email.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Email deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete email",
    });
  }
};

/**
 * Download/view email attachment
 */
export const getAttachment = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id, index } = req.params;

    // Get the email and verify ownership
    const email = await prisma.email.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!email) {
      res.status(404).json({
        success: false,
        error: "Email not found",
      });
      return;
    }

    // Get attachments
    const attachments = email.attachments as any[];
    if (!attachments || attachments.length === 0) {
      res.status(404).json({
        success: false,
        error: "No attachments found",
      });
      return;
    }

    const attachmentIndex = parseInt(index);
    if (attachmentIndex < 0 || attachmentIndex >= attachments.length) {
      res.status(404).json({
        success: false,
        error: "Attachment not found",
      });
      return;
    }

    const attachment = attachments[attachmentIndex];
    const filePath = path.resolve(attachment.path);

    // Security check: ensure file exists and is within uploads directory
    const uploadsDir = path.resolve(__dirname, "../../uploads");
    if (!filePath.startsWith(uploadsDir)) {
      res.status(403).json({
        success: false,
        error: "Access denied",
      });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        error: "File not found on server",
      });
      return;
    }

    // Set headers for file download
    res.setHeader("Content-Type", attachment.mimetype);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(attachment.filename)}"`,
    );
    res.setHeader("Content-Length", attachment.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error getting attachment:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get attachment",
    });
  }
};

export default {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  getEmailStats,
  getEmailById,
  cancelEmail,
  getAttachment,
};
