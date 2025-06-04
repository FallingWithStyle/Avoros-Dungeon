import { db } from "../../../../server/db.js";
import { rooms, roomConnections, floors } from "../../../../shared/schema.js";
import { eq } from "drizzle-orm";
import {
  assignRoomsByFactionInfluence,
  Faction,
  Room,
} from "./faction-assignment.js";
import { logErrorToFile } from "../../../../shared/logger.js";

// Floor theme definitions
interface RoomType {
  name: string;
  description: string;
}

interface FloorTheme {
  name: string;
  description: string;
  roomTypes: RoomType[];
}

const floorThemes: FloorTheme[] = [
  {
    name: "Ruined Castle Grounds",
    description: "Crumbling battlements and overgrown courtyards",
    roomTypes: [
      { name: "Collapsed Watchtower", description: "Stone debris blocks most passages" },
      { name: "Overgrown Courtyard", description: "Weeds grow through cracked flagstones" },
      { name: "Ruined Barracks", description: "Rotting wooden bunks and rusted weapons" },
      { name: "Old Armory", description: "Empty weapon racks and broken shields" },
    ],
  },
  {
    name: "Ancient Crypts",
    description: "Stone tombs and burial chambers",
    roomTypes: [
      { name: "Burial Chamber", description: "Ancient sarcophagi line the walls" },
      { name: "Ossuary", description: "Bones arranged in intricate patterns" },
      { name: "Tomb Antechamber", description: "Carved reliefs tell forgotten stories" },
      { name: "Catacombs", description: "Narrow passages between burial niches" },
    ],
  },
  {
    name: "Alchemical Laboratories",
    description: "Chambers filled with strange apparatus and bubbling concoctions",
    roomTypes: [
      { name: "Distillation Chamber", description: "Complex glassware covers every surface" },
      { name: "Reagent Storage", description: "Shelves of mysterious bottles and powders" },
      { name: "Experimentation Lab", description: "Tables scarred by acid and fire" },
      { name: "Transmutation Circle", description: "Arcane symbols etched into the floor" },
    ],
  },
  {
    name: "Prison Complex",
    description: "Cells and interrogation chambers",
    roomTypes: [
      { name: "Prison Cell", description: "Iron bars and moldy straw" },
      { name: "Guard Station", description: "Keys hang from hooks on the wall" },
      { name: "Interrogation Room", description: "Ominous stains mark the floor" },
      { name: "Solitary Confinement", description: "A small, windowless chamber" },
    ],
  },
  {
    name: "Flooded Caverns",
    description: "Water-filled chambers with slippery surfaces",
    roomTypes: [
      { name: "Underground Pool", description: "Dark water reflects the ceiling" },
      { name: "Dripping Grotto", description: "Constant water droplets echo endlessly" },
      { name: "Flooded Passage", description: "Ankle-deep water covers the floor" },
      { name: "Underground River", description: "Fast-moving water blocks the way" },
    ],
  },
  {
    name: "Mechanical Workshop",
    description: "Halls filled with gears, pistons, and steam",
    roomTypes: [
      { name: "Gear Chamber", description: "Massive clockwork mechanisms fill the space" },
      { name: "Steam Engine Room", description: "Pipes release jets of hot vapor" },
      { name: "Assembly Line", description: "Conveyor belts and robotic arms" },
      { name: "Control Room", description: "Dozens of levers and gauges" },
    ],
  },
  {
    name: "Crystal Mines",
    description: "Sparkling chambers carved from living rock",
    roomTypes: [
      { name: "Crystal Cavern", description: "Brilliant gems illuminate the walls" },
      { name: "Mining Shaft", description: "Pick marks score the tunnel walls" },
      { name: "Gem Processing", description: "Cutting tools and polishing stations" },
      { name: "Crystal Formation", description: "Natural crystals grow in impossible shapes" },
    ],
  },
  {
    name: "Ancient Temple",
    description: "Sacred halls dedicated to forgotten gods",
    roomTypes: [
      { name: "Prayer Hall", description: "Rows of stone pews face an altar" },
      { name: "Shrine Room", description: "Offerings lie before weathered statues" },
      { name: "Ceremonial Chamber", description: "Ritual circles mark the floor" },
      { name: "Sanctum", description: "The most sacred space, radiating power" },
    ],
  },
  {
    name: "Dragon's Lair",
    description: "Scorched chambers reeking of sulfur",
    roomTypes: [
      { name: "Treasure Hoard", description: "Piles of gold and precious objects" },
      { name: "Sleeping Chamber", description: "Massive indentations in the stone floor" },
      { name: "Scorched Hall", description: "Walls blackened by dragonfire" },
      { name: "Bone Yard", description: "Remains of unfortunate adventurers" },
    ],
  },
  {
    name: "Cosmic Observatory",
    description: "Chambers focused on celestial observation",
    roomTypes: [
      { name: "Star Chart Room", description: "Constellation maps cover the ceiling" },
      { name: "Telescope Chamber", description: "Massive brass instruments point skyward" },
      { name: "Astrolabe Workshop", description: "Precise instruments for celestial navigation" },
      { name: "Portal Nexus", description: "Swirling energies connect to distant realms" },
    ],
  },
];

function getRandomRoomType(theme: FloorTheme): RoomType {
  return theme.roomTypes[Math.floor(Math.random() * theme.roomTypes.length)];
}

function connectStrandedRooms(
  allRooms: Room[],
  connections: Array<{ fromRoomId: number; toRoomId: number; direction: string }>,
  entranceRoomId: number
) {
  // Build adjacency list
  const adjacencyMap = new Map<number, Set<number>>();
  allRooms.forEach(room => adjacencyMap.set(room.id, new Set()));
  
  connections.forEach(conn => {
    adjacencyMap.get(conn.fromRoomId)?.add(conn.toRoomId);
    adjacencyMap.get(conn.toRoomId)?.add(conn.fromRoomId);
  });

  // Find connected component containing entrance
  const visited = new Set<number>();
  const queue = [entranceRoomId];
  visited.add(entranceRoomId);
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const neighbors = adjacencyMap.get(currentId) || new Set();
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  // Connect stranded rooms
  const strandedRooms = allRooms.filter(room => !visited.has(room.id));
  for (const strandedRoom of strandedRooms) {
    // Find closest connected room
    let closestRoom = null;
    let minDistance = Infinity;
    
    for (const connectedRoom of allRooms.filter(r => visited.has(r.id))) {
      const distance = Math.abs(strandedRoom.x - connectedRoom.x) + Math.abs(strandedRoom.y - connectedRoom.y);
      if (distance < minDistance) {
        minDistance = distance;
        closestRoom = connectedRoom;
      }
    }
    
    if (closestRoom) {
      // Add connection
      const dx = strandedRoom.x - closestRoom.x;
      const dy = strandedRoom.y - closestRoom.y;
      const direction = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "north" : "south";
      
      connections.push({
        fromRoomId: closestRoom.id,
        toRoomId: strandedRoom.id,
        direction
      });
      
      visited.add(strandedRoom.id);
      adjacencyMap.get(closestRoom.id)?.add(strandedRoom.id);
      adjacencyMap.get(strandedRoom.id)?.add(closestRoom.id);
    }
  }
}

function generateFactionalRoomDetails(
  baseRoom: { name: string; description: string },
  faction?: Faction
): { name: string; description: string } {
  if (!faction) {
    return baseRoom;
  }

  const factionalPrefixes = [
    `${faction.name}-controlled`,
    `${faction.name}-occupied`,
    `${faction.name}-claimed`,
    `${faction.name}-dominated`,
  ];
  
  const prefix = factionalPrefixes[Math.floor(Math.random() * factionalPrefixes.length)];
  
  return {
    name: `${prefix} ${baseRoom.name}`,
    description: `${baseRoom.description} This area shows clear signs of ${faction.name} influence.`,
  };
}

export async function generateFullDungeon(factions: Faction[]) {
  try {
    await logErrorToFile("Generating full 10-floor dungeon...", "info");

    // Clear existing rooms and connections first
    await logErrorToFile("Clearing existing dungeon data...", "info");
    try {
      await db.delete(roomConnections);
      await db.delete(rooms);
    } catch (e) {
      await logErrorToFile(e, "Error clearing dungeon data");
      throw e;
    }

    // Get all floors to verify they exist
    let allFloors = [];
    try {
      allFloors = await db.select().from(floors).orderBy(floors.floor_number);
      await logErrorToFile(`Found ${allFloors.length} floors in database`, "info");
    } catch (e) {
      await logErrorToFile(e, "Error querying floors table");
      throw e;
    }

    const GRID_SIZE = 20;
    const MIN_ROOMS_PER_FLOOR = 200;
    const STAIRCASES_PER_FLOOR = 3;

    for (let floorNum = 1; floorNum <= 10; floorNum++) {
      try {
        await logErrorToFile(`Generating Floor ${floorNum}...`, "info");
        const theme = floorThemes[floorNum - 1];

        // Get the actual floor from database
        let floor, floorId;
        try {
          [floor] = await db
            .select()
            .from(floors)
            .where(eq(floors.floor_number, floorNum));
          if (!floor) {
            await logErrorToFile(
              `Floor ${floorNum} not found in database! Skipping...`,
              "warn"
            );
            continue;
          }
          floorId = floor.id;
        } catch (e) {
          await logErrorToFile(e, `Error fetching floor ${floorNum}`);
          continue;
        }

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
        await logErrorToFile(
          `Floor ${floorNum}: Generated ${roomPositions.length} room positions`,
          "info"
        );

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
          let attempts = 0;
          do {
            staircasePos =
              roomPositions[Math.floor(Math.random() * roomPositions.length)];
            attempts++;
            if (attempts > 1000) {
              throw new Error("Unable to place unique staircase after 1000 tries");
            }
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
        await logErrorToFile(
          `Floor ${floorNum}: Prepared ${roomsToInsert.length} rooms (including entrance/stairs)`,
          "info"
        );

        // Assign factions BEFORE insert (using x/y/type as room IDs are not yet set)
        const fakeRoomsForAssignment = roomsToInsert.map((r, idx) => ({
          ...r,
          id: idx, // Temporary unique ID for assignment only
        }));

        let factionAssignments;
        try {
          factionAssignments = assignRoomsByFactionInfluence({
            rooms: fakeRoomsForAssignment,
            factions,
            unclaimedPercent: 0.2,
            roomsPerFaction: 10,
            minFactions: 2,
          });
        } catch (e) {
          await logErrorToFile(e, `Error assigning factions on floor ${floorNum}`);
          throw e;
        }

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
          try {
            const inserted = await db.insert(rooms).values(batch).returning();
            insertedRooms.push(...inserted);
          } catch (e) {
            await logErrorToFile(
              e,
              `Error inserting room batch (floor ${floorNum}, batch starting at ${i})`
            );
            throw e;
          }
        }
        await logErrorToFile(
          `Floor ${floorNum}: Inserted ${insertedRooms.length} rooms`,
          "info"
        );

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
        try {
          connectStrandedRooms(insertedRooms, connections, entranceRoomId);
        } catch (e) {
          await logErrorToFile(
            e,
            `Error connecting stranded rooms (floor ${floorNum})`
          );
          throw e;
        }

        // Batch-insert connections (dedupe)
        const seen = new Set<string>();
        const uniqueConnections = connections.filter((conn) => {
          const key = `${conn.fromRoomId}-${conn.toRoomId}-${conn.direction}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        for (let i = 0; i < uniqueConnections.length; i += 100) {
          try {
            await db
              .insert(roomConnections)
              .values(uniqueConnections.slice(i, i + 100));
          } catch (e) {
            await logErrorToFile(
              e,
              `Error inserting connection batch (floor ${floorNum}, batch starting at ${i})`
            );
            throw e;
          }
        }
        await logErrorToFile(
          `Floor ${floorNum}: Inserted ${uniqueConnections.length} connections`,
          "info"
        );
      } catch (e) {
        await logErrorToFile(e, `Exception generating floor ${floorNum}`);
      }
    }

    await logErrorToFile("Dungeon generation complete!", "info");
  } catch (e) {
    await logErrorToFile(e, "Fatal error in dungeon generation");
    throw e;
  }
}