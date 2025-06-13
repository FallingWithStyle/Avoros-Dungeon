
/**
 * File: exploration-storage.test.ts
 * Responsibility: Unit tests for ExplorationStorage room navigation and exploration
 * Notes: Tests room movement, position tracking, and exploration data management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExplorationStorage } from '../exploration-storage';
import { db } from '../../db';
import { redisService } from '../../lib/redis-service';

// Mock the database and redis service
jest.mock('../../db');
jest.mock('../../lib/redis-service');

const mockDb = db as jest.Mocked<typeof db>;
const mockRedisService = redisService as jest.Mocked<typeof redisService>;

describe('ExplorationStorage', () => {
  let explorationStorage: ExplorationStorage;

  beforeEach(() => {
    explorationStorage = new ExplorationStorage();
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should create a room with correct properties', async () => {
      const mockRoom = {
        id: 1,
        floorId: 1,
        x: 10,
        y: 20,
        name: 'Test Room',
        description: 'A test room',
        type: 'normal',
        environment: 'indoor',
        isSafe: false,
        hasLoot: false
      };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockRoom])
      };
      mockDb.insert.mockReturnValue(mockInsert as any);

      const result = await explorationStorage.createRoom(
        1, 10, 20, 'normal', 'Test Room', 'A test room', 'indoor'
      );

      expect(result).toEqual(mockRoom);
      expect(mockInsert.values).toHaveBeenCalledWith({
        floorId: 1,
        x: 10,
        y: 20,
        type: 'normal',
        name: 'Test Room',
        description: 'A test room',
        environment: 'indoor',
        isSafe: false,
        hasLoot: false
      });
    });

    it('should set isSafe true for safe room types', async () => {
      const mockRoom = { id: 1, isSafe: true };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockRoom])
      };
      mockDb.insert.mockReturnValue(mockInsert as any);

      await explorationStorage.createRoom(
        1, 10, 20, 'safe', 'Safe Room', 'A safe room'
      );

      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({ isSafe: true })
      );
    });

    it('should set hasLoot true for treasure room types', async () => {
      const mockRoom = { id: 1, hasLoot: true };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockRoom])
      };
      mockDb.insert.mockReturnValue(mockInsert as any);

      await explorationStorage.createRoom(
        1, 10, 20, 'treasure', 'Treasure Room', 'A treasure room'
      );

      expect(mockInsert.values).toHaveBeenCalledWith(
        expect.objectContaining({ hasLoot: true })
      );
    });
  });

  describe('getRoomsForFloor', () => {
    it('should return cached rooms when available', async () => {
      const mockRooms = [
        { id: 1, name: 'Room 1', floorId: 1 },
        { id: 2, name: 'Room 2', floorId: 1 }
      ];

      mockRedisService.getFloorRooms.mockResolvedValue(mockRooms);

      const result = await explorationStorage.getRoomsForFloor(1);

      expect(result).toEqual(mockRooms);
      expect(mockRedisService.getFloorRooms).toHaveBeenCalledWith(1);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should fetch from database when cache miss', async () => {
      const mockRooms = [{ id: 1, name: 'Room 1' }];

      mockRedisService.getFloorRooms.mockResolvedValue(null);
      
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockRooms)
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      const result = await explorationStorage.getRoomsForFloor(1);

      expect(result).toEqual(mockRooms);
      expect(mockRedisService.setFloorRooms).toHaveBeenCalledWith(1, mockRooms, 3600);
    });
  });

  describe('moveToRoom', () => {
    it('should successfully move crawler to connected room', async () => {
      const currentPosition = { roomId: 1, crawlerId: 1 };
      const currentRoom = { id: 1, name: 'Current Room', type: 'normal' };
      const connection = { fromRoomId: 1, toRoomId: 2, direction: 'north', isLocked: false };
      const newRoom = { id: 2, name: 'New Room', x: 10, y: 11 };

      // Mock current position query
      const mockSelectPosition = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([currentPosition])
      };

      // Mock room queries
      const mockSelectRoom = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValueOnce([currentRoom]).mockResolvedValueOnce([newRoom])
      };

      // Mock connection query
      const mockSelectConnection = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([connection])
      };

      // Mock insert for new position
      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };

      mockDb.select
        .mockReturnValueOnce(mockSelectPosition as any)
        .mockReturnValueOnce(mockSelectRoom as any)
        .mockReturnValueOnce(mockSelectConnection as any)
        .mockReturnValueOnce(mockSelectRoom as any);
      
      mockDb.insert.mockReturnValue(mockInsert as any);

      const result = await explorationStorage.moveToRoom(1, 'north');

      expect(result.success).toBe(true);
      expect(result.newRoom).toEqual(newRoom);
      expect(mockInsert.values).toHaveBeenCalledWith({
        crawlerId: 1,
        roomId: 2,
        enteredAt: expect.any(Date)
      });
    });

    it('should fail when no current position found', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      const result = await explorationStorage.moveToRoom(1, 'north');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Crawler position not found');
    });

    it('should fail when no connection exists in direction', async () => {
      const currentPosition = { roomId: 1, crawlerId: 1 };
      const currentRoom = { id: 1, name: 'Current Room', type: 'normal' };

      const mockSelectPosition = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([currentPosition])
      };

      const mockSelectRoom = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([currentRoom])
      };

      const mockSelectConnection = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      // Mock getAvailableDirections method
      const mockAvailableDirections = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      mockDb.select
        .mockReturnValueOnce(mockSelectPosition as any)
        .mockReturnValueOnce(mockSelectRoom as any)
        .mockReturnValueOnce(mockAvailableDirections as any)
        .mockReturnValueOnce(mockSelectRoom as any)
        .mockReturnValueOnce(mockSelectConnection as any);

      const result = await explorationStorage.moveToRoom(1, 'north');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No exit north from current room');
    });

    it('should fail when connection is locked', async () => {
      const currentPosition = { roomId: 1, crawlerId: 1 };
      const currentRoom = { id: 1, name: 'Current Room', type: 'normal' };
      const connection = { fromRoomId: 1, toRoomId: 2, direction: 'north', isLocked: true };

      const mockSelectPosition = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([currentPosition])
      };

      const mockSelectRoom = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([currentRoom])
      };

      const mockSelectConnection = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([connection])
      };

      const mockAvailableDirections = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      mockDb.select
        .mockReturnValueOnce(mockSelectPosition as any)
        .mockReturnValueOnce(mockSelectRoom as any)
        .mockReturnValueOnce(mockAvailableDirections as any)
        .mockReturnValueOnce(mockSelectRoom as any)
        .mockReturnValueOnce(mockSelectConnection as any);

      const result = await explorationStorage.moveToRoom(1, 'north');

      expect(result.success).toBe(false);
      expect(result.error).toBe('The north exit is locked');
    });
  });

  describe('getCrawlerCurrentRoom', () => {
    it('should return cached room when available', async () => {
      const mockRoom = { id: 1, name: 'Cached Room' };

      mockRedisService.getCurrentRoom.mockResolvedValue(mockRoom);

      const result = await explorationStorage.getCrawlerCurrentRoom(1);

      expect(result).toEqual(mockRoom);
      expect(mockRedisService.getCurrentRoom).toHaveBeenCalledWith(1);
    });

    it('should fetch from database when cache miss', async () => {
      const mockRoom = { id: 1, name: 'Database Room' };

      mockRedisService.getCurrentRoom.mockResolvedValue(null);

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ rooms: mockRoom }])
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      const result = await explorationStorage.getCrawlerCurrentRoom(1);

      expect(result).toEqual(mockRoom);
      expect(mockRedisService.setCurrentRoom).toHaveBeenCalledWith(1, mockRoom, 300);
    });

    it('should return undefined when no position found', async () => {
      mockRedisService.getCurrentRoom.mockResolvedValue(null);

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      const result = await explorationStorage.getCrawlerCurrentRoom(1);

      expect(result).toBeUndefined();
    });
  });

  describe('getAvailableDirections', () => {
    it('should return cached directions when available', async () => {
      const mockDirections = ['north', 'south'];

      mockRedisService.getAvailableDirections.mockResolvedValue(mockDirections);

      const result = await explorationStorage.getAvailableDirections(1);

      expect(result).toEqual(mockDirections);
      expect(mockRedisService.getAvailableDirections).toHaveBeenCalledWith(1);
    });

    it('should add staircase direction for stairs rooms', async () => {
      const mockConnections = [{ direction: 'north' }];
      const mockRoom = { type: 'stairs' };

      mockRedisService.getAvailableDirections.mockResolvedValue(null);

      const mockSelectConnections = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockConnections)
      };

      const mockSelectRoom = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockRoom])
      };

      mockDb.select
        .mockReturnValueOnce(mockSelectConnections as any)
        .mockReturnValueOnce(mockSelectRoom as any);

      const result = await explorationStorage.getAvailableDirections(1);

      expect(result).toContain('north');
      expect(result).toContain('staircase');
      expect(mockRedisService.setAvailableDirections).toHaveBeenCalledWith(1, ['north', 'staircase'], 600);
    });
  });

  describe('ensureCrawlerHasPosition', () => {
    it('should do nothing when crawler already has position', async () => {
      const mockRoom = { id: 1, name: 'Current Room' };

      // Mock getCrawlerCurrentRoom to return a room
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ rooms: mockRoom }])
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      await explorationStorage.ensureCrawlerHasPosition(1);

      // Should not attempt to insert new position
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should place crawler in entrance room when no position', async () => {
      const mockFloor = { id: 1, floorNumber: 1 };
      const mockEntranceRoom = { id: 100, name: 'Entrance', type: 'entrance' };

      // Mock getCrawlerCurrentRoom to return undefined (no position)
      const mockSelectEmpty = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      // Mock floor query
      const mockSelectFloor = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockFloor])
      };

      // Mock entrance room query
      const mockSelectEntrance = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([mockEntranceRoom])
      };

      // Mock insert
      const mockInsert = {
        values: jest.fn().mockResolvedValue([])
      };

      mockDb.select
        .mockReturnValueOnce(mockSelectEmpty as any)
        .mockReturnValueOnce(mockSelectFloor as any)
        .mockReturnValueOnce(mockSelectEntrance as any);

      mockDb.insert.mockReturnValue(mockInsert as any);

      await explorationStorage.ensureCrawlerHasPosition(1);

      expect(mockInsert.values).toHaveBeenCalledWith({
        crawlerId: 1,
        roomId: 100,
        enteredAt: expect.any(Date)
      });
    });

    it('should throw error when floor 1 not found', async () => {
      // Mock getCrawlerCurrentRoom to return undefined
      const mockSelectEmpty = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      // Mock floor query to return empty
      const mockSelectFloor = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };

      mockDb.select
        .mockReturnValueOnce(mockSelectEmpty as any)
        .mockReturnValueOnce(mockSelectFloor as any);

      await expect(explorationStorage.ensureCrawlerHasPosition(1))
        .rejects.toThrow('Floor 1 not found');
    });
  });

  describe('getFloorBounds', () => {
    it('should return cached bounds when available', async () => {
      const mockBounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };

      mockRedisService.getFloorBounds.mockResolvedValue(mockBounds);

      const result = await explorationStorage.getFloorBounds(1);

      expect(result).toEqual(mockBounds);
      expect(mockRedisService.getFloorBounds).toHaveBeenCalledWith(1);
    });

    it('should calculate bounds from room positions', async () => {
      const mockRooms = [
        { x: 5, y: 3 },
        { x: 15, y: 8 },
        { x: 2, y: 12 }
      ];

      mockRedisService.getFloorBounds.mockResolvedValue(null);

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(mockRooms)
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      const result = await explorationStorage.getFloorBounds(1);

      expect(result).toEqual({
        minX: 2,
        maxX: 15,
        minY: 3,
        maxY: 12
      });
      expect(mockRedisService.setFloorBounds).toHaveBeenCalledWith(1, result, 3600);
    });

    it('should return zero bounds for empty floor', async () => {
      mockRedisService.getFloorBounds.mockResolvedValue(null);

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([])
      };
      mockDb.select.mockReturnValue(mockSelect as any);

      const result = await explorationStorage.getFloorBounds(1);

      expect(result).toEqual({
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0
      });
    });
  });
});
