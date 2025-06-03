import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Users, Activity, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorToast";
import CrawlerSelection from "@/components/crawler-selection";
import SeasonStatus from "@/components/season-status";
import ActivityFeed from "@/components/activity-feed";

import Leaderboard from "@/components/leaderboard";

import CrawlerCard from "@/components/crawler-card";
import DebugPanel from "@/components/debug-panel";
import { useAuth } from "@/hooks/useAuth";
import type { CrawlerWithDetails } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCrawlerSelection, setShowCrawlerSelection] = useState(false);
  const [activeCrawler, setActiveCrawler] = useState<CrawlerWithDetails | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: crawlers, isLoading: crawlersLoading } = useQuery({
    queryKey: ["/api/crawlers"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/activities"],
  });

  const { data: season } = useQuery({
    queryKey: ["/api/season/current"],
  });

  const canCreatePrimary = season && (!user?.primarySponsorshipUsed || 
    user?.lastPrimarySponsorshipSeason !== season.seasonNumber);

  const activeCrawlers = crawlers?.filter((c: CrawlerWithDetails) => c.isAlive) || [];
  const deadCrawlers = crawlers?.filter((c: CrawlerWithDetails) => !c.isAlive) || [];

  // Auto-expand if there's only one active crawler
  useEffect(() => {
    if (activeCrawlers.length === 1 && !activeCrawler) {
      setActiveCrawler(activeCrawlers[0]);
      setIsExpanded(true);
    }
  }, [activeCrawlers, activeCrawler]);

  const createCrawlerMutation = useMutation({
    mutationFn: async (candidate: any) => {
      return apiRequest("POST", "/api/crawlers", {
        name: candidate.name,
        stats: candidate.stats,
        competencies: candidate.competencies,
        background: candidate.background,
        startingEquipment: candidate.startingEquipment
      });
    },
    onSuccess: (newCrawler) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      setShowCrawlerSelection(false);
      toast({
        title: "Crawler Sponsored",
        description: `${newCrawler.name} has been sponsored and is ready for dungeon exploration!`,
      });
    },
    onError: (error) => {
      console.error("Crawler creation error:", error);
      showErrorToast("Sponsorship Failed", error);
    },
  });

  const handleCrawlerSelect = (candidate: any) => {
    createCrawlerMutation.mutate(candidate);
  };

  const handleSetActiveCrawler = (crawler: CrawlerWithDetails) => {
    setActiveCrawler(crawler);
  };



  if (crawlersLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">Loading your crawlers...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-slate-100">
      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* Season Status */}
        <SeasonStatus />
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Crawler Management */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Active Crawlers */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-blue-400 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Active Crawlers ({activeCrawlers.length})
                    </CardTitle>
                    {activeCrawler && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                  {canCreatePrimary && (
                    <Button
                      onClick={() => setShowCrawlerSelection(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Sponsor New Crawler
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {activeCrawlers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-slate-400 mb-4">No active crawlers</div>
                    {canCreatePrimary ? (
                      <Button
                        onClick={() => setShowCrawlerSelection(true)}
                        variant="outline"
                        className="border-green-600/30 text-green-400 hover:bg-green-600/10"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Sponsor Your First Crawler
                      </Button>
                    ) : (
                      <div className="text-sm text-amber-400">
                        Wait for the next season to sponsor a new primary crawler
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeCrawlers.map((crawler: CrawlerWithDetails) => (
                      <div key={crawler.id} onClick={() => handleSetActiveCrawler(crawler)}>
                        <CrawlerCard crawler={crawler} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>



            {/* Dead Crawlers Memorial */}
            {deadCrawlers.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    Fallen Crawlers ({deadCrawlers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {deadCrawlers.map((crawler: CrawlerWithDetails) => (
                      <div key={crawler.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded border border-red-900/20">
                        <div>
                          <div className="font-medium text-slate-300">{crawler.name}</div>
                          <div className="text-sm text-slate-500">
                            Reached Floor {crawler.currentFloor} • Level {crawler.level}
                          </div>
                        </div>
                        <Badge variant="destructive" className="opacity-60">
                          KIA
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

          {/* Right Column - Social & Stats */}
          <div className="space-y-6">
            

            
            {/* Activity Feed */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-purple-400 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityFeed 
                  activities={activities} 
                  isLoading={activitiesLoading} 
                />
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Leaderboard />



          </div>
        </div>



        {/* Crawler Selection Modal */}
        {showCrawlerSelection && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CrawlerSelection
                onSelect={handleCrawlerSelect}
                onCancel={() => setShowCrawlerSelection(false)}
              />
            </div>
          </div>
        )}

      </div>
      
      {/* Global Debug Panel */}
      <DebugPanel activeCrawler={activeCrawler} />
    </div>
  );
}