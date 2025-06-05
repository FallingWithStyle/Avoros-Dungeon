
export interface Effect {
  id: string;
  name: string;
  type: 'spell' | 'skill' | 'equipment' | 'consumable';
  duration: number; // -1 for permanent, 0 for instant, positive for timed
  appliedAt: Date;
  properties: {
    scanRangeBonus?: number;
    energyRegenBonus?: number;
    attackBonus?: number;
    defenseBonus?: number;
    speedBonus?: number;
    witBonus?: number;
    charismaBonus?: number;
    memoryBonus?: number;
    healthBonus?: number;
    maxHealthBonus?: number;
    maxEnergyBonus?: number;
    luckBonus?: number;
    movementCostReduction?: number;
    // Add more effect properties as needed
  };
  source: string; // What caused this effect (spell name, item name, etc.)
}

export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  type: 'spell' | 'skill' | 'equipment' | 'consumable';
  duration: number;
  properties: Effect['properties'];
  requirements?: {
    level?: number;
    stats?: { [key: string]: number };
    competencies?: string[];
  };
  cost?: {
    energy?: number;
    credits?: number;
    components?: string[];
  };
}

// Built-in effect definitions
export const EFFECT_DEFINITIONS: { [key: string]: EffectDefinition } = {
  enhanced_scan: {
    id: 'enhanced_scan',
    name: 'Enhanced Scan',
    description: 'Greatly increases your ability to scan distant rooms, revealing their types and contents.',
    type: 'spell',
    duration: 300000, // 5 minutes in milliseconds
    properties: {
      scanRangeBonus: 3, // +3 to scan range
    },
    requirements: {
      level: 1,
      stats: { wit: 5 },
    },
    cost: {
      energy: 15,
    },
  },
  eagle_eye: {
    id: 'eagle_eye',
    name: 'Eagle Eye',
    description: 'Permanently increases scan range through training and experience.',
    type: 'skill',
    duration: -1, // Permanent
    properties: {
      scanRangeBonus: 1,
    },
    requirements: {
      level: 3,
      competencies: ['Survival', 'Navigation'],
    },
  },
  tactical_scanner: {
    id: 'tactical_scanner',
    name: 'Tactical Scanner',
    description: 'Advanced equipment that provides enhanced scanning capabilities.',
    type: 'equipment',
    duration: -1, // Permanent while equipped
    properties: {
      scanRangeBonus: 2,
      witBonus: 1,
    },
  },
};

// Utility functions for effects
export function isEffectActive(effect: Effect): boolean {
  if (effect.duration === -1) return true; // Permanent
  if (effect.duration === 0) return false; // Instant, should be removed

  const now = new Date();
  const appliedAt = new Date(effect.appliedAt);
  const elapsed = now.getTime() - appliedAt.getTime();
  
  return elapsed < effect.duration;
}

export function calculateEffectiveStats(baseStats: any, effects: Effect[]): any {
  const activeEffects = effects.filter(isEffectActive);
  
  const result = { ...baseStats };
  
  // Apply all active effects
  for (const effect of activeEffects) {
    const props = effect.properties;
    
    if (props.scanRangeBonus) {
      result.scanRange = (result.scanRange || 0) + props.scanRangeBonus;
    }
    if (props.attackBonus) {
      result.attack = (result.attack || 0) + props.attackBonus;
    }
    if (props.defenseBonus) {
      result.defense = (result.defense || 0) + props.defenseBonus;
    }
    if (props.speedBonus) {
      result.speed = (result.speed || 0) + props.speedBonus;
    }
    if (props.witBonus) {
      result.wit = (result.wit || 0) + props.witBonus;
    }
    if (props.charismaBonus) {
      result.charisma = (result.charisma || 0) + props.charismaBonus;
    }
    if (props.memoryBonus) {
      result.memory = (result.memory || 0) + props.memoryBonus;
    }
    if (props.healthBonus) {
      result.health = (result.health || 0) + props.healthBonus;
    }
    if (props.maxHealthBonus) {
      result.maxHealth = (result.maxHealth || 0) + props.maxHealthBonus;
    }
    if (props.maxEnergyBonus) {
      result.maxEnergy = (result.maxEnergy || 0) + props.maxEnergyBonus;
    }
    if (props.luckBonus) {
      result.luck = (result.luck || 0) + props.luckBonus;
    }
  }
  
  return result;
}

export function cleanExpiredEffects(effects: Effect[]): Effect[] {
  return effects.filter(isEffectActive);
}

export function addEffect(crawler: any, effectId: string): Effect | null {
  const definition = EFFECT_DEFINITIONS[effectId];
  if (!definition) return null;

  const effect: Effect = {
    id: effectId,
    name: definition.name,
    type: definition.type,
    duration: definition.duration,
    appliedAt: new Date(),
    properties: definition.properties,
    source: definition.name,
  };

  return effect;
}
