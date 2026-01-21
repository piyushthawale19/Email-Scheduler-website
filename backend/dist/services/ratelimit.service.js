"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldCounters = exports.calculateScheduledTimes = exports.getNextAvailableSlot = exports.incrementRateLimit = exports.checkRateLimit = void 0;
const database_1 = require("../config/database");
const redis_1 = require("../config/redis");
const config_1 = require("../config");
/**
 * Rate Limit Service
 *
 * Implements distributed rate limiting using both Redis and PostgreSQL
 * for durability and consistency across multiple workers/instances.
 *
 * Key Design Decisions:
 * 1. Uses Redis for fast atomic counters (primary)
 * 2. Falls back to PostgreSQL if Redis is unavailable
 * 3. Uses hourly sliding windows
 * 4. Supports both global and per-sender limits
 */
const RATE_LIMIT_PREFIX = 'ratelimit:email:';
/**
 * Generate the rate limit key for the current hour
 */
const getRateLimitKey = (senderId) => {
    const now = new Date();
    const hourKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
    if (senderId) {
        return `${RATE_LIMIT_PREFIX}sender:${senderId}:${hourKey}`;
    }
    return `${RATE_LIMIT_PREFIX}global:${hourKey}`;
};
/**
 * Get the remaining time in the current hour (in seconds)
 */
const getSecondsUntilNextHour = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    return Math.ceil((nextHour.getTime() - now.getTime()) / 1000);
};
/**
 * Get the start of the current hour
 */
const getCurrentHourStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
};
/**
 * Get the start of the next hour
 */
const getNextHourStart = () => {
    const hourStart = getCurrentHourStart();
    hourStart.setHours(hourStart.getHours() + 1);
    return hourStart;
};
/**
 * Check if sending is allowed and get remaining quota
 */
const checkRateLimit = async (senderId) => {
    const redis = (0, redis_1.getRedisClient)();
    const globalKey = getRateLimitKey();
    const senderKey = senderId ? getRateLimitKey(senderId) : null;
    try {
        // Get current counts from Redis
        const globalCount = parseInt(await redis.get(globalKey) || '0', 10);
        const senderCount = senderKey ? parseInt(await redis.get(senderKey) || '0', 10) : 0;
        const maxGlobal = config_1.config.rateLimit.maxEmailsPerHour;
        const maxPerSender = config_1.config.rateLimit.maxEmailsPerHourPerSender;
        const globalRemaining = Math.max(0, maxGlobal - globalCount);
        const senderRemaining = senderId ? Math.max(0, maxPerSender - senderCount) : maxGlobal;
        const remaining = Math.min(globalRemaining, senderRemaining);
        const allowed = remaining > 0;
        return {
            allowed,
            remaining,
            resetTime: getNextHourStart(),
            nextAvailableSlot: allowed ? new Date() : getNextHourStart(),
        };
    }
    catch (error) {
        console.error('Redis rate limit check failed, falling back to DB:', error);
        return checkRateLimitFromDB(senderId);
    }
};
exports.checkRateLimit = checkRateLimit;
/**
 * Fallback rate limit check using PostgreSQL
 */
const checkRateLimitFromDB = async (senderId) => {
    const hourStart = getCurrentHourStart();
    const hourEnd = getNextHourStart();
    // Count emails sent in current hour
    const globalCount = await database_1.prisma.email.count({
        where: {
            status: 'SENT',
            sentAt: {
                gte: hourStart,
                lt: hourEnd,
            },
        },
    });
    let senderCount = 0;
    if (senderId) {
        senderCount = await database_1.prisma.email.count({
            where: {
                senderId,
                status: 'SENT',
                sentAt: {
                    gte: hourStart,
                    lt: hourEnd,
                },
            },
        });
    }
    const maxGlobal = config_1.config.rateLimit.maxEmailsPerHour;
    const maxPerSender = config_1.config.rateLimit.maxEmailsPerHourPerSender;
    const globalRemaining = Math.max(0, maxGlobal - globalCount);
    const senderRemaining = senderId ? Math.max(0, maxPerSender - senderCount) : maxGlobal;
    const remaining = Math.min(globalRemaining, senderRemaining);
    return {
        allowed: remaining > 0,
        remaining,
        resetTime: hourEnd,
        nextAvailableSlot: remaining > 0 ? new Date() : hourEnd,
    };
};
/**
 * Increment the rate limit counter after sending an email
 */
const incrementRateLimit = async (senderId) => {
    const redis = (0, redis_1.getRedisClient)();
    const globalKey = getRateLimitKey();
    const senderKey = senderId ? getRateLimitKey(senderId) : null;
    const ttl = getSecondsUntilNextHour() + 60; // Extra 60 seconds buffer
    try {
        // Increment global counter
        const globalPipeline = redis.pipeline();
        globalPipeline.incr(globalKey);
        globalPipeline.expire(globalKey, ttl);
        await globalPipeline.exec();
        // Increment sender counter if applicable
        if (senderKey) {
            const senderPipeline = redis.pipeline();
            senderPipeline.incr(senderKey);
            senderPipeline.expire(senderKey, ttl);
            await senderPipeline.exec();
        }
    }
    catch (error) {
        console.error('Redis rate limit increment failed, using DB fallback:', error);
        // Rate limiting will still work via DB checks
    }
    // Also update PostgreSQL for durability
    await updateDBRateLimit(senderId);
};
exports.incrementRateLimit = incrementRateLimit;
/**
 * Update rate limit counters in PostgreSQL for durability
 */
const updateDBRateLimit = async (senderId) => {
    const hourStart = getCurrentHourStart();
    const hourEnd = getNextHourStart();
    const counterKey = senderId ? `sender:${senderId}:${hourStart.toISOString()}` : `global:${hourStart.toISOString()}`;
    await database_1.prisma.rateLimitCounter.upsert({
        where: { counterKey },
        update: {
            count: { increment: 1 },
            updatedAt: new Date(),
        },
        create: {
            counterKey,
            count: 1,
            windowStart: hourStart,
            windowEnd: hourEnd,
        },
    });
};
/**
 * Get the next available time slot for sending an email
 */
const getNextAvailableSlot = async (senderId) => {
    const rateCheck = await (0, exports.checkRateLimit)(senderId);
    if (rateCheck.allowed) {
        return new Date();
    }
    // If rate limited, schedule for the next hour
    return rateCheck.nextAvailableSlot || getNextHourStart();
};
exports.getNextAvailableSlot = getNextAvailableSlot;
/**
 * Calculate scheduled times for a batch of emails respecting rate limits
 */
const calculateScheduledTimes = async (count, startTime, delayBetweenEmails, hourlyLimit, senderId) => {
    const scheduledTimes = [];
    let currentTime = new Date(startTime);
    let emailsInCurrentHour = 0;
    let currentHourStart = new Date(currentTime);
    currentHourStart.setMinutes(0, 0, 0);
    for (let i = 0; i < count; i++) {
        // Check if we've exceeded the hourly limit
        if (emailsInCurrentHour >= hourlyLimit) {
            // Move to the next hour
            currentTime = new Date(currentHourStart);
            currentTime.setHours(currentTime.getHours() + 1);
            currentHourStart = new Date(currentTime);
            currentHourStart.setMinutes(0, 0, 0);
            emailsInCurrentHour = 0;
        }
        scheduledTimes.push(new Date(currentTime));
        emailsInCurrentHour++;
        // Add delay for the next email
        currentTime = new Date(currentTime.getTime() + delayBetweenEmails * 1000);
        // Check if we've crossed into a new hour
        const newHourStart = new Date(currentTime);
        newHourStart.setMinutes(0, 0, 0);
        if (newHourStart.getTime() > currentHourStart.getTime()) {
            currentHourStart = newHourStart;
            emailsInCurrentHour = 0;
        }
    }
    return scheduledTimes;
};
exports.calculateScheduledTimes = calculateScheduledTimes;
/**
 * Clean up old rate limit counters (older than 24 hours)
 */
const cleanupOldCounters = async () => {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    const result = await database_1.prisma.rateLimitCounter.deleteMany({
        where: {
            windowEnd: {
                lt: cutoff,
            },
        },
    });
    return result.count;
};
exports.cleanupOldCounters = cleanupOldCounters;
exports.default = {
    checkRateLimit: exports.checkRateLimit,
    incrementRateLimit: exports.incrementRateLimit,
    getNextAvailableSlot: exports.getNextAvailableSlot,
    calculateScheduledTimes: exports.calculateScheduledTimes,
    cleanupOldCounters: exports.cleanupOldCounters,
};
//# sourceMappingURL=ratelimit.service.js.map