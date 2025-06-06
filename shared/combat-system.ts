
import { eventsSystem } from "./events-system";

export interface CombatEntity {
  id: string;
  name: string;
  type: "player" | "hostile" | "neutral";
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  position: { x: number; y: number };
  status: "alive" | "dead" | "stunned";
  lastAction?: string;
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
    this.state.entities.push(entity);
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

  queueAction(entityId: string, action: CombatAction, targetId?: string, targetPosition?: { x: number; y: number }) {
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

  // Clear all state
  reset() {
    this.state = {
      entities: [],
      selectedEntityId: null,
      turn: 0,
      phase: "planning",
      actionQueue: [],
      cooldowns: {},
    };
    this.notifyListeners();
  }
}

export const combatSystem = new CombatSystem();
