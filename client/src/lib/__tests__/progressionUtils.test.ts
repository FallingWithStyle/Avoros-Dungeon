
/**
 * File: progressionUtils.test.ts
 * Responsibility: Unit tests for game progression calculations and experience requirements
 * Notes: Tests logarithmic scaling for experience points needed to level up crawlers
 */

import { expRequired } from '../progressionUtils';

describe('progressionUtils', () => {
  describe('expRequired', () => {
    it('should calculate experience required for level 1 with default base', () => {
      const result = expRequired(1);
      // Math.log(1 + 1) = Math.log(2) ≈ 0.693, * 100 = 69.3, rounded = 69
      expect(result).toBe(69);
    });

    it('should calculate experience required for level 2 with default base', () => {
      const result = expRequired(2);
      // Math.log(2 + 1) = Math.log(3) ≈ 1.099, * 100 = 109.9, rounded = 110
      expect(result).toBe(110);
    });

    it('should calculate experience required for level 5 with default base', () => {
      const result = expRequired(5);
      // Math.log(5 + 1) = Math.log(6) ≈ 1.792, * 100 = 179.2, rounded = 179
      expect(result).toBe(179);
    });

    it('should calculate experience required for level 10 with default base', () => {
      const result = expRequired(10);
      // Math.log(10 + 1) = Math.log(11) ≈ 2.398, * 100 = 239.8, rounded = 240
      expect(result).toBe(240);
    });

    it('should use custom base experience factor', () => {
      const result = expRequired(1, 200);
      // Math.log(1 + 1) = Math.log(2) ≈ 0.693, * 200 = 138.6, rounded = 139
      expect(result).toBe(139);
    });

    it('should handle level 0', () => {
      const result = expRequired(0);
      // Math.log(0 + 1) = Math.log(1) = 0, * 100 = 0
      expect(result).toBe(0);
    });

    it('should return higher values for higher levels', () => {
      const level5 = expRequired(5);
      const level10 = expRequired(10);
      const level20 = expRequired(20);

      expect(level10).toBeGreaterThan(level5);
      expect(level20).toBeGreaterThan(level10);
    });

    it('should scale logarithmically, not linearly', () => {
      const level5 = expRequired(5);
      const level10 = expRequired(10);
      const level20 = expRequired(20);

      // Linear scaling would be: level10 = 2 * level5, level20 = 4 * level5
      // Logarithmic scaling should be much less dramatic
      expect(level10).toBeLessThan(2 * level5);
      expect(level20).toBeLessThan(4 * level5);
    });

    it('should always return positive integers', () => {
      for (let level = 0; level <= 50; level++) {
        const result = expRequired(level);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it('should handle different base values consistently', () => {
      const bases = [50, 100, 150, 200, 500];
      const level = 5;

      bases.forEach(base => {
        const result = expRequired(level, base);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(result)).toBe(true);
        // Should scale proportionally with base
        expect(result).toBe(Math.round(base * Math.log(level + 1)));
      });
    });

    it('should produce consistent results for the same inputs', () => {
      const level = 7;
      const base = 150;
      
      const result1 = expRequired(level, base);
      const result2 = expRequired(level, base);
      const result3 = expRequired(level, base);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should handle edge case of very high levels', () => {
      const result = expRequired(100);
      expect(result).toBeGreaterThan(0);
      expect(Number.isInteger(result)).toBe(true);
      // Math.log(101) ≈ 4.615, * 100 = 461.5, rounded = 462
      expect(result).toBe(462);
    });

    it('should validate the mathematical formula', () => {
      const level = 3;
      const base = 75;
      
      const expected = Math.round(base * Math.log(level + 1));
      const actual = expRequired(level, base);
      
      expect(actual).toBe(expected);
    });
  });
});
