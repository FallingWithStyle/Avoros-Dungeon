
/**
 * File: user-storage.test.ts
 * Responsibility: Unit tests for UserStorage user account management
 * Notes: Tests user CRUD operations, credit updates, and corporation name generation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UserStorage } from '../user-storage';
import { db } from '../../db';

// Mock the database
jest.mock('../../db');
const mockDb = db as jest.Mocked<typeof db>;

describe('UserStorage', () => {
  let userStorage: UserStorage;

  beforeEach(() => {
    userStorage = new UserStorage();
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'user1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockUser])
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      const result = await userStorage.getUser('user1');

      expect(result).toEqual(mockUser);
      expect(mockSelect.where).toHaveBeenCalled();
    });

    it('should return undefined when user not found', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      const result = await userStorage.getUser('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('upsertUser', () => {
    it('should create new user with generated corporation name when not provided', async () => {
      const userData = {
        id: 'user1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...userData, corporationName: 'Generated Corp' }])
      };
      mockDb.insert.mockReturnValue(mockInsert as any);

      const result = await userStorage.upsertUser(userData);

      expect(result.corporationName).toMatch(/\w+ \w+/); // Should match "Word Word" pattern
      expect(mockInsert.values).toHaveBeenCalled();
      expect(mockInsert.onConflictDoUpdate).toHaveBeenCalled();
      expect(mockInsert.returning).toHaveBeenCalled();
    });

    it('should use provided corporation name when given', async () => {
      const userData = {
        id: 'user1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        corporationName: 'Custom Corp'
      };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([userData])
      };
      mockDb.insert.mockReturnValue(mockInsert as any);

      const result = await userStorage.upsertUser(userData);

      expect(result.corporationName).toBe('Custom Corp');
    });
  });

  describe('updateUserCredits', () => {
    it('should update user credits by amount', async () => {
      const mockUser = {
        id: 'user1',
        credits: 1500
      };

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUser])
      };
      mockDb.update.mockReturnValue(mockUpdate as any);

      const result = await userStorage.updateUserCredits('user1', 500);

      expect(result).toEqual(mockUser);
      expect(mockUpdate.set).toHaveBeenCalled();
      expect(mockUpdate.where).toHaveBeenCalled();
      expect(mockUpdate.returning).toHaveBeenCalled();
    });

    it('should handle negative credit amounts', async () => {
      const mockUser = {
        id: 'user1',
        credits: 500
      };

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUser])
      };
      mockDb.update.mockReturnValue(mockUpdate as any);

      const result = await userStorage.updateUserCredits('user1', -200);

      expect(result).toEqual(mockUser);
      expect(mockUpdate.set).toHaveBeenCalled();
    });
  });

  describe('updateUserActiveCrawler', () => {
    it('should update user active crawler', async () => {
      const mockUser = {
        id: 'user1',
        activeCrawlerId: 5
      };

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUser])
      };
      mockDb.update.mockReturnValue(mockUpdate as any);

      const result = await userStorage.updateUserActiveCrawler('user1', 5);

      expect(result).toEqual(mockUser);
      expect(mockUpdate.set).toHaveBeenCalledWith({
        activeCrawlerId: 5,
        updatedAt: expect.any(Date)
      });
    });
  });

  describe('resetUserCrawlers', () => {
    it('should reset user primary sponsorship status', async () => {
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };
      mockDb.update.mockReturnValue(mockUpdate as any);

      await userStorage.resetUserCrawlers('user1');

      expect(mockUpdate.set).toHaveBeenCalledWith({
        primarySponsorshipUsed: false,
        lastPrimarySponsorshipSeason: 0
      });
      expect(mockUpdate.where).toHaveBeenCalled();
    });
  });

  describe('generateCorporationName', () => {
    it('should generate corporation name with prefix and suffix', () => {
      // Access the private method through type assertion
      const result = (userStorage as any).generateCorporationName();

      expect(result).toMatch(/^\w+ \w+$/);
      expect(result).not.toBe('');
    });

    it('should generate different names on multiple calls', () => {
      const names = new Set();
      
      for (let i = 0; i < 20; i++) {
        names.add((userStorage as any).generateCorporationName());
      }

      // Should have some variety (not all the same)
      expect(names.size).toBeGreaterThan(1);
    });

    it('should only use valid prefixes and suffixes', () => {
      const result = (userStorage as any).generateCorporationName();
      const [prefix, suffix] = result.split(' ');

      const validPrefixes = [
        "Stellar", "Cosmic", "Quantum", "Neural", "Cyber", "Nano", "Void", "Dark",
        "Prime", "Omega", "Alpha", "Beta", "Gamma", "Delta", "Nexus", "Core",
        "Apex", "Matrix", "Vector", "Phoenix", "Titan", "Nova", "Orbital", "Galactic",
      ];

      const validSuffixes = [
        "Industries", "Corporation", "Enterprises", "Dynamics", "Systems",
        "Technologies", "Solutions", "Consortium", "Holdings", "Syndicate",
        "Alliance", "Collective", "Federation", "Empire", "Conglomerate",
        "Group", "Labs", "Works",
      ];

      expect(validPrefixes).toContain(prefix);
      expect(validSuffixes).toContain(suffix);
    });
  });

  describe('error handling', () => {
    it('should handle database errors in getUser', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(userStorage.getUser('user1')).rejects.toThrow('Database error');
    });

    it('should handle database errors in upsertUser', async () => {
      mockDb.insert.mockImplementation(() => {
        throw new Error('Database error');
      });

      const userData = { id: 'user1', email: 'test@example.com' };
      await expect(userStorage.upsertUser(userData)).rejects.toThrow('Database error');
    });

    it('should handle database errors in updateUserCredits', async () => {
      mockDb.update.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(userStorage.updateUserCredits('user1', 100)).rejects.toThrow('Database error');
    });
  });
});
