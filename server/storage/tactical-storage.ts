/**
 * File: tactical-storage.ts
 * Responsibility: Storage operations for tactical combat data including entity positioning and combat state
 * Notes: Manages tactical grid entities, loot placement, and combat-specific data persistence
 */
import { db } from "../db";
import {
  tacticalPositions,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { BaseStorage } from "./base-storage";
import { redisService } from "../lib/redis-service";

export interface TacticalEntity {
  type: 'loot' | 'mob' | 'npc';
  name: string;
  data: any; // Additional entity-specific data
  position: { x: number; y: number };
}

export class TacticalStorage extends BaseStorage {
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
  async getTacticalPositions(roomId: number): Promise<TacticalEntity[]> {
    // Try to get from cache first
    try {
      const cached = await redisService.getTacticalPositions(roomId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      console.log('Redis cache miss for tactical positions, fetching from database');
    }

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

  async generateAndSaveTacticalData(roomId: number, roomData: any, forceRegenerate: boolean = false): Promise<TacticalEntity[]> {
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
        console.log(`Found ${roomMobs.length} existing mobs in room ${roomId}`);

        // If no mobs exist and this isn't a safe room, try to spawn some
        if (roomMobs.length === 0 && !roomData.isSafe) {
          console.log(`No mobs found in room ${roomId}, attempting to spawn mobs`);
          try {
            await this.mobStorage.spawnMobsForRoom(roomId, roomData);
            // Re-fetch after spawning
            const newRoomMobs = await this.mobStorage.getRoomMobs(roomId);
            console.log(`After spawning attempt: ${newRoomMobs.length} mobs in room ${roomId}`);
            roomMobs.splice(0, roomMobs.length, ...newRoomMobs);
          } catch (spawnError) {
            console.error(`Failed to spawn mobs for room ${roomId}:`, spawnError);
          }
        }

        for (const mobData of roomMobs) {
          if (mobData.mob.isAlive && mobData.mob.isActive) {
            console.log(`Adding mob to tactical data: ${mobData.mob.displayName} at position (${mobData.mob.positionX}, ${mobData.mob.positionY})`);
            entities.push({
              type: 'mob',
              name: mobData.mob.displayName, // Use display name from database
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
                rarity: mobData.mob.rarity, // Include rarity information
              },
              position: {
                x: parseFloat(mobData.mob.positionX),
                y: parseFloat(mobData.mob.positionY)
              },
            });
          } else {
            console.log(`Skipping mob ${mobData.mob.displayName}: alive=${mobData.mob.isAlive}, active=${mobData.mob.isActive}`);
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

    // Save to database (this will overwrite with fresh data)
    await this.saveTacticalPositions(roomId, entities);
    console.log(`Saved ${entities.length} tactical entities for room ${roomId}`);

    return entities;
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