
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import CrawlerStatusPanel from "@/panels/crawler-status-panel";
import FloorInfoPanel from "@/panels/floor-info-panel";
import NavigationPanel from "@/panels/navigation-panel";
import MapPanel from "@/panels/map-panel";
import DebugPanel from "@/components/debug-panel";
import type { CrawlerWithDetails } from "@shared/schema";
import { getAvatarUrl } from "@/lib/avatarUtils.ts";

interface CrawlerViewProps {
  crawlerId: string;
}

export default function CrawlerView({ crawlerId }: CrawlerViewProps) {
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
        <div className="max-w-7xl mx-auto px-6 py-4">
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

      {/* Main Content - 3 Column Layout */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Crawler Status & Equipment */}
          <div className="space-y-6">
            <CrawlerStatusPanel crawler={crawler} />
          </div>

          {/* Middle Column - Room Navigation */}
          <div className="space-y-6">
            <NavigationPanel crawler={crawler} energyDisabled={energyDisabled} />
          </div>

          {/* Right Column - Floor Info & Mini-map */}
          <div className="space-y-6">
            <FloorInfoPanel crawlerId={crawlerId} crawler={crawler} />
            <MapPanel crawler={crawler} />
          </div>
        </div>
      </div>

      {/* Global Debug Panel */}
      <DebugPanel activeCrawler={crawler} />
    </div>
  );
}
