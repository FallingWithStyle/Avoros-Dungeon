import { db } from "../db";
import {
  rooms,
  roomConnections,
  crawlerPositions,
  floors,
  factions,
  type Room,
  type RoomConnection,
  type CrawlerWithDetails,
} from "@shared/schema";
import { eq, desc, and, inArray, not, sql } from "drizzle-orm";
import { BaseStorage } from "./base-storage";
import { redisService } from "../lib/redis-service";

export class ExplorationStorage extends BaseStorage {
  async createRoom(
    floorId: number,
    x: number,
    y: number,
    type: string,
    name: string,
    description: string,
    environment: string = "indoor",
  ): Promise<Room> {
    const [room] = await db
      .insert(rooms)
      .values({
        floorId,
        x,
        y,
        type,
        name,
        description,
        environment,
        isSafe: type === "safe",
        hasLoot: type === "treasure",
      })
      .returning();
    return room;
  }

  async getRoomsForFloor(floorId: number): Promise<Room[]> {
    // Try to get from cache first
    try {
      const cached = await redisService.getFloorRooms(floorId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log('Redis cache miss for floor rooms, fetching from database');
    }

    const floorRooms = await db.select().from(rooms).where(eq(rooms.floorId, floorId));

    // Cache the result (floor rooms rarely change)
    try {
      await redisService.setFloorRooms(floorId, floorRooms, 3600); // 1 hour TTL
    } catch (error) {
      console.log('Failed to cache floor rooms data');
    }

    return floorRooms;
  }

  async getRoom(roomId: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    return room;
  }

  async createRoomConnection(
    fromRoomId: number,
    toRoomId: number,
    direction: string,
  ): Promise<RoomConnection> {
    const [connection] = await db
      .insert(roomConnections)
      .values({
        fromRoomId,
        toRoomId,
        direction,
      })
      .returning();
    return connection;
  }

  async getAvailableDirections(roomId: number): Promise<string[]> {
    // Try to get from cache first
    try {
      const cached = await redisService.getAvailableDirections(roomId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log('Redis cache miss for available directions, fetching from database');
    }

    const connections = await db
      .select()
      .from(roomConnections)
      .where(eq(roomConnections.fromRoomId, roomId));

    const directions = connections.map((conn) => conn.direction);

    const room = await this.getRoom(roomId);
    if (room && room.type === "stairs") {
      directions.push("staircase");
    }

    // Cache the result (room connections rarely change)
    try {
      await redisService.setAvailableDirections(roomId, directions, 600); // 10 minutes TTL
    } catch (error) {
      console.log('Failed to cache available directions data');
    }

    return directions;
  }

  async moveToRoom(
    crawlerId: number,
    direction: string,
    debugEnergyDisabled?: boolean,
  ): Promise<{ success: boolean; newRoom?: Room; error?: string }> {
    console.log(`=== MOVE TO ROOM ===`);
    console.log(`Crawler ID: ${crawlerId}, Direction: ${direction}`);

    const [currentPosition] = await db
      .select()
      .from(crawlerPositions)
      .where(eq(crawlerPositions.crawlerId, crawlerId))
      .orderBy(desc(crawlerPositions.enteredAt))
      .limit(1);

    if (!currentPosition) {
      console.log(`ERROR: No current position found for crawler ${crawlerId}`);
      return { success: false, error: "Crawler position not found" };
    }

    console.log(`Current position: Room ${currentPosition.roomId}`);

    const currentRoom = await this.getRoom(currentPosition.roomId);
    if (!currentRoom) {
      console.log(`ERROR: Current room ${currentPosition.roomId} not found in database`);
      return { success: false, error: "Current room not found" };
    }

    console.log(`Current room: ${currentRoom.name} (${currentRoom.x}, ${currentRoom.y})`);

    if (direction === "staircase") {
      if (currentRoom.type !== "stairs") {
        console.log(`ERROR: Attempted staircase movement but room type is ${currentRoom.type}, not stairs`);
        return { success: false, error: "No staircase in this room" };
      }
      console.log(`Handling staircase movement...`);
      return await this.handleStaircaseMovement(crawlerId, currentRoom);
    }

    // Get available directions for debugging
    const availableDirections = await this.getAvailableDirections(currentPosition.roomId);
    console.log(`Available directions from room ${currentPosition.roomId}:`, availableDirections);

    const [connection] = await db
      .select()
      .from(roomConnections)
      .where(
        and(
          eq(roomConnections.fromRoomId, currentPosition.roomId),
          eq(roomConnections.direction, direction),
        ),
      );

    if (!connection) {
      console.log(`ERROR: No connection found for direction ${direction} from room ${currentPosition.roomId}`);
      console.log(`Available directions:`, availableDirections);
      return { success: false, error: `No exit ${direction} from current room` };
    }

    console.log(`Found connection: ${connection.fromRoomId} -> ${connection.toRoomId} (${connection.direction})`);

    if (connection.isLocked) {
      console.log(`ERROR: Connection is locked`);
      return { success: false, error: `The ${direction} exit is locked` };
    }

    const newRoom = await this.getRoom(connection.toRoomId);
    if (!newRoom) {
      console.log(`ERROR: Destination room ${connection.toRoomId} not found`);
      return { success: false, error: "Destination room not found" };
    }

    console.log(`Destination room: ${newRoom.name} (${newRoom.x}, ${newRoom.y})`);

    const previousVisit = await db
      .select()
      .from(crawlerPositions)
      .where(
        and(
          eq(crawlerPositions.crawlerId, crawlerId),
          eq(crawlerPositions.roomId, connection.toRoomId),
        ),
      )
      .limit(1);

    let energyCost = 10;
    if (previousVisit.length > 0) {
      energyCost = 5;
      console.log(`Revisiting room - reduced energy cost: ${energyCost}`);
    } else {
      console.log(`First visit to room - standard energy cost: ${energyCost}`);
    }

    console.log(`Inserting new crawler position...`);
    await db.insert(crawlerPositions).values({
      crawlerId,
      roomId: connection.toRoomId,
      enteredAt: new Date(),
    });

    // Invalidate position-related caches when crawler moves
    try {
      await redisService.del(`crawler:${crawlerId}:current-room`);
      await redisService.del(`crawler:${crawlerId}:explored`);
      console.log(`Invalidated position caches for crawler ${crawlerId}`);
    } catch (error) {
      console.log('Failed to invalidate position caches:', error);
    }

    console.log(`Movement successful: Crawler ${crawlerId} moved ${direction} to room ${newRoom.id} (${newRoom.name})`);
    return { success: true, newRoom };
  }

  async getCrawlerCurrentRoom(crawlerId: number): Promise<Room | undefined> {
    console.log(`Getting current room for crawler ${crawlerId}`);

    // Try to get from cache first
    try {
      const cached = await redisService.getCurrentRoom(crawlerId);
      if (cached) {
        console.log(`Found cached room for crawler ${crawlerId}:`, cached.name);
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log('Redis cache miss for current room, fetching from database');
    }

    const result = await db
      .select({
        room: rooms
      })
      .from(crawlerPositions)
      .innerJoin(rooms, eq(crawlerPositions.roomId, rooms.id))
      .where(eq(crawlerPositions.crawlerId, crawlerId))
      .orderBy(desc(crawlerPositions.enteredAt))
      .limit(1);

    console.log(`Database query result for crawler ${crawlerId}:`, result.length > 0 ? `Found room: ${result[0].room.name}` : 'No position found');

    if (result.length === 0) {
      console.log(`No position found for crawler ${crawlerId} - they may need to be placed in a room`);
      return undefined;
    }

    const room = result[0].room;

    if (room) {
      // Cache the result
      try {
        await redisService.setCurrentRoom(crawlerId, room, 300); // 5 minutes TTL
      } catch (error) {
        console.log('Failed to cache current room data');
      }
    }

    return room;
  }

  async getPlayersInRoom(roomId: number): Promise<CrawlerWithDetails[]> {
    // Try to get from cache first
    try {
      const cached = await redisService.getPlayersInRoom(roomId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log('Redis cache miss for players in room, fetching from database');
    }

    const crawlerIds = await db
      .selectDistinct({ crawlerId: crawlerPositions.crawlerId })
      .from(crawlerPositions)
      .where(eq(crawlerPositions.roomId, roomId));

    // Note: This would need access to crawler storage to get full details
    // For now, returning empty array but caching the result
    const players: CrawlerWithDetails[] = [];

    // Cache the result (players in room changes frequently, short TTL)
    try {
      await redisService.setPlayersInRoom(roomId, players, 120); // 2 minutes TTL
    } catch (error) {
      console.log('Failed to cache players in room data');
    }

    return players;
  }

  async getFactions(): Promise<Array<{ id: number; name: string; color: string }>> {
    // Try to get from cache first
    try {
      const cached = await redisService.getFactions();
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log('Redis cache miss for factions, fetching from database');
    }

    const result = await db
      .select({
        id: factions.id,
        name: factions.name,
        color: factions.color,
      })
      .from(factions);

    const formattedFactions = result.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color ?? "#6B7280",
    }));

    // Cache the result (factions rarely change)
    try {
      await redisService.setFactions(formattedFactions, 1800); // 30 minutes TTL
    } catch (error) {
      console.log('Failed to cache factions data');
    }

    return formattedFactions;
  }

  async getExploredRooms(crawlerId: number): Promise<any[]> {
    // Try to get from cache first
    try {
      const cached = await redisService.getExploredRooms(crawlerId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log('Redis cache miss for explored rooms, fetching from database');
    }

    const visitedRooms = await db
      .select({
        roomId: crawlerPositions.roomId,
        enteredAt: crawlerPositions.enteredAt,
      })
      .from(crawlerPositions)
      .where(eq(crawlerPositions.crawlerId, crawlerId))
      .orderBy(desc(crawlerPositions.enteredAt));

    const uniqueRoomIds = Array.from(new Set(visitedRooms.map(vr => vr.roomId)));

    if (uniqueRoomIds.length === 0) {
      return [];
    }

    const roomDetails = await db
      .select()
      .from(rooms)
      .where(inArray(rooms.id, uniqueRoomIds));

    const [currentPosition] = await db
      .select()
      .from(crawlerPositions)
      .where(eq(crawlerPositions.crawlerId, crawlerId))
      .orderBy(desc(crawlerPositions.enteredAt))
      .limit(1);

    const currentRoomId = currentPosition?.roomId;

    const exploredRooms = roomDetails.map(room => ({
      id: room.id,
      name: room.name,
      description: room.description,
      type: room.type,
      environment: room.environment,
      isSafe: room.isSafe,
      hasLoot: room.hasLoot,
      x: room.x,
      y: room.y,
      floorId: room.floorId,
      isCurrentRoom: room.id === currentRoomId,
      isExplored: true,
      factionId: room.factionId,
    }));

    // Cache the result
    try {
      await redisService.setExploredRooms(crawlerId, exploredRooms, 600); // 10 minutes TTL
    } catch (error) {
      console.log('Failed to cache explored rooms data');
    }

    return exploredRooms;
  }

  async getScannedRooms(crawlerId: number, scanRange: number): Promise<any[]> {
    // Try to get from cache first
    try {
      const cached = await redisService.getScannedRooms(crawlerId, scanRange);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log('Redis cache miss for scanned rooms, fetching from database');
    }

    // Get current position
    const [currentPosition] = await db
      .select()
      .from(crawlerPositions)
      .where(eq(crawlerPositions.crawlerId, crawlerId))
      .orderBy(desc(crawlerPositions.enteredAt))
      .limit(1);

    if (!currentPosition) {
      return [];
    }

    const currentRoom = await this.getRoom(currentPosition.roomId);
    if (!currentRoom) {
      return [];
    }

    // Get all rooms within scan range on the same floor
    const nearbyRooms = await db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.floorId, currentRoom.floorId),
          sql`ABS(${rooms.x} - ${currentRoom.x}) + ABS(${rooms.y} - ${currentRoom.y}) <= ${scanRange}`
        )
      );

    // Get visited rooms to mark them as explored
    const visitedRooms = await db
      .select({ roomId: crawlerPositions.roomId })
      .from(crawlerPositions)
      .where(eq(crawlerPositions.crawlerId, crawlerId));

    const visitedRoomIds = new Set(visitedRooms.map(vr => vr.roomId));

    const scannedRooms = nearbyRooms.map(room => ({
      id: room.id,
      name: room.name,
      description: visitedRoomIds.has(room.id) ? room.description : "Detected by scan",
      type: room.type,
      environment: room.environment,
      isSafe: room.isSafe,
      hasLoot: room.hasLoot,
      x: room.x,
      y: room.y,
      floorId: room.floorId,
      isCurrentRoom: room.id === currentPosition.roomId,
      isExplored: visitedRoomIds.has(room.id),
      isScanned: !visitedRoomIds.has(room.id),
      factionId: room.factionId,
    }));

    // Cache the result
    try {
      await redisService.setScannedRooms(crawlerId, scanRange, scannedRooms, 300); // 5 minutes TTL
    } catch (error) {
      console.log('Failed to cache scanned rooms data');
    }

    return scannedRooms;
  }

  async getFloorBounds(floorId: number): Promise<{ minX: number; maxX: number; minY: number; maxY: number }> {
    // Try to get from cache first
    try {
      const cached = await redisService.getFloorBounds(floorId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log('Redis cache miss for floor bounds, fetching from database');
    }

    const floorRooms = await db
      .select({ x: rooms.x, y: rooms.y })
      .from(rooms)
      .where(eq(rooms.floorId, floorId));

    if (floorRooms.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const xs = floorRooms.map(r => r.x);
    const ys = floorRooms.map(r => r.y);

    const bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };

    // Cache the result (floor bounds rarely change)
    try {
      await redisService.setFloorBounds(floorId, bounds, 3600); // 1 hour TTL
    } catch (error) {
      console.log('Failed to cache floor bounds data');
    }

    return bounds;
  }

  async ensureCrawlerHasPosition(crawlerId: number): Promise<void> {
    console.log(`Ensuring crawler ${crawlerId} has position...`);

    const currentRoom = await this.getCrawlerCurrentRoom(crawlerId);
    if (currentRoom) {
      console.log(`Crawler ${crawlerId} already has position in room ${currentRoom.id} (${currentRoom.name})`);
      return; // Crawler already has a position
    }

    console.log(`Crawler ${crawlerId} has no position, placing in entrance room...`);

    // Place crawler in entrance room
    const [floor1] = await db.select().from(floors).where(eq(floors.floorNumber, 1));
    if (!floor1) {
      console.error("Floor 1 not found when ensuring crawler position");
      throw new Error("Floor 1 not found");
    }

    const [entranceRoom] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.floorId, floor1.id), eq(rooms.type, "entrance")));

    if (!entranceRoom) {
      console.error("Entrance room not found when ensuring crawler position");
      throw new Error("Entrance room not found");
    }

    console.log(`Placing crawler ${crawlerId} in entrance room ${entranceRoom.id} (${entranceRoom.name})`);

    await db.insert(crawlerPositions).values({
      crawlerId: crawlerId,
      roomId: entranceRoom.id,
      enteredAt: new Date(),
    });

    console.log(`Successfully placed crawler ${crawlerId} in room ${entranceRoom.id}`);

    // Invalidate cache
    try {
      await redisService.invalidateCurrentRoom(crawlerId);
    } catch (error) {
      console.log('Failed to invalidate current room cache');
    }
  }

  private async handleStaircaseMovement(
    crawlerId: number,
    currentRoom: any,
  ): Promise<{ success: boolean; newRoom?: any; error?: string }> {
    const [currentFloor] = await db
      .select()
      .from(floors)
      .where(eq(floors.id, currentRoom.floorId));

    if (!currentFloor) {
      return { success: false, error: "Current floor not found" };
    }

    const [nextFloor] = await db
      .select()
      .from(floors)
      .where(eq(floors.floorNumber, currentFloor.floorNumber + 1));

    if (!nextFloor) {
      return { success: false, error: "No deeper floor available" };
    }

    const [entranceRoom] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.floorId, nextFloor.id), eq(rooms.type, "entrance")));

    if (!entranceRoom) {
      return { success: false, error: "No entrance found on next floor" };
    }

    await db.insert(crawlerPositions).values({
      crawlerId,
      roomId: entranceRoom.id,
      enteredAt: new Date(),
    });

    return { success: true, newRoom: entranceRoom };
  }
}