// Faction and Room object types, adjust as needed for your schema
export type Faction = {
  id: number;
  name: string;
  description: string;
  mobTypes: string[];
  influence: number;
  color: string;
  icon: string;
};

export type Room = {
  id: number;
  x: number;
  y: number;
  floorId: number;
  name: string;
  description: string;
  type: string; // e.g., "normal", "entrance", "stairs", "safe"
  isSafe: boolean;
  isExplored: boolean;
  hasLoot: boolean;
  factionId: number | null;
};

// Result type: maps factionId (or null for unclaimed) to array of room IDs
export type FactionRoomAssignment = Record<number | "unclaimed", number[]>;

interface AssignFactionsOptions {
  rooms: Room[];
  factions: Faction[];
  unclaimedPercent?: number; // Default: 0.2 (20%)
  minFactions?: number;      // Default: 2
  roomsPerFaction?: number;  // Default: 10
}

/**
 * Assigns rooms to factions based on influence, leaving a percent unclaimed.
 * Returns a mapping: { [factionId]: number[], unclaimed: number[] }
 */
export function assignRoomsByFactionInfluence({
  rooms,
  factions,
  unclaimedPercent = 0.2,
  minFactions = 2,
  roomsPerFaction = 10,
}: AssignFactionsOptions): FactionRoomAssignment {
  // 1. Filter rooms that can be claimed (not entrance, stairs, or safe)
  const claimableRooms = rooms.filter(
    (room) => !["entrance", "stairs", "safe"].includes(room.type)
  );

  // 2. Shuffle the claimable rooms for randomness
  const shuffledRooms = [...claimableRooms].sort(() => Math.random() - 0.5);

  // 3. Determine how many rooms should be unclaimed
  const unclaimedCount = Math.floor(shuffledRooms.length * unclaimedPercent);
  const unclaimedRooms = shuffledRooms.slice(0, unclaimedCount);
  const toAssign = shuffledRooms.slice(unclaimedCount);

  // 4. Select factions for this floor
  const numFactions = Math.max(
    minFactions,
    Math.min(factions.length, Math.ceil(toAssign.length / roomsPerFaction))
  );
  // Randomly pick unique factions
  const pickedFactions = pickRandomFactions(factions, numFactions);

  // 5. Calculate total influence and room shares
  const totalInfluence = pickedFactions.reduce((sum, f) => sum + f.influence, 0);

  // 6. Assign rooms to factions proportionally to their influence
  const assignments: FactionRoomAssignment = {};
  let remainingRooms = [...toAssign];
  pickedFactions.forEach((faction, i) => {
    // Last faction gets the remainder to ensure all rooms are assigned
    const roomCount =
      i === pickedFactions.length - 1
        ? remainingRooms.length
        : Math.round((faction.influence / totalInfluence) * toAssign.length);

    assignments[faction.id] = remainingRooms.splice(0, roomCount).map((r) => r.id);
  });

  // 7. Add unclaimed rooms to the result under "unclaimed"
  assignments.unclaimed = unclaimedRooms.map((r) => r.id);

  // 8. Optionally, add all non-claimable room IDs to "unclaimed" as well
  const nonClaimable = rooms.filter(
    (room) => ["entrance", "stairs", "safe"].includes(room.type)
  );
  assignments.unclaimed.push(...nonClaimable.map((r) => r.id));

  return assignments;
}

/** Utility to pick N unique random factions from the array */
function pickRandomFactions(factions: Faction[], count: number): Faction[] {
  const pool = [...factions];
  const picked: Faction[] = [];
  while (picked.length < count && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked;
}