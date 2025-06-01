import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import MiniMap from "@/components/mini-map-new";
import RoomNavigation from "@/components/room-navigation";
import DebugPanel from "@/components/debug-panel";
import type { CrawlerWithDetails } from "@shared/schema";

interface CrawlerModeProps {
  crawlerId: string;
}

export default function CrawlerMode({ crawlerId }: CrawlerModeProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [energyDisabled, setEnergyDisabled] = useState(false);

  // Fetch crawler data with more frequent updates
  const { data: crawler, isLoading: crawlerLoading } = useQuery<CrawlerWithDetails>({
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
              <h2 className="text-xl font-bold text-white mb-2">Crawler Not Found</h2>
              <p className="text-slate-400 mb-4">
                The requested crawler could not be found or you don't have access to it.
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

  const healthPercent = (crawler.health / crawler.maxHealth) * 100;
  const energyPercent = (crawler.energy / crawler.maxEnergy) * 100;

  return (
    <div className="min-h-screen bg-game-bg text-slate-100">
      {/* Header */}
      <header className="bg-game-surface border-b border-game-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <i className="fas fa-user-ninja text-3xl text-crawler"></i>
              <div>
                <h1 className="text-2xl font-bold text-white">{crawler.name}</h1>
                <p className="text-slate-400">
                  Level {crawler.level} {crawler.class?.name || 'Crawler'} • Floor {crawler.currentFloor}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-slate-400">Status</p>
                <p className="text-white font-medium capitalize">{crawler.status}</p>
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
            {/* Crawler Status */}
            <Card className="bg-game-surface border-game-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <i className="fas fa-heart mr-2 text-red-400"></i>
                  Crawler Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Health Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">Health</span>
                    <span className="text-white">{crawler.health}/{crawler.maxHealth}</span>
                  </div>
                  <Progress value={healthPercent} className="h-2" />
                </div>

                {/* Energy Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">Energy</span>
                    <span className="text-white">{crawler.energy}/{crawler.maxEnergy}</span>
                  </div>
                  <Progress value={energyPercent} className="h-2" />
                </div>

                {/* Stats */}
                <div className="space-y-2 pt-2 border-t border-game-border">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">Attack</span>
                    <span className="text-sm font-mono text-red-400">{crawler.attack}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">Defense</span>
                    <span className="text-sm font-mono text-blue-400">{crawler.defense}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">Speed</span>
                    <span className="text-sm font-mono text-green-400">{crawler.speed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">Wit</span>
                    <span className="text-sm font-mono text-purple-400">{crawler.wit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">Charisma</span>
                    <span className="text-sm font-mono text-pink-400">{crawler.charisma}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">Memory</span>
                    <span className="text-sm font-mono text-cyan-400">{crawler.memory}</span>
                  </div>
                </div>

                {/* Progress Info */}
                <div className="pt-2 border-t border-game-border">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">Experience</span>
                    <span className="text-sm font-mono text-yellow-400">{crawler.experience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">Credits</span>
                    <span className="text-sm font-mono text-green-400">{crawler.credits}</span>
                  </div>
                </div>

                {/* Action Buttons - Removed Return button as header navigation handles this */}
                <div className="pt-4 border-t border-game-border">
                  <div className="text-center text-amber-300/50 text-sm">
                    Use the header navigation to switch between pages
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Equipment */}
            <Card className="bg-game-surface border-game-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <i className="fas fa-shield-alt mr-2 text-green-400"></i>
                  Equipment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-slate-400 py-8">
                  <i className="fas fa-box-open text-3xl mb-2"></i>
                  <p className="text-sm">No equipment equipped</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Room Navigation */}
          <div className="space-y-6">
            <RoomNavigation crawler={crawler} energyDisabled={energyDisabled} />
          </div>

          {/* Right Column - Floor Info & Mini-map */}
          <div className="space-y-6">
            {/* Floor Info */}
            <Card className="bg-game-surface border-game-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <i className="fas fa-info-circle mr-2 text-blue-400"></i>
                  Floor Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Current Floor</span>
                    <span className="text-red-400 font-medium">Floor {crawler.currentFloor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Difficulty</span>
                    <span className="text-red-400 font-medium">Level {crawler.currentFloor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Threat Level</span>
                    <span className="text-yellow-400 font-medium">
                      {crawler.currentFloor < 10 ? 'Low' : 
                       crawler.currentFloor < 25 ? 'Medium' : 
                       crawler.currentFloor < 50 ? 'High' : 'Extreme'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-game-border">
                    <p className="text-xs text-slate-400">
                      The deeper you go, the greater the rewards... and the deadlier the enemies.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mini-map */}
            <Card className="bg-game-surface border-game-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <i className="fas fa-map mr-2 text-green-400"></i>
                  Mini-Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniMap crawler={crawler} />
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
      
      {/* Global Debug Panel */}
      <DebugPanel activeCrawler={crawler} />
    </div>
  );
}