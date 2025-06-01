import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  MapPin, 
  Shield, 
  Gem, 
  Skull, 
  DoorOpen,
  Home,
  ArrowUp,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import { CrawlerWithDetails } from "@shared/schema";
import { isFullMapMode } from "@/components/debug-panel";

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
  isExplored: boolean;
}

interface RoomConnection {
  fromRoomId: number;
  toRoomId: number;
  direction: string;
}

export default function MiniMap({ crawler }: MiniMapProps) {
  const [isMoving, setIsMoving] = useState(false);
  const [previousCurrentRoom, setPreviousCurrentRoom] = useState<ExploredRoom | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resetPanOnNextMove, setResetPanOnNextMove] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Check if we're in full map debug mode
  const [showFullMap, setShowFullMap] = useState(isFullMapMode());
  
  // Fetch explored rooms for this crawler
  const { data: exploredRooms, isLoading } = useQuery<ExploredRoom[]>({
    queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
    retry: false,
    refetchInterval: 2000, // Refresh every 2 seconds to ensure current room updates
    enabled: !showFullMap,
  });

  // Fetch all rooms for full map mode
  const { data: allRooms, isLoading: isLoadingAllRooms } = useQuery<any[]>({
    queryKey: [`/api/debug/rooms/${crawler.currentFloor}`],
    retry: false,
    enabled: showFullMap,
  });

  // Update show full map state when debug mode changes
  useEffect(() => {
    const interval = setInterval(() => {
      const newShowFullMap = isFullMapMode();
      if (newShowFullMap !== showFullMap) {
        setShowFullMap(newShowFullMap);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [showFullMap]);

  // Convert all rooms data to explored rooms format when in full map mode
  const { data: currentRoomData } = useQuery<any>({
    queryKey: [`/api/crawlers/${crawler.id}/current-room`],
    retry: false,
    enabled: showFullMap,
  });

  // Combine data based on mode
  const roomsToDisplay = showFullMap && allRooms ? 
    allRooms.map(room => ({
      ...room,
      isCurrentRoom: currentRoomData?.room?.id === room.id,
      isExplored: true, // Mark all rooms as explored in debug mode
    })) : 
    exploredRooms;

  // Track room changes for smooth transitions and reset pan
  useEffect(() => {
    if (roomsToDisplay) {
      const currentRoom = roomsToDisplay.find(room => room.isCurrentRoom);
      if (currentRoom && previousCurrentRoom && currentRoom.id !== previousCurrentRoom.id) {
        setIsMoving(true);
        
        // Reset pan offset when player moves
        if (resetPanOnNextMove) {
          setPanOffset({ x: 0, y: 0 });
          setResetPanOnNextMove(false);
        }
        
        setTimeout(() => setIsMoving(false), 800); // 800ms transition for smoother feel
      }
      if (currentRoom) {
        setPreviousCurrentRoom(currentRoom);
      }
    }
  }, [roomsToDisplay, previousCurrentRoom, resetPanOnNextMove]);

  // Handle mouse dragging for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      setResetPanOnNextMove(true); // Mark that we should reset pan on next movement
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const getRoomIcon = (room: ExploredRoom) => {
    if (room.isCurrentRoom) {
      return <MapPin className="w-3 h-3 text-blue-400" />;
    }
    
    // Show question mark for unexplored rooms
    if (room.isExplored === false) {
      return <div className="w-3 h-3 text-slate-500 text-xs flex items-center justify-center font-bold">?</div>;
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
      case 'normal':
        return <div className="w-2 h-2 bg-slate-300 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-slate-400 rounded-full" />;
    }
  };

  const getRoomColor = (room: ExploredRoom) => {
    if (room.isCurrentRoom) {
      return "bg-blue-600/30 border-blue-400";
    }
    
    // Unexplored rooms have a distinct muted appearance
    if (room.isExplored === false) {
      return "bg-slate-800/40 border-slate-600/60 opacity-60";
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

  if (isLoading || isLoadingAllRooms) {
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

  if (!roomsToDisplay || roomsToDisplay.length === 0) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map {showFullMap && <Badge variant="outline" className="text-cyan-400 border-cyan-400">DEBUG</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">No rooms {showFullMap ? 'available' : 'explored yet'}</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate the bounds of explored rooms
  const minX = Math.min(...roomsToDisplay.map(r => r.x));
  const maxX = Math.max(...roomsToDisplay.map(r => r.x));
  const minY = Math.min(...roomsToDisplay.map(r => r.y));
  const maxY = Math.max(...roomsToDisplay.map(r => r.y));

  const gridWidth = maxX - minX + 1;
  const gridHeight = maxY - minY + 1;

  // Create a 2D grid to position rooms (flip Y axis to put north at top)
  const grid: (ExploredRoom | null)[][] = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(null));
  
  roomsToDisplay.forEach(room => {
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
          {showFullMap && <Badge variant="outline" className="text-cyan-400 border-cyan-400 text-xs">DEBUG</Badge>}
          <Badge variant="outline" className="ml-auto text-xs">
            Floor {crawler.currentFloor}
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2">
                <Maximize2 className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] bg-game-panel border-game-border">
              <DialogHeader>
                <DialogTitle className="text-slate-200 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Dungeon Map - Floor {crawler.currentFloor}
                </DialogTitle>
              </DialogHeader>
              <ExpandedMapView exploredRooms={roomsToDisplay || []} />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Compact grid map */}
          <div className="flex justify-center">
            {/* Calculate visible area around current room */}
            {(() => {
              const currentRoom = roomsToDisplay.find(r => r.isCurrentRoom);
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
              roomsToDisplay.forEach(room => {
                roomMap.set(`${room.x},${room.y}`, room);
              });
              
              return (
                <div 
                  className="border border-slate-600 bg-slate-900/50 p-2 rounded relative overflow-hidden"
                  style={{ height: '200px', width: '100%' }}
                >
                  <div 
                    className="absolute inset-0 cursor-move select-none"
                    ref={mapRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                      transition: isDragging ? 'none' : 'transform 0.3s ease'
                    }}
                  >
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

// Expanded map view component for the dialog
interface ExpandedMapViewProps {
  exploredRooms: ExploredRoom[];
}

function ExpandedMapView({ exploredRooms }: ExpandedMapViewProps) {
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.5));
  const resetView = () => {
    setScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const getRoomIcon = (room: ExploredRoom) => {
    if (room.isCurrentRoom) {
      return <MapPin className="w-6 h-6 text-blue-400" />;
    }
    
    if (!room.isExplored) {
      return <div className="w-6 h-6 text-slate-500 text-sm flex items-center justify-center font-bold">?</div>;
    }
    
    switch (room.type) {
      case 'entrance':
        return <Home className="w-6 h-6 text-green-400" />;
      case 'safe':
        return <Shield className="w-6 h-6 text-green-400" />;
      case 'treasure':
        return <Gem className="w-6 h-6 text-yellow-400" />;
      case 'boss':
      case 'exit':
        return <Skull className="w-6 h-6 text-red-400" />;
      case 'stairs':
        return <ArrowUp className="w-6 h-6 text-purple-400" />;
      default:
        return <div className="w-6 h-6 bg-slate-600 rounded" />;
    }
  };

  const getRoomColor = (room: ExploredRoom) => {
    if (room.isCurrentRoom) {
      return "bg-blue-600/30 border-blue-400 shadow-lg shadow-blue-400/20";
    }
    
    if (!room.isExplored) {
      return "bg-slate-800/50 border-slate-600/50";
    }
    
    switch (room.type) {
      case 'entrance':
      case 'safe':
        return "bg-green-600/20 border-green-600/50";
      case 'treasure':
        return "bg-yellow-600/20 border-yellow-600/50";
      case 'boss':
      case 'exit':
        return "bg-red-600/20 border-red-600/50";
      case 'stairs':
        return "bg-purple-600/20 border-purple-600/50";
      default:
        return "bg-slate-600/20 border-slate-600/50";
    }
  };

  if (!exploredRooms || exploredRooms.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        No rooms explored yet
      </div>
    );
  }

  // Calculate bounds
  const minX = Math.min(...exploredRooms.map(r => r.x));
  const maxX = Math.max(...exploredRooms.map(r => r.x));
  const minY = Math.min(...exploredRooms.map(r => r.y));
  const maxY = Math.max(...exploredRooms.map(r => r.y));

  // Create room map
  const roomMap = new Map();
  exploredRooms.forEach(room => {
    roomMap.set(`${room.x},${room.y}`, room);
  });

  return (
    <div className="h-96 flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4">
        <Button onClick={zoomIn} size="sm" variant="outline">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button onClick={zoomOut} size="sm" variant="outline">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button onClick={resetView} size="sm" variant="outline">
          <RotateCcw className="w-4 h-4" />
        </Button>
        <span className="text-sm text-slate-400 ml-2">
          Zoom: {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Map container */}
      <div 
        className="flex-1 overflow-hidden border border-slate-600 bg-slate-900/50 rounded cursor-move select-none relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.3s ease'
          }}
        >
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${(maxX - minX + 1) * 2 - 1}, 1fr)` }}>
            {Array.from({ length: ((maxY - minY + 1) * 2 - 1) * ((maxX - minX + 1) * 2 - 1) }, (_, index) => {
              const gridWidth = (maxX - minX + 1) * 2 - 1;
              const row = Math.floor(index / gridWidth);
              const col = index % gridWidth;
              
              const isRoomRow = row % 2 === 0;
              const isRoomCol = col % 2 === 0;
              
              if (isRoomRow && isRoomCol) {
                // Room position
                const roomRow = Math.floor(row / 2);
                const roomCol = Math.floor(col / 2);
                const x = minX + roomCol;
                const y = maxY - roomRow;
                const room = roomMap.get(`${x},${y}`);
                
                if (room) {
                  return (
                    <div
                      key={`room-${room.id}`}
                      className={`w-12 h-12 border-2 rounded flex items-center justify-center relative ${getRoomColor(room)}`}
                      title={`${room.name} (${x}, ${y})`}
                    >
                      {getRoomIcon(room)}
                    </div>
                  );
                } else {
                  return <div key={`empty-${col}-${row}`} className="w-12 h-12" />;
                }
              } else if (isRoomRow && !isRoomCol) {
                // Horizontal connection
                const roomRow = Math.floor(row / 2);
                const leftCol = Math.floor(col / 2);
                const rightCol = leftCol + 1;
                const y = maxY - roomRow;
                const leftX = minX + leftCol;
                const rightX = minX + rightCol;
                const leftRoom = roomMap.get(`${leftX},${y}`);
                const rightRoom = roomMap.get(`${rightX},${y}`);
                
                if (leftRoom && rightRoom) {
                  return (
                    <div key={`h-${leftX}-${rightX}-${y}`} className="w-12 h-12 flex items-center justify-center">
                      <div className="w-8 h-1 bg-slate-500"></div>
                    </div>
                  );
                }
                return <div key={`h-empty-${col}-${row}`} className="w-12 h-12" />;
              } else if (!isRoomRow && isRoomCol) {
                // Vertical connection
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
                    <div key={`v-${x}-${topY}-${bottomY}`} className="w-12 h-12 flex items-center justify-center">
                      <div className="w-1 h-8 bg-slate-500"></div>
                    </div>
                  );
                }
                return <div key={`v-empty-${col}-${row}`} className="w-12 h-12" />;
              } else {
                // Intersection
                return <div key={`intersection-${col}-${row}`} className="w-12 h-12" />;
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
}