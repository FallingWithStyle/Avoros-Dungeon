
/**
 * File: roomChangeUtils.ts
 * Responsibility: Utility functions for handling room changes, position resets, and teleports
 * Notes: Provides centralized logic for updating all map and tactical data when room transitions occur
 */

import { queryClient } from "@/lib/queryClient";

/**
 * Handles room change events by invalidating all related queries
 * Used for position resets, teleports, or any forced room transition
 */
export function handleRoomChange(crawlerId: number): void {
  console.log("Handling room change for crawler " + crawlerId + " - updating all map and tactical data");
  
  // Invalidate all room-related queries concurrently
  queryClient.invalidateQueries({
    queryKey: ["/api/crawlers/" + crawlerId + "/current-room"],
  });
  queryClient.invalidateQueries({
    queryKey: ["/api/crawlers/" + crawlerId + "/explored-rooms"],
  });
  queryClient.invalidateQueries({
    queryKey: ["/api/crawlers/" + crawlerId + "/tactical-data"],
  });
  queryClient.invalidateQueries({
    queryKey: ["/api/crawlers/" + crawlerId + "/scanned-rooms"],
  });
  queryClient.invalidateQueries({ queryKey: ["dungeonMap"] });
  
  // Also invalidate the main crawler query to ensure all data is fresh
  queryClient.invalidateQueries({ 
    queryKey: ["/api/crawlers/" + crawlerId] 
  });
  queryClient.invalidateQueries({ 
    queryKey: ["/api/crawlers"] 
  });
}

/**
 * Handles room change with immediate refetch for responsive UI
 */
export function handleRoomChangeWithRefetch(crawlerId: number): void {
  handleRoomChange(crawlerId);
  
  // Force immediate refetch of critical data
  queryClient.refetchQueries({
    queryKey: ["/api/crawlers/" + crawlerId + "/current-room"],
  });
  queryClient.refetchQueries({
    queryKey: ["/api/crawlers/" + crawlerId + "/tactical-data"],
  });
}
