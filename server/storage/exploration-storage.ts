/**
 * File: exploration-storage.ts
 * Responsibility: Dungeon exploration and room navigation storage operations
 * Notes: Manages room movement, position tracking, exploration history, and encounter processing
 */
import { db } from "../db";
import {
  rooms,
  roomConnections,
  crawlerPositions,
  crawlers,
  floors,
  factions,
  type Room,
  type RoomConnection,
  type CrawlerWithDetails,
} from "@shared/schema";
import { eq, desc, and, inArray, not, sql, gte, lte } from "drizzle-orm";
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
      console.log("Redis cache miss for floor rooms, fetching from database");
    }

    const floorRooms = await db
      .select()
      .from(rooms)
      .where(eq(rooms.floorId, floorId));

    // Cache the result (floor rooms rarely change)
    try {
      await redisService.setFloorRooms(floorId, floorRooms, 3600); // 1 hour TTL
    } catch (error) {
      console.log("Failed to cache floor rooms data");
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

  async getRoomConnections(roomId: number): Promise<RoomConnection[]> {
    const connections = await db
      .select()
      .from(roomConnections)
      .where(eq(roomConnections.fromRoomId, roomId));

    return connections;
  }

  async getAvailableDirections(roomId: number): Promise<string[]> {
    try {
      // Check cache first
      const cached = await redisService.getAvailableDirections(roomId);
      if (cached) {
        return cached;
      }

      // Add timeout wrapper for database operations
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 5000);
      });

      const connectionsPromise = db
        .select()
        .from(roomConnections)
        .where(eq(roomConnections.fromRoomId, roomId));

      const connections = await Promise.race([connectionsPromise, timeoutPromise]);
      let directions = connections.map((conn) => conn.direction);

      // Check if this room is a stairs room and add staircase direction if so
      try {
        const roomPromise = db
          .select()
          .from(rooms)
          .where(eq(rooms.id, roomId));

        const [room] = await Promise.race([roomPromise, timeoutPromise]);

        if (room && room.type === "stairs") {
          directions.push("staircase");
        }
      } catch (roomError) {
        console.log("Failed to check room type for stairs, continuing without staircase option");
      }

      // Cache the result
      try {
        await redisService.setAvailableDirections(roomId, directions);
      } catch (cacheError) {
        console.log("Failed to cache directions, continuing");
      }

      return directions;
    } catch (error) {
      console.error("Error getting available directions:", error);
      // Return empty array as fallback to prevent UI crashes
      return [];
    }
  }

  async getAdjacentRooms(startRoomId: number, maxDistance: number = 2): Promise<any[]> {
    try {
      const cacheKey = `adjacent_rooms_${startRoomId}_${maxDistance}`;
      const cached = await redisService.get(cacheKey);
      if (cached) {
        return cached;
      }

      const visited = new Set<number>();
      const result: any[] = [];
      const queue: Array<{roomId: number, distance: number}> = [{roomId: startRoomId, distance: 0}];

      while (queue.length > 0) {
        const {roomId, distance} = queue.shift()!;

        if (visited.has(roomId) || distance > maxDistance) {
          continue;
        }

        visited.add(roomId);

        // Skip the starting room itself
        if (distance > 0) {
          const [room] = await db
            .select()
            .from(rooms)
            .where(eq(rooms.id, roomId));

          if (room) {
            result.push({
              room: room,
              distance: distance
            });
          }
        }

        // Get connections from this room
        const connections = await db
          .select()
          .from(roomConnections)
          .where(eq(roomConnections.fromRoomId, roomId));

        for (const connection of connections) {
          if (!visited.has(connection.toRoomId)) {
            queue.push({roomId: connection.toRoomId, distance: distance + 1});
          }
        }
      }

      // Cache for 5 minutes
      await redisService.set(cacheKey, result, 300);

      return result;
    } catch (error) {
      console.error("Error getting adjacent rooms:", error);
      return [];
    }
  }

  async moveToRoom(
    crawlerId: number,
    direction: string,
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
      console.log(
        `ERROR: Current room ${currentPosition.roomId} not found in database`,
      );
      return { success: false, error: "Current room not found" };
    }

    console.log(
      `Current room: ${currentRoom.name} (${currentRoom.x}, ${currentRoom.y})`,
    );

    if (direction === "staircase") {
      if (currentRoom.type !== "stairs") {
        console.log(
          `ERROR: Attempted staircase movement but room type is ${currentRoom.type}, not stairs`,
        );
        return { success: false, error: "No staircase in this room" };
      }
      console.log(`Handling staircase movement...`);
      return await this.handleStaircaseMovement(crawlerId, currentRoom);
    }

    // Get available directions for debugging
    const availableDirections = await this.getAvailableDirections(
      currentPosition.roomId,
    );
    console.log(
      `Available directions from room ${currentPosition.roomId}:`,
      availableDirections,
    );

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
      console.log(
        `ERROR: No connection found for direction ${direction} from room ${currentPosition.roomId}`,
      );
      console.log(`Available directions:`, availableDirections);
      return {
        success: false,
        error: `No exit ${direction} from current room`,
      };
    }

    console.log(
      `Found connection: ${connection.fromRoomId} -> ${connection.toRoomId} (${connection.direction})`,
    );

    if (connection.isLocked) {
      console.log(`ERROR: Connection is locked`);
      return { success: false, error: `The ${direction} exit is locked` };
    }

    const newRoom = await this.getRoom(connection.toRoomId);
    if (!newRoom) {
      console.log(`ERROR: Destination room ${connection.toRoomId} not found`);
      return { success: false, error: "Destination room not found" };
    }

    console.log(
      `Destination room: ${newRoom.name} (${newRoom.x}, ${newRoom.y})`,
    );

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
      console.log("Failed to invalidate position caches:", error);
    }

    console.log(
      `Movement successful: Crawler ${crawlerId} moved ${direction} to room ${newRoom.id} (${newRoom.name})`,
    );
    return { success: true, newRoom };
  }

  async getCrawlerCurrentRoom(crawlerId: number): Promise<any> {
    try {
      // Get the most recent position for this crawler
      const [currentPosition] = await db
        .select()
        .from(crawlerPositions)
        .where(eq(crawlerPositions.crawlerId, crawlerId))
        .orderBy(desc(crawlerPositions.enteredAt))
        .limit(1);

      if (!currentPosition) {
        return null;
      }

      // Get room and floor data
      const result = await db
        .select({
          room: rooms,
          floor: floors
        })
        .from(rooms)
        .innerJoin(floors, eq(rooms.floorId, floors.id))
        .where(eq(rooms.id, currentPosition.roomId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const roomData = {
        id: result[0].room.id,
        name: result[0].room.name,
        description: result[0].room.description,
        type: result[0].room.type,
        environment: result[0].room.environment || 'indoor',
        factionId: result[0].room.factionId,
        coordinates: {
          x: result[0].room.x,
          y: result[0].room.y
        },
        floor: {
          id: result[0].floor.id,
          number: result[0].floor.floorNumber,
          name: result[0].floor.name
        },
        isSafe: result[0].room.type === 'safe',
        hasLoot: ['treasure', 'normal', 'chamber'].includes(result[0].room.type)
      };

      return roomData;
    } catch (error) {
      console.error(`Error getting current room for crawler ${crawlerId}:`, error);
      throw error;
    }
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
      console.log(
        "Redis cache miss for players in room, fetching from database",
      );
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
      console.log("Failed to cache players in room data");
    }

    return players;
  }

  async getFactions(): Promise<
    Array<{ id: number; name: string; color: string }>
  > {
    // Try to get from cache first
    try {
      const cached = await redisService.getFactions();
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log("Redis cache miss for factions, fetching from database");
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
      console.log("Failed to cache factions data");
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
      console.log(
        "Redis cache miss for explored rooms, fetching from database",
      );
    }

    const visitedRooms = await db
      .select({
        roomId: crawlerPositions.roomId,
        enteredAt: crawlerPositions.enteredAt,
      })
      .from(crawlerPositions)
      .where(eq(crawlerPositions.crawlerId, crawlerId))
      .orderBy(desc(crawlerPositions.enteredAt));

    const uniqueRoomIds = Array.from(
      new Set(visitedRooms.map((vr) => vr.roomId)),
    );

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

    const exploredRooms = roomDetails.map((room) => ({
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
      console.log("Failed to cache explored rooms data");
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
      console.log("Redis cache miss for scanned rooms, fetching from database");
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

    // Get nearby rooms using safe range filtering
    const minX = currentRoom.x - scanRange;
    const maxX = currentRoom.x + scanRange;
    const minY = currentRoom.y - scanRange;
    const maxY = currentRoom.y + scanRange;

    const allRoomsInRange = await db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.floorId, currentRoom.floorId),
          gte(rooms.x, minX),
          lte(rooms.x, maxX),
          gte(rooms.y, minY),
          lte(rooms.y, maxY)
        )
      );

    // Filter by Manhattan distance (more precise than bounding box)
    const nearbyRooms = allRoomsInRange.filter(room => {
      const manhattanDistance = Math.abs(room.x - currentRoom.x) + Math.abs(room.y - currentRoom.y);
      return manhattanDistance <= scanRange;
    });

    // Get visited rooms to mark them as explored
    const visitedRooms = await db
      .select({ roomId: crawlerPositions.roomId })
      .from(crawlerPositions)
      .where(eq(crawlerPositions.crawlerId, crawlerId));

    const visitedRoomIds = new Set(visitedRooms.map((vr) => vr.roomId));

    const scannedRooms = nearbyRooms.map((room) => ({
      id: room.id,
      name: room.name,
      description: visitedRoomIds.has(room.id)
        ? room.description
        : "Detected by scan",
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
      await redisService.setScannedRooms(
        crawlerId,
        scanRange,
        scannedRooms,
        300,
      ); // 5 minutes TTL
    } catch (error) {
      console.log("Failed to cache scanned rooms data");
    }

    return scannedRooms;
  }

  async getFloorBounds(
    floorId: number,
  ): Promise<{ minX: number; maxX: number; minY: number; maxY: number }> {
    // Try to get from cache first
    try {
      const cached = await redisService.getFloorBounds(floorId);
      if (cached) {
        return cached;
      }
    } catch (error) {
      // Redis error, continue with database query
      console.log("Redis cache miss for floor bounds, fetching from database");
    }

    const floorRooms = await db
      .select({ x: rooms.x, y: rooms.y })
      .from(rooms)
      .where(eq(rooms.floorId, floorId));

    if (floorRooms.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const xs = floorRooms.map((r) => r.x);
    const ys = floorRooms.map((r) => r.y);

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
      console.log("Failed to cache floor bounds data");
    }

    return bounds;
  }

  async ensureCrawlerHasPosition(crawlerId: number): Promise<void> {
    console.log(`Ensuring crawler ${crawlerId} has position...`);

    const currentRoom = await this.getCrawlerCurrentRoom(crawlerId);
    if (currentRoom) {
      console.log(
        `Crawler ${crawlerId} already has position in room ${currentRoom.id} (${currentRoom.name})`,
      );
      return; // Crawler already has a position
    }

    console.log(
      `Crawler ${crawlerId} has no position, placing in entrance room...`,
    );

    const [floor1] = await db
      .select()
      .from(floors)
      .where(eq(floors.floorNumber, 1));
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

    console.log(
      `Placing crawler ${crawlerId} in entrance room ${entranceRoom.id} (${entranceRoom.name})`,
    );

    await db.insert(crawlerPositions).values({
      crawlerId: crawlerId,
      roomId: entranceRoom.id,
      enteredAt: new Date(),
    });

    console.log(
      `Successfully placed crawler ${crawlerId} in room ${entranceRoom.id}`,
    );

    // Invalidate cache
    try {
      await redisService.invalidateCurrentRoom(crawlerId);
    } catch (error) {
      console.log("Failed to invalidate current room cache");
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

  async clearExplorationData(crawlerId: number): Promise<void> {
    try {
      await redisService.del(`crawler:${crawlerId}:exploration`);
      await redisService.del(`crawler:${crawlerId}:scanned_rooms`);
      await redisService.del(`crawler:${crawlerId}:visited_rooms`);
    } catch (error) {
      console.log("Failed to clear exploration data from cache");
    }
  }

  async getRoomsWithinRadius(startRoomId: number, radius: number) {
    try {
      // Get the starting room to know its position and floor
      const startRoom = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, startRoomId))
        .limit(1);

      if (!startRoom.length) {
        return [];
      }

      const { x: startX, y: startY, floorId } = startRoom[0];

      // Use BFS to find all rooms within the specified radius
      const visited = new Set<number>();
      const queue: Array<{ roomId: number; distance: number }> = [{ roomId: startRoomId, distance: 0 }];
      const results: Array<any> = [];

      visited.add(startRoomId);

      while (queue.length > 0) {
        const { roomId, distance } = queue.shift()!;

        // Skip if we've exceeded the radius
        if (distance > radius) continue;

        // Get the current room
        const currentRoom = await db
          .select()
          .from(rooms)
          .where(eq(rooms.id, roomId))
          .limit(1);

        if (currentRoom.length === 0) continue;

        // Add to results (excluding the starting room itself)
        if (distance > 0) {
          results.push({
            ...currentRoom[0],
            distance
          });
        }

        // If we haven't reached the radius limit, get connected rooms
        if (distance < radius) {
          const connections = await db
            .select()
            .from(roomConnections)
            .where(eq(roomConnections.fromRoomId, roomId));

          for (const connection of connections) {
            if (!visited.has(connection.toRoomId)) {
              visited.add(connection.toRoomId);
              queue.push({
                roomId: connection.toRoomId,
                distance: distance + 1
              });
            }
          }
        }
      }

      console.log(`Found ${results.length} rooms within radius ${radius} of room ${startRoomId}`);
      return results;
    } catch (error) {
      console.error("Error getting rooms within radius:", error);
      return [];
    }
  }
}