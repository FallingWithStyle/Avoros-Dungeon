import { db } from "../../../server/db.ts";
import { rooms, roomConnections, floors } from "../../../shared/schema.ts";
import { eq } from "drizzle-orm";
import {
  assignRoomsByFactionInfluence,
  Faction,
  Room,
} from "./faction-assignment.ts";

// Floor theme definitions
interface RoomType {
  name: string;
  description: string;
  weight: number;
}

interface FloorTheme {
  name: string;
  description: string;
  roomTypes: RoomType[];
}

const floorThemes: FloorTheme[] = [
  {
    name: "Abandoned Outpost",
    description: "Once a thriving settlement, now eerily quiet",
    roomTypes: [
      { name: "Guard Post", description: "A military checkpoint with rusted weapons", weight: 3 },
      { name: "Storage Room", description: "Supplies and equipment left behind", weight: 4 },
      { name: "Living Quarters", description: "Personal belongings scattered about", weight: 3 },
      { name: "Common Hall", description: "Where settlers once gathered", weight: 2 },
    ]
  },
  {
    name: "Underground Tunnels",
    description: "A maze of carved stone passages",
    roomTypes: [
      { name: "Mining Shaft", description: "Deep excavation into the earth", weight: 4 },
      { name: "Tool Cache", description: "Abandoned mining equipment", weight: 3 },
      { name: "Collapsed Tunnel", description: "Dangerous unstable passage", weight: 2 },
      { name: "Worker's Rest", description: "Small chamber for breaks", weight: 3 },
    ]
  },
  {
    name: "Ancient Catacombs",
    description: "Sacred burial grounds from a lost civilization",
    roomTypes: [
      { name: "Burial Chamber", description: "Stone sarcophagi line the walls", weight: 4 },
      { name: "Ritual Circle", description: "Mysterious symbols carved in stone", weight: 2 },
      { name: "Ossuary", description: "Bones arranged in intricate patterns", weight: 3 },
      { name: "Memorial Hall", description: "Faded murals tell ancient stories", weight: 3 },
    ]
  },
  {
    name: "Fungal Caverns",
    description: "Bioluminescent fungi illuminate twisted passages",
    roomTypes: [
      { name: "Spore Grove", description: "Glowing mushrooms cluster together", weight: 4 },
      { name: "Mycelium Web", description: "Fungal networks span the ceiling", weight: 3 },
      { name: "Toxic Pool", description: "Bubbling fungal secretions", weight: 2 },
      { name: "Growth Chamber", description: "Massive fungal specimens", weight: 3 },
    ]
  },
  {
    name: "Crystalline Depths",
    description: "Glittering crystal formations create a maze of light",
    roomTypes: [
      { name: "Crystal Garden", description: "Beautiful formations of living crystal", weight: 3 },
      { name: "Resonance Chamber", description: "Crystals hum with mystical energy", weight: 2 },
      { name: "Prism Hall", description: "Light refracts in dazzling patterns", weight: 3 },
      { name: "Mineral Vein", description: "Rich deposits embedded in rock", weight: 4 },
    ]
  },
  {
    name: "Flooded Ruins",
    description: "Ancient structures partially submerged in dark water",
    roomTypes: [
      { name: "Sunken Plaza", description: "Water-filled courtyard with debris", weight: 3 },
      { name: "Drowned Library", description: "Waterlogged books and scrolls", weight: 2 },
      { name: "Tidal Pool", description: "Strange creatures in shallow water", weight: 4 },
      { name: "Drainage Channel", description: "Fast-flowing underground river", weight: 3 },
    ]
  },
  {
    name: "Mechanical Fortress",
    description: "Ancient automated defenses still patrol these halls",
    roomTypes: [
      { name: "Gear Chamber", description: "Massive clockwork mechanisms", weight: 3 },
      { name: "Control Room", description: "Inactive panels and switches", weight: 2 },
      { name: "Assembly Line", description: "Conveyor belts and mechanical arms", weight: 4 },
      { name: "Power Core", description: "Humming energy source", weight: 3 },
    ]
  },
  {
    name: "Twisted Laboratory",
    description: "Mad experiments left unfinished and unstable",
    roomTypes: [
      { name: "Specimen Chamber", description: "Preserved creatures in glass tanks", weight: 3 },
      { name: "Chemical Storage", description: "Volatile substances in containers", weight: 2 },
      { name: "Operating Theater", description: "Surgical equipment stained with age", weight: 3 },
      { name: "Research Archive", description: "Notebooks filled with mad theories", weight: 4 },
    ]
  },
  {
    name: "Nightmare Realm",
    description: "Reality bends and warps in these cursed depths",
    roomTypes: [
      { name: "Void Chamber", description: "Empty space that seems to absorb light", weight: 2 },
      { name: "Mirror Maze", description: "Reflections that don't match reality", weight: 3 },
      { name: "Temporal Rift", description: "Time flows strangely here", weight: 2 },
      { name: "Madness Pool", description: "Swirling energy that affects the mind", weight: 3 },
    ]
  },
  {
    name: "The Abyss",
    description: "The deepest reaches where few dare to venture",
    roomTypes: [
      { name: "Abyssal Pit", description: "Bottomless chasm into darkness", weight: 2 },
      { name: "Ancient Throne", description: "Seat of some forgotten ruler", weight: 1 },
      { name: "Primordial Cave", description: "Where the world itself was born", weight: 3 },
      { name: "Final Chamber", description: "The end of all journeys", weight: 2 },
    ]
  }
];

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

/**
 * Ensures all rooms are connected to the entrance by finding disconnected rooms
 * and adding connections to the nearest connected room.
 *
 * @param rooms Array of Room objects (with .id, .x, .y)
 * @param connections Array of connection objects ({ fromRoomId, toRoomId, direction })
 * @param entranceRoomId The ID of the entrance room (usually at 0,0)
 */
function connectStrandedRooms(
  rooms: Room[],
  connections: Array<{
    fromRoomId: number;
    toRoomId: number;
    direction: string;
  }>,
  entranceRoomId: number,
) {
  // Build a map from roomId to neighbors
  const neighborMap = new Map<number, number[]>(); // roomId -> [neighborRoomId, ...]
  for (const room of rooms) {
    neighborMap.set(room.id, []);
  }
  for (const conn of connections) {
    if (!neighborMap.has(conn.fromRoomId)) neighborMap.set(conn.fromRoomId, []);
    neighborMap.get(conn.fromRoomId)!.push(conn.toRoomId);
  }

  // Find all reachable rooms from the entrance using BFS
  const visited = new Set<number>();
  const queue = [entranceRoomId];
  visited.add(entranceRoomId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of neighborMap.get(current)!) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  // Find all stranded rooms (not reachable from entrance)
  const strandedRooms = rooms.filter((r) => !visited.has(r.id));

  if (strandedRooms.length === 0) return; // all connected

  // For each stranded room, connect it to the nearest connected room
  for (const stranded of strandedRooms) {
    // Find connected rooms
    const connectedRooms = rooms.filter((r) => visited.has(r.id));
    // Find nearest connected room (using Manhattan distance)
    let minDist = Infinity;
    let nearest = connectedRooms[0];
    for (const connRoom of connectedRooms) {
      const dist =
        Math.abs(connRoom.x - stranded.x) + Math.abs(connRoom.y - stranded.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = connRoom;
      }
    }

    // Determine direction from stranded -> nearest
    let direction = "";
    if (nearest.x === stranded.x && nearest.y === stranded.y + 1)
      direction = "north";
    else if (nearest.x === stranded.x && nearest.y === stranded.y - 1)
      direction = "south";
    else if (nearest.x === stranded.x + 1 && nearest.y === stranded.y)
      direction = "east";
    else if (nearest.x === stranded.x - 1 && nearest.y === stranded.y)
      direction = "west";
    else {
      // Not adjacent, just connect as "secret"
      direction = "secret";
    }

    // Add connection (both ways)
    connections.push({
      fromRoomId: stranded.id,
      toRoomId: nearest.id,
      direction,
    });
    // Optionally add reverse connection
    connections.push({
      fromRoomId: nearest.id,
      toRoomId: stranded.id,
      direction:
        direction === "north"
          ? "south"
          : direction === "south"
            ? "north"
            : direction === "east"
              ? "west"
              : direction === "west"
                ? "east"
                : "secret",
    });

    // Mark the stranded room as now connected
    visited.add(stranded.id);
  }
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

  // Clear existing rooms and connections first
  console.log("Clearing existing dungeon data...");
  await db.delete(roomConnections);
  await db.delete(rooms);

  // Get all floors to verify they exist
  const allFloors = await db.select().from(floors).orderBy(floors.floorNumber);
  console.log(`Found ${allFloors.length} floors in database`);

  const GRID_SIZE = 20;
  const MIN_ROOMS_PER_FLOOR = 200;
  const STAIRCASES_PER_FLOOR = 3;

  for (let floorNum = 1; floorNum <= 10; floorNum++) {
    console.log(`Generating Floor ${floorNum}...`);
    const theme = floorThemes[floorNum - 1];

    // Get the actual floor from database
    const [floor] = await db
      .select()
      .from(floors)
      .where(eq(floors.floorNumber, floorNum));
    if (!floor) {
      console.error(`Floor ${floorNum} not found in database! Skipping...`);
      continue;
    }
    const floorId = floor.id;

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
