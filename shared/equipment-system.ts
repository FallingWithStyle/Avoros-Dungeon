
/**
 * File: equipment-system.ts
 * Responsibility: Equipment system calculations and utilities for weapons, armor, and shields
 * Notes: Handles damage calculations, defense bonuses, set bonuses, and special abilities
 */

import { Equipment, Crawler } from "./schema";

export interface EquipmentStats {
  totalDefense: number;
  setDefense: { [bodyPart: string]: number };
  activeSets: string[];
  statBonuses: { [stat: string]: number };
  specialAbilities: string[];
}

export interface WeaponStats {
  damageAttribute: string;
  baseRange: number;
  specialAbility?: string;
  statBonuses: { [stat: string]: number };
}

export function calculateWeaponDamage(
  weapon: Equipment,
  crawler: Crawler,
  targetDefense: number = 0
): number {
  if (!weapon.weaponType || !weapon.damageAttribute) return 0;

  // Get the appropriate stat for damage calculation
  let baseDamage = 0;
  switch (weapon.damageAttribute) {
    case "might":
      baseDamage = crawler.might;
      break;
    case "agility":
      baseDamage = crawler.agility;
      break;
    case "intellect":
      baseDamage = crawler.intellect;
      break;
    case "wisdom":
      baseDamage = crawler.wisdom;
      break;
    default:
      baseDamage = 1;
  }

  // Apply weapon bonuses and calculate final damage
  const weaponBonus = weapon.mightBonus || 0;
  const totalDamage = Math.max(1, baseDamage + weaponBonus - targetDefense);
  
  return totalDamage;
}

export function calculateArmorDefense(
  equippedArmor: Equipment[],
  attackedBodyPart?: string
): { totalDefense: number; appliedDefense: number } {
  let totalDefense = 0;
  let appliedDefense = 0;

  for (const armor of equippedArmor) {
    if (armor.defenseValue) {
      totalDefense += armor.defenseValue;
      
      // Double defense if the attack hits the protected area
      if (attackedBodyPart && armor.armorSlot === attackedBodyPart) {
        appliedDefense += armor.defenseValue * 2;
      } else {
        appliedDefense += armor.defenseValue;
      }
    }
  }

  return { totalDefense, appliedDefense };
}

export function calculateShieldBlock(
  shield: Equipment,
  incomingDamage: number
): { blocked: boolean; damageReduction: number } {
  if (!shield.blockChance || !shield.defenseValue) {
    return { blocked: false, damageReduction: 0 };
  }

  const blockRoll = Math.random() * 100;
  const blocked = blockRoll < shield.blockChance;
  
  if (blocked) {
    const damageReduction = shield.defenseValue * 2;
    return { blocked: true, damageReduction };
  }

  return { blocked: false, damageReduction: 0 };
}

export function calculateSetBonuses(equippedArmor: Equipment[]): {
  completeSets: string[];
  setBonuses: { [set: string]: any };
} {
  const setSets: { [setName: string]: string[] } = {};
  const completeSets: string[] = [];
  const setBonuses: { [set: string]: any } = {};

  // Group armor by set
  for (const armor of equippedArmor) {
    if (armor.armorSet && armor.armorSlot) {
      if (!setSets[armor.armorSet]) {
        setSets[armor.armorSet] = [];
      }
      setSets[armor.armorSet].push(armor.armorSlot);
    }
  }

  // Check for complete sets and apply bonuses
  for (const [setName, slots] of Object.entries(setSets)) {
    if (setName === "Scavenger" && slots.length >= 4) {
      completeSets.push(setName);
      setBonuses[setName] = {
        description: "Scavenger Set: +2 Agility, +1 Luck",
        statBonuses: { agility: 2, luck: 1 }
      };
    } else if (setName === "Security" && slots.length >= 2) {
      completeSets.push(setName);
      setBonuses[setName] = {
        description: "Security Set: +3 Endurance, +1 Might",
        statBonuses: { endurance: 3, might: 1 }
      };
    }
  }

  return { completeSets, setBonuses };
}

export function getWeaponRange(weapon: Equipment): number {
  return weapon.baseRange || 1;
}

export function hasSpecialAbility(equipment: Equipment): boolean {
  return !!equipment.specialAbility;
}

export function getSpecialAbilityDescription(equipment: Equipment): string {
  return equipment.specialAbility || "";
}
