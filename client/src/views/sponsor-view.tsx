
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CrawlerSelection from "@/components/crawler-selection";
import ActivityFeed from "@/components/activity-feed";
import Leaderboard from "@/components/leaderboard";
import SeasonStatus from "@/components/season-status";
import type { CrawlerWithDetails } from "@shared/schema";

export default function SponsorView() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedCrawler, setSelectedCrawler] = useState<CrawlerWithDetails | null>(null);

  const { data: crawlers, isLoading: crawlersLoading } = useQuery({
    queryKey: ["/api/crawlers"],
    enabled: !!user,
  });

  if (authLoading || crawlersLoading) {
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-crawler mb-4"></i>
          <p className="text-slate-300">Loading sponsor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-game-bg text-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Crawler Management */}
          <div className="space-y-6">
            <Card className="bg-game-surface border-game-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <i className="fas fa-users mr-2 text-crawler"></i>
                  Crawler Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CrawlerSelection 
                  crawlers={crawlers || []}
                  selectedCrawler={selectedCrawler}
                  onCrawlerSelect={setSelectedCrawler}
                />
              </CardContent>
            </Card>
            
            <SeasonStatus />
          </div>

          {/* Middle Column - Activity Feed */}
          <div>
            <ActivityFeed />
          </div>

          {/* Right Column - Leaderboard */}
          <div>
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}
