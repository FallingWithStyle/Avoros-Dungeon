import { db } from "server/db.ts";
import { rooms, roomConnections } from "@shared/schema";
import {
  assignRoomsByFactionInfluence,
  Faction,
  Room,
} from "./faction-assignment";

// ... FloorTheme

function getRandomRoomType(theme: FloorTheme) {
  const totalWeight = theme.roomTypes.reduce(
    (sum, type) => sum + type.weight,
    0,
  );
  const random = Math.random() * totalWeight;
  let currentWeight = 0;
  for (const roomType of theme.roomTypes) {
    currentWeight += roomType.weight;
    if (random <= currentWeight) {
      return roomType;
    }
  }
  return theme.roomTypes[0];
}

function generateFactionalRoomDetails(
  base: { name: string; description: string },
  faction?: Faction,
): { name: string; description: string } {
  if (faction) {
    return {
      name: `${faction.name} ${base.name}`,
      description: `${base.description} This area is under the influence of the ${faction.name}: ${faction.description}`,
    };
  } else {
    return {
      name: base.name,
      description: base.description + " This area is wild and unclaimed.",
    };
  }
}

export async function generateFullDungeon(factions: Faction[]) {
  console.log("Generating full 10-floor dungeon...");

  const GRID_SIZE = 20;
  const MIN_ROOMS_PER_FLOOR = 200;
  const STAIRCASES_PER_FLOOR = 3;

  for (let floorNum = 1; floorNum <= 10; floorNum++) {
    console.log(`Generating Floor ${floorNum}...`);
    const theme = floorThemes[floorNum - 1];
    const floorId = floorNum;

    // Generate grid of potential room positions
    const roomPositions: Array<{ x: number; y: number }> = [];
    for (let x = -GRID_SIZE / 2; x < GRID_SIZE / 2; x++) {
      for (let y = -GRID_SIZE / 2; y < GRID_SIZE / 2; y++) {
        if (Math.random() > 0.45) continue;
        roomPositions.push({ x, y });
      }
    }
    while (roomPositions.length < MIN_ROOMS_PER_FLOOR) {
      const x = Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2;
      const y = Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2;
      if (!roomPositions.some((pos) => pos.x === x && pos.y === y)) {
        roomPositions.push({ x, y });
      }
    }

    // Special rooms
    const entranceRoom: Room = {
      id: 0, // Will be set by DB
      floorId,
      x: 0,
      y: 0,
      name: `${theme.name} Entrance`,
      description: `Entry point to the ${theme.description.toLowerCase()}`,
      type: "entrance",
      isSafe: floorNum === 1,
      isExplored: false,
      hasLoot: false,
      factionId: null,
    };
    const roomsToInsert: Room[] = [entranceRoom];

    if (!roomPositions.some((pos) => pos.x === 0 && pos.y === 0)) {
      roomPositions.push({ x: 0, y: 0 });
    }

    // Staircases
    const staircasePositions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < STAIRCASES_PER_FLOOR && floorNum < 10; i++) {
      let staircasePos: { x: number; y: number };
      do {
        staircasePos =
          roomPositions[Math.floor(Math.random() * roomPositions.length)];
      } while (
        staircasePositions.some(
          (pos) => pos.x === staircasePos.x && pos.y === staircasePos.y,
        ) ||
        (staircasePos.x === 0 && staircasePos.y === 0)
      );
      staircasePositions.push(staircasePos);
      roomsToInsert.push({
        id: 0,
        floorId,
        x: staircasePos.x,
        y: staircasePos.y,
        name: `Descent to ${floorThemes[floorNum]?.name || "Deeper Levels"}`,
        description: `Stairs leading down to level ${floorNum + 1}`,
        type: "stairs",
        isSafe: false,
        isExplored: false,
        hasLoot: false,
        factionId: null,
      });
    }

    // Normal rooms (to be themed by faction after assignment)
    for (const pos of roomPositions) {
      if (
        (pos.x === 0 && pos.y === 0) ||
        staircasePositions.some((sPos) => sPos.x === pos.x && sPos.y === pos.y)
      ) {
        continue;
      }
      const roomType = getRandomRoomType(theme);
      roomsToInsert.push({
        id: 0,
        floorId,
        x: pos.x,
        y: pos.y,
        name: roomType.name,
        description: roomType.description,
        type: "normal",
        isSafe: false,
        isExplored: false,
        hasLoot: false,
        factionId: null,
      });
    }

    // Assign factions BEFORE insert (using x/y/type as room IDs are not yet set)
    const fakeRoomsForAssignment = roomsToInsert.map((r, idx) => ({
      ...r,
      id: idx, // Temporary unique ID for assignment only
    }));

    const factionAssignments = assignRoomsByFactionInfluence({
      rooms: fakeRoomsForAssignment,
      factions,
      unclaimedPercent: 0.2,
      roomsPerFaction: 10,
      minFactions: 2,
    });

    // Theme room names/descriptions & set factionId before insert
    Object.entries(factionAssignments).forEach(([factionKey, roomIds]) => {
      const faction =
        factionKey === "unclaimed"
          ? undefined
          : factions.find((f) => f.id === Number(factionKey));
      for (const fakeId of roomIds) {
        const room = roomsToInsert[fakeId];
        if (!room) continue;
        if (["entrance", "stairs", "safe"].includes(room.type)) continue;
        // Theme and assign factionId
        const themed = generateFactionalRoomDetails(
          { name: room.name, description: room.description },
          faction,
        );
        room.name = themed.name;
        room.description = themed.description;
        room.factionId = faction ? faction.id : null;
      }
    });

    // Insert rooms and get their DB IDs
    const insertedRooms: Room[] = [];
    const BATCH_SIZE = 50;
    for (let i = 0; i < roomsToInsert.length; i += BATCH_SIZE) {
      const batch = roomsToInsert.slice(i, i + BATCH_SIZE);
      const inserted = await db.insert(rooms).values(batch).returning();
      insertedRooms.push(...inserted);
    }
    console.log(`Floor ${floorNum}: Inserted ${insertedRooms.length} rooms`);

    // Build room map by x,y for quick lookup
    const roomMap = new Map<string, Room>();
    insertedRooms.forEach((r) => roomMap.set(`${r.x},${r.y}`, r));
    const entranceRoomId = roomMap.get("0,0")!.id;

    // Generate connections (adjacency)
    const connections: Array<{
      fromRoomId: number;
      toRoomId: number;
      direction: string;
    }> = [];
    for (const room of insertedRooms) {
      const directions = [
        { dx: 0, dy: 1, dir: "north", opposite: "south" },
        { dx: 0, dy: -1, dir: "south", opposite: "north" },
        { dx: 1, dy: 0, dir: "east", opposite: "west" },
        { dx: -1, dy: 0, dir: "west", opposite: "east" },
      ];
      for (const { dx, dy, dir } of directions) {
        const neighbor = roomMap.get(`${room.x + dx},${room.y + dy}`);
        if (neighbor) {
          connections.push({
            fromRoomId: room.id,
            toRoomId: neighbor.id,
            direction: dir,
          });
        }
      }
    }

    // Ensure all rooms are connected to entrance
    connectStrandedRooms(insertedRooms, connections, entranceRoomId);

    // Batch-insert connections (dedupe)
    const seen = new Set<string>();
    const uniqueConnections = connections.filter((conn) => {
      const key = `${conn.fromRoomId}-${conn.toRoomId}-${conn.direction}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    for (let i = 0; i < uniqueConnections.length; i += 100) {
      await db
        .insert(roomConnections)
        .values(uniqueConnections.slice(i, i + 100));
    }
    console.log(
      `Floor ${floorNum}: Inserted ${uniqueConnections.length} connections`,
    );
  }

  console.log("Dungeon generation complete!");
}
