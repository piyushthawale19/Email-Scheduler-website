import { RateLimitCheck } from '../types';
/**
 * Check if sending is allowed and get remaining quota
 */
export declare const checkRateLimit: (senderId?: string) => Promise<RateLimitCheck>;
/**
 * Increment the rate limit counter after sending an email
 */
export declare const incrementRateLimit: (senderId?: string) => Promise<void>;
/**
 * Get the next available time slot for sending an email
 */
export declare const getNextAvailableSlot: (senderId?: string) => Promise<Date>;
/**
 * Calculate scheduled times for a batch of emails respecting rate limits
 */
export declare const calculateScheduledTimes: (count: number, startTime: Date, delayBetweenEmails: number, hourlyLimit: number, senderId?: string) => Promise<Date[]>;
/**
 * Clean up old rate limit counters (older than 24 hours)
 */
export declare const cleanupOldCounters: () => Promise<number>;
declare const _default: {
    checkRateLimit: (senderId?: string) => Promise<RateLimitCheck>;
    incrementRateLimit: (senderId?: string) => Promise<void>;
    getNextAvailableSlot: (senderId?: string) => Promise<Date>;
    calculateScheduledTimes: (count: number, startTime: Date, delayBetweenEmails: number, hourlyLimit: number, senderId?: string) => Promise<Date[]>;
    cleanupOldCounters: () => Promise<number>;
};
export default _default;
//# sourceMappingURL=ratelimit.service.d.ts.map