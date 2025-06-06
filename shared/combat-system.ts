
import { eventsSystem } from "./events-system";

export interface CombatEntity {
  id: string;
  name: string;
  type: "player" | "hostile" | "neutral";
  health: number;
  maxHealth: number;
  hp?: number; // Alias for health for compatibility
  maxHp?: number; // Alias for maxHealth for compatibility
  attack: number;
  defense: number;
  speed: number;
  position: { x: number; y: number };
  status?: "alive" | "dead" | "stunned";
  lastAction?: string;
  isSelected?: boolean;
  entryDirection?: "north" | "south" | "east" | "west" | null;
  cooldowns?: Record<string, number>;
}

export interface CombatAction {
  id: string;
  name: string;
  type: "attack" | "move" | "defend" | "special";
  energyCost: number;
  damage?: number;
  range?: number;
  cooldown?: number;
  description?: string;
}

export interface CombatState {
  entities: CombatEntity[];
  selectedEntityId: string | null;
  turn: number;
  phase: "planning" | "executing" | "complete";
  isInCombat: boolean;
  actionQueue: Array<{
    entityId: string;
    action: CombatAction;
    targetId?: string;
    targetPosition?: { x: number; y: number };
  }>;
  cooldowns: Record<string, Record<string, number>>; // entityId -> actionId -> turnsRemaining
}

type StateChangeListener = (state: CombatState) => void;

class CombatSystem {
  private state: CombatState = {
    entities: [],
    selectedEntityId: null,
    turn: 0,
    phase: "planning",
    isInCombat: false,
    actionQueue: [],
    cooldowns: {},
  };

  private listeners: Set<StateChangeListener> = new Set();

  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    // Send current state immediately
    listener(this.state);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  getState(): CombatState {
    return { ...this.state };
  }

  initializeEntities(entities: CombatEntity[]) {
    this.state.entities = entities;
    this.state.selectedEntityId = null;
    this.state.turn = 0;
    this.state.phase = "planning";
    this.state.actionQueue = [];
    this.state.cooldowns = {};
    this.notifyListeners();
  }

  selectEntity(entityId: string | null) {
    // Update isSelected state for all entities
    this.state.entities.forEach(entity => {
      entity.isSelected = entity.id === entityId;
    });
    
    this.state.selectedEntityId = entityId;
    this.notifyListeners();
  }

  getSelectedEntity(): CombatEntity | null {
    if (!this.state.selectedEntityId) return null;
    return this.state.entities.find(e => e.id === this.state.selectedEntityId) || null;
  }

  getEntity(entityId: string): CombatEntity | null {
    return this.state.entities.find(e => e.id === entityId) || null;
  }

  addEntity(entity: CombatEntity) {
    // Remove existing entity with same ID if exists
    this.state.entities = this.state.entities.filter(e => e.id !== entity.id);
    
    // Sync hp/health properties
    if (entity.hp !== undefined && entity.health === undefined) {
      entity.health = entity.hp;
    }
    if (entity.maxHp !== undefined && entity.maxHealth === undefined) {
      entity.maxHealth = entity.maxHp;
    }
    if (entity.health !== undefined && entity.hp === undefined) {
      entity.hp = entity.health;
    }
    if (entity.maxHealth !== undefined && entity.maxHp === undefined) {
      entity.maxHp = entity.maxHealth;
    }
    
    // Set default status
    if (!entity.status) {
      entity.status = "alive";
    }
    
    // Check if this entity is currently selected
    entity.isSelected = this.state.selectedEntityId === entity.id;
    
    this.state.entities.push(entity);
    this.updateCombatState();
    this.notifyListeners();
  }

  updateEntity(entityId: string, updates: Partial<CombatEntity>) {
    const entityIndex = this.state.entities.findIndex(e => e.id === entityId);
    if (entityIndex !== -1) {
      this.state.entities[entityIndex] = { ...this.state.entities[entityIndex], ...updates };
      this.notifyListeners();
    }
  }

  removeEntity(entityId: string) {
    this.state.entities = this.state.entities.filter(e => e.id !== entityId);
    if (this.state.selectedEntityId === entityId) {
      this.state.selectedEntityId = null;
    }
    this.notifyListeners();
  }

  queueAction(entityId: string, actionIdOrAction: string | CombatAction, targetId?: string, targetPosition?: { x: number; y: number }) {
    let action: CombatAction;
    
    if (typeof actionIdOrAction === 'string') {
      // Get action from definitions
      const actionDef = this.actionDefinitions?.get(actionIdOrAction);
      if (!actionDef) {
        console.warn(`Action ${actionIdOrAction} not found in definitions`);
        return false;
      }
      action = actionDef;
    } else {
      action = actionIdOrAction;
    }

    // Check if action is on cooldown
    const cooldowns = this.state.cooldowns[entityId] || {};
    if (cooldowns[action.id] && cooldowns[action.id] > 0) {
      return false; // Action is on cooldown
    }

    // Remove existing action for this entity
    this.state.actionQueue = this.state.actionQueue.filter(qa => qa.entityId !== entityId);
    
    // Add new action
    this.state.actionQueue.push({
      entityId,
      action,
      targetId,
      targetPosition
    });

    // Notify events system
    if (typeof eventsSystem !== 'undefined' && eventsSystem.onCombatAction) {
      eventsSystem.onCombatAction(action, entityId, targetId, action.damage);
    }

    this.notifyListeners();
    return true;
  }

  executeActions() {
    this.state.phase = "executing";
    
    // Sort actions by entity speed (faster entities go first)
    const sortedActions = [...this.state.actionQueue].sort((a, b) => {
      const entityA = this.getEntity(a.entityId);
      const entityB = this.getEntity(b.entityId);
      return (entityB?.speed || 0) - (entityA?.speed || 0);
    });

    // Execute each action
    for (const queuedAction of sortedActions) {
      this.executeAction(queuedAction);
    }

    // Clear action queue and advance turn
    this.state.actionQueue = [];
    this.state.turn += 1;
    this.state.phase = "planning";

    // Reduce cooldowns
    this.reduceCooldowns();

    this.notifyListeners();
  }

  private executeAction(queuedAction: any) {
    const entity = this.getEntity(queuedAction.entityId);
    if (!entity || entity.status !== "alive") return;

    const { action, targetId, targetPosition } = queuedAction;

    switch (action.type) {
      case "attack":
        if (targetId) {
          this.executeAttack(entity, targetId, action);
        }
        break;
      case "move":
        if (targetPosition) {
          this.executeMove(entity, targetPosition);
        }
        break;
      case "defend":
        this.executeDefend(entity);
        break;
      case "special":
        this.executeSpecialAction(entity, action, targetId, targetPosition);
        break;
    }

    // Set cooldown if action has one
    if (action.cooldown && action.cooldown > 0) {
      if (!this.state.cooldowns[entity.id]) {
        this.state.cooldowns[entity.id] = {};
      }
      this.state.cooldowns[entity.id][action.id] = action.cooldown;
    }

    // Update last action
    entity.lastAction = action.name;
  }

  private executeAttack(attacker: CombatEntity, targetId: string, action: CombatAction) {
    const target = this.getEntity(targetId);
    if (!target || target.status !== "alive") return;

    // Calculate damage
    const baseDamage = action.damage || attacker.attack;
    const defense = target.defense || 0;
    const finalDamage = Math.max(1, baseDamage - defense);

    // Apply damage
    target.health = Math.max(0, target.health - finalDamage);
    
    if (target.health <= 0) {
      target.status = "dead";
    }

    this.updateEntity(targetId, target);
  }

  private executeMove(entity: CombatEntity, targetPosition: { x: number; y: number }) {
    entity.position = { ...targetPosition };
    this.updateEntity(entity.id, entity);
  }

  private executeDefend(entity: CombatEntity) {
    // Defending could provide temporary defense bonus or other effects
    // For now, just mark that they defended
    entity.lastAction = "Defend";
  }

  private executeSpecialAction(entity: CombatEntity, action: CombatAction, targetId?: string, targetPosition?: { x: number; y: number }) {
    // Handle special actions based on action ID or other properties
    switch (action.id) {
      case "heal":
        entity.health = Math.min(entity.maxHealth, entity.health + (action.damage || 20));
        this.updateEntity(entity.id, entity);
        break;
      // Add more special actions as needed
    }
  }

  private reduceCooldowns() {
    for (const entityId in this.state.cooldowns) {
      for (const actionId in this.state.cooldowns[entityId]) {
        this.state.cooldowns[entityId][actionId] = Math.max(0, this.state.cooldowns[entityId][actionId] - 1);
      }
    }
  }

  getCooldown(entityId: string, actionId: string): number {
    return this.state.cooldowns[entityId]?.[actionId] || 0;
  }

  getAvailableActions(entityId: string): CombatAction[] {
    const entity = this.getEntity(entityId);
    if (!entity) return [];

    // Base actions available to all entities
    const baseActions: CombatAction[] = [
      {
        id: "move",
        name: "Move",
        type: "move",
        energyCost: 1,
        description: "Move to a new position"
      },
      {
        id: "basic_attack",
        name: "Basic Attack",
        type: "attack",
        energyCost: 2,
        damage: entity.attack,
        range: 1,
        description: "A standard melee attack"
      },
      {
        id: "defend",
        name: "Defend",
        type: "defend",
        energyCost: 1,
        description: "Take a defensive stance"
      }
    ];

    // Add entity-specific actions based on type or abilities
    if (entity.type === "player") {
      baseActions.push(
        {
          id: "heavy_attack",
          name: "Heavy Attack",
          type: "attack",
          energyCost: 4,
          damage: Math.floor(entity.attack * 1.5),
          range: 1,
          cooldown: 2,
          description: "A powerful attack that deals extra damage"
        },
        {
          id: "ranged_attack",
          name: "Ranged Attack",
          type: "attack",
          energyCost: 3,
          damage: Math.floor(entity.attack * 0.8),
          range: 3,
          description: "Attack from a distance"
        }
      );
    }

    return baseActions;
  }

  isInRange(sourcePos: { x: number; y: number }, targetPos: { x: number; y: number }, range: number): boolean {
    const distance = Math.abs(sourcePos.x - targetPos.x) + Math.abs(sourcePos.y - targetPos.y);
    return distance <= range;
  }

  getValidTargets(entityId: string, action: CombatAction): CombatEntity[] {
    const entity = this.getEntity(entityId);
    if (!entity) return [];

    const range = action.range || 1;
    
    return this.state.entities.filter(target => {
      if (target.id === entityId) return false; // Can't target self
      if (target.status !== "alive") return false; // Can't target dead entities
      
      // Check if target is in range
      if (!this.isInRange(entity.position, target.position, range)) return false;

      // For attacks, can target hostile entities (or all if player)
      if (action.type === "attack") {
        if (entity.type === "player") {
          return target.type === "hostile";
        } else if (entity.type === "hostile") {
          return target.type === "player";
        }
      }

      return true;
    });
  }

  // Get hostile entities
  getHostileEntities(): CombatEntity[] {
    return this.state.entities.filter(entity => entity.type === "hostile" && entity.status === "alive");
  }

  // Get friendly entities (player and allies)
  getFriendlyEntities(): CombatEntity[] {
    return this.state.entities.filter(entity => 
      (entity.type === "player" || entity.type === "neutral") && entity.status === "alive"
    );
  }

  // Get all entities by type
  getEntitiesByType(type: "player" | "hostile" | "neutral"): CombatEntity[] {
    return this.state.entities.filter(entity => entity.type === type && entity.status === "alive");
  }

  // Calculate distance between two positions
  calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Queue a move action (simplified version)
  queueMoveAction(entityId: string, targetPosition: { x: number; y: number }): boolean {
    const moveAction: CombatAction = {
      id: "move",
      name: "Move",
      type: "move",
      energyCost: 1,
      description: "Move to a new position"
    };

    return this.queueAction(entityId, moveAction, undefined, targetPosition);
  }

  // Action definitions map for cooldowns and properties
  actionDefinitions?: Map<string, any> = new Map([
    ["move", { id: "move", name: "Move", type: "move", cooldown: 1000, executionTime: 800 }],
    ["basic_attack", { id: "basic_attack", name: "Basic Attack", type: "attack", cooldown: 2000, damage: 20, range: 15, executionTime: 1000 }],
    ["heavy_attack", { id: "heavy_attack", name: "Heavy Attack", type: "attack", cooldown: 3000, damage: 30, range: 15, executionTime: 1200 }],
    ["ranged_attack", { id: "ranged_attack", name: "Ranged Attack", type: "attack", cooldown: 2500, damage: 18, range: 25, executionTime: 1000 }],
    ["defend", { id: "defend", name: "Defend", type: "ability", cooldown: 1500, executionTime: 500 }],
    ["ability1", { id: "ability1", name: "Ability 1", type: "ability", cooldown: 4000, executionTime: 1500 }],
    ["ability2", { id: "ability2", name: "Ability 2", type: "ability", cooldown: 5000, executionTime: 2000 }],
    ["ability3", { id: "ability3", name: "Ability 3", type: "ability", cooldown: 6000, executionTime: 2500 }],
    ["wait", { id: "wait", name: "Wait", type: "ability", cooldown: 500, executionTime: 1000 }]
  ]);

  // Update combat state based on current entities
  private updateCombatState() {
    this.state.isInCombat = this.getHostileEntities().length > 0;
  }

  // Check if combat is active
  get isInCombat(): boolean {
    return this.state.isInCombat;
  }

  // Clear all state
  reset() {
    this.state = {
      entities: [],
      selectedEntityId: null,
      turn: 0,
      phase: "planning",
      isInCombat: false,
      actionQueue: [],
      cooldowns: {},
    };
    this.notifyListeners();
  }
}

export const combatSystem = new CombatSystem();
