
/**
 * File: corporation-storage.test.ts
 * Responsibility: Unit tests for CorporationStorage name generation
 * Notes: Tests corporation name generation using prefixes and suffixes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CorporationStorage } from '../corporation-storage';
import { db } from '../../db';

// Mock the database
jest.mock('../../db');
const mockDb = db as jest.Mocked<typeof db>;

describe('CorporationStorage', () => {
  let corporationStorage: CorporationStorage;

  beforeEach(() => {
    corporationStorage = new CorporationStorage();
    jest.clearAllMocks();
  });

  describe('generateCorporationName', () => {
    it('should generate a corporation name with prefix and suffix', async () => {
      const mockPrefixes = [
        { name: 'Stellar', weight: 1 },
        { name: 'Cosmic', weight: 2 }
      ];
      const mockSuffixes = [
        { name: 'Industries', weight: 1 },
        { name: 'Corporation', weight: 2 }
      ];

      // Mock the database calls
      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue(mockPrefixes)
        } as any)
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue(mockSuffixes)
        } as any);

      const result = await corporationStorage.generateCorporationName();

      expect(result).toMatch(/^(Stellar|Cosmic) (Industries|Corporation)$/);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });

    it('should handle empty prefixes gracefully', async () => {
      const mockSuffixes = [{ name: 'Industries', weight: 1 }];

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue([])
        } as any)
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue(mockSuffixes)
        } as any);

      const result = await corporationStorage.generateCorporationName();

      expect(result).toBe('Generic Industries');
    });

    it('should handle empty suffixes gracefully', async () => {
      const mockPrefixes = [{ name: 'Stellar', weight: 1 }];

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue(mockPrefixes)
        } as any)
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue([])
        } as any);

      const result = await corporationStorage.generateCorporationName();

      expect(result).toBe('Stellar Corporation');
    });

    it('should respect weighted random selection for prefixes', async () => {
      const mockPrefixes = [
        { name: 'Rare', weight: 1 },
        { name: 'Common', weight: 100 }
      ];
      const mockSuffixes = [{ name: 'Corp', weight: 1 }];

      mockDb.select
        .mockReturnValue({
          from: jest.fn()
            .mockResolvedValueOnce(mockPrefixes)
            .mockResolvedValueOnce(mockSuffixes)
        } as any);

      const results: string[] = [];
      for (let i = 0; i < 50; i++) {
        // Reset the mock for each iteration
        mockDb.select
          .mockReturnValueOnce({
            from: jest.fn().mockResolvedValue(mockPrefixes)
          } as any)
          .mockReturnValueOnce({
            from: jest.fn().mockResolvedValue(mockSuffixes)
          } as any);

        results.push(await corporationStorage.generateCorporationName());
      }

      const commonCount = results.filter(r => r.includes('Common')).length;
      const rareCount = results.filter(r => r.includes('Rare')).length;

      expect(commonCount).toBeGreaterThan(rareCount);
    });

    it('should respect weighted random selection for suffixes', async () => {
      const mockPrefixes = [{ name: 'Test', weight: 1 }];
      const mockSuffixes = [
        { name: 'Rare', weight: 1 },
        { name: 'Common', weight: 100 }
      ];

      const results: string[] = [];
      for (let i = 0; i < 50; i++) {
        mockDb.select
          .mockReturnValueOnce({
            from: jest.fn().mockResolvedValue(mockPrefixes)
          } as any)
          .mockReturnValueOnce({
            from: jest.fn().mockResolvedValue(mockSuffixes)
          } as any);

        results.push(await corporationStorage.generateCorporationName());
      }

      const commonCount = results.filter(r => r.includes('Common')).length;
      const rareCount = results.filter(r => r.includes('Rare')).length;

      expect(commonCount).toBeGreaterThan(rareCount);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(corporationStorage.generateCorporationName()).rejects.toThrow('Database error');
    });
  });
});
