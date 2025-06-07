
import {
  Effect,
  EffectDefinition,
  EFFECT_DEFINITIONS,
  isEffectActive,
  calculateEffectiveStats,
  cleanExpiredEffects,
  addEffect
} from '../effects';

describe('Effects System', () => {
  describe('isEffectActive', () => {
    it('should return true for permanent effects', () => {
      const permanentEffect: Effect = {
        id: 'test_permanent',
        name: 'Test Permanent',
        type: 'skill',
        duration: -1,
        appliedAt: new Date(),
        properties: { attackBonus: 5 },
        source: 'Test'
      };

      expect(isEffectActive(permanentEffect)).toBe(true);
    });

    it('should return false for instant effects', () => {
      const instantEffect: Effect = {
        id: 'test_instant',
        name: 'Test Instant',
        type: 'consumable',
        duration: 0,
        appliedAt: new Date(),
        properties: { healthBonus: 10 },
        source: 'Test'
      };

      expect(isEffectActive(instantEffect)).toBe(false);
    });

    it('should return true for active timed effects', () => {
      const activeEffect: Effect = {
        id: 'test_active',
        name: 'Test Active',
        type: 'spell',
        duration: 60000, // 1 minute
        appliedAt: new Date(), // Just applied
        properties: { scanRangeBonus: 2 },
        source: 'Test'
      };

      expect(isEffectActive(activeEffect)).toBe(true);
    });

    it('should return false for expired timed effects', () => {
      const expiredEffect: Effect = {
        id: 'test_expired',
        name: 'Test Expired',
        type: 'spell',
        duration: 1000, // 1 second
        appliedAt: new Date(Date.now() - 2000), // Applied 2 seconds ago
        properties: { speedBonus: 3 },
        source: 'Test'
      };

      expect(isEffectActive(expiredEffect)).toBe(false);
    });
  });

  describe('calculateEffectiveStats', () => {
    const baseStats = {
      attack: 10,
      defense: 8,
      speed: 5,
      wit: 7,
      charisma: 6,
      memory: 9,
      health: 100,
      maxHealth: 100,
      maxEnergy: 50,
      luck: 3,
      scanRange: 1
    };

    it('should return base stats when no effects are provided', () => {
      const result = calculateEffectiveStats(baseStats, []);
      expect(result).toEqual(baseStats);
    });

    it('should apply active effect bonuses', () => {
      const activeEffect: Effect = {
        id: 'test_bonus',
        name: 'Test Bonus',
        type: 'spell',
        duration: 60000,
        appliedAt: new Date(),
        properties: {
          attackBonus: 5,
          defenseBonus: 3,
          scanRangeBonus: 2
        },
        source: 'Test'
      };

      const result = calculateEffectiveStats(baseStats, [activeEffect]);
      expect(result.attack).toBe(15);
      expect(result.defense).toBe(11);
      expect(result.scanRange).toBe(3);
      expect(result.wit).toBe(7); // Unchanged
    });

    it('should ignore expired effects', () => {
      const expiredEffect: Effect = {
        id: 'test_expired',
        name: 'Test Expired',
        type: 'spell',
        duration: 1000,
        appliedAt: new Date(Date.now() - 2000),
        properties: { attackBonus: 10 },
        source: 'Test'
      };

      const result = calculateEffectiveStats(baseStats, [expiredEffect]);
      expect(result.attack).toBe(10); // Unchanged
    });

    it('should stack multiple active effects', () => {
      const effect1: Effect = {
        id: 'test_1',
        name: 'Test 1',
        type: 'spell',
        duration: 60000,
        appliedAt: new Date(),
        properties: { attackBonus: 3, witBonus: 2 },
        source: 'Test 1'
      };

      const effect2: Effect = {
        id: 'test_2',
        name: 'Test 2',
        type: 'equipment',
        duration: -1,
        appliedAt: new Date(),
        properties: { attackBonus: 2, defenseBonus: 4 },
        source: 'Test 2'
      };

      const result = calculateEffectiveStats(baseStats, [effect1, effect2]);
      expect(result.attack).toBe(15); // 10 + 3 + 2
      expect(result.wit).toBe(9); // 7 + 2
      expect(result.defense).toBe(12); // 8 + 4
    });

    it('should handle all stat bonus types', () => {
      const comprehensiveEffect: Effect = {
        id: 'test_comprehensive',
        name: 'Test Comprehensive',
        type: 'spell',
        duration: 60000,
        appliedAt: new Date(),
        properties: {
          scanRangeBonus: 1,
          energyRegenBonus: 2,
          attackBonus: 3,
          defenseBonus: 4,
          speedBonus: 5,
          witBonus: 6,
          charismaBonus: 7,
          memoryBonus: 8,
          healthBonus: 9,
          maxHealthBonus: 10,
          maxEnergyBonus: 11,
          luckBonus: 12,
          movementCostReduction: 13
        },
        source: 'Test'
      };

      const result = calculateEffectiveStats(baseStats, [comprehensiveEffect]);
      expect(result.scanRange).toBe(2);
      expect(result.attack).toBe(13);
      expect(result.defense).toBe(12);
      expect(result.speed).toBe(10);
      expect(result.wit).toBe(13);
      expect(result.charisma).toBe(13);
      expect(result.memory).toBe(17);
      expect(result.health).toBe(109);
      expect(result.maxHealth).toBe(110);
      expect(result.maxEnergy).toBe(61);
      expect(result.luck).toBe(15);
    });
  });

  describe('cleanExpiredEffects', () => {
    it('should remove expired effects and keep active ones', () => {
      const activeEffect: Effect = {
        id: 'active',
        name: 'Active',
        type: 'spell',
        duration: 60000,
        appliedAt: new Date(),
        properties: { attackBonus: 5 },
        source: 'Test'
      };

      const expiredEffect: Effect = {
        id: 'expired',
        name: 'Expired',
        type: 'spell',
        duration: 1000,
        appliedAt: new Date(Date.now() - 2000),
        properties: { attackBonus: 5 },
        source: 'Test'
      };

      const permanentEffect: Effect = {
        id: 'permanent',
        name: 'Permanent',
        type: 'skill',
        duration: -1,
        appliedAt: new Date(),
        properties: { attackBonus: 5 },
        source: 'Test'
      };

      const effects = [activeEffect, expiredEffect, permanentEffect];
      const cleanedEffects = cleanExpiredEffects(effects);

      expect(cleanedEffects).toHaveLength(2);
      expect(cleanedEffects).toContain(activeEffect);
      expect(cleanedEffects).toContain(permanentEffect);
      expect(cleanedEffects).not.toContain(expiredEffect);
    });

    it('should return empty array when all effects are expired', () => {
      const expiredEffect1: Effect = {
        id: 'expired1',
        name: 'Expired 1',
        type: 'spell',
        duration: 1000,
        appliedAt: new Date(Date.now() - 2000),
        properties: { attackBonus: 5 },
        source: 'Test'
      };

      const instantEffect: Effect = {
        id: 'instant',
        name: 'Instant',
        type: 'consumable',
        duration: 0,
        appliedAt: new Date(),
        properties: { healthBonus: 10 },
        source: 'Test'
      };

      const cleanedEffects = cleanExpiredEffects([expiredEffect1, instantEffect]);
      expect(cleanedEffects).toHaveLength(0);
    });
  });

  describe('addEffect', () => {
    it('should create effect from valid definition', () => {
      const effect = addEffect({}, 'enhanced_scan');
      
      expect(effect).toBeTruthy();
      expect(effect!.id).toBe('enhanced_scan');
      expect(effect!.name).toBe('Enhanced Scan');
      expect(effect!.type).toBe('spell');
      expect(effect!.duration).toBe(300000);
      expect(effect!.properties.scanRangeBonus).toBe(3);
      expect(effect!.source).toBe('Enhanced Scan');
      expect(effect!.appliedAt).toBeInstanceOf(Date);
    });

    it('should return null for invalid effect ID', () => {
      const effect = addEffect({}, 'invalid_effect_id');
      expect(effect).toBeNull();
    });

    it('should create different effects correctly', () => {
      const eagleEye = addEffect({}, 'eagle_eye');
      const tacticalScanner = addEffect({}, 'tactical_scanner');

      expect(eagleEye!.type).toBe('skill');
      expect(eagleEye!.duration).toBe(-1);
      expect(eagleEye!.properties.scanRangeBonus).toBe(1);

      expect(tacticalScanner!.type).toBe('equipment');
      expect(tacticalScanner!.duration).toBe(-1);
      expect(tacticalScanner!.properties.scanRangeBonus).toBe(2);
      expect(tacticalScanner!.properties.witBonus).toBe(1);
    });
  });

  describe('EFFECT_DEFINITIONS', () => {
    it('should contain all expected effect definitions', () => {
      expect(EFFECT_DEFINITIONS).toHaveProperty('enhanced_scan');
      expect(EFFECT_DEFINITIONS).toHaveProperty('eagle_eye');
      expect(EFFECT_DEFINITIONS).toHaveProperty('tactical_scanner');
      expect(EFFECT_DEFINITIONS).toHaveProperty('eyes_of_debug');
    });

    it('should have properly structured effect definitions', () => {
      const enhancedScan = EFFECT_DEFINITIONS.enhanced_scan;
      
      expect(enhancedScan).toHaveProperty('id');
      expect(enhancedScan).toHaveProperty('name');
      expect(enhancedScan).toHaveProperty('description');
      expect(enhancedScan).toHaveProperty('type');
      expect(enhancedScan).toHaveProperty('duration');
      expect(enhancedScan).toHaveProperty('properties');
      expect(enhancedScan).toHaveProperty('requirements');
      expect(enhancedScan).toHaveProperty('cost');
    });

    it('should have debug effect with special properties', () => {
      const eyesOfDebug = EFFECT_DEFINITIONS.eyes_of_debug;
      
      expect(eyesOfDebug.properties.scanRangeBonus).toBe(100);
      expect(eyesOfDebug.cost?.energy).toBe(0);
      expect(eyesOfDebug.duration).toBe(600000);
    });
  });
});
