
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
 * Get the entry position for a player based on the direction they came from
 * @param entryDirection - The direction the player moved to enter this room
 * @returns Position object with x, y coordinates (percentage-based, 0-100)
 */
export function getEntryPosition(entryDirection: string | null): Position {
  // Default center position if no direction specified
  if (!entryDirection) {
    return { x: 50, y: 50 };
  }

  // Position player near the appropriate edge based on entry direction
  // When entering from north, player should be near the south edge (they came from north)
  // When entering from south, player should be near the north edge (they came from south)
  // etc.
  switch (entryDirection.toLowerCase()) {
    case "north":
      // Came from north, so enter from the south edge
      return { x: 50, y: 85 };
    
    case "south":
      // Came from south, so enter from the north edge  
      return { x: 50, y: 15 };
    
    case "east":
      // Came from east, so enter from the west edge
      return { x: 15, y: 50 };
    
    case "west":
      // Came from west, so enter from the east edge
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
