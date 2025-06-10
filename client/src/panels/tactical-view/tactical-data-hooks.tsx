/**
 * File: tactical-data-hooks.tsx
 * Responsibility: Provides React hooks for fetching tactical combat data including room data, explored rooms, and tactical entities
 * Notes: Handles data fetching with proper refetch intervals and error handling for tactical view components
 */

import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { CrawlerWithDetails } from "@shared/schema";

interface TacticalDataHooks {
  roomData: any;
  exploredRooms: any[];
  tacticalData: any;
  refetchRoomData: () => void;
  refetchExploredRooms: () => void;
  refetchTacticalData: () => void;
}

export function useTacticalData(crawler: CrawlerWithDetails | null) {
  // Fetch current room data
  const { data: roomData, refetch: refetchRoomData } = useQuery({
    queryKey: [`/api/crawlers/${crawler?.id}/current-room`],
    enabled: !!crawler?.id,
    refetchInterval: 5000,
    staleTime: 30000,
    retry: false,
  });

  // Fetch explored rooms for map display
  const { data: exploredRooms, refetch: refetchExploredRooms } = useQuery({
    queryKey: [`/api/crawlers/${crawler?.id}/explored-rooms`],
    enabled: !!crawler?.id,
    refetchInterval: 30000,
    staleTime: 120000,
    retry: false,
  });

  // Fetch tactical data - this includes all the combat entities and positioning
  const { data: tacticalData, refetch: refetchTacticalData } = useQuery({
    queryKey: [`/api/crawlers/${crawler?.id}/tactical-data`],
    enabled: !!crawler?.id,
    refetchInterval: 3000,
    staleTime: 10000,
    retry: false,
  });

  // Early return if no crawler - AFTER all hooks are called
  if (!crawler) {
    return {
      roomData: null,
      exploredRooms: [],
      tacticalData: null,
      refetchRoomData: () => {},
      refetchExploredRooms: () => {},
      refetchTacticalData: () => {},
    };
  }

  return {
    roomData,
    exploredRooms: exploredRooms || [],
    tacticalData,
    refetchRoomData,
    refetchExploredRooms,
    refetchTacticalData,
  };
}