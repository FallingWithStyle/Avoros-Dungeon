
import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { CrawlerWithDetails } from "@shared/schema";

interface UseAdjacentRoomPrefetchProps {
  crawler: CrawlerWithDetails;
  currentRoomId?: number;
  enabled?: boolean;
  radius?: number;
}

/**
 * Hook to prefetch adjacent rooms within a specified radius
 * Optimizes room transitions by caching nearby room data
 */
export function useAdjacentRoomPrefetch({
  crawler,
  currentRoomId,
  enabled = true,
  radius = 2
}: UseAdjacentRoomPrefetchProps) {
  
  const prefetchAdjacentRooms = useCallback(async () => {
    if (!currentRoomId || !enabled) return null;
    
    console.log(`🔮 Prefetching rooms within ${radius} moves of room ${currentRoomId}`);
    
    try {
      const response = await fetch(`/api/crawlers/${crawler.id}/adjacent-rooms/${radius}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`🔮 Successfully prefetched ${data.adjacentRooms?.length || 0} adjacent rooms`);
      
      // Cache individual room data for instant access
      if (data.adjacentRooms) {
        data.adjacentRooms.forEach((roomData: any) => {
          // Prioritize caching based on distance
          const staleTime = roomData.distance === 1 ? 5 * 60 * 1000 : 3 * 60 * 1000;
          const gcTime = roomData.distance === 1 ? 10 * 60 * 1000 : 5 * 60 * 1000;
          
          queryClient.setQueryData(
            [`/api/room/${roomData.room.id}/basic-data`],
            roomData,
            { staleTime }
          );
          
          // Also cache the data in a format expected by tactical data
          queryClient.setQueryData(
            [`/api/room/${roomData.room.id}/cached-tactical`],
            {
              room: roomData.room,
              availableDirections: roomData.availableDirections,
              playersInRoom: [],
              tacticalEntities: [], // Will be fetched when actually needed
              _isCached: true,
              _cachedAt: Date.now()
            },
            { staleTime: staleTime / 2 } // Shorter cache for tactical data
          );
        });
      }
      
      return data;
    } catch (error) {
      console.log(`🔮 Adjacent room prefetch failed:`, error);
      return null;
    }
  }, [crawler.id, currentRoomId, radius, enabled]);

  // Query for adjacent rooms with automatic refetching
  const { data: adjacentRoomsData, isLoading, error } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/adjacent-rooms`, currentRoomId, radius],
    queryFn: prefetchAdjacentRooms,
    enabled: enabled && !!currentRoomId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // Keep for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Prefetch when room changes
  useEffect(() => {
    if (currentRoomId && enabled) {
      // Delay prefetching to not interfere with current room loading
      const timer = setTimeout(() => {
        prefetchAdjacentRooms();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentRoomId, prefetchAdjacentRooms, enabled]);

  return {
    adjacentRoomsData,
    isLoading,
    error,
    prefetchAdjacentRooms
  };
}
