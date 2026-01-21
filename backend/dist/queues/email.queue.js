"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeQueue = exports.resumeQueue = exports.pauseQueue = exports.cleanOldJobs = exports.getQueueStats = exports.rescheduleJob = exports.addEmailJobs = exports.addEmailJob = exports.generateJobId = exports.queueEvents = exports.emailQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const config_1 = require("../config");
/**
 * Email Queue
 *
 * BullMQ queue for handling email jobs with:
 * - Delayed job support (scheduling)
 * - Retry with exponential backoff
 * - Job deduplication via deterministic job IDs
 * - Priority support
 * - Rate limiting via limiter config
 */
// Queue name
const QUEUE_NAME = 'email-queue';
// Redis connection for queue
const connection = (0, redis_1.createRedisConnection)();
// Create the queue with advanced configuration
exports.emailQueue = new bullmq_1.Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
        attempts: config_1.config.worker.maxRetries,
        backoff: {
            type: 'exponential',
            delay: config_1.config.worker.retryDelay,
        },
        removeOnComplete: {
            age: 24 * 60 * 60, // Keep completed jobs for 24 hours
            count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
        },
    },
});
// Queue events for monitoring
exports.queueEvents = new bullmq_1.QueueEvents(QUEUE_NAME, { connection: (0, redis_1.createRedisConnection)() });
// Log queue events in development
if (config_1.config.env === 'development') {
    exports.queueEvents.on('completed', ({ jobId }) => {
        console.log(`📧 Job ${jobId} completed`);
    });
    exports.queueEvents.on('failed', ({ jobId, failedReason }) => {
        console.log(`❌ Job ${jobId} failed: ${failedReason}`);
    });
    exports.queueEvents.on('delayed', ({ jobId, delay }) => {
        console.log(`⏰ Job ${jobId} delayed by ${delay}ms`);
    });
}
/**
 * Generate a deterministic job ID for idempotency
 * This ensures the same email won't be queued twice
 */
const generateJobId = (emailId, attemptNumber = 1) => {
    return `email:${emailId}:attempt:${attemptNumber}`;
};
exports.generateJobId = generateJobId;
/**
 * Add a single email job to the queue
 */
const addEmailJob = async (data, scheduledAt, priority = 0) => {
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    const jobId = (0, exports.generateJobId)(data.emailId, data.attemptNumber);
    const jobOptions = {
        jobId,
        delay,
        priority,
        attempts: config_1.config.worker.maxRetries,
    };
    const job = await exports.emailQueue.add('send-email', data, jobOptions);
    console.log(`📬 Email job queued: ${job.id} (delay: ${delay}ms, scheduled: ${scheduledAt.toISOString()})`);
    return job.id;
};
exports.addEmailJob = addEmailJob;
/**
 * Add multiple email jobs to the queue (batch)
 */
const addEmailJobs = async (jobs) => {
    const bulkJobs = jobs.map(({ data, scheduledAt, priority = 0 }) => {
        const delay = Math.max(0, scheduledAt.getTime() - Date.now());
        const jobId = (0, exports.generateJobId)(data.emailId, data.attemptNumber);
        return {
            name: 'send-email',
            data,
            opts: {
                jobId,
                delay,
                priority,
                attempts: config_1.config.worker.maxRetries,
            },
        };
    });
    const addedJobs = await exports.emailQueue.addBulk(bulkJobs);
    const jobIds = addedJobs.map((job) => job.id);
    console.log(`📬 Batch of ${jobIds.length} email jobs queued`);
    return jobIds;
};
exports.addEmailJobs = addEmailJobs;
/**
 * Reschedule a job for the next available hour (rate limit handling)
 */
const rescheduleJob = async (data, nextAvailableTime) => {
    // Increment attempt number for new job ID
    const newData = {
        ...data,
        attemptNumber: data.attemptNumber + 1,
    };
    return (0, exports.addEmailJob)(newData, nextAvailableTime);
};
exports.rescheduleJob = rescheduleJob;
/**
 * Get queue statistics
 */
const getQueueStats = async () => {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        exports.emailQueue.getWaitingCount(),
        exports.emailQueue.getActiveCount(),
        exports.emailQueue.getCompletedCount(),
        exports.emailQueue.getFailedCount(),
        exports.emailQueue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
};
exports.getQueueStats = getQueueStats;
/**
 * Clean completed and failed jobs older than specified time
 */
const cleanOldJobs = async (maxAge = 7 * 24 * 60 * 60 * 1000) => {
    await exports.emailQueue.clean(maxAge, 100, 'completed');
    await exports.emailQueue.clean(maxAge, 100, 'failed');
};
exports.cleanOldJobs = cleanOldJobs;
/**
 * Pause the queue
 */
const pauseQueue = async () => {
    await exports.emailQueue.pause();
    console.log('⏸️ Email queue paused');
};
exports.pauseQueue = pauseQueue;
/**
 * Resume the queue
 */
const resumeQueue = async () => {
    await exports.emailQueue.resume();
    console.log('▶️ Email queue resumed');
};
exports.resumeQueue = resumeQueue;
/**
 * Close queue connections
 */
const closeQueue = async () => {
    await exports.queueEvents.close();
    await exports.emailQueue.close();
    console.log('📧 Email queue closed');
};
exports.closeQueue = closeQueue;
exports.default = {
    emailQueue: exports.emailQueue,
    queueEvents: exports.queueEvents,
    generateJobId: exports.generateJobId,
    addEmailJob: exports.addEmailJob,
    addEmailJobs: exports.addEmailJobs,
    rescheduleJob: exports.rescheduleJob,
    getQueueStats: exports.getQueueStats,
    cleanOldJobs: exports.cleanOldJobs,
    pauseQueue: exports.pauseQueue,
    resumeQueue: exports.resumeQueue,
    closeQueue: exports.closeQueue,
};
//# sourceMappingURL=email.queue.js.map