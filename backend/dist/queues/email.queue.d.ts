import { Queue, QueueEvents } from 'bullmq';
import { EmailJobData } from '../types';
export declare const emailQueue: Queue<EmailJobData, any, string, DataTypeOrJob extends import("bullmq").Job<infer D, any, any> ? D : DataTypeOrJob, DataTypeOrJob extends import("bullmq").Job<any, infer R, any> ? R : DefaultResultType, DataTypeOrJob extends import("bullmq").Job<any, any, infer N extends string> ? N : DefaultNameType>;
export declare const queueEvents: QueueEvents;
/**
 * Generate a deterministic job ID for idempotency
 * This ensures the same email won't be queued twice
 */
export declare const generateJobId: (emailId: string, attemptNumber?: number) => string;
/**
 * Add a single email job to the queue
 */
export declare const addEmailJob: (data: EmailJobData, scheduledAt: Date, priority?: number) => Promise<string>;
/**
 * Add multiple email jobs to the queue (batch)
 */
export declare const addEmailJobs: (jobs: Array<{
    data: EmailJobData;
    scheduledAt: Date;
    priority?: number;
}>) => Promise<string[]>;
/**
 * Reschedule a job for the next available hour (rate limit handling)
 */
export declare const rescheduleJob: (data: EmailJobData, nextAvailableTime: Date) => Promise<string>;
/**
 * Get queue statistics
 */
export declare const getQueueStats: () => Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}>;
/**
 * Clean completed and failed jobs older than specified time
 */
export declare const cleanOldJobs: (maxAge?: number) => Promise<void>;
/**
 * Pause the queue
 */
export declare const pauseQueue: () => Promise<void>;
/**
 * Resume the queue
 */
export declare const resumeQueue: () => Promise<void>;
/**
 * Close queue connections
 */
export declare const closeQueue: () => Promise<void>;
declare const _default: {
    emailQueue: Queue<EmailJobData, any, string, DataTypeOrJob extends import("bullmq").Job<infer D, any, any> ? D : DataTypeOrJob, DataTypeOrJob extends import("bullmq").Job<any, infer R, any> ? R : DefaultResultType, DataTypeOrJob extends import("bullmq").Job<any, any, infer N extends string> ? N : DefaultNameType>;
    queueEvents: QueueEvents;
    generateJobId: (emailId: string, attemptNumber?: number) => string;
    addEmailJob: (data: EmailJobData, scheduledAt: Date, priority?: number) => Promise<string>;
    addEmailJobs: (jobs: Array<{
        data: EmailJobData;
        scheduledAt: Date;
        priority?: number;
    }>) => Promise<string[]>;
    rescheduleJob: (data: EmailJobData, nextAvailableTime: Date) => Promise<string>;
    getQueueStats: () => Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>;
    cleanOldJobs: (maxAge?: number) => Promise<void>;
    pauseQueue: () => Promise<void>;
    resumeQueue: () => Promise<void>;
    closeQueue: () => Promise<void>;
};
export default _default;
//# sourceMappingURL=email.queue.d.ts.map