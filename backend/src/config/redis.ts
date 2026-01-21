import Redis from 'ioredis';
import { config } from './index';

// Create Redis connection for BullMQ
const createRedisClient = (): Redis => {
    const redisConfig = {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            console.log(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
            return delay;
        },
    };

    const redis = new Redis(redisConfig);

    redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
    });

    redis.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
    });

    redis.on('close', () => {
        console.log('⚠️ Redis connection closed');
    });

    return redis;
};

// Singleton instances
let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;

export const getRedisClient = (): Redis => {
    if (!redisClient) {
        redisClient = createRedisClient();
    }
    return redisClient;
};

export const getRedisSubscriber = (): Redis => {
    if (!redisSubscriber) {
        redisSubscriber = createRedisClient();
    }
    return redisSubscriber;
};

// Get a fresh connection (for BullMQ workers)
export const createRedisConnection = (): Redis => {
    return createRedisClient();
};

// Graceful shutdown
export const closeRedisConnections = async (): Promise<void> => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
    if (redisSubscriber) {
        await redisSubscriber.quit();
        redisSubscriber = null;
    }
};

export default getRedisClient;
