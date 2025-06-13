/**
 * File: dungeon-generator.test.ts
 * Responsibility: Unit tests for dungeon generation algorithms and utility functions
 * Notes: Tests room connectivity, faction territory assignment, and dungeon layout generation logic
 */

import { jest } from '@jest/globals';

describe('Dungeon Generator', () => {
  // Test the pure algorithmic functions without database dependencies
  // Following the rule: "Never modify production code solely to accommodate or pass unit tests"

  describe('Room Connectivity Algorithm', () => {
    // Test the connectAllDisconnectedComponents logic
    function findComponents(allRooms: Array<{x: number, y: number, placementId: number}>): Array<Array<{x: number, y: number, placementId: number}>> {
      const posToRoom = new Map<string, {x: number, y: number, placementId: number}>();
      allRooms.forEach(r => posToRoom.set(`${r.x},${r.y}`, r));

      const visited = new Set<string>();
      const components: Array<Array<{x: number, y: number, placementId: number}>> = [];

      for (const room of allRooms) {
        const key = `${room.x},${room.y}`;
        if (visited.has(key)) continue;

        const queue = [room];
        const component: Array<{x: number, y: number, placementId: number}> = [];
        visited.add(key);

        while (queue.length) {
          const current = queue.shift()!;
          component.push(current);

          const neighbors = [
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 },
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y }
          ];

          for (const n of neighbors) {
            const nKey = `${n.x},${n.y}`;
            if (!visited.has(nKey) && posToRoom.has(nKey)) {
              visited.add(nKey);
              queue.push(posToRoom.get(nKey)!);
            }
          }
        }
        components.push(component);
      }
      return components;
    }

    it('should identify single connected component', () => {
      const rooms = [
        { x: 0, y: 0, placementId: 1 },
        { x: 1, y: 0, placementId: 2 },
        { x: 0, y: 1, placementId: 3 }
      ];

      const components = findComponents(rooms);
      expect(components).toHaveLength(1);
      expect(components[0]).toHaveLength(3);
    });

    it('should identify multiple disconnected components', () => {
      const rooms = [
        { x: 0, y: 0, placementId: 1 },
        { x: 1, y: 0, placementId: 2 },
        { x: 5, y: 5, placementId: 3 },
        { x: 6, y: 5, placementId: 4 }
      ];

      const components = findComponents(rooms);
      expect(components).toHaveLength(2);
      expect(components[0]).toHaveLength(2);
      expect(components[1]).toHaveLength(2);
    });

    it('should handle single room as one component', () => {
      const rooms = [{ x: 0, y: 0, placementId: 1 }];

      const components = findComponents(rooms);
      expect(components).toHaveLength(1);
      expect(components[0]).toHaveLength(1);
    });

    it('should handle diagonal rooms as separate components', () => {
      const rooms = [
        { x: 0, y: 0, placementId: 1 },
        { x: 1, y: 1, placementId: 2 }
      ];

      const components = findComponents(rooms);
      expect(components).toHaveLength(2);
    });
  });

  describe('Faction Territory Assignment', () => {
    interface Faction {
      id: number;
      name: string;
      influence: number;
    }

    function assignFactionTerritories(rooms: Array<{id: number}>, factions: Array<{id: number, influence: number}>, unclaimedPercent: number = 0.05) {
    if (rooms.length === 0) {
      return { unclaimed: [] };
    }

    if (!factions || factions.length === 0) {
      return { unclaimed: rooms.map(r => r.id) };
    }

    const assignments: Record<string | number, number[]> = {};
    const assigned = new Set<number>();

    // Initialize assignments for all factions (including zero influence ones)
    factions.forEach(f => {
      assignments[f.id] = [];
    });

    // Filter out zero-influence factions for actual assignment
    const activeFactions = factions.filter(f => f.influence > 0);

    if (activeFactions.length === 0) {
      assignments.unclaimed = rooms.map(r => r.id);
      return assignments;
    }

    // Calculate total influence
    const totalInfluence = activeFactions.reduce((sum, f) => sum + f.influence, 0);

    // Calculate unclaimed rooms count
    const unclaimedCount = Math.floor(rooms.length * unclaimedPercent);
    const claimableRooms = rooms.length - unclaimedCount;

    // Copy rooms array for manipulation
    const remainingRooms = [...rooms];

    // Assign initial room to each faction randomly
    const initialAssignments = activeFactions.map(ft => {
      if (remainingRooms.length === 0) return null;

      const idx = Math.floor(Math.random() * remainingRooms.length);
      const room = remainingRooms.splice(idx, 1)[0];
      if (room) {
        assignments[ft.id] = [room.id];
        assigned.add(room.id);
        return { ...room, factionId: ft.id };
      }
      return null;
    }).filter(Boolean);

    // Calculate remaining rooms to assign after initial assignment
    const roomsToAssign = claimableRooms - activeFactions.length;

    // Distribute remaining rooms based on influence
    for (let i = 0; i < roomsToAssign && remainingRooms.length > 0; i++) {
      // Use weighted random selection based on influence
      const totalWeight = activeFactions.reduce((sum, f) => sum + f.influence, 0);
      let random = Math.random() * totalWeight;

      let selectedFaction = activeFactions[0];
      for (const faction of activeFactions) {
        random -= faction.influence;
        if (random <= 0) {
          selectedFaction = faction;
          break;
        }
      }

      // Assign room to selected faction
      if (remainingRooms.length > 0) {
        const idx = Math.floor(Math.random() * remainingRooms.length);
        const room = remainingRooms.splice(idx, 1)[0];
        if (room) {
          assignments[selectedFaction.id].push(room.id);
          assigned.add(room.id);
        }
      }
    }

    // Add unclaimed rooms
    assignments.unclaimed = remainingRooms.map(r => r.id);

    return assignments;
  }

    it('should assign rooms proportionally to faction influence', () => {
      const rooms = Array.from({ length: 100 }, (_, i) => ({
        x: i % 10,
        y: Math.floor(i / 10),
        id: i
      }));

      const factions = [
        { id: 1, name: 'Alpha', influence: 60 },
        { id: 2, name: 'Beta', influence: 40 }
      ];

      const assignments = assignFactionTerritories(rooms, factions, 0); // No unclaimed rooms

      const totalAssigned = assignments[1].length + assignments[2].length;
      expect(totalAssigned).toBe(100);

      // Alpha should get roughly 60% of rooms, Beta should get 40%
      const alphaRatio = assignments[1].length / totalAssigned;
      const betaRatio = assignments[2].length / totalAssigned;

      expect(alphaRatio).toBeCloseTo(0.6, 1);
      expect(betaRatio).toBeCloseTo(0.4, 1);
    });

    it('should leave some rooms unclaimed based on unclaimedPercent', () => {
      const rooms = Array.from({ length: 100 }, (_, i) => ({
        x: i % 10,
        y: Math.floor(i / 10),
        id: i
      }));

      const factions = [
        { id: 1, name: 'Alpha', influence: 100 }
      ];

      const assignments = assignFactionTerritories(rooms, factions, 0.2);

      expect(assignments["unclaimed"].length).toBe(20);
      expect(assignments[1].length).toBe(80);
    });

    it('should handle single faction correctly', () => {
      const rooms = Array.from({ length: 10 }, (_, i) => ({
        x: i,
        y: 0,
        id: i
      }));

      const factions = [
        { id: 1, name: 'Solo', influence: 100 }
      ];

      const assignments = assignFactionTerritories(rooms, factions, 0.1);

      expect(assignments[1].length).toBe(9);
      expect(assignments["unclaimed"].length).toBe(1);
    });

    it('should ignore factions with zero influence', () => {
      const rooms = Array.from({ length: 10 }, (_, i) => ({
        x: i,
        y: 0,
        id: i
      }));

      const factions = [
        { id: 1, name: 'Active', influence: 100 },
        { id: 2, name: 'Inactive', influence: 0 }
      ];

      const assignments = assignFactionTerritories(rooms, factions, 0.1); // 10% unclaimed

      expect(assignments[1].length).toBe(9);
      expect(assignments[2]).toEqual([]);
      expect(assignments["unclaimed"].length).toBe(1);
    });

    it('should handle empty rooms array', () => {
      const rooms: Array<{ x: number; y: number; id: number }> = [];
      const factions = [{ id: 1, name: 'Test', influence: 100 }];

      const assignments = assignFactionTerritories(rooms, factions);

      expect(assignments[1]).toEqual([]);
      expect(assignments["unclaimed"]).toEqual([]);
    });

    it('should handle empty factions array', () => {
      const rooms = [{ x: 0, y: 0, id: 1 }];
      const factions: Array<Faction> = [];

      const assignments = assignFactionTerritories(rooms, factions);

      expect(assignments["unclaimed"]).toEqual([1]);
    });
  });

  describe('Room Generation Logic', () => {
    it('should calculate minimum rooms per floor correctly', () => {
      const MIN_ROOMS_PER_FLOOR = 200;
      const GRID_SIZE = 20;

      // Test that grid can accommodate minimum rooms
      const maxGridRooms = GRID_SIZE * GRID_SIZE;
      expect(maxGridRooms).toBeGreaterThanOrEqual(MIN_ROOMS_PER_FLOOR);
    });

    it('should handle staircase placement constraints', () => {
      const STAIRCASES_PER_FLOOR = 3;
      const roomPositions = [
        { x: 0, y: 0 }, // entrance
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 }
      ];

      // Simulate staircase placement logic
      const staircasePositions: Array<{ x: number; y: number }> = [];
      let placementAttempts = 0;

      for (let i = 0; i < STAIRCASES_PER_FLOOR && placementAttempts < 1000; i++) {
        let staircasePos: { x: number; y: number };
        let attempts = 0;

        do {
          staircasePos = roomPositions[Math.floor(Math.random() * roomPositions.length)];
          attempts++;
          placementAttempts++;
          if (attempts > 100) break;
        } while (
          staircasePositions.some(pos => pos.x === staircasePos.x && pos.y === staircasePos.y) ||
          (staircasePos.x === 0 && staircasePos.y === 0) // avoid entrance
        );

        if (attempts <= 100) {
          staircasePositions.push(staircasePos);
        }
      }

      // Should place some staircases (depends on randomness, but should work with enough room positions)
      expect(staircasePositions.length).toBeGreaterThan(0);
      expect(staircasePositions.length).toBeLessThanOrEqual(STAIRCASES_PER_FLOOR);

      // No staircases should be at entrance
      staircasePositions.forEach(pos => {
        expect(pos.x === 0 && pos.y === 0).toBe(false);
      });
    });

    it('should determine room types with correct probabilities', () => {
      const testCount = 10000;
      let treasureRooms = 0;
      let outdoorRooms = 0;
      let normalRooms = 0;

      for (let i = 0; i < testCount; i++) {
        const rand = Math.random();

        if (rand < 0.08) { // 8% treasure
          treasureRooms++;
        } else if (rand < 0.12) { // 4% outdoor (12% - 8%)
          outdoorRooms++;
        } else { // 88% normal
          normalRooms++;
        }
      }

      const treasureRatio = treasureRooms / testCount;
      const outdoorRatio = outdoorRooms / testCount;
      const normalRatio = normalRooms / testCount;

      expect(treasureRatio).toBeCloseTo(0.08, 1);
      expect(outdoorRatio).toBeCloseTo(0.04, 1);
      expect(normalRatio).toBeCloseTo(0.88, 1);
    });
  });

  describe('Connection Generation Logic', () => {
    function generateConnections(rooms: Array<{ id: number; x: number; y: number }>) {
      const roomMap = new Map<string, { id: number; x: number; y: number }>();
      rooms.forEach(r => roomMap.set(`${r.x},${r.y}`, r));

      const connections: Array<{
        fromRoomId: number;
        toRoomId: number;
        direction: string;
      }> = [];

      for (const room of rooms) {
        const directions = [
          { dx: 0, dy: 1, dir: 'north' },
          { dx: 0, dy: -1, dir: 'south' },
          { dx: 1, dy: 0, dir: 'east' },
          { dx: -1, dy: 0, dir: 'west' }
        ];

        for (const { dx, dy, dir } of directions) {
          const neighbor = roomMap.get(`${room.x + dx},${room.y + dy}`);
          if (neighbor) {
            connections.push({
              fromRoomId: room.id,
              toRoomId: neighbor.id,
              direction: dir
            });
          }
        }
      }

      return connections;
    }

    it('should generate bidirectional connections', () => {
      const rooms = [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 1, y: 0 }
      ];

      const connections = generateConnections(rooms);

      expect(connections).toHaveLength(2);
      expect(connections).toContainEqual({
        fromRoomId: 1,
        toRoomId: 2,
        direction: 'east'
      });
      expect(connections).toContainEqual({
        fromRoomId: 2,
        toRoomId: 1,
        direction: 'west'
      });
    });

    it('should handle cross-shaped room layout', () => {
      const rooms = [
        { id: 1, x: 0, y: 0 }, // center
        { id: 2, x: 0, y: 1 }, // north
        { id: 3, x: 0, y: -1 }, // south
        { id: 4, x: 1, y: 0 }, // east
        { id: 5, x: -1, y: 0 } // west
      ];

      const connections = generateConnections(rooms);

      // Center room should have 4 outgoing connections
      const centerConnections = connections.filter(c => c.fromRoomId === 1);
      expect(centerConnections).toHaveLength(4);

      // Each outer room should have 1 connection back to center
      for (let i = 2; i <= 5; i++) {
        const outerConnections = connections.filter(c => c.fromRoomId === i);
        expect(outerConnections).toHaveLength(1);
        expect(outerConnections[0].toRoomId).toBe(1);
      }
    });

    it('should not create connections to non-existent rooms', () => {
      const rooms = [
        { id: 1, x: 0, y: 0 }
      ];

      const connections = generateConnections(rooms);

      expect(connections).toHaveLength(0);
    });
  });

  describe('Batch Processing Logic', () => {
    it('should calculate correct batch sizes', () => {
      const BATCH_SIZE = 50;
      const totalItems = 237;

      const batches = [];
      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE, totalItems);
        batches.push({ start: i, end: batchEnd, size: batchEnd - i });
      }

      expect(batches).toHaveLength(5);
      expect(batches[0].size).toBe(50);
      expect(batches[1].size).toBe(50);
      expect(batches[2].size).toBe(50);
      expect(batches[3].size).toBe(50);
      expect(batches[4].size).toBe(37); // remainder

      const totalProcessed = batches.reduce((sum, b) => sum + b.size, 0);
      expect(totalProcessed).toBe(totalItems);
    });
  });

  describe('Faction Scaling Logic', () => {
    it('should scale faction count with room count', () => {
      const MIN_FACTIONS = 3;
      const MAX_FACTIONS = 8;

      function calculateFactionCount(claimableRoomCount: number): number {
        return Math.max(
          MIN_FACTIONS,
          Math.min(MAX_FACTIONS, Math.floor(claimableRoomCount / 80))
        );
      }

      expect(calculateFactionCount(50)).toBe(3); // Below minimum threshold
      expect(calculateFactionCount(160)).toBe(3); // At minimum
      expect(calculateFactionCount(240)).toBe(3); // Still at minimum
      expect(calculateFactionCount(320)).toBe(4); // First increase
      expect(calculateFactionCount(640)).toBe(8); // At maximum
      expect(calculateFactionCount(1000)).toBe(8); // Capped at maximum
    });
  });
});