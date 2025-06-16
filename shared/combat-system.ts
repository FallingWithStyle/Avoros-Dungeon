/**
 * File: combat-system.ts
 * Responsibility: Simplified combat system for immediate action execution and entity positioning
 * Notes: Removes complex action queue in favor of direct execution and cooldown management
 */

// Position interface
export interface Position {
  x: number;
  y: number;
}

// Combat entity interface
export interface CombatEntity {
  // Core identity
  id: string;
  name: string;
  type: "player" | "other_player" | "hostile" | "neutral" | "ally";
  
  // Health and Power Resources
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  power: number;
  maxPower: number;
  
  // Primary Stats (dynamic based on equipment/effects)
  might: number;        // Physical strength, melee damage
  agility: number;      // Speed, evasion, ranged accuracy
  endurance: number;    // Health, stamina, physical resistance
  intellect: number;    // Magical damage, mana efficiency
  charisma: number;     // Social interactions, leadership bonuses
  wisdom: number;       // Magical resistance, perception, insight
  
  // Derived Combat Stats
  attack: number;       // Calculated from might + weapon + effects
  defense: number;      // Calculated from endurance + armor + effects
  speed: number;        // Calculated from agility + equipment + effects
  accuracy: number;     // Calculated from relevant primary stats
  evasion: number;      // Calculated from agility + equipment + effects
  
  // Positioning
  position: Position;
  facing?: number;      // Direction in degrees (0° = North)
  
  // Character Information
  level?: number;
  serial?: number;      // For player identification
  
  // Action management
  cooldowns?: Record<string, number>;
  
  // State flags
  isSelected?: boolean;
  isAlive?: boolean;
}

// Combat state interface
export interface CombatState {
  entities: CombatEntity[];
  isInCombat: boolean;
  combatStartTime?: number;
  selectedEntityId?: string;
}

// Combat calculation functions
export function calculateDamage(attacker: any, defender: any): number {
  const might = attacker.might || 1;
  const weaponAttack = attacker.attack || 0;

  // Use weapon attack if available, otherwise use might for unarmed combat
  const baseDamage = weaponAttack > 0 ? weaponAttack : Math.floor(might * 0.5) + 1;
  const defense = defender.defense || 0;
  const levelMod = (attacker.level || 1) * 0.1;

  const damage = Math.max(1, Math.floor(baseDamage + levelMod - defense * 0.3));
  return damage;
}

export function calculateHitChance(attacker: any, defender: any): number {
  const baseAccuracy = attacker.accuracy || 10;
  const evasion = defender.evasion || 5;
  const levelDiff = (attacker.level || 1) - (defender.level || 1);

  const hitChance = Math.max(
    0.1,
    Math.min(
      0.95,
      (baseAccuracy + levelDiff) / (baseAccuracy + evasion + Math.abs(levelDiff))
    )
  );

  return hitChance;
}

// Simplified Combat System class
export class CombatSystem {
  private state: CombatState;
  private subscribers: Set<(state: CombatState) => void>;

  constructor() {
    this.state = {
      entities: [],
      isInCombat: false,
    };
    this.subscribers = new Set();
  }

  // State management
  getState(): CombatState {
    return { ...this.state, entities: [...this.state.entities] };
  }

  subscribe(callback: (state: CombatState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const currentState = this.getState();
    this.subscribers.forEach((callback) => callback(currentState));
  }

  // Entity management
  addEntity(entity: CombatEntity): void {
    if (!entity.cooldowns) {
      entity.cooldowns = {};
    }
    this.state.entities.push(entity);
    this.notifySubscribers();
  }

  removeEntity(entityId: string): void {
    this.state.entities = this.state.entities.filter((e) => e.id !== entityId);
    if (this.state.selectedEntityId === entityId) {
      this.state.selectedEntityId = undefined;
    }
    this.notifySubscribers();
  }

  updateEntity(entityId: string, updates: Partial<CombatEntity>): void {
    const entity = this.state.entities.find((e) => e.id === entityId);
    if (entity) {
      Object.assign(entity, updates);
      this.notifySubscribers();
    }
  }

  selectEntity(entityId: string | null): void {
    // Clear previous selection
    this.state.entities.forEach((e) => (e.isSelected = false));

    if (entityId) {
      const entity = this.state.entities.find((e) => e.id === entityId);
      if (entity) {
        entity.isSelected = true;
        this.state.selectedEntityId = entityId;
      }
    } else {
      this.state.selectedEntityId = undefined;
    }
    this.notifySubscribers();
  }

  // Immediate action execution (no queue)
  executeAttack(attackerId: string, targetId?: string): boolean {
    const attacker = this.state.entities.find((e) => e.id === attackerId);
    if (!attacker) return false;

    // Check cooldown for basic attack
    const now = Date.now();
    const lastAttack = attacker.cooldowns?.["basic_attack"] || 0;
    const attackCooldown = 800; // 800ms cooldown

    if (now < lastAttack + attackCooldown) {
      console.log(`Attack is on cooldown for ${attacker.name}`);
      return false;
    }

    // Set cooldown
    if (!attacker.cooldowns) attacker.cooldowns = {};
    attacker.cooldowns["basic_attack"] = now;

    if (!targetId) {
      console.log(`${attacker.name} swings at empty air!`);
      return true;
    }

    const target = this.state.entities.find((e) => e.id === targetId);
    if (!target) {
      console.log(`${attacker.name} swings at missing target!`);
      return true;
    }

    // Start combat if not already active
    if (!this.state.isInCombat) {
      this.startCombat();
    }

    const hitChance = calculateHitChance(attacker, target);
    const hits = Math.random() < hitChance;

    if (hits) {
      const damage = calculateDamage(attacker, target);
      target.hp = Math.max(0, target.hp - damage);

      console.log(`${attacker.name} hits ${target.name} for ${damage} damage! (HP: ${target.hp}/${target.maxHp})`);

      // Check if target is defeated
      if (target.hp <= 0) {
        console.log(`${target.name} is defeated!`);
        target.isAlive = false;
      }
    } else {
      console.log(`${attacker.name} misses ${target.name}!`);
    }

    this.updateCombatState();
    this.notifySubscribers();
    return true;
  }

  // Movement with immediate position update
  moveEntityToPosition(entityId: string, targetPosition: Position): void {
    const entity = this.state.entities.find((e) => e.id === entityId);
    if (!entity) return;

    // Update facing direction based on movement
    const dx = targetPosition.x - entity.position.x;
    const dy = targetPosition.y - entity.position.y;

    if (dx !== 0 || dy !== 0) {
      // Calculate angle in degrees (0° = North, pointing up)
      // atan2(dy, dx) gives us the angle from the positive x-axis
      // We need to adjust so that 0° points north (negative y direction)
      let angle = Math.atan2(dx, -dy) * (180 / Math.PI);

      // Normalize angle to 0-360
      if (angle < 0) {
        angle += 360;
      }

      entity.facing = Math.round(angle);
    }

    // Allow extended boundaries for room transitions
    entity.position.x = Math.max(-10, Math.min(110, targetPosition.x));
    entity.position.y = Math.max(-10, Math.min(110, targetPosition.y));

    this.notifySubscribers();
  }

  calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Combat state management
  startCombat(): void {
    if (!this.state.isInCombat) {
      this.state.isInCombat = true;
      this.state.combatStartTime = Date.now();
      console.log("Combat started");
    }
  }

  endCombat(): void {
    this.state.isInCombat = false;
    this.state.combatStartTime = undefined;
    console.log("Combat ended");
  }

  private updateCombatState(): void {
    const hostiles = this.getHostileEntities();
    const friendlies = this.getFriendlyEntities();

    // End combat if no hostiles remain or all friendlies are defeated
    if (this.state.isInCombat && (hostiles.length === 0 || friendlies.length === 0)) {
      this.endCombat();
    }
  }

  getHostileEntities(): CombatEntity[] {
    return this.state.entities.filter((e) => e.type === "hostile" && e.hp > 0);
  }

  getFriendlyEntities(): CombatEntity[] {
    return this.state.entities.filter(
      (e) => (e.type === "player" || e.type === "ally" || e.type === "neutral") && e.hp > 0
    );
  }

  // Cooldown checking
  canUseAction(entityId: string, actionId: string): boolean {
    const entity = this.state.entities.find((e) => e.id === entityId);
    if (!entity) return false;

    const now = Date.now();
    const lastUsed = entity.cooldowns?.[actionId] || 0;

    // Basic action cooldowns
    const cooldowns = {
      "basic_attack": 800,
      "move": 0,
      "dodge": 3000
    };

    const cooldown = cooldowns[actionId] || 1000;
    return now >= lastUsed + cooldown;
  }

  // Player initialization for room entry
  initializePlayer(position: { x: number; y: number }, crawlerData?: any): void {
    // Remove existing player if any
    this.removeEntity("player");

    if (!crawlerData) {
      console.error("No crawler data provided to initializePlayer");
      return;
    }

    const playerEntity: CombatEntity = {
      id: "player",
      name: crawlerData.name || "Player",
      type: "player",
      position: { x: position.x, y: position.y },
      
      // Health and Power Resources
      hp: crawlerData.currentHealth || crawlerData.maxHealth || 100,
      maxHp: crawlerData.maxHealth || 100,
      energy: crawlerData.currentEnergy || crawlerData.maxEnergy || 50,
      maxEnergy: crawlerData.maxEnergy || 50,
      power: crawlerData.currentPower || crawlerData.maxPower || 25,
      maxPower: crawlerData.maxPower || 25,
      
      // Primary Stats
      might: crawlerData.might || 10,
      agility: crawlerData.agility || 10,
      endurance: crawlerData.endurance || 10,
      intellect: crawlerData.intellect || 10,
      charisma: crawlerData.charisma || 10,
      wisdom: crawlerData.wisdom || 10,
      
      // Derived Combat Stats
      attack: crawlerData.attack || Math.floor((crawlerData.might || 10) * 1.2),
      defense: crawlerData.defense || Math.floor((crawlerData.endurance || 10) * 0.8),
      speed: Math.floor((crawlerData.agility || 10) * 1.1),
      accuracy: (crawlerData.wisdom || 10) + (crawlerData.intellect || 10),
      evasion: Math.floor((crawlerData.agility || 10) * 1.2),
      
      level: crawlerData.level || 1,
      serial: crawlerData.serial,
      facing: 0,
      isAlive: true,
      cooldowns: {}
    };

    this.state.entities.push(playerEntity);
    this.notifySubscribers();
  }

  // Room data management
  private currentRoomData: any = null;

  setCurrentRoomData(roomData: any): void {
    this.currentRoomData = roomData;
  }

  getCurrentRoomData(): any {
    return this.currentRoomData;
  }

  clearRoomData(): void {
    this.currentRoomData = null;
    // Keep only player when changing rooms
    this.state.entities = this.state.entities.filter((e) => e.id === "player");
    this.notifySubscribers();
  }
}

// Create and export singleton instance
export const combatSystem = new CombatSystem();