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
  
  // Encounter choice processing
  processEncounterChoice(crawlerId: number, choiceId: string, encounterData: any): Promise<any>;
  
  // Debug functions
  resetUserCrawlers(userId: string): Promise<void>;
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
      Math.floor(Math.random() * 6), // 0-5
      Math.floor(Math.random() * 6), // 0-5
    ];
    
    // Give one stat a chance to be higher
    const highlightStat = Math.floor(Math.random() * 6);
    if (Math.random() < 0.3) { // 30% chance for a higher stat
      stats[highlightStat] = 6 + Math.floor(Math.random() * 3); // 6-8
    }
    
    const health = 60 + Math.floor(Math.random() * 20); // 60-80
    const luck = Math.floor(Math.random() * 6); // 0-5 luck (hidden from players)
    
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
      "Engineering", "Chemistry", "Psychology", "Linguistics", "Navigation"
    ];
    
    // Give each crawler 2-4 random competencies
    const numCompetencies = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...allCompetencies].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, numCompetencies);
  }

  private generateCrawlerBackground(): string {
    const desperateBackgrounds = [
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

    const wackyBackgrounds = [
      "Professional food critic whose scathing review of a corporate cafeteria somehow led to a galaxy-wide manhunt",
      "Used to run an underground origami club that accidentally became a resistance movement",
      "Former birthday party clown who witnessed something they shouldn't have at a corporate executive's kid's party",
      "Librarian who discovered that late fees were being used to fund illegal weapons research",
      "Freelance mime who broke character at the wrong moment and saw too much",
      "Pet groomer whose client's 'dog' turned out to be an escaped genetic experiment",
      "Wedding photographer who captured evidence of corporate conspiracy in the background of a family photo",
      "Substitute teacher who found their lesson plans were actually coded instructions for industrial sabotage",
      "Street magician whose 'magic' trick accidentally hacked into corporate mainframes",
      "Yoga instructor whose meditation sessions were unknowingly being used as cover for money laundering meetings",
      "Ice cream truck driver who discovered their route was being used to smuggle contraband",
      "Professional stand-up comedian whose jokes about corporate life were too accurate for comfort",
      "Crossword puzzle creator who embedded secret messages and didn't realize until corporate goons showed up",
      "Dog walker who overheard the wrong conversation in the wrong corporate park",
      "Amateur beekeeper whose honey business was a front for something much bigger (they had no idea)",
      "Former mall Santa who saw executives discussing 'naughty list eliminations' and thought they meant something else",
      "Freelance translator who accidentally translated a corporate love letter that was actually assassination orders",
      "Part-time tour guide whose historical facts about corporate buildings were apparently classified information",
      "Uber driver who picked up the wrong passenger at the wrong time and heard the wrong phone call",
      "Karaoke host whose song requests app was secretly monitoring corporate communications",
      "Personal trainer whose client confessed to war crimes during a particularly intense workout",
      "Flower delivery person who delivered the wrong bouquet to the wrong office and saw too much",
      "Professional cosplayer whose costume was too realistic and got them mistaken for an actual corporate spy",
      "Food truck owner whose lunch rush happened to coincide with an illegal corporate meeting in the park",
      "Freelance furniture assembler who found corporate secrets hidden inside IKEA boxes",
      "Amateur archaeologist who dug up corporate waste in their backyard and connected the wrong dots",
      "Part-time janitor who cleaned the wrong office on the wrong night and emptied the wrong trash",
      "Etsy seller whose handmade crafts accidentally incorporated corporate microchips they found on the street",
      "Professional cat sitter whose feline client belonged to a corporate whistleblower",
      "Escape room designer whose puzzles were based on real corporate security flaws (oops)",
      "Food blogger whose restaurant review accidentally described a corporate money laundering operation",
      "Freelance cartographer whose maps revealed corporate illegal dumping sites by pure coincidence",
      "Amateur radio operator who intercepted the wrong frequency at the wrong time",
      "Professional gift wrapper whose artistic paper folding skills revealed hidden corporate documents",
      "Part-time children's birthday entertainer who performed at a corporate executive's house during a business meeting"
    ];

    const tragicBackgrounds = [
      "Their entire extended family was killed in a 'gas leak' explosion after their uncle asked too many questions at work",
      "Woke up to find their memory of the last three years had been surgically removed, and this seemed safer than staying",
      "Their hometown was evacuated for 'routine maintenance' and never reopened - they're the only one who made it out",
      "Former corporate executive who grew a conscience too late and is now running from their former colleagues",
      "Their identical twin was murdered and replaced by a corporate doppelganger - they're next",
      "Discovered their late parents' charity was actually a human trafficking front and corporate assassins came calling",
      "Their genetic code was patented by a corporation and they're technically corporate property now",
      "Former corporate lawyer who found out their adoption agency was actually a corporate breeding program",
      "Their art therapy sessions were being used to identify and eliminate potential dissidents",
      "Learned their life insurance policy had a 'corporate termination clause' that kicked in last Tuesday"
    ];

    // Mix of desperation levels for variety - 40% desperate, 50% wacky, 10% tragic
    const roll = Math.random();
    if (roll < 0.4) {
      return desperateBackgrounds[Math.floor(Math.random() * desperateBackgrounds.length)];
    } else if (roll < 0.9) {
      return wackyBackgrounds[Math.floor(Math.random() * wackyBackgrounds.length)];
    } else {
      return tragicBackgrounds[Math.floor(Math.random() * tragicBackgrounds.length)];
    }
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

    // Generate encounter based on floor and crawler capabilities
    const encounter = await this.generateEncounter(crawler);
    
    // Return the encounter for the frontend to display choices
    // Don't process it automatically anymore
    return encounter;
  }

  private async generateEncounter(crawler: any): Promise<any> {
    const encounterTypes = ['combat', 'treasure', 'npc', 'trap', 'event'];
    const weights = this.getEncounterWeights(crawler);
    
    const encounterType = this.weightedRandom(encounterTypes, weights);
    const floor = await this.getFloor(crawler.currentFloor);
    
    // Generate choice-based encounter with multiple options
    const encounterData = this.generateChoiceEncounter(encounterType, crawler);
    
    return {
      type: encounterType,
      crawlerId: crawler.id,
      floorId: floor?.id || 1,
      energyCost: 10,
      ...encounterData
    };
  }

  private generateChoiceEncounter(type: string, crawler: any): any {
    const encounters = {
      combat: [
        {
          title: "Hostile Creature",
          description: `A snarling beast blocks ${crawler.name}'s path through the narrow corridor. Its eyes gleam with predatory hunger, and escape routes are limited.`,
          choices: [
            {
              id: "attack",
              text: "Attack directly with weapons",
              requirements: { attack: 8 },
              riskLevel: "high",
              primaryStat: "attack"
            },
            {
              id: "defensive",
              text: "Take a defensive stance and wait for an opening",
              requirements: { defense: 6 },
              riskLevel: "medium",
              primaryStat: "defense"
            },
            {
              id: "stealth",
              text: "Attempt to sneak past quietly",
              requirements: { speed: 10 },
              riskLevel: "low",
              primaryStat: "speed"
            },
            {
              id: "tech",
              text: "Use technological gadgets to distract it",
              requirements: { tech: 8 },
              riskLevel: "medium",
              primaryStat: "tech"
            }
          ]
        },
        {
          title: "Armed Scavenger",
          description: `Another crawler emerges from the shadows, weapon drawn. They look desperate and hostile, eyeing ${crawler.name}'s equipment hungrily.`,
          choices: [
            {
              id: "intimidate",
              text: "Try to intimidate them into backing down",
              requirements: { attack: 12 },
              riskLevel: "medium",
              primaryStat: "attack"
            },
            {
              id: "negotiate",
              text: "Offer to trade something valuable",
              requirements: {},
              riskLevel: "low",
              primaryStat: "none"
            },
            {
              id: "flee",
              text: "Run before they can react",
              requirements: { speed: 8 },
              riskLevel: "medium",
              primaryStat: "speed"
            },
            {
              id: "ambush",
              text: "Use the environment to set up an ambush",
              requirements: { tech: 6, speed: 6 },
              riskLevel: "high",
              primaryStat: "tech"
            }
          ]
        }
      ],
      treasure: [
        {
          title: "Secured Cache",
          description: `${crawler.name} discovers a locked corporate supply cache. Advanced security systems protect valuable contents within.`,
          choices: [
            {
              id: "hack",
              text: "Attempt to hack the security system",
              requirements: { tech: 10 },
              riskLevel: "medium",
              primaryStat: "tech"
            },
            {
              id: "force",
              text: "Break it open with brute force",
              requirements: { attack: 8 },
              riskLevel: "high",
              primaryStat: "attack"
            },
            {
              id: "bypass",
              text: "Look for hidden maintenance access",
              requirements: { speed: 6 },
              riskLevel: "low",
              primaryStat: "speed"
            },
            {
              id: "leave",
              text: "Leave it alone - too risky",
              requirements: {},
              riskLevel: "none",
              primaryStat: "none"
            }
          ]
        }
      ],
      trap: [
        {
          title: "Pressure Plate Corridor",
          description: `The floor ahead is littered with suspicious tiles. Some look recently disturbed, and ${crawler.name} can see scorch marks on the walls.`,
          choices: [
            {
              id: "careful",
              text: "Move very slowly and test each step",
              requirements: { speed: 4 },
              riskLevel: "low",
              primaryStat: "speed"
            },
            {
              id: "tech_scan",
              text: "Use sensors to map the safe path",
              requirements: { tech: 8 },
              riskLevel: "none",
              primaryStat: "tech"
            },
            {
              id: "sprint",
              text: "Sprint across as fast as possible",
              requirements: { speed: 12 },
              riskLevel: "high",
              primaryStat: "speed"
            },
            {
              id: "tank",
              text: "Walk through and absorb any damage",
              requirements: { defense: 10 },
              riskLevel: "medium",
              primaryStat: "defense"
            }
          ]
        }
      ],
      npc: [
        {
          title: "Mysterious Trader",
          description: `A hooded figure sits beside valuable-looking equipment. They gesture ${crawler.name} over with promises of rare technology and useful information.`,
          choices: [
            {
              id: "trade_credits",
              text: "Offer credits for their best item",
              requirements: {},
              riskLevel: "low",
              primaryStat: "none"
            },
            {
              id: "negotiate",
              text: "Try to get a better deal through charm",
              requirements: {},
              riskLevel: "medium",
              primaryStat: "none"
            },
            {
              id: "rob",
              text: "Attempt to take what you want by force",
              requirements: { attack: 10 },
              riskLevel: "high",
              primaryStat: "attack"
            },
            {
              id: "info",
              text: "Ask for information about deeper floors",
              requirements: {},
              riskLevel: "none",
              primaryStat: "none"
            }
          ]
        }
      ],
      event: [
        {
          title: "Ancient Terminal",
          description: `${crawler.name} finds a still-functioning terminal displaying cryptic data about the dungeon's deeper levels. The information could be valuable, but accessing it might trigger security protocols.`,
          choices: [
            {
              id: "download",
              text: "Download all available data",
              requirements: { tech: 8 },
              riskLevel: "medium",
              primaryStat: "tech"
            },
            {
              id: "selective",
              text: "Carefully extract only specific files",
              requirements: { tech: 12 },
              riskLevel: "low",
              primaryStat: "tech"
            },
            {
              id: "observe",
              text: "Simply read what's on screen without touching",
              requirements: {},
              riskLevel: "none",
              primaryStat: "none"
            },
            {
              id: "destroy",
              text: "Destroy the terminal to prevent others from using it",
              requirements: { attack: 6 },
              riskLevel: "none",
              primaryStat: "attack"
            }
          ]
        }
      ]
    };

    const typeEncounters = encounters[type] || encounters.event;
    const selectedEncounter = typeEncounters[Math.floor(Math.random() * typeEncounters.length)];
    
    return {
      title: selectedEncounter.title,
      description: selectedEncounter.description,
      choices: selectedEncounter.choices,
      storyText: selectedEncounter.description
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
    
    // Apply energy cost for exploration (always costs 10 energy)
    const newEnergy = Math.max(0, crawler.energy - 10);
    
    // Apply damage from encounters
    const newHealth = Math.max(0, crawler.health - rewards.damage);
    
    // Apply rewards
    const newCredits = crawler.credits + rewards.credits;
    const newExperience = crawler.experience + rewards.experience;
    const isAlive = newHealth > 0;
    
    // Update crawler with all changes
    await this.updateCrawler(crawlerId, {
      energy: newEnergy,
      health: newHealth,
      credits: newCredits,
      experience: newExperience,
      isAlive: isAlive,
      status: "active"
    });
    
    // Create detailed activity log
    let logMessage = `${crawler.name} explored and`;
    if (rewards.damage > 0) {
      logMessage += ` took ${rewards.damage} damage,`;
    }
    logMessage += ` gained ${rewards.experience} XP and ${rewards.credits} credits`;
    
    await this.createActivity({
      userId: crawler.sponsorId,
      crawlerId: crawler.id,
      type: 'exploration',
      message: logMessage,
      details: { ...rewards, energyUsed: 10 }
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
      // Classic sci-fi inspired
      "Zara", "Kai", "Nova", "Orion", "Luna", "Vega", "Atlas", "Iris", "Juno", "Neo",
      "Zoe", "Rex", "Ivy", "Axel", "Echo", "Nyx", "Vale", "Sage", "Remy", "Wren",
      
      // Tech-themed
      "Cipher", "Binary", "Pixel", "Vector", "Matrix", "Logic", "Cache", "Query", "Debug", "Syntax",
      "Pascal", "Java", "Ruby", "Swift", "Ada", "Grace", "Tesla", "Edison", "Turing", "Lovelace",
      
      // Edgy/dystopian
      "Raven", "Shadow", "Blade", "Frost", "Storm", "Void", "Ash", "Steel", "Flint", "Onyx",
      "Crimson", "Slate", "Ember", "Wraith", "Phantom", "Viper", "Hawk", "Rogue", "Rebel", "Riot",
      
      // Retro-futuristic
      "Cosmo", "Astro", "Rocket", "Jet", "Flash", "Sonic", "Turbo", "Nitro", "Cyber", "Chrome",
      "Neon", "Laser", "Plasma", "Quasar", "Nebula", "Comet", "Meteor", "Galaxy", "Starlight", "Zenith",
      
      // Mysterious/mystical
      "Enigma", "Mystic", "Oracle", "Seer", "Rune", "Spell", "Charm", "Spirit", "Ghost", "Mirage",
      "Prism", "Crystal", "Diamond", "Pearl", "Opal", "Jade", "Amber", "Scarlet", "Indigo", "Violet"
    ];
    
    const lastNames = [
      // Corporate/industrial
      "Steele", "Cross", "Stone", "Black", "Grey", "White", "Gold", "Silver", "Iron", "Chrome",
      "Sharp", "Quick", "Swift", "Stark", "Kane", "Knox", "Vale", "Ward", "Nash", "Reed",
      
      // Tech surnames
      "Zero", "One", "Binary", "Data", "Code", "Byte", "Bit", "Core", "Link", "Net",
      "Wire", "Chip", "Drive", "Port", "Node", "Grid", "Sync", "Loop", "Stack", "Hash",
      
      // Nature/elements (corrupted)
      "Frost", "Blaze", "Storm", "Thunder", "Lightning", "Quake", "Tide", "Wind", "Fire", "Ice",
      "Thorn", "Fang", "Claw", "Wing", "Scale", "Bone", "Blood", "Venom", "Toxin", "Acid",
      
      // Apocalyptic
      "Doom", "Bane", "Ruin", "Chaos", "Void", "Null", "Error", "Crash", "Burn", "Scar",
      "Wreck", "Break", "Tear", "Cut", "Slash", "Strike", "Bolt", "Shot", "Blast", "Bang",
      
      // Numbers/designations
      "Seven", "Nine", "Thirteen", "Prime", "Alpha", "Beta", "Gamma", "Delta", "Omega", "Zeta",
      "X1", "X7", "X9", "V2", "V5", "Z3", "Z8", "R4", "R6", "Q1"
    ];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
  }

  private generateStartingEquipment(background: string): any[] {
    // Varied equipment pools for more interesting combinations
    const survivalGear = [
      { name: "Emergency Rations", description: "Compressed nutrition bars" },
      { name: "Nutrient Paste", description: "Emergency food rations" },
      { name: "Water Recycler", description: "Converts moisture into drinking water" },
      { name: "Thermal Blanket", description: "Reflective emergency shelter" },
      { name: "Multi-tool", description: "Basic cutting and repair implement" },
      { name: "Credit Chip", description: "Contains 50 emergency credits" },
      { name: "Stim Pack", description: "Basic medical supplies" },
      { name: "Flashlight", description: "Battery-powered illumination" },
      { name: "Water Purification Tablets", description: "Makes questionable water safer" },
      { name: "Rope Coil", description: "20 meters of synthetic climbing rope" },
      { name: "Fire Starter", description: "Magnesium striker with tinder" }
    ];

    const personalItems = [
      { name: "Wedding Ring", description: "Worn platinum band, still warm" },
      { name: "Family Photo", description: "Cracked holoframe showing happier times" },
      { name: "Lucky Dice", description: "Clearly haven't been working lately" },
      { name: "Diary", description: "Half-burned journal with torn pages" },
      { name: "Pocket Watch", description: "Stopped at the exact moment everything went wrong" },
      { name: "House Key", description: "To a home that no longer exists" },
      { name: "Love Letters", description: "From someone who's probably dead now" },
      { name: "Childhood Toy", description: "A stuffed animal, one eye missing" },
      { name: "Concert Ticket", description: "For a show that never happened" },
      { name: "Business Card", description: "Your old job, your old life" }
    ];

    const weirdItems = [
      { name: "Rubber Duck", description: "Squeaks ominously when pressed" },
      { name: "Magic 8-Ball", description: "All answers are 'Outlook not so good'" },
      { name: "Broken Violin", description: "Missing three strings and hope" },
      { name: "Expired Lottery Ticket", description: "Would have won 10 million credits" },
      { name: "Pet Rock", description: "Named Gerald, good listener" },
      { name: "Fake Mustache", description: "For when you need to be someone else" },
      { name: "Unopened Fortune Cookie", description: "Too afraid to read the fortune" },
      { name: "Mood Ring", description: "Permanently stuck on 'despair'" },
      { name: "Snow Globe", description: "Contains tiny city that looks suspiciously like home" },
      { name: "Rubber Chicken", description: "Makes realistic screaming sounds" },
      { name: "Whoopee Cushion", description: "Because even apocalypses need comedy" },
      { name: "Origami Crane", description: "Made from eviction notice" }
    ];

    const contextualGear = [];
    if (background.includes("clinic") || background.includes("medical")) {
      contextualGear.push(
        { name: "Medical Scanner", description: "Handheld diagnostic device" },
        { name: "Expired Painkillers", description: "Better than nothing" },
        { name: "Tongue Depressor", description: "Wooden stick of hope" },
        { name: "Stethoscope", description: "Listen to your heart break" }
      );
    } else if (background.includes("research") || background.includes("experiment")) {
      contextualGear.push(
        { name: "Data Pad", description: "Encrypted research notes" },
        { name: "Safety Goggles", description: "Cracked but still protective" },
        { name: "Test Tube", description: "Contains unidentified green liquid" },
        { name: "Lab Notebook", description: "Documenting the end of the world" }
      );
    } else if (background.includes("security") || background.includes("criminal") || background.includes("gang")) {
      contextualGear.push(
        { name: "Ceramic Shiv", description: "Prison-made cutting tool" },
        { name: "Brass Knuckles", description: "Dented but functional" },
        { name: "Lock Pick Set", description: "For when doors don't cooperate" },
        { name: "Fake ID", description: "Someone else's face, your new life" }
      );
    } else if (background.includes("restaurant") || background.includes("food") || background.includes("chef")) {
      contextualGear.push(
        { name: "Chef's Knife", description: "Sharp and well-maintained" },
        { name: "Spice Packet", description: "Makes anything taste better" },
        { name: "Grease-Stained Apron", description: "Smells like home cooking" },
        { name: "Recipe Book", description: "Grandmother's secret techniques" }
      );
    } else if (background.includes("tech") || background.includes("hacker") || background.includes("programmer")) {
      contextualGear.push(
        { name: "Portable Hard Drive", description: "Contains someone else's secrets" },
        { name: "Jury-Rigged Phone", description: "Can probably hack a toaster" },
        { name: "Circuit Board", description: "Might be useful for something" },
        { name: "USB Drive", description: "Labeled 'DO NOT OPEN'" }
      );
    } else if (background.includes("teacher") || background.includes("school") || background.includes("student")) {
      contextualGear.push(
        { name: "Red Pen", description: "For marking final grades" },
        { name: "Textbook", description: "Everything you need to know (apparently not)" },
        { name: "Apple", description: "For the teacher you'll never see again" },
        { name: "Report Card", description: "All A's, fat lot of good it did" }
      );
    }
    
    // Build equipment list with more variety
    const equipment = [];
    
    // 2-3 survival items
    equipment.push(...this.shuffleArray(survivalGear).slice(0, 2 + Math.floor(Math.random() * 2)));
    
    // Always include one personal item for emotional depth
    equipment.push(...this.shuffleArray(personalItems).slice(0, 1));
    
    // 60% chance of weird item for personality
    if (Math.random() < 0.6) {
      equipment.push(...this.shuffleArray(weirdItems).slice(0, 1));
    }
    
    // Include contextual gear if available
    if (contextualGear.length > 0 && Math.random() < 0.7) {
      equipment.push(...this.shuffleArray(contextualGear).slice(0, 1));
    }
    
    return equipment;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Generate crawler candidates for selection
  async generateCrawlerCandidates(count = 30): Promise<any[]> {
    const candidates = [];

    for (let i = 0; i < count; i++) {
      const stats = this.generateRandomStats();
      const competencies = this.generateRandomCompetencies();
      const background = this.generateCrawlerBackground();
      const name = this.generateCrawlerName();
      const startingEquipment = this.generateStartingEquipment(background);

      // Determine top ability based on highest stat
      const statValues = [
        { name: 'Combat', value: stats.attack, description: 'Direct confrontation' },
        { name: 'Defense', value: stats.defense, description: 'Survival specialist' },
        { name: 'Speed', value: stats.speed, description: 'Agile movement' },
        { name: 'Wit', value: stats.wit, description: 'Problem solving' },
        { name: 'Charisma', value: stats.charisma, description: 'Social influence' },
        { name: 'Memory', value: stats.memory, description: 'Information retention' }
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

  // Process encounter choice and return results
  async processEncounterChoice(crawlerId: number, choiceId: string, encounterData: any): Promise<any> {
    const crawler = await this.getCrawler(crawlerId);
    if (!crawler) throw new Error("Crawler not found");

    const choice = encounterData.choices.find((c: any) => c.id === choiceId);
    if (!choice) throw new Error("Invalid choice");

    // Check if crawler meets requirements
    const meetsRequirements = this.checkChoiceRequirements(crawler, choice.requirements);
    
    // Calculate success based on stats and competencies
    const successChance = this.calculateChoiceSuccess(crawler, choice, meetsRequirements);
    const isSuccess = Math.random() < successChance;

    // Generate results based on choice outcome
    const results = this.generateChoiceResults(crawler, choice, encounterData.type, isSuccess);
    
    // Apply results to crawler
    await this.applyCrawlerUpdates(crawlerId, results);

    // Create activity log
    await this.createActivity({
      userId: crawler.sponsorId,
      crawlerId: crawler.id,
      type: 'encounter_choice',
      message: `${crawler.name} ${choice.text.toLowerCase()} - ${isSuccess ? 'Success!' : 'Failed!'}`,
      details: { choice: choiceId, success: isSuccess, results }
    });

    return {
      success: isSuccess,
      results,
      choice: choice,
      encounterType: encounterData.type,
      message: this.generateOutcomeMessage(crawler, choice, isSuccess, results)
    };
  }

  private checkChoiceRequirements(crawler: any, requirements: any): boolean {
    for (const [stat, required] of Object.entries(requirements)) {
      if (crawler[stat] < required) {
        return false;
      }
    }
    return true;
  }

  private calculateChoiceSuccess(crawler: any, choice: any, meetsRequirements: boolean): number {
    let baseChance = 0.6; // Base 60% success rate

    // Requirements bonus/penalty
    if (meetsRequirements) {
      baseChance += 0.3; // +30% if requirements met
    } else {
      baseChance -= 0.4; // -40% if requirements not met
    }

    // Stat bonus based on primary stat
    if (choice.primaryStat !== 'none') {
      const statValue = crawler[choice.primaryStat] || 0;
      baseChance += Math.min(statValue * 0.02, 0.2); // Up to +20% bonus
    }

    // Competency bonus
    const competencyBonus = this.applyCompetencyBonus(crawler, choice.primaryStat);
    baseChance += competencyBonus * 0.01; // 1% per competency point

    // Risk level adjustment
    switch (choice.riskLevel) {
      case 'none': baseChance = 1.0; break;
      case 'low': baseChance += 0.1; break;
      case 'medium': break; // no change
      case 'high': baseChance -= 0.1; break;
    }

    return Math.max(0.1, Math.min(0.95, baseChance)); // Clamp between 10% and 95%
  }

  private generateChoiceResults(crawler: any, choice: any, encounterType: string, isSuccess: boolean): any {
    const baseFloorMultiplier = 1 + (crawler.currentFloor * 0.1);
    
    if (!isSuccess) {
      // Failed attempts usually result in damage and minimal rewards
      return {
        credits: Math.floor(Math.random() * 10),
        experience: 5,
        equipment: [],
        damage: Math.floor((10 + Math.random() * 15) * baseFloorMultiplier)
      };
    }

    // Successful outcomes vary by encounter type and choice risk
    let baseRewards = {
      credits: 20,
      experience: 15,
      equipment: [],
      damage: 0
    };

    // Encounter type modifiers
    switch (encounterType) {
      case 'combat':
        baseRewards.experience += 20;
        baseRewards.credits += 15;
        if (choice.riskLevel === 'high') baseRewards.damage = Math.floor(5 * baseFloorMultiplier);
        break;
      case 'treasure':
        baseRewards.credits += 40;
        baseRewards.experience += 10;
        break;
      case 'npc':
        baseRewards.credits += 25;
        baseRewards.experience += 25;
        break;
      case 'trap':
        baseRewards.experience += 15;
        baseRewards.credits += 10;
        break;
      case 'event':
        baseRewards.experience += 30;
        baseRewards.credits += 15;
        break;
    }

    // Risk/reward scaling
    switch (choice.riskLevel) {
      case 'high':
        baseRewards.credits *= 1.5;
        baseRewards.experience *= 1.3;
        break;
      case 'medium':
        baseRewards.credits *= 1.2;
        baseRewards.experience *= 1.1;
        break;
      case 'low':
        baseRewards.credits *= 0.8;
        baseRewards.experience *= 0.9;
        break;
    }

    // Apply floor scaling
    baseRewards.credits = Math.floor(baseRewards.credits * baseFloorMultiplier);
    baseRewards.experience = Math.floor(baseRewards.experience * baseFloorMultiplier);

    return baseRewards;
  }

  private generateOutcomeMessage(crawler: any, choice: any, isSuccess: boolean, results: any): string {
    const action = choice.text.toLowerCase();
    
    if (!isSuccess) {
      return `${crawler.name} attempted to ${action} but failed! Took ${results.damage} damage but gained some experience from the attempt.`;
    }

    let message = `${crawler.name} successfully chose to ${action}!`;
    
    if (results.credits > 0) {
      message += ` Gained ${results.credits} credits`;
    }
    if (results.experience > 0) {
      message += ` and ${results.experience} experience`;
    }
    if (results.damage > 0) {
      message += ` but took ${results.damage} damage in the process`;
    }
    
    return message + '.';
  }

  // Debug function to reset all crawlers for a user
  async resetUserCrawlers(userId: string): Promise<void> {
    // Get all crawler IDs for this user
    const userCrawlers = await db.select({ id: crawlers.id }).from(crawlers).where(eq(crawlers.sponsorId, userId));
    const crawlerIds = userCrawlers.map(c => c.id);
    
    if (crawlerIds.length > 0) {
      // Delete activities first (foreign key constraint)
      for (const crawlerId of crawlerIds) {
        await db.delete(activities).where(eq(activities.crawlerId, crawlerId));
      }
      
      // Delete encounters
      for (const crawlerId of crawlerIds) {
        await db.delete(encounters).where(eq(encounters.crawlerId, crawlerId));
      }
      
      // Delete crawler equipment
      for (const crawlerId of crawlerIds) {
        await db.delete(crawlerEquipment).where(eq(crawlerEquipment.crawlerId, crawlerId));
      }
      
      // Finally delete the crawlers
      await db.delete(crawlers).where(eq(crawlers.sponsorId, userId));
    }
    
    // Reset user's primary sponsorship status
    await db.update(users)
      .set({ 
        primarySponsorshipUsed: false,
        lastPrimarySponsorshipSeason: 0 
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
