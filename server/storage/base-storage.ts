/**
 * File: base-storage.ts
 * Responsibility: Base storage class with common database operations and Redis integration
 * Notes: Provides shared functionality for all storage modules including caching and error handling
 */

export interface IBaseStorage {
  // Common database operations that all storage modules might need
}

// Base class with shared utilities
export abstract class BaseStorage {
  protected userStorage?: any;
  protected crawlerStorage?: any;
  protected explorationStorage?: any;
  protected corporationStorage?: any;
  protected redisService: any;

  constructor() {
    // Redis service will be injected via setRedisService method
    this.redisService = null;
  }

  setRedisService(redisService: any) {
    this.redisService = redisService;
  }

  // Dependency injection methods
  setUserStorage(storage: any) {
    this.userStorage = storage;
  }

  setCrawlerStorage(storage: any) {
    this.crawlerStorage = storage;
  }

  setExplorationStorage(storage: any) {
    this.explorationStorage = storage;
  }

  setCorporationStorage(storage: any) {
    this.corporationStorage = storage;
  }

  // Shared utility methods can go here
  protected shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  protected weightedRandom(items: string[], weights: number[]): string {
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
}