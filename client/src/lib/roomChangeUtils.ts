/**
 * File: roomChangeUtils.ts
 * Responsibility: Utility functions for handling room changes, position resets, and teleports
 * Notes: Provides centralized logic for updating all map and tactical data when room transitions occur
 */

import { queryClient } from "@/lib/queryClient";

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
 * Handles room change with immediate refetch for responsive UI
 * Uses optimistic updates for instant feel
 */
export function handleRoomChangeWithRefetch(crawlerId: number) {
  console.log("Fast room change for crawler " + crawlerId);

  // Immediately refetch the batch data without invalidating first
  queryClient.refetchQueries({
    queryKey: ["/api/crawlers/" + crawlerId + "/room-data-batch"]
  });

  // Update explored rooms in background
  queryClient.refetchQueries({
    queryKey: ["/api/crawlers/" + crawlerId + "/explored-rooms"]
  });
}