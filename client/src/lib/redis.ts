/**
 * File: redis.ts
 * Responsibility: Redis client configuration and connection setup
 * Notes: Creates Redis instance for client-side caching and real-time data operations
 */

import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export default redis;
