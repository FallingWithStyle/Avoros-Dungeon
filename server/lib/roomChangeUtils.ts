// roomChangeUtils.ts

// This file contains utility functions for handling room changes and player positioning.

/**
 * Stores the entry direction in local storage.
 * @param direction The direction the player moved to enter the room.
 */
function storeEntryDirection(direction: string): void {
  const oppositeDirection = getOppositeDirection(direction);
  localStorage.setItem('entryDirection', oppositeDirection);
  console.log(`📍 Stored entry direction: ${oppositeDirection} (opposite of movement direction)`);
}

/**
 * Retrieves the entry direction from local storage.
 * @returns The direction the player moved to enter the room, or null if not found.
 */
function getEntryDirection(): string | null {
  return localStorage.getItem('entryDirection');
}

/**
 * Clears the stored entry direction from local storage.
 */
function clearEntryDirection(): void {
  localStorage.removeItem('entryDirection');
}

/**
 * Gets the opposite direction.
 * @param direction The direction to get the opposite of.
 * @returns The opposite direction.
 */
function getOppositeDirection(direction: string): string {
  switch (direction) {
    case 'north':
      return 'south';
    case 'south':
      return 'north';
    case 'east':
      return 'west';
    case 'west':
      return 'east';
    default:
      return '';
  }
}

/**
 * Handles the room change logic, including storing the entry direction.
 * @param direction The direction the player is moving.
 */
function handleRoomChange(direction: string): void {
  // Store the *opposite* of the movement direction for proper positioning in the new room
  // The entry positioning logic will handle placing the player at the correct edge
  storeEntryDirection(direction);

  // ... (Other room change logic, e.g., navigating to the new room) ...
  // For example:
  // window.location.href = `/room/${direction}`;
}

/**
 * Gets the entry position based on the stored entry direction.
 * @returns An object containing the x and y coordinates for the player's entry position.
 */
function getEntryPosition(): { x: number; y: number } {
  const entryDirection = getEntryDirection();

  if (entryDirection === 'south') {
    return { x: 50, y: 90 }; // Example: Bottom center - Entered from North
  } else if (entryDirection === 'north') {
    return { x: 50, y: 10 }; // Example: Top center - Entered from South
  } else if (entryDirection === 'west') {
    return { x: 10, y: 50 }; // Example: Left center - Entered from East
  } else if (entryDirection === 'east') {
    return { x: 90, y: 50 }; // Example: Right center - Entered from West
  } else {
    return { x: 50, y: 50 }; // Default: Center
  }
}

export {
  storeEntryDirection,
  getEntryDirection,
  clearEntryDirection,
  getOppositeDirection,
  handleRoomChange,
  getEntryPosition,
};