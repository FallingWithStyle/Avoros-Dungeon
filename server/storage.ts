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
  
  // Exploration
  exploreFloor(crawlerId: number): Promise<any>;
  regenerateEnergy(crawlerId: number): Promise<Crawler>;
  applyCompetencyBonus(crawler: any, encounterType: string): number;
  
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
    // Most stats 0-5, with one potentially higher (max 8)
    const stats = [
      Math.floor(Math.random() * 6), // 0-5
      Math.floor(Math.random() * 6), // 0-5
      Math.floor(Math.random() * 6), // 0-5
      Math.floor(Math.random() * 6), // 0-5
    ];
    
    // Give one stat a chance to be higher
    const highlightStat = Math.floor(Math.random() * 4);
    if (Math.random() < 0.3) { // 30% chance for a higher stat
      stats[highlightStat] = 6 + Math.floor(Math.random() * 3); // 6-8
    }
    
    const health = 60 + Math.floor(Math.random() * 20); // 60-80
    
    return {
      health,
      maxHealth: health,
      attack: stats[0],
      defense: stats[1], 
      speed: stats[2],
      tech: stats[3],
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
      "Hiding from ex-partner's criminal associates who want them dead",
      "Fled into the dungeon after witnessing a corporate assassination", 
      "Chasing their missing sibling who entered the dungeon weeks ago",
      "Escaping massive gambling debts to dangerous loan sharks",
      "On the run after accidentally uncovering illegal genetic experiments",
      "Homeless and desperate after being evicted from the colony slums",
      "Seeking their missing child who was kidnapped by dungeon cultists",
      "Fleeing after their underground clinic was raided by corporate security",
      "Running from a bounty hunter hired by their former employer",
      "Lost everything in a rigged business deal and has nowhere else to go",
      "Trying to disappear after their research caused a containment breach",
      "Following their mentor who vanished into the dungeon with vital information"
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

  // Exploration mechanics
  async exploreFloor(crawlerId: number): Promise<any> {
    const crawler = await this.getCrawler(crawlerId);
    if (!crawler || crawler.energy < 10 || !crawler.isAlive) {
      throw new Error("Cannot explore - insufficient energy or crawler is dead");
    }

    // Deduct energy
    await this.updateCrawler(crawlerId, { 
      energy: crawler.energy - 10,
      status: "exploring"
    });

    // Generate encounter based on floor and crawler capabilities
    const encounter = await this.generateEncounter(crawler);
    
    // Process encounter based on type
    const result = await this.processEncounter(crawler, encounter);
    
    // Update crawler status back to active
    await this.updateCrawler(crawlerId, { status: "active" });
    
    return result;
  }

  private async generateEncounter(crawler: any): Promise<any> {
    const encounterTypes = ['combat', 'treasure', 'npc', 'trap', 'event'];
    const weights = this.getEncounterWeights(crawler);
    
    const encounterType = this.weightedRandom(encounterTypes, weights);
    const floor = await this.getFloor(crawler.currentFloor);
    
    return {
      type: encounterType,
      crawlerId: crawler.id,
      floorId: floor?.id || 1,
      energyCost: 10,
      storyText: this.generateEncounterStory(encounterType, crawler)
    };
  }

  private getEncounterWeights(crawler: any): number[] {
    // Base weights [combat, treasure, npc, trap, event]
    let weights = [40, 20, 15, 15, 10];
    
    // Modify based on competencies
    if (crawler.competencies?.includes('Scavenging')) weights[1] += 10; // More treasure
    if (crawler.competencies?.includes('Stealth')) weights[3] -= 5; // Fewer traps
    if (crawler.competencies?.includes('Negotiation')) weights[2] += 10; // More NPCs
    if (crawler.competencies?.includes('Combat Reflexes')) weights[0] += 5; // More combat
    
    // Modify based on stats
    if (crawler.tech > 12) weights[4] += 5; // More events for high-tech crawlers
    if (crawler.speed > 12) weights[3] -= 3; // Avoid traps with high speed
    
    return weights;
  }

  private weightedRandom(items: string[], weights: number[]): string {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (let i = 0; i < items.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        return items[i];
      }
    }
    return items[0];
  }

  private generateEncounterStory(type: string, crawler: any): string {
    const stories = {
      combat: [
        `${crawler.name} encounters a hostile creature in the dimly lit corridor!`,
        `A mechanical guardian emerges from the shadows, weapons charging!`,
        `${crawler.name} stumbles into a territorial beast's den!`,
        `Warning alarms blare as security drones detect an intruder!`
      ],
      treasure: [
        `${crawler.name} discovers a hidden cache of valuable equipment!`,
        `Ancient technology gleams from within a forgotten storage unit!`,
        `A previous crawler's abandoned gear lies scattered nearby!`,
        `${crawler.name} finds a corporate supply drop that went off-course!`
      ],
      npc: [
        `A mysterious figure approaches ${crawler.name} in the darkness...`,
        `${crawler.name} encounters another crawler who seems friendly!`,
        `An eccentric merchant has set up shop in this unlikely location!`,
        `A strange being offers ${crawler.name} information about the depths below!`
      ],
      trap: [
        `${crawler.name} narrowly avoids a pressure plate trap!`,
        `Ancient security systems activate around ${crawler.name}!`,
        `The floor gives way beneath ${crawler.name}'s feet!`,
        `Poison gas begins to fill the chamber!`
      ],
      event: [
        `${crawler.name} discovers a fascinating piece of dungeon lore!`,
        `Strange energies in this area seem to affect ${crawler.name}!`,
        `A holographic message from a previous expedition plays nearby!`,
        `${crawler.name} finds evidence of the dungeon's mysterious past!`
      ]
    };
    
    const typeStories = stories[type] || stories.event;
    return typeStories[Math.floor(Math.random() * typeStories.length)];
  }

  private async processEncounter(crawler: any, encounter: any): Promise<any> {
    let rewards = { credits: 0, experience: 0, equipment: [], damage: 0 };
    
    switch (encounter.type) {
      case 'combat':
        rewards = await this.processCombatEncounter(crawler);
        break;
      case 'treasure':
        rewards = await this.processTreasureEncounter(crawler);
        break;
      case 'npc':
        rewards = await this.processNpcEncounter(crawler);
        break;
      case 'trap':
        rewards = await this.processTrapEncounter(crawler);
        break;
      case 'event':
        rewards = await this.processEventEncounter(crawler);
        break;
    }
    
    // Apply rewards and damage
    await this.applyCrawlerUpdates(crawler.id, rewards);
    
    return {
      ...encounter,
      result: rewards,
      storyText: encounter.storyText
    };
  }

  private async processCombatEncounter(crawler: any): Promise<any> {
    const baseReward = Math.floor(crawler.currentFloor * 10);
    const attackBonus = this.applyCompetencyBonus(crawler, 'combat');
    
    // Simple combat resolution
    const combatPower = crawler.attack + attackBonus;
    const enemyPower = 15 + (crawler.currentFloor * 2);
    
    if (combatPower >= enemyPower) {
      return {
        credits: baseReward + Math.floor(Math.random() * 50),
        experience: 25 + Math.floor(Math.random() * 25),
        equipment: [],
        damage: Math.max(0, enemyPower - crawler.defense)
      };
    } else {
      return {
        credits: Math.floor(baseReward * 0.3),
        experience: 10,
        equipment: [],
        damage: Math.max(5, enemyPower - crawler.defense + 10)
      };
    }
  }

  private async processTreasureEncounter(crawler: any): Promise<any> {
    const scavengingBonus = this.applyCompetencyBonus(crawler, 'treasure');
    const baseCredits = Math.floor(crawler.currentFloor * 15);
    
    return {
      credits: baseCredits + scavengingBonus + Math.floor(Math.random() * 100),
      experience: 15 + Math.floor(Math.random() * 15),
      equipment: [], // Could add equipment finding logic here
      damage: 0
    };
  }

  private async processNpcEncounter(crawler: any): Promise<any> {
    const negotiationBonus = this.applyCompetencyBonus(crawler, 'npc');
    
    return {
      credits: Math.floor(Math.random() * 50) + negotiationBonus,
      experience: 20 + Math.floor(Math.random() * 20),
      equipment: [],
      damage: 0
    };
  }

  private async processTrapEncounter(crawler: any): Promise<any> {
    const avoidanceBonus = this.applyCompetencyBonus(crawler, 'trap');
    const techBonus = Math.floor(crawler.tech / 2);
    
    const avoidChance = (crawler.speed + avoidanceBonus + techBonus) / 100;
    
    if (Math.random() < avoidChance) {
      return {
        credits: 0,
        experience: 10, // Experience for avoiding trap
        equipment: [],
        damage: 0
      };
    } else {
      return {
        credits: 0,
        experience: 5,
        equipment: [],
        damage: 15 + Math.floor(crawler.currentFloor * 2)
      };
    }
  }

  private async processEventEncounter(crawler: any): Promise<any> {
    const techBonus = this.applyCompetencyBonus(crawler, 'event');
    
    return {
      credits: Math.floor(Math.random() * 30),
      experience: 30 + techBonus,
      equipment: [],
      damage: 0
    };
  }

  applyCompetencyBonus(crawler: any, encounterType: string): number {
    if (!crawler.competencies) return 0;
    
    const competencyBonuses = {
      combat: ['Combat Reflexes', 'Marksmanship', 'Athletics'],
      treasure: ['Scavenging', 'Lock Picking', 'Electronics'],
      npc: ['Negotiation', 'Psychology', 'Linguistics'],
      trap: ['Stealth', 'Electronics', 'Engineering'],
      event: ['Engineering', 'Chemistry', 'Hacking']
    };
    
    const relevantCompetencies = competencyBonuses[encounterType] || [];
    const bonusCount = crawler.competencies.filter(comp => 
      relevantCompetencies.includes(comp)
    ).length;
    
    return bonusCount * 5; // 5 point bonus per relevant competency
  }

  private async applyCrawlerUpdates(crawlerId: number, rewards: any): Promise<void> {
    const crawler = await this.getCrawler(crawlerId);
    if (!crawler) return;
    
    const newHealth = Math.max(0, crawler.health - rewards.damage);
    const newCredits = crawler.credits + rewards.credits;
    const newExperience = crawler.experience + rewards.experience;
    const isAlive = newHealth > 0;
    
    await this.updateCrawler(crawlerId, {
      health: newHealth,
      credits: newCredits,
      experience: newExperience,
      isAlive: isAlive
    });
    
    // Create activity log
    await this.createActivity({
      userId: crawler.sponsorId,
      crawlerId: crawler.id,
      type: 'exploration',
      message: `${crawler.name} gained ${rewards.experience} XP and ${rewards.credits} credits`,
      details: rewards
    });
  }

  async regenerateEnergy(crawlerId: number): Promise<Crawler> {
    const crawler = await this.getCrawler(crawlerId);
    if (!crawler) throw new Error("Crawler not found");
    
    const now = new Date();
    const lastRegen = new Date(crawler.lastEnergyRegen || crawler.createdAt);
    const timeDiff = now.getTime() - lastRegen.getTime();
    const minutesPassed = Math.floor(timeDiff / 60000);
    
    // Regenerate 1 energy per minute, max energy cap
    const energyToRestore = Math.min(minutesPassed, crawler.maxEnergy - crawler.energy);
    
    if (energyToRestore > 0) {
      const [updatedCrawler] = await db
        .update(crawlers)
        .set({
          energy: crawler.energy + energyToRestore,
          lastEnergyRegen: now
        })
        .where(eq(crawlers.id, crawlerId))
        .returning();
      return updatedCrawler;
    }
    
    return crawler;
  }

  private generateCrawlerName(): string {
    const firstNames = [
      "Alex", "Jordan", "Casey", "Riley", "Morgan", "Avery", "Quinn", "Sage", "River", "Phoenix",
      "Kai", "Rowan", "Ellis", "Drew", "Blake", "Cameron", "Finley", "Reese", "Emery", "Hayden",
      "Nova", "Zara", "Juno", "Raven", "Echo", "Sage", "Wren", "Onyx", "Vale", "Storm"
    ];
    
    const lastNames = [
      "Chen", "Martinez", "O'Brien", "Singh", "Volkov", "Nakamura", "Hassan", "Kowalski", "Santos", "Kim",
      "Petrov", "Garcia", "Thompson", "Andersson", "Liu", "Okafor", "Reyes", "Johansson", "Patel", "Cruz",
      "Blackwood", "Sterling", "Cross", "Stone", "Rivers", "Vale", "Frost", "Grey", "Wolf", "Sharp"
    ];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
  }

  private generateStartingEquipment(background: string): any[] {
    // Basic survival gear that anyone might have
    const basicGear = [
      { name: "Emergency Rations", description: "Compressed nutrition bars" },
      { name: "Flashlight", description: "Battery-powered light source" },
      { name: "First Aid Kit", description: "Basic medical supplies" },
      { name: "Multi-tool", description: "Swiss army knife equivalent" },
      { name: "Water Purification Tablets", description: "Makes questionable water safer" }
    ];
    
    // Maybe one additional item based on background
    const contextualGear = [];
    if (background.includes("clinic") || background.includes("medical")) {
      contextualGear.push({ name: "Medical Scanner", description: "Handheld diagnostic device" });
    } else if (background.includes("research") || background.includes("experiments")) {
      contextualGear.push({ name: "Data Pad", description: "Encrypted research notes" });
    } else if (background.includes("security") || background.includes("criminal")) {
      // Very rarely, someone might have a basic weapon
      if (Math.random() < 0.15) { // 15% chance
        contextualGear.push({ name: "Ceramic Knife", description: "Small, undetectable blade" });
      }
    }
    
    // Return 2-3 basic items plus maybe one contextual item
    const equipment = [...basicGear.slice(0, 2 + Math.floor(Math.random() * 2))];
    if (contextualGear.length > 0 && Math.random() < 0.4) {
      equipment.push(contextualGear[0]);
    }
    
    return equipment;
  }

  // Generate crawler candidates for selection
  async generateCrawlerCandidates(count = 3): Promise<any[]> {
    const candidates = [];

    for (let i = 0; i < count; i++) {
      const stats = this.generateRandomStats();
      const competencies = this.generateRandomCompetencies();
      const background = this.generateCrawlerBackground();
      const name = this.generateCrawlerName();
      const startingEquipment = this.generateStartingEquipment(background);

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
        name,
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
