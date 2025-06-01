import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Maximize2, User, Gem, Shield, AlertTriangle, MapPin } from "lucide-react";

interface CrawlerWithDetails {
  id: number;
  sponsorId: string;
  name: string;
  currentRoomId: number;
  currentFloor: number;
  energy: number;
  maxEnergy: number;
  health: number;
  maxHealth: number;
  experience: number;
  level: number;
  attack: number;
  defense: number;
  speed: number;
  wit: number;
  charisma: number;
  memory: number;
  credits: number;
  corporationName: string;
  background: string;
}

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

// Check if debug mode is enabled
function isFullMapMode(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('debug-full-map') === 'true';
  }
  return false;
}

export default function MiniMap({ crawler }: MiniMapProps) {
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resetPanOnNextMove, setResetPanOnNextMove] = useState(false);
  const [debugMode, setDebugMode] = useState(isFullMapMode());
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Check for debug mode changes
  useEffect(() => {
    const checkDebugMode = () => {
      const newDebugMode = isFullMapMode();
      if (newDebugMode !== debugMode) {
        console.log("Debug mode changed:", newDebugMode);
        setDebugMode(newDebugMode);
      }
    };
    
    // Check immediately and then every second
    checkDebugMode();
    const interval = setInterval(checkDebugMode, 1000);
    return () => clearInterval(interval);
  }, [debugMode]);
  
  // Fetch explored rooms for this crawler
  const { data: exploredRooms, isLoading: isLoadingRooms } = useQuery<ExploredRoom[]>({
    queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
    retry: false,
    refetchInterval: 2000,
    enabled: !debugMode,
  });

  // Fetch all floor rooms when in debug mode
  const { data: allFloorRooms, isLoading: isLoadingAllRooms } = useQuery<any[]>({
    queryKey: [`/api/floors/${crawler.currentFloor}/rooms`],
    retry: false,
    enabled: debugMode,
  });

  // Determine which rooms to display
  const roomsToDisplay = debugMode && allFloorRooms ? 
    allFloorRooms.map(room => ({
      id: room.id,
      name: room.name,
      type: room.type,
      isSafe: room.type === 'safe' || room.type === 'entrance',
      hasLoot: room.type === 'treasure',
      x: room.x || 0,
      y: room.y || 0,
      isCurrentRoom: crawler.currentRoomId === room.id,
      isExplored: true,
    })) : exploredRooms || [];

  const getRoomIcon = (room: ExploredRoom) => {
    if (room.isCurrentRoom) return <User className="w-3 h-3" />;
    switch (room.type) {
      case 'treasure':
        return <Gem className="w-3 h-3" />;
      case 'safe':
        return <Shield className="w-3 h-3" />;
      case 'trap':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <MapPin className="w-3 h-3" />;
    }
  };

  const getRoomColor = (room: ExploredRoom) => {
    if (room.isCurrentRoom) {
      return "bg-blue-600/30 border-blue-600";
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

  if (isLoadingRooms || (debugMode && isLoadingAllRooms)) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-slate-400">
            Loading map...
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const currentRoom = roomsToDisplay.find(room => room.isCurrentRoom);
  
  // Auto-center on current room when it changes, unless user is manually panning
  useEffect(() => {
    if (currentRoom && !isPanning && resetPanOnNextMove) {
      const mapElement = mapRef.current;
      if (mapElement) {
        const mapRect = mapElement.getBoundingClientRect();
        const centerX = mapRect.width / 2;
        const centerY = mapRect.height / 2;
        
        setPanOffset({
          x: centerX - currentRoom.x - 12,
          y: centerY - currentRoom.y - 12,
        });
        setResetPanOnNextMove(false);
      }
    }
  }, [currentRoom, isPanning, resetPanOnNextMove]);

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
            {debugMode && (
              <Badge variant="outline" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                DEBUG
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200 h-6 w-6 p-0"
            onClick={() => setResetPanOnNextMove(true)}
          >
            <Maximize2 className="w-3 h-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef}
          className="relative h-48 bg-slate-900/50 border border-slate-700 overflow-hidden rounded cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            className="absolute transition-transform duration-200"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
          >
            {roomsToDisplay.map((room) => (
              <div
                key={room.id}
                className={`absolute w-6 h-6 rounded border-2 flex items-center justify-center text-xs transition-all duration-200 ${getRoomColor(room)}`}
                style={{
                  left: room.x,
                  top: room.y,
                }}
                title={room.name}
              >
                {getRoomIcon(room)}
              </div>
            ))}
          </div>
          
          {roomsToDisplay.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              No rooms explored yet
            </div>
          )}
        </div>
        
        <div className="mt-3 text-xs text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Rooms: {roomsToDisplay.length}</span>
            <span>Floor {crawler.currentFloor}</span>
          </div>
          {currentRoom && (
            <div className="text-slate-300">
              Current: {currentRoom.name}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ExpandedMapViewProps {
  exploredRooms: ExploredRoom[];
}

function ExpandedMapView({ exploredRooms }: ExpandedMapViewProps) {
  const getRoomIcon = (room: ExploredRoom) => {
    if (room.isCurrentRoom) return <User className="w-4 h-4" />;
    switch (room.type) {
      case 'treasure':
        return <Gem className="w-4 h-4" />;
      case 'safe':
        return <Shield className="w-4 h-4" />;
      case 'trap':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getRoomColor = (room: ExploredRoom) => {
    if (room.isCurrentRoom) {
      return "bg-blue-600/40 border-blue-600 shadow-lg shadow-blue-600/20";
    }
    switch (room.type) {
      case 'entrance':
        return "bg-green-600/30 border-green-600/60";
      case 'safe':
        return "bg-green-600/30 border-green-600/60";
      case 'treasure':
        return "bg-yellow-600/30 border-yellow-600/60";
      case 'boss':
        return "bg-red-600/30 border-red-600/60";
      case 'exit':
        return "bg-purple-600/30 border-purple-600/60";
      case 'trap':
        return "bg-orange-600/30 border-orange-600/60";
      default:
        return "bg-slate-600/30 border-slate-600/60";
    }
  };

  return (
    <div className="relative w-full h-96 bg-slate-900/50 border border-slate-700 overflow-auto rounded">
      <div className="relative min-w-[800px] min-h-[600px]">
        {exploredRooms.map((room) => (
          <div
            key={room.id}
            className={`absolute w-8 h-8 rounded border-2 flex items-center justify-center transition-all duration-200 ${getRoomColor(room)}`}
            style={{
              left: room.x * 2,
              top: room.y * 2,
            }}
            title={room.name}
          >
            {getRoomIcon(room)}
          </div>
        ))}
      </div>
    </div>
  );
}