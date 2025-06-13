
/**
 * File: base-storage.test.ts
 * Responsibility: Unit tests for BaseStorage utility methods
 * Notes: Tests shared functionality like array shuffling and weighted random selection
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { BaseStorage } from '../base-storage';

// Create a test implementation of BaseStorage
class TestBaseStorage extends BaseStorage {
  // Expose protected methods for testing
  public testShuffleArray<T>(array: T[]): T[] {
    return this.shuffleArray(array);
  }

  public testWeightedRandom(items: string[], weights: number[]): string {
    return this.weightedRandom(items, weights);
  }
}

describe('BaseStorage', () => {
  let baseStorage: TestBaseStorage;

  beforeEach(() => {
    baseStorage = new TestBaseStorage();
  });

  describe('shuffleArray', () => {
    it('should return an array of the same length', () => {
      const input = [1, 2, 3, 4, 5];
      const result = baseStorage.testShuffleArray(input);
      
      expect(result).toHaveLength(input.length);
    });

    it('should contain all original elements', () => {
      const input = ['a', 'b', 'c', 'd'];
      const result = baseStorage.testShuffleArray(input);
      
      expect(result.sort()).toEqual(input.sort());
    });

    it('should not modify the original array', () => {
      const input = [1, 2, 3];
      const original = [...input];
      baseStorage.testShuffleArray(input);
      
      expect(input).toEqual(original);
    });

    it('should handle empty arrays', () => {
      const result = baseStorage.testShuffleArray([]);
      expect(result).toEqual([]);
    });

    it('should handle single element arrays', () => {
      const input = ['single'];
      const result = baseStorage.testShuffleArray(input);
      
      expect(result).toEqual(['single']);
    });
  });

  describe('weightedRandom', () => {
    it('should return an item from the provided list', () => {
      const items = ['apple', 'banana', 'cherry'];
      const weights = [1, 1, 1];
      const result = baseStorage.testWeightedRandom(items, weights);
      
      expect(items).toContain(result);
    });

    it('should respect weights - higher weight more likely', () => {
      const items = ['rare', 'common'];
      const weights = [1, 100]; // common is 100x more likely
      const results: string[] = [];
      
      // Run multiple times to test probability
      for (let i = 0; i < 100; i++) {
        results.push(baseStorage.testWeightedRandom(items, weights));
      }
      
      const commonCount = results.filter(r => r === 'common').length;
      const rareCount = results.filter(r => r === 'rare').length;
      
      // Common should appear much more frequently
      expect(commonCount).toBeGreaterThan(rareCount);
    });

    it('should handle single item', () => {
      const items = ['only'];
      const weights = [1];
      const result = baseStorage.testWeightedRandom(items, weights);
      
      expect(result).toBe('only');
    });

    it('should handle zero weights by falling back to first item', () => {
      const items = ['first', 'second'];
      const weights = [0, 0];
      const result = baseStorage.testWeightedRandom(items, weights);
      
      expect(result).toBe('first');
    });

    it('should handle unequal array lengths gracefully', () => {
      const items = ['a', 'b', 'c'];
      const weights = [1, 2]; // Missing weight for 'c'
      
      expect(() => {
        baseStorage.testWeightedRandom(items, weights);
      }).not.toThrow();
    });
  });

  describe('dependency injection', () => {
    it('should allow setting storage dependencies', () => {
      const mockUserStorage = { mock: 'userStorage' };
      const mockCrawlerStorage = { mock: 'crawlerStorage' };
      
      baseStorage.setUserStorage(mockUserStorage);
      baseStorage.setCrawlerStorage(mockCrawlerStorage);
      
      expect((baseStorage as any).userStorage).toBe(mockUserStorage);
      expect((baseStorage as any).crawlerStorage).toBe(mockCrawlerStorage);
    });

    it('should allow setting redis service', () => {
      const mockRedisService = { mock: 'redisService' };
      
      baseStorage.setRedisService(mockRedisService);
      
      expect((baseStorage as any).redisService).toBe(mockRedisService);
    });
  });
});
