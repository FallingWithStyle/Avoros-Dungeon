
import { calculateDamage, calculateHitChance } from '../combat-system';

describe('Combat System', () => {
  describe('calculateDamage', () => {
    it('should calculate basic damage correctly', () => {
      const attacker = { attack: 10, level: 1 };
      const defender = { defense: 5, level: 1 };
      
      const damage = calculateDamage(attacker, defender);
      
      expect(damage).toBeGreaterThan(0);
      expect(typeof damage).toBe('number');
    });

    it('should return minimum damage of 1', () => {
      const attacker = { attack: 1, level: 1 };
      const defender = { defense: 100, level: 1 };
      
      const damage = calculateDamage(attacker, defender);
      
      expect(damage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateHitChance', () => {
    it('should return a value between 0 and 1', () => {
      const attacker = { accuracy: 10, level: 1 };
      const defender = { evasion: 5, level: 1 };
      
      const hitChance = calculateHitChance(attacker, defender);
      
      expect(hitChance).toBeGreaterThanOrEqual(0);
      expect(hitChance).toBeLessThanOrEqual(1);
    });

    it('should have minimum hit chance', () => {
      const attacker = { accuracy: 1, level: 1 };
      const defender = { evasion: 100, level: 1 };
      
      const hitChance = calculateHitChance(attacker, defender);
      
      expect(hitChance).toBeGreaterThan(0);
    });
  });
});
