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
import type { CrawlerWithDetails } from "@shared/schema";

interface CrawlerModeProps {
  crawlerId: string;
}

export default function CrawlerMode({ crawlerId }: CrawlerModeProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showDebug, setShowDebug] = useState(false);
  const [energyDisabled, setEnergyDisabled] = useState(false);

  // Fetch crawler data with more frequent updates
  const { data: crawler, isLoading: crawlerLoading } = useQuery<CrawlerWithDetails>({
    queryKey: [`/api/crawlers/${crawlerId}`],
    enabled: !!crawlerId,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const handleReturnToSponsor = () => {
    setLocation("/");
  };

  // Debug mutations
  const healMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/crawlers/${crawlerId}/debug/heal`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crawlers/${crawlerId}`] });
      toast({
        title: "Debug: Crawler Healed",
        description: "Health and energy restored to maximum.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Debug Error",
        description: "Failed to heal crawler.",
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/crawlers/${crawlerId}/debug/reset`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crawlers/${crawlerId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/crawlers/${crawlerId}/current-room`] });
      queryClient.invalidateQueries({ queryKey: [`/api/crawlers/${crawlerId}/explored-rooms`] });
      toast({
        title: "Debug: Crawler Reset",
        description: "Crawler returned to entrance room with full health/energy.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Debug Error",
        description: "Failed to reset crawler.",
        variant: "destructive",
      });
    },
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
              <Button onClick={handleReturnToSponsor} className="bg-blue-600 hover:bg-blue-700">
                Return to Command Center
              </Button>
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

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-game-border">
                  <Button
                    variant="outline"
                    onClick={handleReturnToSponsor}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Return
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDebug(!showDebug)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <i className="fas fa-bug mr-2"></i>
                    Debug
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Debug Panel */}
            {showDebug && (
              <Card className="bg-game-surface border-game-border border-orange-500/50">
                <CardHeader>
                  <CardTitle className="text-orange-400 flex items-center">
                    <i className="fas fa-bug mr-2"></i>
                    Debug Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Energy Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">Disable Energy Usage</p>
                      <p className="text-xs text-slate-400">Move without consuming energy</p>
                    </div>
                    <Switch
                      checked={energyDisabled}
                      onCheckedChange={setEnergyDisabled}
                    />
                  </div>
                  
                  <Separator className="bg-slate-600" />
                  
                  {/* Debug Actions */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => healMutation.mutate()}
                      disabled={healMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="w-full border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                    >
                      {healMutation.isPending ? (
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                      ) : (
                        <i className="fas fa-heart mr-2"></i>
                      )}
                      Restore Health/Energy
                    </Button>
                    
                    <Button
                      onClick={() => resetMutation.mutate()}
                      disabled={resetMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="w-full border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                    >
                      {resetMutation.isPending ? (
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                      ) : (
                        <i className="fas fa-undo mr-2"></i>
                      )}
                      Reset to Entrance
                    </Button>
                  </div>
                  
                  {energyDisabled && (
                    <div className="p-2 bg-orange-900/30 border border-orange-600/30 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-orange-500 text-orange-400">
                          <i className="fas fa-exclamation-triangle mr-1"></i>
                          DEBUG MODE
                        </Badge>
                      </div>
                      <p className="text-xs text-orange-300 mt-1">Energy usage disabled</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
            <RoomNavigation crawler={crawler} />
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
    </div>
  );
}