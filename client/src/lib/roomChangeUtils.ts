/**
 * File: roomChangeUtils.ts
 * Responsibility: Unified room change and entry positioning logic
 * Notes: Consolidates previously scattered positioning logic into a single, consistent system
 */

import { queryClient } from "@/lib/queryClient";

export interface Position {
  x: number;
  y: number;
}

/**
 * Unified room change and entry positioning utility class
 */
export class RoomChangeManager {
  private static readonly STORAGE_KEY = 'entryDirection';

  /**
   * Get the entry position for a player based on the direction they moved to enter this room
   * 
   * CRITICAL LOGIC:
   * If a player moves EAST, they should appear at the WEST edge of the destination room.
   * If a player moves WEST, they should appear at the EAST edge of the destination room.
   * Think of it as walking through a doorway - you exit one side and enter the opposite side.
   * 
   * @param movementDirection - The direction the player moved (e.g., "east" means they moved east)
   * @returns Position object with x, y coordinates (percentage-based, 0-100)
   */
  static getEntryPosition(movementDirection: string | null): Position {
    // Default center position if no direction specified
    if (!movementDirection) {
      return { x: 50, y: 50 };
    }

    // Position player at the OPPOSITE edge from their movement direction
    switch (movementDirection.toLowerCase()) {
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
        console.warn(`Unknown movement direction: ${movementDirection}, using center position`);
        return { x: 50, y: 50 };
    }
  }

  /**
   * Store the movement direction for proper entry positioning
   * @param direction - The direction the player is moving
   */
  static storeMovementDirection(direction: string): void {
    sessionStorage.setItem(this.STORAGE_KEY, direction);
  }

  /**
   * Get the stored movement direction from session storage
   * @returns The stored movement direction or null if not found
   */
  static getStoredMovementDirection(): string | null {
    return sessionStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Clear the stored movement direction after positioning is complete
   */
  static clearStoredMovementDirection(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Handle entry positioning for room transitions
   * @param direction - The direction the player moved
   * @param combatSystem - The combat system instance
   * @param crawler - The full crawler data
   */
  static handleRoomEntryPositioning(
    direction: string,
    combatSystem: any,
    crawler: any
  ): void {
    // Get the correct entry position (don't store direction here - it's already stored)
    const entryPosition = this.getEntryPosition(direction);

    // Position player at the correct entry point
    combatSystem.initializePlayer(entryPosition, crawler);

    // Note: Direction clearing is handled by the caller after successful positioning
  }

  /**
   * Handle room change events by invalidating only essential queries
   * Used for position resets, teleports, or any forced room transition
   */
  static handleRoomChange(crawlerId: number): void {
    // Only invalidate the batch query - it contains all room data we need
    queryClient.invalidateQueries({
      queryKey: ["/api/crawlers/" + crawlerId + "/room-data-batch"]
    });

    // Keep map queries cached since they don't change often
    queryClient.invalidateQueries({
      queryKey: ["/api/crawlers/" + crawlerId + "/explored-rooms"],
    });
  }

  /**
   * Check if room data is already cached for instant transitions
   */
  static getCachedRoomData(roomId: number) {
    const cachedData = queryClient.getQueryData([`/api/room/${roomId}/basic-data`]);
    return cachedData || null;
  }
}

/**
 * Handles room change with immediate refetch for responsive UI
 * Uses optimistic updates and cached data for instant feel
 */
export async function handleRoomChangeWithRefetch(
  crawlerId: number,
  direction: string
): Promise<boolean> {
  try {
    // Clear any existing entry direction since we're moving
    RoomChangeManager.clearStoredMovementDirection();

    // Store the movement direction for entry positioning BEFORE the API call
    // This ensures it's available immediately when the new room loads
    const validDirections = ['north', 'south', 'east', 'west', 'staircase'];
    if (validDirections.includes(direction.toLowerCase())) {
      sessionStorage.setItem('lastMovementDirection', direction);
      // Also store as entry direction for immediate use
      sessionStorage.setItem('entryDirection', direction);
    }

    const response = await fetch(`/api/crawlers/${crawlerId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });

    if (!response.ok) {
      if (response.status === 502) {
        console.error("❌ Server temporarily unavailable (502)");
        RoomChangeManager.clearStoredMovementDirection();
        return false;
      }

      let errorText = "Unknown error";
      try {
        errorText = await response.text();
      } catch (e) {
        // Ignore text parsing errors
      }

      console.error("❌ Room change failed:", response.status, response.statusText);
      RoomChangeManager.clearStoredMovementDirection();
      return false;
    }

    let result;
    try {
      result = await response.json();
    } catch (e) {
      console.error("❌ Invalid JSON response from server");
      RoomChangeManager.clearStoredMovementDirection();
      return false;
    }

    if (!result.success) {
      console.error("❌ Room change unsuccessful:", result.error);
      RoomChangeManager.clearStoredMovementDirection();
      return false;
    }

    // Invalidate queries only if movement was successful
    try {
      queryClient.invalidateQueries({
        queryKey: [`/api/crawlers/${crawlerId}`]
      });

      queryClient.invalidateQueries({
        queryKey: [`/api/crawlers/${crawlerId}/room-data-batch`]
      });

      queryClient.invalidateQueries({
        queryKey: [`/api/crawlers/${crawlerId}/tactical-data`]
      });

      queryClient.invalidateQueries({
        queryKey: [`/api/crawlers/${crawlerId}/explored-rooms`]
      });
    } catch (e) {
      console.error("Error invalidating queries:", e);
    }

    return true;

  } catch (error) {
    console.error("❌ Room change request failed:", error);
    RoomChangeManager.clearStoredMovementDirection();
    return false;
  }
}

// Export convenience functions for backward compatibility
export const {
  getEntryPosition,
  storeMovementDirection,
  getStoredMovementDirection,
  clearStoredMovementDirection,
  handleRoomEntryPositioning,
  handleRoomChange,
  getCachedRoomData
} = RoomChangeManager;

// Legacy exports for backward compatibility
export const storeEntryDirection = storeMovementDirection;
export const getStoredEntryDirection = getStoredMovementDirection;
export const clearStoredEntryDirection = clearStoredMovementDirection;