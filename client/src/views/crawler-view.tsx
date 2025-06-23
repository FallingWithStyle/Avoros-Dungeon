/**
 * File: crawler-view.tsx
 * Responsibility: Main view for individual crawler management and real-time monitoring interface
 * Notes: Displays tactical view, status panels, dungeon map, and events in a responsive layout for active crawler operations
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import CrawlerStatusPanel from "@/panels/crawler-status-panel";
import FloorInfoPanel from "@/panels/floor-info-panel";
import CombatViewPanel from "@/panels/combat-view-panel";
import RoomEventsPanel from "@/panels/room-events-panel";
import DungeonMap from "@/components/dungeon-map";
import DebugPanel from "@/components/debug-panel";
import type { CrawlerWithDetails } from "@shared/schema";
import { getAvatar } from "@/lib/avatarUtils";
import { ArrowLeft, Map, Target, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { handleRoomChangeWithRefetch } from "@/lib/roomChangeUtils";

interface CrawlerViewProps {
  crawlerId: string;
}

export default function CrawlerView({ crawlerId }: CrawlerViewProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [energyDisabled, setEnergyDisabled] = useState(false);

  // Fetch crawler data with cache control
  const { data: crawler, isLoading: crawlerLoading, error: crawlerError, refetch } = useQuery<CrawlerWithDetails>({
    queryKey: ["crawler", crawlerId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/crawlers/${crawlerId}`, {
          credentials: "include",
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch crawler: ${response.status} ${response.statusText}`);
        }
        return response.json();
      } catch (err) {
        console.error("Error fetching crawler:", err);
        throw err;
      }
    },
    enabled: !!crawlerId && isAuthenticated,
    staleTime: 0,
    gcTime: 0,
    retry: 3,
    retryDelay: 1000,
  });

  // Batch fetch all room data for faster loading
  const roomQuery = useQuery({
    queryKey: ["/api/crawlers/" + crawlerId + "/room-data-batch"],
    queryFn: async () => {
      const response = await fetch(`/api/crawlers/${crawlerId}/room-data-batch`, {
        credentials: "include",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        throw new Error("Failed to fetch room data");
      }
      return response.json();
    },
    enabled: !!crawlerId && isAuthenticated && !isLoading,
    staleTime: 30000, // Data is fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 5000,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error.message === "Authentication required") return false;
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const { data: roomBatchData, isLoading: roomLoading, error: roomError } = roomQuery;

  // Extract data from batch response
  const currentRoomData = roomBatchData?.currentRoom;
  const tacticalData = roomBatchData?.tacticalData;
  const scannedRooms = roomBatchData?.scannedRooms;



  // Only show loading on initial load, not on background refetches
  const isInitialLoading = crawlerLoading && !crawler;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-crawler mb-4"></i>
          <p className="text-slate-300">Loading crawler interface...</p>
        </div>
      </div>
    );
  }

  if (crawlerError) {
    console.error("Crawler loading error:", crawlerError);
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load crawler: {crawlerError instanceof Error ? crawlerError.message : 'Unknown error'}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!crawler) {
    console.log("Crawler is null/undefined, crawler loading:", crawlerLoading, "error:", crawlerError);
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Crawler not found</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const handleRoomMovement = async (direction: string) => {
    if (!tacticalData?.crawler?.id) {
      return;
    }

    try {
      await handleRoomChangeWithRefetch(tacticalData.crawler.id, direction);
    } catch (error) {
      console.error("❌ Room movement error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-game-bg text-slate-100">
      {/* Header */}
      <header className="bg-game-surface border-b border-game-border">
        <div className="w-full px-4 py-4 lg:max-w-7xl lg:mx-auto lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar image */}
              <Avatar>
                {(() => {
                  const avatar = getAvatar(crawler.name, crawler.serial);
                  if (avatar.imageUrl) {
                    return <AvatarImage src={avatar.imageUrl} alt={`${crawler.name} avatar`} />;
                  }
                  return null;
                })()}
                <AvatarFallback className="bg-blue-600 text-xs">
                  {(() => {
                    const avatar = getAvatar(crawler.name, crawler.serial);
                    return avatar.textFallback || crawler.name.charAt(0).toUpperCase();
                  })()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {crawler.name} {crawler.serial && `[${crawler.serial}]`}
                </h1>
                <p className="text-slate-400">
                  Level {crawler.level} {crawler.class?.name || "Crawler"} •
                  Floor {crawler.currentFloor}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to={`/crawler/${crawlerId}/loadout`}>
                <Button variant="outline" size="sm">
                  <Package className="h-4 w-4 mr-2" />
                  Loadout
                </Button>
              </Link>
              <div className="text-right">
                <p className="text-sm text-slate-400">Status</p>
                <p className="text-white font-medium capitalize">
                  {crawler.status}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile-First Layout */}
      <div className="w-full px-2 py-4 lg:max-w-7xl lg:mx-auto lg:p-6 pb-20 lg:pb-6">
        {/* Mobile: Single column stack, Desktop: 3 columns with custom sizing */}
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_2fr_2fr] gap-2 lg:gap-6">

          {/* Primary: Tactical View - Always first on mobile */}
          <div className="order-1 lg:order-2 lg:col-span-1" data-section="tactical">
            <CombatViewPanel crawler={crawler} tacticalData={tacticalData} handleRoomMovement={handleRoomMovement} />
          </div>

          {/* Secondary: Status & Quick Info - Condensed on mobile */}
          <div className="order-2 lg:order-1 space-y-4 lg:space-y-6" data-section="status">
            <CrawlerStatusPanel crawler={crawler} />

            {/* Mobile: Compact Floor Info */}
            <div className="lg:hidden">
              <FloorInfoPanel crawlerId={crawlerId} crawler={crawler} />
            </div>
          </div>

          {/* Tertiary: Map & Events - Hidden on mobile by default */}
          <div className="order-3 lg:order-3 space-y-4 lg:space-y-6">
            {/* Desktop: Full panels */}
            <div className="hidden lg:block">
              <FloorInfoPanel crawlerId={crawlerId} crawler={crawler} />
            </div>

            <div className="hidden lg:block">
              <DungeonMap crawler={crawler} scannedRooms={scannedRooms}/>
            </div>

            <div className="hidden lg:block">
              <RoomEventsPanel crawler={crawler} currentRoomData={currentRoomData} />
            </div>

            {/* Mobile: Collapsible sections */}
            <div className="lg:hidden space-y-4">
              <details className="bg-game-surface border border-game-border rounded-lg" data-section="map">
                <summary className="p-4 cursor-pointer text-white font-medium flex items-center justify-between">
                  <span className="flex items-center">
                    <i className="fas fa-map mr-2 text-blue-400"></i>
                    Dungeon Map
                  </span>
                  <i className="fas fa-chevron-down"></i>
                </summary>
                <div className="p-4 pt-0">
                  <DungeonMap crawler={crawler} scannedRooms={scannedRooms}/>
                </div>
              </details>

              <details className="bg-game-surface border border-game-border rounded-lg" data-section="events">
                <summary className="p-4 cursor-pointer text-white font-medium flex items-center justify-between">
                  <span className="flex items-center">
                    <i className="fas fa-history mr-2 text-green-400"></i>
                    Recent Events
                  </span>
                  <i className="fas fa-chevron-down"></i>
                </summary>
                <div className="p-4 pt-0">
                  <RoomEventsPanel crawler={crawler} currentRoomData={currentRoomData}/>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      {/* Global Debug Panel */}
      <DebugPanel activeCrawler={crawler} />
    </div>
  );
}