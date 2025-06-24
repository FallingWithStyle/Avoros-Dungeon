/**
 * File: tactical-utils.ts
 * Responsibility: Provides utility functions for tactical grid calculations, positioning, and data generation
 * Notes: Handles grid-to-percentage conversions, fallback data generation, and party positioning logic
 */

// Helper function to convert grid coordinates to percentage
export const gridToPercentage = (
  gridX: number,
  gridY: number,
): { x: number; y: number } => {
  const cellWidth = 100 / 15;
  const cellHeight = 100 / 15;
  return {
    x: (gridX + 0.5) * cellWidth,
    y: (gridY + 0.5) * cellHeight,
  };
};

// Helper function to get a random empty grid cell
export const getRandomEmptyCell = (
  excludeCells: Set<string> = new Set(),
): { gridX: number; gridY: number } => {
  let attempts = 0;
  while (attempts < 100) {
    const gridX = Math.floor(Math.random() * 15);
    const gridY = Math.floor(Math.random() * 15);
    const cellKey = `${gridX},${gridY}`;

    if (!excludeCells.has(cellKey)) {
      excludeCells.add(cellKey);
      return { gridX, gridY };
    }
    attempts++;
  }
  return { gridX: 7, gridY: 7 };
};

// Helper function to get room background type
export const getRoomBackgroundType = (environment: string, type: string): string => {
  if (type === "entrance" || type === "exit") return "stone_chamber";
  if (type === "treasure") return "golden_chamber";
  if (type === "safe") return "peaceful_chamber";
  if (type === "boss") return "dark_chamber";

  switch (environment) {
    case "outdoor":
      return "forest_clearing";
    case "underground":
      return "dungeon_corridor";
    default:
      return "stone_chamber";
  }
};

// Generate client-side fallback tactical data when server data is unavailable
export function generateFallbackTacticalData(roomData: any) {
  if (!roomData?.room) return null;

  // Generate basic tactical entities based on room type for fallback
  const tacticalEntities = [];
  const room = roomData.room;

  // Add basic loot if room has loot flag
  if (room.hasLoot) {
    tacticalEntities.push({
      type: 'loot',
      id: 'fallback_loot_1',
      name: 'Mysterious Item',
      data: { value: 50 },
      position: { x: 25 + Math.random() * 50, y: 25 + Math.random() * 50 },
      interactable: true
    });
  }

  // Add basic hostile mob if room is not safe
  if (!room.isSafe && room.type !== 'safe_zone') {
    tacticalEntities.push({
      type: 'mob',
      id: 'fallback_mob_1',
      name: 'Unknown Threat',
      data: {
        hp: 50,
        maxHp: 50,
        attack: 8,
        defense: 5,
        level: 1,
        disposition: 'hostile'
      },
      position: { x: 25 + Math.random() * 50, y: 25 + Math.random() * 50 },
      combatReady: true,
      hostile: true,
      combatStats: {
        hp: 50,
        maxHp: 50,
        attack: 8,
        defense: 5,
        speed: 10,
        level: 1,
        might: 8,
        agility: 10,
        endurance: 8,
        intellect: 6,
        charisma: 4,
        wisdom: 6
      }
    });
  }

  return {
    room: roomData.room,
    availableDirections: roomData.availableDirections || [],
    playersInRoom: roomData.playersInRoom || [],
    tacticalEntities,
    entityCount: tacticalEntities.length,
    mobCount: tacticalEntities.filter(e => e.type === 'mob').length,
    lootCount: tacticalEntities.filter(e => e.type === 'loot').length,
    npcCount: tacticalEntities.filter(e => e.type === 'npc').length,
    connections: roomData.room.connections || [],
    fallback: true
  };
}

// Helper function to get party entry positions based on direction
export const getPartyEntryPositions = (
  direction: "north" | "south" | "east" | "west" | null,
  partySize: number,
): { x: number; y: number }[] => {
  const positions: { x: number; y: number }[] = [];

  let baseGridX = 7;
  let baseGridY = 7;
  let spreadDirection: "horizontal" | "vertical" = "horizontal";

  switch (direction) {
    case "north":
      baseGridX = 7;
      baseGridY = 13;
      spreadDirection = "horizontal";
      break;
    case "south":
      baseGridX = 7;
      baseGridY = 1;
      spreadDirection = "horizontal";
      break;
    case "east":
      baseGridX = 1;
      baseGridY = 7;
      spreadDirection = "vertical";
      break;
    case "west":
      baseGridX = 13;
      baseGridY = 7;
      spreadDirection = "vertical";
      break;
    default:
      baseGridX = 7;
      baseGridY = 7;
      spreadDirection = "horizontal";
  }

  const halfParty = Math.floor(partySize / 2);

  for (let i = 0; i < partySize; i++) {
    let gridX = baseGridX;
    let gridY = baseGridY;

    if (partySize > 1) {
      const offset = i - halfParty;

      if (spreadDirection === "horizontal") {
        gridX = Math.max(0, Math.min(14, baseGridX + offset));
      } else {
        gridY = Math.max(0, Math.min(14, baseGridY + offset));
      }
    }

    positions.push(gridToPercentage(gridX, gridY));
  }

  return positions;
};