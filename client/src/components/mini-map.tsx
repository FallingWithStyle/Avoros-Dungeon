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
          {/* Grid display with connections */}
          <div 
            className="relative grid gap-0 max-w-full overflow-auto"
            style={{ 
              gridTemplateColumns: `repeat(${gridWidth * 2 - 1}, 1fr)`,
              gridTemplateRows: `repeat(${gridHeight * 2 - 1}, 1fr)`,
              aspectRatio: gridWidth / gridHeight > 2 ? '2/1' : 'auto'
            }}
          >
            {/* Render rooms and connections */}
            {Array.from({ length: gridHeight * 2 - 1 }, (_, row) => 
              Array.from({ length: gridWidth * 2 - 1 }, (_, col) => {
                const isRoomRow = row % 2 === 0;
                const isRoomCol = col % 2 === 0;
                const key = `cell-${row}-${col}`;

                if (isRoomRow && isRoomCol) {
                  // This is a room position
                  const roomRow = Math.floor(row / 2);
                  const roomCol = Math.floor(col / 2);
                  const room = grid[roomRow]?.[roomCol];

                  if (!room) {
                    return <div key={key} className="w-4 h-4" />;
                  }

                  return (
                    <div
                      key={key}
                      className={`w-4 h-4 border rounded flex items-center justify-center text-xs ${getRoomColor(room)}`}
                      title={room.name}
                    >
                      {getRoomIcon(room)}
                    </div>
                  );
                } else if (isRoomRow && !isRoomCol) {
                  // This is a horizontal connection space
                  const roomRow = Math.floor(row / 2);
                  const leftCol = Math.floor(col / 2);
                  const rightCol = leftCol + 1;
                  const leftRoom = grid[roomRow]?.[leftCol];
                  const rightRoom = grid[roomRow]?.[rightCol];

                  if (leftRoom && rightRoom) {
                    return (
                      <div key={key} className="w-4 h-4 flex items-center justify-center">
                        <div className="w-3 h-0.5 bg-slate-500"></div>
                      </div>
                    );
                  }
                  return <div key={key} className="w-4 h-4" />;
                } else if (!isRoomRow && isRoomCol) {
                  // This is a vertical connection space
                  const roomCol = Math.floor(col / 2);
                  const topRow = Math.floor(row / 2);
                  const bottomRow = topRow + 1;
                  const topRoom = grid[topRow]?.[roomCol];
                  const bottomRoom = grid[bottomRow]?.[roomCol];

                  if (topRoom && bottomRoom) {
                    return (
                      <div key={key} className="w-4 h-4 flex items-center justify-center">
                        <div className="w-0.5 h-3 bg-slate-500"></div>
                      </div>
                    );
                  }
                  return <div key={key} className="w-4 h-4" />;
                } else {
                  // This is an intersection space
                  return <div key={key} className="w-4 h-4" />;
                }
              })
            ).flat()}
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