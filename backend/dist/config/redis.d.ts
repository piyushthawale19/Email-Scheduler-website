import Redis from 'ioredis';
export declare const getRedisClient: () => Redis;
export declare const getRedisSubscriber: () => Redis;
export declare const createRedisConnection: () => Redis;
export declare const closeRedisConnections: () => Promise<void>;
export default getRedisClient;
 