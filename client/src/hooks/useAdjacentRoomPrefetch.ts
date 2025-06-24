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
          
          // AGGRESSIVE cache times for instant transitions
          const staleTime = isAdjacent ? 30 * 60 * 1000 : 15 * 60 * 1000; // 30min for adjacent, 15min for distance 2
          const gcTime = isAdjacent ? 60 * 60 * 1000 : 30 * 60 * 1000; // Keep 1 hour for adjacent, 30min for distance 2

          // Cache room data in multiple expected formats for instant access
          const roomDataFormatted = {
            room: roomData.room,
            scannedRooms: roomData.scannedRooms || [],
            playersInRoom: roomData.playersInRoom || [],
            factions: roomData.factions || [],
            availableDirections: roomData.availableDirections || [],
            connections: roomData.room?.connections || [],
            fallback: false,
            _prefetched: true,
            _prefetchedAt: Date.now()
          };

          // Cache in room-data-batch format for immediate loading
          queryClient.setQueryData(
            [`/api/crawlers/${crawler.id}/room-data-batch`],
            (oldData: any) => {
              // Only replace if this room becomes current
              if (oldData?.room?.id === roomData.room.id) {
                return roomDataFormatted;
              }
              return oldData;
            }
          );

          // Cache individual room data
          queryClient.setQueryData(
            [`/api/room/${roomData.room.id}/basic-data`],
            roomDataFormatted,
            { staleTime, gcTime }
          );

          // Pre-cache tactical structure for faster combat view loading
          queryClient.setQueryData(
            [`/api/room/${roomData.room.id}/cached-tactical`],
            {
              room: roomData.room,
              availableDirections: roomData.availableDirections || [],
              playersInRoom: roomData.playersInRoom || [],
              tacticalEntities: [], // Tactical entities fetched on-demand
              factions: roomData.factions || [],
              _isCached: true,
              _cachedAt: Date.now()
            },
            { staleTime: staleTime, gcTime: gcTime }
          );
        });
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
      
      // Also aggressively prefetch individual room data for each adjacent room
      const cachedData = queryClient.getQueryData([`/api/crawlers/${crawler.id}/adjacent-rooms`, currentRoomId, radius]);
      if (cachedData?.adjacentRooms) {
        cachedData.adjacentRooms.forEach((roomData: any) => {
          if (roomData.distance === 1) {
            // Pre-cache all room data formats that might be needed
            queryClient.prefetchQuery({
              queryKey: [`/api/crawlers/${crawler.id}/room-data-batch`],
              queryFn: async () => ({
                room: roomData.room,
                scannedRooms: roomData.scannedRooms || [],
                playersInRoom: roomData.playersInRoom || [],
                factions: roomData.factions || [],
                availableDirections: roomData.availableDirections || [],
                connections: roomData.room?.connections || [],
                fallback: false,
                _prefetched: true
              }),
              staleTime: 30 * 60 * 1000
            });
            
            // Also prefetch tactical data
            queryClient.prefetchQuery({
              queryKey: [`/api/crawlers/${crawler.id}/tactical-data`],
              queryFn: async () => ({
                room: roomData.room,
                availableDirections: roomData.availableDirections || [],
                playersInRoom: roomData.playersInRoom || [],
                tacticalEntities: [],
                factions: roomData.factions || []
              }),
              staleTime: 15 * 60 * 1000
            });
          }
        });
      }
    }
  }, [currentRoomId, prefetchAdjacentRooms, enabled, crawler.id, radius]);

  return {
    adjacentRoomsData,
    isLoading,
    error,
    prefetchAdjacentRooms
  };
}