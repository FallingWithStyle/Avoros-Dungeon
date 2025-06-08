
import { db } from "../db";
import { mobs, enemies, rooms } from "@shared/schema";
import { eq, and, lt, isNull, or } from "drizzle-orm";
import { BaseStorage } from "./base-storage";
import { redisService } from "../lib/redis-service";

export interface MobSpawnConfig {
  roomType: string;
  maxMobs: number;
  spawnChance: number;
  enemyTypes: string[];
  respawnHours: number;
}

export class MobStorage extends BaseStorage {
  private mobSpawnConfigs: MobSpawnConfig[] = [
    {
      roomType: "normal",
      maxMobs: 2,
      spawnChance: 0.6,
      enemyTypes: ["normal"],
      respawnHours: 4
    },
    {
      roomType: "boss",
      maxMobs: 1,
      spawnChance: 1.0,
      enemyTypes: ["boss"],
      respawnHours: 12
    },
    {
      roomType: "treasure",
      maxMobs: 3,
      spawnChance: 0.8,
      enemyTypes: ["guardian"],
      respawnHours: 6
    },
    {
      roomType: "safe",
      maxMobs: 0,
      spawnChance: 0.0,
      enemyTypes: [],
      respawnHours: 0
    },
    {
      roomType: "entrance",
      maxMobs: 0,
      spawnChance: 0.0,
      enemyTypes: [],
      respawnHours: 0
    }
  ];

  async getRoomMobs(roomId: number): Promise<any[]> {
    try {
      const cached = await redisService.getRoomMobs(roomId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      console.log('Redis cache miss for room mobs, fetching from database');
    }

    const roomMobs = await db
      .select({
        mob: mobs,
        enemy: enemies
      })
      .from(mobs)
      .innerJoin(enemies, eq(mobs.enemyId, enemies.id))
      .where(eq(mobs.roomId, roomId));

    // Cache for 10 minutes
    try {
      await redisService.setRoomMobs(roomId, roomMobs, 600);
    } catch (error) {
      console.log('Failed to cache room mobs data');
    }

    return roomMobs;
  }

  async processRespawns(): Promise<void> {
    const now = new Date();
    
    // Find dead mobs that should respawn
    const mobsToRespawn = await db
      .select()
      .from(mobs)
      .where(
        and(
          eq(mobs.isAlive, false),
          lt(mobs.respawnAt!, now)
        )
      );

    if (mobsToRespawn.length > 0) {
      console.log(`Respawning ${mobsToRespawn.length} mobs`);
      
      for (const mob of mobsToRespawn) {
        await db
          .update(mobs)
          .set({
            isAlive: true,
            currentHealth: mob.maxHealth,
            respawnAt: null,
            lastKilledAt: null,
            updatedAt: new Date()
          })
          .where(eq(mobs.id, mob.id));

        // Invalidate cache for this room
        try {
          await redisService.invalidateRoomMobs(mob.roomId);
        } catch (error) {
          console.log('Failed to invalidate room mobs cache');
        }
      }
    }
  }

  async killMob(mobId: number): Promise<void> {
    const mob = await db.select().from(mobs).where(eq(mobs.id, mobId)).limit(1);
    if (mob.length === 0) return;

    const mobData = mob[0];
    const config = this.getMobSpawnConfig(mobData.roomId);
    const respawnHours = config?.respawnHours || 4;
    
    const respawnAt = new Date();
    respawnAt.setHours(respawnAt.getHours() + respawnHours);

    await db
      .update(mobs)
      .set({
        isAlive: false,
        currentHealth: 0,
        lastKilledAt: new Date(),
        respawnAt: respawnAt,
        updatedAt: new Date()
      })
      .where(eq(mobs.id, mobId));

    // Invalidate cache
    try {
      await redisService.invalidateRoomMobs(mobData.roomId);
    } catch (error) {
      console.log('Failed to invalidate room mobs cache');
    }
  }

  async damageMob(mobId: number, damage: number): Promise<boolean> {
    const mob = await db.select().from(mobs).where(eq(mobs.id, mobId)).limit(1);
    if (mob.length === 0 || !mob[0].isAlive) return false;

    const mobData = mob[0];
    const newHealth = Math.max(0, mobData.currentHealth - damage);

    await db
      .update(mobs)
      .set({
        currentHealth: newHealth,
        updatedAt: new Date()
      })
      .where(eq(mobs.id, mobId));

    if (newHealth <= 0) {
      await this.killMob(mobId);
      return true; // Mob died
    }

    // Invalidate cache
    try {
      await redisService.invalidateRoomMobs(mobData.roomId);
    } catch (error) {
      console.log('Failed to invalidate room mobs cache');
    }

    return false; // Mob still alive
  }

  async spawnMobsForRoom(roomId: number, roomData: any): Promise<void> {
    const config = this.getMobSpawnConfig(roomData.type);
    if (!config || config.maxMobs === 0) return;

    // Check if room already has mobs
    const existingMobs = await this.getRoomMobs(roomId);
    const aliveMobs = existingMobs.filter(m => m.mob.isAlive);
    
    if (aliveMobs.length >= config.maxMobs) return;

    // Spawn missing mobs
    const mobsToSpawn = config.maxMobs - aliveMobs.length;
    
    for (let i = 0; i < mobsToSpawn; i++) {
      if (Math.random() > config.spawnChance) continue;

      // Get a random enemy of appropriate type
      const availableEnemies = await db
        .select()
        .from(enemies)
        .where(eq(enemies.minFloor, 1)); // TODO: Filter by floor

      if (availableEnemies.length === 0) continue;

      const enemy = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
      const position = this.getRandomPosition();

      // Generate display name with rarity modifier
      const rarityModifiers = {
        common: "",
        uncommon: "Veteran ",
        rare: "Elite ",
        epic: "Champion ",
        legendary: "Legendary "
      };
      
      const displayName = `${rarityModifiers[enemy.rarity as keyof typeof rarityModifiers] || ""}${enemy.name}`;

      await db.insert(mobs).values({
        roomId,
        enemyId: enemy.id,
        displayName,
        rarity: enemy.rarity,
        positionX: position.x.toString(),
        positionY: position.y.toString(),
        currentHealth: enemy.health,
        maxHealth: enemy.health,
        isAlive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Invalidate cache
    try {
      await redisService.invalidateRoomMobs(roomId);
    } catch (error) {
      console.log('Failed to invalidate room mobs cache');
    }
  }

  private getMobSpawnConfig(roomType: string): MobSpawnConfig | null {
    return this.mobSpawnConfigs.find(config => config.roomType === roomType) || null;
  }

  private getRandomPosition(): { x: number; y: number } {
    const cellWidth = 100 / 15;
    const cellHeight = 100 / 15;
    const gridX = Math.floor(Math.random() * 15);
    const gridY = Math.floor(Math.random() * 15);
    
    return {
      x: (gridX + 0.5) * cellWidth,
      y: (gridY + 0.5) * cellHeight,
    };
  }
}
