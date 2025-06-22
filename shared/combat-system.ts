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

  // Equipment
  equippedWeapon?: any; // Equipment interface from schema

  // Action management
  cooldowns?: Record<string, number>;

  // State flags
  isSelected?: boolean;
  isAlive?: boolean;

  // Visual attack animation
  attackAnimation?: {
    type: "melee" | "ranged" | "magic";
    timestamp: number;
    duration: number;
    targetPosition: Position;
  };
  lastDamageTime?: number;
}

export interface CombatActionLog {
  id: string;
  timestamp: number;
  entityId: string;
  entityName: string;
  action: string;
  target?: string;
  weapon?: string;
  toHitRoll?: number;
  toHitTarget?: number;
  damage?: number;
  damageRoll?: string;
  result: "hit" | "miss" | "critical" | "moved" | "other";
  description: string;
}

export interface CombatState {
  entities: CombatEntity[];
  isInCombat: boolean;
  selectedEntityId?: string;
  actionLog: CombatActionLog[];
}

// Combat calculation functions
export function calculateDamage(attacker: any, defender: any): number {
  const might = attacker.might || 1;
  let baseDamage = 0;

  // Calculate damage based on equipped weapon
  if (attacker.equippedWeapon) {
    // Use weapon's damage attribute to determine base damage
    const damageAttribute = attacker.equippedWeapon.damageAttribute || "might";
    let attributeValue = 0;

    switch (damageAttribute) {
      case "might":
        attributeValue = attacker.might || 1;
        break;
      case "agility":
        attributeValue = attacker.agility || 1;
        break;
      case "intellect":
        attributeValue = attacker.intellect || 1;
        break;
      case "wisdom":
        attributeValue = attacker.wisdom || 1;
        break;
      default:
        attributeValue = attacker.might || 1;
    }

    // Base weapon damage + attribute modifier + weapon bonus
    const weaponBonus = attacker.equippedWeapon.mightBonus || 0;
    baseDamage = Math.floor(attributeValue * 0.8) + 3 + weaponBonus; // Weapon base damage
  } else {
    // Unarmed combat - reduced damage
    baseDamage = Math.floor(might * 0.4) + 1;
  }

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
  private state: CombatState = {
    entities: [],
    isInCombat: false,
    selectedEntityId: undefined,
    actionLog: [],
  };
  private subscribers: Set<(state: CombatState) => void>;

  constructor() {
    this.subscribers = new Set();
  }

  // State management
  getState(): CombatState {
    return { ...this.state, entities: [...this.state.entities], actionLog: [...this.state.actionLog] };
  }

  subscribe(callback: (state: CombatState) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const currentState = this.getState();
    this.subscribers.forEach((callback) => callback(currentState));
  }

  private addActionLog(log: Omit<CombatActionLog, 'id' | 'timestamp'>) {
    const actionLog: CombatActionLog = {
      ...log,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Add to beginning of array (most recent first)
    this.state.actionLog.unshift(actionLog);

    // Keep only last 50 actions to prevent memory issues
    if (this.state.actionLog.length > 50) {
      this.state.actionLog = this.state.actionLog.slice(0, 50);
    }
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

  executeAttack(attackerId: string, targetId?: string): boolean {
    const attacker = this.state.entities.find(e => e.id === attackerId);
    if (!attacker) return false;

    // Check cooldown
    const now = Date.now();
    const lastAttack = attacker.cooldowns?.basic_attack || 0;
    const attackCooldown = 800; // 800ms cooldown

    if (now - lastAttack < attackCooldown) {
      return false; // Still on cooldown
    }

    // Get weapon info
    const weapon = (attacker as any).equippedWeapon;
    const weaponRange = weapon ? (weapon.range || weapon.baseRange || 1) : 1; // Unarmed range = 1
    const rangeInGridUnits = weaponRange * 10; // Convert to grid units (1 range = 10 grid units)
    const weaponName = weapon ? weapon.name : "Fists";

    // Find all potential targets in range
    let primaryTarget: CombatEntity | undefined;
    let allTargetsInRange: CombatEntity[] = [];

    if (targetId) {
      // Specific target was provided
      primaryTarget = this.state.entities.find(e => e.id === targetId);
      if (!primaryTarget || primaryTarget.hp <= 0) return false;

      const distance = this.calculateDistance(attacker.position, primaryTarget.position);
      if (distance > rangeInGridUnits) {
        // Primary target is out of range
        this.addActionLog({
          entityId: attackerId,
          entityName: attacker.name,
          action: "Attack Failed",
          target: primaryTarget.name,
          weapon: weaponName,
          result: "miss",
          description: `${attacker.name} cannot reach ${primaryTarget.name} - target is out of range (${Math.round(distance)} > ${rangeInGridUnits})`,
        });
        return false;
      }

      // For targeted attacks, only hit the specific target (even if it's hostile)
      // This ensures neutral/friendly entities must be explicitly targeted
      allTargetsInRange = [primaryTarget];
    } else {
      // No specific target - area attack against all hostile entities in range
      const hostileEntitiesInRange = this.state.entities.filter(entity => {
        if (entity.id === attackerId || entity.hp <= 0 || entity.type !== "hostile") {
          return false;
        }
        const distance = this.calculateDistance(attacker.position, entity.position);
        return distance <= rangeInGridUnits;
      });

      if (hostileEntitiesInRange.length === 0) {
        // No hostile targets in range
        this.addActionLog({
          entityId: attackerId,
          entityName: attacker.name,
          action: "Attack Failed",
          weapon: weaponName,
          result: "miss",
          description: `${attacker.name} swings ${weaponName} but there are no hostile targets in range`,
        });
        return false;
      }

      allTargetsInRange = hostileEntitiesInRange;
      primaryTarget = hostileEntitiesInRange[0]; // Use first target for animation positioning
    }

    // Determine attack animation type based on equipped weapon
    let animationType: "melee" | "ranged" | "magic" = "melee";
    if (attacker.equippedWeapon) {
      const weaponName = attacker.equippedWeapon.name.toLowerCase();
      const weaponType = attacker.equippedWeapon.weapon_type?.toLowerCase() || "";
      
      if (weaponName.includes("bow") || weaponType.includes("bow") || weaponName.includes("crossbow")) {
        animationType = "ranged";
      } else if (weaponName.includes("staff") || weaponType.includes("staff") || 
                 weaponName.includes("wand") || weaponName.includes("wizard") || 
                 attacker.equippedWeapon.damageAttribute === "intellect") {
        animationType = "magic";
      }
    }

    // Add attack animation to attacker (using primary target for positioning)
    attacker.attackAnimation = {
      type: animationType,
      timestamp: Date.now(),
      duration: animationType === "ranged" ? 800 : animationType === "magic" ? 1000 : 600,
      targetPosition: primaryTarget!.position
    };

    // Update cooldown
    if (!attacker.cooldowns) attacker.cooldowns = {};
    attacker.cooldowns.basic_attack = now;

    // Execute attack against all targets in range
    let hitCount = 0;
    let totalDamage = 0;
    const attackResults: string[] = [];

    for (const target of allTargetsInRange) {
      // Calculate to-hit chance for each target
      const attackerAccuracy = attacker.accuracy || 20;
      const targetEvasion = target.evasion || 10;
      const toHitTarget = Math.max(5, Math.min(95, attackerAccuracy - targetEvasion + 50)); // Base 50% + modifiers
      const toHitRoll = Math.floor(Math.random() * 100) + 1;

      let finalDamage = 0;
      let result: "hit" | "miss" | "critical" = "miss";
      let damageRoll = "";
      let description = "";

      if (toHitRoll <= toHitTarget) {
        // Hit! Calculate damage
        const baseDamage = attacker.attack || 10;
        const weaponBonus = weapon?.mightBonus || 0;
        const rawDamage = baseDamage + weaponBonus;

        // Critical hit check (natural 95+ or if roll is 20+ over target evasion)
        const isCritical = toHitRoll >= 95 || toHitRoll >= (toHitTarget + 20);

        if (isCritical) {
          finalDamage = Math.max(1, (rawDamage * 2) - (target.defense || 0));
          result = "critical";
          damageRoll = `${rawDamage} x2 - ${target.defense || 0} = ${finalDamage}`;
          description = `${attacker.name} scores a critical hit on ${target.name} with ${weaponName} for ${finalDamage} damage!`;
        } else {
          finalDamage = Math.max(1, rawDamage - (target.defense || 0));
          result = "hit";
          damageRoll = `${rawDamage} - ${target.defense || 0} = ${finalDamage}`;
          description = `${attacker.name} hits ${target.name} with ${weaponName} for ${finalDamage} damage`;
        }

        // Apply damage to target
        target.hp = Math.max(0, target.hp - finalDamage);
        target.lastDamageTime = Date.now(); // Track when damage was applied for hit effects
        
        hitCount++;
        totalDamage += finalDamage;
        attackResults.push(`${target.name}: ${finalDamage} damage`);

        // Check if target died
        if (target.hp <= 0) {
          target.isAlive = false;
          this.addActionLog({
            entityId: target.id,
            entityName: target.name,
            action: "Defeated",
            result: "other",
            description: `${target.name} has been defeated!`,
          });
        }
      } else {
        // Miss
        result = "miss";
        description = `${attacker.name} misses ${target.name} with ${weaponName}`;
        attackResults.push(`${target.name}: missed`);
      }

      // Log each individual attack
      this.addActionLog({
        entityId: attackerId,
        entityName: attacker.name,
        action: "Attack",
        target: target.name,
        weapon: weaponName,
        toHitRoll,
        toHitTarget,
        damage: finalDamage > 0 ? finalDamage : undefined,
        damageRoll: damageRoll || undefined,
        result,
        description,
      });
    }

    // Log summary if multiple targets were hit
    if (allTargetsInRange.length > 1) {
      const summaryDescription = hitCount > 0 
        ? `${attacker.name} strikes with ${weaponName} hitting ${hitCount}/${allTargetsInRange.length} targets for ${totalDamage} total damage (${attackResults.join(", ")})`
        : `${attacker.name} swings ${weaponName} but misses all targets (${attackResults.join(", ")})`;

      this.addActionLog({
        entityId: attackerId,
        entityName: attacker.name,
        action: "Area Attack",
        weapon: weaponName,
        result: hitCount > 0 ? "hit" : "miss",
        description: summaryDescription,
      });
    }

    this.notifySubscribers();
    return true;
  }

  // Movement with immediate position update
  moveEntityToPosition(entityId: string, position: Position): boolean {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return false;

    const oldPosition = { ...entity.position };
    entity.position = { ...position };

    // Log movement
    this.addActionLog({
      entityId,
      entityName: entity.name,
      action: "Move",
      result: "moved",
      description: `${entity.name} moved from (${Math.round(oldPosition.x)}, ${Math.round(oldPosition.y)}) to (${Math.round(position.x)}, ${Math.round(position.y)})`,
    });

    this.notifySubscribers();
    return true;
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