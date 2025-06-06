
export interface CombatEntity {
  id: string;
  name: string;
  type: 'player' | 'hostile' | 'neutral' | 'npc';
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  position: { x: number; y: number };
  isSelected?: boolean;
  cooldowns?: Record<string, number>;
  effects?: string[];
}

export interface CombatAction {
  id: string;
  name: string;
  type: 'attack' | 'ability' | 'item' | 'move';
  cooldown: number;
  damage?: number;
  range?: number;
  targetType: 'single' | 'area' | 'self';
  executionTime: number; // in milliseconds
}

export interface CombatState {
  entities: CombatEntity[];
  selectedEntityId: string | null;
  actionQueue: QueuedAction[];
  isInCombat: boolean;
  combatStartTime?: number;
}

export interface QueuedAction {
  entityId: string;
  action: CombatAction;
  targetId?: string;
  targetPosition?: { x: number; y: number };
  queuedAt: number;
  executesAt: number;
}

export class CombatSystem {
  private state: CombatState;
  private actionDefinitions: Map<string, CombatAction>;
  private listeners: Set<(state: CombatState) => void> = new Set();

  constructor() {
    this.state = {
      entities: [],
      selectedEntityId: null,
      actionQueue: [],
      isInCombat: false,
    };

    this.actionDefinitions = new Map([
      ['basic_attack', {
        id: 'basic_attack',
        name: 'Attack',
        type: 'attack',
        cooldown: 2000,
        damage: 20,
        range: 1,
        targetType: 'single',
        executionTime: 1000,
      }],
      ['dodge', {
        id: 'dodge',
        name: 'Dodge',
        type: 'ability',
        cooldown: 3000,
        targetType: 'self',
        executionTime: 500,
      }],
      ['heavy_attack', {
        id: 'heavy_attack',
        name: 'Heavy Attack',
        type: 'attack',
        cooldown: 5000,
        damage: 40,
        range: 1,
        targetType: 'single',
        executionTime: 2000,
      }],
    ]);
  }

  // State management
  subscribe(listener: (state: CombatState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  getState(): CombatState {
    return { ...this.state };
  }

  // Entity management
  addEntity(entity: CombatEntity): void {
    this.state.entities.push({ ...entity, cooldowns: {} });
    this.notifyListeners();
  }

  removeEntity(entityId: string): void {
    this.state.entities = this.state.entities.filter(e => e.id !== entityId);
    if (this.state.selectedEntityId === entityId) {
      this.state.selectedEntityId = null;
    }
    this.notifyListeners();
  }

  updateEntity(entityId: string, updates: Partial<CombatEntity>): void {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (entity) {
      Object.assign(entity, updates);
      this.notifyListeners();
    }
  }

  selectEntity(entityId: string | null): void {
    // Deselect previous entity
    this.state.entities.forEach(e => e.isSelected = false);
    
    // Select new entity
    if (entityId) {
      const entity = this.state.entities.find(e => e.id === entityId);
      if (entity) {
        entity.isSelected = true;
      }
    }
    
    this.state.selectedEntityId = entityId;
    this.notifyListeners();
  }

  getSelectedEntity(): CombatEntity | null {
    return this.state.entities.find(e => e.id === this.state.selectedEntityId) || null;
  }

  // Combat actions
  getAvailableActions(entityId: string): CombatAction[] {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return [];

    const now = Date.now();
    return Array.from(this.actionDefinitions.values()).filter(action => {
      const lastUsed = entity.cooldowns?.[action.id] || 0;
      return now >= lastUsed + action.cooldown;
    });
  }

  queueAction(entityId: string, actionId: string, targetId?: string, targetPosition?: { x: number; y: number }): boolean {
    const entity = this.state.entities.find(e => e.id === entityId);
    const action = this.actionDefinitions.get(actionId);
    
    if (!entity || !action) return false;

    // Check if action is on cooldown
    const now = Date.now();
    const lastUsed = entity.cooldowns?.[actionId] || 0;
    if (now < lastUsed + action.cooldown) return false;

    // Check if entity already has an action queued
    const existingAction = this.state.actionQueue.find(qa => qa.entityId === entityId);
    if (existingAction) return false;

    const queuedAction: QueuedAction = {
      entityId,
      action,
      targetId,
      targetPosition,
      queuedAt: now,
      executesAt: now + action.executionTime,
    };

    this.state.actionQueue.push(queuedAction);
    this.notifyListeners();
    return true;
  }

  cancelAction(entityId: string): boolean {
    const index = this.state.actionQueue.findIndex(qa => qa.entityId === entityId);
    if (index === -1) return false;

    this.state.actionQueue.splice(index, 1);
    this.notifyListeners();
    return true;
  }

  // Combat flow
  startCombat(): void {
    this.state.isInCombat = true;
    this.state.combatStartTime = Date.now();
    this.notifyListeners();
  }

  endCombat(): void {
    this.state.isInCombat = false;
    this.state.actionQueue = [];
    this.state.combatStartTime = undefined;
    this.notifyListeners();
  }

  // Process queued actions (should be called regularly, e.g., via setInterval)
  processCombatTick(): void {
    const now = Date.now();
    const readyActions = this.state.actionQueue.filter(qa => now >= qa.executesAt);

    readyActions.forEach(queuedAction => {
      this.executeAction(queuedAction);
    });

    // Remove executed actions
    this.state.actionQueue = this.state.actionQueue.filter(qa => now < qa.executesAt);
    
    if (readyActions.length > 0) {
      this.notifyListeners();
    }
  }

  private executeAction(queuedAction: QueuedAction): void {
    const { entityId, action, targetId } = queuedAction;
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return;

    // Set cooldown
    if (!entity.cooldowns) entity.cooldowns = {};
    entity.cooldowns[action.id] = Date.now();

    // Execute action effects
    switch (action.type) {
      case 'attack':
        if (targetId && action.damage) {
          this.dealDamage(targetId, action.damage, entity.attack);
        }
        break;
      case 'ability':
        this.executeAbility(entity, action, targetId);
        break;
    }
  }

  private dealDamage(targetId: string, baseDamage: number, attackStat: number): void {
    const target = this.state.entities.find(e => e.id === targetId);
    if (!target) return;

    // Calculate actual damage (base damage + attack stat - target defense)
    const actualDamage = Math.max(1, baseDamage + attackStat - target.defense);
    target.hp = Math.max(0, target.hp - actualDamage);

    // Check if target is defeated
    if (target.hp <= 0) {
      this.onEntityDefeated(target);
    }
  }

  private executeAbility(entity: CombatEntity, action: CombatAction, targetId?: string): void {
    // Implement specific ability effects based on action.id
    switch (action.id) {
      case 'dodge':
        // Add dodge effect
        if (!entity.effects) entity.effects = [];
        entity.effects.push('dodging');
        
        // Remove dodge effect after a short time
        setTimeout(() => {
          if (entity.effects) {
            entity.effects = entity.effects.filter(e => e !== 'dodging');
            this.notifyListeners();
          }
        }, 2000);
        break;
    }
  }

  private onEntityDefeated(entity: CombatEntity): void {
    // Handle entity defeat (could trigger loot, experience, etc.)
    console.log(`${entity.name} has been defeated!`);
    
    // For now, just remove the entity
    this.removeEntity(entity.id);
  }

  // Utility methods
  getEntitiesInRange(fromPosition: { x: number; y: number }, range: number): CombatEntity[] {
    return this.state.entities.filter(entity => {
      const distance = Math.sqrt(
        Math.pow(entity.position.x - fromPosition.x, 2) + 
        Math.pow(entity.position.y - fromPosition.y, 2)
      );
      return distance <= range;
    });
  }

  getHostileEntities(): CombatEntity[] {
    return this.state.entities.filter(e => e.type === 'hostile');
  }

  getFriendlyEntities(): CombatEntity[] {
    return this.state.entities.filter(e => e.type === 'player' || e.type === 'neutral');
  }
}

// Singleton instance
export const combatSystem = new CombatSystem();
