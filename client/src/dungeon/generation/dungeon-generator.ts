import { db } from "../../../../server/db.js";
import {
  rooms,
  roomConnections,
  floors,
  crawlerPositions,
} from "../../../../shared/schema.js";
import { eq } from "drizzle-orm";
import { Faction, Room } from "./faction-assignment.js";
type RoomInsert = Omit<Room, "id">;
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
      {
        name: "Collapsed Watchtower",
        description: "Stone debris blocks most passages",
      },
      {
        name: "Overgrown Courtyard",
        description: "Weeds grow through cracked flagstones",
      },
      {
        name: "Ruined Barracks",
        description: "Rotting wooden bunks and rusted weapons",
      },
      {
        name: "Old Armory",
        description: "Empty weapon racks and broken shields",
      },
    ],
  },
  {
    name: "Ancient Crypts",
    description: "Stone tombs and burial chambers",
    roomTypes: [
      {
        name: "Burial Chamber",
        description: "Ancient sarcophagi line the walls",
      },
      { name: "Ossuary", description: "Bones arranged in intricate patterns" },
      {
        name: "Tomb Antechamber",
        description: "Carved reliefs tell forgotten stories",
      },
      {
        name: "Catacombs",
        description: "Narrow passages between burial niches",
      },
    ],
  },
  {
    name: "Alchemical Laboratories",
    description:
      "Chambers filled with strange apparatus and bubbling concoctions",
    roomTypes: [
      {
        name: "Distillation Chamber",
        description: "Complex glassware covers every surface",
      },
      {
        name: "Reagent Storage",
        description: "Shelves of mysterious bottles and powders",
      },
      {
        name: "Experimentation Lab",
        description: "Tables scarred by acid and fire",
      },
      {
        name: "Transmutation Circle",
        description: "Arcane symbols etched into the floor",
      },
    ],
  },
  {
    name: "Prison Complex",
    description: "Cells and interrogation chambers",
    roomTypes: [
      { name: "Prison Cell", description: "Iron bars and moldy straw" },
      {
        name: "Guard Station",
        description: "Keys hang from hooks on the wall",
      },
      {
        name: "Interrogation Room",
        description: "Ominous stains mark the floor",
      },
      {
        name: "Solitary Confinement",
        description: "A small, windowless chamber",
      },
    ],
  },
  {
    name: "Flooded Caverns",
    description: "Water-filled chambers with slippery surfaces",
    roomTypes: [
      {
        name: "Underground Pool",
        description: "Dark water reflects the ceiling",
      },
      {
        name: "Dripping Grotto",
        description: "Constant water droplets echo endlessly",
      },
      {
        name: "Flooded Passage",
        description: "Ankle-deep water covers the floor",
      },
      {
        name: "Underground River",
        description: "Fast-moving water blocks the way",
      },
    ],
  },
  {
    name: "Mechanical Workshop",
    description: "Halls filled with gears, pistons, and steam",
    roomTypes: [
      {
        name: "Gear Chamber",
        description: "Massive clockwork mechanisms fill the space",
      },
      {
        name: "Steam Engine Room",
        description: "Pipes release jets of hot vapor",
      },
      { name: "Assembly Line", description: "Conveyor belts and robotic arms" },
      { name: "Control Room", description: "Dozens of levers and gauges" },
    ],
  },
  {
    name: "Crystal Mines",
    description: "Sparkling chambers carved from living rock",
    roomTypes: [
      {
        name: "Crystal Cavern",
        description: "Brilliant gems illuminate the walls",
      },
      {
        name: "Mining Shaft",
        description: "Pick marks score the tunnel walls",
      },
      {
        name: "Gem Processing",
        description: "Cutting tools and polishing stations",
      },
      {
        name: "Crystal Formation",
        description: "Natural crystals grow in impossible shapes",
      },
    ],
  },
  {
    name: "Ancient Temple",
    description: "Sacred halls dedicated to forgotten gods",
    roomTypes: [
      { name: "Prayer Hall", description: "Rows of stone pews face an altar" },
      {
        name: "Shrine Room",
        description: "Offerings lie before weathered statues",
      },
      {
        name: "Ceremonial Chamber",
        description: "Ritual circles mark the floor",
      },
      {
        name: "Sanctum",
        description: "The most sacred space, radiating power",
      },
    ],
  },
  {
    name: "Dragon's Lair",
    description: "Scorched chambers reeking of sulfur",
    roomTypes: [
      {
        name: "Treasure Hoard",
        description: "Piles of gold and precious objects",
      },
      {
        name: "Sleeping Chamber",
        description: "Massive indentations in the stone floor",
      },
      { name: "Scorched Hall", description: "Walls blackened by dragonfire" },
      { name: "Bone Yard", description: "Remains of unfortunate adventurers" },
    ],
  },
  {
    name: "Cosmic Observatory",
    description: "Chambers focused on celestial observation",
    roomTypes: [
      {
        name: "Star Chart Room",
        description: "Constellation maps cover the ceiling",
      },
      {
        name: "Telescope Chamber",
        description: "Massive brass instruments point skyward",
      },
      {
        name: "Astrolabe Workshop",
        description: "Precise instruments for celestial navigation",
      },
      {
        name: "Portal Nexus",
        description: "Swirling energies connect to distant realms",
      },
    ],
  },
];

function getRandomRoomType(theme: FloorTheme): RoomType {
  return theme.roomTypes[Math.floor(Math.random() * theme.roomTypes.length)];
}

// Ensure all rooms are fully connected by joining all disconnected components.
function connectAllDisconnectedComponents(allRooms: RoomInsert[]) {
  let maxPlacementId = Math.max(
    ...allRooms.map((r) =>
      typeof r.placementId === "number" ? r.placementId : 0,
    ),
    0,
  );
  function nextPlacementId() {
    return ++maxPlacementId;
  }
  const posToRoom = new Map<string, RoomInsert>();
  allRooms.forEach((r) => posToRoom.set(`${r.x},${r.y}`, r));
  function findComponents(): RoomInsert[][] {
    const visited = new Set<string>();
    const components: RoomInsert[][] = [];
    for (const room of allRooms) {
      const key = `${room.x},${room.y}`;
      if (visited.has(key)) continue;
      const queue = [room];
      const component: RoomInsert[] = [];
      visited.add(key);
      while (queue.length) {
        const current = queue.shift()!;
        component.push(current);
        const neighbors = [
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 },
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
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
  let components = findComponents();
  while (components.length > 1) {
    const [main, ...others] = components;
    let minDistance = Infinity;
    let bestPair: { a: RoomInsert; b: RoomInsert } | null = null;
    for (const a of main) {
      for (const comp of others) {
        for (const b of comp) {
          const dist = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
          if (dist < minDistance) {
            minDistance = dist;
            bestPair = { a, b };
          }
        }
      }
    }
    if (bestPair) {
      let { a: roomA, b: roomB } = bestPair;
      let x = roomA.x,
        y = roomA.y;
      const path: { x: number; y: number }[] = [];
      while (x !== roomB.x) {
        x += Math.sign(roomB.x - x);
        path.push({ x, y });
      }
      while (y !== roomB.y) {
        y += Math.sign(roomB.y - y);
        path.push({ x, y });
      }
      for (const pos of path) {
        const key = `${pos.x},${pos.y}`;
        if (!posToRoom.has(key)) {
          const corridor: RoomInsert = {
            floorId: roomA.floorId,
            x: pos.x,
            y: pos.y,
            name: "Corridor",
            description: "A narrow connecting passage.",
            type: "corridor",
            isSafe: false,
            isExplored: false,
            hasLoot: false,
            factionId: null,
            placementId: nextPlacementId(),
          };
          allRooms.push(corridor);
          posToRoom.set(key, corridor);
        }
      }
    }
    components = findComponents();
  }
}

// Assign faction territories (contiguous region expansion) by influence.
function assignFactionTerritories({
  rooms,
  factions,
  unclaimedPercent = 0.2,
}: {
  rooms: { x: number; y: number; id: number }[];
  factions: Array<Faction & { influence: number }>;
  unclaimedPercent?: number;
}) {
  const totalRooms = rooms.length;
  const unclaimedCount = Math.floor(totalRooms * unclaimedPercent);
  const toAssign = totalRooms - unclaimedCount;

  const eligibleFactions = factions.filter((f) => f.influence > 0);
  const totalInfluence = eligibleFactions.reduce(
    (sum, f) => sum + f.influence,
    0,
  );

  // Assign number of rooms per faction, proportional to influence
  const factionRoomTargets = eligibleFactions.map((f) => ({
    id: f.id,
    count: Math.round((f.influence / totalInfluence) * toAssign),
  }));

  let leftToAssign =
    toAssign - factionRoomTargets.reduce((acc, fr) => acc + fr.count, 0);
  for (let i = 0; i < factionRoomTargets.length && leftToAssign !== 0; i++) {
    factionRoomTargets[i].count += leftToAssign > 0 ? 1 : -1;
    leftToAssign += leftToAssign > 0 ? -1 : 1;
  }

  const roomMap = new Map<string, { x: number; y: number; id: number }>();
  rooms.forEach((room) => roomMap.set(`${room.x},${room.y}`, room));

  const assigned = new Set<number>();
  const assignments: Record<number, number[]> = {};
  const remainingRooms = rooms.filter((r) => !assigned.has(r.id));
  const seeds = factionRoomTargets.map((ft, i) => {
    const idx = Math.floor(Math.random() * remainingRooms.length);
    const room = remainingRooms.splice(idx, 1)[0];
    assignments[ft.id] = [room.id];
    assigned.add(room.id);
    return { ...room, factionId: ft.id };
  });

  let expanding = seeds;
  const factionTargetMap = Object.fromEntries(
    factionRoomTargets.map((f) => [f.id, f.count]),
  );
  while (
    Object.values(assignments).reduce((a, b) => a + b.length, 0) < toAssign &&
    expanding.length
  ) {
    const nextExpanding: typeof expanding = [];
    for (const exp of expanding) {
      const factionId = exp.factionId;
      if (assignments[factionId].length >= factionTargetMap[factionId])
        continue;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ]) {
        const nx = exp.x + dx,
          ny = exp.y + dy;
        const key = `${nx},${ny}`;
        const nextRoom = roomMap.get(key);
        if (nextRoom && !assigned.has(nextRoom.id)) {
          assignments[factionId].push(nextRoom.id);
          assigned.add(nextRoom.id);
          nextExpanding.push({ ...nextRoom, factionId });
          if (assignments[factionId].length >= factionTargetMap[factionId])
            break;
        }
      }
    }
    expanding = nextExpanding;
  }

  const unclaimed: number[] = rooms
    .filter((r) => !assigned.has(r.id))
    .map((r) => r.id);
  const result: Record<string, number[]> = {};
  eligibleFactions.forEach((f) => (result[f.id] = assignments[f.id] || []));
  result["unclaimed"] = unclaimed;
  return result;
}

export async function generateFullDungeon(factions: Faction[]) {
  try {
    await logErrorToFile("Generating full 10-floor dungeon...", "info");
    await logErrorToFile("Clearing existing dungeon data...", "info");
    try {
      await db.delete(crawlerPositions);
      await db.delete(roomConnections);
      await db.delete(rooms);
    } catch (e) {
      await logErrorToFile(e, "Error clearing dungeon data");
      throw e;
    }

    let allFloors = [];
    try {
      allFloors = await db.select().from(floors).orderBy(floors.floorNumber);
      await logErrorToFile(
        `Found ${allFloors.length} floors in database`,
        "info",
      );
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

        let floor, floorId;
        try {
          [floor] = await db
            .select()
            .from(floors)
            .where(eq(floors.floorNumber, floorNum));
          if (!floor) {
            await logErrorToFile(
              `Floor ${floorNum} not found in database! Skipping...`,
              "warn",
            );
            continue;
          }
          floorId = floor.id;
        } catch (e) {
          await logErrorToFile(e, `Error fetching floor ${floorNum}`);
          continue;
        }

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
          "info",
        );

        const entranceRoom: RoomInsert = {
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
          placementId: 0,
        };
        const roomsToInsert: RoomInsert[] = [entranceRoom];

        if (!roomPositions.some((pos) => pos.x === 0 && pos.y === 0)) {
          roomPositions.push({ x: 0, y: 0 });
        }

        const staircasePositions: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < STAIRCASES_PER_FLOOR && floorNum < 10; i++) {
          let staircasePos: { x: number; y: number };
          let attempts = 0;
          do {
            staircasePos =
              roomPositions[Math.floor(Math.random() * roomPositions.length)];
            attempts++;
            if (attempts > 1000) {
              throw new Error(
                "Unable to place unique staircase after 1000 tries",
              );
            }
          } while (
            staircasePositions.some(
              (pos) => pos.x === staircasePos.x && pos.y === staircasePos.y,
            ) ||
            (staircasePos.x === 0 && staircasePos.y === 0)
          );
          staircasePositions.push(staircasePos);
          roomsToInsert.push({
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
            placementId: roomsToInsert.length,
          });
        }

        for (const pos of roomPositions) {
          if (
            (pos.x === 0 && pos.y === 0) ||
            staircasePositions.some(
              (sPos) => sPos.x === pos.x && sPos.y === pos.y,
            )
          ) {
            continue;
          }
          const roomType = getRandomRoomType(theme);
          roomsToInsert.push({
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
            placementId: roomsToInsert.length,
          });
        }
        await logErrorToFile(
          `Floor ${floorNum}: Prepared ${roomsToInsert.length} rooms (including entrance/stairs)`,
          "info",
        );

        // Number of factions scales with floor size (min 2, max 10, 1 per 120 rooms)
        const MIN_FACTIONS = 2;
        const MAX_FACTIONS = 10;
        const normalRoomCount = roomsToInsert.filter(
          (r) => r.type === "normal",
        ).length;
        const numFactions = Math.max(
          MIN_FACTIONS,
          Math.min(MAX_FACTIONS, Math.floor(normalRoomCount / 120)),
        );
        const factionsWithInfluence = factions.filter(
          (f) => typeof f.influence === "number" && f.influence > 0,
        );
        const factionsForFloor = [...factionsWithInfluence]
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(numFactions, factionsWithInfluence.length));

        const fakeRoomsForAssignment = roomsToInsert.map((r, idx) => ({
          ...r,
          id: r.placementId,
        }));

        let factionAssignments;
        try {
          factionAssignments = assignFactionTerritories({
            rooms: fakeRoomsForAssignment,
            factions: factionsForFloor,
            unclaimedPercent: 0.2,
          });
        } catch (e) {
          await logErrorToFile(
            e,
            `Error assigning factions on floor ${floorNum}`,
          );
          throw e;
        }
        // Log faction claims for this floor
        const factionStats = factionsForFloor
          .map((faction) => {
            const claimed = (factionAssignments[faction.id] || []).length;
            return `Faction ${faction.name} (#${faction.id}) claimed  ${claimed} rooms.`;
          })
          .join("\n");
        await logErrorToFile(
          `Floor ${floorNum} faction claims:
        ${factionStats}`,
          "info",
        );

        Object.entries(factionAssignments).forEach(([factionKey, roomIds]) => {
          const faction =
            factionKey === "unclaimed"
              ? undefined
              : factionsForFloor.find((f) => f.id === Number(factionKey));
          for (const fakeId of roomIds) {
            const room = roomsToInsert[fakeId];
            if (!room) continue;
            if (["entrance", "stairs", "safe"].includes(room.type)) continue;
            room.factionId = faction ? faction.id : null;
          }
        });

        connectAllDisconnectedComponents(roomsToInsert);

        const insertedRooms: Room[] = [];
        const BATCH_SIZE = 50;
        for (let i = 0; i < roomsToInsert.length; i += BATCH_SIZE) {
          const batch = roomsToInsert.slice(i, i + BATCH_SIZE);
          if (batch.length === 0) continue;
          await logErrorToFile(
            `Attempting to insert batch of size ${batch.length} for floor ${floorNum}`,
            "info",
          );
          try {
            const inserted = await db.insert(rooms).values(batch).returning();
            insertedRooms.push(...inserted);
            await logErrorToFile(
              `Inserted batch of ${inserted.length} rooms for floor ${floorNum}`,
              "info",
            );
          } catch (e) {
            await logErrorToFile(
              e,
              `Error inserting room batch (floor ${floorNum}, batch starting at ${i})`,
            );
            throw e;
          }
        }
        await logErrorToFile(
          `Floor ${floorNum}: Inserted ${insertedRooms.length} rooms`,
          "info",
        );

        const roomMap = new Map<string, Room>();
        insertedRooms.forEach((r) => roomMap.set(`${r.x},${r.y}`, r));
        const entranceRoomId = roomMap.get("0,0")!.id;

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
              `Error inserting connection batch (floor ${floorNum}, batch starting at ${i})`,
            );
            throw e;
          }
        }
        await logErrorToFile(
          `Floor ${floorNum}: Inserted ${uniqueConnections.length} connections`,
          "info",
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