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

    try {
      const response = await fetch(`/api/crawlers/${crawler.id}/adjacent-rooms/${radius}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // OPTIMIZED: Aggressive caching for instant room transitions
      if (data.adjacentRooms) {
        data.adjacentRooms.forEach((roomData: any) => {
          const isAdjacent = roomData.distance === 1;
          
          // INCREASED cache times for instant transitions
          const staleTime = isAdjacent ? 15 * 60 * 1000 : 10 * 60 * 1000; // 15min for adjacent, 10min for distance 2
          const gcTime = isAdjacent ? 30 * 60 * 1000 : 20 * 60 * 1000; // Keep much longer

          // Cache room data in multiple expected formats for instant access
          const roomDataFormatted = {
            room: roomData.room,
            currentRoom: roomData.room, // Add currentRoom for compatibility
            scannedRooms: roomData.scannedRooms || [],
            playersInRoom: roomData.playersInRoom || [],
            factions: roomData.factions || [],
            availableDirections: roomData.availableDirections || [],
            connections: roomData.room?.connections || [],
            fallback: false,
            _prefetched: true,
            _prefetchedAt: Date.now()
          };

          // ENHANCED: Pre-cache the exact query key that will be used during transitions
          const batchQueryKey = [`/api/crawlers/${crawler.id}/room-data-batch`];
          
          // Pre-populate cache for immediate access during room transitions
          queryClient.setQueryData(
            [`/api/room/${roomData.room.id}/batch-data`],
            roomDataFormatted,
            { staleTime, gcTime }
          );

          // Cache individual room data
          queryClient.setQueryData(
            [`/api/room/${roomData.room.id}/basic-data`],
            roomDataFormatted,
            { staleTime, gcTime }
          );

          // Pre-cache tactical structure with base entities for faster combat view loading
          const tacticalData = {
            room: roomData.room,
            availableDirections: roomData.availableDirections || [],
            playersInRoom: roomData.playersInRoom || [],
            tacticalEntities: roomData.tacticalEntities || [], // Include if available
            factions: roomData.factions || [],
            connections: roomData.room?.connections || [],
            _isCached: true,
            _cachedAt: Date.now()
          };

          queryClient.setQueryData(
            [`/api/room/${roomData.room.id}/cached-tactical`],
            tacticalData,
            { staleTime: staleTime, gcTime: gcTime }
          );

          // CRITICAL: Pre-cache the most commonly used queries for instant access
          queryClient.setQueryData(
            [`room-tactical-${roomData.room.id}`],
            tacticalData,
            { staleTime: staleTime, gcTime: gcTime }
          );
        });

        // Log successful prefetch for debugging
        const adjacentCount = data.adjacentRooms.filter((r: any) => r.distance === 1).length;
        console.log(`🔮 Prefetched ${adjacentCount} adjacent rooms for instant transitions`);
      }

      return data;
    } catch (error) {
      console.log(`🔮 Adjacent room prefetch failed:`, error);
      return null;
    }
  }, [crawler.id, currentRoomId, radius, enabled]);

  // OPTIMIZED: Query for adjacent rooms with aggressive caching
  const { data: adjacentRoomsData, isLoading, error } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/adjacent-rooms`, currentRoomId, radius],
    queryFn: prefetchAdjacentRooms,
    enabled: enabled && !!currentRoomId,
    staleTime: 5 * 60 * 1000, // INCREASED: 5 minutes for better performance
    gcTime: 15 * 60 * 1000, // INCREASED: 15 minutes retention
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1, // REDUCED: Only 1 retry for faster failure
  });

  // OPTIMIZED: Immediate prefetching without delay
  useEffect(() => {
    if (currentRoomId && enabled) {
      // Start prefetching immediately for instant transitions
      prefetchAdjacentRooms();
    }
  }, [currentRoomId, prefetchAdjacentRooms, enabled]);

  return {
    adjacentRoomsData,
    isLoading,
    error,
    prefetchAdjacentRooms
  };
}