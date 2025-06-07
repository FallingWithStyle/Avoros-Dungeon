
import { db } from "../db";
import {
  crawlers,
  crawlerClasses,
  crawlerEquipment,
  crawlerPositions,
  rooms,
  floors,
  equipment,
  type InsertCrawler,
  type Crawler,
  type CrawlerWithDetails,
  type CrawlerClass,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { BaseStorage } from "./base-storage";

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
        attack: crawlerData.attack,
        defense: crawlerData.defense,
        speed: crawlerData.speed,
        wit: crawlerData.wit,
        charisma: crawlerData.charisma,
        memory: crawlerData.memory,
        luck: crawlerData.luck,
        competencies: crawlerData.competencies,
        abilities: crawlerData.abilities,
        currentFloor: crawlerData.currentFloor,
        energy: crawlerData.energy,
        maxEnergy: crawlerData.maxEnergy,
        experience: crawlerData.experience,
        level: crawlerData.level,
        credits: crawlerData.credits,
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

  async getCrawler(id: number): Promise<CrawlerWithDetails | undefined> {
    const [result] = await db
      .select({
        crawler: crawlers,
        class: crawlerClasses,
      })
      .from(crawlers)
      .leftJoin(crawlerClasses, eq(crawlers.classId, crawlerClasses.id))
      .where(eq(crawlers.id, id));

    if (!result) return undefined;

    const { cleanExpiredEffects, calculateEffectiveStats } = await import("@shared/effects");
    const activeEffects = cleanExpiredEffects(result.crawler.activeEffects || []);

    if (activeEffects.length !== (result.crawler.activeEffects || []).length) {
      await this.updateCrawler(id, { activeEffects });
    }

    const effectiveStats = calculateEffectiveStats(result.crawler, activeEffects);

    return {
      ...result.crawler,
      ...effectiveStats,
      activeEffects,
      class: result.class!,
      equipment: [],
    };
  }

  async updateCrawler(id: number, updates: Partial<Crawler>): Promise<Crawler> {
    const [crawler] = await db
      .update(crawlers)
      .set({ ...updates, lastAction: new Date() })
      .where(eq(crawlers.id, id))
      .returning();
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

    if (energyToRestore > 0) {
      const [updatedCrawler] = await db
        .update(crawlers)
        .set({
          energy: crawler.energy + energyToRestore,
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

    for (let i = 0; i < count; i++) {
      const stats = this.generateRandomStats();
      const competencies = this.generateRandomCompetencies();
      const background = this.generateCrawlerBackground();
      const species = "human";
      const planetType = "earth-like";
      const name = this.generateCrawlerName(species, planetType);
      const startingEquipment = this.generateStartingEquipment(background);

      const statValues = [
        { name: "Combat", value: stats.attack, description: "Direct confrontation" },
        { name: "Defense", value: stats.defense, description: "Survival specialist" },
        { name: "Speed", value: stats.speed, description: "Agile movement" },
        { name: "Wit", value: stats.wit, description: "Problem solving" },
        { name: "Charisma", value: stats.charisma, description: "Social influence" },
        { name: "Memory", value: stats.memory, description: "Information retention" },
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
      Math.floor(Math.random() * 6),
      Math.floor(Math.random() * 6),
      Math.floor(Math.random() * 6),
      Math.floor(Math.random() * 6),
      Math.floor(Math.random() * 6),
      Math.floor(Math.random() * 6),
    ];

    const highlightStat = Math.floor(Math.random() * 6);
    if (Math.random() < 0.3) {
      stats[highlightStat] = 6 + Math.floor(Math.random() * 3);
    }

    const health = 60 + Math.floor(Math.random() * 20);
    const luck = Math.floor(Math.random() * 6);

    return {
      health,
      maxHealth: health,
      attack: stats[0],
      defense: stats[1],
      speed: stats[2],
      wit: stats[3],
      charisma: stats[4],
      memory: stats[5],
      luck,
    };
  }

  private generateRandomCompetencies(): string[] {
    const allCompetencies = [
      "Scavenging", "Lock Picking", "Electronics", "First Aid", "Stealth",
      "Combat Reflexes", "Jury Rigging", "Negotiation", "Intimidation", "Hacking",
      "Demolitions", "Survival", "Leadership", "Marksmanship", "Athletics",
      "Engineering", "Chemistry", "Psychology", "Linguistics", "Navigation",
    ];

    const numCompetencies = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...allCompetencies].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numCompetencies);
  }

  private generateCrawlerName(species: string = "human", planetType: string = "earth-like"): string {
    const firstNames = [
      "Aaron", "Adam", "Adrian", "Albert", "Alexander", "Andrew", "Anthony",
      "Arthur", "Benjamin", "Brian", "Bruce", "Carl", "Charles", "Christopher",
      "Daniel", "David", "Dennis", "Donald", "Douglas", "Edward", "Eric",
      "Alice", "Amanda", "Amy", "Andrea", "Angela", "Anna", "Anne", "Barbara",
      "Betty", "Beverly", "Brenda", "Carol", "Catherine", "Christine", "Cynthia",
    ];

    const lastNames = [
      "Adams", "Allen", "Anderson", "Baker", "Barnes", "Bell", "Bennett",
      "Brooks", "Brown", "Butler", "Campbell", "Carter", "Clark", "Collins",
      "Cooper", "Cox", "Davis", "Edwards", "Evans", "Fisher", "Foster",
    ];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
  }

  private generateCrawlerBackground(): string {
    const job = this.generatePreDungeonJob();
    const desperateBackgrounds = [
      "Hiding from ex-partner's criminal associates who want them dead",
      "Fled into the dungeon after witnessing a mob assassination",
      "Chasing their missing sibling who entered the dungeon weeks ago",
    ];

    const reason = desperateBackgrounds[Math.floor(Math.random() * desperateBackgrounds.length)];
    return `Former ${job}. ${reason}`;
  }

  private generatePreDungeonJob(): string {
    const jobs = [
      "office clerk", "cashier", "data entry specialist", "customer service representative",
      "insurance adjuster", "tax preparer", "filing clerk", "receptionist",
      "bookkeeper", "security guard", "janitor", "mail carrier",
    ];
    return jobs[Math.floor(Math.random() * jobs.length)];
  }

  private generateStartingEquipment(background: string): any[] {
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
