
import Redis from "ioredis";

class RedisService {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  }

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await this.redis.exists(key)) === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // Pattern-based deletion
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`Redis DELETE PATTERN error for pattern ${pattern}:`, error);
    }
  }

  // Crawler-specific cache methods
  async getCrawler(crawlerId: number) {
    return this.get(`crawler:${crawlerId}`);
  }

  async setCrawler(crawlerId: number, data: any, ttl: number = 300) {
    await this.set(`crawler:${crawlerId}`, data, ttl);
  }

  async invalidateCrawler(crawlerId: number) {
    await this.deletePattern(`crawler:${crawlerId}*`);
    await this.del(`crawlers:leaderboard`);
  }

  // Room and exploration cache methods
  async getExploredRooms(crawlerId: number) {
    return this.get(`crawler:${crawlerId}:explored`);
  }

  async setExploredRooms(crawlerId: number, rooms: any[], ttl: number = 600) {
    await this.set(`crawler:${crawlerId}:explored`, rooms, ttl);
  }

  async getCurrentRoom(crawlerId: number) {
    return this.get(`crawler:${crawlerId}:current-room`);
  }

  async setCurrentRoom(crawlerId: number, room: any, ttl: number = 300) {
    await this.set(`crawler:${crawlerId}:current-room`, room, ttl);
  }

  // Content cache methods (longer TTL since this data changes rarely)
  async getContentData(key: string) {
    return this.get(`content:${key}`);
  }

  async setContentData(key: string, data: any, ttl: number = 3600) {
    await this.set(`content:${key}`, data, ttl);
  }

  async invalidateContent() {
    await this.deletePattern(`content:*`);
  }

  // Floor and map cache methods
  async getFloorBounds(floorId: number) {
    return this.get(`floor:${floorId}:bounds`);
  }

  async setFloorBounds(floorId: number, bounds: any, ttl: number = 1800) {
    await this.set(`floor:${floorId}:bounds`, bounds, ttl);
  }

  async getFloorTheme(floorNumber: number) {
    return this.get(`floor:${floorNumber}:theme`);
  }

  async setFloorTheme(floorNumber: number, theme: any, ttl: number = 3600) {
    await this.set(`floor:${floorNumber}:theme`, theme, ttl);
  }

  // Leaderboard cache methods
  async getLeaderboard(type: string) {
    return this.get(`leaderboard:${type}`);
  }

  async setLeaderboard(type: string, data: any, ttl: number = 180) {
    await this.set(`leaderboard:${type}`, data, ttl);
  }

  // Session cache methods
  async getUserCrawlers(userId: string) {
    return this.get(`user:${userId}:crawlers`);
  }

  async setUserCrawlers(userId: string, crawlers: any[], ttl: number = 300) {
    await this.set(`user:${userId}:crawlers`, crawlers, ttl);
  }

  async invalidateUser(userId: string) {
    await this.deletePattern(`user:${userId}*`);
  }
}

export const redisService = new RedisService();
