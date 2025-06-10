/**
 * File: room-navigation.tsx
 * Responsibility: Provides directional movement controls for crawler room navigation
 * Notes: Shows available exits and handles movement between rooms
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { IS_DEBUG_MODE } from "@/components/debug-panel";
import { useDungeonMapMovement } from "@/hooks/useDungeonMapMovement";
import { CrawlerWithDetails } from "@shared/schema";
import {
  MapPin,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Shield,
  Gem,
  Users,
  Zap,
  Map,
} from "lucide-react";

interface RoomNavigationProps {
  crawler: CrawlerWithDetails;
  energyDisabled?: boolean;
}

interface Room {
  id: number;
  name: string;
  description: string;
  type: string;
  environment: string;
  isSafe: boolean;
  hasLoot: boolean;
  x: number;
  y: number;
  factionId?: number | null;
}

interface RoomData {
  room: Room;
  availableDirections: string[];
  playersInRoom: CrawlerWithDetails[];
}

interface Faction {
  id: number;
  name: string;
  color: string;
}

function FactionBadge({
  factionId,
  factions,
}: {
  factionId?: number | null;
  factions: Faction[];
}) {
  // Debug logging. currently disabled. To enable, change to:
  // if (IS_DEBUG_MODE) {
  if (false) {
    console.log(
      "FactionBadge - factionId:",
      factionId,
      "factions count:",
      factions.length,
    );
  }

  const faction = factions.find((f) => f.id === factionId);
  if (!factionId || !faction) {
    return <Badge color="#6B7280">Neutral</Badge>;
  }
  return <Badge color={faction.color || "#6B7280"]}>{faction.name}</Badge>;
}

function EnvironmentBadge({ environment }: { environment: string }) {
  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case "outdoor":
        return "#10B981"; // Green
      case "underground":
        return "#8B5CF6"; // Purple
      case "indoor":
      default:
        return "#6B7280"; // Gray
    }
  };

  return (
    <Badge color={getEnvironmentColor(environment)} className="capitalize">
      {environment}
    </Badge>
  );
}

export default function RoomNavigation({
  crawler,
  energyDisabled = false,
}: RoomNavigationProps) {

  // Fetch current room data with reduced polling
  const { data: roomData, isLoading } = useQuery<RoomData>({
    queryKey: [`/api/crawlers/${crawler.id}/current-room`],
    refetchInterval: 15000, // Reduced from 5s to 10s
    staleTime: 30000, // Cache for 30 seconds
    retry: false,
  });

  // Fetch factions list from backend
  const { data: factions = [], isLoading: isFactionsLoading } = useQuery<
    Faction[]
  >({
    queryKey: ["/api/factions"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/factions");
      if (IS_DEBUG_MODE) {
        console.log("Fetched factions:", result);
      }
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Use the dungeon map movement hook
  const { handleMove, moveMutation, pendingDirection, isMoving } = useDungeonMapMovement({
    crawler,
    availableDirections: roomData?.availableDirections || []
  });

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "north":
        return <ArrowUp className="h-4 w-4" />;
      case "south":
        return <ArrowDown className="h-4 w-4" />;
      case "east":
        return <ArrowRight className="h-4 w-4" />;
      case "west":
        return <ArrowLeft className="h-4 w-4" />;
      case "staircase":
        return <ArrowDown className="h-4 w-4 text-purple-400" />;
      default:
        return null;
    }
  };

  const getDirectionKey = (direction: string) => {
    switch (direction) {
      case "north":
        return "W";
      case "south":
        return "S";
      case "east":
        return "D";
      case "west":
        return "A";
      case "staircase":
        return "Q";
      default:
        return "";
    }
  };

  const getRoomTypeIcon = (room: Room) => {
    if (room.isSafe) return <Shield className="h-4 w-4 text-green-500" />;
    if (room.hasLoot) return <Gem className="h-4 w-4 text-yellow-500" />;
    return <MapPin className="h-4 w-4 text-gray-500" />;
  };

  const getRoomTypeBadge = (room: Room) => {
    if (room.isSafe)
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Safe Room
        </Badge>
      );
    if (room.hasLoot)
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Treasure Room
        </Badge>
      );
    if (room.type === "entrance")
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          Entrance
        </Badge>
      );
    return <Badge variant="outline">Normal Room</Badge>;
  };

  if (isLoading || isFactionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Current Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Loading room data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!roomData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Current Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Room data not available. Your crawler may need to be positioned in a
            room.
          </div>
        </CardContent>
      </Card>
    );
  }

  const { room, availableDirections, playersInRoom } = roomData;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getRoomTypeIcon(room)}
            {room.name}
          </div>
          {IS_DEBUG_MODE && (
            <Badge variant="outline" className="font-mono text-xs">
              ({room.x}, {room.y})
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          {getRoomTypeBadge(room)}
          <EnvironmentBadge environment={room.environment} />
          <FactionBadge factionId={room.factionId} factions={factions} />
          {playersInRoom.length > 1 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {playersInRoom.length} players here
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{room.description}</p>

        {room.isSafe && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-300">
              This is a safe room. You can rest here without fear of encounters.
            </span>
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Available Exits
            <Badge variant="outline" className="text-xs">
              Use WASD keys
            </Badge>
          </h4>

          {availableDirections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No available exits from this room.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {availableDirections.map((direction) => (
                <Button
                  key={direction}
                  variant="outline"
                  size="sm"
                  onClick={() => handleMove(direction)}
                  disabled={moveMutation.isPending || crawler.energy < 10}
                  className="justify-start"
                >
                  {getDirectionIcon(direction)}
                  <span className="capitalize">{direction}</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {getDirectionKey(direction)}
                  </Badge>
                  {pendingDirection === direction && (
                    <div className="ml-2 animate-spin h-3 w-3 border border-gray-300 border-t-gray-600 rounded-full" />
                  )}
                </Button>
              ))}
            </div>
          )}

          {crawler.energy < 10 && (
            <p className="text-xs text-red-600">
              Need at least 10 energy to move
            </p>
          )}
        </div>

        {playersInRoom.length > 1 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Other Players in Room
              </h4>
              <div className="space-y-1">
                {playersInRoom
                  .filter((p) => p.id !== crawler.id)
                  .map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between text-xs p-2 bg-muted rounded"
                    >
                      <span className="font-medium">{player.name}</span>
                      <Badge variant="outline">Level {player.level}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}