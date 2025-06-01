import { useState, useEffect, useRef, useCallback } from "react";
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
  ArrowDown,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation
} from "lucide-react";
import { CrawlerWithDetails } from "@shared/schema";

interface MiniMapProps {
  crawler: CrawlerWithDetails;
  showFullMap?: boolean;
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

export default function MiniMap({ crawler, showFullMap = false }: MiniMapProps) {
  const [isMoving, setIsMoving] = useState(false);
  const [previousCurrentRoom, setPreviousCurrentRoom] = useState<ExploredRoom | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resetPanOnNextMove, setResetPanOnNextMove] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);

  // Fetch explored rooms for this crawler (always enabled for current room detection)
  const { data: exploredRooms, isLoading: exploredLoading } = useQuery<ExploredRoom[]>({
    queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Fetch all rooms for full map mode
  const { data: allRooms, isLoading: allRoomsLoading } = useQuery<ExploredRoom[]>({
    queryKey: [`/api/floors/${crawler.currentFloor}/rooms`],
    enabled: showFullMap,
  });

  // Use appropriate data based on mode
  const roomsData = showFullMap ? allRooms : exploredRooms;
  const isLoading = showFullMap ? allRoomsLoading : exploredLoading;

  // Simple centering function
  const centerOnCrawler = useCallback(() => {
    if (!currentRoom) {
      console.log("centerOnCrawler: No current room found");
      return;
    }

    const container = mapRef.current;
    if (!container) {
      console.log("centerOnCrawler: No container ref");
      return;
    }
    
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Use the displayed rooms for bounds calculation
    const allX = displayRooms.map(r => r.x);
    const allY = displayRooms.map(r => r.y);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    
    // Room size matches the CSS (28px includes gap)
    const roomSize = 28;
    
    // Calculate the current room's position in the grid
    const roomGridX = (currentRoom.x - minX) * 2; // *2 for connections
    const roomGridY = (maxY - currentRoom.y) * 2; // Y is flipped
    const roomPixelX = roomGridX * roomSize;
    const roomPixelY = roomGridY * roomSize;
    
    // Simple centering calculation
    const centerX = (containerWidth / 2) - roomPixelX - (roomSize / 2);
    const centerY = (containerHeight / 2) - roomPixelY - (roomSize / 2);
    
    console.log("Simple centering:", { 
      room: currentRoom.name,
      coords: [currentRoom.x, currentRoom.y],
      bounds: [minX, maxX, minY, maxY],
      grid: [roomGridX, roomGridY],
      pixel: [roomPixelX, roomPixelY],
      center: [centerX, centerY]
    });
    
    setPanOffset({ x: centerX, y: centerY });
  }, [displayRooms, currentRoom]);

  // Track room changes for smooth transitions and reset pan
  useEffect(() => {
    if (roomsData) {
      const currentRoom = roomsData.find(room => room.isCurrentRoom);
      if (currentRoom && previousCurrentRoom && currentRoom.id !== previousCurrentRoom.id) {
        setIsMoving(true);
        
        // Auto-center on player when they move
        if (resetPanOnNextMove) {
          centerOnCrawler();
          setResetPanOnNextMove(false);
        }
        
        setTimeout(() => setIsMoving(false), 800);
      }
      if (currentRoom) {
        setPreviousCurrentRoom(currentRoom);
      }
    }
  }, [roomsData, previousCurrentRoom, resetPanOnNextMove]);

  // Auto-center on initial load or when switching between explored/full map modes
  useEffect(() => {
    centerOnCrawler();
  }, [showFullMap, centerOnCrawler]);

  // Handle mouse dragging for pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      setResetPanOnNextMove(true);
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
    if (room.isExplored === false) {
      return <div className="w-3 h-3 text-slate-500 text-xs flex items-center justify-center font-bold">?</div>;
    }
    
    // Check for safe rooms first (including entrance which is also safe)
    if (room.isSafe && room.type !== 'entrance') {
      return <Shield className="w-3 h-3 text-green-400" />;
    }
    
    switch (room.type) {
      case 'entrance':
        return <Home className="w-3 h-3 text-green-400" />;
      case 'treasure':
        return <Gem className="w-3 h-3 text-yellow-400" />;
      case 'boss':
      case 'exit':
        return <Skull className="w-3 h-3 text-red-400" />;
      case 'stairs':
        return <ArrowDown className="w-3 h-3 text-purple-400" />;
      default:
        return <div className="w-3 h-3 bg-slate-600 rounded" />;
    }
  };

  const getRoomColor = (room: ExploredRoom) => {
    if (room.isCurrentRoom) {
      return "bg-blue-600/30 border-blue-400 shadow-lg shadow-blue-400/20";
    }
    
    if (room.isExplored === false) {
      return "bg-slate-800/50 border-slate-600/50";
    }
    
    // Check for safe rooms first (including entrance)
    if (room.isSafe) {
      return "bg-green-600/20 border-green-600/50";
    }
    
    switch (room.type) {
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

  // Only show loading for full map mode when it's specifically loading
  if (showFullMap && allRoomsLoading) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">Loading full floor map...</div>
        </CardContent>
      </Card>
    );
  }

  if (!roomsData || roomsData.length === 0) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
            <Badge variant="outline" className="ml-auto text-xs">
              {showFullMap ? "Full Floor" : `${roomsData?.length || 0} Explored`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            {showFullMap ? "Loading floor map..." : "No rooms explored yet"}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find current room correctly based on mode
  let currentRoom: ExploredRoom | undefined;
  let displayRooms: ExploredRoom[] = [];
  
  if (showFullMap && allRooms && exploredRooms) {
    // In full map mode, get the current room ID from explored rooms
    const exploredCurrentRoom = exploredRooms.find(r => r.isCurrentRoom);
    const currentRoomId = exploredCurrentRoom?.id;
    
    // Create display rooms array with proper current room marking
    displayRooms = allRooms.map(room => ({
      ...room,
      isCurrentRoom: room.id === currentRoomId,
      isExplored: exploredRooms.some(er => er.id === room.id) ? true : false
    }));
    
    currentRoom = displayRooms.find(r => r.isCurrentRoom);
  } else {
    // In explored mode, use explored rooms directly
    displayRooms = roomsData || [];
    currentRoom = displayRooms.find(r => r.isCurrentRoom);
  }

  if (!currentRoom) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">No current room</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate bounds to show all rooms
  const allX = displayRooms.map(r => r.x);
  const allY = displayRooms.map(r => r.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  
  const roomMap = new Map();
  displayRooms.forEach(room => {
    roomMap.set(`${room.x},${room.y}`, room);
  });

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Mini-Map
          <Badge variant="outline" className="ml-auto text-xs">
            {showFullMap ? "Full Floor" : `${displayRooms?.length || 0} Explored`}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 ml-2"
            onClick={centerOnCrawler}
            title="Center on Crawler"
          >
            <Navigation className="w-3 h-3" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2">
                <Maximize2 className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] bg-game-panel border-game-border p-6">
              <DialogHeader>
                <DialogTitle className="text-slate-200 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Dungeon Map - Floor {crawler.currentFloor}
                </DialogTitle>
              </DialogHeader>
              <div className="h-full w-full bg-slate-900/50 border border-slate-700 rounded p-4">
                <div className="text-center text-slate-400">Expanded map view - Coming soon</div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-center">
            <div 
              className="border border-slate-600 bg-slate-900/50 p-2 rounded relative overflow-hidden mx-auto"
              style={{ height: '250px', width: '250px' }}
            >
              <div 
                className="absolute inset-0 cursor-move select-none flex items-center justify-center"
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
                      const roomRow = Math.floor(row / 2);
                      const roomCol = Math.floor(col / 2);
                      const x = minX + roomCol;
                      const y = maxY - roomRow;
                      const room = roomMap.get(`${x},${y}`);
                      
                      if (room) {
                        return (
                          <div
                            key={`room-${room.id}`}
                            className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-all duration-300 relative ${getRoomColor(room)} ${
                              isMoving && room.isCurrentRoom ? 'scale-110 animate-pulse' : ''
                            }`}
                            title={`${room.name} (${x}, ${y})`}
                          >
                            {getRoomIcon(room)}
                          </div>
                        );
                      } else {
                        return <div key={`empty-${col}-${row}`} className="w-6 h-6" />;
                      }
                    } else if (isRoomRow && !isRoomCol) {
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
                          <div key={`h-${leftX}-${rightX}-${y}`} className="w-6 h-6 flex items-center justify-center">
                            <div className="w-4 h-0.5 bg-slate-500"></div>
                          </div>
                        );
                      }
                      return <div key={`h-empty-${col}-${row}`} className="w-6 h-6" />;
                    } else if (!isRoomRow && isRoomCol) {
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
                      return <div key={`intersection-${col}-${row}`} className="w-6 h-6" />;
                    }
                  })}
                </div>
              </div>
            </div>
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
                <ArrowDown className="w-3 h-3 text-purple-400" />
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
    if (!room.isExplored) {
      return <div className="w-6 h-6 text-slate-500 text-sm flex items-center justify-center font-bold">?</div>;
    }
    
    // Check for safe rooms first (by isSafe property)
    if (room.isSafe) {
      return <Shield className="w-6 h-6 text-green-400" />;
    }
    
    switch (room.type) {
      case 'entrance':
        return <Home className="w-6 h-6 text-green-400" />;
      case 'treasure':
        return <Gem className="w-6 h-6 text-yellow-400" />;
      case 'boss':
      case 'exit':
        return <Skull className="w-6 h-6 text-red-400" />;
      case 'stairs':
        return <ArrowDown className="w-6 h-6 text-purple-400" />;
      default:
        return <div className="w-6 h-6 bg-slate-600 rounded" />;
    }
  };

  const getRoomColor = (room: ExploredRoom) => {
    if (!room.isExplored) {
      return "bg-slate-800/50 border-slate-600/50";
    }
    
    // Check for safe rooms first (by isSafe property)
    if (room.isSafe) {
      return "bg-green-600/20 border-green-600/50";
    }
    
    switch (room.type) {
      case 'entrance':
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
    <div className="flex flex-col h-full">
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
        className="overflow-hidden border border-slate-600 bg-slate-900/50 rounded cursor-move select-none relative mx-auto"
        style={{ height: '600px', width: '600px' }}
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
                      {room.isCurrentRoom && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-blue-300 animate-pulse shadow-lg shadow-blue-400/50 z-10" />
                      )}
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