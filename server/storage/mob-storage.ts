
import { db } from "../db";
import { mobs, mobTypes, rooms, factions } from "@shared/schema";
import { eq, and, lt, isNull, or } from "drizzle-orm";
import { BaseStorage } from "./base-storage";
import { redisService } from "../lib/redis-service";

export interface MobSpawnConfig {
  roomType: string;
  maxMobs: number;
  spawnChance: number;
  creatureCategories: string[];
  respawnHours: number;
}

export interface ContextualSpawnConfig {
  roomType: string;
  environment: string;
  factionId: number | null;
  maxMobs: number;
  spawnChance: number;
  creatureTypes: string[];
  respawnHours: number;
}

export interface DispositionModifier {
  creatureCategory: string;
  factionAlignment: number; // -100 to +100
  crawlerReputation: number; // -100 to +100
}

export class MobStorage extends BaseStorage {
  private baseMobSpawnConfigs: MobSpawnConfig[] = [
    {
      roomType: "normal",
      maxMobs: 2,
      spawnChance: 0.6,
      creatureCategories: ["combat", "neutral"],
      respawnHours: 4
    },
    {
      roomType: "boss",
      maxMobs: 1,
      spawnChance: 1.0,
      creatureCategories: ["boss"],
      respawnHours: 12
    },
    {
      roomType: "treasure",
      maxMobs: 3,
      spawnChance: 0.8,
      creatureCategories: ["combat", "guardian"],
      respawnHours: 6
    },
    {
      roomType: "safe",
      maxMobs: 1,
      spawnChance: 0.8,
      creatureCategories: ["npc", "merchant", "healer"],
      respawnHours: 0
    },
    {
      roomType: "entrance",
      maxMobs: 1,
      spawnChance: 0.3,
      creatureCategories: ["npc", "guide"],
      respawnHours: 0
    }
  ];

  // Fallback mob types for rooms without faction control
  private neutralMobTypesByRoomType: Record<string, string[]> = {
    "normal": ["wanderer", "scavenger", "lost_soul", "wild_beast"],
    "treasure": ["guardian", "treasure_hunter", "construct", "ward"],
    "boss": ["ancient_guardian", "dungeon_lord", "aberration"],
    "stairs": ["sentinel", "gatekeeper"],
    "safe": [], // Safe rooms shouldn't have hostile mobs
    "entrance": [] // Entrance rooms are typically clear
  };

  private neutralMobTypesByEnvironment: Record<string, string[]> = {
    "indoor": ["shadow", "construct", "undead", "cultist"],
    "outdoor": ["wild_beast", "elemental", "nature_spirit", "bandit"],
    "underground": ["dweller", "crawler", "cave_beast", "mushroom_folk"]
  };

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
        mobType: mobTypes
      })
      .from(mobs)
      .innerJoin(mobTypes, eq(mobs.enemyId, mobTypes.id))
      .where(and(eq(mobs.roomId, roomId), eq(mobs.isActive, true)));

    // Cache for 10 minutes
    try {
      await redisService.setRoomMobs(roomId, roomMobs, 600);
    } catch (error) {
      console.log('Failed to cache room mobs data');
    }

    return roomMobs;
  }

  async getHostileMobs(roomId: number): Promise<any[]> {
    const roomMobs = await this.getRoomMobs(roomId);
    return roomMobs.filter(mobData => mobData.mob.disposition < 0 && mobData.mob.isAlive);
  }

  async getFriendlyMobs(roomId: number): Promise<any[]> {
    const roomMobs = await this.getRoomMobs(roomId);
    return roomMobs.filter(mobData => mobData.mob.disposition > 0 && mobData.mob.isAlive);
  }

  async getNeutralMobs(roomId: number): Promise<any[]> {
    const roomMobs = await this.getRoomMobs(roomId);
    return roomMobs.filter(mobData => mobData.mob.disposition === 0 && mobData.mob.isAlive);
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
    console.log('🚀 spawnMobsForRoom called for room:', roomId, 'with data:', roomData);

    const spawnConfig = await this.getContextualSpawnConfig(roomData);
    if (!spawnConfig || spawnConfig.maxMobs === 0) {
      console.log('❌ No spawn config or maxMobs is 0, skipping spawn');
      return;
    }

    // Check if room already has mobs
    const existingMobs = await this.getRoomMobs(roomId);
    const aliveMobs = existingMobs.filter(m => m.mob.isAlive);
    
    console.log('📊 Room mob status:', {
      existingMobs: existingMobs.length,
      aliveMobs: aliveMobs.length,
      maxMobs: spawnConfig.maxMobs
    });
    
    if (aliveMobs.length >= spawnConfig.maxMobs) {
      console.log('✋ Room already has maximum mobs, skipping spawn');
      return;
    }

    // Spawn missing mobs
    const mobsToSpawn = spawnConfig.maxMobs - aliveMobs.length;
    console.log('🎲 Will attempt to spawn', mobsToSpawn, 'mobs with chance', spawnConfig.spawnChance);
    
    for (let i = 0; i < mobsToSpawn; i++) {
      const spawnRoll = Math.random();
      console.log(`🎯 Spawn attempt ${i + 1}/${mobsToSpawn}: rolled ${spawnRoll} vs chance ${spawnConfig.spawnChance}`);
      
      if (spawnRoll > spawnConfig.spawnChance) {
        console.log('❌ Spawn roll failed, skipping this mob');
        continue;
      }

      // Generate mob based on context
      const mobData = await this.generateContextualMob(spawnConfig, roomData);
      if (!mobData) {
        console.log('❌ Failed to generate mob data, skipping');
        continue;
      }

      const position = this.getRandomPosition();
      console.log('📍 Generated position:', position);

      console.log('💾 Inserting mob into database:', {
        roomId,
        enemyId: mobData.mobTypeId,
        displayName: mobData.displayName,
        rarity: mobData.rarity,
        health: mobData.health,
        position
      });

      await db.insert(mobs).values({
        roomId,
        enemyId: mobData.mobTypeId, // Using enemyId to match schema
        displayName: mobData.displayName,
        rarity: mobData.rarity,
        positionX: position.x.toString(),
        positionY: position.y.toString(),
        currentHealth: mobData.health,
        maxHealth: mobData.health,
        isAlive: true,
        disposition: -50, // Default hostile disposition
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('✅ Successfully spawned mob:', mobData.displayName);
    }

    // Invalidate cache
    try {
      await redisService.invalidateRoomMobs(roomId);
      console.log('🗑️ Invalidated room mobs cache');
    } catch (error) {
      console.log('Failed to invalidate room mobs cache');
    }
  }

  private async getContextualSpawnConfig(roomData: any): Promise<ContextualSpawnConfig | null> {
    console.log('🏠 getContextualSpawnConfig called with roomData:', {
      type: roomData.type,
      environment: roomData.environment,
      factionId: roomData.factionId
    });

    const baseConfig = this.getMobSpawnConfig(roomData.type);
    if (!baseConfig) {
      console.log('❌ No base config found for room type:', roomData.type);
      return null;
    }

    console.log('⚙️ Base config found:', baseConfig);

    let mobTypes: string[] = [];
    
    // If room is controlled by a faction, use faction mob types
    if (roomData.factionId) {
      console.log('🏛️ Room controlled by faction:', roomData.factionId);
      const faction = await this.getFactionById(roomData.factionId);
      console.log('📊 Faction data:', faction);
      if (faction && faction.mobTypes) {
        mobTypes = faction.mobTypes;
        console.log('🎭 Using faction mob types:', mobTypes);
      }
    }
    
    // Fallback to neutral mobs based on room type and environment
    if (mobTypes.length === 0) {
      const roomTypeMobs = this.neutralMobTypesByRoomType[roomData.type] || [];
      const environmentMobs = this.neutralMobTypesByEnvironment[roomData.environment] || [];
      mobTypes = [...roomTypeMobs, ...environmentMobs];
      console.log('🌍 Using neutral mob types:', {
        roomTypeMobs,
        environmentMobs,
        combined: mobTypes
      });
    }
    
    // Further fallback to basic types
    if (mobTypes.length === 0) {
      mobTypes = baseConfig.creatureCategories;
      console.log('🔧 Using base config creature categories:', mobTypes);
    }

    const finalConfig = {
      roomType: roomData.type,
      environment: roomData.environment,
      factionId: roomData.factionId,
      maxMobs: baseConfig.maxMobs,
      spawnChance: baseConfig.spawnChance,
      mobTypes,
      respawnHours: baseConfig.respawnHours
    };

    console.log('✅ Final spawn config:', finalConfig);
    return finalConfig;
  }

  private async generateContextualMob(spawnConfig: ContextualSpawnConfig, roomData: any) {
    console.log('🎲 generateContextualMob called with:', {
      roomType: spawnConfig.roomType,
      environment: spawnConfig.environment,
      factionId: spawnConfig.factionId,
      mobTypes: spawnConfig.mobTypes
    });

    // Get appropriate enemies based on mob types
    const selectedMobCategory = spawnConfig.mobTypes[Math.floor(Math.random() * spawnConfig.mobTypes.length)];
    console.log('🎯 Selected mob category:', selectedMobCategory);
    
    // Try to find mob types that match the selected category in their name or description
    let availableMobTypes = await db
      .select()
      .from(mobTypes)
      .where(eq(mobTypes.minFloor, 1)); // TODO: Filter by actual floor

    console.log('📋 Available mob types from database:', availableMobTypes.map(mt => ({
      id: mt.id,
      name: mt.name,
      description: mt.description
    })));

    // Filter mob types by selected category if possible
    const filteredMobTypes = availableMobTypes.filter(mobTypeRecord => 
      mobTypeRecord.name.toLowerCase().includes(selectedMobCategory.toLowerCase()) ||
      (mobTypeRecord.description && mobTypeRecord.description.toLowerCase().includes(selectedMobCategory.toLowerCase()))
    );
    
    console.log('🔍 Filtered mob types:', filteredMobTypes.map(mt => ({
      id: mt.id,
      name: mt.name,
      matchedCategory: selectedMobCategory
    })));
    
    // Use filtered mob types if found, otherwise fall back to all available
    const mobTypesToChoose = filteredMobTypes.length > 0 ? filteredMobTypes : availableMobTypes;
    
    console.log('⚔️ Final mob types to choose from:', mobTypesToChoose.map(mt => ({
      id: mt.id,
      name: mt.name
    })));
    
    if (mobTypesToChoose.length === 0) {
      console.log('❌ No mob types available to choose from!');
      return null;
    }

    const selectedMobType = mobTypesToChoose[Math.floor(Math.random() * mobTypesToChoose.length)];
    console.log('🎲 Selected mob type:', {
      id: selectedMobType.id,
      name: selectedMobType.name,
      rarity: selectedMobType.rarity,
      health: selectedMobType.health
    });
    
    // Generate contextual display name
    const displayName = this.generateContextualDisplayName(selectedMobType, spawnConfig, selectedMobCategory);
    console.log('📝 Generated display name:', displayName);
    
    return {
      mobTypeId: selectedMobType.id,
      displayName,
      rarity: selectedMobType.rarity,
      health: selectedMobType.health
    };
  }

  private generateContextualDisplayName(selectedMobType: any, spawnConfig: ContextualSpawnConfig, mobType: string): string {
    console.log('🏷️ generateContextualDisplayName called with:', {
      selectedMobTypeName: selectedMobType.name,
      selectedMobTypeRarity: selectedMobType.rarity,
      mobTypeCategory: mobType,
      factionId: spawnConfig.factionId
    });

    const rarityModifiers = {
      common: "",
      uncommon: "Veteran ",
      rare: "Elite ",
      epic: "Champion ",
      legendary: "Legendary "
    };
    
    let prefix = rarityModifiers[selectedMobType.rarity as keyof typeof rarityModifiers] || "";
    console.log('💎 Rarity prefix:', prefix);
    
    // Add faction-specific prefixes
    if (spawnConfig.factionId) {
      const factionPrefixes: Record<string, string> = {
        "1": "Iron Legion ", // Iron Legion
        "2": "Verdant ", // Verdant Pact
        "3": "Shadow ", // Shadow Veil
        "4": "Azure ", // Azure Order
        "5": "Crimson " // Crimson Banner
      };
      
      const factionPrefix = factionPrefixes[spawnConfig.factionId.toString()];
      if (factionPrefix) {
        prefix = factionPrefix + prefix;
        console.log('🏛️ Added faction prefix:', factionPrefix, 'Total prefix:', prefix);
      }
    }
    
    // Use mob type as the base name if mob name is generic
    const isGenericName = selectedMobType.name === "Unknown" || selectedMobType.name === "Generic Mob";
    console.log('🤔 Is generic name?', isGenericName, 'Original name:', selectedMobType.name);
    
    const baseName = isGenericName
      ? mobType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      : selectedMobType.name;
    
    console.log('🎯 Base name determined:', baseName);
    
    const finalName = `${prefix}${baseName}`;
    console.log('✨ Final display name:', finalName);
    
    return finalName;
  }

  private async getFactionById(factionId: number) {
    try {
      const [faction] = await db
        .select()
        .from(factions)
        .where(eq(factions.id, factionId))
        .limit(1);
      
      return faction || null;
    } catch (error) {
      console.log('Failed to fetch faction data:', error);
      return null;
    }
  }

  async updateMobDisposition(mobId: number, dispositionChange: number): Promise<void> {
    const mob = await db.select().from(mobs).where(eq(mobs.id, mobId)).limit(1);
    if (mob.length === 0) return;

    const newDisposition = Math.max(-100, Math.min(100, mob[0].disposition + dispositionChange));
    
    await db
      .update(mobs)
      .set({
        disposition: newDisposition,
        lastInteractionAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(mobs.id, mobId));

    // Invalidate cache
    try {
      await redisService.invalidateRoomMobs(mob[0].roomId);
    } catch (error) {
      console.log('Failed to invalidate room mobs cache');
    }
  }

  async setMobActive(mobId: number, isActive: boolean): Promise<void> {
    const mob = await db.select().from(mobs).where(eq(mobs.id, mobId)).limit(1);
    if (mob.length === 0) return;

    await db
      .update(mobs)
      .set({
        isActive,
        updatedAt: new Date()
      })
      .where(eq(mobs.id, mobId));

    // Invalidate cache
    try {
      await redisService.invalidateRoomMobs(mob[0].roomId);
    } catch (error) {
      console.log('Failed to invalidate room mobs cache');
    }
  }

  private getMobSpawnConfig(roomType: string): MobSpawnConfig | null {
    return this.baseMobSpawnConfigs.find(config => config.roomType === roomType) || null;
  }

  async spawnSingleMob(roomId: number, roomData: any, forceSpawn: boolean = false): Promise<void> {
    console.log('🎯 spawnSingleMob called for room:', roomId, 'forceSpawn:', forceSpawn);

    try {
      // Validate inputs
      if (!roomId || !roomData) {
        throw new Error('Invalid roomId or roomData provided');
      }

      const spawnConfig = await this.getContextualSpawnConfig(roomData);
      if (!spawnConfig && !forceSpawn) {
        console.log('❌ No spawn config and not forced, skipping spawn');
        return;
      }

      // Use default config if none found but forced
      const finalConfig = spawnConfig || {
        roomType: roomData.type || 'normal',
        environment: roomData.environment || 'indoor',
        factionId: roomData.factionId,
        maxMobs: 1,
        spawnChance: 1.0,
        mobTypes: ["combat", "hostile"],
        respawnHours: 4
      };

      console.log('🎯 Final spawn config:', finalConfig);

      // Generate mob based on context
      const mobData = await this.generateContextualMob(finalConfig, roomData);
      if (!mobData) {
        console.log('❌ Failed to generate mob data for forced spawn');
        throw new Error('Failed to generate mob data - no available mob types');
      }

      // Validate mob data
      if (!mobData.mobTypeId || !mobData.displayName || !mobData.health) {
        console.log('❌ Invalid mob data generated:', mobData);
        throw new Error('Generated mob data is invalid');
      }

      const position = this.getRandomPosition();
      console.log('📍 Generated position for forced spawn:', position);

      const insertData = {
        roomId,
        enemyId: mobData.mobTypeId,
        displayName: mobData.displayName,
        rarity: mobData.rarity || 'common',
        positionX: position.x.toString(),
        positionY: position.y.toString(),
        currentHealth: mobData.health,
        maxHealth: mobData.health,
        isAlive: true,
        disposition: -75, // More hostile for debug spawned mobs
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('💾 Inserting forced mob into database:', insertData);

      const result = await db.insert(mobs).values(insertData);
      console.log('📝 Database insert result:', result);

      console.log('✅ Successfully force spawned mob:', mobData.displayName);

      // Invalidate cache
      try {
        await redisService.invalidateRoomMobs(roomId);
        console.log('🗑️ Invalidated room mobs cache for forced spawn');
      } catch (error) {
        console.log('⚠️ Failed to invalidate room mobs cache:', error);
        // Don't throw here, cache invalidation failure shouldn't break spawn
      }
    } catch (error) {
      console.error('💥 Error in spawnSingleMob:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      throw error; // Re-throw to let caller handle it
    }
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
