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
export async function handleRoomChangeWithRefetch(crawlerId: number, direction: string) {
  console.log("Fast room change for crawler " + crawlerId + " direction " + direction);

  try {
    // Optimistically invalidate cache immediately for responsive feel
    queryClient.setQueryData(
      ["/api/crawlers/" + crawlerId + "/room-data-batch"],
      (oldData: any) => {
        if (!oldData) return oldData;
        // Mark as stale but keep displaying while loading
        return { ...oldData, _isStale: true };
      }
    );

    // First, make the actual move API call
    const response = await fetch("/api/crawlers/" + crawlerId + "/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ direction }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Move request failed");
    }

    const moveResult = await response.json();
    console.log("Move API response:", moveResult);

    if (!moveResult.success) {
      throw new Error(moveResult.message || "Move was not successful");
    }

    // After successful move, refetch all relevant data
    await queryClient.refetchQueries({
      queryKey: ["/api/crawlers/" + crawlerId + "/room-data-batch"]
    });

    await queryClient.refetchQueries({
      queryKey: ["/api/crawlers/" + crawlerId + "/current-room"]
    });

    await queryClient.refetchQueries({
      queryKey: ["/api/crawlers/" + crawlerId + "/tactical-data"]
    });

    await queryClient.refetchQueries({
      queryKey: ["/api/crawlers/" + crawlerId + "/explored-rooms"]
    });

    return { success: true, newRoom: moveResult.newRoom };
  } catch (error) {
    console.error("Room change failed:", error);
    return { success: false, error: error.message };
  }
}