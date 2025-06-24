/**
 * File: tactical-data-hooks.tsx
 * Responsibility: Provides React hooks for fetching tactical combat data including room data, explored rooms, and tactical entities
 * Notes: Handles data fetching with proper refetch intervals and error handling for tactical view components
 */
import React, { useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { CrawlerWithDetails } from "@shared/schema";
import { handleRoomChangeWithRefetch } from "@/lib/roomChangeUtils";

interface TacticalDataHooks {
  roomData: any;
  exploredRooms: any[];
  tacticalData: any;
  refetchRoomData: () => void;
  refetchExploredRooms: () => void;
  refetchTacticalData: () => void;
  handleRoomChange: () => void;
}

export function useTacticalData(crawler: CrawlerWithDetails) {
  // Only log on first call, not on every re-render
  const hasLoggedRef = useRef(false);
  if (process.env.NODE_ENV === 'development' && !hasLoggedRef.current && crawler) {
    console.log('useTacticalData - Initializing for crawler:', crawler.id, crawler.name);
    hasLoggedRef.current = true;
  }

  // Fetch current room data
  const {
    data: roomData,
    isLoading,
    error: roomError,
    refetch: refetchRoomData
  } = useQuery({
    queryKey: [`/api/crawlers/${crawler?.id}/room-data-batch`],
    queryFn: async () => {
      if (!crawler?.id) {
        throw new Error('No crawler ID available');
      }

      try {
        const response = await fetch(`/api/crawlers/${crawler.id}/room-data-batch`);

        if (!response.ok) {
          if (response.status === 502) {
            throw new Error('Server temporarily unavailable (502)');
          }
          const errorText = await response.text();
          throw new Error(`Failed to fetch room data: ${response.status}`);
        }

        const data = await response.json();

        // Always ensure we have fallback data structure
        return {
          room: data.room || null,
          scannedRooms: Array.isArray(data.scannedRooms) ? data.scannedRooms : [],
          playersInRoom: Array.isArray(data.playersInRoom) ? data.playersInRoom : [],
          factions: Array.isArray(data.factions) ? data.factions : [],
          availableDirections: Array.isArray(data.availableDirections) ? data.availableDirections : [],
          connections: data.room?.connections || [], // Ensure connections are included and default to an empty array if missing
          fallback: data.fallback || false
        };
      } catch (error) {
        console.error('Room data fetch error:', error);
        throw error;
      }
    },
    staleTime: 15000, // 15 seconds to reduce frequency
    refetchOnWindowFocus: false, // Disable to reduce requests
    enabled: !!crawler?.id,
    retry: (failureCount, error) => {
      // More conservative retry logic
      if (error.message.includes('502') || error.message.includes('503')) {
        return failureCount < 1; // Only retry once for server errors
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000), // Longer delays
    select: (data) => {
      // Ensure connections are available at multiple paths for compatibility
      if (data && data.connections) {
        return {
          ...data,
          currentRoom: {
            ...data,
            connections: data.connections
          },
          room: {
            ...data,
            connections: data.connections
          }
        };
      }
      return data;
    }
  });

  // Fetch explored rooms
  const { 
    data: exploredRooms = [], 
    isLoading: exploredRoomsLoading,
    error: exploredRoomsError,
    refetch: refetchExploredRooms
  } = useQuery({
    queryKey: [`/api/crawlers/${crawler?.id}/explored-rooms`],
    queryFn: async () => {
      if (!crawler?.id) {
        throw new Error('No crawler ID available');
      }

      try {
        const response = await fetch(`/api/crawlers/${crawler.id}/explored-rooms`);

        if (!response.ok) {
          if (response.status === 502) {
            return []; // Return empty array for server errors
          }
          throw new Error('Failed to fetch explored rooms');
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Explored rooms fetch error:', error);
        return []; // Return empty array on error
      }
    },
    staleTime: 60000, // 60 seconds to reduce frequency
    refetchOnWindowFocus: false,
    enabled: !!crawler?.id,
    retry: false, // Don't retry this query
  });

  // Fetch tactical data
  const { 
    data: tacticalData, 
    isLoading: tacticalLoading,
    error: tacticalError,
    refetch: refetchTacticalData
  } = useQuery({
    queryKey: [`/api/crawlers/${crawler?.id}/tactical-data`],
    queryFn: async () => {
      if (!crawler?.id) {
        throw new Error('No crawler ID available');
      }

      try {
        const response = await fetch(`/api/crawlers/${crawler.id}/tactical-data`);

        if (!response.ok) {
          if (response.status === 502) {
            return null; // Return null for server errors
          }
          throw new Error('Failed to fetch tactical data');
        }

        return response.json();
      } catch (error) {
        console.error('Tactical data fetch error:', error);
        return null; // Return null on error
      }
    },
    staleTime: 20000, // 20 seconds to reduce frequency
    refetchOnWindowFocus: false,
    enabled: !!crawler?.id,
    retry: false, // Don't retry this query
  });

  const handleRoomChange = useCallback(() => {
    if (crawler?.id) {
      handleRoomChangeWithRefetch(refetchRoomData, refetchExploredRooms, refetchTacticalData);
    }
  }, [crawler?.id, refetchRoomData, refetchExploredRooms, refetchTacticalData]);

  // Early return if no crawler - AFTER all hooks are called
  if (!crawler) {
    return {
      roomData: null,
      exploredRooms: [],
      tacticalData: null,
      refetchRoomData: () => {},
      refetchExploredRooms: () => {},
      refetchTacticalData: () => {},
      handleRoomChange: () => {},
    };
  }

  return {
    roomData,
    exploredRooms: Array.isArray(exploredRooms) ? exploredRooms : [],
    tacticalData,
    isLoading,
    tacticalLoading,
    tacticalError,
    refetchTacticalData,
    refetchExploredRooms,
    refetchRoomData,
    handleRoomChange,
  };
}