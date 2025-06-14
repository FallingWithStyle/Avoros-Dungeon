
/**
 * File: query-optimizer.ts
 * Responsibility: Provides query batching, deduplication, and request-level caching to reduce database load
 * Notes: Batches similar queries and prevents duplicate queries within the same request cycle
 */


import { crawlerClasses, roomConnections } from '@shared/schema';

import { db } from '../db';
import { eq, inArray, and } from 'drizzle-orm';
import { rooms, crawlers, crawlerPositions, tacticalPositions, mobs, enemies } from '@shared/schema';

interface QueryBatch {
  crawlerIds: Set<number>;
  roomIds: Set<number>;
  resolvers: Map<string, { resolve: Function; reject: Function }[]>;
}

class QueryOptimizer {
  private pendingBatch: QueryBatch | null = null;
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 10; // milliseconds

  // Batch crawler queries
  async getCrawlersBatch(crawlerIds: number[]): Promise<Map<number, any>> {
    const uniqueIds = [...new Set(crawlerIds)];
    
    const crawlerData = await db
      .select()
      .from(crawlers)
      .leftJoin(crawlerClasses, eq(crawlers.classId, crawlerClasses.id))
      .where(inArray(crawlers.id, uniqueIds));

    const result = new Map();
    crawlerData.forEach(row => {
      result.set(row.crawlers.id, {
        ...row.crawlers,
        crawlerClass: row.crawler_classes
      });
    });

    return result;
  }

  // Batch room queries
  async getRoomsBatch(roomIds: number[]): Promise<Map<number, any>> {
    const uniqueIds = [...new Set(roomIds)];
    
    const roomData = await db
      .select()
      .from(rooms)
      .where(inArray(rooms.id, uniqueIds));

    const result = new Map();
    roomData.forEach(room => {
      result.set(room.id, room);
    });

    return result;
  }

  // Batch crawler positions
  async getCrawlerPositionsBatch(crawlerIds: number[]): Promise<Map<number, any>> {
    const uniqueIds = [...new Set(crawlerIds)];
    
    // Get latest position for each crawler
    const positions = await db
      .select()
      .from(crawlerPositions)
      .innerJoin(rooms, eq(crawlerPositions.roomId, rooms.id))
      .where(inArray(crawlerPositions.crawlerId, uniqueIds));

    // Group by crawler and get most recent
    const result = new Map();
    const crawlerGroups = new Map();
    
    positions.forEach(pos => {
      const crawlerId = pos.crawler_positions.crawlerId;
      if (!crawlerGroups.has(crawlerId)) {
        crawlerGroups.set(crawlerId, []);
      }
      crawlerGroups.get(crawlerId).push(pos);
    });

    crawlerGroups.forEach((positions, crawlerId) => {
      const latest = positions.sort((a, b) => 
        new Date(b.crawler_positions.enteredAt).getTime() - 
        new Date(a.crawler_positions.enteredAt).getTime()
      )[0];
      
      result.set(crawlerId, {
        position: latest.crawler_positions,
        room: latest.rooms
      });
    });

    return result;
  }

  // Batch room connections with caching
  async getRoomConnectionsBatch(roomIds: number[]): Promise<Map<number, any[]>> {
    const uniqueIds = [...new Set(roomIds)];
    
    // Check cache first for frequently accessed connections
    const cacheKey = `connections:${uniqueIds.sort().join(',')}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return new Map(Object.entries(cached));
    }
    
    const connections = await db
      .select()
      .from(roomConnections)
      .where(inArray(roomConnections.fromRoomId, uniqueIds));

    const result = new Map();
    connections.forEach(conn => {
      const roomId = conn.fromRoomId;
      if (!result.has(roomId)) {
        result.set(roomId, []);
      }
      result.get(roomId).push(conn);
    });

    // Cache for 10 minutes since connections rarely change
    await redisService.set(cacheKey, Object.fromEntries(result), 600);

    return result;
  }

  // Clear connection caches when rooms are modified
  async invalidateConnectionCache(): Promise<void> {
    await redisService.deletePattern('connections:*');
  }

  // Batch tactical positions
  async getTacticalPositionsBatch(roomIds: number[]): Promise<Map<number, any[]>> {
    const uniqueIds = [...new Set(roomIds)];
    
    const positions = await db
      .select()
      .from(tacticalPositions)
      .where(and(
        inArray(tacticalPositions.roomId, uniqueIds),
        eq(tacticalPositions.isActive, true)
      ));

    const result = new Map();
    positions.forEach(pos => {
      const roomId = pos.roomId;
      if (!result.has(roomId)) {
        result.set(roomId, []);
      }
      result.get(roomId).push(pos);
    });

    return result;
  }

  // Batch room mobs
  async getRoomMobsBatch(roomIds: number[]): Promise<Map<number, any[]>> {
    const uniqueIds = [...new Set(roomIds)];
    
    const mobData = await db
      .select()
      .from(mobs)
      .innerJoin(enemies, eq(mobs.enemyId, enemies.id))
      .where(and(
        inArray(mobs.roomId, uniqueIds),
        eq(mobs.isActive, true)
      ));

    const result = new Map();
    mobData.forEach(mobRow => {
      const roomId = mobRow.mobs.roomId;
      if (!result.has(roomId)) {
        result.set(roomId, []);
      }
      result.get(roomId).push({
        mob: mobRow.mobs,
        mobType: mobRow.enemies
      });
    });

    return result;
  }

  // Clear any pending batches
  clearPendingBatches(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.pendingBatch = null;
  }
}

export const queryOptimizer = new QueryOptimizer();
