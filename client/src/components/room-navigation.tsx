import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { isEnergyDisabled } from "@/components/debug-panel";
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
  Map
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
  isSafe: boolean;
  hasLoot: boolean;
  x: number;
  y: number;
}

interface RoomData {
  room: Room;
  availableDirections: string[];
  playersInRoom: CrawlerWithDetails[];
}

export default function RoomNavigation({ crawler, energyDisabled = false }: RoomNavigationProps) {
  const { toast } = useToast();
  const [pendingDirection, setPendingDirection] = useState<string | null>(null);
  const [showCoordinates, setShowCoordinates] = useState(false);

  // Fetch current room data
  const { data: roomData, isLoading } = useQuery<RoomData>({
    queryKey: [`/api/crawlers/${crawler.id}/current-room`],
    refetchInterval: 5000, // Refresh every 5 seconds to see other players
    retry: false,
  });

  // Movement mutation
  const moveMutation = useMutation({
    mutationFn: async (direction: string) => {
      return await apiRequest("POST", `/api/crawlers/${crawler.id}/move`, { 
        direction,
        debugEnergyDisabled: energyDisabled 
      });
    },
    onSuccess: () => {
      // Refresh room data and mini-map
      queryClient.invalidateQueries({ queryKey: [`/api/crawlers/${crawler.id}/current-room`] });
      queryClient.invalidateQueries({ queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`] });
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      setPendingDirection(null);
      toast({
        title: "Moved successfully",
        description: "You have entered a new room.",
      });
    },
    onError: (error) => {
      setPendingDirection(null);
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
        title: "Movement failed",
        description: error.message || "Could not move in that direction.",
        variant: "destructive",
      });
    },
  });

  // Handle movement
  const handleMove = useCallback((direction: string) => {
    if (moveMutation.isPending || !roomData?.availableDirections.includes(direction)) {
      return;
    }
    
    // Check energy (unless disabled for debug)
    if (!energyDisabled && crawler.energy < 10) {
      toast({
        title: "Not enough energy",
        description: "You need at least 10 energy to move between rooms.",
        variant: "destructive",
      });
      return;
    }

    setPendingDirection(direction);
    moveMutation.mutate(direction);
  }, [moveMutation, roomData, crawler.energy, toast]);

  // Keyboard controls (WASD)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle if no input is focused
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = event.key.toLowerCase();
      let direction: string | null = null;

      switch (key) {
        case 'w':
          direction = 'north';
          break;
        case 's':
          direction = 'south';
          break;
        case 'a':
          direction = 'west';
          break;
        case 'd':
          direction = 'east';
          break;
        default:
          return;
      }

      event.preventDefault();
      if (direction) {
        handleMove(direction);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleMove]);

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'north': return <ArrowUp className="h-4 w-4" />;
      case 'south': return <ArrowDown className="h-4 w-4" />;
      case 'east': return <ArrowRight className="h-4 w-4" />;
      case 'west': return <ArrowLeft className="h-4 w-4" />;
      default: return null;
    }
  };

  const getDirectionKey = (direction: string) => {
    switch (direction) {
      case 'north': return 'W';
      case 'south': return 'S';
      case 'east': return 'D';
      case 'west': return 'A';
      default: return '';
    }
  };

  const getRoomTypeIcon = (room: Room) => {
    if (room.isSafe) return <Shield className="h-4 w-4 text-green-500" />;
    if (room.hasLoot) return <Gem className="h-4 w-4 text-yellow-500" />;
    return <MapPin className="h-4 w-4 text-gray-500" />;
  };

  const getRoomTypeBadge = (room: Room) => {
    if (room.isSafe) return <Badge variant="secondary" className="bg-green-100 text-green-800">Safe Room</Badge>;
    if (room.hasLoot) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Treasure Room</Badge>;
    if (room.type === 'entrance') return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Entrance</Badge>;
    return <Badge variant="outline">Normal Room</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Current Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading room data...</div>
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
            Room data not available. Your crawler may need to be positioned in a room.
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Map className="h-4 w-4" />
              <Switch
                checked={showCoordinates}
                onCheckedChange={setShowCoordinates}
              />
            </div>
          </div>
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          {getRoomTypeBadge(room)}
          {showCoordinates && (
            <Badge variant="outline" className="font-mono text-xs">
              ({room.x}, {room.y})
            </Badge>
          )}
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
            <Badge variant="outline" className="text-xs">Use WASD keys</Badge>
          </h4>
          
          {availableDirections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available exits from this room.</p>
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
            <p className="text-xs text-red-600">Need at least 10 energy to move</p>
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
                  .filter(p => p.id !== crawler.id)
                  .map((player) => (
                    <div key={player.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
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