
/**
 * File: content-storage.test.ts
 * Responsibility: Unit tests for ContentStorage content generation and retrieval
 * Notes: Tests random content generation, caching, and contextual triggers
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ContentStorage } from '../content-storage';
import { db } from '../../db';
import { redisService } from '../../lib/redis-service';

// Mock the database and redis service
jest.mock('../../db');
jest.mock('../../lib/redis-service');

const mockDb = db as jest.Mocked<typeof db>;
const mockRedisService = redisService as jest.Mocked<typeof redisService>;

describe('ContentStorage', () => {
  let contentStorage: ContentStorage;

  beforeEach(() => {
    contentStorage = new ContentStorage();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getRandomCrawlerBackground', () => {
    it('should return cached backgrounds when available', async () => {
      const mockBackgrounds = [
        { story: 'A desperate soul', weight: 1 },
        { story: 'Another background', weight: 2 }
      ];
      
      mockRedisService.getContentData.mockResolvedValue(mockBackgrounds);
      
      const result = await contentStorage.getRandomCrawlerBackground('desperate');
      
      expect(mockRedisService.getContentData).toHaveBeenCalledWith('backgrounds:desperate');
      expect(['A desperate soul', 'Another background']).toContain(result);
    });

    it('should fetch from database when cache miss', async () => {
      mockRedisService.getContentData.mockResolvedValue(null);
      
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([
          { story: 'Database background', weight: 1 }
        ])
      };
      mockDb.select.mockReturnValue(mockSelect as any);
      
      const result = await contentStorage.getRandomCrawlerBackground('desperate');
      
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockRedisService.setContentData).toHaveBeenCalled();
      expect(result).toBe('Database background');
    });

    it('should return default background when no data available', async () => {
      mockRedisService.getContentData.mockResolvedValue(null);
      
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect as any);
      
      const result = await contentStorage.getRandomCrawlerBackground('desperate');
      
      expect(result).toBe('A person with a mysterious past seeking fortune in the depths.');
    });

    it('should respect weighted random selection', async () => {
      const mockBackgrounds = [
        { story: 'Rare background', weight: 1 },
        { story: 'Common background', weight: 100 }
      ];
      
      mockRedisService.getContentData.mockResolvedValue(mockBackgrounds);
      
      const results: string[] = [];
      for (let i = 0; i < 50; i++) {
        results.push(await contentStorage.getRandomCrawlerBackground('desperate'));
      }
      
      const commonCount = results.filter(r => r === 'Common background').length;
      const rareCount = results.filter(r => r === 'Rare background').length;
      
      expect(commonCount).toBeGreaterThan(rareCount);
    });
  });

  describe('getRandomPreDungeonJob', () => {
    it('should return a job title from database', async () => {
      const mockJobs = [
        { jobTitle: 'Office Worker', weight: 1 },
        { jobTitle: 'Scientist', weight: 2 }
      ];
      
      const mockSelect = {
        from: jest.fn().mockResolvedValue(mockJobs)
      };
      mockDb.select.mockReturnValue(mockSelect as any);
      
      const result = await contentStorage.getRandomPreDungeonJob();
      
      expect(['Office Worker', 'Scientist']).toContain(result);
    });

    it('should return default when no jobs available', async () => {
      const mockSelect = {
        from: jest.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect as any);
      
      const result = await contentStorage.getRandomPreDungeonJob();
      
      expect(result).toBe('Office Worker');
    });
  });

  describe('getRandomCompetencies', () => {
    it('should return requested number of competencies', async () => {
      const mockCompetencies = [
        { name: 'Survival' },
        { name: 'Combat' },
        { name: 'Negotiation' },
        { name: 'Technology' },
        { name: 'Medicine' }
      ];
      
      const mockSelect = {
        from: jest.fn().mockResolvedValue(mockCompetencies)
      };
      mockDb.select.mockReturnValue(mockSelect as any);
      
      const result = await contentStorage.getRandomCompetencies(3);
      
      expect(result).toHaveLength(3);
      expect(result.every(comp => mockCompetencies.some(mc => mc.name === comp))).toBe(true);
    });

    it('should return default competencies when database is empty', async () => {
      const mockSelect = {
        from: jest.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect as any);
      
      const result = await contentStorage.getRandomCompetencies(3);
      
      expect(result).toEqual(['Survival', 'Combat', 'Negotiation']);
    });

    it('should handle requesting more competencies than available', async () => {
      const mockCompetencies = [
        { name: 'Only' },
        { name: 'Two' }
      ];
      
      const mockSelect = {
        from: jest.fn().mockResolvedValue(mockCompetencies)
      };
      mockDb.select.mockReturnValue(mockSelect as any);
      
      const result = await contentStorage.getRandomCompetencies(5);
      
      expect(result).toHaveLength(2);
    });
  });

  describe('getStartingEquipment', () => {
    beforeEach(() => {
      // Mock database responses for different equipment categories
      mockDb.select.mockImplementation(() => {
        const mockSelect = {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockImplementation((condition: any) => {
            // This is a simplified mock - in reality you'd need to check the actual condition
            return Promise.resolve([
              { name: 'Mock Item', description: 'Test item', category: 'survival' }
            ]);
          })
        };
        return mockSelect as any;
      });
    });

    it('should return equipment based on background', async () => {
      const result = await contentStorage.getStartingEquipment('Former nurse. Medical background.');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include contextual equipment for medical backgrounds', async () => {
      // We'll need to verify that the contextual triggers are working
      // by checking the database calls
      await contentStorage.getStartingEquipment('Former nurse in a medical clinic.');
      
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('getContextualTriggers', () => {
    it('should identify medical triggers', () => {
      const triggers = (contentStorage as any).getContextualTriggers('Former nurse at medical clinic');
      expect(triggers).toContain('medical');
    });

    it('should identify research triggers', () => {
      const triggers = (contentStorage as any).getContextualTriggers('Lab researcher doing experiments');
      expect(triggers).toContain('research');
    });

    it('should identify security triggers', () => {
      const triggers = (contentStorage as any).getContextualTriggers('Former security guard dealing with criminals');
      expect(triggers).toContain('security');
    });

    it('should identify food triggers', () => {
      const triggers = (contentStorage as any).getContextualTriggers('Restaurant chef cooking food');
      expect(triggers).toContain('food');
    });

    it('should identify tech triggers', () => {
      const triggers = (contentStorage as any).getContextualTriggers('Tech programmer and hacker');
      expect(triggers).toContain('tech');
    });

    it('should identify education triggers', () => {
      const triggers = (contentStorage as any).getContextualTriggers('School teacher with students');
      expect(triggers).toContain('education');
    });

    it('should return empty array for non-matching backgrounds', () => {
      const triggers = (contentStorage as any).getContextualTriggers('Generic office worker');
      expect(triggers).toEqual([]);
    });

    it('should identify multiple triggers', () => {
      const triggers = (contentStorage as any).getContextualTriggers('Medical researcher in tech lab');
      expect(triggers).toContain('medical');
      expect(triggers).toContain('research');
      expect(triggers).toContain('tech');
    });
  });

  describe('getFloorTheme', () => {
    it('should return cached theme when available', async () => {
      const mockTheme = {
        name: 'Test Theme',
        description: 'Test Description',
        roomTypes: [{ name: 'Test Room', description: 'Test Room Desc' }]
      };
      
      mockRedisService.getFloorTheme.mockResolvedValue(mockTheme);
      
      const result = await contentStorage.getFloorTheme(1);
      
      expect(result).toEqual(mockTheme);
      expect(mockRedisService.getFloorTheme).toHaveBeenCalledWith(1);
    });

    it('should return null when no theme exists', async () => {
      mockRedisService.getFloorTheme.mockResolvedValue(null);
      
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect as any);
      
      const result = await contentStorage.getFloorTheme(999);
      
      expect(result).toBeNull();
    });
  });

  describe('addCrawlerBackground', () => {
    it('should insert new crawler background', async () => {
      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };
      mockDb.insert.mockReturnValue(mockInsert as any);
      
      await contentStorage.addCrawlerBackground('test', 'Test story', 5);
      
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockInsert.values).toHaveBeenCalledWith({
        category: 'test',
        story: 'Test story',
        weight: 5
      });
    });
  });

  describe('addFlavorText', () => {
    it('should insert new flavor text', async () => {
      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };
      mockDb.insert.mockReturnValue(mockInsert as any);
      
      await contentStorage.addFlavorText('combat', 'Epic battle text', 3);
      
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockInsert.values).toHaveBeenCalledWith({
        category: 'combat',
        text: 'Epic battle text',
        weight: 3
      });
    });
  });
});
