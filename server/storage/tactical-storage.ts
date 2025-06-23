import { db } from "../db";
import {
  tacticalPositions,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
/**
 * File: tactical-storage.ts
 * Responsibility: Tactical positioning and room entity management storage operations
 * Notes: Manages tactical grid positions, entity placement, and room-based tactical data generation
 */
import { BaseStorage } from "./base-storage";
import { redisService } from "../lib/redis-service";
import { RequestCache } from "../lib/request-cache";

export interface TacticalEntity {
  type: 'loot' | 'mob' | 'npc';
  name: string;
  data: any; // Additional entity-specific data
  position: { x: number; y: number };
}

export class TacticalStorage extends BaseStorage {
  private tacticalCache = new Map<string, { data: any; timestamp: number }>();
  private requestCache?: RequestCache;
  private roomDataCache = new Map<number, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // Increased to 60 seconds
  private readonly ROOM_CACHE_TTL = 120000; // 2 minutes for room data
  private crawlerStorage: any;
  private explorationStorage: any;
  private mobStorage: any;

  setCrawlerStorage(storage: any) {
    this.crawlerStorage = storage;
  }

  setExplorationStorage(storage: any) {
    this.explorationStorage = storage;
  }

  setMobStorage(storage: any) {
    this.mobStorage = storage;
  }

  setRequestCache(cache: RequestCache): void {
    this.requestCache = cache;
  }

  private getCachedRoomData(roomId: number): any | null {
    const cached = this.roomDataCache.get(roomId);
    if (cached && Date.now() - cached.timestamp < this.ROOM_CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedRoomData(roomId: number, data: any): void {
    this.roomDataCache.set(roomId, {
      data,
      timestamp: Date.now()
    });
  }

  async getTacticalPositions(roomId: number): Promise<TacticalEntity[]> {
    // Check request cache first
    const cacheKey = RequestCache.createKey('tactical_positions', roomId);
    if (this.requestCache) {
      const cached = this.requestCache.get<TacticalEntity[]>(cacheKey);
      if (cached) {
        // Request cache hit for tactical positions
        return cached;
      }
    }

    // Try to get from cache first
    try {
      const cached = await redisService.getTacticalPositions(roomId);
      if (cached) {
        if (this.requestCache) {
          this.requestCache.set(cacheKey, cached);
        }
        return cached;
      }
    } catch (error) {
      // Redis cache miss for tactical positions
    }

    // Get tactical positions (loot, NPCs) from tactical_positions table
    const positions = await db
      .select()
      .from(tacticalPositions)
      .where(
        and(
          eq(tacticalPositions.roomId, roomId),
          eq(tacticalPositions.isActive, true)
        )
      );

    const entities: TacticalEntity[] = positions.map(pos => ({
      type: pos.entityType as 'loot' | 'mob' | 'npc',
      name: (pos.entityData as any)?.name || 'Unknown',
      data: pos.entityData || {},
      position: {
        x: parseFloat(pos.positionX),
        y: parseFloat(pos.positionY),
      },
    }));

    // Get mobs from mobs table and add them to tactical entities
    if (this.mobStorage && typeof this.mobStorage.getRoomMobs === 'function') {
      try {
        const roomMobs = await this.mobStorage.getRoomMobs(roomId);
        for (const mobData of roomMobs) {
          if (mobData.mob.isAlive && mobData.mob.isActive) {
            entities.push({
              type: 'mob',
              name: mobData.mob.displayName,
              data: {
                id: mobData.mob.id,
                hp: mobData.mob.currentHealth,
                maxHp: mobData.mob.maxHealth,
                attack: mobData.mobType.attack,
                defense: mobData.mobType.defense,
                speed: mobData.mobType.speed,
                creditsReward: mobData.mobType.creditsReward,
                experienceReward: mobData.mobType.experienceReward,
                rarity: mobData.mob.rarity,
              },
              position: {
                x: parseFloat(mobData.mob.positionX),
                y: parseFloat(mobData.mob.positionY)
              },
            });
          }
        }
        // Added mobs from mobs table to tactical positions
      } catch (error) {
        console.error(`Error getting mobs for tactical positions in room ${roomId}:`, error);
      }
    }

    // Cache in request cache
    if (this.requestCache) {
      this.requestCache.set(cacheKey, entities);
    }

    // Cache the result
    try {
      await redisService.setTacticalPositions(roomId, entities, 1800); // 30 minutes TTL
    } catch (error) {
      console.log('Failed to cache tactical positions data');
    }

    return entities;
  }

  async saveTacticalPositions(roomId: number, entities: TacticalEntity[]): Promise<void> {
    // First, deactivate existing positions for this room
    await db
      .update(tacticalPositions)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tacticalPositions.roomId, roomId));

    // Insert new positions
    if (entities.length > 0) {
      const insertData = entities.map(entity => ({
        roomId,
        entityType: entity.type,
        entityData: entity.data,
        positionX: entity.position.x.toString(),
        positionY: entity.position.y.toString(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(tacticalPositions).values(insertData);
    }

    // Invalidate cache
    try {
      await redisService.invalidateTacticalPositions(roomId);
    } catch (error) {
      console.log('Failed to invalidate tactical positions cache');
    }
  }

  async clearTacticalPositions(roomId: number): Promise<void> {
    await db.delete(tacticalPositions).where(eq(tacticalPositions.roomId, roomId));
    console.log(`Cleared tactical positions for room ${roomId}`);
  }

  async removeAllMobsFromTacticalPositions(): Promise<number> {
    const { sql } = await import("drizzle-orm");
    
    // Count mobs before deletion
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM tactical_positions 
      WHERE entity_type = 'mob'
    `);
    const mobCount = countResult.rows?.[0]?.count || countResult[0]?.count || 0;
    
    // Delete all mob entries
    await db.execute(sql`
      DELETE FROM tactical_positions 
      WHERE entity_type = 'mob'
    `);
    
    console.log(`Removed ${mobCount} mob entries from tactical_positions`);
    return mobCount;
  }

  async generateAndSaveTacticalData(roomId: number, roomData: any, forceRegenerate: boolean = false): Promise<TacticalEntity[]> {
    // Check if we have cached tactical data that's still fresh
    const cacheKey = `tactical_entities_${roomId}`;
    try {
      const cached = await redisService.get(cacheKey);
      if (cached) {
        console.log(`Using cached tactical entities for room ${roomId}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.log('Redis cache miss, generating fresh tactical data');
    }

    // Always get fresh mob data from the database - don't rely on cached tactical positions for mobs
    const entities: TacticalEntity[] = [];
    const occupiedCells = new Set<string>();

    // Check if we already have NON-MOB positions for this room (unless forcing regeneration)
    let existingNonMobEntities: TacticalEntity[] = [];
    if (!forceRegenerate) {
      const existingPositions = await this.getTacticalPositions(roomId);
      // Keep only loot and NPC entities from existing data
      existingNonMobEntities = existingPositions.filter(entity => entity.type !== 'mob');

      if (existingNonMobEntities.length > 0) {
        console.log(`Using existing non-mob tactical data for room ${roomId}`);
        entities.push(...existingNonMobEntities);

        // Mark cells as occupied by existing entities
        existingNonMobEntities.forEach(entity => {
          const gridX = Math.floor((entity.position.x / 100) * 15);
          const gridY = Math.floor((entity.position.y / 100) * 15);
          occupiedCells.add(`${gridX},${gridY}`);
        });
      }
    } else {
      // Clear existing positions if forcing regeneration
      await this.clearTacticalPositions(roomId);
      console.log(`Force regenerating tactical data for room ${roomId}`);
    }

    // Generate loot positions if we don't have existing ones
    const hasExistingLoot = existingNonMobEntities.some(e => e.type === 'loot');
    if (!hasExistingLoot && roomData.hasLoot) {
      const lootCount = roomData.type === "treasure" ? 3 : Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < lootCount; i++) {
        const cell = this.getRandomEmptyCell(occupiedCells);
        const pos = this.gridToPercentage(cell.gridX, cell.gridY);

        entities.push({
          type: 'loot',
          name: roomData.type === "treasure" ? 
            (i === 0 ? "Treasure Chest" : i === 1 ? "Golden Coins" : "Precious Gems") :
            (Math.random() > 0.5 ? "Dropped Item" : "Equipment"),
          data: {
            itemType: roomData.type === "treasure" ? "treasure" : (Math.random() > 0.5 ? "treasure" : "weapon"),
            value: Math.floor(Math.random() * 100) + 10,
          },
          position: pos,
        });
      }
    }

    // ALWAYS get fresh mob data - never use cached mob positions
    if (this.mobStorage && typeof this.mobStorage.getRoomMobs === 'function' && roomData.type !== "safe" && roomData.type !== "entrance" && !roomData.isSafe) {
      console.log(`Getting fresh mob data for room ${roomId} (type: ${roomData.type}, isSafe: ${roomData.isSafe})`);

      try {
        // Clear any corrupted mob cache first
        try {
          await redisService.invalidateRoomMobs(roomId);
          console.log(`Cleared potentially corrupted mob cache for room ${roomId}`);
        } catch (cacheError) {
          console.log('Failed to clear mob cache, continuing:', cacheError);
        }

        // First check if we need to spawn mobs for this room
        const roomMobs = await this.mobStorage.getRoomMobs(roomId);
        // If no mobs exist and this isn't a safe room, try to spawn some (with rate limiting)
        if (roomMobs.length === 0 && !roomData.isSafe) {
          // Check if we've recently attempted to spawn mobs for this room
          const spawnCacheKey = `mob_spawn_attempt_${roomId}`;
          const lastSpawnAttempt = await redisService.get(spawnCacheKey);
          
          if (!lastSpawnAttempt) {
            // Set a 5-minute cooldown on spawn attempts for this room
            await redisService.set(spawnCacheKey, Date.now().toString(), 'EX', 300);
            
            try {
              await this.mobStorage.spawnMobsForRoom(roomId, roomData);
              // Re-fetch after spawning
              const newRoomMobs = await this.mobStorage.getRoomMobs(roomId);
              roomMobs.splice(0, roomMobs.length, ...newRoomMobs);
            } catch (spawnError) {
              console.error(`Failed to spawn mobs for room ${roomId}:`, spawnError);
            }
          }
        }

        // Add mob entities to the response but DON'T save them to tactical_positions
        for (const mobData of roomMobs) {
          if (mobData.mob.isAlive && mobData.mob.isActive) {
            entities.push({
              type: 'mob',
              name: mobData.mob.displayName,
              data: {
                id: mobData.mob.id,
                hp: mobData.mob.currentHealth,
                maxHp: mobData.mob.maxHealth,
                attack: mobData.mobType.attack,
                defense: mobData.mobType.defense,
                speed: mobData.mobType.speed,
                creditsReward: mobData.mobType.creditsReward,
                experienceReward: mobData.mobType.experienceReward,
                hostileType: roomData.type === "boss" ? "boss" : "normal",
                rarity: mobData.mob.rarity,
              },
              position: {
                x: parseFloat(mobData.mob.positionX),
                y: parseFloat(mobData.mob.positionY)
              },
            });
          }
        }
      } catch (mobError) {
        console.error(`ERROR getting mob data for room ${roomId}:`, mobError);
        console.log(`Continuing without mob data for room ${roomId}`);
        // Don't throw the error, just log it and continue without mobs
      }
    } else {
      console.log(`Skipping mob data for room ${roomId} - type: ${roomData.type}, isSafe: ${roomData.isSafe}`);
    }

    // Generate NPC positions if we don't have existing ones
    const hasExistingNPCs = existingNonMobEntities.some(e => e.type === 'npc');
    if (!hasExistingNPCs) {
      if (roomData.isSafe || roomData.type === "safe") {
        const cell = this.getRandomEmptyCell(occupiedCells);
        const pos = this.gridToPercentage(cell.gridX, cell.gridY);

        entities.push({
          type: 'npc',
          name: "Sanctuary Keeper",
          data: {
            dialogue: true,
            services: ["rest", "information"],
            personality: "helpful",
          },
          position: pos,
        });
      } else if (Math.random() > 0.8) {
        const cell = this.getRandomEmptyCell(occupiedCells);
        const pos = this.gridToPercentage(cell.gridX, cell.gridY);

        entities.push({
          type: 'npc',
          name: "Wandering Merchant",
          data: {
            dialogue: true,
            services: ["trade", "information"],
            personality: "quirky",
          },
          position: pos,
        });
      }
    }

    // Save ONLY non-mob entities to database (mobs are stored in mobs table)
    const nonMobEntities = entities.filter(entity => entity.type !== 'mob');
    await this.saveTacticalPositions(roomId, nonMobEntities);
    
    console.log(`Saved ${nonMobEntities.length} non-mob tactical entities to database (${entities.length - nonMobEntities.length} mobs stored separately)`);

    // Cache the result for 15 seconds to speed up subsequent requests
    try {
      await redisService.set(cacheKey, JSON.stringify(entities), 'EX', 15);
    } catch (error) {
      console.log('Failed to cache tactical entities');
    }

    console.log(`Saved ${entities.length} tactical entities for room ${roomId}`);

    return entities;
  }

  async clearTacticalEntities(roomId: number): Promise<void> {
    await db.delete(tacticalPositions).where(eq(tacticalPositions.roomId, roomId));
    console.log(`Cleared tactical entities for room ${roomId}`);
  }

  async removeAllMobsFromTacticalPositions(): Promise<number> {
    const result = await db.delete(tacticalPositions)
      .where(eq(tacticalPositions.entityType, 'mob'));
    
    console.log(`Removed all mob entries from tactical_positions table`);
    return Array.isArray(result) ? result.length : 0;
  }

  private getRandomEmptyCell(excludeCells: Set<string> = new Set()): { gridX: number; gridY: number } {
    let attempts = 0;
    while (attempts < 100) {
      const gridX = Math.floor(Math.random() * 15);
      const gridY = Math.floor(Math.random() * 15);
      const cellKey = `${gridX},${gridY}`;

      if (!excludeCells.has(cellKey)) {
        excludeCells.add(cellKey);
        return { gridX, gridY };
      }
      attempts++;
    }
    return { gridX: 7, gridY: 7 };
  }

  private gridToPercentage(gridX: number, gridY: number): { x: number; y: number } {
    const cellWidth = 100 / 15;
    const cellHeight = 100 / 15;
    return {
      x: (gridX + 0.5) * cellWidth,
      y: (gridY + 0.5) * cellHeight,
    };
  }

  async getTacticalEntities(crawlerId: string | number): Promise<TacticalEntity[]> {
    try {
      const crawlerIdNum = Number(crawlerId);
      if (isNaN(crawlerIdNum)) {
        console.log(`Invalid crawler ID: ${crawlerId}`);
        return [];
      }

      if (!this.crawlerStorage || typeof this.crawlerStorage.getCrawler !== 'function') {
        console.log(`Crawler storage not properly initialized`);
        return [];
      }

      const crawler = await this.crawlerStorage.getCrawler(crawlerIdNum);
      if (!crawler) {
        console.log(`Crawler ${crawlerId} not found for tactical entities`);
        return [];
      }

      if (!this.explorationStorage || typeof this.explorationStorage.getCrawlerCurrentRoom !== 'function') {
        console.log(`Exploration storage not properly initialized`);
        return [];
      }

      const currentRoom = await this.explorationStorage.getCrawlerCurrentRoom(crawlerIdNum);
      if (!currentRoom) {
        console.log(`No current room found for crawler ${crawlerId}`);
        return [];
      }

      // Get tactical entities for the current room
      return await this.getTacticalPositions(currentRoom.id);
    } catch (error) {
      console.error("Error fetching tactical entities:", error);
      return [];
    }
  }
}