import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import MiniMap from "@/components/mini-map";
import type { CrawlerWithDetails, Encounter } from "@shared/schema";

interface CrawlerModeProps {
  crawlerId: string;
}

export default function CrawlerMode({ crawlerId }: CrawlerModeProps) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [gameLog, setGameLog] = useState<string[]>([]);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: crawler, isLoading: crawlerLoading } = useQuery<CrawlerWithDetails>({
    queryKey: ["/api/crawlers", crawlerId],
    enabled: isAuthenticated && !!crawlerId,
  });

  const exploreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/crawlers/${crawlerId}/explore`);
      return response.json();
    },
    onSuccess: (encounter: Encounter) => {
      const message = encounter.encounterType === 'combat' 
        ? `${crawler?.name} encountered an enemy!` 
        : `${crawler?.name} explores the current floor...`;
      
      setGameLog(prev => [...prev, message]);
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers", crawlerId] });
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
        title: "Error",
        description: "Failed to explore. Please try again.",
        variant: "destructive",
      });
    },
  });

  const advanceFloorMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/crawlers/${crawlerId}/advance-floor`);
    },
    onSuccess: () => {
      setGameLog(prev => [...prev, `${crawler?.name} advances to the next floor!`]);
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers", crawlerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
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
        title: "Error",
        description: "Failed to advance floor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExplore = () => {
    exploreMutation.mutate();
  };

  const handleAdvanceFloor = () => {
    advanceFloorMutation.mutate();
  };

  const handleReturnToSponsor = () => {
    setLocation("/");
  };

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

  if (!crawler.isAlive) {
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <Card className="bg-game-surface border-game-border">
          <CardContent className="pt-6">
            <div className="text-center">
              <i className="fas fa-skull text-4xl text-red-400 mb-4"></i>
              <h2 className="text-xl font-bold text-white mb-2">{crawler.name} is Dead</h2>
              <p className="text-slate-400 mb-4">
                This crawler has fallen in the dungeon depths. Their journey has ended.
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

  return (
    <div className="min-h-screen bg-game-bg text-slate-100">
      {/* Header */}
      <header className="bg-game-surface border-b border-game-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleReturnToSponsor}
                className="text-slate-300 hover:text-white"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Return to Command
              </Button>
              <div className="border-l border-game-border pl-4">
                <h1 className="text-xl font-bold text-crawler">{crawler.name}</h1>
                <p className="text-sm text-slate-400">{crawler.class.name} • Floor {crawler.currentFloor}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-slate-300">Credits</div>
                <div className="text-lg font-mono text-green-400">{crawler.credits.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Crawler Stats */}
          <div className="lg:col-span-1">
            <Card className="bg-game-surface border-game-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <i className="fas fa-user-ninja mr-2 text-crawler"></i>
                  Crawler Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">Health</span>
                    <span className="text-white">{crawler.health}/{crawler.maxHealth}</span>
                  </div>
                  <Progress 
                    value={healthPercent} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
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
                    <span className="text-sm text-slate-300">Tech</span>
                    <span className="text-sm font-mono text-purple-400">{crawler.tech}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-game-border">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">Experience</span>
                    <span className="text-sm font-mono text-yellow-400">{crawler.experience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-300">Status</span>
                    <span className={`text-sm font-medium ${
                      crawler.status === 'active' ? 'text-green-400' : 
                      crawler.status === 'resting' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {crawler.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Game Interface */}
          <div className="lg:col-span-2">
            <Card className="bg-game-surface border-game-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <i className="fas fa-dungeon mr-2 text-blue-400"></i>
                  Floor {crawler.currentFloor} - The Depths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Game Log */}
                <div className="bg-game-bg rounded-lg p-4 h-64 overflow-y-auto mb-4 border border-game-border">
                  <div className="space-y-2 font-mono text-sm">
                    <div className="text-blue-400">
                      {'>>>'} {crawler.name} stands ready on Floor {crawler.currentFloor}
                    </div>
                    <div className="text-slate-300">
                      The shadows whisper of dangers ahead. What will you do?
                    </div>
                    {gameLog.map((entry, index) => (
                      <div key={index} className="text-green-400">
                        {'>>>'} {entry}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={handleExplore}
                    disabled={exploreMutation.isPending || crawler.status !== 'active'}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {exploreMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Exploring...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-search mr-2"></i>
                        Explore
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleAdvanceFloor}
                    disabled={advanceFloorMutation.isPending || crawler.status !== 'active'}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {advanceFloorMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Advancing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-arrow-down mr-2"></i>
                        Next Floor
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Button
                    variant="outline"
                    className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                  >
                    <i className="fas fa-medkit mr-2"></i>
                    Rest & Heal
                  </Button>

                  <Button
                    variant="outline"
                    className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                  >
                    <i className="fas fa-backpack mr-2"></i>
                    Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equipment & Info */}
          <div className="lg:col-span-1">
            <Card className="bg-game-surface border-game-border">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <i className="fas fa-shield-alt mr-2 text-green-400"></i>
                  Equipment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center text-slate-400 py-8">
                    <i className="fas fa-box-open text-3xl mb-2"></i>
                    <p className="text-sm">No equipment equipped</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-game-surface border-game-border mt-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <i className="fas fa-info-circle mr-2 text-blue-400"></i>
                  Floor Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
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
          </div>
        </div>
      </div>
    </div>
  );
}
