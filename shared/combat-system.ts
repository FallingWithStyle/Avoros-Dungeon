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
  facing?: number; // Changed to number for degrees
  level?: number;
  accuracy?: number;
  evasion?: number;
  isSelected?: boolean;
  cooldowns?: Record<string, number>;
  serial?: number;
  might?: number; // Strength stat for punch damage
  isAlive?: boolean;
  attackAnimation?: {
    type: 'punch' | 'punch_miss';
    targetId: string;
    timestamp: number;
    duration: number;
  };
}

// Combat action interface
export interface CombatAction {
  id: string;
  name: string;
  type: "attack" | "ability" | "move";
  cooldown: number;
  executionTime: number;
  range?: number;
  description?: string;
}

// Queued action interface
export interface QueuedAction {
  id: string;
  entityId: string;
  action: CombatAction;
  targetId?: string;
  targetPosition?: Position;
  queuedAt: number;
  executesAt: number;
}

// Combat state interface
export interface CombatState {
  entities: CombatEntity[];
  actionQueue: QueuedAction[];
  isInCombat: boolean;
  combatStartTime?: number;
  selectedEntityId?: string;
}

// Default combat actions
const DEFAULT_ACTIONS: CombatAction[] = [
  {
    id: "basic_attack",
    name: "Punch",
    type: "attack",
    cooldown: 800,
    executionTime: 300,
    range: 5,
    description: "A quick jab punch using your might",
  },
  {
    id: "move",
    name: "Move",
    type: "move",
    cooldown: 0,
    executionTime: 10,
    description: "Move to a target location",
  },
  {
    id: "dodge",
    name: "Dodge",
    type: "ability",
    cooldown: 3000,
    executionTime: 500,
    description: "Attempt to dodge incoming attacks",
  },
];

// Combat calculation functions
export function calculateDamage(attacker: any, defender: any): number {
  // For unarmed attacks, use might stat; otherwise use attack stat
  const might = attacker.might || 1;
  const weaponAttack = attacker.attack || 0;

  // If no weapon equipped (attack = 0), use might for punch damage
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
      (baseAccuracy + levelDiff) /
        (baseAccuracy + evasion + Math.abs(levelDiff)),
    ),
  );

  return hitChance;
}

// Combat System class
export class CombatSystem {
  private state: CombatState;
  private subscribers: Set<(state: CombatState) => void>;
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    this.state = {
      entities: [],
      actionQueue: [],
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

  // Action system
  queueAction(
    entityId: string,
    actionId: string,
    targetId?: string,
    targetPosition?: Position,
  ): boolean {
    const entity = this.state.entities.find((e) => e.id === entityId);
    if (!entity) return false;

    const action = DEFAULT_ACTIONS.find((a) => a.id === actionId);
    if (!action) return false;

    // Check cooldown
    const now = Date.now();
    const lastUsed = entity.cooldowns?.[actionId] || 0;
    if (now < lastUsed + action.cooldown) {
      console.log(`Action ${actionId} is on cooldown for entity ${entityId}`);
      return false;
    }

    // Create queued action
    const queuedAction: QueuedAction = {
      id: `${entityId}_${actionId}_${now}`,
      entityId,
      action,
      targetId,
      targetPosition,
      queuedAt: now,
      executesAt: now + action.executionTime,
    };

    this.state.actionQueue.push(queuedAction);

    // Set cooldown AFTER successful queueing
    if (!entity.cooldowns) entity.cooldowns = {};
    entity.cooldowns[actionId] = now;

    // Start processing if not already running
    this.startCombatProcessing();

    console.log(`Queued action ${actionId} for entity ${entityId}`);
    this.notifySubscribers();
    return true;
  }

  queueMoveAction(entityId: string, targetPosition: Position): boolean {
    return this.queueAction(entityId, "move", undefined, targetPosition);
  }

  getAvailableActions(entityId: string): CombatAction[] {
    const entity = this.state.entities.find((e) => e.id === entityId);
    if (!entity) return [];

    const now = Date.now();
    return DEFAULT_ACTIONS.filter((action) => {
      const lastUsed = entity.cooldowns?.[action.id] || 0;
      return now >= lastUsed + action.cooldown;
    });
  }

  // Combat processing
  startCombatProcessing(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(() => {
      this.processCombatTick();
    }, 100);
  }

  stopCombatProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  processCombatTick(): void {
    const now = Date.now();
    const readyActions = this.state.actionQueue.filter(
      (action) => action.executesAt <= now,
    );

    for (const action of readyActions) {
      this.executeAction(action);
    }

    // Remove executed actions
    this.state.actionQueue = this.state.actionQueue.filter(
      (action) => action.executesAt > now,
    );

    // Stop processing if queue is empty
    if (this.state.actionQueue.length === 0) {
      this.stopCombatProcessing();
    }

    // Check for combat state changes
    this.updateCombatState();

    if (readyActions.length > 0 || this.state.actionQueue.length === 0) {
      this.notifySubscribers();
    }
  }

  private executeAction(queuedAction: QueuedAction): void {
    const entity = this.state.entities.find(
      (e) => e.id === queuedAction.entityId,
    );
    if (!entity) return;

    switch (queuedAction.action.type) {
      case "move":
        if (queuedAction.targetPosition) {
          this.moveEntityToPosition(
            queuedAction.entityId,
            queuedAction.targetPosition,
          );
        }
        break;

      case "attack":
        if (queuedAction.targetId) {
          this.executeAttack(queuedAction.entityId, queuedAction.targetId);
        }
        break;

      case "ability":
        this.executeAbility(queuedAction.entityId, queuedAction.action.id);
        break;
    }
  }

  private executeAttack(attackerId: string, targetId?: string): void {
    const attacker = this.state.entities.find((e) => e.id === attackerId);

    if (!attacker) return;

    // If no target, just show punch animation into empty air
    if (!targetId) {
      console.log(`${attacker.name} swings at empty air!`);

      this.updateEntity(attackerId, {
        ...attacker,
        attackAnimation: {
          type: 'punch_miss',
          targetId: '',
          timestamp: Date.now(),
          duration: 200
        }
      });
      return;
    }

    const target = this.state.entities.find((e) => e.id === targetId);
    if (!target) {
      // Target doesn't exist, show miss animation
      console.log(`${attacker.name} swings at missing target!`);

      this.updateEntity(attackerId, {
        ...attacker,
        attackAnimation: {
          type: 'punch_miss',
          targetId: targetId,
          timestamp: Date.now(),
          duration: 200
        }
      });
      return;
    }

    // Start combat if not already in combat
    if (!this.state.isInCombat) {
      this.startCombat();
    }

    const hitChance = calculateHitChance(attacker, target);
    const hits = Math.random() < hitChance;

    if (hits) {
      const damage = calculateDamage(attacker, target);
      target.hp = Math.max(0, target.hp - damage);

      // Add attack animation data to the attacker
      this.updateEntity(attackerId, {
        ...attacker,
        attackAnimation: {
          type: 'punch',
          targetId: targetId,
          timestamp: Date.now(),
          duration: 300 // 300ms animation
        }
      });

      console.log(`${attacker.name} punches ${target.name} for ${damage} damage! (HP: ${target.hp}/${target.maxHp})`);

      // Check if target is defeated
      if (target.hp <= 0) {
        console.log(`${target.name} is defeated!`);
        target.isAlive = false;
      }
    } else {
      console.log(`${attacker.name} swings at ${target.name} but misses!`);

      // Add miss animation
      this.updateEntity(attackerId, {
        ...attacker,
        attackAnimation: {
          type: 'punch_miss',
          targetId: targetId,
          timestamp: Date.now(),
          duration: 200
        }
      });
    }
  }

  private executeAbility(entityId: string, abilityId: string): void {
    const entity = this.state.entities.find((e) => e.id === entityId);
    if (!entity) return;

    console.log(`${entity.name} uses ${abilityId}`);
    // Implement specific ability effects here
  }

  // Position and movement
  moveEntityToPosition(entityId: string, targetPosition: Position): void {
    const entity = this.state.entities.find((e) => e.id === entityId);
    if (!entity) return;

    // Update facing direction
    const dx = targetPosition.x - entity.position.x;
    const dy = targetPosition.y - entity.position.y;

    // Calculate angle in degrees from movement vector
    // Convert from mathematical angle (0° = East) to game angle (0° = North)
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = angle - 90;

    // Normalize angle to be between 0 and 360
    if (angle < 0) {
      angle += 360;
    }

    entity.facing = Math.round(angle);

    // Allow extended boundaries for door crossings, but clamp to reasonable limits
    // This allows movement beyond normal room boundaries for door transitions
    entity.position.x = Math.max(-10, Math.min(110, targetPosition.x));
    entity.position.y = Math.max(-10, Math.min(110, targetPosition.y));

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
      this.startCombatProcessing();
      console.log("Combat started");
    }
  }

  endCombat(): void {
    this.state.isInCombat = false;
    this.state.combatStartTime = undefined;
    this.stopCombatProcessing();
    console.log("Combat ended");
  }

  private updateCombatState(): void {
    const hostiles = this.getHostileEntities();
    const friendlies = this.getFriendlyEntities();

    // End combat if no hostiles remain or all friendlies are defeated
    if (
      this.state.isInCombat &&
      (hostiles.length === 0 || friendlies.length === 0)
    ) {
      this.endCombat();
    }
  }

  getHostileEntities(): CombatEntity[] {
    return this.state.entities.filter((e) => e.type === "hostile" && e.hp > 0);
  }

  getFriendlyEntities(): CombatEntity[] {
    return this.state.entities.filter(
      (e) =>
        (e.type === "player" || e.type === "ally" || e.type === "neutral") &&
        e.hp > 0,
    );
  }

  // Room data management for tactical view
  private currentRoomData: any = null;

  setCurrentRoomData(roomData: any): void {
    this.currentRoomData = roomData;
    console.log(
      "Combat system room data updated:",
      roomData?.room?.name || "Unknown",
    );
  }

  getCurrentRoomData(): any {
    return this.currentRoomData;
  }

  // Clear room data when changing rooms
  clearRoomData(): void {
    this.currentRoomData = null;
    // Clear entities except player when changing rooms
    this.state.entities = this.state.entities.filter((e) => e.id === "player");
    this.notifySubscribers();
  }

  private processActionQueue() {
    if (this.state.actionQueue.length === 0) return;

    // Process all queued actions in order
    const actionsToProcess = [...this.state.actionQueue];
    this.state.actionQueue = []; // Clear queue immediately to prevent re-processing

    actionsToProcess.forEach((action) => {
      console.log(`Processing queued action:`, action);

      if (action.type === "move") {
        const entity = this.state.entities.find(
          (e) => e.id === action.entityId,
        );
        if (entity) {
          entity.position = { ...action.position };
        } else {
          console.warn(
            `Entity ${action.entityId} not found for queued move action`,
          );
        }
      }
    });

    // Emit state change only once after processing all actions
    if (actionsToProcess.length > 0) {
      this.notifySubscribers();
    }
  }

  initializePlayer(position: { x: number; y: number }, crawlerData?: any): void {
    // Remove existing player if any
    this.removeEntity("player");

    if (!crawlerData) {
      console.error("No crawler data provided to initializePlayer");
      return;
    }

    const playerName = crawlerData.name || "Player";
    const playerSerial = crawlerData.serial;

    // Create player entity using real crawler stats
    const playerEntity: CombatEntity = {
      id: "player",
      name: playerName,
      type: "player",
      position: { x: position.x, y: position.y },
      hp: crawlerData.currentHealth || crawlerData.maxHealth || 100,
      maxHp: crawlerData.maxHealth || 100,
      attack: crawlerData.attack || 0, // Weapon attack, separate from might
      defense: crawlerData.defense || 0, // Armor defense, separate from endurance
      speed: crawlerData.agility || 10,
      level: crawlerData.level || 1,
      accuracy: (crawlerData.wisdom || 5) + (crawlerData.intellect || 5),
      evasion: crawlerData.agility || 5,
      might: crawlerData.might || 5, // For unarmed combat damage
      facing: 0,
      isAlive: true,
      cooldowns: {},
      serial: playerSerial
    };

    this.state.entities.push(playerEntity);
    this.notifySubscribers();
  }

  private emitStateChange(): void {
    this.notifySubscribers();
  }
}

// Create and export singleton instance
export const combatSystem = new CombatSystem();