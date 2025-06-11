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
import TacticalViewPanel from "@/panels/tactical-view-panel";
import RoomEventsPanel from "@/panels/room-events-panel";
import DungeonMap from "@/components/dungeon-map";
import DebugPanel from "@/components/debug-panel";
import type { CrawlerWithDetails } from "@shared/schema";
import { getAvatarUrl } from "@/lib/avatarUtils.ts";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";
import { getLayoutClasses, shouldShowPanel } from "@/lib/layoutUtils";

interface CrawlerViewProps {
  crawlerId: string;
}

export default function CrawlerView({ crawlerId }: CrawlerViewProps) {
  const { settings } = useLayoutSettings();
  const layoutClasses = getLayoutClasses(settings);

  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [energyDisabled, setEnergyDisabled] = useState(false);

  // Fetch crawler data with more frequent updates
  const { data: crawler, isLoading: crawlerLoading } =
    useQuery<CrawlerWithDetails>({
      queryKey: [`/api/crawlers/${crawlerId}`],
      enabled: !!crawlerId,
      refetchInterval: 3000, // Refresh every 3 seconds
    });

  if (isLoading || crawlerLoading) {
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-crawler mb-4"></i>
          <p className="text-slate-300">Loading crawler interface...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !crawler) {
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <Card className="bg-game-surface border-game-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <i className="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
              <h2 className="text-xl font-bold text-white mb-2">
                Crawler Not Found
              </h2>
              <p className="text-slate-400 mb-4">
                The requested crawler could not be found or you don't have
                access to it.
              </p>
              <div className="text-amber-300/70 text-sm">
                Use the navigation above to return to your corporation overview.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-game-bg text-slate-100">
      {/* Header */}
      <header className="bg-game-surface border-b border-game-border">
        <div className="w-full px-4 py-4 lg:max-w-7xl lg:mx-auto lg:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar image */}
              <img
                src={getAvatarUrl(crawler.name, crawler.serial || crawler.id)}
                alt={`${crawler.name} avatar`}
                className="w-12 h-12 rounded-full border-2 border-game-border bg-gray-800"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {crawler.name}
                </h1>
                <p className="text-slate-400">
                  Level {crawler.level} {crawler.class?.name || "Crawler"} •
                  Floor {crawler.currentFloor}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
        {/* Mobile: Single column stack, Desktop: 3 columns */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-2 lg:gap-6">

          {/* Primary: Tactical View - Always first on mobile */}
          <div className="order-1 lg:order-2 lg:col-span-1" data-section="tactical">
            <TacticalViewPanel crawler={crawler} />
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
              <DungeonMap crawler={crawler} />
            </div>

            <div className="hidden lg:block">
              <RoomEventsPanel crawler={crawler} />
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
                  <DungeonMap crawler={crawler} />
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
                  <RoomEventsPanel crawler={crawler} />
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