
/**
 * File: entryPositioning.ts
 * Responsibility: Handle player positioning when entering rooms from different directions
 * Notes: Centralized logic for consistent entry positioning across room transitions
 */

export interface Position {
  x: number;
  y: number;
}

/**
 * Get the entry position for a player based on the direction they moved to enter this room
 * 
 * CRITICAL LOGIC - DO NOT CHANGE WITHOUT CAREFUL CONSIDERATION:
 * If a player exits through a SOUTH door, they should appear at the NORTH edge of the destination room.
 * If a player exits through a NORTH door, they should appear at the SOUTH edge of the destination room.
 * Think of it as walking through a doorway - you exit one side and enter the opposite side.
 * 
 * @param entryDirection - The direction the player moved to enter this room (e.g., "south" means they moved south)
 * @returns Position object with x, y coordinates (percentage-based, 0-100)
 */
export function getEntryPosition(entryDirection: string | null): Position {
  // Default center position if no direction specified
  if (!entryDirection) {
    return { x: 50, y: 50 };
  }

  // Position player at the OPPOSITE edge from their movement direction
  // If they moved SOUTH (through south door), they enter from NORTH edge (top of room)
  // If they moved NORTH (through north door), they enter from SOUTH edge (bottom of room)
  switch (entryDirection.toLowerCase()) {
    case "north":
      // Player moved NORTH, so they enter from the SOUTH edge (bottom) of the new room
      return { x: 50, y: 85 };
    
    case "south":
      // Player moved SOUTH, so they enter from the NORTH edge (top) of the new room
      return { x: 50, y: 15 };
    
    case "east":
      // Player moved EAST, so they enter from the WEST edge (left) of the new room
      return { x: 15, y: 50 };
    
    case "west":
      // Player moved WEST, so they enter from the EAST edge (right) of the new room
      return { x: 85, y: 50 };
    
    default:
      console.warn(`Unknown entry direction: ${entryDirection}, using center position`);
      return { x: 50, y: 50 };
  }
}

/**
 * Store the movement direction for proper entry positioning
 * @param direction - The direction the player is moving
 */
export function storeMovementDirection(direction: string): void {
  sessionStorage.setItem('lastMovementDirection', direction);
  sessionStorage.setItem('entryDirection', direction);
}

/**
 * Get the stored entry direction from session storage
 * @returns The stored entry direction or null if not found
 */
export function getStoredEntryDirection(): string | null {
  return sessionStorage.getItem('entryDirection') || sessionStorage.getItem('lastMovementDirection');
}

/**
 * Clear the stored movement direction after positioning is complete
 */
export function clearStoredMovementDirection(): void {
  sessionStorage.removeItem('lastMovementDirection');
  console.log('🧹 Cleared movement direction from session storage');
}

/**
 * Clear the stored entry direction
 */
export function clearStoredEntryDirection(): void {
  sessionStorage.removeItem('entryDirection');
  console.log('🧹 Cleared entry direction from session storage');
}

/**
 * Store the entry direction for proper positioning
 * @param direction - The direction the player entered from
 */
export function storeEntryDirection(direction: string): void {
  sessionStorage.setItem('entryDirection', direction);
  console.log(`📍 Stored entry direction: ${direction}`);
}

/**
 * Get the opposite direction for entry positioning
 * @param direction - The movement direction
 * @returns The opposite direction
 */
export function getOppositeDirection(direction: string): string {
  const opposites: Record<string, string> = {
    'north': 'south',
    'south': 'north',
    'east': 'west',
    'west': 'east'
  };
  return opposites[direction.toLowerCase()] || direction;
}

/**
 * Handle entry positioning for room transitions
 * @param direction - The direction the player moved
 * @param combatSystem - The combat system instance
 * @param crawler - The crawler data for naming
 */
export function handleRoomEntryPositioning(
  direction: string,
  combatSystem: any,
  crawler: { name: string; serial?: string }
): void {
  // Store the movement direction
  storeMovementDirection(direction);
  
  // Get the correct entry position
  const entryPosition = getEntryPosition(direction);
  
  console.log(`🎯 Entry position for direction ${direction}: {x: ${entryPosition.x}, y: ${entryPosition.y}}`);
  
  // Position player at the correct entry point
  combatSystem.initializePlayer(entryPosition, {
    name: crawler.name,
    serial: crawler.serial
  });
  
  console.log(`✅ Player positioned at entry point (${entryPosition.x}, ${entryPosition.y})`);
}
