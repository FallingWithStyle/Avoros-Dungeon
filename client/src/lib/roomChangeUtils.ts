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
export async function handleRoomChangeWithRefetch(crawlerId: number, direction: string) {
  console.log("🚀 Ultra-fast room change for crawler " + crawlerId + " direction " + direction);

  try {
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
    console.log("✅ Move API response:", moveResult);

    if (!moveResult.success) {
      throw new Error(moveResult.message || "Move was not successful");
    }

    // Check if we have cached data for the new room
    const newRoomId = moveResult.newRoom?.id;
    if (newRoomId) {
      const cachedRoomData = getCachedRoomData(newRoomId);
      if (cachedRoomData) {
        console.log(`⚡ Using cached data for room ${newRoomId} - instant transition!`);
        
        // Optimistically update with cached data
        queryClient.setQueryData(
          ["/api/crawlers/" + crawlerId + "/room-data-batch"],
          (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              currentRoom: {
                room: cachedRoomData.room,
                availableDirections: cachedRoomData.availableDirections,
                playersInRoom: []
              },
              _isCached: true
            };
          }
        );
      }
    }

    // After successful move, refetch all relevant data in background
    const refetchPromises = [
      queryClient.refetchQueries({
        queryKey: ["/api/crawlers/" + crawlerId + "/room-data-batch"]
      }),
      queryClient.refetchQueries({
        queryKey: ["/api/crawlers/" + crawlerId + "/current-room"]
      }),
      queryClient.refetchQueries({
        queryKey: ["/api/crawlers/" + crawlerId + "/tactical-data"]
      }),
      queryClient.refetchQueries({
        queryKey: ["/api/crawlers/" + crawlerId + "/explored-rooms"]
      })
    ];

    // Don't await these - let them run in background
    Promise.all(refetchPromises).then(() => {
      console.log("🔄 Background data refresh completed");
    }).catch((error) => {
      console.error("❌ Background refresh failed:", error);
    });

    return { success: true, newRoom: moveResult.newRoom };
  } catch (error) {
    console.error("❌ Room change failed:", error);
    return { success: false, error: error.message };
  }
}