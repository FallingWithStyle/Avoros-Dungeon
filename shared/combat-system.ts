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
  id: string;
  name: string;
  type: "player" | "hostile" | "neutral" | "ally";
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  position: Position;
  facing?: number; // Direction in degrees
  level?: number;
  accuracy?: number;
  evasion?: number;
  isSelected?: boolean;
  cooldowns?: Record<string, number>;
  serial?: number;
  might?: number; // Strength stat for unarmed combat
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
      // Calculate angle in degrees (0° = North)
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      angle = angle - 90;

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
      hp: crawlerData.currentHealth || crawlerData.maxHealth || 100,
      maxHp: crawlerData.maxHealth || 100,
      attack: crawlerData.attack || 0,
      defense: crawlerData.defense || 0,
      speed: crawlerData.agility || 10,
      level: crawlerData.level || 1,
      accuracy: (crawlerData.wisdom || 5) + (crawlerData.intellect || 5),
      evasion: crawlerData.agility || 5,
      might: crawlerData.might || 5,
      facing: 0,
      isAlive: true,
      cooldowns: {},
      serial: crawlerData.serial
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