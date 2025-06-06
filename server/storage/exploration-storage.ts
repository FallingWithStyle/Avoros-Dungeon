
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
    return await db.select().from(rooms).where(eq(rooms.floorId, floorId));
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
    const connections = await db
      .select()
      .from(roomConnections)
      .where(eq(roomConnections.fromRoomId, roomId));

    const directions = connections.map((conn) => conn.direction);

    const room = await this.getRoom(roomId);
    if (room && room.type === "stairs") {
      directions.push("staircase");
    }

    return directions;
  }

  async moveToRoom(
    crawlerId: number,
    direction: string,
    debugEnergyDisabled?: boolean,
  ): Promise<{ success: boolean; newRoom?: Room; error?: string }> {
    const [currentPosition] = await db
      .select()
      .from(crawlerPositions)
      .where(eq(crawlerPositions.crawlerId, crawlerId))
      .orderBy(desc(crawlerPositions.enteredAt))
      .limit(1);

    if (!currentPosition) {
      return { success: false, error: "Crawler position not found" };
    }

    const currentRoom = await this.getRoom(currentPosition.roomId);
    if (!currentRoom) {
      return { success: false, error: "Current room not found" };
    }

    if (direction === "staircase") {
      if (currentRoom.type !== "stairs") {
        return { success: false, error: "No staircase in this room" };
      }
      return await this.handleStaircaseMovement(crawlerId, currentRoom);
    }

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
      return { success: false, error: `No exit ${direction} from current room` };
    }

    if (connection.isLocked) {
      return { success: false, error: `The ${direction} exit is locked` };
    }

    const newRoom = await this.getRoom(connection.toRoomId);
    if (!newRoom) {
      return { success: false, error: "Destination room not found" };
    }

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
    }

    if (!debugEnergyDisabled) {
      // We'd need to import crawler storage here or pass crawler as parameter
      // For now, skipping energy check - this would be handled by the main storage orchestrator
    }

    await db.insert(crawlerPositions).values({
      crawlerId,
      roomId: connection.toRoomId,
      enteredAt: new Date(),
    });

    return { success: true, newRoom };
  }

  async getCrawlerCurrentRoom(crawlerId: number): Promise<Room | undefined> {
    const [position] = await db
      .select({ room: rooms })
      .from(crawlerPositions)
      .innerJoin(rooms, eq(crawlerPositions.roomId, rooms.id))
      .where(eq(crawlerPositions.crawlerId, crawlerId))
      .orderBy(desc(crawlerPositions.enteredAt))
      .limit(1);

    return position?.room;
  }

  async getPlayersInRoom(roomId: number): Promise<CrawlerWithDetails[]> {
    const crawlerIds = await db
      .selectDistinct({ crawlerId: crawlerPositions.crawlerId })
      .from(crawlerPositions)
      .where(eq(crawlerPositions.roomId, roomId));

    // Note: This would need access to crawler storage to get full details
    return [];
  }

  async getFactions(): Promise<Array<{ id: number; name: string; color: string }>> {
    const result = await db
      .select({
        id: factions.id,
        name: factions.name,
        color: factions.color,
      })
      .from(factions);

    return result.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color ?? "#6B7280",
    }));
  }

  async getExploredRooms(crawlerId: number): Promise<any[]> {
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

    return roomDetails.map(room => ({
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
  }

  async getFloorBounds(floorId: number): Promise<{ minX: number; maxX: number; minY: number; maxY: number }> {
    const floorRooms = await db
      .select({ x: rooms.x, y: rooms.y })
      .from(rooms)
      .where(eq(rooms.floorId, floorId));

    if (floorRooms.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const xs = floorRooms.map(r => r.x);
    const ys = floorRooms.map(r => r.y);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
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
