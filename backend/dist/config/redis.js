"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnections = exports.createRedisConnection = exports.getRedisSubscriber = exports.getRedisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const index_1 = require("./index");
 
const createRedisClient = () => {
    const redisConfig = {
        host: index_1.config.redis.host,
        port: index_1.config.redis.port,
        password: index_1.config.redis.password || undefined,
        maxRetriesPerRequest: null,  
        enableReadyCheck: false,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            console.log(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
            return delay;
        },
    };
    const redis = new ioredis_1.default(redisConfig);
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
let redisClient = null;
let redisSubscriber = null;
const getRedisClient = () => {
    if (!redisClient) {
        redisClient = createRedisClient();
    }
    return redisClient;
};
exports.getRedisClient = getRedisClient;
const getRedisSubscriber = () => {
    if (!redisSubscriber) {
        redisSubscriber = createRedisClient();
    }
    return redisSubscriber;
};
exports.getRedisSubscriber = getRedisSubscriber;
 
const createRedisConnection = () => {
    return createRedisClient();
};
exports.createRedisConnection = createRedisConnection;
 
const closeRedisConnections = async () => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
    if (redisSubscriber) {
        await redisSubscriber.quit();
        redisSubscriber = null;
    }
};
exports.closeRedisConnections = closeRedisConnections;
exports.default = exports.getRedisClient;
 