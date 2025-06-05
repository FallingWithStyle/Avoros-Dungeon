
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CrawlerCard from "@/components/crawler-card";
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
                {crawlers && crawlers.length > 0 ? (
                  <div className="space-y-4">
                    {crawlers.map((crawler) => (
                      <CrawlerCard key={crawler.id} crawler={crawler} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">No active crawlers found.</p>
                    <p className="text-sm text-slate-500">Create a new crawler to begin dungeon exploration.</p>
                  </div>
                )}
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
