import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Eye, EyeOff, Maximize2 } from 'lucide-react';

interface ExploredRoom {
  id: number;
  name: string;
  x: number;
  y: number;
  isCurrentRoom: boolean;
  isExplored?: boolean;
}

interface ExpandedMapViewProps {
  exploredRooms: ExploredRoom[];
}

function ExpandedMapView({ exploredRooms }: ExpandedMapViewProps) {
  if (!exploredRooms || exploredRooms.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        No rooms to display
      </div>
    );
  }

  const allX = exploredRooms.map(room => room.x);
  const allY = exploredRooms.map(room => room.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);

  const roomMap = new Map();
  exploredRooms.forEach(room => {
    roomMap.set(`${room.x},${room.y}`, room);
  });

  return (
    <div className="h-96 overflow-auto bg-slate-900 p-4 rounded">
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
            const actualX = minX + roomCol;
            const actualY = minY + roomRow;
            const room = roomMap.get(`${actualX},${actualY}`);
            
            if (room) {
              return (
                <div
                  key={`room-${actualX}-${actualY}`}
                  className={`w-6 h-6 border rounded text-xs flex items-center justify-center font-bold ${
                    room.isCurrentRoom 
                      ? 'bg-blue-500 border-blue-400 text-white shadow-lg' 
                      : 'bg-slate-700 border-slate-600 text-slate-300'
                  }`}
                  title={room.name}
                >
                  {room.isCurrentRoom ? '●' : '□'}
                </div>
              );
            } else {
              return <div key={`empty-${actualX}-${actualY}`} className="w-6 h-6" />;
            }
          } else if (!isRoomRow && isRoomCol) {
            return <div key={`v-${row}-${col}`} className="w-6 h-3 flex items-center justify-center">
              <div className="w-0.5 h-full bg-slate-600"></div>
            </div>;
          } else if (isRoomRow && !isRoomCol) {
            return <div key={`h-${row}-${col}`} className="w-3 h-6 flex items-center justify-center">
              <div className="w-full h-0.5 bg-slate-600"></div>
            </div>;
          } else {
            return <div key={`cross-${row}-${col}`} className="w-3 h-3" />;
          }
        })}
      </div>
    </div>
  );
}

export function MiniMap({ crawler }: { crawler: any }) {
  // All state hooks at the top - always called
  const [showFullMap, setShowFullMap] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMoving, setIsMoving] = useState(false);
  const [previousCurrentRoom, setPreviousCurrentRoom] = useState<ExploredRoom | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // All query hooks at the top - always called
  const { data: exploredRooms, isLoading: exploredLoading, error: exploredError } = useQuery({
    queryKey: ['/api/crawlers', crawler?.id, 'explored-rooms'],
    enabled: !!crawler?.id,
  });

  const { data: allRooms, isLoading: allRoomsLoading } = useQuery({
    queryKey: ['/api/floors', crawler?.currentFloor, 'rooms'],
    enabled: showFullMap && !!crawler?.currentFloor,
  });

  // Debug logging
  console.log('MiniMap Debug:', {
    crawlerId: crawler?.id,
    exploredRooms,
    exploredLoading,
    exploredError,
    queryEnabled: !!crawler?.id
  });

  // All effect hooks at the top - always called
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

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Early returns after all hooks
  if (!crawler) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">No crawler selected</div>
        </CardContent>
      </Card>
    );
  }

  // Calculate display data
  const roomsData = showFullMap ? allRooms : exploredRooms;
  const isLoading = showFullMap ? allRoomsLoading : exploredLoading;

  if (isLoading) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
            <Badge variant="secondary" className="ml-auto">
              {showFullMap ? "Full Floor" : `${Array.isArray(roomsData) ? roomsData.length : 0} Explored`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            {showFullMap ? "Loading floor map..." : "Loading explored rooms..."}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!roomsData || !Array.isArray(roomsData) || roomsData.length === 0) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
            <Badge variant="secondary" className="ml-auto">
              {showFullMap ? "Full Floor" : `${Array.isArray(roomsData) ? roomsData.length : 0} Explored`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            {showFullMap ? "No rooms on floor" : "No rooms explored yet"}
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

  // Calculate map boundaries
  const allX = displayRooms.map(room => room.x);
  const allY = displayRooms.map(room => room.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  
  const roomMap = new Map();
  displayRooms.forEach(room => {
    roomMap.set(`${room.x},${room.y}`, room);
  });

  // Auto-center effect - placed after all calculations
  useEffect(() => {
    if (currentRoom && displayRooms.length > 0) {
      // Calculate the center position for the current room
      const mapWidth = 250;
      const mapHeight = 250;
      const gridWidth = (maxX - minX + 1) * 2 - 1;
      const gridHeight = (maxY - minY + 1) * 2 - 1;
      const cellSize = Math.min(mapWidth / gridWidth, mapHeight / gridHeight);
      
      // Position of current room in the grid
      const roomCol = (currentRoom.x - minX) * 2;
      const roomRow = (currentRoom.y - minY) * 2;
      
      // Calculate the position to center this room
      const roomPixelX = roomCol * cellSize;
      const roomPixelY = roomRow * cellSize;
      
      // Center the room in the viewport
      const centerX = mapWidth / 2 - roomPixelX - cellSize / 2;
      const centerY = mapHeight / 2 - roomPixelY - cellSize / 2;
      
      setPanOffset({ x: centerX, y: centerY });
      
      // Track room changes for smooth transitions
      if (previousCurrentRoom && currentRoom.id !== previousCurrentRoom.id) {
        setIsMoving(true);
        setTimeout(() => setIsMoving(false), 800);
      }
      setPreviousCurrentRoom(currentRoom);
    }
  }, [currentRoom?.id, displayRooms.length, minX, maxX, minY, maxY, previousCurrentRoom]);

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Mini-Map
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost" 
              size="sm"
              onClick={() => setShowFullMap(!showFullMap)}
              className="h-6 px-2 text-xs"
            >
              {showFullMap ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showFullMap ? "Hide" : "Reveal"} full map
            </Button>
            <Badge variant="secondary">
              {showFullMap ? "Full Floor" : `${roomsData?.length || 0} Explored`}
            </Badge>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-game-panel border-game-border">
                <DialogHeader>
                  <DialogTitle className="text-slate-200 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Dungeon Map - Floor {crawler.currentFloor}
                  </DialogTitle>
                </DialogHeader>
                <ExpandedMapView exploredRooms={displayRooms || []} />
              </DialogContent>
            </Dialog>
          </div>
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
                      const actualX = minX + roomCol;
                      const actualY = minY + roomRow;
                      const room = roomMap.get(`${actualX},${actualY}`);
                      
                      if (room) {
                        const isCurrentRoom = room.isCurrentRoom;
                        const isExplored = room.isExplored !== false;
                        
                        return (
                          <div
                            key={`room-${actualX}-${actualY}`}
                            className={`w-4 h-4 border rounded text-xs flex items-center justify-center font-bold transition-all duration-300 ${
                              isCurrentRoom 
                                ? 'bg-blue-500 border-blue-400 text-white shadow-lg scale-110' 
                                : isExplored 
                                ? 'bg-slate-700 border-slate-600 text-slate-300'
                                : 'bg-slate-800 border-slate-700 text-slate-500 opacity-60'
                            } ${isMoving && isCurrentRoom ? 'animate-pulse' : ''}`}
                            title={room.name}
                          >
                            {isCurrentRoom ? '●' : isExplored ? '□' : '?'}
                          </div>
                        );
                      } else {
                        return <div key={`empty-${actualX}-${actualY}`} className="w-4 h-4" />;
                      }
                    } else if (!isRoomRow && isRoomCol) {
                      return <div key={`v-${row}-${col}`} className="w-4 h-2 flex items-center justify-center">
                        <div className="w-0.5 h-full bg-slate-600"></div>
                      </div>;
                    } else if (isRoomRow && !isRoomCol) {
                      return <div key={`h-${row}-${col}`} className="w-2 h-4 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-slate-600"></div>
                      </div>;
                    } else {
                      return <div key={`cross-${row}-${col}`} className="w-2 h-2" />;
                    }
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 text-center">
            {currentRoom ? `Current: ${currentRoom.name}` : 'No current room'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}