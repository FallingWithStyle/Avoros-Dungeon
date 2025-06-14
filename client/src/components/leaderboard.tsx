/**
 * File: leaderboard.tsx
 * Responsibility: Display top player rankings and corporation standings
 * Notes: Shows leaderboard with player stats, rankings, and seasonal progress
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, Crown } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  corporation_name: string;
  sponsor_reputation: number;
  active_crawlers: number;
  total_earnings: number;
}

export default function Leaderboard() {
  const { data: leaderboard, isLoading, error } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-yellow-950/30 to-gray-900/50 border-yellow-500/30">
        <CardHeader>
          <CardTitle className="text-yellow-400 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Corporate Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="w-8 h-8 bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !leaderboard) {
    return (
      <Card className="bg-gradient-to-br from-gray-800/30 to-gray-900/50 border-gray-600/30">
        <CardHeader>
          <CardTitle className="text-gray-400 flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Corporate Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">Leaderboard unavailable</p>
        </CardContent>
      </Card>
    );
  }
}