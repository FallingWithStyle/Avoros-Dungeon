/**
 * File: redis.ts
 * Responsibility: Client-side Redis status monitoring and connection utilities
 */
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export default redis;