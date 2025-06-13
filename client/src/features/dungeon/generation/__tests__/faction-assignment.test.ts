
/**
 * File: faction-assignment.test.ts
 * Responsibility: Unit tests for faction assignment algorithms and territory distribution logic
 * Notes: Tests proportional room allocation, faction selection, and unclaimed room management
 */

import { assignRoomsByFactionInfluence, Faction, Room } from '../faction-assignment';

describe('Faction Assignment', () => {
  const createMockRoom = (
    placementId: number,
    type: string = 'normal',
    x: number = 0,
    y: number = 0
  ): Room => ({
    placementId,
    x,
    y,
    floorId: 1,
    name: `Room ${placementId}`,
    description: `Test room ${placementId}`,
    type,
    isSafe: false,
    isExplored: false,
    hasLoot: false,
    factionId: null,
  });

  const createMockFaction = (
    id: number,
    name: string,
    influence: number
  ): Faction => ({
    id,
    name,
    description: `Test faction ${name}`,
    mobTypes: ['test'],
    influence,
    color: '#ffffff',
    icon: 'test',
  });

  describe('assignRoomsByFactionInfluence', () => {
    it('should filter out non-claimable room types', () => {
      const rooms = [
        createMockRoom(1, 'normal'),
        createMockRoom(2, 'entrance'),
        createMockRoom(3, 'stairs'),
        createMockRoom(4, 'safe'),
        createMockRoom(5, 'treasure'),
      ];

      const factions = [createMockFaction(1, 'Alpha', 100)];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0,
      });

      // Only normal and treasure rooms should be claimable
      const totalAssigned = result[1]?.length || 0;
      expect(totalAssigned).toBe(2);

      // Non-claimable rooms should be in unclaimed
      expect(result.unclaimed).toContain(2); // entrance
      expect(result.unclaimed).toContain(3); // stairs
      expect(result.unclaimed).toContain(4); // safe
    });

    it('should respect unclaimedPercent parameter', () => {
      const rooms = Array.from({ length: 100 }, (_, i) =>
        createMockRoom(i + 1, 'normal')
      );

      const factions = [createMockFaction(1, 'Alpha', 100)];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0.2, // 20% unclaimed
      });

      expect(result.unclaimed?.length).toBe(20);
      expect(result[1]?.length).toBe(80);
    });

    it('should distribute rooms proportionally by influence', () => {
      const rooms = Array.from({ length: 100 }, (_, i) =>
        createMockRoom(i + 1, 'normal')
      );

      const factions = [
        createMockFaction(1, 'Alpha', 60),
        createMockFaction(2, 'Beta', 40),
      ];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0,
        minFactions: 2,
        roomsPerFaction: 10,
      });

      const alphaRooms = result[1]?.length || 0;
      const betaRooms = result[2]?.length || 0;
      const totalAssigned = alphaRooms + betaRooms;

      expect(totalAssigned).toBe(100);

      // Check proportional distribution (allowing some variance due to randomness and minimum guarantees)
      const alphaRatio = alphaRooms / totalAssigned;
      const betaRatio = betaRooms / totalAssigned;

      // Use tolerant assertions since there are minimum room guarantees
      expect(alphaRatio).toBeGreaterThan(0.5); // Alpha should get more than half
      expect(betaRatio).toBeGreaterThan(0.2); // Beta should get at least some rooms
    });

    it('should ensure minimum rooms per faction', () => {
      const rooms = Array.from({ length: 30 }, (_, i) =>
        createMockRoom(i + 1, 'normal')
      );

      const factions = [
        createMockFaction(1, 'Alpha', 100),
        createMockFaction(2, 'Beta', 1), // Very low influence
      ];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0,
        minFactions: 2,
        roomsPerFaction: 10,
      });

      // Both factions should get at least the minimum number of rooms
      const minExpected = Math.max(5, Math.floor(30 / (2 * 3))); // minimum calculation from code
      expect(result[1]?.length).toBeGreaterThanOrEqual(minExpected);
      expect(result[2]?.length).toBeGreaterThanOrEqual(minExpected);
    });

    it('should handle single faction correctly', () => {
      const rooms = Array.from({ length: 50 }, (_, i) =>
        createMockRoom(i + 1, 'normal')
      );

      const factions = [createMockFaction(1, 'Solo', 100)];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0.1,
      });

      expect(result[1]?.length).toBe(45); // 90% of 50
      expect(result.unclaimed?.length).toBe(5); // 10% of 50
    });

    it('should handle empty rooms array', () => {
      const rooms: Room[] = [];
      const factions = [createMockFaction(1, 'Test', 100)];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
      });

      expect(result[1]?.length || 0).toBe(0);
      expect(result.unclaimed?.length || 0).toBe(0);
    });

    it('should handle empty factions array', () => {
      const rooms = [createMockRoom(1, 'normal')];
      const factions: Faction[] = [];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
      });

      expect(result.unclaimed).toContain(1);
    });

    it('should respect minFactions parameter', () => {
      const rooms = Array.from({ length: 100 }, (_, i) =>
        createMockRoom(i + 1, 'normal')
      );

      const factions = [
        createMockFaction(1, 'Alpha', 100),
        createMockFaction(2, 'Beta', 50),
        createMockFaction(3, 'Gamma', 25),
      ];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0,
        minFactions: 2, // Should only use 2 factions despite 3 available
        roomsPerFaction: 50, // High enough to only need 2 factions
      });

      // Should only have 2 factions assigned
      const assignedFactions = Object.keys(result).filter(
        (key) => key !== 'unclaimed' && (result[Number(key)]?.length || 0) > 0
      );
      expect(assignedFactions.length).toBe(2);
    });

    it('should respect roomsPerFaction parameter for faction count calculation', () => {
      const rooms = Array.from({ length: 100 }, (_, i) =>
        createMockRoom(i + 1, 'normal')
      );

      const factions = Array.from({ length: 10 }, (_, i) =>
        createMockFaction(i + 1, `Faction${i + 1}`, 10)
      );

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0,
        minFactions: 2,
        roomsPerFaction: 20, // 100 rooms / 20 = 5 factions max
      });

      // Should use at most 5 factions
      const assignedFactions = Object.keys(result).filter(
        (key) => key !== 'unclaimed' && (result[Number(key)]?.length || 0) > 0
      );
      expect(assignedFactions.length).toBeLessThanOrEqual(5);
    });

    it('should randomize room assignment for unpredictable results', () => {
      const rooms = Array.from({ length: 10 }, (_, i) =>
        createMockRoom(i + 1, 'normal')
      );

      const factions = [createMockFaction(1, 'Alpha', 100)];

      // Run multiple times to check for randomness
      const results = Array.from({ length: 5 }, () =>
        assignRoomsByFactionInfluence({
          rooms,
          factions,
          unclaimedPercent: 0.2,
        })
      );

      // The unclaimed rooms should vary between runs due to shuffling
      const unclaimedSets = results.map(
        (r) => new Set(r.unclaimed?.sort() || [])
      );

      // At least some variation should exist (this is probabilistic)
      const uniqueUnclaimedSets = new Set(
        unclaimedSets.map((s) => Array.from(s).join(','))
      );

      // With shuffling, we should see some variation across runs
      expect(uniqueUnclaimedSets.size).toBeGreaterThan(1);
    });

    it('should handle mixed room types correctly', () => {
      const rooms = [
        createMockRoom(1, 'normal'),
        createMockRoom(2, 'treasure'),
        createMockRoom(3, 'entrance'),
        createMockRoom(4, 'stairs'),
        createMockRoom(5, 'safe'),
        createMockRoom(6, 'normal'),
      ];

      const factions = [createMockFaction(1, 'Alpha', 100)];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0,
      });

      // Should assign claimable rooms (normal + treasure = 3 rooms)
      expect(result[1]?.length).toBe(3);

      // Should put non-claimable rooms in unclaimed
      expect(result.unclaimed).toContain(3); // entrance
      expect(result.unclaimed).toContain(4); // stairs
      expect(result.unclaimed).toContain(5); // safe
    });

    it('should handle faction selection when more factions than needed', () => {
      const rooms = Array.from({ length: 20 }, (_, i) =>
        createMockRoom(i + 1, 'normal')
      );

      const factions = Array.from({ length: 10 }, (_, i) =>
        createMockFaction(i + 1, `Faction${i + 1}`, 10)
      );

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0,
        minFactions: 2,
        roomsPerFaction: 10, // 20 rooms / 10 = 2 factions
      });

      // Should only use 2 factions despite 10 available
      const assignedFactions = Object.keys(result).filter(
        (key) => key !== 'unclaimed' && (result[Number(key)]?.length || 0) > 0
      );
      expect(assignedFactions.length).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero influence factions gracefully', () => {
      const rooms = Array.from({ length: 10 }, (_, i) =>
        createMockRoom(i + 1, 'normal')
      );

      const factions = [
        createMockFaction(1, 'Active', 100),
        createMockFaction(2, 'Inactive', 0),
      ];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0,
        minFactions: 1,
      });

      // Only the active faction should get rooms
      expect(result[1]?.length).toBeGreaterThan(0);
      expect(result[2]?.length || 0).toBe(0);
    });

    it('should handle very small room counts', () => {
      const rooms = [createMockRoom(1, 'normal')];
      const factions = [createMockFaction(1, 'Alpha', 100)];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 0.5, // 50% unclaimed
      });

      // With only 1 room and 50% unclaimed, should be unclaimed
      expect(result.unclaimed?.length).toBe(1);
      expect(result[1]?.length || 0).toBe(0);
    });

    it('should handle 100% unclaimed rooms', () => {
      const rooms = Array.from({ length: 10 }, (_, i) =>
        createMockRoom(i + 1, 'normal')
      );

      const factions = [createMockFaction(1, 'Alpha', 100)];

      const result = assignRoomsByFactionInfluence({
        rooms,
        factions,
        unclaimedPercent: 1.0, // 100% unclaimed
      });

      expect(result.unclaimed?.length).toBe(10);
      expect(result[1]?.length || 0).toBe(0);
    });
  });
});
