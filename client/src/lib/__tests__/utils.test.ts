
/**
 * File: utils.test.ts
 * Responsibility: Unit tests for utility functions, specifically testing the cn class name merging function
 * Notes: Uses Jest for testing the tailwind class merging behavior
 */

import { cn } from '../utils';

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('base-class', 'additional-class');
      expect(result).toContain('base-class');
      expect(result).toContain('additional-class');
    });

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'hidden-class');
      expect(result).toContain('base-class');
      expect(result).toContain('conditional-class');
      expect(result).not.toContain('hidden-class');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base-class', null, undefined, 'valid-class');
      expect(result).toContain('base-class');
      expect(result).toContain('valid-class');
    });
  });
});
