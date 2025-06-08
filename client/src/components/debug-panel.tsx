import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wrench,
  Zap,
  RefreshCw,
  RotateCcw,
  Heart,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorToast";
import { getVersionInfo } from "@/lib/version";
import type { CrawlerWithDetails } from "@shared/schema";

interface DebugPanelProps {
  activeCrawler?: CrawlerWithDetails;
}

// Global debug mode flag - set to true for development, false for production
const IS_DEBUG_MODE = true;

// Global energy disabled state - disabled by default for debug mode
let globalEnergyDisabled = true;

function formatTimestamp(): string {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

export default function DebugPanel({ activeCrawler }: DebugPanelProps) {
  const { toast } = useToast();
  const [energyDisabled, setEnergyDisabled] = useState(globalEnergyDisabled);
  const [minimized, setMinimized] = useState(() => {
    // Load minimized state from localStorage, default to false
    const saved = localStorage.getItem('debug-panel-minimized');
    return saved ? JSON.parse(saved) : false;
  });

  // Get current room data to show coordinates
  const { data: roomData } = useQuery({
    queryKey: [`/api/crawlers/${activeCrawler?.id}/current-room`],
    enabled: !!activeCrawler,
    retry: false,
  });

  const toggleMinimized = () => {
    const newState = !minimized;
    setMinimized(newState);
    localStorage.setItem('debug-panel-minimized', JSON.stringify(newState));
  };

  const toggleEnergyUsage = () => {
    const newState = !energyDisabled;
    setEnergyDisabled(newState);
    globalEnergyDisabled = newState;
    toast({
      title: newState ? "Energy Usage Disabled" : "Energy Usage Enabled",
      description: newState
        ? "Movement will not consume energy"
        : "Movement will consume energy normally",
    });
  };

  // Debug crawler deletion
  const resetCrawlersMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/debug/delete-crawlers");
    },
    onSuccess: (data) => {
      // Invalidate all crawler-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/season/current"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/leaderboards/crawlers"],
      });

      // Clear any specific crawler queries
      queryClient.removeQueries({ queryKey: ["/api/crawlers/"], exact: false });

      toast({
        title: "Crawlers Deleted",
        description:
          data.message || "All crawlers have been permanently deleted.",
      });

      // Navigate back to sponsor screen
      window.location.href = "/";
    },
    onError: (error) => {
      showErrorToast("Delete Failed", error);
    },
  });

  // Debug energy restoration
  const restoreEnergyMutation = useMutation({
    mutationFn: async () => {
      if (!activeCrawler) throw new Error("No active crawler");
      return await apiRequest(
        "POST",
        `/api/crawlers/${activeCrawler.id}/restore-energy`,
      );
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

  // Debug position reset
  const resetPositionMutation = useMutation({
    mutationFn: async () => {
      if (!activeCrawler) throw new Error("No active crawler");
      return await apiRequest(
        "POST",
        `/api/crawlers/${activeCrawler.id}/reset-position`,
      );
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
      return await apiRequest(
        "POST",
        `/api/crawlers/${activeCrawler.id}/debug/heal`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/crawlers/${activeCrawler?.id}`],
      });
      toast({
        title: "Crawler Healed",
        description: "Health and energy restored to maximum.",
      });
    },
    onError: (error) => {
      showErrorToast("Heal Failed", error);
    },
  });

  // Apply Eyes of D'Bug spell
  const applyEyesOfDebug = async () => {
    if (!activeCrawler) return;

    try {
      const result = await apiRequest(
        "POST",
        `/api/crawlers/${activeCrawler.id}/apply-effect/eyes_of_debug`,
      );

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
        queryClient.invalidateQueries({
          queryKey: [`/api/crawlers/${activeCrawler.id}`],
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/crawlers/${activeCrawler.id}/explored-rooms`],
        });

        toast({
          title: "Eyes of D'Bug Active",
          description:
            "Scan range increased by 100 for 10 minutes! Debug power unleashed!",
        });
      } else {
        toast({
          title: "Cannot Cast Eyes of D'Bug",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      showErrorToast("Debug Spell Failed", error);
    }
  };

  // Spawn hostile mob
  const spawnHostileMob = async () => {
    if (!activeCrawler) return;

    try {
      const result = await apiRequest(
        "POST",
        `/api/debug/spawn-mob/${activeCrawler.id}`,
      );

      if (result.success) {
        queryClient.invalidateQueries({
          queryKey: [`/api/crawlers/${activeCrawler.id}/current-room`],
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/crawlers/${activeCrawler.id}/tactical-view`],
        });

        toast({
          title: "Hostile Mob Spawned",
          description: `${result.mobName} has appeared in your room!`,
        });
      } else {
        toast({
          title: "Cannot Spawn Mob",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      showErrorToast("Spawn Mob Failed", error);
    }
  };

  // Don't render debug panel if not in debug mode
  if (!IS_DEBUG_MODE) {
    return null;
  }

  // Button and text styles for "mini" buttons
  const miniButtonClasses =
    "h-7 px-2 py-1 text-[0.65rem] rounded border border-opacity-30 flex items-center gap-1";
  const miniIconClasses = "w-3 h-3 mr-1";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <Card className="bg-red-900/20 border-red-600/30 rounded-none border-x-0 border-b-0 shadow-md">
        <CardHeader className="p-2 pb-1">
          {/* Show different content based on minimized state */}
          {minimized ? (
            /* Collapsed: Single line with all info */
            <div className="text-[0.60rem] text-red-300 font-mono flex items-center gap-1">
              <span>
                {getVersionInfo().displayVersion} (
                {getVersionInfo().buildTime.split("T")[0]})
              </span>
              <Wrench className="w-3 h-3 text-red-400" />
              <span>Debug Controls</span>
              <span>
                Floor{" "}
                {roomData?.room?.floorId || activeCrawler?.currentFloor || 1},
                Room {roomData?.room?.x ?? 0},{roomData?.room?.y ?? 0}
              </span>
              <span className="text-red-400">|</span>
              <span>ID: {activeCrawler?.id ?? "N/A"}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleMinimized}
                aria-label="Expand Debug Panel"
                className="text-red-200 hover:bg-red-900/30 p-1 h-4 w-4 ml-auto"
              >
                <ChevronUp className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            /* Expanded: Version at top, then title row */
            <>
              {/* Version and build date at top-left */}
              <div className="text-red-300 text-[0.60rem] font-mono mb-1">
                {getVersionInfo().displayVersion} (
                {getVersionInfo().buildTime.split("T")[0]})
              </div>

              <div className="flex flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-2">
                  <CardTitle className="text-red-400 flex items-center gap-1 text-xs">
                    <Wrench className="w-3 h-3" />
                    Debug Controls
                  </CardTitle>
                  <CardDescription className="text-red-300 text-[0.60rem]">
                    Development tools - these will be removed in production
                  </CardDescription>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMinimized}
                  aria-label="Minimize Debug Panel"
                  className="text-red-200 hover:bg-red-900/30 p-1 h-6 w-6"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </div>
            </>
          )}
        </CardHeader>
        {!minimized && (
          <CardContent className="p-2 pt-0">
            {/* Button Row */}
            <div className="flex gap-1 flex-wrap mb-1">
              <Button
                onClick={() => resetCrawlersMutation.mutate()}
                disabled={resetCrawlersMutation.isPending}
                variant="destructive"
                className={
                  miniButtonClasses +
                  " bg-red-600 hover:bg-red-700 border-red-600"
                }
              >
                {resetCrawlersMutation.isPending ? (
                  <RefreshCw className={miniIconClasses + " animate-spin"} />
                ) : (
                  <RefreshCw className={miniIconClasses} />
                )}
                Delete All Crawlers
              </Button>

              <Button
                onClick={toggleEnergyUsage}
                variant="outline"
                className={
                  miniButtonClasses +
                  " " +
                  (energyDisabled
                    ? "border-orange-600 text-orange-400 hover:bg-orange-600/10"
                    : "border-gray-600 text-gray-400 hover:bg-gray-600/10")
                }
              >
                <Shield className={miniIconClasses} />
                {energyDisabled ? "Energy Disabled" : "Energy Enabled"}
              </Button>

              {/* Eyes of D'Bug Spell */}
              <Button
                onClick={() => applyEyesOfDebug()}
                disabled={!activeCrawler}
                variant="outline"
                className={
                  miniButtonClasses +
                  " border-purple-600 text-purple-400 hover:bg-purple-600/10"
                }
              >
                <Zap className={miniIconClasses} />
                Enhanced Scan
              </Button>

              {/* Spawn Hostile Mob */}
              <Button
                onClick={() => spawnHostileMob()}
                disabled={!activeCrawler}
                variant="outline"
                className={
                  miniButtonClasses +
                  " border-red-600 text-red-400 hover:bg-red-600/10"
                }
              >
                <Wrench className={miniIconClasses} />
                Spawn Mob
              </Button>

              {/* Move Reset Position here, next to Energy */}
              <Button
                onClick={() => resetPositionMutation.mutate()}
                disabled={resetPositionMutation.isPending || !activeCrawler}
                variant="outline"
                className={
                  miniButtonClasses +
                  " border-blue-600 text-blue-400 hover:bg-blue-600/10"
                }
              >
                {resetPositionMutation.isPending ? (
                  <Wrench className={miniIconClasses + " animate-spin"} />
                ) : (
                  <RotateCcw className={miniIconClasses} />
                )}
                Reset Position
              </Button>

              {/* Now Heal and Restore are together */}
              <Button
                onClick={() => healMutation.mutate()}
                disabled={healMutation.isPending || !activeCrawler}
                variant="outline"
                className={
                  miniButtonClasses +
                  " border-green-600 text-green-400 hover:bg-green-600/10"
                }
              >
                {healMutation.isPending ? (
                  <Wrench className={miniIconClasses + " animate-spin"} />
                ) : (
                  <Heart className={miniIconClasses} />
                )}
                Heal Crawler
              </Button>
              <Button
                onClick={() => restoreEnergyMutation.mutate()}
                disabled={restoreEnergyMutation.isPending || !activeCrawler}
                variant="outline"
                className={
                  miniButtonClasses +
                  " border-green-600 text-green-400 hover:bg-green-600/10"
                }
              >
                {restoreEnergyMutation.isPending ? (
                  <Wrench className={miniIconClasses + " animate-spin"} />
                ) : (
                  <Zap className={miniIconClasses} />
                )}
                Restore Energy
              </Button>
            </div>
            {/* Debug Info - all on one line, pipe-separated */}
            <div className="text-[0.65rem] text-red-300 flex flex-row items-center gap-1">
              <span>
                Coordinates: Floor{" "}
                {roomData?.room?.floorId || activeCrawler?.currentFloor || 1},
                Room {roomData?.room?.x ?? 0},{roomData?.room?.y ?? 0}
              </span>
              <span className="text-red-400">|</span>
              <span>Crawler ID: {activeCrawler?.id ?? "N/A"}</span>
              <span className="text-red-400">|</span>
              <span>Luck: {activeCrawler?.luck ?? 0}</span>
              <span className="text-red-400">|</span>
              <span>Scan: {activeCrawler?.scanRange ?? 0}</span>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Function to get current energy disabled state
export const isEnergyDisabled = () => globalEnergyDisabled;

export { IS_DEBUG_MODE };