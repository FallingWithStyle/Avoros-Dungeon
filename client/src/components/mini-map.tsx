import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Shield, 
  Gem, 
  Skull, 
  DoorOpen,
  Home,
  ArrowUp
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
  const [isMoving, setIsMoving] = useState(false);
  const [previousCurrentRoom, setPreviousCurrentRoom] = useState<ExploredRoom | null>(null);

  // Fetch explored rooms for this crawler
  const { data: exploredRooms, isLoading } = useQuery<ExploredRoom[]>({
    queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
    retry: false,
  });

  // Track room changes for smooth transitions
  useEffect(() => {
    if (exploredRooms) {
      const currentRoom = exploredRooms.find(room => room.isCurrentRoom);
      if (currentRoom && previousCurrentRoom && currentRoom.id !== previousCurrentRoom.id) {
        setIsMoving(true);
        setTimeout(() => setIsMoving(false), 800); // 800ms transition for smoother feel
      }
      if (currentRoom) {
        setPreviousCurrentRoom(currentRoom);
      }
    }
  }, [exploredRooms, previousCurrentRoom]);

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
          <div className="flex justify-center">
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
                <div className="border border-slate-600 bg-slate-900/50 p-2 rounded">
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${(maxX - minX + 1) * 2 - 1}, 1fr)` }}>
                    {Array.from({ length: ((maxY - minY + 1) * 2 - 1) * ((maxX - minX + 1) * 2 - 1) }, (_, index) => {
                      const gridWidth = (maxX - minX + 1) * 2 - 1;
                      const row = Math.floor(index / gridWidth);
                      const col = index % gridWidth;
                      
                      const isRoomRow = row % 2 === 0;
                      const isRoomCol = col % 2 === 0;
                      
                      if (isRoomRow && isRoomCol) {
                        // This is a room position
                        const roomRow = Math.floor(row / 2);
                        const roomCol = Math.floor(col / 2);
                        const x = minX + roomCol;
                        const y = maxY - roomRow; // Flip Y coordinate so north is up
                        const room = roomMap.get(`${x},${y}`);
                        
                        if (room) {
                          return (
                            <div
                              key={`${x}-${y}`}
                              className={`w-6 h-6 border rounded text-xs flex items-center justify-center relative transition-all duration-700 ease-in-out ${getRoomColor(room)} ${
                                room.isCurrentRoom ? 'ring-2 ring-blue-400 ring-inset transform scale-105' : ''
                              }`}
                              title={`${room.name} (${x}, ${y})`}
                            >
                              {getRoomIcon(room)}
                              {room.isCurrentRoom && (
                                <div className={`absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full flex items-center justify-center transition-all duration-700 ease-in-out ${
                                  isMoving ? 'scale-125 shadow-lg shadow-blue-400/60 animate-pulse' : 'scale-100'
                                }`}>
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                </div>
                              )}
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
                      } else if (isRoomRow && !isRoomCol) {
                        // Horizontal connection space
                        const roomRow = Math.floor(row / 2);
                        const leftCol = Math.floor(col / 2);
                        const rightCol = leftCol + 1;
                        const leftX = minX + leftCol;
                        const rightX = minX + rightCol;
                        const y = maxY - roomRow;
                        const leftRoom = roomMap.get(`${leftX},${y}`);
                        const rightRoom = roomMap.get(`${rightX},${y}`);
                        
                        if (leftRoom && rightRoom) {
                          return (
                            <div key={`h-${leftX}-${rightX}-${y}`} className="w-6 h-6 flex items-center justify-center">
                              <div className="w-4 h-0.5 bg-slate-500"></div>
                            </div>
                          );
                        }
                        return <div key={`h-empty-${col}-${row}`} className="w-6 h-6" />;
                      } else if (!isRoomRow && isRoomCol) {
                        // Vertical connection space
                        const roomCol = Math.floor(col / 2);
                        const topRow = Math.floor(row / 2);
                        const bottomRow = topRow + 1;
                        const x = minX + roomCol;
                        const topY = maxY - topRow;
                        const bottomY = maxY - bottomRow;
                        const topRoom = roomMap.get(`${x},${topY}`);
                        const bottomRoom = roomMap.get(`${x},${bottomY}`);
                        
                        if (topRoom && bottomRoom) {
                          return (
                            <div key={`v-${x}-${topY}-${bottomY}`} className="w-6 h-6 flex items-center justify-center">
                              <div className="w-0.5 h-4 bg-slate-500"></div>
                            </div>
                          );
                        }
                        return <div key={`v-empty-${col}-${row}`} className="w-6 h-6" />;
                      } else {
                        // Intersection space
                        return <div key={`intersection-${col}-${row}`} className="w-6 h-6" />;
                      }
                    })}
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
              <div className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3 text-purple-400" />
                <span>Stairs</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}