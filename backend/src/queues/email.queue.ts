import { Queue, QueueEvents, JobsOptions } from "bullmq";
import { createRedisConnection } from "../config/redis";
import { config } from "../config";
import { EmailJobData } from "../types";

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
const QUEUE_NAME = "email-queue";

// Redis connection for queue
const connection = createRedisConnection();

// Create the queue with advanced configuration
export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, {
  connection: config.redis,
  defaultJobOptions: {
    attempts: config.worker.maxRetries,
    backoff: {
      type: "exponential",
      delay: config.worker.retryDelay,
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
export const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: config.redis,
});

// Log queue events in development
if (config.env === "development") {
  queueEvents.on("completed", ({ jobId }) => {
    console.log(`📧 Job ${jobId} completed`);
  });

  queueEvents.on("failed", ({ jobId, failedReason }) => {
    console.log(`❌ Job ${jobId} failed: ${failedReason}`);
  });

  queueEvents.on("delayed", ({ jobId, delay }) => {
    console.log(`⏰ Job ${jobId} delayed by ${delay}ms`);
  });
}

/**
 * Generate a deterministic job ID for idempotency
 * This ensures the same email won't be queued twice
 */
export const generateJobId = (
  emailId: string,
  attemptNumber: number = 1,
): string => {
  // BullMQ custom job IDs cannot contain ':' so we normalize to a hyphenated form
  // Keep it deterministic for idempotency but Redis-safe
  return `email-${emailId}-attempt-${attemptNumber}`;
};

/**
 * Add a single email job to the queue
 */
export const addEmailJob = async (
  data: EmailJobData,
  scheduledAt: Date,
  priority: number = 0,
): Promise<string> => {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now());
  const jobId = generateJobId(data.emailId, data.attemptNumber);

  const jobOptions: JobsOptions = {
    jobId,
    delay,
    priority,
    attempts: config.worker.maxRetries,
  };

  const job = await emailQueue.add("send-email", data, jobOptions);

  console.log(
    `📬 Email job queued: ${job.id} (delay: ${delay}ms, scheduled: ${scheduledAt.toISOString()})`,
  );

  return job.id!;
};

/**
 * Add multiple email jobs to the queue (batch)
 */
export const addEmailJobs = async (
  jobs: Array<{
    data: EmailJobData;
    scheduledAt: Date;
    priority?: number;
  }>,
): Promise<string[]> => {
  try {
    const bulkJobs = jobs.map(({ data, scheduledAt, priority = 0 }) => {
      const delay = Math.max(0, scheduledAt.getTime() - Date.now());
      const jobId = generateJobId(data.emailId, data.attemptNumber);

      console.log(`📬 Preparing job ${jobId} with delay ${delay}ms`);

      return {
        name: "send-email" as const,
        data,
        opts: {
          jobId,
          delay,
          priority,
          attempts: config.worker.maxRetries,
        } as JobsOptions,
      };
    });

    console.log(`📬 Adding ${bulkJobs.length} jobs to queue...`);
    const addedJobs = await emailQueue.addBulk(bulkJobs);
    const jobIds = addedJobs.map((job) => job.id!);

    console.log(`📬 Batch of ${jobIds.length} email jobs queued successfully`);

    return jobIds;
  } catch (error) {
    console.error("❌ Failed to add jobs to queue:", error);
    throw error;
  }
};

/**
 * Reschedule a job for the next available hour (rate limit handling)
 */
export const rescheduleJob = async (
  data: EmailJobData,
  nextAvailableTime: Date,
): Promise<string> => {
  // Increment attempt number for new job ID
  const newData: EmailJobData = {
    ...data,
    attemptNumber: data.attemptNumber + 1,
  };

  return addEmailJob(newData, nextAvailableTime);
};

/**
 * Get queue statistics
 */
export const getQueueStats = async (): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> => {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
};

/**
 * Clean completed and failed jobs older than specified time
 */
export const cleanOldJobs = async (
  maxAge: number = 7 * 24 * 60 * 60 * 1000,
): Promise<void> => {
  await emailQueue.clean(maxAge, 100, "completed");
  await emailQueue.clean(maxAge, 100, "failed");
};

/**
 * Pause the queue
 */
export const pauseQueue = async (): Promise<void> => {
  await emailQueue.pause();
  console.log("⏸️ Email queue paused");
};

/**
 * Resume the queue
 */
export const resumeQueue = async (): Promise<void> => {
  await emailQueue.resume();
  console.log("▶️ Email queue resumed");
};

/**
 * Close queue connections
 */
export const closeQueue = async (): Promise<void> => {
  await queueEvents.close();
  await emailQueue.close();
  console.log("📧 Email queue closed");
};

export default {
  emailQueue,
  queueEvents,
  generateJobId,
  addEmailJob,
  addEmailJobs,
  rescheduleJob,
  getQueueStats,
  cleanOldJobs,
  pauseQueue,
  resumeQueue,
  closeQueue,
};
