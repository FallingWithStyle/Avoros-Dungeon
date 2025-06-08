import Redis from "ioredis";

class RedisService {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor() {
    try {
      this.redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379");
      this.redis.on('connect', () => {
        this.isConnected = true;
      });
      this.redis.on('error', (err) => {
        // Temporarily disabled Redis error logging to reduce console noise
        // console.error('Redis connection error:', err);
        this.isConnected = false;
      });
    } catch (error) {
      console.warn('Failed to initialize Redis:', error);
      this.redis = null;
    }
  }

  private defaultTTL = 300; // 5 minutes

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis?.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.redis?.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis?.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis?.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // Pattern-based deletion
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis?.keys(pattern);
      if (keys && keys.length > 0) {
        await this.redis?.del(...keys);
      }
    } catch (error) {
      console.error(`Redis DELETE PATTERN error for pattern ${pattern}:`, error);
    }
  }

  // Crawler-specific cache methods
  async getCrawler(crawlerId: number): Promise<any | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.redis?.get(`crawler:${crawlerId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis getCrawler error:', error);
      return null;
    }
  }

  async setCrawler(crawlerId: number, data: any, ttlSeconds = 300): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.setex(
        `crawler:${crawlerId}`, 
        ttlSeconds, 
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Redis setCrawler error:', error);
    }
  }

  async invalidateCrawler(crawlerId: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.del(`crawler:${crawlerId}`);
    } catch (error) {
      console.error('Redis invalidateCrawler error:', error);
    }
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

  async getContentData(key: string): Promise<any> {
    if (!this.redis || !this.isConnected) {
      return null;
    }

    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async setContentData(key: string, data: any, ttl: number = 3600): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async getFloorTheme(floorNumber: number): Promise<any> {
    if (!this.redis || !this.isConnected) {
      return null;
    }

    try {
      const data = await this.redis.get(`floor_theme:${floorNumber}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis get floor theme error:', error);
      return null;
    }
  }

  async setFloorTheme(floorNumber: number, theme: any, ttl: number = 7200): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }

    try {
      await this.redis.setex(`floor_theme:${floorNumber}`, ttl, JSON.stringify(theme));
    } catch (error) {
      console.error('Redis set floor theme error:', error);
    }
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