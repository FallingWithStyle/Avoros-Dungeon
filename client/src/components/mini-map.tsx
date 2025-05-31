import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Shield, 
  Gem, 
  Skull, 
  DoorOpen,
  Home
} from "lucide-react";
import { CrawlerWithDetails } from "@shared/schema";

interface MiniMapProps {
  crawler: CrawlerWithDetails;
}

interface ExploredRoom {
  id: number;
  name: string;
  type: string;
  isSafe: boolean;
  hasLoot: boolean;
  x: number;
  y: number;
  isCurrentRoom: boolean;
}

interface RoomConnection {
  fromRoomId: number;
  toRoomId: number;
  direction: string;
}

export default function MiniMap({ crawler }: MiniMapProps) {
  // Fetch explored rooms for this crawler
  const { data: exploredRooms, isLoading } = useQuery<ExploredRoom[]>({
    queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
    retry: false,
  });

  const getRoomIcon = (room: ExploredRoom) => {
    if (room.isCurrentRoom) {
      return <MapPin className="w-3 h-3 text-blue-400" />;
    }
    
    switch (room.type) {
      case 'entrance':
        return <Home className="w-3 h-3 text-green-400" />;
      case 'safe':
        return <Shield className="w-3 h-3 text-green-400" />;
      case 'treasure':
        return <Gem className="w-3 h-3 text-yellow-400" />;
      case 'boss':
        return <Skull className="w-3 h-3 text-red-400" />;
      case 'exit':
        return <DoorOpen className="w-3 h-3 text-purple-400" />;
      default:
        return <div className="w-3 h-3 bg-slate-400 rounded-full" />;
    }
  };

  const getRoomColor = (room: ExploredRoom) => {
    if (room.isCurrentRoom) {
      return "bg-blue-600/30 border-blue-400";
    }
    
    switch (room.type) {
      case 'entrance':
        return "bg-green-600/20 border-green-600/50";
      case 'safe':
        return "bg-green-600/20 border-green-600/50";
      case 'treasure':
        return "bg-yellow-600/20 border-yellow-600/50";
      case 'boss':
        return "bg-red-600/20 border-red-600/50";
      case 'exit':
        return "bg-purple-600/20 border-purple-600/50";
      case 'trap':
        return "bg-orange-600/20 border-orange-600/50";
      default:
        return "bg-slate-600/20 border-slate-600/50";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">Loading map...</div>
        </CardContent>
      </Card>
    );
  }

  if (!exploredRooms || exploredRooms.length === 0) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">No rooms explored yet</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate the bounds of explored rooms
  const minX = Math.min(...exploredRooms.map(r => r.x));
  const maxX = Math.max(...exploredRooms.map(r => r.x));
  const minY = Math.min(...exploredRooms.map(r => r.y));
  const maxY = Math.max(...exploredRooms.map(r => r.y));

  const gridWidth = maxX - minX + 1;
  const gridHeight = maxY - minY + 1;

  // Create a 2D grid to position rooms (flip Y axis to put north at top)
  const grid: (ExploredRoom | null)[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(null));
  
  exploredRooms.forEach(room => {
    const gridX = room.x - minX;
    const gridY = (maxY - room.y); // Flip Y coordinate so north is at top
    grid[gridY][gridX] = room;
  });

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Mini-Map
          <Badge variant="outline" className="ml-auto text-xs">
            Floor {crawler.currentFloor}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Compact grid map */}
          <div className="relative">
            {/* Calculate visible area around current room */}
            {(() => {
              const currentRoom = exploredRooms.find(r => r.isCurrentRoom);
              if (!currentRoom) return <div className="text-slate-400">No current room</div>;
              
              const centerX = currentRoom.x;
              const centerY = currentRoom.y;
              const radius = 3; // Show 7x7 grid around current room
              
              const minX = centerX - radius;
              const maxX = centerX + radius;
              const minY = centerY - radius;
              const maxY = centerY + radius;
              
              // Create a map of coordinates to rooms
              const roomMap = new Map();
              exploredRooms.forEach(room => {
                roomMap.set(`${room.x},${room.y}`, room);
              });
              
              return (
                <div className="inline-block border border-slate-600 bg-slate-900/50 p-2 rounded">
                  <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${maxX - minX + 1}, 1fr)` }}>
                    {Array.from({ length: (maxY - minY + 1) * (maxX - minX + 1) }, (_, index) => {
                      const row = Math.floor(index / (maxX - minX + 1));
                      const col = index % (maxX - minX + 1);
                      const x = minX + col;
                      const y = minY + row;
                      const room = roomMap.get(`${x},${y}`);
                      
                      if (room) {
                        return (
                          <div
                            key={`${x}-${y}`}
                            className={`w-6 h-6 border rounded text-xs flex items-center justify-center ${getRoomColor(room)} ${
                              room.isCurrentRoom ? 'ring-2 ring-blue-400 ring-inset' : ''
                            }`}
                            title={`${room.name} (${x}, ${y})`}
                          >
                            {getRoomIcon(room)}
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={`${x}-${y}`}
                            className="w-6 h-6 bg-slate-800 border border-slate-700 rounded opacity-30"
                            title={`Unexplored (${x}, ${y})`}
                          />
                        );
                      }
                    })}
                  </div>
                  
                  {/* Compass in bottom right */}
                  <div className="absolute bottom-1 right-1 text-xs text-slate-400">
                    <div className="text-center">N</div>
                    <div className="flex justify-between">
                      <span>W</span>
                      <span>E</span>
                    </div>
                    <div className="text-center">S</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Legend */}
          <div className="mt-4 space-y-1 text-xs">
            <div className="font-medium text-slate-300 mb-2">Legend:</div>
            <div className="grid grid-cols-2 gap-1 text-slate-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-green-400" />
                <span>Safe</span>
              </div>
              <div className="flex items-center gap-1">
                <Gem className="w-3 h-3 text-yellow-400" />
                <span>Treasure</span>
              </div>
              <div className="flex items-center gap-1">
                <Home className="w-3 h-3 text-green-400" />
                <span>Entrance</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}