import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { config } from '../config';
import { prisma } from '../config/database';
import { sendEmail } from '../services/email.service';
import { checkRateLimit, incrementRateLimit, getNextAvailableSlot } from '../services/ratelimit.service';
import { rescheduleJob } from '../queues/email.queue';
import { EmailJobData, EmailJobResult } from '../types';

/**
 * Email Worker
 * 
 * BullMQ worker that:
 * - Processes email jobs concurrently (configurable)
 * - Handles rate limiting gracefully (reschedules instead of failing)
 * - Updates database after each send
 * - Supports server restarts (jobs survive in Redis)
 * - Implements retry with exponential backoff
 */

const QUEUE_NAME = 'email-queue';

// Process a single email job
const processEmailJob = async (job: Job<EmailJobData>): Promise<EmailJobResult> => {
    const { emailId, recipientEmail, subject, body, senderId, userId } = job.data;

    console.log(`🔄 Processing job ${job.id}: ${recipientEmail}`);

    try {
        // Update email status to PROCESSING
        await prisma.email.update({
            where: { id: emailId },
            data: {
                status: 'PROCESSING',
                jobId: job.id,
            },
        });

        // Check rate limit before sending
        const rateCheck = await checkRateLimit(senderId);

        if (!rateCheck.allowed) {
            console.log(`⏳ Rate limit reached for job ${job.id}, rescheduling...`);

            // Update status to RATE_LIMITED
            await prisma.email.update({
                where: { id: emailId },
                data: {
                    status: 'RATE_LIMITED',
                },
            });

            // Get next available slot and reschedule
            const nextSlot = await getNextAvailableSlot(senderId);
            await rescheduleJob(job.data, nextSlot);

            return {
                success: false,
                error: `Rate limited. Rescheduled for ${nextSlot.toISOString()}`,
            };
        }

        // Get sender info for the from address
        let fromAddress = 'noreply@emailscheduler.com';
        let fromName = 'Email Scheduler';
        let smtpConfig;

        if (senderId) {
            const sender = await prisma.sender.findUnique({
                where: { id: senderId },
            });

            if (sender) {
                fromAddress = sender.email;
                fromName = sender.name;

                if (sender.smtpHost && sender.smtpUser && sender.smtpPass) {
                    smtpConfig = {
                        host: sender.smtpHost,
                        port: sender.smtpPort || 587,
                        secure: sender.smtpPort === 465,
                        auth: {
                            user: sender.smtpUser,
                            pass: sender.smtpPass,
                        },
                    };
                }
            }
        }

        // Send the email
        const result = await sendEmail(
            {
                from: `"${fromName}" <${fromAddress}>`,
                to: recipientEmail,
                subject,
                html: body,
            },
            smtpConfig
        );

        if (result.success) {
            // Increment rate limit counter
            await incrementRateLimit(senderId);

            // Update email status to SENT
            await prisma.email.update({
                where: { id: emailId },
                data: {
                    status: 'SENT',
                    sentAt: new Date(),
                    messageId: result.messageId,
                    previewUrl: result.previewUrl,
                },
            });

            // Update batch counters if applicable
            const email = await prisma.email.findUnique({
                where: { id: emailId },
                select: { batchId: true },
            });

            if (email?.batchId) {
                await prisma.emailBatch.update({
                    where: { id: email.batchId },
                    data: {
                        sentEmails: { increment: 1 },
                    },
                });
            }

            console.log(`✅ Email sent successfully: ${recipientEmail}`);

            return {
                success: true,
                messageId: result.messageId,
                previewUrl: result.previewUrl,
            };
        } else {
            throw new Error(result.error || 'Unknown email sending error');
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        console.error(`❌ Failed to process job ${job.id}: ${errorMessage}`);

        // Get current email to check retry count
        const email = await prisma.email.findUnique({
            where: { id: emailId },
        });

        const retryCount = (email?.retryCount || 0) + 1;
        const maxRetries = email?.maxRetries || config.worker.maxRetries;

        if (retryCount >= maxRetries) {
            // Max retries reached, mark as FAILED
            await prisma.email.update({
                where: { id: emailId },
                data: {
                    status: 'FAILED',
                    errorMessage,
                    retryCount,
                },
            });

            // Update batch counters if applicable
            if (email?.batchId) {
                await prisma.emailBatch.update({
                    where: { id: email.batchId },
                    data: {
                        failedEmails: { increment: 1 },
                    },
                });
            }
        } else {
            // Update retry count
            await prisma.email.update({
                where: { id: emailId },
                data: {
                    status: 'SCHEDULED',
                    errorMessage,
                    retryCount,
                },
            });
        }

        return {
            success: false,
            error: errorMessage,
        };
    }
};

// Create the worker
export const createEmailWorker = (): Worker<EmailJobData, EmailJobResult> => {
    const connection = createRedisConnection();

    const worker = new Worker<EmailJobData, EmailJobResult>(
        QUEUE_NAME,
        processEmailJob,
        {
            connection: config.redis,
            concurrency: config.worker.concurrency,
            limiter: {
                max: config.rateLimit.maxEmailsPerHour,
                duration: 60 * 60 * 1000, // 1 hour in milliseconds
            },
        }
    );

    // Worker event handlers
    worker.on('ready', () => {
        console.log(`🚀 Email worker ready (concurrency: ${config.worker.concurrency})`);
    });

    worker.on('completed', (job: Job, result: EmailJobResult) => {
        if (result.success) {
            console.log(`✅ Job ${job.id} completed successfully`);
        } else {
            console.log(`⚠️ Job ${job.id} completed with issues: ${result.error}`);
        }
    });

    worker.on('failed', (job: Job | undefined, error: Error) => {
        console.error(`❌ Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error: Error) => {
        console.error('❌ Worker error:', error.message);
    });

    worker.on('stalled', (jobId: string) => {
        console.warn(`⚠️ Job ${jobId} stalled`);
    });

    return worker;
};

export default createEmailWorker;
