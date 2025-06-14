import { db } from "../db";
import {
  crawlers,
  crawlerClasses,
  crawlerEquipment,
  crawlerPositions,
  rooms,
  floors,
  equipment,
  roomConnections,
  type InsertCrawler,
  type Crawler,
  type CrawlerWithDetails,
  type CrawlerClass,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
/**
 * File: crawler-storage.ts
 * Responsibility: Crawler entity management and generation storage operations
 * Notes: Handles crawler CRUD operations, stat generation, candidate creation, and progression tracking
 */
import { BaseStorage } from "./base-storage";
import { redisService } from "../lib/redis-service";
import { getRequestCache, RequestCache } from "../lib/request-cache";
import { queryOptimizer } from "../lib/query-optimizer";

export class CrawlerStorage extends BaseStorage {
  async createCrawler(crawlerData: any): Promise<Crawler> {
    const [newCrawler] = await db
      .insert(crawlers)
      .values({
        sponsorId: crawlerData.sponsorId,
        name: crawlerData.name,
        serial: crawlerData.serial,
        classId: crawlerData.classId,
        background: crawlerData.background,
        health: crawlerData.health,
        maxHealth: crawlerData.maxHealth,
        might: crawlerData.might,
        agility: crawlerData.agility,
        endurance: crawlerData.endurance,
        intellect: crawlerData.intellect,
        charisma: crawlerData.charisma,
        wisdom: crawlerData.wisdom,
        power: crawlerData.power,
        maxPower: crawlerData.maxPower,
        luck: crawlerData.luck,
        competencies: crawlerData.competencies,
        abilities: crawlerData.abilities,
        currentFloor: crawlerData.currentFloor,
        energy: crawlerData.energy,
        maxEnergy: crawlerData.maxEnergy,
        experience: crawlerData.experience,
        level: crawlerData.level,
        gold: crawlerData.gold,
        isAlive: crawlerData.isAlive,
      })
      .returning();

    await this.assignRandomStartingEquipment(newCrawler.id);
    await this.placeCrawlerInEntranceRoom(newCrawler.id);

    return newCrawler;
  }

  async getCrawlersBySponssor(sponsorId: string): Promise<CrawlerWithDetails[]> {
    const result = await db
      .select({
        crawler: crawlers,
        class: crawlerClasses,
      })
      .from(crawlers)
      .leftJoin(crawlerClasses, eq(crawlers.classId, crawlerClasses.id))
      .where(eq(crawlers.sponsorId, sponsorId))
      .orderBy(desc(crawlers.createdAt));

    return result.map((row) => ({
      ...row.crawler,
      class: row.class!,
      equipment: [],
    }));
  }

  async getCrawler(id: number, req?: any): Promise<CrawlerWithDetails | undefined> {
    // Try to get from cache first
    if (req) {
      const requestCache = getRequestCache(req);
      const cacheKey = RequestCache.createKey('crawler', id);
      const cached = requestCache.get<CrawlerWithDetails>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const cached = await this.redisService.getCrawler(id);
      if (cached) {
          if (req) {
            const requestCache = getRequestCache(req);
            const cacheKey = RequestCache.createKey('crawler', id);
            requestCache.set(cacheKey, cached);
          }
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log('Redis cache miss, fetching from database');
    }

    const [result] = await db
      .select({
        crawler: crawlers,
        class: crawlerClasses,
      })
      .from(crawlers)
      .where(eq(crawlers.id, id))
      .leftJoin(crawlerClasses, eq(crawlers.classId, crawlerClasses.id));

    if (!result) {
      return undefined;
    }

    const { cleanExpiredEffects, calculateEffectiveStats } = await import("@shared/effects");
    const crawlerEffects = Array.isArray(result.crawler.activeEffects) ? result.crawler.activeEffects : [];
    const activeEffects = cleanExpiredEffects(crawlerEffects);

    if (activeEffects.length !== crawlerEffects.length) {
      await this.updateCrawler(id, { activeEffects });
    }

    const effectiveStats = calculateEffectiveStats(result.crawler, activeEffects);

    const crawlerData: CrawlerWithDetails = {
      ...result.crawler,
      ...effectiveStats,
      activeEffects,
      class: result.class!,
      equipment: [],
    };

    // Cache the result for future requests
    try {
      await this.redisService.setCrawler(id, crawlerData, 300); // 5 minutes TTL
      if (req) {
        const requestCache = getRequestCache(req);
        const cacheKey = RequestCache.createKey('crawler', id);
        requestCache.set(cacheKey, crawlerData);
      }
    } catch (error) {
      // Redis error, but don't fail the request
      console.log('Failed to cache crawler data');
    }

    return crawlerData;
  }

  async updateCrawler(id: number, updates: Partial<Crawler>): Promise<Crawler> {
    const [crawler] = await db
      .update(crawlers)
      .set({ ...updates, lastAction: new Date() })
      .where(eq(crawlers.id, id))
      .returning();

    // Invalidate cache when crawler is updated
    try {
      await this.redisService.invalidateCrawler(id);
    } catch (error) {
      // Redis error, but don't fail the request
      console.log('Failed to invalidate crawler cache');
    }

    return crawler;
  }

  async getCrawlerClasses(): Promise<CrawlerClass[]> {
    return await db.select().from(crawlerClasses).orderBy(crawlerClasses.name);
  }

  async regenerateEnergy(crawlerId: number): Promise<Crawler> {
    const crawler = await this.getCrawler(crawlerId);
    if (!crawler) throw new Error("Crawler not found");

    const now = new Date();
    const lastRegen = new Date((crawler.lastEnergyRegen || crawler.createdAt) as string | Date);
    const timeDiff = now.getTime() - lastRegen.getTime();
    const minutesPassed = Math.floor(timeDiff / 60000);

    const energyToRestore = Math.min(minutesPassed, crawler.maxEnergy - crawler.energy);
    const powerToRestore = Math.min(minutesPassed, crawler.maxPower - crawler.power);

    if (energyToRestore > 0 || powerToRestore > 0) {
      const [updatedCrawler] = await db
        .update(crawlers)
        .set({
          energy: crawler.energy + energyToRestore,
          power: crawler.power + powerToRestore,
          lastEnergyRegen: now,
        })
        .where(eq(crawlers.id, crawlerId))
        .returning();
      return updatedCrawler;
    }

    return crawler;
  }

  async generateCrawlerCandidates(count = 30): Promise<any[]> {
    const candidates = [];
    const sharedSerial = Math.floor(Math.random() * 1000000);
    const { ContentStorage } = await import("./content-storage");
    const contentStorage = new ContentStorage();

    for (let i = 0; i < count; i++) {
      const stats = this.generateRandomStats();
      const competencies = await contentStorage.getRandomCompetencies();
      const background = await this.generateCrawlerBackground();
      const species = "human";
      const planetType = "earth-like";
      const name = await this.generateCrawlerName(species, planetType);
      const startingEquipment = await contentStorage.getStartingEquipment(background);

      const statValues = [
        { name: "Might", value: stats.might, description: "Physical power and strength" },
        { name: "Agility", value: stats.agility, description: "Speed and dexterity" },
        { name: "Endurance", value: stats.endurance, description: "Stamina and resilience" },
        { name: "Intellect", value: stats.intellect, description: "Reasoning and magic" },
        { name: "Charisma", value: stats.charisma, description: "Social presence" },
        { name: "Wisdom", value: stats.wisdom, description: "Intuition and perception" },
        { name: "Power", value: stats.power, description: "Skill energy and technique" },
      ];
      const topAbility = statValues.reduce((max, stat) => stat.value > max.value ? stat : max);

      candidates.push({
        id: `candidate_${i}`,
        name,
        stats,
        competencies,
        background,
        startingEquipment,
        topAbility,
        species,
        planetType,
        level: 1,
        serial: sharedSerial,
      });
    }

    return candidates;
  }

  private async placeCrawlerInEntranceRoom(crawlerId: number): Promise<void> {
    const [floor1] = await db.select().from(floors).where(eq(floors.floorNumber, 1));
    if (!floor1) return;

    const [entranceRoom] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.floorId, floor1.id), eq(rooms.type, "entrance")));

    if (entranceRoom) {
      await db.insert(crawlerPositions).values({
        crawlerId: crawlerId,
        roomId: entranceRoom.id,
        enteredAt: new Date(),
      });
    }
  }

  private async assignRandomStartingEquipment(crawlerId: number): Promise<void> {
    const availableEquipment = await db.select().from(equipment);
    const numItems = 1 + Math.floor(Math.random() * 3);
    const basicEquipment = availableEquipment.filter((eq) => eq.rarity === "common");

    for (let i = 0; i < numItems; i++) {
      const randomEquipment = basicEquipment[Math.floor(Math.random() * basicEquipment.length)];
      if (randomEquipment) {
        await db.insert(crawlerEquipment).values({
          crawlerId: crawlerId,
          equipmentId: randomEquipment.id,
          equipped: i === 0,
        });
      }
    }
  }

  private generateRandomStats() {
    const stats = [
      Math.floor(Math.random() * 6) + 1, // 1-6 base range
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];

    // Boost one random stat
    const highlightStat = Math.floor(Math.random() * 8);
    if (Math.random() < 0.3) {
      stats[highlightStat] = 6 + Math.floor(Math.random() * 3);
    }

    const endurance = stats[2];
    const intellect = stats[3];
    const health = endurance * 10 + Math.floor(Math.random() * 10);
    const maxEnergy = intellect * 10 + Math.floor(Math.random() * 10);
    const power = Math.floor(Math.random() * 6) + 1;
    const maxPower = power + Math.floor(Math.random() * 5);
    const luck = Math.floor(Math.random() * 6) + 1;

    return {
      health,
      maxHealth: health,
      might: stats[0],
      agility: stats[1],
      endurance: stats[2],
      intellect: stats[3],
      charisma: stats[4],
      wisdom: stats[5],
      power,
      maxPower,
      luck,
      energy: maxEnergy,
      maxEnergy,
    };
  }

  private async generateCrawlerName(species: string = "human", planetType: string = "earth-like"): Promise<string> {
    const { ContentStorage } = await import("./content-storage");
    const contentStorage = new ContentStorage();

    const firstName = await contentStorage.getRandomHumanFirstName();
    const lastName = await contentStorage.getRandomHumanLastName();
    return `${firstName} ${lastName}`;
  }

  private async generateCrawlerBackground(): Promise<string> {
    const { ContentStorage } = await import("./content-storage");
    const contentStorage = new ContentStorage();

    const job = await contentStorage.getRandomPreDungeonJob();
    const backgroundStory = await contentStorage.getRandomCrawlerBackground("desperate");
    return `Former ${job}. ${backgroundStory}`;
  }

  async getCurrentRoom(crawlerId: number, req?: any): Promise<any | null> {
    try {
      // Check request-level cache
      if (req) {
        const requestCache = getRequestCache(req);
        const cacheKey = RequestCache.createKey('current-room', crawlerId);
        const cached = requestCache.get<any>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Check Redis cache
      const cached = await redisService.getCurrentRoom(crawlerId);
      if (cached) {
        if (req) {
          const requestCache = getRequestCache(req);
          const cacheKey = RequestCache.createKey('current-room', crawlerId);
          requestCache.set(cacheKey, cached);
        }
        return cached;
      }

      console.log("Getting current room for crawler", crawlerId);

      // Get position, room data, and connections in a single optimized query
      
      const positionData = await db
        .select({
          room: rooms,
          position: crawlerPositions
        })
        .from(crawlerPositions)
        .innerJoin(rooms, eq(crawlerPositions.roomId, rooms.id))
        .where(eq(crawlerPositions.crawlerId, crawlerId))
        .orderBy(desc(crawlerPositions.enteredAt))
        .limit(1);

      if (!positionData.length) {
        console.log(`No position found for crawler ${crawlerId}`);
        return null;
      }

      const [data] = positionData;
      console.log(`Database query result for crawler ${crawlerId}: Found room: ${data.room.name}`);

      // Fetch connections in parallel with room data (already have room from above)
      const connections = await db
        .select()
        .from(roomConnections)
        .where(eq(roomConnections.fromRoomId, data.room.id));

      const result = {
        room: data.room,
        position: data.position,
        connections: connections
      };

      // Cache the result with longer TTL for room data
      await redisService.setCurrentRoom(crawlerId, result, 300); // 5 minutes
      if (req) {
        const requestCache = getRequestCache(req);
        const cacheKey = RequestCache.createKey('current-room', crawlerId);
        requestCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error("Failed to get current room:", error);
      return null;
    }
  }

  private async generateStartingEquipment(background: string): Promise<any[]> {
    const survivalGear = [
      { name: "Emergency Rations", description: "Compressed nutrition bars" },
      { name: "Water Recycler", description: "Converts moisture into drinking water" },
      { name: "Multi-tool", description: "Basic cutting and repair implement" },
    ];

    const personalItems = [
      { name: "Wedding Ring", description: "Worn platinum band, still warm" },
      { name: "Family Photo", description: "Cracked holoframe showing happier times" },
    ];

    const equipment = [];
    equipment.push(...this.shuffleArray(survivalGear).slice(0, 2));
    equipment.push(...this.shuffleArray(personalItems).slice(0, 1));

    return equipment;
  }
}