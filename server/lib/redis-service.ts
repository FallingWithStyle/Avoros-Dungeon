/**
 * File: redis-service.ts
 * Responsibility: Redis caching service with automatic database fallback
 * Notes: Provides caching for crawler data, room data, and tactical positions with graceful degradation
 */
import { Redis } from "@upstash/redis";

class RedisService {
  private redis: Redis | null = null;
  private isConnected = false;
  private forceFallbackMode = false; // Enable Redis by default

  constructor() {
    try {
      // Check if Upstash Redis is configured
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.log('Initializing Upstash Redis with URL:', process.env.UPSTASH_REDIS_REST_URL?.substring(0, 50) + '...');

        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        this.isConnected = true;
        console.log('Upstash Redis initialized successfully');

        // Auto-enable fallback mode in debug environment
        if (this.forceFallbackMode) {
          console.log('🔧 Debug mode detected - Redis fallback mode ENABLED by default');
          console.log('📊 Cache operations will use database only for consistent debugging');
        }
      } else {
        console.warn('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables not set');
        console.log('Redis will be disabled - falling back to database storage');
        this.redis = null;
        this.isConnected = false;
        return;
      }

      // Test the connection immediately
      this.testConnection();
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.redis = null;
      this.isConnected = false;
    }
  }

  private isDebugMode(): boolean {
    // Only enable debug mode when explicitly requested
    return process.env.DEBUG === 'true' || process.env.FORCE_DB_FALLBACK === 'true';
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
    if (this.forceFallbackMode || !this.redis || !this.isConnected) return null;

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
    if (this.forceFallbackMode || !this.redis || !this.isConnected) return;

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    if (this.forceFallbackMode || !this.redis || !this.isConnected) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (this.forceFallbackMode || !this.redis || !this.isConnected) return false;

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
    if (this.forceFallbackMode || !this.redis || !this.isConnected) return;

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
    if (this.forceFallbackMode || !this.redis || !this.isConnected) return null;

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
    if (this.forceFallbackMode || !this.redis || !this.isConnected) return;

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
    if (this.forceFallbackMode || !this.isConnected) return;

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
    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      // Check if data is already an object (shouldn't happen, but handle it)
      if (typeof data === 'object') {
        console.warn('Redis returned object instead of string, clearing key:', key);
        await this.redis.del(key);
        return null;
      }

      // Check if data starts with "[object" which indicates corrupted data
      if (typeof data === 'string' && data.startsWith('[object')) {
        console.warn('Corrupted data in Redis, clearing key:', key);
        await this.redis.del(key);
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Redis get error:', error);
      // Clear the corrupted key
      try {
        await this.redis.del(key);
        console.log('Cleared corrupted Redis key:', key);
      } catch (deleteError) {
        console.error('Failed to clear corrupted key:', deleteError);
      }
      return null;
    }
  }

  async setContentData(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      // Ensure value is properly serialized
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.redis.setex(key, ttl, serializedValue);
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
    if (this.forceFallbackMode || !this.isConnected) return;

    try {
      await this.redis?.del(`floor:${floorId}:bounds`);
      await this.redis?.del(`floor:${floorId}:rooms`);
    } catch (error) {
      console.error('Redis invalidateFloor error:', error);
    }
  }

  // Tactical positions cache methods
  async getTacticalPositions(roomId: number): Promise<any[] | null> {
    if (this.forceFallbackMode || !this.redis || !this.isConnected) return null;

    try {
      const data = await this.redis?.get(`tactical:room:${roomId}`);
      return data ? JSON.parse(data as string) : null;
    } catch (error) {
      console.error('Redis getTacticalPositions error:', error);
      return null;
    }
  }

  async setTacticalPositions(roomId: number, positions: any[], ttlSeconds = 1800): Promise<void> {
    if (this.forceFallbackMode || !this.redis || !this.isConnected) return;

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
    if (this.forceFallbackMode || !this.isConnected) return;

    try {
      await this.redis?.del(`tactical:room:${roomId}`);
    } catch (error) {
      console.error('Redis invalidateTacticalPositions error:', error);
    }
  }

  async setRoomMobs(roomId: number, mobs: any[], ttlSeconds: number = 600): Promise<void> {
    if (this.forceFallbackMode || !this.redis || !this.isConnected) {
      console.log(`Redis fallback mode enabled - skipping mob cache for room ${roomId}`);
      return;
    }

    try {
      // Create a clean, serializable version of the mob data
      const cleanMobs = mobs.map(mobData => {
        const cleanMob = {
          mob: {
            id: mobData.mob.id,
            roomId: mobData.mob.roomId,
            enemyId: mobData.mob.enemyId,
            displayName: mobData.mob.displayName,
            rarity: mobData.mob.rarity,
            positionX: mobData.mob.positionX,
            positionY: mobData.mob.positionY,
            currentHealth: mobData.mob.currentHealth,
            maxHealth: mobData.mob.maxHealth,
            isAlive: mobData.mob.isAlive,
            disposition: mobData.mob.disposition,
            isActive: mobData.mob.isActive,
            createdAt: mobData.mob.createdAt instanceof Date ? mobData.mob.createdAt.toISOString() : mobData.mob.createdAt,
            updatedAt: mobData.mob.updatedAt instanceof Date ? mobData.mob.updatedAt.toISOString() : mobData.mob.updatedAt
          },
          mobType: {
            id: mobData.mobType.id,
            name: mobData.mobType.name,
            description: mobData.mobType.description,
            hitPoints: mobData.mobType.hitPoints,
            attack: mobData.mobType.attack,
            defense: mobData.mobType.defense,
            speed: mobData.mobType.speed,
            health: mobData.mobType.health,
            rarity: mobData.mobType.rarity,
            creditsReward: mobData.mobType.creditsReward,
            experienceReward: mobData.mobType.experienceReward
          }
        };
        return cleanMob;
      });

      const serializedMobs = JSON.stringify(cleanMobs);
      await this.redis.setex(`room:${roomId}:mobs`, ttlSeconds, serializedMobs);
      console.log(`Storing mobs data for room ${roomId}: ${serializedMobs.length} characters`);
    } catch (error) {
      console.log('Failed to cache room mobs data:', error);
    }
  }

  async getRoomMobs(roomId: number): Promise<any[] | null> {
    if (this.forceFallbackMode || !this.redis || !this.isConnected) {
      console.log(`Redis fallback mode enabled - skipping mob cache lookup for room ${roomId}`);
      return null;
    }

    try {
      const cached = await this.redis.get(`room:${roomId}:mobs`);
      if (!cached) return null;

      // Validate that we have a string
      if (typeof cached !== 'string') {
        console.log(`Invalid cached data type for room ${roomId} mobs:`, typeof cached);
        await this.invalidateRoomMobs(roomId);
        return null;
      }

      // Parse and reconstruct Date objects
      const parsed = JSON.parse(cached);
      return parsed.map((mobData: any) => ({
        ...mobData,
        mob: {
          ...mobData.mob,
          createdAt: mobData.mob.createdAt ? new Date(mobData.mob.createdAt) : null,
          updatedAt: mobData.mob.updatedAt ? new Date(mobData.mob.updatedAt) : null
        }
      }));
    } catch (error) {
      console.log(`Error parsing cached mob data for room ${roomId}:`, error);
      await this.invalidateRoomMobs(roomId);
      return null;
    }
  }

  async invalidateRoomMobs(roomId: number): Promise<void> {
    if (this.forceFallbackMode || !this.isConnected) return;

    try {
      await this.redis?.del(`room:${roomId}:mobs`);
    } catch (error) {
      console.error('Redis invalidateRoomMobs error:', error);
    }
  }

  // Debug methods for fallback mode control
  setForceFallbackMode(enabled: boolean): void {
    const oldMode = this.forceFallbackMode;
    this.forceFallbackMode = enabled;
    console.log(`🔧 Redis fallback mode ${enabled ? 'ENABLED' : 'DISABLED'} via debug override`);

    if (oldMode !== enabled) {
      console.log(`📊 Cache operations will now ${enabled ? 'SKIP Redis and use database only' : 'USE Redis normally'}`);
    }
  }

  isForceFallbackMode(): boolean {
    return this.forceFallbackMode;
  }

  // System-wide bypass check
  private async isRedisOperational(): Promise<boolean> {
    if (this.forceFallbackMode) {
      return false; // Force fallback when debug mode is enabled
    }

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

  // Batch data caching for faster load times
  async getBatchData(crawlerId: number): Promise<any | null> {
    return this.get(`batch:${crawlerId}:room-data`);
  }

  async setBatchData(crawlerId: number, data: any, ttl: number = 60): Promise<void> {
    await this.set(`batch:${crawlerId}:room-data`, data, ttl);
  }

  async invalidateBatchData(crawlerId: number): Promise<void> {
    if (this.forceFallbackMode || !this.isConnected) return;
    await this.del(`batch:${crawlerId}:room-data`);
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
    if (this.forceFallbackMode || !this.isConnected) return;
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
    if (this.forceFallbackMode || !this.isConnected) return;

    try {
      await this.redis?.del(`room:${roomId}:players`);
      await this.redis?.del(`room:${roomId}:directions`);
    } catch (error) {
      console.error('Redis invalidateRoomData error:', error);
    }
  }

  async invalidateCrawlerRoomData(crawlerId: number): Promise<void> {
    if (this.forceFallbackMode || !this.isConnected) return;

    try {
      await this.redis?.del(`crawler:${crawlerId}:room-data`);
      await this.redis?.del(`crawler:${crawlerId}:current-room`);
    } catch (error) {
      console.error('Redis invalidateCrawlerRoomData error:', error);
    }
  }

  // Invalidate adjacent room cache for a specific crawler
  async invalidateAdjacentRooms(crawlerId: number): Promise<void> {
    if (this.forceFallbackMode || !this.isConnected) return;

    try {
      await this.redis?.del(`adjacent-rooms:${crawlerId}:1`);
      await this.redis?.del(`adjacent-rooms:${crawlerId}:2`);
      await this.redis?.del(`adjacent-rooms:${crawlerId}:3`);
    } catch (error) {
      console.error('Redis invalidateAdjacentRooms error:', error);
    }
  }
}

export const redisService = new RedisService();