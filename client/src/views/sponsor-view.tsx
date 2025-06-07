import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CrawlerCard from "@/components/crawler-card";
import CrawlerSelection from "@/components/crawler-selection";
import ActivityFeed from "@/components/activity-feed";
import Leaderboard from "@/components/leaderboard";
import SeasonStatus from "@/components/season-status";
import DebugPanel from "@/components/debug-panel";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorToast";
import type { CrawlerWithDetails } from "@shared/schema";

export default function SponsorView() {
  const { user, isLoading: authLoading } = useAuth();
  const [selectedCrawler, setSelectedCrawler] = useState<CrawlerWithDetails | null>(null);
  const [showCrawlerSelection, setShowCrawlerSelection] = useState(false);
  const { toast } = useToast();

  const { data: crawlers, isLoading: crawlersLoading } = useQuery({
    queryKey: ["/api/crawlers"],
    enabled: !!user,
  });

  // Auto-select the first crawler for debug panel if none selected
  const activeCrawler = selectedCrawler || (crawlers && crawlers.length > 0 ? crawlers[0] : null);

  // Mutation for creating a new crawler
  const createCrawlerMutation = useMutation({
    mutationFn: async (candidateData: any) => {
      return await apiRequest("POST", "/api/crawlers", {
        name: candidateData.name,
        serial: candidateData.serial,
        stats: candidateData.stats,
        competencies: candidateData.competencies,
        background: candidateData.background,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      setShowCrawlerSelection(false);
      toast({
        title: "Crawler Created",
        description: "Your new crawler has entered the dungeon!",
      });
    },
    onError: (error) => {
      showErrorToast("Failed to Create Crawler", error);
    },
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
                    <p className="text-sm text-slate-500 mb-6">Create a new crawler to begin dungeon exploration.</p>
                    <Button 
                      onClick={() => setShowCrawlerSelection(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Choose Your Crawler
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Activity Feed */}
          <div>
            <ActivityFeed />
          </div>

          {/* Right Column - Season Status & Leaderboard */}
          <div className="space-y-6">
            <SeasonStatus />
            <Leaderboard />
          </div>
        </div>
      </div>

      {/* Crawler Selection Dialog */}
      <Dialog open={showCrawlerSelection} onOpenChange={setShowCrawlerSelection}>
        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] bg-game-surface border-game-border">
          <CrawlerSelection
            onSelect={(candidate) => createCrawlerMutation.mutate(candidate)}
            onCancel={() => setShowCrawlerSelection(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Debug Panel */}
      <DebugPanel activeCrawler={activeCrawler} />
    </div>
  );
}