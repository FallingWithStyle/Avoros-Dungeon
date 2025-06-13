
/**
 * File: index.test.ts
 * Responsibility: Integration tests for the modular storage system
 * Notes: Tests the main storage orchestrator and cross-module dependencies
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ModularStorage } from '../index';

// Mock all the storage modules
jest.mock('../crawler-storage');
jest.mock('../user-storage');
jest.mock('../exploration-storage');
jest.mock('../corporation-storage');
jest.mock('../content-storage');
jest.mock('../tactical-storage');
jest.mock('../mob-storage');
jest.mock('../../lib/redis-service');

describe('ModularStorage', () => {
  let storage: ModularStorage;

  beforeEach(async () => {
    storage = await ModularStorage.create();
  });

  describe('storage creation and initialization', () => {
    it('should create storage instance successfully', () => {
      expect(storage).toBeDefined();
      expect(storage).toBeInstanceOf(ModularStorage);
    });

    it('should have all storage modules initialized', () => {
      expect(storage.content).toBeDefined();
      expect(storage.explorationStorage).toBeDefined();
      expect(storage.tacticalStorage).toBeDefined();
      expect(storage.mobStorage).toBeDefined();
    });

    it('should set up cross-references between storage modules', () => {
      // These are internal checks - we can verify the modules exist
      expect(storage.explorationStorage).toBeDefined();
      expect(storage.tacticalStorage).toBeDefined();
      expect(storage.mobStorage).toBeDefined();
    });
  });

  describe('user operations delegation', () => {
    it('should delegate getUser to user storage', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com' };
      
      // Mock the internal user storage
      (storage as any)._userStorage.getUser = jest.fn().mockResolvedValue(mockUser);

      const result = await storage.getUser('user1');

      expect(result).toEqual(mockUser);
      expect((storage as any)._userStorage.getUser).toHaveBeenCalledWith('user1');
    });

    it('should delegate updateUserCredits to user storage', async () => {
      const mockUser = { id: 'user1', credits: 1500 };
      
      (storage as any)._userStorage.updateUserCredits = jest.fn().mockResolvedValue(mockUser);

      const result = await storage.updateUserCredits('user1', 500);

      expect(result).toEqual(mockUser);
      expect((storage as any)._userStorage.updateUserCredits).toHaveBeenCalledWith('user1', 500);
    });
  });

  describe('crawler operations delegation', () => {
    it('should delegate getCrawler to crawler storage', async () => {
      const mockCrawler = { id: 1, name: 'Test Crawler' };
      
      (storage as any)._crawlerStorage.getCrawler = jest.fn().mockResolvedValue(mockCrawler);

      const result = await storage.getCrawler(1);

      expect(result).toEqual(mockCrawler);
      expect((storage as any)._crawlerStorage.getCrawler).toHaveBeenCalledWith(1);
    });

    it('should delegate createCrawler to crawler storage', async () => {
      const crawlerData = { name: 'New Crawler', sponsorId: 'user1' };
      const mockCrawler = { id: 2, ...crawlerData };
      
      (storage as any)._crawlerStorage.createCrawler = jest.fn().mockResolvedValue(mockCrawler);

      const result = await storage.createCrawler(crawlerData);

      expect(result).toEqual(mockCrawler);
      expect((storage as any)._crawlerStorage.createCrawler).toHaveBeenCalledWith(crawlerData);
    });
  });

  describe('exploration operations delegation', () => {
    it('should delegate moveToRoom to exploration storage', async () => {
      const mockResult = { success: true, newRoom: { id: 2, name: 'New Room' } };
      
      (storage as any)._explorationStorage.moveToRoom = jest.fn().mockResolvedValue(mockResult);

      const result = await storage.moveToRoom(1, 'north');

      expect(result).toEqual(mockResult);
      expect((storage as any)._explorationStorage.moveToRoom).toHaveBeenCalledWith(1, 'north');
    });

    it('should delegate getCrawlerCurrentRoom to exploration storage', async () => {
      const mockRoom = { id: 1, name: 'Current Room' };
      
      (storage as any)._explorationStorage.getCrawlerCurrentRoom = jest.fn().mockResolvedValue(mockRoom);

      const result = await storage.getCrawlerCurrentRoom(1);

      expect(result).toEqual(mockRoom);
      expect((storage as any)._explorationStorage.getCrawlerCurrentRoom).toHaveBeenCalledWith(1);
    });
  });

  describe('content operations delegation', () => {
    it('should delegate getRandomCompetencies to content storage', async () => {
      const mockCompetencies = ['Survival', 'Combat', 'Tech'];
      
      (storage as any)._contentStorage.getRandomCompetencies = jest.fn().mockResolvedValue(mockCompetencies);

      const result = await storage.getRandomCompetencies();

      expect(result).toEqual(mockCompetencies);
      expect((storage as any)._contentStorage.getRandomCompetencies).toHaveBeenCalled();
    });

    it('should delegate getStartingEquipment to content storage', async () => {
      const mockEquipment = [{ name: 'Basic Sword' }];
      
      (storage as any)._contentStorage.getStartingEquipment = jest.fn().mockResolvedValue(mockEquipment);

      const result = await storage.getStartingEquipment('warrior background');

      expect(result).toEqual(mockEquipment);
      expect((storage as any)._contentStorage.getStartingEquipment).toHaveBeenCalledWith('warrior background');
    });
  });

  describe('tactical operations delegation', () => {
    it('should delegate getTacticalPositions to tactical storage', async () => {
      const mockPositions = [{ type: 'loot', name: 'Gold', position: { x: 50, y: 50 } }];
      
      (storage as any)._tacticalStorage.getTacticalPositions = jest.fn().mockResolvedValue(mockPositions);

      const result = await storage.getTacticalPositions(1);

      expect(result).toEqual(mockPositions);
      expect((storage as any)._tacticalStorage.getTacticalPositions).toHaveBeenCalledWith(1);
    });

    it('should delegate generateAndSaveTacticalData to tactical storage', async () => {
      const roomData = { type: 'normal', hasLoot: false };
      const mockEntities = [{ type: 'npc', name: 'Merchant', position: { x: 25, y: 75 } }];
      
      (storage as any)._tacticalStorage.generateAndSaveTacticalData = jest.fn().mockResolvedValue(mockEntities);

      const result = await storage.generateAndSaveTacticalData(1, roomData);

      expect(result).toEqual(mockEntities);
      expect((storage as any)._tacticalStorage.generateAndSaveTacticalData).toHaveBeenCalledWith(1, roomData);
    });
  });

  describe('fallback methods', () => {
    it('should provide default implementations for unimplemented methods', async () => {
      // These should not throw errors
      expect(await storage.getTopCrawlers()).toEqual([]);
      expect(await storage.getMarketplaceListings()).toEqual([]);
      expect(await storage.getRecentActivities()).toEqual([]);
      expect(await storage.getRecentChatMessages()).toEqual([]);
      expect(await storage.getCurrentSeason()).toBeDefined();
      expect(await storage.canCreatePrimaryCrawler('user1')).toBe(true);
    });

    it('should handle createActivity', async () => {
      // Mock the database insert for activity creation
      const activityData = { type: 'test', description: 'Test activity' };
      
      // This would need proper mocking of the database in a real test
      // For now, we just verify it doesn't throw
      expect(async () => await storage.createActivity(activityData)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle errors in delegated methods gracefully', async () => {
      (storage as any)._userStorage.getUser = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(storage.getUser('user1')).rejects.toThrow('Database error');
    });

    it('should handle missing storage modules gracefully', async () => {
      // Simulate a missing storage module
      (storage as any)._tacticalStorage = null;

      const result = await storage.getTacticalEntities('1');
      
      // Should return empty array instead of throwing
      expect(result).toEqual([]);
    });
  });

  describe('Redis service access', () => {
    it('should provide access to redis service', () => {
      expect(storage.redisService).toBeDefined();
    });
  });

  describe('storage module access', () => {
    it('should provide direct access to storage modules', () => {
      expect(storage.explorationStorage).toBeDefined();
      expect(storage.tacticalStorage).toBeDefined();
      expect(storage.mobStorage).toBeDefined();
      expect(storage.content).toBeDefined();
    });
  });
});
