/**
 * File: tactical-data-hooks.tsx
 * Responsibility: Provides React hooks for fetching tactical combat data including room data, explored rooms, and tactical entities
 * Notes: Handles data fetching with proper refetch intervals and error handling for tactical view components
 */

import React, { useCallback } from "react";
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
  // Reduced logging for production
  if (process.env.NODE_ENV === 'development') {
    console.log('useTacticalData - Crawler input:', crawler);
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
      console.log('Fetching room data for crawler:', crawler?.id);
      const response = await fetch(`/api/crawlers/${crawler?.id}/room-data-batch`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch room data: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      // Always ensure we have fallback data structure
      return {
        room: data.room || null,
        scannedRooms: Array.isArray(data.scannedRooms) ? data.scannedRooms : [],
        playersInRoom: Array.isArray(data.playersInRoom) ? data.playersInRoom : [],
        factions: Array.isArray(data.factions) ? data.factions : [],
        availableDirections: Array.isArray(data.availableDirections) ? data.availableDirections : [],
        fallback: data.fallback || false
      };
    },
    staleTime: 10000, // 10 seconds
    refetchOnWindowFocus: true,
    enabled: !!crawler?.id,
    retry: (failureCount, error) => {
      // Don't retry timeout errors as aggressively
      if (error.message.includes('503')) {
        return failureCount < 2;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
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
      const response = await fetch(`/api/crawlers/${crawler?.id}/explored-rooms`);
      if (!response.ok) throw new Error('Failed to fetch explored rooms');
      const data = await response.json();
      // Ensure we always return an array
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30000, // 30 seconds
    enabled: !!crawler?.id,
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
      const response = await fetch(`/api/crawlers/${crawler?.id}/tactical-data`);
      if (!response.ok) throw new Error('Failed to fetch tactical data');
      return response.json();
    },
    staleTime: 15000, // 15 seconds
    enabled: !!crawler?.id,
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
    handleRoomChange,
  };
}