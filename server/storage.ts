import {
  users,
  crawlers,
  crawlerClasses,
  equipment,
  equipmentTypes,
  crawlerEquipment,
  floors,
  enemies,
  encounters,
  activities,
  chatMessages,
  marketplaceListings,
  seasons,
  type UpsertUser,
  type User,
  type InsertCrawler,
  type Crawler,
  type CrawlerWithDetails,
  type CrawlerClass,
  type Equipment,
  type EquipmentType,
  type Activity,
  type ActivityWithDetails,
  type ChatMessage,
  type ChatMessageWithUser,
  type MarketplaceListing,
  type MarketplaceListingWithDetails,
  type Floor,
  type Enemy,
  type Encounter,
  type Season,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Crawler operations
  createCrawler(crawlerData: InsertCrawler): Promise<Crawler>;
  getCrawlersBySponssor(sponsorId: string): Promise<CrawlerWithDetails[]>;
  getCrawler(id: number): Promise<CrawlerWithDetails | undefined>;
  updateCrawler(id: number, updates: Partial<Crawler>): Promise<Crawler>;
  
  // Season operations
  getCurrentSeason(): Promise<Season | undefined>;
  canCreatePrimaryCrawler(userId: string): Promise<boolean>;
  getAvailableSecondarySponsorships(): Promise<CrawlerWithDetails[]>;
  resetUserPrimarySponsorshipForNewSeason(userId: string, seasonNumber: number): Promise<User>;
  
  // Crawler generation
  generateCrawlerCandidates(count?: number): Promise<any[]>;
  
  // Crawler classes
  getCrawlerClasses(): Promise<CrawlerClass[]>;
  
  // Equipment operations
  getEquipment(): Promise<Equipment[]>;
  getEquipmentById(id: number): Promise<Equipment | undefined>;
  getCrawlerEquipment(crawlerId: number): Promise<Equipment[]>;
  
  // Combat and encounters
  createEncounter(crawlerId: number, floorId: number, enemyId?: number): Promise<Encounter>;
  getActiveEncounter(crawlerId: number): Promise<Encounter | undefined>;
  updateEncounter(id: number, updates: Partial<Encounter>): Promise<Encounter>;
  
  // Floors and enemies
  getFloor(floorNumber: number): Promise<Floor | undefined>;
  getEnemiesForFloor(floorNumber: number): Promise<Enemy[]>;
  
  // Activities and notifications
  createActivity(activityData: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity>;
  getRecentActivities(userId: string, limit?: number): Promise<ActivityWithDetails[]>;
  
  // Chat
  createChatMessage(userId: string, message: string): Promise<ChatMessage>;
  getRecentChatMessages(limit?: number): Promise<ChatMessageWithUser[]>;
  
  // Leaderboards
  getTopCrawlers(limit?: number): Promise<CrawlerWithDetails[]>;
  
  // Marketplace
  getMarketplaceListings(limit?: number): Promise<MarketplaceListingWithDetails[]>;
  
  // Credits and transactions
  updateUserCredits(userId: string, amount: number): Promise<User>;
  updateUserActiveCrawler(userId: string, crawlerId: number): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Generate corporation name if not provided
    const corporationName = userData.corporationName || this.generateCorporationName();
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        corporationName,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          corporationName,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  private generateCorporationName(): string {
    const prefixes = [
      "Stellar", "Cosmic", "Quantum", "Neural", "Cyber", "Nano", "Void", "Dark", 
      "Prime", "Omega", "Alpha", "Beta", "Gamma", "Delta", "Nexus", "Core",
      "Apex", "Matrix", "Vector", "Phoenix", "Titan", "Nova", "Orbital", "Galactic"
    ];
    
    const suffixes = [
      "Industries", "Corporation", "Enterprises", "Dynamics", "Systems", "Technologies",
      "Solutions", "Consortium", "Holdings", "Syndicate", "Alliance", "Collective",
      "Federation", "Empire", "Conglomerate", "Group", "Labs", "Works"
    ];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix} ${suffix}`;
  }

  // Crawler operations
  private generateRandomStats() {
    // Base stats for Level 0 crawlers with some randomization
    const baseHealth = 80 + Math.floor(Math.random() * 40); // 80-120
    const baseAttack = 8 + Math.floor(Math.random() * 7); // 8-15
    const baseDefense = 5 + Math.floor(Math.random() * 5); // 5-10
    const baseSpeed = 6 + Math.floor(Math.random() * 8); // 6-14
    const baseTech = 4 + Math.floor(Math.random() * 12); // 4-16
    
    return {
      health: baseHealth,
      maxHealth: baseHealth,
      attack: baseAttack,
      defense: baseDefense,
      speed: baseSpeed,
      tech: baseTech,
    };
  }

  private generateRandomCompetencies(): string[] {
    const allCompetencies = [
      "Scavenging", "Lock Picking", "Electronics", "First Aid", "Stealth",
      "Combat Reflexes", "Jury Rigging", "Negotiation", "Intimidation", "Hacking",
      "Demolitions", "Survival", "Leadership", "Marksmanship", "Athletics",
      "Engineering", "Chemistry", "Psychology", "Linguistics", "Navigation"
    ];
    
    // Give each crawler 2-4 random competencies
    const numCompetencies = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...allCompetencies].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numCompetencies);
  }

  private generateCrawlerBackground(): string {
    const backgrounds = [
      "Former corporate security guard who volunteered after losing their job to automation",
      "Ex-military engineer discharged after questioning orders during a colony uprising",
      "Underground hacker who got caught and chose the dungeon over prison",
      "Academic researcher studying xenoarchaeology who needed funding for their studies",
      "Street medic from the outer colonies seeking to escape mounting debt",
      "Washed-up pilot whose reflexes aren't what they used to be but still has pride",
      "Corporate whistleblower hiding from assassination attempts",
      "Former gang member trying to go legitimate and support their family",
      "Displaced miner after their asteroid was depleted, looking for a new start",
      "Lab technician who accidentally caused an incident and needs to disappear",
      "Failed entrepreneur who lost everything and sees this as their last chance",
      "Religious zealot convinced the dungeon holds divine secrets"
    ];
    
    return backgrounds[Math.floor(Math.random() * backgrounds.length)];
  }

  async createCrawler(crawlerData: InsertCrawler): Promise<Crawler> {
    const stats = this.generateRandomStats();
    const competencies = this.generateRandomCompetencies();
    const background = this.generateCrawlerBackground();
    
    const [crawler] = await db
      .insert(crawlers)
      .values({
        ...crawlerData,
        ...stats,
        background,
        competencies,
        level: 0, // All crawlers start at Level 0
      })
      .returning();

    // Give them some random starting equipment
    await this.assignRandomStartingEquipment(crawler.id);

    return crawler;
  }

  private async assignRandomStartingEquipment(crawlerId: number): Promise<void> {
    const availableEquipment = await db.select().from(equipment);
    
    // Give 1-3 random pieces of basic equipment
    const numItems = 1 + Math.floor(Math.random() * 3);
    const basicEquipment = availableEquipment.filter(eq => eq.rarity === 'common');
    
    for (let i = 0; i < numItems; i++) {
      const randomEquipment = basicEquipment[Math.floor(Math.random() * basicEquipment.length)];
      if (randomEquipment) {
        await db.insert(crawlerEquipment).values({
          crawlerId: crawlerId,
          equipmentId: randomEquipment.id,
          equipped: i === 0, // Equip the first item
        });
      }
    }
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

    return result.map(row => ({
      ...row.crawler,
      class: row.class!,
      equipment: [], // Will be populated separately if needed
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

    return {
      ...result.crawler,
      class: result.class!,
      equipment: [], // Will be populated separately if needed
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

  // Crawler classes
  async getCrawlerClasses(): Promise<CrawlerClass[]> {
    return await db.select().from(crawlerClasses).orderBy(asc(crawlerClasses.name));
  }

  // Equipment operations
  async getEquipment(): Promise<Equipment[]> {
    return await db.select().from(equipment).orderBy(asc(equipment.name));
  }

  async getEquipmentById(id: number): Promise<Equipment | undefined> {
    const [item] = await db.select().from(equipment).where(eq(equipment.id, id));
    return item;
  }

  async getCrawlerEquipment(crawlerId: number): Promise<Equipment[]> {
    const result = await db
      .select({ equipment })
      .from(crawlerEquipment)
      .leftJoin(equipment, eq(crawlerEquipment.equipmentId, equipment.id))
      .where(eq(crawlerEquipment.crawlerId, crawlerId));

    return result.map(row => row.equipment!);
  }

  // Combat and encounters
  async createEncounter(crawlerId: number, floorId: number, enemyId?: number): Promise<Encounter> {
    const [encounter] = await db
      .insert(encounters)
      .values({
        crawlerId,
        floorId,
        enemyId,
        encounterType: enemyId ? 'combat' : 'exploration',
        status: 'active',
      })
      .returning();
    return encounter;
  }

  async getActiveEncounter(crawlerId: number): Promise<Encounter | undefined> {
    const [encounter] = await db
      .select()
      .from(encounters)
      .where(and(
        eq(encounters.crawlerId, crawlerId),
        eq(encounters.status, 'active')
      ))
      .orderBy(desc(encounters.createdAt));
    return encounter;
  }

  async updateEncounter(id: number, updates: Partial<Encounter>): Promise<Encounter> {
    const [encounter] = await db
      .update(encounters)
      .set(updates)
      .where(eq(encounters.id, id))
      .returning();
    return encounter;
  }

  // Floors and enemies
  async getFloor(floorNumber: number): Promise<Floor | undefined> {
    const [floor] = await db
      .select()
      .from(floors)
      .where(eq(floors.floorNumber, floorNumber));
    return floor;
  }

  async getEnemiesForFloor(floorNumber: number): Promise<Enemy[]> {
    return await db
      .select()
      .from(enemies)
      .where(and(
        sql`${enemies.minFloor} <= ${floorNumber}`,
        sql`${enemies.maxFloor} >= ${floorNumber}`
      ));
  }

  // Activities and notifications
  async createActivity(activityData: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(activityData)
      .returning();
    return activity;
  }

  async getRecentActivities(userId: string, limit = 10): Promise<ActivityWithDetails[]> {
    const result = await db
      .select({
        activity: activities,
        crawler: crawlers,
      })
      .from(activities)
      .leftJoin(crawlers, eq(activities.crawlerId, crawlers.id))
      .where(eq(activities.userId, userId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    return result.map(row => ({
      ...row.activity,
      crawler: row.crawler || undefined,
    }));
  }

  // Chat
  async createChatMessage(userId: string, message: string): Promise<ChatMessage> {
    const [chatMessage] = await db
      .insert(chatMessages)
      .values({ userId, message })
      .returning();
    return chatMessage;
  }

  async getRecentChatMessages(limit = 50): Promise<ChatMessageWithUser[]> {
    const result = await db
      .select({
        message: chatMessages,
        user: users,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    return result.map(row => ({
      ...row.message,
      user: row.user!,
    })).reverse(); // Return in chronological order
  }

  // Leaderboards
  async getTopCrawlers(limit = 10): Promise<CrawlerWithDetails[]> {
    const result = await db
      .select({
        crawler: crawlers,
        class: crawlerClasses,
      })
      .from(crawlers)
      .leftJoin(crawlerClasses, eq(crawlers.classId, crawlerClasses.id))
      .where(eq(crawlers.isAlive, true))
      .orderBy(desc(crawlers.currentFloor), desc(crawlers.credits))
      .limit(limit);

    return result.map(row => ({
      ...row.crawler,
      class: row.class!,
      equipment: [],
    }));
  }

  // Marketplace
  async getMarketplaceListings(limit = 20): Promise<MarketplaceListingWithDetails[]> {
    const result = await db
      .select({
        listing: marketplaceListings,
        equipment,
        equipmentType: equipmentTypes,
        seller: users,
      })
      .from(marketplaceListings)
      .leftJoin(equipment, eq(marketplaceListings.equipmentId, equipment.id))
      .leftJoin(equipmentTypes, eq(equipment.typeId, equipmentTypes.id))
      .leftJoin(users, eq(marketplaceListings.sellerId, users.id))
      .where(eq(marketplaceListings.active, true))
      .orderBy(desc(marketplaceListings.createdAt))
      .limit(limit);

    return result.map(row => ({
      ...row.listing,
      equipment: {
        ...row.equipment!,
        type: row.equipmentType!,
      },
      seller: row.seller!,
    }));
  }

  // Credits and transactions
  async updateUserCredits(userId: string, amount: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        credits: sql`${users.credits} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserActiveCrawler(userId: string, crawlerId: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        activeCrawlerId: crawlerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Season operations
  async getCurrentSeason(): Promise<Season | undefined> {
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.isActive, true))
      .limit(1);
    return season;
  }

  async canCreatePrimaryCrawler(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    const currentSeason = await this.getCurrentSeason();
    if (!currentSeason) return false;

    // Check if user has already used their primary sponsorship this season
    if (user.primarySponsorshipUsed && user.lastPrimarySponsorshipSeason === currentSeason.seasonNumber) {
      return false;
    }

    // Check if user has an active crawler
    const activeCrawlers = await db
      .select()
      .from(crawlers)
      .where(and(
        eq(crawlers.sponsorId, userId),
        eq(crawlers.isAlive, true),
        eq(crawlers.sponsorshipType, "primary")
      ));

    return activeCrawlers.length === 0;
  }

  async getAvailableSecondarySponsorships(): Promise<CrawlerWithDetails[]> {
    // Return crawlers looking for secondary sponsors (e.g., those whose primary sponsors have died)
    const availableCrawlers = await db
      .select({
        crawler: crawlers,
        class: crawlerClasses,
      })
      .from(crawlers)
      .leftJoin(crawlerClasses, eq(crawlers.classId, crawlerClasses.id))
      .where(and(
        eq(crawlers.isAlive, true),
        eq(crawlers.status, "seeking_sponsor")
      ));

    return availableCrawlers.map(row => ({
      ...row.crawler,
      class: row.class!,
      equipment: [] // Secondary sponsors can't modify equipment initially
    }));
  }

  async resetUserPrimarySponsorshipForNewSeason(userId: string, seasonNumber: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        primarySponsorshipUsed: false,
        lastPrimarySponsorshipSeason: seasonNumber
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Generate crawler candidates for selection
  async generateCrawlerCandidates(count = 3): Promise<any[]> {
    const candidates = [];
    const availableEquipment = await db.select().from(equipment);
    const basicEquipment = availableEquipment.filter(eq => eq.rarity === 'common');

    for (let i = 0; i < count; i++) {
      const stats = this.generateRandomStats();
      const competencies = this.generateRandomCompetencies();
      const background = this.generateCrawlerBackground();
      
      // Generate some starting equipment for preview
      const numItems = 1 + Math.floor(Math.random() * 3);
      const startingEquipment = [];
      for (let j = 0; j < numItems; j++) {
        const randomEquipment = basicEquipment[Math.floor(Math.random() * basicEquipment.length)];
        if (randomEquipment && !startingEquipment.find(e => e.id === randomEquipment.id)) {
          startingEquipment.push(randomEquipment);
        }
      }

      // Determine top ability based on highest stat
      const statValues = [
        { name: 'Combat', value: stats.attack, description: 'Excels in direct confrontation' },
        { name: 'Defense', value: stats.defense, description: 'Survives through resilience' },
        { name: 'Speed', value: stats.speed, description: 'Fast and agile movement' },
        { name: 'Tech', value: stats.tech, description: 'Masters technology and hacking' }
      ];
      const topAbility = statValues.reduce((max, stat) => stat.value > max.value ? stat : max);

      candidates.push({
        id: `candidate_${i}`,
        stats,
        competencies,
        background,
        startingEquipment,
        topAbility,
        level: 0
      });
    }

    return candidates;
  }
}

export const storage = new DatabaseStorage();
