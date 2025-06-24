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
  // Initialize hook without debug logging
  const hasLoggedRef = useRef(false);

  // Fetch current room data - OPTIMIZED for speed
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
          throw new Error(`Failed to fetch room data: ${response.status}`);
        }

        const data = await response.json();

        return {
          room: data.room || null,
          scannedRooms: Array.isArray(data.scannedRooms) ? data.scannedRooms : [],
          playersInRoom: Array.isArray(data.playersInRoom) ? data.playersInRoom : [],
          factions: Array.isArray(data.factions) ? data.factions : [],
          availableDirections: Array.isArray(data.availableDirections) ? data.availableDirections : [],
          connections: data.room?.connections || [],
          fallback: data.fallback || false
        };
      } catch (error) {
        console.error('Room data fetch error:', error);
        throw error;
      }
    },
    staleTime: 30000, // INCREASED: 30 seconds for better caching
    gcTime: 10 * 60 * 1000, // INCREASED: 10 minutes cache retention
    refetchOnWindowFocus: false,
    enabled: !!crawler?.id,
    retry: 1, // REDUCED: Only 1 retry for faster failure
    retryDelay: 1000, // REDUCED: Faster retry
    select: (data) => {
      if (data && data.connections) {
        return {
          ...data,
          currentRoom: { ...data, connections: data.connections },
          room: { ...data, connections: data.connections }
        };
      }
      return data;
    }
  });

  // Fetch explored rooms - OPTIMIZED with longer cache
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
            return [];
          }
          throw new Error('Failed to fetch explored rooms');
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('Explored rooms fetch error:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // INCREASED: 5 minutes - explored rooms change slowly
    gcTime: 15 * 60 * 1000, // INCREASED: 15 minutes cache retention
    refetchOnWindowFocus: false,
    enabled: !!crawler?.id,
    retry: false,
  });

  // Fetch tactical data - OPTIMIZED for immediate display
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
            return null;
          }
          throw new Error('Failed to fetch tactical data');
        }

        return response.json();
      } catch (error) {
        console.error('Tactical data fetch error:', error);
        return null;
      }
    },
    staleTime: 10000, // REDUCED: 10 seconds for more current tactical data
    gcTime: 5 * 60 * 1000, // INCREASED: 5 minutes cache retention
    refetchOnWindowFocus: false,
    enabled: !!crawler?.id && !!roomData, // DEPENDENCY: Wait for room data first
    retry: false,
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