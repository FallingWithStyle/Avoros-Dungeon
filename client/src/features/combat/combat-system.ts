
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
  entryDirection?: 'north' | 'south' | 'east' | 'west' | null;
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
        range: 15, // Grid units - close combat range
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
        range: 15, // Grid units - close combat range
        targetType: 'single',
        executionTime: 2000,
      }],
      ['ranged_attack', {
        id: 'ranged_attack',
        name: 'Ranged Attack',
        type: 'attack',
        cooldown: 3000,
        damage: 15,
        range: 40, // Grid units - longer range
        targetType: 'single',
        executionTime: 1500,
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

    // Check range for attack actions
    if (action.type === 'attack' && targetId && action.range) {
      const target = this.state.entities.find(e => e.id === targetId);
      if (target) {
        const distance = this.calculateDistance(entity.position, target.position);
        if (distance > action.range) {
          console.log(`${entity.name} is too far from ${target.name} to attack (distance: ${distance.toFixed(1)}, range: ${action.range})`);
          return false;
        }
      }
    }

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

  // Process AI for enemy entities
  private processEnemyAI(): void {
    const hostileEntities = this.state.entities.filter(e => e.type === 'hostile');
    const playerEntity = this.state.entities.find(e => e.type === 'player');
    
    if (!playerEntity) return;

    hostileEntities.forEach(enemy => {
      // Skip if enemy already has an action queued
      const hasQueuedAction = this.state.actionQueue.some(qa => qa.entityId === enemy.id);
      if (hasQueuedAction) return;

      // Check if enemy can attack player
      const distance = this.calculateDistance(enemy.position, playerEntity.position);
      const attackAction = this.actionDefinitions.get('basic_attack');
      
      if (attackAction && distance <= attackAction.range!) {
        // Enemy is in range, attack
        this.queueAction(enemy.id, 'basic_attack', playerEntity.id);
      } else {
        // Enemy is too far, move closer
        this.moveEntityTowards(enemy.id, playerEntity.position);
      }
    });
  }

  // Calculate distance between two positions
  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Move entity towards a target position
  private moveEntityTowards(entityId: string, targetPosition: { x: number; y: number }): void {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return;

    const dx = targetPosition.x - entity.position.x;
    const dy = targetPosition.y - entity.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return;

    // Move a small step towards the target (adjust speed as needed)
    const moveSpeed = 2; // Percentage points per movement
    const normalizedDx = (dx / distance) * moveSpeed;
    const normalizedDy = (dy / distance) * moveSpeed;

    entity.position.x = Math.max(5, Math.min(95, entity.position.x + normalizedDx));
    entity.position.y = Math.max(5, Math.min(95, entity.position.y + normalizedDy));

    this.notifyListeners();
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
    this.startCombatProcessing();
    this.notifyListeners();
  }

  endCombat(): void {
    this.state.isInCombat = false;
    this.state.actionQueue = [];
    this.state.combatStartTime = undefined;
    this.stopCombatProcessing();
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
    
    // Process AI for hostile entities that don't have queued actions
    this.processEnemyAI();
    
    if (readyActions.length > 0) {
      this.notifyListeners();
    }
  }

  // Start automatic combat processing
  startCombatProcessing(): void {
    if (this.combatInterval) return; // Already running
    
    this.combatInterval = setInterval(() => {
      this.processCombatTick();
    }, 100); // Process every 100ms
  }

  // Stop automatic combat processing
  stopCombatProcessing(): void {
    if (this.combatInterval) {
      clearInterval(this.combatInterval);
      this.combatInterval = null;
    }
  }

  private combatInterval: NodeJS.Timeout | null = null;

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

  // Helper function to convert grid coordinates to percentage
  private gridToPercentage(gridX: number, gridY: number): { x: number; y: number } {
    const cellWidth = 100 / 15;
    const cellHeight = 100 / 15;
    return {
      x: (gridX + 0.5) * cellWidth, // Center of the cell
      y: (gridY + 0.5) * cellHeight
    };
  }

  // Calculate entry position based on direction using grid coordinates
  getEntryPosition(direction: 'north' | 'south' | 'east' | 'west' | null): { x: number; y: number } {
    switch (direction) {
      case 'north':
        // Coming from north means entering from south side (bottom edge)
        return this.gridToPercentage(7, 13);
      case 'south':
        // Coming from south means entering from north side (top edge)
        return this.gridToPercentage(7, 1);
      case 'east':
        // Coming from east means entering from west side (left edge)
        return this.gridToPercentage(1, 7);
      case 'west':
        // Coming from west means entering from east side (right edge)
        return this.gridToPercentage(13, 7);
      default:
        // No direction specified - spawn in center
        return this.gridToPercentage(7, 7);
    }
  }

  // Enhanced method to position multiple entities (for future party system)
  getPartyEntryPositions(direction: 'north' | 'south' | 'east' | 'west' | null, partySize: number): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const basePosition = this.getEntryPosition(direction);
    
    if (partySize <= 1) {
      return [basePosition];
    }

    // Convert base position back to grid coordinates
    const baseGridX = Math.round((basePosition.x / 100) * 15 - 0.5);
    const baseGridY = Math.round((basePosition.y / 100) * 15 - 0.5);
    
    // Spread party members around the entry point
    const halfParty = Math.floor(partySize / 2);
    
    for (let i = 0; i < partySize; i++) {
      let gridX = baseGridX;
      let gridY = baseGridY;
      
      const offset = i - halfParty;
      
      // Spread horizontally for north/south entries, vertically for east/west
      if (direction === 'north' || direction === 'south') {
        gridX = Math.max(0, Math.min(14, baseGridX + offset));
      } else if (direction === 'east' || direction === 'west') {
        gridY = Math.max(0, Math.min(14, baseGridY + offset));
      } else {
        // For center spawns, use a small cluster pattern
        const clusterOffsets = [
          { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 },
          { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 1 },
          { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }
        ];
        const clusterOffset = clusterOffsets[i % clusterOffsets.length];
        gridX = Math.max(0, Math.min(14, baseGridX + clusterOffset.x));
        gridY = Math.max(0, Math.min(14, baseGridY + clusterOffset.y));
      }
      
      positions.push(this.gridToPercentage(gridX, gridY));
    }

    return positions;
  }

  setPlayerEntryDirection(direction: 'north' | 'south' | 'east' | 'west' | null): void {
    const player = this.state.entities.find(e => e.id === 'player');
    if (player) {
      const newPosition = this.getEntryPosition(direction);
      player.entryDirection = direction;
      player.position = newPosition;
      console.log(`Player positioned at ${newPosition.x}, ${newPosition.y} after entering from ${direction}`);
      this.notifyListeners();
    }
  }
}

// Singleton instance
export const combatSystem = new CombatSystem();
