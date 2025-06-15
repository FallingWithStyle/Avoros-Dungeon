/**
 * File: roomChangeUtils.ts
 * Responsibility: Utility functions for handling room changes, position resets, and teleports
 * Notes: Provides centralized logic for updating all map and tactical data when room transitions occur
 */

import { queryClient } from "@/lib/queryClient";
import { 
  clearStoredEntryDirection, 
  getOppositeDirection, 
  storeEntryDirection,
  clearStoredMovementDirection 
} from "@/lib/entryPositioning";
import type { CrawlerWithDetails } from "@shared/schema";

/**
 * Handles room change events by invalidating only essential queries
 * Used for position resets, teleports, or any forced room transition
 */
export function handleRoomChange(crawlerId: number): void {
  console.log("Handling room change for crawler " + crawlerId + " - invalidating essential queries only");

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
export function getCachedRoomData(roomId: number) {
  const cachedData = queryClient.getQueryData([`/api/room/${roomId}/basic-data`]);
  return cachedData || null;
}

/**
 * Handles room change with immediate refetch for responsive UI
 * Uses optimistic updates and cached data for instant feel
 */
export async function handleRoomChangeWithRefetch(
  crawler: CrawlerWithDetails,
  direction: string
): Promise<boolean> {
  console.log("🔄 Starting room change with refetch for direction:", direction);

  try {
    // Clear entry direction since we're moving
    clearStoredEntryDirection();

    // Store the opposite direction for entry positioning
    const entryDirection = getOppositeDirection(direction);
    storeEntryDirection(entryDirection);

    console.log(`📍 Stored entry direction: ${entryDirection} (opposite of movement ${direction})`);

    const response = await fetch(`/api/crawlers/${crawler.id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Room change failed:", response.status, errorText);
      clearStoredEntryDirection(); // Clear on failure
      return false;
    }

    const result = await response.json();
    if (!result.success) {
      console.error("❌ Room change unsuccessful:", result.error);
      clearStoredEntryDirection(); // Clear on failure
      return false;
    }

    console.log("✅ Room change successful, invalidating relevant queries");

    // Invalidate crawler data
    queryClient.invalidateQueries({
      queryKey: [`/api/crawlers/${crawler.id}`],
    });

    // Invalidate room-specific queries
    if (result.newRoomId) {
      queryClient.invalidateQueries({
        queryKey: [`/api/crawlers/${crawler.id}/room-data-batch`],
      });
    }

    // Invalidate adjacent room prefetch data since we moved
    queryClient.invalidateQueries({
      queryKey: [`/api/crawlers/${crawler.id}/adjacent-rooms`],
    });

    // Small delay to allow server state to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("🔄 Room change with refetch completed successfully");
    return true;
  } catch (error) {
    console.error("💥 Error during room change with refetch:", error);
    clearStoredEntryDirection(); // Clear on error
    return false;
  }
};