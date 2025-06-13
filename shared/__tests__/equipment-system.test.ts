
/**
 * File: equipment-system.test.ts
 * Responsibility: Unit tests for equipment system calculations and utilities
 * Notes: Tests weapon damage, armor defense, shield blocking, set bonuses, and special abilities
 */

import {
  calculateWeaponDamage,
  calculateArmorDefense,
  calculateShieldBlock,
  calculateSetBonuses,
  getWeaponRange,
  hasSpecialAbility,
  getSpecialAbilityDescription,
  type EquipmentStats,
  type WeaponStats
} from '../equipment-system';
import { Equipment, Crawler } from '../schema';

describe('Equipment System', () => {
  // Mock data for testing
  const mockCrawler: Crawler = {
    id: 1,
    sponsorId: 'test-sponsor',
    name: 'Test Crawler',
    serial: 1001,
    background: 'Test background',
    classId: 1,
    level: 5,
    currentFloor: 1,
    health: 100,
    maxHealth: 100,
    might: 15,
    agility: 12,
    endurance: 10,
    intellect: 8,
    charisma: 6,
    wisdom: 7,
    power: 20,
    maxPower: 20,
    luck: 5,
    gold: 100,
    experience: 0,
    energy: 100,
    maxEnergy: 100,
    scanRange: 2,
    activeEffects: [],
    competencies: ['survival'],
    abilities: [],
    status: 'active',
    isAlive: true,
    sponsorshipType: 'primary',
    seasonNumber: 1,
    lastAction: new Date(),
    lastEnergyRegen: new Date(),
    createdAt: new Date()
  };

  const mockWeapon: Equipment = {
    id: 1,
    typeId: 1,
    name: 'Test Sword',
    description: 'A test weapon',
    weaponType: 'melee',
    damageAttribute: 'might',
    baseRange: 1,
    specialAbility: 'Critical Strike',
    defenseValue: 0,
    armorSlot: null,
    armorSet: null,
    blockChance: 0,
    mightBonus: 3,
    agilityBonus: 0,
    enduranceBonus: 0,
    intellectBonus: 0,
    charismaBonus: 0,
    wisdomBonus: 0,
    powerBonus: 0,
    maxPowerBonus: 0,
    healthBonus: 0,
    rarity: 'common',
    price: 50,
    minFloor: 1
  };

  const mockArmor: Equipment = {
    id: 2,
    typeId: 2,
    name: 'Test Armor',
    description: 'Protective gear',
    weaponType: null,
    damageAttribute: null,
    baseRange: 1,
    specialAbility: null,
    defenseValue: 5,
    armorSlot: 'torso',
    armorSet: 'Security',
    blockChance: 0,
    mightBonus: 0,
    agilityBonus: 0,
    enduranceBonus: 2,
    intellectBonus: 0,
    charismaBonus: 0,
    wisdomBonus: 0,
    powerBonus: 0,
    maxPowerBonus: 0,
    healthBonus: 0,
    rarity: 'uncommon',
    price: 100,
    minFloor: 1
  };

  const mockShield: Equipment = {
    id: 3,
    typeId: 3,
    name: 'Test Shield',
    description: 'A defensive shield',
    weaponType: null,
    damageAttribute: null,
    baseRange: 1,
    specialAbility: null,
    defenseValue: 3,
    armorSlot: null,
    armorSet: null,
    blockChance: 25,
    mightBonus: 0,
    agilityBonus: 0,
    enduranceBonus: 0,
    intellectBonus: 0,
    charismaBonus: 0,
    wisdomBonus: 0,
    powerBonus: 0,
    maxPowerBonus: 0,
    healthBonus: 0,
    rarity: 'common',
    price: 75,
    minFloor: 1
  };

  describe('calculateWeaponDamage', () => {
    it('should calculate damage based on might attribute', () => {
      const damage = calculateWeaponDamage(mockWeapon, mockCrawler, 0);
      
      // Should be crawler.might (15) + weapon.mightBonus (3) = 18
      expect(damage).toBe(18);
    });

    it('should calculate damage with target defense', () => {
      const damage = calculateWeaponDamage(mockWeapon, mockCrawler, 5);
      
      // Should be 15 + 3 - 5 = 13
      expect(damage).toBe(13);
    });

    it('should return minimum damage of 1', () => {
      const damage = calculateWeaponDamage(mockWeapon, mockCrawler, 100);
      
      expect(damage).toBe(1);
    });

    it('should handle agility-based weapons', () => {
      const agilityWeapon = { ...mockWeapon, damageAttribute: 'agility' };
      const damage = calculateWeaponDamage(agilityWeapon, mockCrawler, 0);
      
      // Should be crawler.agility (12) + weapon.mightBonus (3) = 15
      expect(damage).toBe(15);
    });

    it('should handle intellect-based weapons', () => {
      const intellectWeapon = { ...mockWeapon, damageAttribute: 'intellect' };
      const damage = calculateWeaponDamage(intellectWeapon, mockCrawler, 0);
      
      // Should be crawler.intellect (8) + weapon.mightBonus (3) = 11
      expect(damage).toBe(11);
    });

    it('should handle wisdom-based weapons', () => {
      const wisdomWeapon = { ...mockWeapon, damageAttribute: 'wisdom' };
      const damage = calculateWeaponDamage(wisdomWeapon, mockCrawler, 0);
      
      // Should be crawler.wisdom (7) + weapon.mightBonus (3) = 10
      expect(damage).toBe(10);
    });

    it('should default to 1 damage for unknown attributes', () => {
      const unknownWeapon = { ...mockWeapon, damageAttribute: 'unknown' };
      const damage = calculateWeaponDamage(unknownWeapon, mockCrawler, 0);
      
      // Should be 1 + weapon.mightBonus (3) = 4
      expect(damage).toBe(4);
    });

    it('should return 0 for non-weapon items', () => {
      const nonWeapon = { ...mockWeapon, weaponType: null, damageAttribute: null };
      const damage = calculateWeaponDamage(nonWeapon, mockCrawler, 0);
      
      expect(damage).toBe(0);
    });

    it('should handle weapons without stat bonuses', () => {
      const plainWeapon = { ...mockWeapon, mightBonus: 0 };
      const damage = calculateWeaponDamage(plainWeapon, mockCrawler, 0);
      
      // Should be crawler.might (15) + 0 = 15
      expect(damage).toBe(15);
    });
  });

  describe('calculateArmorDefense', () => {
    it('should calculate total defense from multiple armor pieces', () => {
      const armor1 = { ...mockArmor, defenseValue: 5 };
      const armor2 = { ...mockArmor, defenseValue: 3, armorSlot: 'head' };
      const equippedArmor = [armor1, armor2];
      
      const result = calculateArmorDefense(equippedArmor);
      
      expect(result.totalDefense).toBe(8);
      expect(result.appliedDefense).toBe(8);
    });

    it('should apply double defense for targeted body part', () => {
      const torsoArmor = { ...mockArmor, defenseValue: 5, armorSlot: 'torso' };
      const equippedArmor = [torsoArmor];
      
      const result = calculateArmorDefense(equippedArmor, 'torso');
      
      expect(result.totalDefense).toBe(5);
      expect(result.appliedDefense).toBe(10); // Double defense for targeted area
    });

    it('should handle mixed targeted and non-targeted armor', () => {
      const torsoArmor = { ...mockArmor, defenseValue: 5, armorSlot: 'torso' };
      const headArmor = { ...mockArmor, defenseValue: 3, armorSlot: 'head' };
      const equippedArmor = [torsoArmor, headArmor];
      
      const result = calculateArmorDefense(equippedArmor, 'torso');
      
      expect(result.totalDefense).toBe(8);
      expect(result.appliedDefense).toBe(13); // 5*2 + 3 = 13
    });

    it('should handle empty armor array', () => {
      const result = calculateArmorDefense([]);
      
      expect(result.totalDefense).toBe(0);
      expect(result.appliedDefense).toBe(0);
    });

    it('should handle armor without defense values', () => {
      const noDefenseArmor = { ...mockArmor, defenseValue: 0 };
      const equippedArmor = [noDefenseArmor];
      
      const result = calculateArmorDefense(equippedArmor);
      
      expect(result.totalDefense).toBe(0);
      expect(result.appliedDefense).toBe(0);
    });

    it('should handle null defense values', () => {
      const nullDefenseArmor = { ...mockArmor, defenseValue: null as any };
      const equippedArmor = [nullDefenseArmor];
      
      const result = calculateArmorDefense(equippedArmor);
      
      expect(result.totalDefense).toBe(0);
      expect(result.appliedDefense).toBe(0);
    });
  });

  describe('calculateShieldBlock', () => {
    // Mock Math.random to control randomness in tests
    const originalRandom = Math.random;
    
    afterEach(() => {
      Math.random = originalRandom;
    });

    it('should block when random roll succeeds', () => {
      Math.random = jest.fn(() => 0.2); // 20% roll, should succeed with 25% block chance
      
      const result = calculateShieldBlock(mockShield, 10);
      
      expect(result.blocked).toBe(true);
      expect(result.damageReduction).toBe(6); // defenseValue (3) * 2
    });

    it('should not block when random roll fails', () => {
      Math.random = jest.fn(() => 0.3); // 30% roll, should fail with 25% block chance
      
      const result = calculateShieldBlock(mockShield, 10);
      
      expect(result.blocked).toBe(false);
      expect(result.damageReduction).toBe(0);
    });

    it('should handle shield without block chance', () => {
      const noBlockShield = { ...mockShield, blockChance: 0 };
      
      const result = calculateShieldBlock(noBlockShield, 10);
      
      expect(result.blocked).toBe(false);
      expect(result.damageReduction).toBe(0);
    });

    it('should handle shield without defense value', () => {
      const noDefenseShield = { ...mockShield, defenseValue: 0 };
      
      const result = calculateShieldBlock(noDefenseShield, 10);
      
      expect(result.blocked).toBe(false);
      expect(result.damageReduction).toBe(0);
    });

    it('should handle null values', () => {
      const nullShield = { ...mockShield, blockChance: null as any, defenseValue: null as any };
      
      const result = calculateShieldBlock(nullShield, 10);
      
      expect(result.blocked).toBe(false);
      expect(result.damageReduction).toBe(0);
    });

    it('should handle 100% block chance', () => {
      Math.random = jest.fn(() => 0.5); // 50% roll
      const perfectShield = { ...mockShield, blockChance: 100 };
      
      const result = calculateShieldBlock(perfectShield, 10);
      
      expect(result.blocked).toBe(true);
      expect(result.damageReduction).toBe(6);
    });
  });

  describe('calculateSetBonuses', () => {
    it('should detect complete Scavenger set', () => {
      const scavengerArmor = [
        { ...mockArmor, armorSet: 'Scavenger', armorSlot: 'head' },
        { ...mockArmor, armorSet: 'Scavenger', armorSlot: 'torso' },
        { ...mockArmor, armorSet: 'Scavenger', armorSlot: 'legs' },
        { ...mockArmor, armorSet: 'Scavenger', armorSlot: 'feet' }
      ];
      
      const result = calculateSetBonuses(scavengerArmor);
      
      expect(result.completeSets).toContain('Scavenger');
      expect(result.setBonuses.Scavenger).toEqual({
        description: 'Scavenger Set: +2 Agility, +1 Luck',
        statBonuses: { agility: 2, luck: 1 }
      });
    });

    it('should detect complete Security set', () => {
      const securityArmor = [
        { ...mockArmor, armorSet: 'Security', armorSlot: 'head' },
        { ...mockArmor, armorSet: 'Security', armorSlot: 'torso' }
      ];
      
      const result = calculateSetBonuses(securityArmor);
      
      expect(result.completeSets).toContain('Security');
      expect(result.setBonuses.Security).toEqual({
        description: 'Security Set: +3 Endurance, +1 Might',
        statBonuses: { endurance: 3, might: 1 }
      });
    });

    it('should not detect incomplete sets', () => {
      const incompleteArmor = [
        { ...mockArmor, armorSet: 'Scavenger', armorSlot: 'head' },
        { ...mockArmor, armorSet: 'Scavenger', armorSlot: 'torso' },
        { ...mockArmor, armorSet: 'Security', armorSlot: 'legs' }
      ];
      
      const result = calculateSetBonuses(incompleteArmor);
      
      expect(result.completeSets).toHaveLength(0);
      expect(Object.keys(result.setBonuses)).toHaveLength(0);
    });

    it('should handle armor without sets', () => {
      const noSetArmor = [
        { ...mockArmor, armorSet: null },
        { ...mockArmor, armorSet: undefined as any }
      ];
      
      const result = calculateSetBonuses(noSetArmor);
      
      expect(result.completeSets).toHaveLength(0);
      expect(Object.keys(result.setBonuses)).toHaveLength(0);
    });

    it('should handle empty armor array', () => {
      const result = calculateSetBonuses([]);
      
      expect(result.completeSets).toHaveLength(0);
      expect(Object.keys(result.setBonuses)).toHaveLength(0);
    });

    it('should handle multiple complete sets', () => {
      const mixedArmor = [
        { ...mockArmor, armorSet: 'Scavenger', armorSlot: 'head' },
        { ...mockArmor, armorSet: 'Scavenger', armorSlot: 'torso' },
        { ...mockArmor, armorSet: 'Scavenger', armorSlot: 'legs' },
        { ...mockArmor, armorSet: 'Scavenger', armorSlot: 'feet' },
        { ...mockArmor, armorSet: 'Security', armorSlot: 'hands' },
        { ...mockArmor, armorSet: 'Security', armorSlot: 'wrists' }
      ];
      
      const result = calculateSetBonuses(mixedArmor);
      
      expect(result.completeSets).toContain('Scavenger');
      expect(result.completeSets).toContain('Security');
      expect(result.completeSets).toHaveLength(2);
    });
  });

  describe('getWeaponRange', () => {
    it('should return weapon base range', () => {
      const range = getWeaponRange(mockWeapon);
      
      expect(range).toBe(1);
    });

    it('should return default range of 1 when baseRange is null', () => {
      const noRangeWeapon = { ...mockWeapon, baseRange: null as any };
      const range = getWeaponRange(noRangeWeapon);
      
      expect(range).toBe(1);
    });

    it('should handle longer range weapons', () => {
      const longRangeWeapon = { ...mockWeapon, baseRange: 5 };
      const range = getWeaponRange(longRangeWeapon);
      
      expect(range).toBe(5);
    });
  });

  describe('hasSpecialAbility', () => {
    it('should return true for equipment with special ability', () => {
      const hasAbility = hasSpecialAbility(mockWeapon);
      
      expect(hasAbility).toBe(true);
    });

    it('should return false for equipment without special ability', () => {
      const noAbilityItem = { ...mockWeapon, specialAbility: null };
      const hasAbility = hasSpecialAbility(noAbilityItem);
      
      expect(hasAbility).toBe(false);
    });

    it('should return false for equipment with empty special ability', () => {
      const emptyAbilityItem = { ...mockWeapon, specialAbility: '' };
      const hasAbility = hasSpecialAbility(emptyAbilityItem);
      
      expect(hasAbility).toBe(false);
    });

    it('should return false for equipment with undefined special ability', () => {
      const undefinedAbilityItem = { ...mockWeapon, specialAbility: undefined as any };
      const hasAbility = hasSpecialAbility(undefinedAbilityItem);
      
      expect(hasAbility).toBe(false);
    });
  });

  describe('getSpecialAbilityDescription', () => {
    it('should return special ability description', () => {
      const description = getSpecialAbilityDescription(mockWeapon);
      
      expect(description).toBe('Critical Strike');
    });

    it('should return empty string for equipment without special ability', () => {
      const noAbilityItem = { ...mockWeapon, specialAbility: null };
      const description = getSpecialAbilityDescription(noAbilityItem);
      
      expect(description).toBe('');
    });

    it('should return empty string for undefined special ability', () => {
      const undefinedAbilityItem = { ...mockWeapon, specialAbility: undefined as any };
      const description = getSpecialAbilityDescription(undefinedAbilityItem);
      
      expect(description).toBe('');
    });

    it('should handle empty string special ability', () => {
      const emptyAbilityItem = { ...mockWeapon, specialAbility: '' };
      const description = getSpecialAbilityDescription(emptyAbilityItem);
      
      expect(description).toBe('');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle crawler with zero stats', () => {
      const zeroStatsCrawler = { ...mockCrawler, might: 0, agility: 0, intellect: 0, wisdom: 0 };
      const damage = calculateWeaponDamage(mockWeapon, zeroStatsCrawler, 0);
      
      // Should be 0 + weapon.mightBonus (3) = 3
      expect(damage).toBe(3);
    });

    it('should handle negative stat values', () => {
      const negativeStatsCrawler = { ...mockCrawler, might: -5 };
      const damage = calculateWeaponDamage(mockWeapon, negativeStatsCrawler, 0);
      
      // Should be -5 + 3 = -2, but minimum is 1
      expect(damage).toBe(1);
    });

    it('should handle extreme defense values', () => {
      const result = calculateArmorDefense([mockArmor], undefined);
      const damage = calculateWeaponDamage(mockWeapon, mockCrawler, 1000);
      
      expect(damage).toBe(1); // Minimum damage should still be 1
    });

    it('should handle armor with null slots', () => {
      const nullSlotArmor = { ...mockArmor, armorSlot: null };
      const result = calculateArmorDefense([nullSlotArmor], 'torso');
      
      expect(result.totalDefense).toBe(5);
      expect(result.appliedDefense).toBe(5); // No double defense for null slot
    });
  });
});
