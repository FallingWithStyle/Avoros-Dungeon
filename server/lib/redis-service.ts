import { Redis } from "@upstash/redis";

class RedisService {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor() {
    try {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.warn('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables not set - Redis will be disabled');
        this.redis = null;
        this.isConnected = false;
        return;
      }

      console.log('Initializing Upstash Redis with URL:', process.env.UPSTASH_REDIS_REST_URL?.substring(0, 50) + '...');

      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      this.isConnected = true;
      console.log('Upstash Redis initialized successfully');

      // Test the connection immediately
      this.testConnection();
    } catch (error) {
      console.error('Failed to initialize Upstash Redis:', error);
      this.redis = null;
      this.isConnected = false;
    }
  }

  private async testConnection(): Promise<void> {
    try {
      if (this.redis) {
        // Use setex instead of set with TTL for Upstash compatibility
        await this.redis.setex('connection-test', 5, 'ok');
        const result = await this.redis.get('connection-test');
        if (result === 'ok') {
          console.log('Redis connection test successful');
        } else {
          console.warn('Redis connection test failed - unexpected result:', result);
          this.isConnected = false;
        }
      }
    } catch (error) {
      console.error('Redis connection test failed:', error);
      this.isConnected = false;
    }
  }

  private defaultTTL = 300; // 5 minutes

  // Generic cache methods
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis || !this.isConnected) return null;

    try {
      const data = await this.redis.get(key);
      if (data === null || data === undefined) return null;

      // Handle both string and already-parsed data
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch {
          return data as T;
        }
      }
      return data as T;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    if (!this.redis || !this.isConnected) return;

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis || !this.isConnected) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) return false;

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // Pattern-based deletion
  async deletePattern(pattern: string): Promise<void> {
    if (!this.redis || !this.isConnected) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys && keys.length > 0) {
        await this.redis.del(...keys);
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
      if (!data) return null;

      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      return data;
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

  async getCurrentRoom(crawlerId: number): Promise<any | null> {
    return this.get(`crawler:${crawlerId}:current-room`);
  }

  async setCurrentRoom(crawlerId: number, room: any, ttl: number = 300) {
    await this.set(`crawler:${crawlerId}:current-room`, room, ttl);
  }

  async getScannedRooms(crawlerId: number, scanRange: number) {
    return this.get(`crawler:${crawlerId}:scanned:${scanRange}`);
  }

  async setScannedRooms(crawlerId: number, scanRange: number, rooms: any[], ttl: number = 300) {
    await this.set(`crawler:${crawlerId}:scanned:${scanRange}`, rooms, ttl);
  }

  async getFloorBounds(floorId: number) {
    return this.get(`floor:${floorId}:bounds`);
  }

  async setFloorBounds(floorId: number, bounds: any, ttl: number = 3600) {
    await this.set(`floor:${floorId}:bounds`, bounds, ttl);
  }

  async getFloorRooms(floorId: number) {
    return this.get(`floor:${floorId}:rooms`);
  }

  async setFloorRooms(floorId: number, rooms: any[], ttl: number = 3600) {
    await this.set(`floor:${floorId}:rooms`, rooms, ttl);
  }

  async getContentData(key: string): Promise<any> {
    if (!this.redis || !this.isConnected) {
      return null;
    }

    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data as string) : null;
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
      return data ? JSON.parse(data as string) : null;
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

  async invalidateFloor(floorId: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.del(`floor:${floorId}:bounds`);
      await this.redis?.del(`floor:${floorId}:rooms`);
    } catch (error) {
      console.error('Redis invalidateFloor error:', error);
    }
  }

  // Tactical positions cache methods
  async getTacticalPositions(roomId: number): Promise<any[] | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.redis?.get(`tactical:room:${roomId}`);
      return data ? JSON.parse(data as string) : null;
    } catch (error) {
      console.error('Redis getTacticalPositions error:', error);
      return null;
    }
  }

  async setTacticalPositions(roomId: number, positions: any[], ttlSeconds = 1800): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.setex(
        `tactical:room:${roomId}`, 
        ttlSeconds, 
        JSON.stringify(positions)
      );
    } catch (error) {
      console.error('Redis setTacticalPositions error:', error);
    }
  }

  async invalidateTacticalPositions(roomId: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.del(`tactical:room:${roomId}`);
    } catch (error) {
      console.error('Redis invalidateTacticalPositions error:', error);
    }
  }

  async getRoomMobs(roomId: number): Promise<any[] | null> {
    if (!this.redis || !this.isConnected) return null;

    try {
      const data = await this.redis?.get(`mobs:${roomId}`);
      if (!data || data === null || data === undefined) return null;
      
      // Handle empty string or malformed data
      if (typeof data === 'string' && data.trim() === '') {
        console.log(`Empty mob data for room ${roomId}, clearing cache`);
        await this.redis?.del(`mobs:${roomId}`);
        return null;
      }
      
      try {
        return JSON.parse(data as string);
      } catch (parseError) {
        console.error(`Invalid JSON data for room ${roomId} mobs, clearing cache:`, parseError);
        await this.redis?.del(`mobs:${roomId}`);
        return null;
      }
    } catch (error) {
      console.error('Redis getRoomMobs error:', error);
      return null;
    }
  }

  async setRoomMobs(roomId: number, mobs: any[], ttlSeconds: number = 600): Promise<void> {
    if (!this.redis || !this.isConnected) return;

    try {
      await this.redis?.setex(`mobs:${roomId}`, ttlSeconds, JSON.stringify(mobs));
    } catch (error) {
      console.error('Redis setRoomMobs error:', error);
    }
  }

  async invalidateRoomMobs(roomId: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.del(`mobs:${roomId}`);
    } catch (error) {
      console.error('Redis invalidateRoomMobs error:', error);
    }
  }

  // System-wide bypass check
  private async isRedisOperational(): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  // Enhanced generic methods with bypass
  async safeGet<T>(key: string): Promise<T | null> {
    if (!(await this.isRedisOperational())) {
      return null;
    }
    return this.get<T>(key);
  }

  async safeSet(key: string, value: any, ttl: number = this.defaultTTL): Promise<boolean> {
    if (!(await this.isRedisOperational())) {
      return false;
    }
    await this.set(key, value, ttl);
    return true;
  }

  async safeDel(key: string): Promise<boolean> {
    if (!(await this.isRedisOperational())) {
      return false;
    }
    await this.del(key);
    return true;
  }

  // Additional cache methods
  async getLeaderboard(type: string) {
    return this.get(`leaderboard:${type}`);
  }

  async setLeaderboard(type: string, data: any, ttl: number = 180) {
    await this.set(`leaderboard:${type}`, data, ttl);
  }

  async getUserCrawlers(userId: string) {
    return this.get(`user:${userId}:crawlers`);
  }

  async setUserCrawlers(userId: string, crawlers: any[], ttl: number = 300) {
    await this.set(`user:${userId}:crawlers`, crawlers, ttl);
  }

  async invalidateUser(userId: string) {
    await this.deletePattern(`user:${userId}*`);
  }

  // Remaining methods for compatibility
  async getCurrentRoomData(crawlerId: number): Promise<any | null> {
    return this.get(`crawler:${crawlerId}:room-data`);
  }

  async setCurrentRoomData(crawlerId: number, data: any, ttlSeconds = 300): Promise<void> {
    await this.set(`crawler:${crawlerId}:room-data`, data, ttlSeconds);
  }

  async getPlayersInRoom(roomId: number): Promise<any[] | null> {
    return this.get(`room:${roomId}:players`);
  }

  async setPlayersInRoom(roomId: number, players: any[], ttlSeconds = 120): Promise<void> {
    await this.set(`room:${roomId}:players`, players, ttlSeconds);
  }

  async getFactions(): Promise<any[] | null> {
    return this.get('game:factions');
  }

  async setFactions(factions: any[], ttlSeconds = 1800): Promise<void> {
    await this.set('game:factions', factions, ttlSeconds);
  }

  async getAvailableDirections(roomId: number): Promise<string[] | null> {
    return this.get(`room:${roomId}:directions`);
  }

  async setAvailableDirections(roomId: number, directions: string[], ttlSeconds = 600): Promise<void> {
    await this.set(`room:${roomId}:directions`, directions, ttlSeconds);
  }

  async invalidateRoomData(roomId: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.del(`room:${roomId}:players`);
      await this.redis?.del(`room:${roomId}:directions`);
    } catch (error) {
      console.error('Redis invalidateRoomData error:', error);
    }
  }

  async invalidateCrawlerRoomData(crawlerId: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.del(`crawler:${crawlerId}:room-data`);
      await this.redis?.del(`crawler:${crawlerId}:current-room`);
    } catch (error) {
      console.error('Redis invalidateCrawlerRoomData error:', error);
    }
  }
}

export const redisService = new RedisService();