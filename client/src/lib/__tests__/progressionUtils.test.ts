/**
 * File: progressionUtils.test.ts
 * Responsibility: Essential tests for game progression calculations
 * Notes: Focused on key mathematical properties rather than exhaustive test cases
 */

import { expRequired } from '../progressionUtils';

describe('progressionUtils', () => {
  describe('expRequired', () => {
    it('should calculate experience for low levels correctly', () => {
      expect(expRequired(1)).toBe(69); // Math.log(2) * 100
      expect(expRequired(2)).toBe(110); // Math.log(3) * 100
    });

    it('should use custom base experience factor', () => {
      const result = expRequired(1, 200);
      expect(result).toBe(139); // Math.log(2) * 200
    });

    it('should scale logarithmically', () => {
      const level5 = expRequired(5);
      const level10 = expRequired(10);

      // Logarithmic scaling should be less than linear
      expect(level10).toBeLessThan(2 * level5);
    });

    it('should always return positive integers', () => {
      expect(expRequired(0)).toBe(0);
      expect(expRequired(10)).toBeGreaterThan(0);
      expect(Number.isInteger(expRequired(5))).toBe(true);
    });
  });
});