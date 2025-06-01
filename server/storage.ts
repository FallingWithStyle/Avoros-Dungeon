import {
  users,
  crawlers,
  crawlerClasses,
  equipment,
  equipmentTypes,
  crawlerEquipment,
  floors,
  rooms,
  roomConnections,
  crawlerPositions,
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
  type Room,
  type RoomConnection,
  type CrawlerPosition,
  type Enemy,
  type Encounter,
  type Season,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, asc, like, inArray } from "drizzle-orm";

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
  
  // Room and mapping operations
  createRoom(floorId: number, x: number, y: number, type: string, name: string, description: string): Promise<Room>;
  getRoomsForFloor(floorId: number): Promise<Room[]>;
  getRoom(roomId: number): Promise<Room | undefined>;
  createRoomConnection(fromRoomId: number, toRoomId: number, direction: string): Promise<RoomConnection>;
  getAvailableDirections(roomId: number): Promise<string[]>;
  moveToRoom(crawlerId: number, direction: string): Promise<{ success: boolean; newRoom?: Room; error?: string; energyCost?: number }>;
  getCrawlerCurrentRoom(crawlerId: number): Promise<Room | undefined>;
  getPlayersInRoom(roomId: number): Promise<CrawlerWithDetails[]>;
  getExploredRooms(crawlerId: number): Promise<any[]>;
  
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

  private generatePreDungeonJob(): string {
    const jobs = [
      // Mundane jobs
      "office clerk", "cashier", "data entry specialist", "customer service representative",
      "insurance adjuster", "tax preparer", "filing clerk", "receptionist", "bookkeeper",
      "security guard", "janitor", "mail carrier", "bus driver", "parking attendant",
      "inventory manager", "call center operator", "copy machine technician", "payroll clerk",
      "administrative assistant", "quality control inspector", "warehouse worker", "delivery driver",
      
      // Professional jobs
      "accountant", "lawyer", "teacher", "nurse", "engineer", "architect", "dentist",
      "pharmacist", "veterinarian", "therapist", "consultant", "project manager",
      "marketing specialist", "sales representative", "human resources coordinator",
      "graphic designer", "web developer", "database administrator", "financial advisor",
      
      // Weird/unusual jobs
      "professional line waiter", "cheese sculptor", "pet psychic", "fortune cookie writer",
      "professional apologizer", "social media influencer for plants", "elevator music composer",
      "professional mourner", "dog food taster", "golf ball diver", "ostrich babysitter",
      "professional sleeper", "fortune teller for pets", "bubble wrap quality tester",
      "professional Netflix watcher", "chicken sexer", "paint drying observer", "food stylist",
      "professional cuddler", "grass growing supervisor", "professional queue holder",
      
      // Sci-fi/fantastic jobs  
      "space traffic controller", "alien interpreter", "robot therapist", "time travel agent",
      "interdimensional courier", "gravity adjuster", "memory editor", "dream architect",
      "virtual reality tester", "hologram maintenance technician", "teleporter calibrator",
      "artificial intelligence trainer", "parallel universe monitor", "cosmic weather forecaster",
      "quantum entanglement specialist", "nano-technology farmer", "digital ghost hunter",
      "synthetic emotion designer", "planetary atmosphere engineer", "galactic tour guide",
      
      // Blue collar with a twist
      "underwater welder", "professional food critic", "wine tester", "mattress tester",
      "theme park ride tester", "video game tester", "chocolate taster", "perfume evaluator",
      "fireworks technician", "special effects coordinator", "stunt double", "voice actor",
      "professional wrestler", "circus performer", "street performer", "wedding planner"
    ];
    
    return jobs[Math.floor(Math.random() * jobs.length)];
  }

  private generateCrawlerBackground(): string {
    const job = this.generatePreDungeonJob();
    const desperateBackgrounds = [
      "Hiding from ex-partner's criminal associates who want them dead",
      "Fled into the dungeon after witnessing a mob assassination", 
      "Chasing their missing sibling who entered the dungeon weeks ago",
      "Escaping massive gambling debts to dangerous loan sharks",
      "On the run after accidentally uncovering corporate corruption",
      "Homeless and desperate after being evicted from their apartment",
      "Seeking their missing child who was kidnapped by cultists",
      "Fleeing after their medical practice was shut down for whistleblowing",
      "Running from a private investigator hired by their former employer",
      "Lost everything in a Ponzi scheme and has nowhere else to go",
      "Trying to disappear after their research exposed government secrets",
      "Following their mentor who vanished into the dungeon with vital evidence"
    ];

    const wackyBackgrounds = [
      "Professional food critic whose scathing review of a corporate cafeteria somehow led to a nationwide manhunt",
      "Used to run an underground origami club that accidentally became a resistance movement",
      "Former birthday party clown who witnessed something they shouldn't have at a corporate executive's kid's party",
      "Librarian who discovered that late fees were being used to fund illegal weapons research",
      "Freelance mime who broke character at the wrong moment and saw too much",
      "Pet groomer whose client's 'dog' turned out to be an escaped lab animal",
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
      "Rideshare driver who picked up the wrong passenger at the wrong time and heard the wrong phone call",
      "Karaoke host whose song requests app was secretly monitoring corporate communications",
      "Personal trainer whose client confessed to war crimes during a particularly intense workout",
      "Flower delivery person who delivered the wrong bouquet to the wrong office and saw too much",
      "Professional cosplayer whose costume was too realistic and got them mistaken for an actual corporate spy",
      "Food truck owner whose lunch rush happened to coincide with an illegal corporate meeting in the park",
      "Freelance furniture assembler who found corporate secrets hidden inside furniture boxes",
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
      "Their identical twin was murdered and replaced by a corporate double - they're next",
      "Discovered their late parents' charity was actually a human trafficking front and assassins came calling",
      "Their DNA was patented by a corporation and they're technically corporate property now",
      "Former corporate lawyer who found out their adoption agency was actually a corporate breeding program",
      "Their therapy sessions were being used to identify and eliminate potential dissidents",
      "Learned their life insurance policy had a 'corporate termination clause' that kicked in last Tuesday"
    ];

    // Mix of desperation levels for variety - 40% desperate, 50% wacky, 10% tragic
    const roll = Math.random();
    let reason;
    if (roll < 0.4) {
      reason = desperateBackgrounds[Math.floor(Math.random() * desperateBackgrounds.length)];
    } else if (roll < 0.9) {
      reason = wackyBackgrounds[Math.floor(Math.random() * wackyBackgrounds.length)];
    } else {
      reason = tragicBackgrounds[Math.floor(Math.random() * tragicBackgrounds.length)];
    }
    
    return `Former ${job}. ${reason}`;
  }

  async createCrawler(crawlerData: InsertCrawler): Promise<Crawler> {
    const [crawler] = await db
      .insert(crawlers)
      .values(crawlerData)
      .returning();

    // Give them some random starting equipment
    await this.assignRandomStartingEquipment(crawler.id);

    // Place crawler in the entrance room (floor 1)
    await this.placeCrawlerInEntranceRoom(crawler.id);

    return crawler;
  }

  private async placeCrawlerInEntranceRoom(crawlerId: number): Promise<void> {
    // Find the entrance room on floor 1
    const [floor1] = await db.select().from(floors).where(eq(floors.floorNumber, 1));
    if (!floor1) return;

    const [entranceRoom] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.floorId, floor1.id), eq(rooms.type, 'entrance')));

    if (entranceRoom) {
      await db.insert(crawlerPositions).values({
        crawlerId: crawlerId,
        roomId: entranceRoom.id,
        enteredAt: new Date()
      });
    }
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
        type: enemyId ? 'combat' : 'exploration',
        status: 'active',
      } as any)
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
              id: "wit",
              text: "Use clever tactics to outmaneuver it",
              requirements: { wit: 6 },
              riskLevel: "medium",
              primaryStat: "wit"
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
              requirements: { wit: 6, speed: 6 },
              riskLevel: "high",
              primaryStat: "wit"
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
              requirements: { wit: 8 },
              riskLevel: "medium",
              primaryStat: "wit"
            },
            {
              id: "force",
              text: "Break it open with brute force",
              requirements: { attack: 6 },
              riskLevel: "high",
              primaryStat: "attack"
            },
            {
              id: "bypass",
              text: "Look for hidden maintenance access",
              requirements: { speed: 4 },
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
        },
        {
          title: "Abandoned Equipment Locker",
          description: `A military-style locker sits half-buried in debris. The lock appears damaged but functional.`,
          choices: [
            {
              id: "pick_lock",
              text: "Carefully pick the lock",
              requirements: { wit: 5 },
              riskLevel: "low",
              primaryStat: "wit"
            },
            {
              id: "smash",
              text: "Smash it open with available tools",
              requirements: { attack: 4 },
              riskLevel: "medium",
              primaryStat: "attack"
            },
            {
              id: "examine",
              text: "Examine for traps before opening",
              requirements: { memory: 3 },
              riskLevel: "none",
              primaryStat: "memory"
            }
          ]
        },
        {
          title: "Glowing Crystal Formation",
          description: `Strange crystals emit a soft blue glow. They might be valuable energy sources.`,
          choices: [
            {
              id: "harvest",
              text: "Carefully harvest the crystals",
              requirements: { wit: 6 },
              riskLevel: "medium",
              primaryStat: "wit"
            },
            {
              id: "break_off",
              text: "Break off a piece quickly",
              requirements: { speed: 4 },
              riskLevel: "high",
              primaryStat: "speed"
            },
            {
              id: "study",
              text: "Study the formation first",
              requirements: { memory: 4 },
              riskLevel: "low",
              primaryStat: "memory"
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

    const typeEncounters = (encounters as any)[type] || encounters.event;
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
    
    const typeStories = (stories as any)[type] || stories.event;
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
    
    const relevantCompetencies = (competencyBonuses as any)[encounterType] || [];
    const bonusCount = crawler.competencies.filter((comp: any) => 
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
    
    // Remove items that were lost in trading
    if (rewards.itemsLost && rewards.itemsLost.length > 0) {
      for (const lostItemName of rewards.itemsLost) {
        // Find the item in crawler's equipment and remove it
        const equipmentToRemove = await db
          .select()
          .from(crawlerEquipment)
          .innerJoin(equipment, eq(crawlerEquipment.equipmentId, equipment.id))
          .where(eq(crawlerEquipment.crawlerId, crawlerId))
          .limit(1);
          
        if (equipmentToRemove.length > 0) {
          await db
            .delete(crawlerEquipment)
            .where(eq(crawlerEquipment.id, equipmentToRemove[0].crawler_equipment.id));
        }
      }
    }
    
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
    const lastRegen = new Date((crawler.lastEnergyRegen || crawler.createdAt) as string | Date);
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

  private generateHumanName(): string {
    const firstNames = [
      // Male names
      "Aaron", "Adam", "Adrian", "Albert", "Alexander", "Andrew", "Anthony", "Arthur", "Benjamin", "Brian",
      "Bruce", "Carl", "Charles", "Christopher", "Daniel", "David", "Dennis", "Donald", "Douglas", "Earl",
      "Edward", "Eric", "Eugene", "Frank", "Gary", "George", "Gerald", "Gregory", "Harold", "Henry",
      "Jack", "James", "Jason", "Jeffrey", "Jerry", "John", "Joseph", "Joshua", "Kenneth", "Kevin",
      "Lawrence", "Mark", "Matthew", "Michael", "Nicholas", "Patrick", "Paul", "Peter", "Philip", "Raymond",
      "Richard", "Robert", "Roger", "Ronald", "Russell", "Samuel", "Scott", "Stephen", "Steven", "Thomas",
      "Timothy", "Walter", "Wayne", "William", "Eugene", "Leonard", "Stanley", "Ralph", "Frank", "Louis",
      
      // Female names
      "Alice", "Amanda", "Amy", "Andrea", "Angela", "Anna", "Anne", "Barbara", "Betty", "Beverly",
      "Brenda", "Carol", "Catherine", "Christine", "Cynthia", "Deborah", "Diana", "Donna", "Dorothy", "Elizabeth",
      "Emily", "Frances", "Francine", "Helen", "Janet", "Janice", "Jean", "Jennifer", "Jessica", "Joan",
      "Joyce", "Judith", "Julie", "Karen", "Katherine", "Kathleen", "Kelly", "Kimberly", "Laura", "Linda",
      "Lisa", "Margaret", "Maria", "Marie", "Martha", "Mary", "Michelle", "Nancy", "Nicole", "Pamela",
      "Patricia", "Rachel", "Rebecca", "Ruth", "Sandra", "Sarah", "Sharon", "Stephanie", "Susan", "Teresa",
      "Virginia", "Wanda", "Gloria", "Rose", "Evelyn", "Mildred", "Florence", "Irene", "Grace", "Carolyn"
    ];
    
    const lastNames = [
      "Adams", "Allen", "Anderson", "Baker", "Barnes", "Bell", "Bennett", "Brooks", "Brown", "Butler",
      "Campbell", "Carter", "Clark", "Collins", "Cooper", "Cox", "Davis", "Edwards", "Evans", "Fisher",
      "Foster", "Garcia", "Gray", "Green", "Hall", "Harris", "Henderson", "Hill", "Howard", "Hughes",
      "Jackson", "James", "Johnson", "Jones", "Kelly", "King", "Lee", "Lewis", "Long", "Lopez",
      "Martin", "Martinez", "McArthur", "Miller", "Mitchell", "Moore", "Morgan", "Morris", "Murphy", "Nelson",
      "Parker", "Patterson", "Perez", "Peterson", "Phillips", "Powell", "Price", "Reed", "Richardson", "Roberts",
      "Robinson", "Rodriguez", "Rogers", "Ross", "Russell", "Sanchez", "Scott", "Simmons", "Smith", "Stewart",
      "Taylor", "Thomas", "Thompson", "Turner", "Walker", "Ward", "Washington", "Watson", "White", "Williams",
      "Wilson", "Wood", "Wright", "Young", "Armstrong", "Bryant", "Crawford", "Duncan", "Ferguson", "Fletcher",
      "Graham", "Hampton", "Harrison", "Irving", "Lawson", "Maxwell", "Preston", "Sullivan", "Thornton", "Vaughn",
      "Blackwood", "Fairfax", "Goodwin", "Harrington", "Lancaster", "Mansfield", "Montgomery", "Pemberton",
      "Sinclair", "Whitmore", "Worthington", "Ashford", "Bradford", "Donovan", "Grayson", "Hartwell"
    ];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
  }

  private generateCrawlerName(species: string = "human", planetType: string = "earth-like"): string {
    // For now, only human names are implemented
    // Future species will have their own name generation methods
    switch (species) {
      case "human":
      default:
        return this.generateHumanName();
    }
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
      const species = "human"; // All crawlers are human for now
      const planetType = "earth-like"; // All from earth-like planets for now
      const name = this.generateCrawlerName(species, planetType);
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
        species,
        planetType,
        level: 1
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
      if (crawler[stat] < (required as number)) {
        return false;
      }
    }
    return true;
  }

  private calculateChoiceSuccess(crawler: any, choice: any, meetsRequirements: boolean): number {
    let baseChance = 0.6; // Base 60% success rate

    // Calculate challenge level based on requirements
    const challengeLevel = this.getChoiceChallengeLevel(choice);
    
    // Apply luck mechanics
    const luckBonus = this.calculateLuckBonus(crawler, choice, challengeLevel);
    baseChance += luckBonus;

    // Requirements bonus/penalty
    if (meetsRequirements) {
      baseChance += 0.3; // +30% if requirements met
    } else {
      baseChance -= 0.4; // -40% if requirements not met
    }

    // Multi-stat bonus based on all relevant stats
    if (choice.primaryStat !== 'none') {
      const primaryStatValue = crawler[choice.primaryStat] || 0;
      baseChance += Math.min(primaryStatValue * 0.02, 0.2); // Up to +20% bonus from primary stat
      
      // Small bonus from other relevant stats
      const secondaryBonus = this.calculateSecondaryStatBonus(crawler, choice);
      baseChance += secondaryBonus;
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

  private getChoiceChallengeLevel(choice: any): number {
    // Calculate total challenge based on requirements
    const requirements = choice.requirements || {};
    return Object.values(requirements).reduce((sum: number, value: any) => sum + (value || 0), 0);
  }

  private calculateLuckBonus(crawler: any, choice: any, challengeLevel: number): number {
    const luck = crawler.luck || 0;
    const primaryStat = crawler[choice.primaryStat] || 0;
    
    // Luck mechanics: +1 if luck > challenge, -1 if skill + luck < challenge
    if (luck > challengeLevel) {
      return 0.1; // +10% success chance
    } else if ((primaryStat + luck) < challengeLevel) {
      return -0.1; // -10% success chance
    }
    
    return 0; // No luck bonus/penalty
  }

  private calculateSecondaryStatBonus(crawler: any, choice: any): number {
    const allStats = ['attack', 'defense', 'speed', 'wit', 'charisma', 'memory'];
    const primaryStat = choice.primaryStat;
    let bonus = 0;
    
    // Small bonus from non-primary stats (max 5% total)
    allStats.forEach(stat => {
      if (stat !== primaryStat) {
        const statValue = crawler[stat] || 0;
        bonus += Math.min(statValue * 0.005, 0.01); // Up to 1% per stat
      }
    });
    
    return Math.min(bonus, 0.05); // Cap at 5% total secondary bonus
  }

  private generateChoiceResults(crawler: any, choice: any, encounterType: string, isSuccess: boolean): any {
    const baseFloorMultiplier = 1 + (crawler.currentFloor * 0.1);
    
    let results = {
      credits: 0,
      experience: 0,
      equipment: [],
      damage: 0,
      itemsLost: [],
      itemsGained: [],
      summary: ""
    };
    
    if (!isSuccess) {
      // Failed attempts usually result in damage and minimal rewards
      results.credits = Math.floor(Math.random() * 10);
      results.experience = this.getFailureXP(choice, encounterType);
      results.damage = Math.floor((10 + Math.random() * 15) * baseFloorMultiplier);
      
      // Trading failures might still lose items
      if (choice.text.toLowerCase().includes('trade') && crawler.equipment?.length > 0) {
        const randomItem = crawler.equipment[Math.floor(Math.random() * crawler.equipment.length)];
        results.itemsLost.push(randomItem.equipment?.name || 'Unknown item');
      }
      
      results.summary = `Lost ${results.damage} health${results.itemsLost.length > 0 ? `, lost ${results.itemsLost.join(', ')}` : ''}`;
      return results;
    }

    // Base successful rewards based on action difficulty
    const baseXP = this.getSuccessXP(choice, encounterType);
    results.experience = Math.floor(baseXP * baseFloorMultiplier);
    
    // Only certain actions should give credits
    const actionText = choice.text.toLowerCase();
    const givesCredits = actionText.includes('trade') || 
                        actionText.includes('sell') || 
                        actionText.includes('loot') || 
                        actionText.includes('search') ||
                        actionText.includes('ambush') ||
                        encounterType === 'treasure';
                        
    if (givesCredits) {
      results.credits = Math.floor((10 + Math.random() * 15) * baseFloorMultiplier);
    }

    // Handle trading actions - consume items from inventory
    if (choice.text.toLowerCase().includes('trade') || choice.text.toLowerCase().includes('offer')) {
      if (crawler.equipment?.length > 0) {
        const randomItem = crawler.equipment[Math.floor(Math.random() * crawler.equipment.length)];
        results.itemsLost.push(randomItem.equipment?.name || 'Unknown item');
        
        // Trading success gives better credit rewards
        results.credits = Math.floor((results.credits || 10) * 1.8);
      }
    }

    // Encounter type specific bonuses
    switch (encounterType) {
      case 'combat':
        if (choice.text.toLowerCase().includes('ambush')) {
          results.experience += Math.floor(15 * baseFloorMultiplier); // Ambush bonus XP
        }
        if (choice.riskLevel === 'high') {
          results.damage = Math.floor(5 * baseFloorMultiplier);
        }
        break;
      case 'treasure':
        results.credits += Math.floor(25 * baseFloorMultiplier);
        break;
      case 'npc':
        results.credits += Math.floor(15 * baseFloorMultiplier);
        break;
    }

    // Generate summary
    let summaryParts = [];
    if (results.credits > 0) summaryParts.push(`+${results.credits} credits`);
    if (results.experience > 0) summaryParts.push(`+${results.experience} XP`);
    if (results.itemsLost.length > 0) summaryParts.push(`lost ${results.itemsLost.join(', ')}`);
    if (results.itemsGained.length > 0) summaryParts.push(`gained ${results.itemsGained.join(', ')}`);
    if (results.damage > 0) summaryParts.push(`-${results.damage} health`);
    
    results.summary = summaryParts.join(', ') || 'No significant changes';

    return results;
  }

  // Helper method to calculate XP for failed actions
  private getFailureXP(choice: any, encounterType: string): number {
    const baseFailureXP = 5;
    
    // Higher risk actions give more XP even when failed
    let multiplier = 1;
    switch (choice.riskLevel) {
      case 'high': multiplier = 1.5; break;
      case 'medium': multiplier = 1.2; break;
      case 'low': multiplier = 1.0; break;
    }
    
    return Math.floor(baseFailureXP * multiplier);
  }

  // Helper method to calculate XP for successful actions based on difficulty
  private getSuccessXP(choice: any, encounterType: string): number {
    let baseXP = 15;
    
    // Different encounter types give different base XP
    switch (encounterType) {
      case 'combat': 
        baseXP = choice.text.toLowerCase().includes('ambush') ? 40 : 25;
        break;
      case 'treasure': baseXP = 20; break;
      case 'npc': baseXP = 25; break;
      case 'trap': baseXP = 22; break;
      case 'event': baseXP = 30; break;
    }
    
    // Risk level affects XP rewards
    switch (choice.riskLevel) {
      case 'high': baseXP *= 1.4; break;
      case 'medium': baseXP *= 1.2; break;
      case 'low': baseXP *= 0.8; break;
    }
    
    // Action type affects XP (combat actions > trade > escape)
    if (choice.text.toLowerCase().includes('run') || choice.text.toLowerCase().includes('flee')) {
      baseXP *= 0.6; // Running gives less XP
    } else if (choice.text.toLowerCase().includes('trade') || choice.text.toLowerCase().includes('offer')) {
      baseXP *= 0.8; // Trading gives moderate XP
    }
    
    return Math.floor(baseXP);
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
  private async isRoomSafe(roomId: number): Promise<boolean> {
    // For now, consider all previously visited rooms as safe for reduced energy cost
    // This is a simplified approach since we don't have detailed encounter tracking
    
    // Get room details to check room type
    const room = await this.getRoom(roomId);
    if (!room) {
      return false;
    }

    // Certain room types are considered inherently dangerous for reduced energy travel
    const dangerousRoomTypes = ['trap', 'boss', 'elite', 'puzzle'];

    // If it's a dangerous room type, it's not safe for reduced energy travel
    if (dangerousRoomTypes.includes(room.type)) {
      return false;
    }

    // Check if there are any active encounters in this room
    const activeEncounters = await db.select()
      .from(encounters)
      .where(and(
        eq(encounters.floorId, room.floorId),
        eq(encounters.status, 'active')
      ))
      .limit(1);

    // If there are active encounters, room is not safe
    if (activeEncounters.length > 0) {
      return false;
    }

    // Otherwise, consider it safe (normal rooms, entrance, etc.)
    return true;
  }

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
      
      // Delete crawler positions
      for (const crawlerId of crawlerIds) {
        await db.delete(crawlerPositions).where(eq(crawlerPositions.crawlerId, crawlerId));
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

  // Room and mapping operations
  async createRoom(floorId: number, x: number, y: number, type: string, name: string, description: string): Promise<Room> {
    const [room] = await db.insert(rooms).values({
      floorId,
      x,
      y,
      type,
      name,
      description,
      isSafe: type === 'safe',
      hasLoot: type === 'treasure'
    }).returning();
    return room;
  }

  async getRoomsForFloor(floorId: number): Promise<Room[]> {
    return await db.select().from(rooms).where(eq(rooms.floorId, floorId));
  }

  async getRoom(roomId: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    return room;
  }

  async createRoomConnection(fromRoomId: number, toRoomId: number, direction: string): Promise<RoomConnection> {
    const [connection] = await db.insert(roomConnections).values({
      fromRoomId,
      toRoomId,
      direction
    }).returning();
    return connection;
  }

  async getAvailableDirections(roomId: number): Promise<string[]> {
    const connections = await db.select()
      .from(roomConnections)
      .where(eq(roomConnections.fromRoomId, roomId));
    
    const directions = connections.map(conn => conn.direction);
    
    // Check if this room has a staircase
    const room = await this.getRoom(roomId);
    if (room && room.type === 'stairs') {
      directions.push('staircase');
    }
    
    return directions;
  }

  async moveToRoom(crawlerId: number, direction: string, debugEnergyDisabled?: boolean): Promise<{ success: boolean; newRoom?: Room; error?: string }> {
    // Get current position
    const [currentPosition] = await db.select()
      .from(crawlerPositions)
      .where(eq(crawlerPositions.crawlerId, crawlerId))
      .orderBy(desc(crawlerPositions.enteredAt))
      .limit(1);

    if (!currentPosition) {
      return { success: false, error: "Crawler position not found" };
    }

    // Get current room to check if it's a staircase
    const currentRoom = await this.getRoom(currentPosition.roomId);
    if (!currentRoom) {
      return { success: false, error: "Current room not found" };
    }

    // Special handling for staircase movement
    if (direction === 'staircase') {
      if (currentRoom.type !== 'stairs') {
        return { success: false, error: "No staircase in this room" };
      }
      return await this.handleStaircaseMovement(crawlerId, currentRoom);
    }

    // Find connection in the given direction
    const [connection] = await db.select()
      .from(roomConnections)
      .where(and(
        eq(roomConnections.fromRoomId, currentPosition.roomId),
        eq(roomConnections.direction, direction)
      ));

    if (!connection) {
      return { success: false, error: `No exit ${direction} from current room` };
    }

    // Check if connection is locked
    if (connection.isLocked) {
      return { success: false, error: `The ${direction} exit is locked` };
    }

    // Get the destination room
    const newRoom = await this.getRoom(connection.toRoomId);
    if (!newRoom) {
      return { success: false, error: "Destination room not found" };
    }

    // Check if this room has been previously explored by this crawler
    const previousVisit = await db.select()
      .from(crawlerPositions)
      .where(and(
        eq(crawlerPositions.crawlerId, crawlerId),
        eq(crawlerPositions.roomId, connection.toRoomId)
      ))
      .limit(1);

    // Calculate energy cost - reduced for previously explored rooms
    let energyCost = 10; // Default movement cost for new rooms
    
    console.log(`Energy calculation: crawlerId=${crawlerId}, roomId=${connection.toRoomId}, previousVisits=${previousVisit.length}`);
    if (previousVisit.length > 0) {
      // Reduced energy cost for rooms you've already explored
      energyCost = 5; // Half energy cost for previously visited rooms
      console.log(`Energy cost reduced to ${energyCost} for previously visited room`);
    } else {
      console.log(`First visit to room ${connection.toRoomId}, energy cost: ${energyCost}`);
    }
    
    // Get current crawler to check/update energy
    const crawler = await this.getCrawler(crawlerId);
    if (!crawler) {
      return { success: false, error: "Crawler not found" };
    }

    console.log(`Final energy cost: ${energyCost}, crawler current energy: ${crawler.energy}, debugEnergyDisabled: ${debugEnergyDisabled}`);

    if (!debugEnergyDisabled && crawler.energy < energyCost) {
      return { success: false, error: `Not enough energy. Need ${energyCost}, have ${crawler.energy}` };
    }

    // Deduct energy cost (unless debug mode is enabled)
    if (!debugEnergyDisabled) {
      await this.updateCrawler(crawlerId, {
        energy: Math.max(0, crawler.energy - energyCost)
      });
    } else {
      console.log(`Debug mode enabled: skipping energy deduction of ${energyCost}`);
    }

    // Always insert a new position record to create movement history
    // This allows us to track all rooms the crawler has visited
    await db.insert(crawlerPositions).values({
      crawlerId,
      roomId: connection.toRoomId,
      enteredAt: new Date()
    });

    return { success: true, newRoom };
  }

  async getCrawlerCurrentRoom(crawlerId: number): Promise<Room | undefined> {
    const [position] = await db.select({
      room: rooms
    })
    .from(crawlerPositions)
    .innerJoin(rooms, eq(crawlerPositions.roomId, rooms.id))
    .where(eq(crawlerPositions.crawlerId, crawlerId))
    .orderBy(desc(crawlerPositions.enteredAt))
    .limit(1);

    return position?.room;
  }

  async getPlayersInRoom(roomId: number): Promise<CrawlerWithDetails[]> {
    // Get crawlers who are currently in this room (most recent position for each crawler)
    // For now, let's get all distinct crawlers who have been in this room
    // This is a simplified approach to avoid complex SQL grouping issues
    const crawlerIds = await db.selectDistinct({
      crawlerId: crawlerPositions.crawlerId
    })
    .from(crawlerPositions)
    .where(eq(crawlerPositions.roomId, roomId));

    if (crawlerIds.length === 0) {
      return [];
    }

    // Get detailed crawler info for each player in the room
    const crawlersInRoom: CrawlerWithDetails[] = [];
    for (const { crawlerId } of crawlerIds) {
      const crawler = await this.getCrawler(crawlerId);
      if (crawler) {
        crawlersInRoom.push(crawler);
      }
    }

    return crawlersInRoom;
  }

  async getExploredRooms(crawlerId: number): Promise<any[]> {
    // Get current position (most recent entry)
    const currentPosition = await db.select()
      .from(crawlerPositions)
      .where(eq(crawlerPositions.crawlerId, crawlerId))
      .orderBy(desc(crawlerPositions.enteredAt))
      .limit(1);

    if (currentPosition.length === 0) {
      return [];
    }

    const currentRoomId = currentPosition[0].roomId;

    // Get ALL rooms this crawler has visited by checking position history
    // We need to track unique room visits
    const visitedPositions = await db.select({
      roomId: crawlerPositions.roomId,
      room: rooms
    })
    .from(crawlerPositions)
    .innerJoin(rooms, eq(crawlerPositions.roomId, rooms.id))
    .where(eq(crawlerPositions.crawlerId, crawlerId));

    // Create a map of unique visited rooms
    const visitedRoomsMap = new Map();
    const visitedRoomIds = new Set<number>();
    
    for (const position of visitedPositions) {
      if (!visitedRoomsMap.has(position.roomId)) {
        visitedRoomsMap.set(position.roomId, position.room);
        visitedRoomIds.add(position.roomId);
      }
    }

    // Find ALL adjacent rooms from ALL visited rooms (persistent fog of war)
    const allConnections = await db.select()
      .from(roomConnections)
      .where(inArray(roomConnections.fromRoomId, Array.from(visitedRoomIds)));

    const discoveredUnexploredRooms: any[] = [];
    const discoveredRoomIds = new Set<number>();
    
    for (const connection of allConnections) {
      if (!visitedRoomIds.has(connection.toRoomId) && !discoveredRoomIds.has(connection.toRoomId)) {
        const adjacentRoom = await this.getRoom(connection.toRoomId);
        if (adjacentRoom) {
          discoveredRoomIds.add(connection.toRoomId);
          discoveredUnexploredRooms.push({
            id: adjacentRoom.id,
            name: '???',
            type: 'unexplored',
            isSafe: false,
            hasLoot: false,
            x: adjacentRoom.x,
            y: adjacentRoom.y,
            isCurrentRoom: false,
            isExplored: false
          });
        }
      }
    }

    // Convert visited rooms to the expected format
    const exploredRoomData = Array.from(visitedRoomsMap.values()).map(room => ({
      id: room.id,
      name: room.name,
      type: room.type,
      isSafe: room.isSafe,
      hasLoot: room.hasLoot,
      x: room.x,
      y: room.y,
      isCurrentRoom: room.id === currentRoomId,
      isExplored: true
    }));

    return [...exploredRoomData, ...discoveredUnexploredRooms];
  }

  async resetCrawlerToEntrance(crawlerId: number): Promise<void> {
    // Find the entrance room (room with type 'entrance')
    const [entranceRoom] = await db.select()
      .from(rooms)
      .where(eq(rooms.type, 'entrance'))
      .limit(1);

    if (entranceRoom) {
      // Add new position record at entrance
      await db.insert(crawlerPositions).values({
        crawlerId,
        roomId: entranceRoom.id,
        enteredAt: new Date()
      });
    }
  }

  async handleStaircaseMovement(crawlerId: number, currentRoom: any): Promise<{ success: boolean; newRoom?: any; error?: string }> {
    // Get current floor
    const [currentFloor] = await db.select()
      .from(floors)
      .where(eq(floors.id, currentRoom.floorId));

    if (!currentFloor) {
      return { success: false, error: "Current floor not found" };
    }

    // Find next floor
    const [nextFloor] = await db.select()
      .from(floors)
      .where(eq(floors.floorNumber, currentFloor.floorNumber + 1));

    if (!nextFloor) {
      return { success: false, error: "No deeper floor available" };
    }

    // Find entrance room on next floor
    const [entranceRoom] = await db.select()
      .from(rooms)
      .where(and(
        eq(rooms.floorId, nextFloor.id),
        eq(rooms.type, 'entrance')
      ));

    if (!entranceRoom) {
      return { success: false, error: "No entrance found on next floor" };
    }

    // Deduct energy for floor transition (higher cost)
    const crawler = await this.getCrawler(crawlerId);
    if (crawler && crawler.energy >= 15) {
      await db.update(crawlers)
        .set({ 
          energy: crawler.energy - 15,
          currentFloor: nextFloor.floorNumber 
        })
        .where(eq(crawlers.id, crawlerId));
    } else {
      // Update floor even if no energy cost (for debug mode)
      await db.update(crawlers)
        .set({ currentFloor: nextFloor.floorNumber })
        .where(eq(crawlers.id, crawlerId));
    }

    // Move crawler to entrance of next floor
    await db.insert(crawlerPositions).values({
      crawlerId,
      roomId: entranceRoom.id,
      enteredAt: new Date()
    });

    return { success: true, newRoom: entranceRoom };
  }
}

export const storage = new DatabaseStorage();
