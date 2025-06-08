import { BaseStorage } from "./base-storage";
import { CrawlerStorage } from "./crawler-storage";
import { UserStorage } from "./user-storage";
import { ExplorationStorage } from "./exploration-storage";
import { CorporationStorage } from "./corporation-storage";
import { ContentStorage } from "./content-storage";
import { TacticalStorage } from "./tactical-storage";
import { redisService } from "../lib/redis-service";
import {
  type UserAccount,
  type Crawler,
  type CrawlerWithDetails,
  type Corporation,
  type Activity,
  type Room,
  type ExploredRoom,
  type Encounter,
  type InsertActivity,
  type InsertCrawler,
  users,
  crawlers,
  corporations,
  activities,
  rooms,
  exploredRooms,
  encounters,
  classes,
  spells,
  effects,
  equipment,
  type Class,
  type Equipment,
  type Effect,
  type Spell,
  type RoomConnection,
  roomConnections,
} from "@shared/schema";
import { eq, desc, sql, and, or, not, inArray } from "drizzle-orm";
import { db } from "../db";
import { aliasedTable } from "drizzle-orm/pg-core";

// Define the IStorage interface here to avoid circular imports
export interface IStorage {
  // Content operations
  getRandomCompetencies(): Promise<any>;
  getRandomPreDungeonJob(): Promise<any>;
  getStartingEquipment(background: string): Promise<any>;

  // User operations
  getUser(id: string): Promise<any>;
  upsertUser(user: any): Promise<any>;
  updateUserCredits(userId: string, amount: number): Promise<any>;
  updateUserActiveCrawler(userId: string, crawlerId: number): Promise<any>;

  // Crawler operations
  createCrawler(crawlerData: any): Promise<any>;
  getCrawlersBySponssor(sponsorId: string): Promise<any>;
  getCrawler(id: number): Promise<any>;
  updateCrawler(id: number, updates: any): Promise<any>;
  getCrawlerClasses(): Promise<any>;
  regenerateEnergy(crawlerId: number): Promise<any>;
  generateCrawlerCandidates(count?: number): Promise<any>;

  // Exploration operations
  createRoom(floorId: number, x: number, y: number, type: string, name: string, description: string): Promise<any>;
  getRoomsForFloor(floorId: number): Promise<any>;
  getRoom(roomId: number): Promise<any>;
  createRoomConnection(fromRoomId: number, toRoomId: number, direction: string): Promise<any>;
  getAvailableDirections(roomId: number): Promise<any>;
  moveToRoom(crawlerId: number, direction: string, debugEnergyDisabled?: boolean): Promise<any>;
  getCrawlerCurrentRoom(crawlerId: number): Promise<any>;
  getPlayersInRoom(roomId: number): Promise<any>;
  getFactions(): Promise<any>;
  getExploredRooms(crawlerId: number): Promise<any>;
  getScannedRooms(crawlerId: number, scanRange: number): Promise<any>;
  getFloorBounds(floorId: number): Promise<any>;

  // Season and sponsorship operations
  getCurrentSeason(): Promise<any>;
  canCreatePrimaryCrawler(userId: string): Promise<any>;
  getAvailableSecondarySponsorships(): Promise<any>;
  resetUserPrimarySponsorshipForNewSeason(userId: string, seasonNumber: number): Promise<any>;

  // Equipment operations
  getEquipment(): Promise<any>;
  getEquipmentById(id: number): Promise<any>;
  getCrawlerEquipment(crawlerId: number): Promise<any>;

  // Encounter operations
  createEncounter(data: any): Promise<any>;
  getActiveEncounter(crawlerId: number): Promise<any>;
  updateEncounter(id: number, updates: any): Promise<any>;
  exploreFloor(crawlerId: number): Promise<any>;
  applyCompetencyBonus(crawlerId: number, competency: string): Promise<any>;
  getFloor(floorNumber: number): Promise<any>;
  getEnemiesForFloor(floorNumber: number): Promise<any>;

  // Activity operations
  createActivity(data: any): Promise<any>;
  getRecentActivities(limit?: number): Promise<any>;

  // Chat operations
  createChatMessage(data: any): Promise<any>;
  getRecentChatMessages(limit?: number): Promise<any>;

  // Leaderboard operations
  getTopCrawlers(limit?: number): Promise<any>;

  // Marketplace operations
  getMarketplaceListings(): Promise<any>;

  // Combat operations
  processEncounterChoice(encounterId: number, choiceId: string): Promise<any>;

  // Debug operations
  resetUserCrawlers(userId: string): Promise<any>;
  resetCrawlerToEntrance(crawlerId: number): Promise<any>;
  applyEffect(crawlerId: number, effect: any): Promise<any>;
  handleStaircaseMovement(crawlerId: number, direction: string): Promise<any>;

  // Tactical positions methods
  getTacticalPositions(roomId: number): Promise<any>;
  generateAndSaveTacticalData(roomId: number, roomData: any): Promise<any>;
}

// Main storage orchestrator that combines all storage modules
export class ModularStorage implements IStorage {
  private _crawlerStorage: CrawlerStorage;
  private _userStorage: UserStorage;
  private _explorationStorage: ExplorationStorage;
  private _corporationStorage: CorporationStorage;
  private _contentStorage: ContentStorage;
  private _tacticalStorage: TacticalStorage;

  private constructor() {
    this._crawlerStorage = new CrawlerStorage();
    this._userStorage = new UserStorage();
    this._explorationStorage = new ExplorationStorage();
    this._corporationStorage = new CorporationStorage();
    this._contentStorage = new ContentStorage();
    this._tacticalStorage = new TacticalStorage();
  }

  static async create(): Promise<ModularStorage> {
    const instance = new ModularStorage();

    // Cross-references will be set up in the factory method

    // Import and inject Redis service
    const { redisService } = await import("../lib/redis-service.js");

    // Set up cross-references between storage modules
    instance._userStorage.setCrawlerStorage(instance._crawlerStorage);
    instance._userStorage.setRedisService(redisService);
    instance._crawlerStorage.setUserStorage(instance._userStorage);
    instance._crawlerStorage.setExplorationStorage(instance._explorationStorage);
    instance._crawlerStorage.setRedisService(redisService);
    instance._explorationStorage.setCrawlerStorage(instance._crawlerStorage);
    instance._explorationStorage.setRedisService(redisService);
    // Set up cross-dependencies
    instance._tacticalStorage.setCrawlerStorage(instance._crawlerStorage);
    instance._tacticalStorage.setExplorationStorage(instance._explorationStorage);
    instance._explorationStorage.setCrawlerStorage(instance._crawlerStorage);
    instance._tacticalStorage.setRedisService(redisService);
    instance._contentStorage.setRedisService(redisService);

    return instance;
  }

  // Expose content storage publicly
  get content() {
    return this._contentStorage;
  }

  // Content operations
  async getRandomCompetencies() {
    return this._contentStorage.getRandomCompetencies();
  }

  async getRandomPreDungeonJob() {
    return this._contentStorage.getRandomPreDungeonJob();
  }

  async getStartingEquipment(background: string) {
    return this._contentStorage.getStartingEquipment(background);
  }

  // User operations
  async getUser(id: string) {
    return this._userStorage.getUser(id);
  }

  async upsertUser(user: any) {
    return this._userStorage.upsertUser(user);
  }

  async updateUserCredits(userId: string, amount: number) {
    return this._userStorage.updateUserCredits(userId, amount);
  }

  async updateUserActiveCrawler(userId: string, crawlerId: number) {
    return this._userStorage.updateUserActiveCrawler(userId, crawlerId);
  }

  // Crawler operations
  async createCrawler(crawlerData: any) {
    return this._crawlerStorage.createCrawler(crawlerData);
  }

  async getCrawlersBySponssor(sponsorId: string) {
    return this._crawlerStorage.getCrawlersBySponssor(sponsorId);
  }

  async getCrawler(id: number) {
    return this._crawlerStorage.getCrawler(id);
  }

  async updateCrawler(id: number, updates: any) {
    return this._crawlerStorage.updateCrawler(id, updates);
  }

  async getCrawlerClasses() {
    return this._crawlerStorage.getCrawlerClasses();
  }

  async regenerateEnergy(crawlerId: number) {
    return this._crawlerStorage.regenerateEnergy(crawlerId);
  }

  async generateCrawlerCandidates(count?: number) {
    return this._crawlerStorage.generateCrawlerCandidates(count);
  }

  // Exploration operations
  async createRoom(floorId: number, x: number, y: number, type: string, name: string, description: string) {
    return this._explorationStorage.createRoom(floorId, x, y, type, name, description);
  }

  async getRoomsForFloor(floorId: number) {
    return this._explorationStorage.getRoomsForFloor(floorId);
  }

  async getRoom(roomId: number) {
    return this._explorationStorage.getRoom(roomId);
  }

  async createRoomConnection(fromRoomId: number, toRoomId: number, direction: string) {
    return this._explorationStorage.createRoomConnection(fromRoomId, toRoomId, direction);
  }

  async getAvailableDirections(roomId: number) {
    return this._explorationStorage.getAvailableDirections(roomId);
  }

  async moveToRoom(crawlerId: number, direction: string, debugEnergyDisabled?: boolean) {
    // This requires coordination between crawler and exploration storage
    // We'll need to handle energy deduction here
    const crawler = await this._crawlerStorage.getCrawler(crawlerId);
    if (!crawler) {
      return { success: false, error: "Crawler not found" };
    }

    const result = await this._explorationStorage.moveToRoom(crawlerId, direction, debugEnergyDisabled);

    if (result.success && !debugEnergyDisabled) {
      // Deduct energy - this is where modules coordinate
      const energyCost = 10; // Could be calculated based on room type, etc.
      await this._crawlerStorage.updateCrawler(crawlerId, {
        energy: Math.max(0, crawler.energy - energyCost),
      });
    }

    return result;
  }

  async getCrawlerCurrentRoom(crawlerId: number) {
    return this._explorationStorage.getCrawlerCurrentRoom(crawlerId);
  }

  async getPlayersInRoom(roomId: number) {
    return this._explorationStorage.getPlayersInRoom(roomId);
  }

  async getFactions() {
    return this._explorationStorage.getFactions();
  }

  async getExploredRooms(crawlerId: number) {
    return this._explorationStorage.getExploredRooms(crawlerId);
  }

  async getScannedRooms(crawlerId: number, scanRange: number) {
    return this._explorationStorage.getScannedRooms(crawlerId, scanRange);
  }

  async getFloorBounds(floorId: number) {
    return this._explorationStorage.getFloorBounds(floorId);
  }

  async ensureCrawlerHasPosition(crawlerId: number) {
    return this._explorationStorage.ensureCrawlerHasPosition(crawlerId);
  }

  // Season and sponsorship operations
  async getCurrentSeason() {
    // For now, return a default season - this should be implemented properly later
    return { id: 1, seasonNumber: 1, isActive: true };
  }

  async canCreatePrimaryCrawler(userId: string) {
    // For now, allow crawler creation - this should check sponsorship limits later
    return true;
  }

  async getAvailableSecondarySponsorships() {
    // For now, return empty array - this should be implemented later
    return [];
  }

  async resetUserPrimarySponsorshipForNewSeason(userId: string, seasonNumber: number) {
    // For now, do nothing - this should be implemented later
    return;
  }
  // Equipment operations - delegate to appropriate storage modules
  async getEquipment() { return []; }
  async getEquipmentById(id: number) { return null; }
  async getCrawlerEquipment(crawlerId: number) { return []; }

  // Encounter operations - delegate to appropriate storage modules
  async createEncounter(data: any) { return null; }
  async getActiveEncounter(crawlerId: number) { return null; }
  async updateEncounter(id: number, updates: any) { return null; }
  async exploreFloor(crawlerId: number) { return null; }
  async applyCompetencyBonus(crawlerId: number, competency: string) { return; }
  async getFloor(floorNumber: number) { return null; }
  async getEnemiesForFloor(floorNumber: number) { return []; }

  // Activity operations - delegate to appropriate storage modules  
  async createActivity(data: any) {
    // Simple implementation for now
    const { db } = await import("../db");
    const { activities } = await import("@shared/schema");
    const [activity] = await db.insert(activities).values(data).returning();
    return activity;
  }
  async getRecentActivities(limit: number = 10) { return []; }

  // Chat operations - delegate to appropriate storage modules
  async createChatMessage(data: any) { return null; }
  async getRecentChatMessages(limit: number = 50) { return []; }

  // Leaderboard operations - delegate to appropriate storage modules
  async getTopCrawlers(limit: number = 10) { return []; }

  // Marketplace operations - delegate to appropriate storage modules
  async getMarketplaceListings() { return []; }

  // Combat operations - delegate to appropriate storage modules
  async processEncounterChoice(encounterId: number, choiceId: string) { return null; }

  // Debug operations - delegate to appropriate storage modules
  async resetUserCrawlers(userId: string) { return; }
  async resetCrawlerToEntrance(crawlerId: number) { return; }
  async applyEffect(crawlerId: number, effect: any) { return; }
  async handleStaircaseMovement(crawlerId: number, direction: string) { return null; }

  // Tactical positions methods
  async getTacticalPositions(roomId: number) {
    return this._tacticalStorage.getTacticalPositions(roomId);
  }

  async generateAndSaveTacticalData(roomId: number, roomData: any) {
    return this._tacticalStorage.generateAndSaveTacticalData(roomId, roomData);
  }

  async getTacticalEntities(crawlerId: string | number) {
    return this._tacticalStorage.getTacticalEntities(crawlerId);
  }

  // Expose tactical storage for direct access
  get tacticalStorage() {
    return this._tacticalStorage;
  }
}

// Create and export a singleton instance
export const storage = await ModularStorage.create();

export { TacticalStorage } from './tactical-storage';
export { ContentStorage } from './content-storage';
export { MobStorage } from './mob-storage';
export { CorporationStorage } from './corporation-storage';