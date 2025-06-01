import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Maximize2, User, Gem, Shield, AlertTriangle, MapPin, Eye, Zap, Search } from "lucide-react";

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

interface EnhancedMiniMapProps {
  crawler: CrawlerWithDetails;
}

interface RoomKnowledge {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  visibilityLevel: 'unknown' | 'glimpsed' | 'explored' | 'surveyed' | 'scanned';
  isCurrentRoom: boolean;
  revealedBy?: string;
  hasConnections?: boolean;
  hasLoot?: boolean;
  hasEnemies?: boolean;
  hazardLevel?: 'safe' | 'low' | 'medium' | 'high' | 'extreme';
}

export default function EnhancedMiniMap({ crawler }: EnhancedMiniMapProps) {
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resetPanOnNextMove, setResetPanOnNextMove] = useState(false);
  const [viewMode, setViewMode] = useState<'normal' | 'enhanced' | 'tactical'>('normal');
  const mapRef = useRef<HTMLDivElement>(null);
  
  // Fetch map knowledge for this crawler
  const { data: mapKnowledge, isLoading: isLoadingMap } = useQuery<RoomKnowledge[]>({
    queryKey: [`/api/crawlers/${crawler.id}/map-knowledge`],
    retry: false,
    refetchInterval: 3000,
  });

  // Calculate map visibility capabilities based on crawler stats and equipment
  const getMapCapabilities = () => {
    const baseRange = 1; // Base visibility range
    const witBonus = Math.floor(crawler.wit / 2); // Wit enhances perception
    const memoryBonus = Math.floor(crawler.memory / 3); // Memory helps retain map data
    
    return {
      perceptionRange: baseRange + witBonus,
      retentionBonus: memoryBonus,
      canDetectHazards: crawler.wit >= 4,
      canDetectLoot: crawler.wit >= 3,
      canSurveyConnections: crawler.memory >= 5,
      enhancedMode: crawler.level >= 3, // Unlock enhanced view at level 3
      tacticalMode: crawler.level >= 7,  // Unlock tactical view at level 7
    };
  };

  const capabilities = getMapCapabilities();

  const getRoomIcon = (room: RoomKnowledge) => {
    if (room.isCurrentRoom) return <User className="w-3 h-3" />;
    
    // Show different detail levels based on visibility
    switch (room.visibilityLevel) {
      case 'unknown':
        return <div className="w-2 h-2 bg-slate-600 rounded-full" />;
      case 'glimpsed':
        return <div className="w-2 h-2 bg-slate-400 rounded-full" />;
      case 'explored':
        switch (room.type) {
          case 'treasure': return <Gem className="w-3 h-3" />;
          case 'safe': return <Shield className="w-3 h-3" />;
          case 'trap': return <AlertTriangle className="w-3 h-3" />;
          default: return <MapPin className="w-3 h-3" />;
        }
      case 'surveyed':
      case 'scanned':
        // Full detail with additional indicators
        const icon = (() => {
          switch (room.type) {
            case 'treasure': return <Gem className="w-3 h-3" />;
            case 'safe': return <Shield className="w-3 h-3" />;
            case 'trap': return <AlertTriangle className="w-3 h-3" />;
            default: return <MapPin className="w-3 h-3" />;
          }
        })();
        
        return (
          <div className="relative">
            {icon}
            {room.hasLoot && <div className="absolute -top-1 -right-1 w-1 h-1 bg-yellow-400 rounded-full" />}
            {room.hasEnemies && <div className="absolute -bottom-1 -right-1 w-1 h-1 bg-red-400 rounded-full" />}
          </div>
        );
      default:
        return <MapPin className="w-3 h-3" />;
    }
  };

  const getRoomColor = (room: RoomKnowledge) => {
    if (room.isCurrentRoom) {
      return "bg-blue-600/30 border-blue-600 shadow-md";
    }

    const baseColors = {
      unknown: "bg-slate-800/20 border-slate-700/30",
      glimpsed: "bg-slate-700/20 border-slate-600/40",
      explored: {
        entrance: "bg-green-600/20 border-green-600/50",
        safe: "bg-green-600/20 border-green-600/50",
        treasure: "bg-yellow-600/20 border-yellow-600/50",
        boss: "bg-red-600/20 border-red-600/50",
        exit: "bg-purple-600/20 border-purple-600/50",
        trap: "bg-orange-600/20 border-orange-600/50",
        default: "bg-slate-600/20 border-slate-600/50"
      },
      surveyed: {
        entrance: "bg-green-600/30 border-green-600/70",
        safe: "bg-green-600/30 border-green-600/70", 
        treasure: "bg-yellow-600/30 border-yellow-600/70",
        boss: "bg-red-600/30 border-red-600/70",
        exit: "bg-purple-600/30 border-purple-600/70",
        trap: "bg-orange-600/30 border-orange-600/70",
        default: "bg-slate-600/30 border-slate-600/70"
      },
      scanned: {
        entrance: "bg-green-600/40 border-green-600/90",
        safe: "bg-green-600/40 border-green-600/90",
        treasure: "bg-yellow-600/40 border-yellow-600/90",
        boss: "bg-red-600/40 border-red-600/90",
        exit: "bg-purple-600/40 border-purple-600/90",
        trap: "bg-orange-600/40 border-orange-600/90",
        default: "bg-slate-600/40 border-slate-600/90"
      }
    };

    if (room.visibilityLevel === 'unknown' || room.visibilityLevel === 'glimpsed') {
      return baseColors[room.visibilityLevel];
    }

    const typeColors = baseColors[room.visibilityLevel] as Record<string, string>;
    return typeColors[room.type] || typeColors.default;
  };

  const getRoomSize = (room: RoomKnowledge) => {
    switch (room.visibilityLevel) {
      case 'unknown': return "w-2 h-2";
      case 'glimpsed': return "w-3 h-3";
      case 'explored': return "w-5 h-5";
      case 'surveyed': return "w-6 h-6";
      case 'scanned': return "w-7 h-7";
      default: return "w-4 h-4";
    }
  };

  const getViewModeIcon = () => {
    switch (viewMode) {
      case 'enhanced': return <Eye className="w-3 h-3" />;
      case 'tactical': return <Search className="w-3 h-3" />;
      default: return <MapPin className="w-3 h-3" />;
    }
  };

  const getViewModeDescription = () => {
    switch (viewMode) {
      case 'enhanced': return "Enhanced view - Shows detailed room information";
      case 'tactical': return "Tactical view - Reveals threats and strategic data";
      default: return "Normal view - Basic exploration data";
    }
  };

  if (isLoadingMap) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Enhanced Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-slate-400">
            Loading map data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const roomsToDisplay = mapKnowledge || [];

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

  // Auto-center on current room when it changes
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

  const cycleViewMode = () => {
    if (viewMode === 'normal') {
      if (capabilities.enhancedMode) {
        setViewMode('enhanced');
      }
    } else if (viewMode === 'enhanced') {
      if (capabilities.tacticalMode) {
        setViewMode('tactical');
      } else {
        setViewMode('normal');
      }
    } else {
      setViewMode('normal');
    }
  };

  const exploredCount = roomsToDisplay.filter(r => r.visibilityLevel !== 'unknown').length;
  const totalVisible = roomsToDisplay.length;

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getViewModeIcon()}
            Enhanced Map
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50">
              {viewMode.toUpperCase()}
            </Badge>
            {capabilities.perceptionRange > 1 && (
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50">
                +{capabilities.perceptionRange - 1} Range
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-200 h-6 w-6 p-0"
              onClick={cycleViewMode}
              title={getViewModeDescription()}
            >
              <Zap className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-200 h-6 w-6 p-0"
              onClick={() => setResetPanOnNextMove(true)}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
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
                className={`absolute ${getRoomSize(room)} rounded border-2 flex items-center justify-center text-xs transition-all duration-200 ${getRoomColor(room)}`}
                style={{
                  left: room.x,
                  top: room.y,
                }}
                title={`${room.name} (${room.visibilityLevel})`}
              >
                {getRoomIcon(room)}
              </div>
            ))}
          </div>
          
          {roomsToDisplay.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              No map data available
            </div>
          )}
        </div>
        
        <div className="mt-3 text-xs text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Explored: {exploredCount}/{totalVisible}</span>
            <span>Floor {crawler.currentFloor}</span>
          </div>
          {currentRoom && (
            <div className="text-slate-300">
              Current: {currentRoom.name}
            </div>
          )}
          <div className="flex gap-2 text-xs">
            <span>Perception: {capabilities.perceptionRange}</span>
            <span>Memory: +{capabilities.retentionBonus}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}