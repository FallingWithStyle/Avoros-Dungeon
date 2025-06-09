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
  facing: 'north' | 'south' | 'east' | 'west'; // Direction the entity is facing
  isSelected?: boolean;
  cooldowns?: Record<string, number>;
  effects?: string[];
  entryDirection?: 'north' | 'south' | 'east' | 'west' | null;
  detectionGraceEnd?: number; // Timestamp when grace period ends
  hasDetectedPlayer?: boolean; // Whether this entity has detected the player
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
  public actionDefinitions: Map<string, CombatAction>;
  private listeners: Set<(state: CombatState) => void> = new Set();
  private actionCooldowns: Map<string, number> = new Map();
  private combatInterval: NodeJS.Timeout | null = null;
  private currentRoomData: any = null;

  constructor() {
    this.state = {
      entities: [],
      selectedEntityId: null,
      actionQueue: [],
      isInCombat: false,
    };

    // Start constant combat processing
    this.startCombatProcessing();

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
      ['move', {
        id: 'move',
        name: 'Move',
        type: 'move',
        cooldown: 100, // Even shorter cooldown for smooth movement
        targetType: 'area',
        executionTime: 50, // Much faster execution for smooth movement
      }],
    ]);
  }

  // State management
  subscribe(listener: (state: CombatState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    console.log("notifyListeners called", { entities: this.state.entities.map((e: CombatEntity) => ({ id: e.id, position: e.position })) });
    const stateCopy = this.getState();
    this.listeners.forEach(listener => listener(stateCopy));
  }

  getState(): CombatState {
    // Return a copy to help with React reactivity
    return {
      ...this.state,
      entities: [...this.state.entities],
      actionQueue: [...this.state.actionQueue],
    };
  }

  // Entity management
  addEntity(entity: CombatEntity): void {
    const now = Date.now();
    const entityWithDefaults = { 
      ...entity, 
      facing: entity.facing || 'south', // Default facing direction
      cooldowns: {},
      // Add 5-second grace period for hostile entities
      detectionGraceEnd: entity.type === 'hostile' ? now + 5000 : undefined,
      hasDetectedPlayer: false
    };
    this.state.entities.push(entityWithDefaults);
    console.log("addEntity:", entityWithDefaults);
    this.notifyListeners();
  }

  removeEntity(entityId: string): void {
    console.log("removeEntity:", entityId);
    this.state.entities = this.state.entities.filter((e: CombatEntity) => e.id !== entityId);
    if (this.state.selectedEntityId === entityId) {
      this.state.selectedEntityId = null;
    }
    this.notifyListeners();
  }

  updateEntity(entityId: string, updates: Partial<CombatEntity>): void {
    const entity = this.state.entities.find((e: CombatEntity) => e.id === entityId);
    if (entity) {
      Object.assign(entity, updates);
      console.log("updateEntity:", entityId, updates);
      this.notifyListeners();
    }
  }

  selectEntity(entityId: string | null): void {
    // Deselect previous entity
    this.state.entities.forEach((e: CombatEntity) => e.isSelected = false);

    // Select new entity
    if (entityId) {
      const entity = this.state.entities.find((e: CombatEntity) => e.id === entityId);
      if (entity) {
        entity.isSelected = true;
      }
    }

    this.state.selectedEntityId = entityId;
    console.log("selectEntity:", entityId);
    this.notifyListeners();
  }

  getSelectedEntity(): CombatEntity | null {
    return this.state.entities.find((e: CombatEntity) => e.id === this.state.selectedEntityId) || null;
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

    // Prevent attack actions in safe rooms
    if (action.type === 'attack' && this.isCurrentRoomSafe()) {
      console.log('Cannot attack in a safe room');
      return false;
    }

    // Check if action is on cooldown
    const now = Date.now();
    const lastUsed = entity.cooldowns?.[actionId] || 0;
    if (now < lastUsed + action.cooldown) return false;

    // Check if entity already has an action queued
    const existingAction = this.state.actionQueue.find(qa => qa.entityId === entityId);
    if (existingAction) return false;

    // If player is attacking a hostile entity, trigger immediate detection for all hostiles
    if (entity.type === 'player' && action.type === 'attack' && targetId) {
      const target = this.state.entities.find(e => e.id === targetId);
      if (target && target.type === 'hostile') {
        this.state.entities.forEach(e => {
          if (e.type === 'hostile') {
            e.hasDetectedPlayer = true;
            e.detectionGraceEnd = now; // End grace period immediately
          }
        });
        console.log('Player attacked hostile - all enemies are now alerted!');
      }
    }

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

    console.log("queueAction:", queuedAction);

    this.notifyListeners();

    // Generate event for the action (only in client environment)
    if (typeof window !== 'undefined') {
      // Import eventsSystem dynamically only in client
      import('./events-system').then(({ eventsSystem }) => {
        eventsSystem.onCombatAction(action, entityId, targetId, action.damage);
      }).catch(() => {
        // Events system not available, skip
      });
    }

    return true;
  }

  // Process AI for enemy entities
  private processEnemyAI(): void {
    const hostileEntities = this.state.entities.filter(e => e.type === 'hostile');
    const playerEntity = this.state.entities.find(e => e.id === 'player');

    if (!playerEntity) return;

    const now = Date.now();

    hostileEntities.forEach(enemy => {
      // Skip if enemy already has an action queued
      const hasQueuedAction = this.state.actionQueue.some(qa => qa.entityId === enemy.id);
      if (hasQueuedAction) return;

      // Check if grace period is still active
      if (enemy.detectionGraceEnd && now < enemy.detectionGraceEnd && !enemy.hasDetectedPlayer) {
        return; // Still in grace period, don't act
      }

      // Grace period is over or player has been detected
      if (!enemy.hasDetectedPlayer) {
        enemy.hasDetectedPlayer = true;
        console.log(`${enemy.name} has detected the player!`);
        this.notifyListeners();
      }

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
  calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Get entities in front of the attacking entity within range and cone
  getEntitiesInAttackCone(attacker: CombatEntity, range: number, coneAngle: number = 60): CombatEntity[] {
    const attackerPos = attacker.position;
    const facingDirection = attacker.facing;

    // Define direction vectors
    const directionVectors = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 }
    };

    const facingVector = directionVectors[facingDirection];
    const entitiesInCone: CombatEntity[] = [];

    this.state.entities.forEach(entity => {
      if (entity.id === attacker.id) return; // Skip self

      const dx = entity.position.x - attackerPos.x;
      const dy = entity.position.y - attackerPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if within range
      if (distance > range || distance === 0) return;

      // Normalize the vector to the target
      const targetVector = { x: dx / distance, y: dy / distance };

      // Calculate the dot product to determine angle
      const dotProduct = facingVector.x * targetVector.x + facingVector.y * targetVector.y;
      const angleInDegrees = Math.acos(Math.max(-1, Math.min(1, dotProduct))) * (180 / Math.PI);

      // Check if within cone angle
      if (angleInDegrees <= coneAngle / 2) {
        entitiesInCone.push(entity);
      }
    });

    return entitiesInCone;
  }

  // Update entity facing direction
  updateEntityFacing(entityId: string, direction: 'north' | 'south' | 'east' | 'west'): void {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (entity) {
      entity.facing = direction;
      this.notifyListeners();
    }
  }

  // Execute directional attack on all enemies in cone
  executeDirectionalAttack(attackerId: string, actionId: string): boolean {
    const attacker = this.state.entities.find(e => e.id === attackerId);
    const action = this.actionDefinitions.get(actionId);

    if (!attacker || !action || action.type !== 'attack') return false;

    // Prevent attack actions in safe rooms
    if (this.isCurrentRoomSafe()) {
      console.log('Cannot attack in a safe room');
      return false;
    }

    // Check if action is on cooldown
    const now = Date.now();
    const lastUsed = attacker.cooldowns?.[actionId] || 0;
    if (now < lastUsed + action.cooldown) return false;

    // Check if entity already has an action queued
    const existingAction = this.state.actionQueue.find(qa => qa.entityId === attackerId);
    if (existingAction) return false;

    // Get all enemies in attack cone
    const targetsInCone = this.getEntitiesInAttackCone(attacker, action.range || 15, 90);
    const hostileTargets = targetsInCone.filter(entity => entity.type === 'hostile');

    if (hostileTargets.length === 0) {
      console.log('No enemies in attack direction');
      return false;
    }

    // Alert all hostile entities when player attacks
    if (attacker.type === 'player') {
      this.state.entities.forEach(e => {
        if (e.type === 'hostile') {
          e.hasDetectedPlayer = true;
          e.detectionGraceEnd = now; // End grace period immediately
        }
      });
      console.log('Player attacked - all enemies are now alerted!');
    }

    // Queue attack action that will hit all targets in cone
    const queuedAction: QueuedAction = {
      entityId: attackerId,
      action,
      targetId: 'directional_attack', // Special marker for directional attacks
      targetPosition: undefined,
      queuedAt: now,
      executesAt: now + action.executionTime,
    };

    // Store the target list in the action for execution
    (queuedAction as any).directionalTargets = hostileTargets;

    this.state.actionQueue.push(queuedAction);

    console.log(`Queued directional attack hitting ${hostileTargets.length} enemies:`, hostileTargets.map(t => t.name));

    this.notifyListeners();

    // Generate event for the action (only in client environment)
    if (typeof window !== 'undefined') {
      import('./events-system').then(({ eventsSystem }) => {
        eventsSystem.onCombatAction(action, attackerId, undefined, action.damage);
      }).catch(() => {
        // Events system not available, skip
      });
    }

    return true;
  }

  // Move entity towards a target position (used by AI)
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

    console.log("moveEntityTowards:", entityId, "->", entity.position);

    this.notifyListeners();
  }

  // Move entity to exact position (used by player actions)
  moveEntityToPosition(entityId: string, targetPosition: { x: number; y: number }): void {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return;

    // Calculate movement direction to update facing
    const dx = targetPosition.x - entity.position.x;
    const dy = targetPosition.y - entity.position.y;

    // Update facing direction based on primary movement direction
    if (Math.abs(dx) > Math.abs(dy)) {
      entity.facing = dx > 0 ? 'east' : 'west';
    } else if (Math.abs(dy) > 0.1) { // Small threshold to avoid jitter
      entity.facing = dy > 0 ? 'south' : 'north';
    }

    // Clamp position to grid bounds
    entity.position.x = Math.max(5, Math.min(95, targetPosition.x));
    entity.position.y = Math.max(5, Math.min(95, targetPosition.y));

    console.log("moveEntityToPosition:", entityId, "->", entity.position, "facing:", entity.facing);

    this.notifyListeners();
  }

  // Queue a move action to a specific position
  queueMoveAction(entityId: string, targetPosition: { x: number; y: number }): boolean {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return false;

    const existingAction = this.state.actionQueue.find(qa => qa.entityId === entityId);
    if (existingAction) return false;

    const moveAction = this.actionDefinitions.get('move');
    if (!moveAction) return false;

    if (!entity.cooldowns) entity.cooldowns = {};
    const now = Date.now();

    // For player entities, use a much shorter cooldown for smooth movement
    const moveCooldown = entity.id === 'player' ? 25 : moveAction.cooldown;

    if (entity.cooldowns[moveAction.id] && now < entity.cooldowns[moveAction.id] + moveCooldown) {
        return false;
    }

    const queuedAction: QueuedAction = {
      entityId,
      action: moveAction,
      targetId: undefined,
      targetPosition,
      queuedAt: now,
      executesAt: now + moveAction.executionTime,
    };

    this.state.actionQueue.push(queuedAction);

    console.log("queueMoveAction:", queuedAction);

    this.notifyListeners();

    // Generate event for the action (only in client environment)
    if (typeof window !== 'undefined') {
      import('./events-system').then(({ eventsSystem }) => {
        eventsSystem.onCombatAction(moveAction, entityId);
      }).catch(() => {
        // Events system not available, skip
      });
    }

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
    if (!this.state.isInCombat) {
      this.state.isInCombat = true;
      this.state.combatStartTime = Date.now();
      console.log('Combat started!');
      this.notifyListeners();
    }
  }

  endCombat(): void {
    if (this.state.isInCombat) {
      this.state.isInCombat = false;
      this.state.combatStartTime = undefined;
      console.log('Combat ended!');
      this.notifyListeners();
    }
  }

  // Check if combat should be active based on hostile entities
  private checkCombatState(): void {
    const hostileEntities = this.getHostileEntities();
    const hasHostiles = hostileEntities.length > 0;
    const hasDetectedHostiles = hostileEntities.some(e => e.hasDetectedPlayer);

    // Check if we're in a safe room - if so, don't start combat
    const isInSafeRoom = this.isCurrentRoomSafe();

    if (hasDetectedHostiles && !this.state.isInCombat && !isInSafeRoom) {
      this.startCombat();
    } else if ((!hasHostiles || isInSafeRoom) && this.state.isInCombat) {
      this.endCombat();
    }
  }

  // Process queued actions (should be called regularly, e.g., via setInterval)
  processCombatTick(): void {
    const now = Date.now();
    const readyActions = this.state.actionQueue.filter(qa => now >= qa.executesAt);

    // Execute ready actions and remove them from queue
    readyActions.forEach(queuedAction => {
      this.executeAction(queuedAction);

      // Remove this specific action from the queue
      const actionIndex = this.state.actionQueue.findIndex(qa => 
        qa.entityId === queuedAction.entityId && qa.queuedAt === queuedAction.queuedAt
      );
      if (actionIndex !== -1) {
        this.state.actionQueue.splice(actionIndex, 1);
      }
    });

    // Check and update combat state based on hostile entities
    this.checkCombatState();

    // Process AI for hostile entities that don't have queued actions
    this.processEnemyAI();

    // Always notify listeners if we processed any actions or combat state changed
    if (readyActions.length > 0) {
      console.log("processCombatTick: processed actions", readyActions.map(a => ({ entityId: a.entityId, action: a.action.id })));
      this.notifyListeners();
    }
  }

  // Start automatic combat processing
  startCombatProcessing(): void {
    if (this.combatInterval) {
      console.log("Combat processing already running, skipping start");
      return; // Already running
    }

    this.combatInterval = setInterval(() => {
      this.processCombatTick();
    }, 100); // Process every 100ms
    console.log("Combat processing started (setInterval)");
  }

  // Stop automatic combat processing
  stopCombatProcessing(): void {
    if (this.combatInterval) {
      clearInterval(this.combatInterval);
      this.combatInterval = null;
      console.log("Combat processing stopped (clearInterval)");
    }
  }

  private executeAction(queuedAction: QueuedAction): void {
    const { entityId, action, targetId, targetPosition } = queuedAction;
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return;

    // Set cooldown
    if (!entity.cooldowns) entity.cooldowns = {};
    entity.cooldowns[action.id] = Date.now();

    console.log("executeAction:", queuedAction);

    // Execute action effects
    switch (action.type) {
      case 'attack':
        if (targetId === 'directional_attack') {
          // Handle directional attack - damage all targets in cone
          const directionalTargets = (queuedAction as any).directionalTargets || [];
          directionalTargets.forEach((target: CombatEntity) => {
            if (action.damage) {
              this.dealDamage(target.id, action.damage, entity.attack);
            }
          });
          console.log(`Directional attack hit ${directionalTargets.length} enemies`);
        } else if (targetId && action.damage) {
          this.dealDamage(targetId, action.damage, entity.attack);
        }
        break;
      case 'ability':
        this.executeAbility(entity, action, targetId);
        break;
      case 'move':
        if (targetPosition) {
          this.moveEntityToPosition(entityId, targetPosition);
        }
        break;
    }
  }

  private dealDamage(targetId: string, baseDamage: number, attackStat: number): void {
    const target = this.state.entities.find(e => e.id === targetId);
    if (!target) return;

    // Calculate actual damage (base damage + attack stat - target defense)
    const actualDamage = Math.max(1, baseDamage + attackStat - target.defense);
    target.hp = Math.max(0, target.hp - actualDamage);

    console.log("dealDamage:", { targetId, actualDamage, hp: target.hp });

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

  private getEntryPosition(direction: string): { x: number; y: number } {
    // Position near the entrance based on direction, closer to actual door locations
    // Using grid-aligned positions that correspond to door areas
    switch (direction) {
      case "north":
        return { x: 50, y: 90 }; // Near bottom edge (came from north, door at bottom)
      case "south":
        return { x: 50, y: 10 }; // Near top edge (came from south, door at top)
      case "east":
        return { x: 10, y: 50 }; // Near left edge (came from east, door at left)
      case "west":
        return { x: 90, y: 50 }; // Near right edge (came from west, door at right)
      default:
        return { x: 50, y: 50 }; // Center as fallback
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

      // Spread horizontally for north/south movements, vertically for east/west movements
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

  // Always ensure player exists with proper positioning
    let playerEntity = this.state.entities.find(e => e.id === "player");
    if (!playerEntity) {
      // Determine entry position based on movement direction
      let entryPosition = { x: 50, y: 50 }; // Default center
      let entryDirection = "north"; // Default facing

      // Check for stored entry direction first (more immediate)
      const storedEntryDirection = typeof window !== 'undefined' 
        ? sessionStorage.getItem('entryDirection') 
        : null;

      // Fallback to last movement direction
      const lastDirection = typeof window !== 'undefined' 
        ? sessionStorage.getItem('lastMovementDirection') 
        : null;

      const effectiveDirection = storedEntryDirection || lastDirection;

      if (effectiveDirection) {
        entryPosition = this.getEntryPosition(effectiveDirection);
        entryDirection = effectiveDirection;        // Clear both stored directions after using them
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('entryDirection');
          sessionStorage.removeItem('lastMovementDirection');
        }
      }

      playerEntity = {
        id: "player",
        name: "You",
        type: "player",
        position: entryPosition,
        hp: 100,
        maxHp: 100,
        isSelected: false,
        facing: entryDirection
      };
      this.state.entities.push(playerEntity);
    }

  // Safe room management
  setCurrentRoomData(roomData: any): void {
    this.currentRoomData = roomData;
    console.log('Combat system updated room data:', { 
      type: roomData?.type, 
      isSafe: roomData?.isSafe 
    });
  }

  isCurrentRoomSafe(): boolean {
    return this.currentRoomData?.type === 'safe' || this.currentRoomData?.isSafe === true;
  }

  // Define available actions for each entity type
  private getEntityActions(entityId: string): CombatAction[] {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return [];

    const baseActions: CombatAction[] = [
      {
        id: 'move',
        name: 'Move',
        type: 'move',
        cooldown: 1000,
        targetType: 'area',
        executionTime: 800,
      },
      {
        id: 'basic_attack',
        name: 'Attack',
        type: 'attack',
        cooldown: 2000,
        damage: 20,
        range: 15, // Grid units - close combat range
        targetType: 'single',
        executionTime: 1000,
      },
      {
        id: 'dodge',
        name: 'Dodge',
        type: 'ability',
        cooldown: 3000,
        targetType: 'self',
        executionTime: 500,
      },
      {
        id: 'heavy_attack',
        name: 'Heavy Attack',
        type: 'attack',
        cooldown: 5000,
        damage: 40,
        range: 15, // Grid units - close combat range
        targetType: 'single',
        executionTime: 2000,
      },
      {
        id: 'ranged_attack',
        name: 'Ranged Attack',
        type: 'attack',
        cooldown: 3000,
        damage: 15,
        range: 40, // Grid units - longer range
        targetType: 'single',
        executionTime: 1500,
      }
    ];

    return baseActions;
  }
}

// Combat calculation functions for testing
export function calculateDamage(
  attacker: { attack: number; level: number },
  defender: { defense: number; level: number }
): number {
  const baseDamage = Math.max(1, attacker.attack - defender.defense);
  const levelBonus = Math.floor(attacker.level * 0.5);
  return Math.max(1, baseDamage + levelBonus);
}

export function calculateHitChance(
  attacker: { accuracy: number; level: number },
  defender: { evasion: number; level: number }
): number {
  const baseHitChance = 0.8; // 80% base hit chance
  const accuracyBonus = attacker.accuracy * 0.02;
  const evasionPenalty = defender.evasion * 0.015;
  const levelDifference = (attacker.level - defender.level) * 0.01;

  const hitChance = baseHitChance + accuracyBonus - evasionPenalty + levelDifference;
  return Math.max(0.05, Math.min(0.95, hitChance)); // Clamp between 5% and 95%
}

// Singleton instance
export const combatSystem = new CombatSystem();