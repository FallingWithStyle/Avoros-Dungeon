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
    // Check if we already have positions for this room (unless forcing regeneration)
    if (!forceRegenerate) {
      const existingPositions = await this.getTacticalPositions(roomId);
      if (existingPositions.length > 0) {
        console.log(`Using existing tactical data for room ${roomId}`);
        return existingPositions;
      }
    } else {
      // Clear existing positions if forcing regeneration
      await this.clearTacticalPositions(roomId);
      console.log(`Force regenerating tactical data for room ${roomId}`);
    }

    // Generate new positions using the existing logic
    const entities: TacticalEntity[] = [];
    const occupiedCells = new Set<string>();

    // Generate loot positions
    if (roomData.hasLoot) {
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

    // Get mobs from the mob storage system
    if (this.mobStorage && roomData.type !== "safe" && roomData.type !== "entrance" && !roomData.isSafe) {
      // Ensure room has proper mob spawns
      await this.mobStorage.spawnMobsForRoom(roomId, roomData);
      
      // Get current mobs for this room
      const roomMobs = await this.mobStorage.getRoomMobs(roomId);
      
      for (const mobData of roomMobs) {
        if (mobData.mob.isAlive) {
          entities.push({
            type: 'mob',
            name: mobData.enemy.name,
            data: {
              id: mobData.mob.id,
              hp: mobData.mob.currentHealth,
              maxHp: mobData.mob.maxHealth,
              attack: mobData.enemy.attack,
              defense: mobData.enemy.defense,
              speed: mobData.enemy.speed,
              creditsReward: mobData.enemy.creditsReward,
              experienceReward: mobData.enemy.experienceReward,
              hostileType: roomData.type === "boss" ? "boss" : "normal",
            },
            position: {
              x: parseFloat(mobData.mob.positionX),
              y: parseFloat(mobData.mob.positionY)
            },
          });
        }
      }
    }

    // Generate NPC positions
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

    // Save to database
    await this.saveTacticalPositions(roomId, entities);

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

      const crawler = await this.crawlerStorage.getCrawler(crawlerIdNum);
      if (!crawler) {
        console.log(`Crawler ${crawlerId} not found for tactical entities`);
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