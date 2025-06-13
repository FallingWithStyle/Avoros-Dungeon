
/**
 * File: events-system.test.ts
 * Responsibility: Unit tests for the room events tracking and broadcasting system
 * Notes: Tests event management, room transitions, combat events, and subscriber pattern
 */

import { eventsSystem, type RoomEvent } from '../events-system';

// Mock sessionStorage for testing
const mockSessionStorage: {
  store: Map<string, string>;
  getItem: jest.Mock<string | null, [string]>;
  setItem: jest.Mock<void, [string, string]>;
  removeItem: jest.Mock<void, [string]>;
  clear: jest.Mock<void, []>;
} = {
  store: new Map<string, string>(),
  getItem: jest.fn((key: string): string | null => mockSessionStorage.store.get(key) || null),
  setItem: jest.fn((key: string, value: string): void => {
    mockSessionStorage.store.set(key, value);
  }),
  removeItem: jest.fn((key: string): void => {
    mockSessionStorage.store.delete(key);
  }),
  clear: jest.fn((): void => {
    mockSessionStorage.store.clear();
  })
};

// Mock combat system
const mockCombatSystem = {
  getState: jest.fn(() => ({
    entities: [
      {
        id: 'player',
        name: 'Test Crawler',
        type: 'player',
        hp: 100,
        maxHp: 100
      },
      {
        id: 'goblin-1',
        name: 'Angry Goblin',
        type: 'hostile',
        hp: 30,
        maxHp: 30
      },
      {
        id: 'merchant-1',
        name: 'Friendly Merchant',
        type: 'neutral',
        hp: 50,
        maxHp: 50
      }
    ]
  }))
};

// Mock window and sessionStorage for Node.js environment
if (typeof window === 'undefined') {
  (global as any).window = {};
}

Object.defineProperty(global.window || window, 'sessionStorage', {
  value: mockSessionStorage
});

jest.mock('../combat-system', () => ({
  combatSystem: mockCombatSystem
}));

describe('Events System', () => {
  let receivedEvents: RoomEvent[] = [];
  let unsubscribe: (() => void) | null = null;

  beforeEach(() => {
    // Reset the events system
    eventsSystem.clearEvents();
    mockSessionStorage.clear();
    receivedEvents = [];
    
    // Subscribe to events
    unsubscribe = eventsSystem.subscribe((events) => {
      receivedEvents = [...events];
    });
  });

  afterEach(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });

  describe('Event Management', () => {
    it('should add events and notify subscribers', () => {
      const testEvent: RoomEvent = {
        id: 'test-event-1',
        type: 'movement',
        message: 'Test movement event',
        timestamp: Date.now(),
        priority: 'medium'
      };

      eventsSystem.addEvent(testEvent);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toEqual(testEvent);
    });

    it('should prevent duplicate events with same ID', () => {
      const testEvent: RoomEvent = {
        id: 'duplicate-test',
        type: 'combat',
        message: 'Test event',
        timestamp: Date.now(),
        priority: 'high'
      };

      eventsSystem.addEvent(testEvent);
      eventsSystem.addEvent(testEvent); // Try to add again

      expect(receivedEvents).toHaveLength(1);
    });

    it('should clear all events', () => {
      const event1: RoomEvent = {
        id: 'event-1',
        type: 'discovery',
        message: 'Found something',
        timestamp: Date.now(),
        priority: 'low'
      };

      const event2: RoomEvent = {
        id: 'event-2',
        type: 'combat',
        message: 'Combat started',
        timestamp: Date.now(),
        priority: 'high'
      };

      eventsSystem.addEvent(event1);
      eventsSystem.addEvent(event2);
      expect(receivedEvents).toHaveLength(2);

      eventsSystem.clearEvents();
      expect(receivedEvents).toHaveLength(0);
    });
  });

  describe('Subscriber Pattern', () => {
    it('should handle multiple subscribers', () => {
      const events1: RoomEvent[] = [];
      const events2: RoomEvent[] = [];

      const unsub1 = eventsSystem.subscribe((events) => {
        events1.splice(0, events1.length, ...events);
      });

      const unsub2 = eventsSystem.subscribe((events) => {
        events2.splice(0, events2.length, ...events);
      });

      const testEvent: RoomEvent = {
        id: 'multi-sub-test',
        type: 'status',
        message: 'Status update',
        timestamp: Date.now(),
        priority: 'medium'
      };

      eventsSystem.addEvent(testEvent);

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      expect(events1[0]).toEqual(testEvent);
      expect(events2[0]).toEqual(testEvent);

      unsub1();
      unsub2();
    });

    it('should stop notifying unsubscribed callbacks', () => {
      const events: RoomEvent[] = [];
      const unsub = eventsSystem.subscribe((eventList) => {
        events.splice(0, events.length, ...eventList);
      });

      const event1: RoomEvent = {
        id: 'before-unsub',
        type: 'movement',
        message: 'Before unsubscribe',
        timestamp: Date.now(),
        priority: 'low'
      };

      eventsSystem.addEvent(event1);
      expect(events).toHaveLength(1);

      unsub(); // Unsubscribe

      const event2: RoomEvent = {
        id: 'after-unsub',
        type: 'movement',
        message: 'After unsubscribe',
        timestamp: Date.now(),
        priority: 'low'
      };

      eventsSystem.addEvent(event2);
      expect(events).toHaveLength(1); // Should still be 1, not 2
    });
  });

  describe('Room Change Events', () => {
    it('should handle room entry without stored direction', () => {
      const crawlerName = 'Test Crawler';
      const crawlerId = 123;
      const roomId = 456;

      eventsSystem.onRoomChange(roomId, crawlerName, crawlerId);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('movement');
      expect(receivedEvents[0].message).toBe(`Crawler ${crawlerName} (#${crawlerId}) entered the room`);
      expect(receivedEvents[0].entityId).toBe('player');
      expect(receivedEvents[0].entityName).toBe(crawlerName);
      expect(receivedEvents[0].priority).toBe('medium');
    });

    it('should handle room entry with stored direction', () => {
      const crawlerName = 'Test Crawler';
      const crawlerId = 123;
      const roomId = 456;

      mockSessionStorage.setItem('lastMovementDirection', 'north');

      eventsSystem.onRoomChange(roomId, crawlerName, crawlerId);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].message).toBe(`Crawler ${crawlerName} (#${crawlerId}) entered from the south`);
      expect(receivedEvents[0].direction).toBe('north');
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('entryDirection', 'north');
    });

    it('should not generate duplicate events for same room', () => {
      const crawlerName = 'Test Crawler';
      const crawlerId = 123;
      const roomId = 456;

      eventsSystem.onRoomChange(roomId, crawlerName, crawlerId);
      expect(receivedEvents).toHaveLength(1);

      // Try to enter same room again
      eventsSystem.onRoomChange(roomId, crawlerName, crawlerId);
      expect(receivedEvents).toHaveLength(1); // Should still be 1
    });

    it('should generate discovery events after room entry delay', (done) => {
      const crawlerName = 'Test Crawler';
      const crawlerId = 123;
      const roomId = 456;

      eventsSystem.onRoomChange(roomId, crawlerName, crawlerId);

      // Initial entry event
      expect(receivedEvents).toHaveLength(1);

      // Wait for discovery events
      setTimeout(() => {
        // Should have entry event + discovery events for each non-player entity
        expect(receivedEvents.length).toBeGreaterThan(1);
        
        const discoveryEvents = receivedEvents.filter(e => e.type === 'discovery');
        expect(discoveryEvents).toHaveLength(2); // goblin and merchant
        
        const goblinEvent = discoveryEvents.find(e => e.entityName === 'Angry Goblin');
        const merchantEvent = discoveryEvents.find(e => e.entityName === 'Friendly Merchant');
        
        expect(goblinEvent).toBeDefined();
        expect(goblinEvent?.priority).toBe('high'); // hostile = high priority
        expect(goblinEvent?.message).toContain('notices a dangerous');
        
        expect(merchantEvent).toBeDefined();
        expect(merchantEvent?.priority).toBe('low'); // neutral = low priority
        expect(merchantEvent?.message).toContain('spots');
        
        done();
      }, 1600); // Slightly more than the 1500ms delay
    });
  });

  describe('Combat Events', () => {
    it('should record combat actions with move type', () => {
      const action = { type: 'move', name: 'Move' };
      const entityId = 'player';

      eventsSystem.onCombatAction(action, entityId);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('movement');
      expect(receivedEvents[0].message).toBe('Crawler Test Crawler moved to a new position');
      expect(receivedEvents[0].priority).toBe('low');
    });

    it('should record combat actions with attack type', () => {
      const action = { type: 'attack', name: 'Sword Strike' };
      const entityId = 'goblin-1';
      const targetId = 'player';
      const damage = 15;

      eventsSystem.onCombatAction(action, entityId, targetId, damage);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('combat');
      expect(receivedEvents[0].message).toBe('Angry Goblin used Sword Strike on Test Crawler');
      expect(receivedEvents[0].priority).toBe('high');
      expect(receivedEvents[0].damage).toBe(damage);
    });

    it('should record combat actions without target', () => {
      const action = { type: 'ability', name: 'Heal' };
      const entityId = 'player';

      eventsSystem.onCombatAction(action, entityId);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('combat');
      expect(receivedEvents[0].message).toBe('Crawler Test Crawler used Heal');
      expect(receivedEvents[0].priority).toBe('medium');
    });

    it('should handle combat start events', () => {
      eventsSystem.onCombatStart('Test Crawler', 'Angry Goblin');

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('combat');
      expect(receivedEvents[0].message).toBe('Test Crawler attacks Angry Goblin!');
      expect(receivedEvents[0].priority).toBe('medium');
    });

    it('should handle combat damage events', () => {
      const damage = 25;
      eventsSystem.onCombatDamage('Test Crawler', 'Angry Goblin', damage);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('combat');
      expect(receivedEvents[0].message).toBe('Test Crawler deals damage to Angry Goblin');
      expect(receivedEvents[0].priority).toBe('medium');
      expect(receivedEvents[0].damage).toBe(damage);
    });

    it('should handle combat end events', () => {
      eventsSystem.onCombatEnd('Test Crawler');

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('combat');
      expect(receivedEvents[0].message).toBe('Combat ends - Test Crawler is victorious!');
      expect(receivedEvents[0].priority).toBe('high');
    });
  });

  describe('Death Events', () => {
    it('should handle mob death events', () => {
      eventsSystem.onMobDeath('Angry Goblin', 'Test Crawler');

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('death');
      expect(receivedEvents[0].message).toBe('Angry Goblin has been slain by Test Crawler!');
      expect(receivedEvents[0].priority).toBe('high');
      expect(receivedEvents[0].entityName).toBe('Angry Goblin');
      expect(receivedEvents[0].killedBy).toBe('Test Crawler');
      expect(receivedEvents[0].victimType).toBe('mob');
    });

    it('should handle crawler death with killer', () => {
      eventsSystem.onCrawlerDeath('Test Crawler', 'Angry Goblin');

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('death');
      expect(receivedEvents[0].message).toBe('Test Crawler has been killed by Angry Goblin!');
      expect(receivedEvents[0].priority).toBe('high');
      expect(receivedEvents[0].entityName).toBe('Test Crawler');
      expect(receivedEvents[0].killedBy).toBe('Angry Goblin');
      expect(receivedEvents[0].victimType).toBe('player');
    });

    it('should handle crawler death without killer', () => {
      eventsSystem.onCrawlerDeath('Test Crawler');

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('death');
      expect(receivedEvents[0].message).toBe('Test Crawler has died!');
      expect(receivedEvents[0].priority).toBe('high');
      expect(receivedEvents[0].entityName).toBe('Test Crawler');
      expect(receivedEvents[0].killedBy).toBeUndefined();
      expect(receivedEvents[0].victimType).toBe('player');
    });

    it('should handle NPC death events', () => {
      eventsSystem.onNpcDeath('Friendly Merchant', 'Test Crawler');

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe('death');
      expect(receivedEvents[0].message).toBe('Friendly Merchant has been killed by Test Crawler!');
      expect(receivedEvents[0].priority).toBe('high');
      expect(receivedEvents[0].entityName).toBe('Friendly Merchant');
      expect(receivedEvents[0].killedBy).toBe('Test Crawler');
      expect(receivedEvents[0].victimType).toBe('npc');
    });
  });

  describe('Room Entry Time Tracking', () => {
    it('should track room entry time', () => {
      const beforeTime = Date.now();
      
      eventsSystem.onRoomChange(123, 'Test Crawler', 456);
      
      const entryTime = eventsSystem.getRoomEntryTime();
      const afterTime = Date.now();

      expect(entryTime).toBeGreaterThanOrEqual(beforeTime);
      expect(entryTime).toBeLessThanOrEqual(afterTime);
    });

    it('should update room entry time on room change', () => {
      eventsSystem.onRoomChange(123, 'Test Crawler', 456);
      const firstEntryTime = eventsSystem.getRoomEntryTime();

      // Wait a bit
      setTimeout(() => {
        eventsSystem.onRoomChange(789, 'Test Crawler', 456);
        const secondEntryTime = eventsSystem.getRoomEntryTime();

        expect(secondEntryTime).toBeGreaterThan(firstEntryTime);
      }, 10);
    });
  });

  describe('Event Properties', () => {
    it('should create events with all required properties', () => {
      const testEvent: RoomEvent = {
        id: 'property-test',
        type: 'interaction',
        message: 'Test interaction',
        timestamp: Date.now(),
        priority: 'medium',
        direction: 'north',
        damage: 10,
        entityId: 'test-entity',
        entityName: 'Test Entity',
        killedBy: 'Test Killer',
        victimType: 'mob'
      };

      eventsSystem.addEvent(testEvent);

      expect(receivedEvents[0]).toEqual(testEvent);
      expect(receivedEvents[0]).toHaveProperty('id');
      expect(receivedEvents[0]).toHaveProperty('type');
      expect(receivedEvents[0]).toHaveProperty('message');
      expect(receivedEvents[0]).toHaveProperty('timestamp');
      expect(receivedEvents[0]).toHaveProperty('priority');
    });

    it('should handle events with minimal properties', () => {
      const minimalEvent: RoomEvent = {
        id: 'minimal-test',
        type: 'status',
        message: 'Minimal status update',
        timestamp: Date.now(),
        priority: 'low'
      };

      eventsSystem.addEvent(minimalEvent);

      expect(receivedEvents[0]).toEqual(minimalEvent);
    });
  });
});
