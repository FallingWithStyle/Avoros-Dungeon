import Redis from "ioredis";

class RedisService {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor() {
    try {
      if (!process.env.REDIS_URL) {
        console.warn('REDIS_URL environment variable not set - Redis will be disabled');
        this.redis = null;
        return;
      }

      this.redis = new Redis(process.env.REDIS_URL);
      this.redis.on('connect', () => {
        this.isConnected = true;
        console.log('Redis connected successfully');
      });
      this.redis.on('error', (err) => {
        console.error('Redis connection error:', err);
        this.isConnected = false;
      });
      this.redis.on('ready', () => {
        this.isConnected = true;
        console.log('Redis ready for commands');
      });
    } catch (error) {
      console.error('Failed to initialize Redis:', error);
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

  // Tactical positions cache methods
  async getTacticalPositions(roomId: number): Promise<any[] | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.redis?.get(`room:${roomId}:tactical-positions`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis getTacticalPositions error:', error);
      return null;
    }
  }

  async setTacticalPositions(roomId: number, positions: any[], ttlSeconds = 1800): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.setex(
        `room:${roomId}:tactical-positions`, 
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
      await this.redis?.del(`room:${roomId}:tactical-positions`);
    } catch (error) {
      console.error('Redis invalidateTacticalPositions error:', error);
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

  async invalidateFloor(floorId: number): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.del(`floor:${floorId}:bounds`);
      await this.redis?.del(`floor:${floorId}:rooms`);
    } catch (error) {
      console.error('Redis invalidateFloor error:', error);
    }
  }

  // Tactical view specific cache methods
  async getCurrentRoomData(crawlerId: number): Promise<any | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.redis?.get(`crawler:${crawlerId}:room-data`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis getCurrentRoomData error:', error);
      return null;
    }
  }

  async setCurrentRoomData(crawlerId: number, data: any, ttlSeconds = 300): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.setex(
        `crawler:${crawlerId}:room-data`, 
        ttlSeconds, 
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Redis setCurrentRoomData error:', error);
    }
  }

  async getPlayersInRoom(roomId: number): Promise<any[] | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.redis?.get(`room:${roomId}:players`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis getPlayersInRoom error:', error);
      return null;
    }
  }

  async setPlayersInRoom(roomId: number, players: any[], ttlSeconds = 120): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.setex(
        `room:${roomId}:players`, 
        ttlSeconds, 
        JSON.stringify(players)
      );
    } catch (error) {
      console.error('Redis setPlayersInRoom error:', error);
    }
  }

  async getFactions(): Promise<any[] | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.redis?.get('game:factions');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis getFactions error:', error);
      return null;
    }
  }

  async setFactions(factions: any[], ttlSeconds = 1800): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.setex(
        'game:factions', 
        ttlSeconds, 
        JSON.stringify(factions)
      );
    } catch (error) {
      console.error('Redis setFactions error:', error);
    }
  }

  async getAvailableDirections(roomId: number): Promise<string[] | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.redis?.get(`room:${roomId}:directions`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis getAvailableDirections error:', error);
      return null;
    }
  }

  async setAvailableDirections(roomId: number, directions: string[], ttlSeconds = 600): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.redis?.setex(
        `room:${roomId}:directions`, 
        ttlSeconds, 
        JSON.stringify(directions)
      );
    } catch (error) {
      console.error('Redis setAvailableDirections error:', error);
    }
  }

  // Invalidate room-related data when things change
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

  // Leaderboard cache methods
  async getLeaderboard(type: string) {
    return this.get(`leaderboard:${type}`);
  }

  async setLeaderboard(type: string, data: any, ttl: number = 180) {
    await this.set(`leaderboard:${type}`, data, ttl);
  }

  // Enhanced tactical positions cache methods
  async getTacticalPositions(roomId: number): Promise<any[] | null> {
    return this.safeGet(`tactical:${roomId}`);
  }

  async setTacticalPositions(roomId: number, entities: any[], ttl: number = 1800): Promise<void> {
    await this.safeSet(`tactical:${roomId}`, entities, ttl);
  }

  async invalidateTacticalPositions(roomId: number): Promise<void> {
    await this.safeDel(`tactical:${roomId}`);
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

  // Tactical position methods
  async getTacticalPositions(roomId: number): Promise<any[]> {
    try {
      const key = `tactical:room:${roomId}`;
      const data = await this.get(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Redis getTacticalPositions error:', error);
      return [];
    }
  }

  async setTacticalPositions(roomId: number, positions: any[]): Promise<void> {
    try {
      const key = `tactical:room:${roomId}`;
      await this.set(key, JSON.stringify(positions), 300); // 5 minutes
    } catch (error) {
      console.error('Redis setTacticalPositions error:', error);
    }
  }
}

export const redisService = new RedisService();