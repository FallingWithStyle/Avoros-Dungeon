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

  // Placeholder methods for other operations that would be implemented in their respective modules
  async getCurrentSeason() { throw new Error("Not implemented"); }
  async canCreatePrimaryCrawler() { throw new Error("Not implemented"); }
  async getAvailableSecondarySponsorships() { throw new Error("Not implemented"); }
  async resetUserPrimarySponsorshipForNewSeason() { throw new Error("Not implemented"); }
  async getEquipment() { throw new Error("Not implemented"); }
  async getEquipmentById() { throw new Error("Not implemented"); }
  async getCrawlerEquipment() { throw new Error("Not implemented"); }
  async createEncounter() { throw new Error("Not implemented"); }
  async getActiveEncounter() { throw new Error("Not implemented"); }
  async updateEncounter() { throw new Error("Not implemented"); }
  async exploreFloor() { throw new Error("Not implemented"); }
  async applyCompetencyBonus() { throw new Error("Not implemented"); }
  async getFloor() { throw new Error("Not implemented"); }
  async getEnemiesForFloor() { throw new Error("Not implemented"); }
  async createActivity() { throw new Error("Not implemented"); }
  async getRecentActivities() { throw new Error("Not implemented"); }
  async createChatMessage() { throw new Error("Not implemented"); }
  async getRecentChatMessages() { throw new Error("Not implemented"); }
  async getTopCrawlers() { throw new Error("Not implemented"); }
  async getMarketplaceListings() { throw new Error("Not implemented"); }
  async processEncounterChoice() { throw new Error("Not implemented"); }
  async resetUserCrawlers() { throw new Error("Not implemented"); }
  async resetCrawlerToEntrance() { throw new Error("Not implemented"); }
  async applyEffect() { throw new Error("Not implemented"); }
  async handleStaircaseMovement() { throw new Error("Not implemented"); }
}

export const storage = new ModularStorage();