import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap, RotateCcw, Heart, Shield, Map } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorToast";
import type { CrawlerWithDetails } from "@shared/schema";

interface DebugPanelProps {
  activeCrawler?: CrawlerWithDetails;
  onMapModeChange?: (showFullMap: boolean) => void;
}

// Global debug mode flag - set to true for development, false for production
const IS_DEBUG_MODE = true;

// Global energy disabled state - disabled by default for debug mode
let globalEnergyDisabled = true;

// Global map mode state - show full map by default for debugging
let globalShowFullMap = true;

export default function DebugPanel({ activeCrawler, onMapModeChange }: DebugPanelProps) {
  const { toast } = useToast();
  const [energyDisabled, setEnergyDisabled] = useState(globalEnergyDisabled);
  const [showFullMap, setShowFullMap] = useState(globalShowFullMap);

  // Get current room data to show coordinates
  const { data: roomData } = useQuery({
    queryKey: [`/api/crawlers/${activeCrawler?.id}/current-room`],
    enabled: !!activeCrawler,
    retry: false,
  });

  const toggleEnergyUsage = () => {
    const newState = !energyDisabled;
    setEnergyDisabled(newState);
    globalEnergyDisabled = newState;
    toast({
      title: newState ? "Energy Usage Disabled" : "Energy Usage Enabled",
      description: newState ? "Movement will not consume energy" : "Movement will consume energy normally",
    });
  };

  const toggleMapMode = () => {
    const newState = !showFullMap;
    setShowFullMap(newState);
    globalShowFullMap = newState;
    onMapModeChange?.(newState);
    toast({
      title: newState ? "Full Map Revealed" : "Explored Only Mode",
      description: newState ? "Showing all 219 rooms for debugging" : "Showing only explored rooms",
    });
  };

  // Debug crawler reset
  const resetCrawlersMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/debug/reset-crawlers");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      toast({
        title: "Crawlers Reset",
        description: "All crawlers have been reset to their initial state.",
      });
    },
    onError: (error) => {
      showErrorToast("Reset Failed", error);
    },
  });

  // Debug energy restoration
  const restoreEnergyMutation = useMutation({
    mutationFn: async () => {
      if (!activeCrawler) throw new Error("No active crawler");
      return await apiRequest("POST", `/api/crawlers/${activeCrawler.id}/restore-energy`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      toast({
        title: "Energy Restored",
        description: "Crawler energy has been restored to 100%.",
      });
    },
    onError: (error) => {
      showErrorToast("Energy Restore Failed", error);
    },
  });

  // Debug dungeon regeneration
  const regenerateDungeonMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/debug/regenerate-dungeon");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      toast({
        title: "Dungeon Regenerated",
        description: "New dungeon layout with updated room distribution applied.",
      });
    },
    onError: (error) => {
      showErrorToast("Regeneration Failed", error);
    },
  });

  // Debug position reset
  const resetPositionMutation = useMutation({
    mutationFn: async () => {
      if (!activeCrawler) throw new Error("No active crawler");
      return await apiRequest("POST", `/api/crawlers/${activeCrawler.id}/reset-position`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      toast({
        title: "Position Reset",
        description: "Crawler has been moved to the entrance.",
      });
    },
    onError: (error) => {
      showErrorToast("Position Reset Failed", error);
    },
  });

  // Debug heal crawler
  const healMutation = useMutation({
    mutationFn: async () => {
      if (!activeCrawler) throw new Error("No active crawler");
      return await apiRequest("POST", `/api/crawlers/${activeCrawler.id}/debug/heal`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/crawlers/${activeCrawler?.id}`] });
      toast({
        title: "Crawler Healed",
        description: "Health and energy restored to maximum.",
      });
    },
    onError: (error) => {
      showErrorToast("Heal Failed", error);
    },
  });

  // Don't render debug panel if not in debug mode
  if (!IS_DEBUG_MODE) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <Card className="bg-red-900/20 border-red-600/30 rounded-none border-x-0 border-b-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-400 flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            Debug Controls
          </CardTitle>
          <CardDescription className="text-red-300 text-xs">
            Development tools - these will be removed in production
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => resetCrawlersMutation.mutate()}
              disabled={resetCrawlersMutation.isPending}
              variant="destructive"
              size="sm"
              className="bg-red-600 hover:bg-red-700"
            >
              {resetCrawlersMutation.isPending ? (
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-2" />
              )}
              Reset All Crawlers
            </Button>
            
            <Button
              onClick={() => regenerateDungeonMutation.mutate()}
              disabled={regenerateDungeonMutation.isPending}
              variant="outline"
              size="sm"
              className="border-purple-600/30 text-purple-400 hover:bg-purple-600/10"
            >
              {regenerateDungeonMutation.isPending ? (
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-2" />
              )}
              Regenerate Dungeon
            </Button>
            
            <Button
              onClick={toggleEnergyUsage}
              variant="outline"
              size="sm"
              className={`${
                energyDisabled 
                  ? "border-orange-600/30 text-orange-400 hover:bg-orange-600/10" 
                  : "border-gray-600/30 text-gray-400 hover:bg-gray-600/10"
              }`}
            >
              <Shield className="w-3 h-3 mr-2" />
              {energyDisabled ? "Energy Disabled" : "Energy Enabled"}
            </Button>
            
            <Button
              onClick={() => restoreEnergyMutation.mutate()}
              disabled={restoreEnergyMutation.isPending || !activeCrawler}
              variant="outline"
              size="sm"
              className="border-green-600/30 text-green-400 hover:bg-green-600/10"
            >
              {restoreEnergyMutation.isPending ? (
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <Zap className="w-3 h-3 mr-2" />
              )}
              Restore Energy
            </Button>
            
            <Button
              onClick={() => resetPositionMutation.mutate()}
              disabled={resetPositionMutation.isPending || !activeCrawler}
              variant="outline"
              size="sm"
              className="border-blue-600/30 text-blue-400 hover:bg-blue-600/10"
            >
              {resetPositionMutation.isPending ? (
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3 mr-2" />
              )}
              Reset Position
            </Button>
            
            <Button
              onClick={() => healMutation.mutate()}
              disabled={healMutation.isPending || !activeCrawler}
              variant="outline"
              size="sm"
              className="border-green-600/30 text-green-400 hover:bg-green-600/10"
            >
              {healMutation.isPending ? (
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
              ) : (
                <Heart className="w-3 h-3 mr-2" />
              )}
              Heal Crawler
            </Button>
            
            <Button
              onClick={toggleMapMode}
              variant="outline"
              size="sm"
              className={`${
                showFullMap 
                  ? "border-cyan-600/30 text-cyan-400 hover:bg-cyan-600/10" 
                  : "border-gray-600/30 text-gray-400 hover:bg-gray-600/10"
              }`}
            >
              <Map className="w-3 h-3 mr-2" />
              {showFullMap ? "Full Map Revealed" : "Explored Only"}
            </Button>
          </div>
          
          {/* Debug Information */}
          {activeCrawler && (
            <div className="mt-3 pt-3 border-t border-red-600/30">
              <div className="text-xs text-red-300 space-y-1">
                <div>Hidden Luck: {activeCrawler.luck || 0}</div>
                <div>
                  Coordinates: Floor {roomData?.room?.floorId || activeCrawler.currentFloor || 1}, Room {roomData?.room?.x || 0},{roomData?.room?.y || 0}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Function to get current energy disabled state
export const isEnergyDisabled = () => globalEnergyDisabled;

// Function to get current map mode state
export const isFullMapMode = () => globalShowFullMap;

export { IS_DEBUG_MODE };