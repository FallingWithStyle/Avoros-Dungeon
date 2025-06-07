
import { calculateDamage, calculateHitChance, CombatSystem, type CombatEntity } from '../combat-system';

describe('Combat System', () => {
  let combatSystem: CombatSystem;

  beforeEach(() => {
    combatSystem = new CombatSystem();
    // Stop automatic processing during tests
    combatSystem.stopCombatProcessing();
  });

  afterEach(() => {
    // Ensure combat processing is stopped and state is cleared
    combatSystem.stopCombatProcessing();
    
    // Clear all entities and reset state
    const state = combatSystem.getState();
    state.entities.forEach(entity => {
      combatSystem.removeEntity(entity.id);
    });
    
    // Clear any remaining actions
    while (combatSystem.getState().actionQueue.length > 0) {
      combatSystem.getState().actionQueue.pop();
    }
  });

  describe('Entity Management', () => {
    it('should add entities correctly', () => {
      const entity: CombatEntity = {
        id: 'test-entity',
        name: 'Test Entity',
        type: 'player',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        speed: 10,
        position: { x: 50, y: 50 }
      };

      combatSystem.addEntity(entity);
      const state = combatSystem.getState();

      expect(state.entities).toHaveLength(1);
      expect(state.entities[0].id).toBe('test-entity');
      expect(state.entities[0].cooldowns).toBeDefined();
    });

    it('should remove entities correctly', () => {
      const entity: CombatEntity = {
        id: 'test-entity',
        name: 'Test Entity',
        type: 'player',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        speed: 10,
        position: { x: 50, y: 50 }
      };

      combatSystem.addEntity(entity);
      combatSystem.removeEntity('test-entity');
      const state = combatSystem.getState();

      expect(state.entities).toHaveLength(0);
    });

    it('should update entities correctly', () => {
      const entity: CombatEntity = {
        id: 'test-entity',
        name: 'Test Entity',
        type: 'player',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        speed: 10,
        position: { x: 50, y: 50 }
      };

      combatSystem.addEntity(entity);
      combatSystem.updateEntity('test-entity', { hp: 50, position: { x: 60, y: 60 } });
      
      const state = combatSystem.getState();
      const updatedEntity = state.entities[0];

      expect(updatedEntity.hp).toBe(50);
      expect(updatedEntity.position.x).toBe(60);
      expect(updatedEntity.position.y).toBe(60);
    });

    it('should select entities correctly', () => {
      const entity: CombatEntity = {
        id: 'test-entity',
        name: 'Test Entity',
        type: 'player',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        speed: 10,
        position: { x: 50, y: 50 }
      };

      combatSystem.addEntity(entity);
      combatSystem.selectEntity('test-entity');
      
      const state = combatSystem.getState();
      expect(state.selectedEntityId).toBe('test-entity');
      expect(state.entities[0].isSelected).toBe(true);
    });
  });

  describe('Action System', () => {
    beforeEach(() => {
      const player: CombatEntity = {
        id: 'player',
        name: 'Player',
        type: 'player',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        speed: 10,
        position: { x: 50, y: 50 }
      };

      const enemy: CombatEntity = {
        id: 'enemy',
        name: 'Enemy',
        type: 'hostile',
        hp: 80,
        maxHp: 80,
        attack: 8,
        defense: 3,
        speed: 8,
        position: { x: 55, y: 55 }
      };

      combatSystem.addEntity(player);
      combatSystem.addEntity(enemy);
    });

    it('should queue actions successfully', () => {
      const success = combatSystem.queueAction('player', 'basic_attack', 'enemy');
      const state = combatSystem.getState();

      expect(success).toBe(true);
      expect(state.actionQueue).toHaveLength(1);
      expect(state.actionQueue[0].entityId).toBe('player');
      expect(state.actionQueue[0].action.id).toBe('basic_attack');
      expect(state.actionQueue[0].targetId).toBe('enemy');
    });

    it('should prevent queuing actions when on cooldown', () => {
      // Queue first action
      combatSystem.queueAction('player', 'basic_attack', 'enemy');
      
      // Try to queue same action again immediately
      const success = combatSystem.queueAction('player', 'basic_attack', 'enemy');
      
      expect(success).toBe(false);
    });

    it('should queue move actions to specific positions', () => {
      const targetPosition = { x: 70, y: 70 };
      const success = combatSystem.queueMoveAction('player', targetPosition);
      const state = combatSystem.getState();

      expect(success).toBe(true);
      expect(state.actionQueue).toHaveLength(1);
      expect(state.actionQueue[0].action.type).toBe('move');
      expect(state.actionQueue[0].targetPosition).toEqual(targetPosition);
    });

    it('should get available actions for entities', () => {
      const actions = combatSystem.getAvailableActions('player');
      
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.id === 'basic_attack')).toBe(true);
      expect(actions.some(a => a.id === 'move')).toBe(true);
    });
  });

  describe('Combat Processing', () => {
    beforeEach(() => {
      const player: CombatEntity = {
        id: 'player',
        name: 'Player',
        type: 'player',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        speed: 10,
        position: { x: 50, y: 50 }
      };

      const enemy: CombatEntity = {
        id: 'enemy',
        name: 'Enemy',
        type: 'hostile',
        hp: 80,
        maxHp: 80,
        attack: 8,
        defense: 3,
        speed: 8,
        position: { x: 55, y: 55 }
      };

      combatSystem.addEntity(player);
      combatSystem.addEntity(enemy);
    });

    it('should process combat ticks and execute ready actions', (done) => {
      // Stop automatic processing to control timing manually
      combatSystem.stopCombatProcessing();
      
      // Queue an action with very short execution time
      combatSystem.queueAction('player', 'basic_attack', 'enemy');
      
      const initialState = combatSystem.getState();
      expect(initialState.actionQueue).toHaveLength(1);

      // Wait for action execution time to pass, then manually process
      setTimeout(() => {
        combatSystem.processCombatTick();
        const finalState = combatSystem.getState();
        
        // Action should be executed and removed from queue
        expect(finalState.actionQueue).toHaveLength(0);
        
        // Enemy should have taken damage
        const enemy = finalState.entities.find(e => e.id === 'enemy');
        expect(enemy?.hp).toBeLessThan(80);
        
        done();
      }, 1100); // Wait longer than execution time (1000ms)
    });

    it('should start combat when hostile entities are present and detected', (done) => {
      // Stop automatic processing to control timing
      combatSystem.stopCombatProcessing();
      
      const initialState = combatSystem.getState();
      expect(initialState.isInCombat).toBe(false);

      // Trigger enemy detection by having player attack
      combatSystem.queueAction('player', 'basic_attack', 'enemy');
      
      // Wait for action to execute, then process
      setTimeout(() => {
        combatSystem.processCombatTick();
        const finalState = combatSystem.getState();
        expect(finalState.isInCombat).toBe(true);
        done();
      }, 1100);
    });
  });

  describe('Distance and Positioning', () => {
    it('should calculate distance correctly', () => {
      const pos1 = { x: 0, y: 0 };
      const pos2 = { x: 3, y: 4 };
      
      const distance = combatSystem.calculateDistance(pos1, pos2);
      
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should get correct entry positions', () => {
      const northEntry = combatSystem.getEntryPosition('north');
      const southEntry = combatSystem.getEntryPosition('south');
      const eastEntry = combatSystem.getEntryPosition('east');
      const westEntry = combatSystem.getEntryPosition('west');

      expect(southEntry.y).toBeGreaterThan(northEntry.y); // South entry should be lower on screen (higher y value)
      expect(eastEntry.x).toBeGreaterThan(westEntry.x); // East entry should be more to the right
    });

    it('should move entities to exact positions', () => {
      const entity: CombatEntity = {
        id: 'test-entity',
        name: 'Test Entity',
        type: 'player',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        speed: 10,
        position: { x: 50, y: 50 }
      };

      combatSystem.addEntity(entity);
      combatSystem.moveEntityToPosition('test-entity', { x: 70, y: 80 });

      const state = combatSystem.getState();
      const movedEntity = state.entities[0];

      expect(movedEntity.position.x).toBe(70);
      expect(movedEntity.position.y).toBe(80);
    });
  });

  describe('Combat State', () => {
    it('should manage combat state correctly', () => {
      const initialState = combatSystem.getState();
      expect(initialState.isInCombat).toBe(false);

      combatSystem.startCombat();
      const combatState = combatSystem.getState();
      expect(combatState.isInCombat).toBe(true);
      expect(combatState.combatStartTime).toBeDefined();

      combatSystem.endCombat();
      const endState = combatSystem.getState();
      expect(endState.isInCombat).toBe(false);
      expect(endState.combatStartTime).toBeUndefined();
    });

    it('should filter entities by type correctly', () => {
      const player: CombatEntity = {
        id: 'player',
        name: 'Player',
        type: 'player',
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        speed: 10,
        position: { x: 50, y: 50 }
      };

      const enemy: CombatEntity = {
        id: 'enemy',
        name: 'Enemy',
        type: 'hostile',
        hp: 80,
        maxHp: 80,
        attack: 8,
        defense: 3,
        speed: 8,
        position: { x: 55, y: 55 }
      };

      const npc: CombatEntity = {
        id: 'npc',
        name: 'NPC',
        type: 'neutral',
        hp: 50,
        maxHp: 50,
        attack: 0,
        defense: 10,
        speed: 5,
        position: { x: 60, y: 60 }
      };

      combatSystem.addEntity(player);
      combatSystem.addEntity(enemy);
      combatSystem.addEntity(npc);

      const hostiles = combatSystem.getHostileEntities();
      const friendlies = combatSystem.getFriendlyEntities();

      expect(hostiles).toHaveLength(1);
      expect(hostiles[0].id).toBe('enemy');
      expect(friendlies).toHaveLength(2);
      expect(friendlies.some(e => e.id === 'player')).toBe(true);
      expect(friendlies.some(e => e.id === 'npc')).toBe(true);
    });
  });

  describe('calculateDamage', () => {
    it('should calculate basic damage correctly', () => {
      const attacker = { attack: 10, level: 1 };
      const defender = { defense: 5, level: 1 };
      
      const damage = calculateDamage(attacker, defender);
      
      expect(damage).toBeGreaterThan(0);
      expect(typeof damage).toBe('number');
    });

    it('should return minimum damage of 1', () => {
      const attacker = { attack: 1, level: 1 };
      const defender = { defense: 100, level: 1 };
      
      const damage = calculateDamage(attacker, defender);
      
      expect(damage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('calculateHitChance', () => {
    it('should return a value between 0 and 1', () => {
      const attacker = { accuracy: 10, level: 1 };
      const defender = { evasion: 5, level: 1 };
      
      const hitChance = calculateHitChance(attacker, defender);
      
      expect(hitChance).toBeGreaterThanOrEqual(0);
      expect(hitChance).toBeLessThanOrEqual(1);
    });

    it('should have minimum hit chance', () => {
      const attacker = { accuracy: 1, level: 1 };
      const defender = { evasion: 100, level: 1 };
      
      const hitChance = calculateHitChance(attacker, defender);
      
      expect(hitChance).toBeGreaterThan(0);
    });
  });
});
