"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelEmail = exports.getEmailById = exports.getEmailStats = exports.getSentEmails = exports.getScheduledEmails = exports.scheduleEmails = exports.getEmailsQuerySchema = exports.scheduleEmailSchema = void 0;
const zod_1 = require("zod");
const database_1 = require("../config/database");
const email_queue_1 = require("../queues/email.queue");
const ratelimit_service_1 = require("../services/ratelimit.service");
/**
 * Email Scheduling Controller
 *
 * Handles email scheduling, retrieval, and status management.
 */
// Validation schemas
exports.scheduleEmailSchema = zod_1.z.object({
    subject: zod_1.z.string().min(1, 'Subject is required').max(500),
    body: zod_1.z.string().min(1, 'Body is required'),
    recipients: zod_1.z.array(zod_1.z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
    startTime: zod_1.z.string().datetime('Invalid datetime format'),
    delayBetweenEmails: zod_1.z.number().int().min(0).max(3600).default(1),
    hourlyLimit: zod_1.z.number().int().min(1).max(1000).default(100),
    senderId: zod_1.z.string().uuid().optional(),
});
exports.getEmailsQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(['SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'RATE_LIMITED']).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.enum(['scheduledAt', 'createdAt', 'sentAt']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
/**
 * Schedule emails
 */
const scheduleEmails = async (req, res) => {
    try {
        const userId = req.userId;
        const data = exports.scheduleEmailSchema.parse(req.body);
        console.log(`📧 Scheduling ${data.recipients.length} emails for user ${userId}`);
        // Validate sender if provided
        if (data.senderId) {
            const sender = await database_1.prisma.sender.findFirst({
                where: {
                    id: data.senderId,
                    userId,
                    isActive: true,
                },
            });
            if (!sender) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid or inactive sender',
                });
                return;
            }
        }
        // Calculate scheduled times respecting rate limits
        const startTime = new Date(data.startTime);
        const scheduledTimes = await (0, ratelimit_service_1.calculateScheduledTimes)(data.recipients.length, startTime, data.delayBetweenEmails, data.hourlyLimit, data.senderId);
        // Create batch record
        const batch = await database_1.prisma.emailBatch.create({
            data: {
                userId,
                totalEmails: data.recipients.length,
                scheduledEmails: data.recipients.length,
                startTime,
                delayBetweenEmails: data.delayBetweenEmails,
                hourlyLimit: data.hourlyLimit,
            },
        });
        // Create email records in database
        const emails = await Promise.all(data.recipients.map(async (recipient, index) => {
            return database_1.prisma.email.create({
                data: {
                    userId,
                    senderId: data.senderId,
                    recipientEmail: recipient,
                    subject: data.subject,
                    body: data.body,
                    scheduledAt: scheduledTimes[index],
                    batchId: batch.id,
                    batchIndex: index,
                    status: 'SCHEDULED',
                },
            });
        }));
        // Add jobs to queue
        const jobsData = emails.map((email, index) => ({
            data: {
                emailId: email.id,
                recipientEmail: email.recipientEmail,
                subject: email.subject,
                body: email.body,
                senderId: data.senderId,
                userId,
                batchId: batch.id,
                attemptNumber: 1,
            },
            scheduledAt: scheduledTimes[index],
            priority: index, // Earlier emails have higher priority
        }));
        const jobIds = await (0, email_queue_1.addEmailJobs)(jobsData);
        // Update emails with job IDs
        await Promise.all(emails.map((email, index) => database_1.prisma.email.update({
            where: { id: email.id },
            data: { jobId: jobIds[index] },
        })));
        console.log(`✅ Successfully scheduled ${emails.length} emails (batch: ${batch.id})`);
        res.status(201).json({
            success: true,
            data: {
                batchId: batch.id,
                totalEmails: emails.length,
                scheduledEmails: emails,
            },
            message: `Successfully scheduled ${emails.length} emails`,
        });
    }
    catch (error) {
        console.error('Error scheduling emails:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to schedule emails',
        });
    }
};
exports.scheduleEmails = scheduleEmails;
/**
 * Get scheduled emails
 */
const getScheduledEmails = async (req, res) => {
    try {
        const userId = req.userId;
        const query = exports.getEmailsQuerySchema.parse(req.query);
        const where = {
            userId,
            status: {
                in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'],
            },
        };
        const [emails, total] = await Promise.all([
            database_1.prisma.email.findMany({
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
            database_1.prisma.email.count({ where }),
        ]);
        const pagination = {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
            hasMore: query.page * query.limit < total,
        };
        const emailResponses = emails.map((email) => ({
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
        }));
        res.json({
            success: true,
            data: emailResponses,
            pagination,
        });
    }
    catch (error) {
        console.error('Error getting scheduled emails:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get scheduled emails',
        });
    }
};
exports.getScheduledEmails = getScheduledEmails;
/**
 * Get sent emails
 */
const getSentEmails = async (req, res) => {
    try {
        const userId = req.userId;
        const query = exports.getEmailsQuerySchema.parse(req.query);
        const where = {
            userId,
            status: {
                in: ['SENT', 'FAILED'],
            },
        };
        const [emails, total] = await Promise.all([
            database_1.prisma.email.findMany({
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
            database_1.prisma.email.count({ where }),
        ]);
        const pagination = {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
            hasMore: query.page * query.limit < total,
        };
        const emailResponses = emails.map((email) => ({
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
        }));
        res.json({
            success: true,
            data: emailResponses,
            pagination,
        });
    }
    catch (error) {
        console.error('Error getting sent emails:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sent emails',
        });
    }
};
exports.getSentEmails = getSentEmails;
/**
 * Get email statistics
 */
const getEmailStats = async (req, res) => {
    try {
        const userId = req.userId;
        const [scheduled, processing, sent, failed, rateLimited] = await Promise.all([
            database_1.prisma.email.count({ where: { userId, status: 'SCHEDULED' } }),
            database_1.prisma.email.count({ where: { userId, status: 'PROCESSING' } }),
            database_1.prisma.email.count({ where: { userId, status: 'SENT' } }),
            database_1.prisma.email.count({ where: { userId, status: 'FAILED' } }),
            database_1.prisma.email.count({ where: { userId, status: 'RATE_LIMITED' } }),
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
    }
    catch (error) {
        console.error('Error getting email stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get email statistics',
        });
    }
};
exports.getEmailStats = getEmailStats;
/**
 * Get single email by ID
 */
const getEmailById = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const email = await database_1.prisma.email.findFirst({
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
                error: 'Email not found',
            });
            return;
        }
        const emailResponse = {
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
        };
        res.json({
            success: true,
            data: emailResponse,
        });
    }
    catch (error) {
        console.error('Error getting email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get email',
        });
    }
};
exports.getEmailById = getEmailById;
/**
 * Cancel a scheduled email
 */
const cancelEmail = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const email = await database_1.prisma.email.findFirst({
            where: {
                id,
                userId,
                status: {
                    in: ['SCHEDULED', 'RATE_LIMITED'],
                },
            },
        });
        if (!email) {
            res.status(404).json({
                success: false,
                error: 'Email not found or cannot be cancelled',
            });
            return;
        }
        // Update status to FAILED with cancellation message
        await database_1.prisma.email.update({
            where: { id },
            data: {
                status: 'FAILED',
                errorMessage: 'Cancelled by user',
            },
        });
        res.json({
            success: true,
            message: 'Email cancelled successfully',
        });
    }
    catch (error) {
        console.error('Error cancelling email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel email',
        });
    }
};
exports.cancelEmail = cancelEmail;
exports.default = {
    scheduleEmails: exports.scheduleEmails,
    getScheduledEmails: exports.getScheduledEmails,
    getSentEmails: exports.getSentEmails,
    getEmailStats: exports.getEmailStats,
    getEmailById: exports.getEmailById,
    cancelEmail: exports.cancelEmail,
};
//# sourceMappingURL=email.controller.js.map