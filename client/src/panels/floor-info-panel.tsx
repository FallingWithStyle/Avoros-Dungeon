/**
 * File: floor-info-panel.tsx
 * Responsibility: Displays current dungeon floor information and statistics
 * Notes: Shows floor number, explored rooms count, and other floor-specific data
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, MapPin, Users, Eye } from "lucide-react";
import type { CrawlerWithDetails } from "@shared/schema";
import {
  Building,
  Users,
  Skull,
  Eye,
  MapPin,
  Shield,
  Sword,
  Zap,
} from "lucide-react";
import MapPanel from "./map-panel";

interface FloorInfoPanelProps {
  crawlerId: string;
  crawler: CrawlerWithDetails;
}

export default function FloorInfoPanel({ crawlerId, crawler }: FloorInfoPanelProps) {
  // Fetch explored rooms to get factions and creatures encountered
  const { data: exploredRooms } = useQuery({
    queryKey: [`/api/crawlers/${crawlerId}/explored-rooms`],
    enabled: !!crawlerId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch factions data
  const { data: factions } = useQuery({
    queryKey: ["/api/factions"],
    enabled: !!crawlerId,
  });

  return (
    <div className="space-y-4">
      <Card className="bg-game-surface border-game-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Building className="w-4 h-4 mr-2 text-cyan-400" />
            Floor {crawler.currentFloor} Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-300">Current Floor</span>
              <span className="text-red-400 font-medium">
                Floor {crawler.currentFloor}
              </span>
            </div>

            {/* Factions Encountered */}
            <div>
              <span className="text-slate-300 text-xs font-medium">Factions Encountered</span>
              <div className="mt-1 space-y-1">
                {(() => {
                  // Get unique faction IDs from explored rooms
                  const factionIds = new Set(
                    exploredRooms?.filter(room => room.factionId).map(room => room.factionId) || []
                  );

                  if (factionIds.size === 0) {
                    return (
                      <div className="text-xs text-slate-500 italic">
                        No factions encountered yet
                      </div>
                    );
                  }

                  return Array.from(factionIds).map(factionId => {
                    const faction = factions?.find(f => f.id === factionId);
                    return faction ? (
                      <div key={factionId} className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: faction.color }}
                        />
                        <span className="text-xs text-slate-300">{faction.name}</span>
                      </div>
                    ) : null;
                  });
                })()}
              </div>
            </div>

            {/* Creatures Encountered */}
            <div>
              <span className="text-slate-300 text-xs font-medium">Creatures Encountered</span>
              <div className="mt-1 space-y-1">
                {(() => {
                  // Get unique creature types from explored rooms
                  const creatureTypes = new Set(
                    exploredRooms?.filter(room => room.encounterType && room.encounterType !== 'none')
                      .map(room => room.encounterType) || []
                  );

                  if (creatureTypes.size === 0) {
                    return (
                      <div className="text-xs text-slate-500 italic">
                        No creatures encountered yet
                      </div>
                    );
                  }

                  return Array.from(creatureTypes).map(creatureType => (
                    <div key={creatureType} className="flex items-center gap-2">
                      <span className="text-xs text-orange-400">•</span>
                      <span className="text-xs text-slate-300 capitalize">
                        {creatureType?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="pt-2 border-t border-game-border">
              <p className="text-xs text-slate-400">
                Explore more rooms to discover new factions and creatures.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}