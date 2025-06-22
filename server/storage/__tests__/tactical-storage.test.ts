
/**
 * File: tactical-storage.test.ts
 * Responsibility: Unit tests for TacticalStorage tactical positioning system
 * Notes: Tests tactical data generation, mob integration, and position management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TacticalStorage } from '../tactical-storage';
import { db } from '../../db';
import { redisService } from '../../lib/redis-service';

// Mock the database and redis service
jest.mock('../../db');
jest.mock('../../lib/redis-service');

const mockDb = db as jest.Mocked<typeof db>;
const mockRedisService = redisService as jest.Mocked<typeof redisService>;

describe('TacticalStorage', () => {
  let tacticalStorage: TacticalStorage;
  let mockCrawlerStorage: any;
  let mockExplorationStorage: any;
  let mockMobStorage: any;

  beforeEach(() => {
    tacticalStorage = new TacticalStorage();
    
    // Mock storage dependencies
    mockCrawlerStorage = {
      getCrawler: jest.fn()
    };
    
    mockExplorationStorage = {
      getCrawlerCurrentRoom: jest.fn()
    };
    
    mockMobStorage = {
      getRoomMobs: jest.fn(),
      spawnMobsForRoom: jest.fn()
    };

    tacticalStorage.setCrawlerStorage(mockCrawlerStorage);
    tacticalStorage.setExplorationStorage(mockExplorationStorage);
    tacticalStorage.setMobStorage(mockMobStorage);

    jest.clearAllMocks();
  });

  describe('getTacticalPositions', () => {
    it('should return cached positions when available', async () => {
      const mockPositions = [
        {
          type: 'loot' as const,
          name: 'Treasure Chest',
          data: { value: 100 },
          position: { x: 50, y: 50 }
        }
      ];

      mockRedisService.getTacticalPositions.mockResolvedValue(mockPositions);

      const result = await tacticalStorage.getTacticalPositions(1);

      expect(result).toEqual(mockPositions);
      expect(mockRedisService.getTacticalPositions).toHaveBeenCalledWith(1);
    });

    it('should fetch from database when cache miss and include mobs from mob storage', async () => {
      const mockDbPositions = [
        {
          entityType: 'loot',
          entityData: { name: 'Chest' },
          positionX: '25.5',
          positionY: '75.0'
        }
      ];

      const mockRoomMobs = [
        {
          mob: {
            id: 1,
            displayName: 'Goblin',
            isAlive: true,
            isActive: true,
            currentHealth: 30,
            maxHealth: 30,
            positionX: '10.0',
            positionY: '15.0',
            rarity: 'common'
          },
          mobType: {
            attack: 5,
            defense: 2,
            speed: 3,
            creditsReward: 10,
            experienceReward: 15
          }
        }
      ];

      mockRedisService.getTacticalPositions.mockResolvedValue(null);
      mockMobStorage.getRoomMobs.mockResolvedValue(mockRoomMobs);

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockDbPositions)
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      const result = await tacticalStorage.getTacticalPositions(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'loot',
        name: 'Chest',
        data: { name: 'Chest' },
        position: { x: 25.5, y: 75.0 }
      });
      expect(result[1]).toEqual({
        type: 'mob',
        name: 'Goblin',
        data: {
          id: 1,
          hp: 30,
          maxHp: 30,
          attack: 5,
          defense: 2,
          speed: 3,
          creditsReward: 10,
          experienceReward: 15,
          rarity: 'common'
        },
        position: { x: 10.0, y: 15.0 }
      });
      expect(mockRedisService.setTacticalPositions).toHaveBeenCalled();
    });

    it('should handle entities with missing names', async () => {
      const mockDbPositions = [
        {
          entityType: 'loot',
          entityData: {},
          positionX: '10',
          positionY: '20'
        }
      ];

      mockRedisService.getTacticalPositions.mockResolvedValue(null);

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockDbPositions)
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      // Mock mob storage to return no mobs
      mockMobStorage.getRoomMobs.mockResolvedValue([]);

      const result = await tacticalStorage.getTacticalPositions(1);

      expect(result[0].name).toBe('Unknown');
      expect(result[0].type).toBe('loot');
    });
  });

  describe('saveTacticalPositions', () => {
    it('should deactivate existing positions and insert new ones', async () => {
      const entities = [
        {
          type: 'loot' as const,
          name: 'Gold Coins',
          data: { value: 50 },
          position: { x: 30, y: 40 }
        }
      ];

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };

      mockDb.update.mockReturnValue(mockUpdate as any);
      mockDb.insert.mockReturnValue(mockInsert as any);

      await tacticalStorage.saveTacticalPositions(1, entities);

      expect(mockUpdate.set).toHaveBeenCalledWith({
        isActive: false,
        updatedAt: expect.any(Date)
      });

      expect(mockInsert.values).toHaveBeenCalledWith([{
        roomId: 1,
        entityType: 'loot',
        entityData: { value: 50 },
        positionX: '30',
        positionY: '40',
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      }]);
    });

    it('should handle empty entities array', async () => {
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      mockDb.update.mockReturnValue(mockUpdate as any);

      await tacticalStorage.saveTacticalPositions(1, []);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('generateAndSaveTacticalData', () => {
    it('should generate loot for treasure rooms', async () => {
      const roomData = {
        type: 'treasure',
        hasLoot: true,
        isSafe: false
      };

      mockMobStorage.getRoomMobs.mockResolvedValue([]);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };

      mockDb.update.mockReturnValue(mockUpdate as any);
      mockDb.insert.mockReturnValue(mockInsert as any);

      const result = await tacticalStorage.generateAndSaveTacticalData(1, roomData);

      const lootEntities = result.filter(e => e.type === 'loot');
      expect(lootEntities).toHaveLength(3); // Treasure rooms get 3 loot items
      expect(lootEntities[0].name).toBe('Treasure Chest');
      expect(lootEntities[1].name).toBe('Golden Coins');
      expect(lootEntities[2].name).toBe('Precious Gems');
    });

    it('should generate NPCs for safe rooms', async () => {
      const roomData = {
        type: 'safe',
        isSafe: true,
        hasLoot: false
      };

      mockMobStorage.getRoomMobs.mockResolvedValue([]);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };

      mockDb.update.mockReturnValue(mockUpdate as any);
      mockDb.insert.mockReturnValue(mockInsert as any);

      const result = await tacticalStorage.generateAndSaveTacticalData(1, roomData);

      const npcEntities = result.filter(e => e.type === 'npc');
      expect(npcEntities).toHaveLength(1);
      expect(npcEntities[0].name).toBe('Sanctuary Keeper');
      expect(npcEntities[0].data.services).toContain('rest');
    });

    it('should integrate mob data from mob storage', async () => {
      const roomData = {
        type: 'normal',
        isSafe: false,
        hasLoot: false
      };

      const mockMobs = [
        {
          mob: {
            id: 1,
            displayName: 'Test Goblin',
            currentHealth: 50,
            maxHealth: 50,
            positionX: '60',
            positionY: '70',
            isAlive: true,
            isActive: true,
            rarity: 'common'
          },
          mobType: {
            attack: 10,
            defense: 5,
            speed: 8,
            creditsReward: 25,
            experienceReward: 15
          }
        }
      ];

      mockMobStorage.getRoomMobs.mockResolvedValue(mockMobs);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };

      mockDb.update.mockReturnValue(mockUpdate as any);
      mockDb.insert.mockReturnValue(mockInsert as any);

      const result = await tacticalStorage.generateAndSaveTacticalData(1, roomData);

      const mobEntities = result.filter(e => e.type === 'mob');
      expect(mobEntities).toHaveLength(1);
      expect(mobEntities[0].name).toBe('Test Goblin');
      expect(mobEntities[0].data.id).toBe(1);
      expect(mobEntities[0].data.hp).toBe(50);
      expect(mobEntities[0].position).toEqual({ x: 60, y: 70 });
    });

    it('should skip dead or inactive mobs', async () => {
      const roomData = {
        type: 'normal',
        isSafe: false,
        hasLoot: false
      };

      const mockMobs = [
        {
          mob: {
            id: 1,
            displayName: 'Dead Goblin',
            isAlive: false,
            isActive: true
          }
        },
        {
          mob: {
            id: 2,
            displayName: 'Inactive Goblin',
            isAlive: true,
            isActive: false
          }
        }
      ];

      mockMobStorage.getRoomMobs.mockResolvedValue(mockMobs);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };

      mockDb.update.mockReturnValue(mockUpdate as any);
      mockDb.insert.mockReturnValue(mockInsert as any);

      const result = await tacticalStorage.generateAndSaveTacticalData(1, roomData);

      const mobEntities = result.filter(e => e.type === 'mob');
      expect(mobEntities).toHaveLength(0);
    });

    it('should force regenerate when requested', async () => {
      const roomData = {
        type: 'normal',
        isSafe: false,
        hasLoot: true
      };

      const mockDelete = {
        where: jest.fn().mockResolvedValue([])
      };

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };

      mockMobStorage.getRoomMobs.mockResolvedValue([]);
      mockDb.delete.mockReturnValue(mockDelete as any);
      mockDb.update.mockReturnValue(mockUpdate as any);
      mockDb.insert.mockReturnValue(mockInsert as any);

      await tacticalStorage.generateAndSaveTacticalData(1, roomData, true);

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should spawn mobs when none exist in non-safe rooms', async () => {
      const roomData = {
        type: 'normal',
        isSafe: false,
        hasLoot: false
      };

      mockMobStorage.getRoomMobs
        .mockResolvedValueOnce([]) // Initial call returns no mobs
        .mockResolvedValueOnce([{  // After spawning
          mob: {
            id: 1,
            displayName: 'Spawned Goblin',
            currentHealth: 30,
            maxHealth: 30,
            positionX: '45',
            positionY: '55',
            isAlive: true,
            isActive: true,
            rarity: 'common'
          },
          mobType: { attack: 8, defense: 3, speed: 6, creditsReward: 20, experienceReward: 10 }
        }]);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };

      mockDb.update.mockReturnValue(mockUpdate as any);
      mockDb.insert.mockReturnValue(mockInsert as any);

      const result = await tacticalStorage.generateAndSaveTacticalData(1, roomData);

      expect(mockMobStorage.spawnMobsForRoom).toHaveBeenCalledWith(1, roomData);
      
      const mobEntities = result.filter(e => e.type === 'mob');
      expect(mobEntities).toHaveLength(1);
      expect(mobEntities[0].name).toBe('Spawned Goblin');
    });
  });

  describe('getTacticalEntities', () => {
    it('should return tactical entities for crawler current room', async () => {
      const crawler = { id: 1, name: 'Test Crawler' };
      const currentRoom = { id: 5, name: 'Test Room' };
      const entities = [
        {
          type: 'loot' as const,
          name: 'Gold',
          data: {},
          position: { x: 25, y: 25 }
        }
      ];

      mockCrawlerStorage.getCrawler.mockResolvedValue(crawler);
      mockExplorationStorage.getCrawlerCurrentRoom.mockResolvedValue(currentRoom);
      mockRedisService.getTacticalPositions.mockResolvedValue(entities);

      const result = await tacticalStorage.getTacticalEntities(1);

      expect(result).toEqual(entities);
      expect(mockCrawlerStorage.getCrawler).toHaveBeenCalledWith(1);
      expect(mockExplorationStorage.getCrawlerCurrentRoom).toHaveBeenCalledWith(1);
    });

    it('should return empty array when crawler not found', async () => {
      mockCrawlerStorage.getCrawler.mockResolvedValue(null);

      const result = await tacticalStorage.getTacticalEntities(1);

      expect(result).toEqual([]);
    });

    it('should return empty array when no current room', async () => {
      const crawler = { id: 1, name: 'Test Crawler' };

      mockCrawlerStorage.getCrawler.mockResolvedValue(crawler);
      mockExplorationStorage.getCrawlerCurrentRoom.mockResolvedValue(null);

      const result = await tacticalStorage.getTacticalEntities(1);

      expect(result).toEqual([]);
    });

    it('should handle invalid crawler ID', async () => {
      const result = await tacticalStorage.getTacticalEntities('invalid');

      expect(result).toEqual([]);
    });

    it('should handle storage dependency errors', async () => {
      const result = await tacticalStorage.getTacticalEntities(1);

      expect(result).toEqual([]);
    });
  });

  describe('utility methods', () => {
    it('should generate random empty cells', () => {
      const excludeCells = new Set(['5,5', '10,10']);
      
      const cell = (tacticalStorage as any).getRandomEmptyCell(excludeCells);
      
      expect(cell).toHaveProperty('gridX');
      expect(cell).toHaveProperty('gridY');
      expect(cell.gridX).toBeGreaterThanOrEqual(0);
      expect(cell.gridX).toBeLessThan(15);
      expect(cell.gridY).toBeGreaterThanOrEqual(0);
      expect(cell.gridY).toBeLessThan(15);
      
      const cellKey = `${cell.gridX},${cell.gridY}`;
      expect(excludeCells.has(cellKey)).toBe(false);
    });

    it('should convert grid coordinates to percentages', () => {
      const result = (tacticalStorage as any).gridToPercentage(7, 3);
      
      expect(result.x).toBeCloseTo(50, 1); // 7.5/15 * 100 = 50%
      expect(result.y).toBeCloseTo(23.33, 1); // 3.5/15 * 100 = 23.33%
    });

    it('should fall back to center when all cells occupied', () => {
      const excludeCells = new Set();
      
      // Fill all possible cells
      for (let x = 0; x < 15; x++) {
        for (let y = 0; y < 15; y++) {
          excludeCells.add(`${x},${y}`);
        }
      }
      
      const cell = (tacticalStorage as any).getRandomEmptyCell(excludeCells);
      
      expect(cell).toEqual({ gridX: 7, gridY: 7 });
    });
  });
});
