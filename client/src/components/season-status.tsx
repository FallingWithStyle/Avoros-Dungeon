/**
 * File: season-status.tsx
 * Responsibility: Displays current game season information and status
 * Notes: Shows season name, description, and any seasonal events or modifiers
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Trophy, Users } from "lucide-react";

export default function SeasonStatus() {
  const { data: season, isLoading } = useQuery({
    queryKey: ["/api/season/current"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="bg-game-surface border-game-border">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-game-border rounded w-1/2"></div>
            <div className="h-3 bg-game-border rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!season) {
    return (
      <Card className="bg-game-surface border-game-border">
        <CardHeader>
          <CardTitle className="text-red-400">Season Unavailable</CardTitle>
          <CardDescription>No active season found. Contact administrators.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canCreatePrimary = user && (!user.primarySponsorshipUsed || user.lastPrimarySponsorshipSeason < season.seasonNumber);

  return (
    <Card className="bg-game-surface border-game-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Season {season.seasonNumber}: {season.name}
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              {season.description}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30">
            <Clock className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-200">Primary Sponsorship</h4>
            <div className="flex items-center gap-2">
              {canCreatePrimary ? (
                <Badge variant="outline" className="border-green-600/30 text-green-400">
                  Available
                </Badge>
              ) : (
                <Badge variant="outline" className="border-red-600/30 text-red-400">
                  Used This Season
                </Badge>
              )}
              <span className="text-sm text-slate-400">
                Full control, one per season
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-200">Secondary Sponsorships</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-blue-600/30 text-blue-400">
                <Users className="w-3 h-3 mr-1" />
                Always Available
              </Badge>
              <span className="text-sm text-slate-400">
                Limited control, multiple allowed
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}