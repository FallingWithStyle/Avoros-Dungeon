/**
 * File: map-panel.tsx
 * Responsibility: Wrapper component that renders the dungeon map for a given crawler
 * Notes: Simple container that passes crawler data to the DungeonMap component
 */

import React, { useState, useEffect } from "react";
import DungeonMap from "@/components/dungeon-map";
import { CrawlerWithDetails } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface MapPanelProps {
  crawler: CrawlerWithDetails;
}

export default function MapPanel({ crawler }: MapPanelProps) {
  // Don't render anything if crawler is not available
  if (!crawler) {
    return null;
  }

  // Fetch explored rooms data
  const { 
    data: exploredRooms = [], 
    isLoading: mapLoading,
    refetch: refetchMap
  } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
    queryFn: async () => {
      const response = await fetch(`/api/crawlers/${crawler.id}/explored-rooms`);
      if (!response.ok) throw new Error('Failed to fetch explored rooms');
      return response.json();
    },
    staleTime: 5000, // Shorter cache time for more responsive updates
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Find current room in explored rooms for highlighting
  const currentRoom = exploredRooms.find((room: any) => room.id === crawler.roomId);

  // Refetch map when room changes
  useEffect(() => {
    if (crawler.roomId) {
      refetchMap();
    }
  }, [crawler.roomId, refetchMap]);

  return (
    <div className="space-y-4">
      <DungeonMap crawler={crawler} exploredRooms={exploredRooms} currentRoom={currentRoom} isLoading={mapLoading}/>
    </div>
  );
}