import { UserStorage } from "./user-storage";
import { CrawlerStorage } from "./crawler-storage";
import { ExplorationStorage } from "./exploration-storage";
import { ContentStorage } from "./content-storage";
import type { IStorage } from "../storage";
import { CorporationStorage } from "./corporation-storage";

// Main storage orchestrator that combines all storage modules
export class ModularStorage implements IStorage {
  private userStorage = new UserStorage();
  private crawlerStorage = new CrawlerStorage();
  private explorationStorage = new ExplorationStorage();
  private contentStorage = new ContentStorage();
  private corporationStorage = new CorporationStorage(); // Added corporation storage

  // Expose content storage publicly
  get content() {
    return this.contentStorage;
  }

  // Content operations
  async getRandomCompetencies() {
    return this.contentStorage.getRandomCompetencies();
  }

  async getRandomPreDungeonJob() {
    return this.contentStorage.getRandomPreDungeonJob();
  }

  async getStartingEquipment(background: string) {
    return this.contentStorage.getStartingEquipment(background);
  }

  // User operations
  async getUser(id: string) {
    return this.userStorage.getUser(id);
  }

  async upsertUser(user: any) {
    return this.userStorage.upsertUser(user);
  }

  async updateUserCredits(userId: string, amount: number) {
    return this.userStorage.updateUserCredits(userId, amount);
  }

  async updateUserActiveCrawler(userId: string, crawlerId: number) {
    return this.userStorage.updateUserActiveCrawler(userId, crawlerId);
  }

  // Crawler operations
  async createCrawler(crawlerData: any) {
    return this.crawlerStorage.createCrawler(crawlerData);
  }

  async getCrawlersBySponssor(sponsorId: string) {
    return this.crawlerStorage.getCrawlersBySponssor(sponsorId);
  }

  async getCrawler(id: number) {
    return this.crawlerStorage.getCrawler(id);
  }

  async updateCrawler(id: number, updates: any) {
    return this.crawlerStorage.updateCrawler(id, updates);
  }

  async getCrawlerClasses() {
    return this.crawlerStorage.getCrawlerClasses();
  }

  async regenerateEnergy(crawlerId: number) {
    return this.crawlerStorage.regenerateEnergy(crawlerId);
  }

  async generateCrawlerCandidates(count?: number) {
    return this.crawlerStorage.generateCrawlerCandidates(count);
  }

  // Exploration operations
  async createRoom(floorId: number, x: number, y: number, type: string, name: string, description: string) {
    return this.explorationStorage.createRoom(floorId, x, y, type, name, description);
  }

  async getRoomsForFloor(floorId: number) {
    return this.explorationStorage.getRoomsForFloor(floorId);
  }

  async getRoom(roomId: number) {
    return this.explorationStorage.getRoom(roomId);
  }

  async createRoomConnection(fromRoomId: number, toRoomId: number, direction: string) {
    return this.explorationStorage.createRoomConnection(fromRoomId, toRoomId, direction);
  }

  async getAvailableDirections(roomId: number) {
    return this.explorationStorage.getAvailableDirections(roomId);
  }

  async moveToRoom(crawlerId: number, direction: string, debugEnergyDisabled?: boolean) {
    // This requires coordination between crawler and exploration storage
    // We'll need to handle energy deduction here
    const crawler = await this.crawlerStorage.getCrawler(crawlerId);
    if (!crawler) {
      return { success: false, error: "Crawler not found" };
    }

    const result = await this.explorationStorage.moveToRoom(crawlerId, direction, debugEnergyDisabled);

    if (result.success && !debugEnergyDisabled) {
      // Deduct energy - this is where modules coordinate
      const energyCost = 10; // Could be calculated based on room type, etc.
      await this.crawlerStorage.updateCrawler(crawlerId, {
        energy: Math.max(0, crawler.energy - energyCost),
      });
    }

    return result;
  }

  async getCrawlerCurrentRoom(crawlerId: number) {
    return this.explorationStorage.getCrawlerCurrentRoom(crawlerId);
  }

  async getPlayersInRoom(roomId: number) {
    return this.explorationStorage.getPlayersInRoom(roomId);
  }

  async getFactions() {
    return this.explorationStorage.getFactions();
  }

  async getExploredRooms(crawlerId: number) {
    return this.explorationStorage.getExploredRooms(crawlerId);
  }

  async getFloorBounds(floorId: number) {
    return this.explorationStorage.getFloorBounds(floorId);
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
}

export const storage = new ModularStorage();