import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Zap, RotateCcw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorToast";
import type { CrawlerWithDetails } from "@shared/schema";

interface DebugPanelProps {
  activeCrawler?: CrawlerWithDetails;
}

// Global debug mode flag - set to true for development, false for production
const IS_DEBUG_MODE = true;

export default function DebugPanel({ activeCrawler }: DebugPanelProps) {
  const { toast } = useToast();

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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { IS_DEBUG_MODE };