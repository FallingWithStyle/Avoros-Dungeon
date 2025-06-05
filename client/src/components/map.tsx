import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { CrawlerWithDetails } from "@shared/schema";

interface MiniMapProps {
  crawler: CrawlerWithDetails;
}

interface ExploredRoom {
  id: number;
  name: string;
  type: string;
  actualType?: string; // For scanned rooms, this contains the real room type
  environment: string;
  isSafe: boolean;
  hasLoot: boolean;
  x: number;
  y: number;
  isCurrentRoom: boolean;
  isExplored: boolean;
  isScanned?: boolean;
  floorId: number;
  factionId?: number | null;
}

interface Faction {
  id: number;
  name: string;
  color: string;
}

export default function MiniMap({ crawler }: MiniMapProps) {
  const [isMoving, setIsMoving] = useState(false);
  const [previousCurrentRoom, setPreviousCurrentRoom] =
    useState<ExploredRoom | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resetPanOnNextMove, setResetPanOnNextMove] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Fetch explored rooms with optimized refresh
  const { data: exploredRooms = [], isLoading: isLoadingRooms } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
    refetchInterval: 15000, // Reduced frequency from 5s to 15s
    staleTime: 60000, // Cache for 1 minute
    retry: false,
  });

  // Fetch full map bounds for proper boundary calculations
  const { data: mapBounds } = useQuery<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>({
    queryKey: [`/api/floors/${crawler.currentFloor}/bounds`],
    retry: false,
  });

  // Fetch faction data for room border colors
  const { data: factions = [] } = useQuery<Faction[]>({
    queryKey: ["/api/factions"],
    retry: false,
  });

  // Filter rooms for current floor (strict number comparison first, then string fallback)
  const floorRooms =
    exploredRooms?.filter(
      (room) =>
        room.floorId === crawler.currentFloor ||
        String(room.floorId) === String(crawler.currentFloor),
    ) ?? [];

  // Room Debug logging
  while (false) {
    console.log(
      "Current floor:",
      crawler.currentFloor,
      typeof crawler.currentFloor,
    );
    console.log(
      "Room:",
      exploredRooms?.map((r) => r),
    );
    console.log("Filtered floorRooms:", floorRooms);
  }

  // Track room changes for smooth transitions and reset pan
  useEffect(() => {
    if (floorRooms) {
      const currentRoom = floorRooms.find((room) => room.isCurrentRoom);
      if (
        currentRoom &&
        previousCurrentRoom &&
        currentRoom.id !== previousCurrentRoom.id
      ) {
        setIsMoving(true);

        // Reset pan offset when player moves
        if (resetPanOnNextMove) {
          setPanOffset({ x: 0, y: 0 });
          setResetPanOnNextMove(false);
        }

        setTimeout(() => setIsMoving(false), 800);
      }
      if (currentRoom) {
        setPreviousCurrentRoom(currentRoom);
      }
    }
  }, [floorRooms, previousCurrentRoom, resetPanOnNextMove]);

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
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Use full map bounds if available, otherwise fall back to visible area
      const boundsMinX = mapBounds?.minX ?? minX;
      const boundsMaxX = mapBounds?.maxX ?? maxX;
      const boundsMinY = mapBounds?.minY ?? minY;
      const boundsMaxY = mapBounds?.maxY ?? maxY;

      // Calculate 10% padding
      const mapWidthCells = boundsMaxX - boundsMinX + 1;
      const mapHeightCells = boundsMaxY - boundsMinY + 1;
      const paddingX = Math.ceil(mapWidthCells * 0.1);
      const paddingY = Math.ceil(mapHeightCells * 0.1);

      // Calculate padded map dimensions
      const paddedWidth = ((mapWidthCells + paddingX * 2) * 2 - 1) * 24 + 8;
      const paddedHeight = ((mapHeightCells + paddingY * 2) * 2 - 1) * 24 + 8;
      const containerWidth = 250;
      const containerHeight = 250;

      // Calculate maximum allowed pan offset to keep map within padded bounds
      const maxPanX = Math.max(0, (paddedWidth - containerWidth) / 2);
      const maxPanY = Math.max(0, (paddedHeight - containerHeight) / 2);

      setPanOffset({
        x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
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
      // Always show the blue dot for the player crawler location
      return (
        <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-blue-300 animate-pulse shadow-lg shadow-blue-400/50 z-10" />
      );
    }
    if (room.isExplored === false && !room.isScanned) {
      return (
        <div className="w-3 h-3 text-slate-500 text-xs flex items-center justify-center font-bold">
          ?
        </div>
      );
    }

    // For scanned rooms, use a different icon to indicate they're scanned but not explored
    if (room.isScanned) {
      return (
        <div className="w-3 h-3 text-slate-400 text-xs flex items-center justify-center font-bold border border-slate-400 rounded">
          S
        </div>
      );
    }

    // Check for safe rooms first (including entrance which is also safe)
    if (room.isSafe && room.type !== "entrance") {
      return <Shield className="w-3 h-3 text-green-400" />;
    }

    switch (room.type) {
      case "entrance":
        return <Home className="w-3 h-3 text-green-400" />;
      case "treasure":
        return <Gem className="w-3 h-3 text-yellow-400" />;
      case "boss":
      case "exit":
        return <Skull className="w-3 h-3 text-red-400" />;
      case "stairs":
        return <ArrowDown className="w-3 h-3 text-purple-400" />;
      default:
        return <div className="w-3 h-3 bg-slate-600 rounded" />;
    }
  };

  const getRoomColor = (room: ExploredRoom) => {
    //if (room.isCurrentRoom) {
    //  return ""; // No extra color/border/shadow for the player's room for now
    //}

    // Handle scanned rooms with color coding based on actual room type
    if (room.isScanned && room.actualType) {
      const opacity = "75"; // Lower opacity for scanned rooms
      if (room.isSafe) {
        return `bg-green-600/${opacity} border-green-600/30`;
      }
      switch (room.actualType) {
        case "entrance":
          return `bg-green-600/${opacity} border-green-600/30`;
        case "treasure":
          return `bg-yellow-600/${opacity} border-yellow-600/30`;
        case "boss":
        case "exit":
          return `bg-red-600/${opacity} border-red-600/30`;
        case "stairs":
          return `bg-purple-600/${opacity} border-purple-600/30`;
        default:
          return `bg-slate-600/${opacity} border-slate-600/30`;
      }
    }

    if (room.isExplored === false) {
      return "bg-slate-800/50 border-slate-600/50";
    }

    // Check for safe rooms first (including entrance)
    if (room.isSafe) {
      return "bg-green-600/20 border-green-600/50";
    }

    switch (room.type) {
      case "treasure":
        return "bg-yellow-600/20 border-yellow-600/50";
      case "boss":
      case "exit":
        return "bg-red-600/20 border-red-600/50";
      case "stairs":
        return "bg-purple-600/20 border-purple-600/50";
      default:
        return "bg-slate-600/20 border-slate-600/50";
    }
  };

  const getFactionBorderStyle = (room: ExploredRoom) => {
    if (!room.factionId) return {};
    
    const faction = factions.find(f => f.id === room.factionId);
    if (!faction) return {};
    
    return {
      borderColor: faction.color,
      borderWidth: '3px',
      borderStyle: 'solid',
    };
  };

  if (isLoadingRooms) {
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

  if (!floorRooms || floorRooms.length === 0) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Mini-Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            No rooms explored yet on this floor
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentRoom = floorRooms.find((r) => r.isCurrentRoom);
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

  const centerX = currentRoom.x;
  const centerY = currentRoom.y;
  const radius = 3;

  const minX = centerX - radius;
  const maxX = centerX + radius;
  const minY = centerY - radius;
  const maxY = centerY + radius;

  const roomMap = new Map();
  floorRooms.forEach((room) => {
    roomMap.set(`${room.x},${room.y}`, room);
  });

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {currentRoom?.name || "Mini-Map"}
          <Badge variant="outline" className="ml-auto text-xs">
            Floor {crawler.currentFloor}
          </Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2">
                <Maximize2 className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl w-full h-[90vh] bg-game-panel border-game-border p-4 flex flex-col">
              <DialogHeader className="shrink-0 pb-2">
                <DialogTitle className="text-slate-200 flex items-center justify-between w-full text-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Dungeon Map - Floor {crawler.currentFloor}
                  </div>
                  <ExpandedMapControls />
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 w-full h-full min-h-0">
                <ExpandedMapView exploredRooms={floorRooms} factions={factions} />
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
              style={{ height: "250px", width: "250px" }}
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
                  transition: isDragging ? "none" : "transform 0.3s ease",
                }}
              >
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${(maxX - minX + 1) * 2 - 1}, 1fr)`,
                  }}
                >
                  {Array.from(
                    {
                      length:
                        ((maxY - minY + 1) * 2 - 1) *
                        ((maxX - minX + 1) * 2 - 1),
                    },
                    (_, index) => {
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
                                isMoving && room.isCurrentRoom
                                  ? "scale-110 animate-pulse"
                                  : ""
                              }`}
                              style={getFactionBorderStyle(room)}
                              title={`${room.name} (${x}, ${y})`}
                            >
                              {getRoomIcon(room)}
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={`empty-${col}-${row}`}
                              className="w-6 h-6"
                            />
                          );
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
                            <div
                              key={`h-${leftX}-${rightX}-${y}`}
                              className="w-6 h-6 flex items-center justify-center"
                            >
                              <div className="w-4 h-0.5 bg-slate-500"></div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={`h-empty-${col}-${row}`}
                            className="w-6 h-6"
                          />
                        );
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
                            <div
                              key={`v-${x}-${topY}-${bottomY}`}
                              className="w-6 h-6 flex items-center justify-center"
                            >
                              <div className="w-0.5 h-4 bg-slate-500"></div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={`v-empty-${col}-${row}`}
                            className="w-6 h-6"
                          />
                        );
                      } else {
                        return (
                          <div
                            key={`intersection-${col}-${row}`}
                            className="w-6 h-6"
                          />
                        );
                      }
                    },
                  )}
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
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 text-slate-400 text-xs flex items-center justify-center font-bold border border-slate-400 rounded">
                  S
                </div>
                <span>Scanned</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 text-slate-500 text-xs flex items-center justify-center font-bold">
                  ?
                </div>
                <span>Unknown</span>
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
  factions: Faction[];
}

// Global state for expanded map controls
let expandedMapScale = 0.7; // Start more zoomed out
let expandedMapPanOffset = { x: 0, y: 0 };
let expandedMapSetters: {
  setScale: (scale: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
} | null = null;

// Expanded map controls component
function ExpandedMapControls() {
  const zoomIn = () => {
    expandedMapScale = Math.min(expandedMapScale * 1.2, 3);
    expandedMapSetters?.setScale(expandedMapScale);
  };

  const zoomOut = () => {
    expandedMapScale = Math.max(expandedMapScale / 1.2, 0.3);
    expandedMapSetters?.setScale(expandedMapScale);
  };

  const resetView = () => {
    expandedMapScale = 0.7;
    expandedMapPanOffset = { x: 0, y: 0 };
    expandedMapSetters?.setScale(expandedMapScale);
    expandedMapSetters?.setPanOffset(expandedMapPanOffset);
  };

  const centerOnPlayer = () => {
    expandedMapPanOffset = { x: 0, y: 0 };
    expandedMapSetters?.setPanOffset(expandedMapPanOffset);
  };

  return (
    <div className="flex items-center gap-2">
      <Button onClick={zoomIn} size="sm" variant="outline">
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button onClick={zoomOut} size="sm" variant="outline">
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button onClick={centerOnPlayer} size="sm" variant="outline">
        <MapPin className="w-4 h-4" />
      </Button>
      <Button onClick={resetView} size="sm" variant="outline">
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
}

function ExpandedMapView({ exploredRooms, factions }: ExpandedMapViewProps) {
  const [scale, setScale] = useState(expandedMapScale);
  const [panOffset, setPanOffset] = useState(expandedMapPanOffset);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Register setters for global control
  React.useEffect(() => {
    expandedMapSetters = { setScale, setPanOffset };
    return () => {
      expandedMapSetters = null;
    };
  }, [setScale, setPanOffset]);

  // Keyboard event handlers
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
        setKeys(prev => new Set(prev).add(e.key.toLowerCase()));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        setKeys(prev => {
          const newKeys = new Set(prev);
          newKeys.delete(e.key.toLowerCase());
          return newKeys;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle WASD movement
  React.useEffect(() => {
    if (keys.size === 0) return;

    const moveSpeed = 10;
    const interval = setInterval(() => {
      const deltaX = (keys.has('d') ? moveSpeed : 0) + (keys.has('a') ? -moveSpeed : 0);
      const deltaY = (keys.has('s') ? moveSpeed : 0) + (keys.has('w') ? -moveSpeed : 0);

      if (deltaX !== 0 || deltaY !== 0) {
        setPanOffset(current => {
          // Calculate bounds for keyboard movement (same logic as mouse dragging)
          const minX = Math.min(...exploredRooms.map((r) => r.x));
          const maxX = Math.max(...exploredRooms.map((r) => r.x));
          const minY = Math.min(...exploredRooms.map((r) => r.y));
          const maxY = Math.max(...exploredRooms.map((r) => r.y));

          const mapWidthCells = maxX - minX + 1;
          const mapHeightCells = maxY - minY + 1;
          const paddingX = Math.ceil(mapWidthCells * 0.1);
          const paddingY = Math.ceil(mapHeightCells * 0.1);

          const paddedWidth = ((mapWidthCells + paddingX * 2) * 2 - 1) * 48 * scale + 16;
          const paddedHeight = ((mapHeightCells + paddingY * 2) * 2 - 1) * 48 * scale + 16;
          const containerWidth = 880;
          const containerHeight = 600;

          const maxPanX = Math.max(0, (paddedWidth - containerWidth) / 2);
          const maxPanY = Math.max(0, (paddedHeight - containerHeight) / 2);

          const newOffset = {
            x: Math.max(-maxPanX, Math.min(maxPanX, current.x + deltaX)),
            y: Math.max(-maxPanY, Math.min(maxPanY, current.y + deltaY)),
          };

          expandedMapPanOffset = newOffset;
          return newOffset;
        });
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [keys, scale, exploredRooms]);

  // Mouse wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, scale * zoomFactor));
    
    expandedMapScale = newScale;
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Calculate 10% padding for expanded view
      const mapWidthCells = maxX - minX + 1;
      const mapHeightCells = maxY - minY + 1;
      const paddingX = Math.ceil(mapWidthCells * 0.1);
      const paddingY = Math.ceil(mapHeightCells * 0.1);

      // Calculate padded map dimensions for expanded view with larger container
      const paddedWidth =
        ((mapWidthCells + paddingX * 2) * 2 - 1) * 48 * scale + 16;
      const paddedHeight =
        ((mapHeightCells + paddingY * 2) * 2 - 1) * 48 * scale + 16;
      const containerWidth = 880; // Account for padding and borders
      const containerHeight = 600; // Will be dynamically sized by CSS

      // Calculate maximum allowed pan offset to keep map within padded bounds
      const maxPanX = Math.max(0, (paddedWidth - containerWidth) / 2);
      const maxPanY = Math.max(0, (paddedHeight - containerHeight) / 2);

      const newOffset = {
        x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
      };

      setPanOffset(newOffset);
      expandedMapPanOffset = newOffset;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getRoomIcon = (room: ExploredRoom) => {
    if (room.isCurrentRoom) {
      // Always show the blue dot for the player crawler location
      return (
        <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-blue-300 animate-pulse shadow-lg shadow-blue-400/50 z-10" />
      );
    }
    if (!room.isExplored && !room.isScanned) {
      return (
        <div className="w-6 h-6 text-slate-500 text-sm flex items-center justify-center font-bold">
          ?
        </div>
      );
    }

    // For scanned rooms, use a different icon to indicate they're scanned but not explored
    if (room.isScanned) {
      return (
        <div className="w-6 h-6 text-slate-400 text-sm flex items-center justify-center font-bold border border-slate-400 rounded">
          S
        </div>
      );
    }

    // Check for safe rooms first (by isSafe property)
    if (room.isSafe) {
      return <Shield className="w-6 h-6 text-green-400" />;
    }

    switch (room.type) {
      case "entrance":
        return <Home className="w-6 h-6 text-green-400" />;
      case "treasure":
        return <Gem className="w-6 h-6 text-yellow-400" />;
      case "boss":
      case "exit":
        return <Skull className="w-6 h-6 text-red-400" />;
      case "stairs":
        return <ArrowDown className="w-6 h-6 text-purple-400" />;
      default:
        return <div className="w-6 h-6 bg-slate-600 rounded" />;
    }
  };

  const getRoomColor = (room: ExploredRoom) => {
    // Handle scanned rooms with color coding based on actual room type
    if (room.isScanned && room.actualType) {
      const opacity = "15"; // Lower opacity for scanned rooms
      if (room.isSafe) {
        return `bg-green-600/${opacity} border-green-600/30`;
      }
      switch (room.actualType) {
        case "entrance":
          return `bg-green-600/${opacity} border-green-600/30`;
        case "treasure":
          return `bg-yellow-600/${opacity} border-yellow-600/30`;
        case "boss":
        case "exit":
          return `bg-red-600/${opacity} border-red-600/30`;
        case "stairs":
          return `bg-purple-600/${opacity} border-purple-600/30`;
        default:
          return `bg-slate-600/${opacity} border-slate-600/30`;
      }
    }

    if (!room.isExplored) {
      return "bg-slate-800/50 border-slate-600/50";
    }

    // Check for safe rooms first (by isSafe property)
    if (room.isSafe) {
      return "bg-green-600/20 border-green-600/50";
    }

    switch (room.type) {
      case "entrance":
        return "bg-green-600/20 border-green-600/50";
      case "treasure":
        return "bg-yellow-600/20 border-yellow-600/50";
      case "boss":
      case "exit":
        return "bg-red-600/20 border-red-600/50";
      case "stairs":
        return "bg-purple-600/20 border-purple-600/50";
      default:
        return "bg-slate-600/20 border-slate-600/50";
    }
  };

  const getExpandedFactionBorderStyle = (room: ExploredRoom) => {
    if (!room.factionId) return {};
    
    const faction = factions.find(f => f.id === room.factionId);
    if (!faction) return {};
    
    return {
      borderColor: faction.color,
      borderWidth: '4px',
      borderStyle: 'solid',
    };
  };

  if (!exploredRooms || exploredRooms.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        No rooms explored yet on this floor
      </div>
    );
  }

  // Calculate bounds
  const minX = Math.min(...exploredRooms.map((r) => r.x));
  const maxX = Math.max(...exploredRooms.map((r) => r.x));
  const minY = Math.min(...exploredRooms.map((r) => r.y));
  const maxY = Math.max(...exploredRooms.map((r) => r.y));

  // Create room map
  const roomMap = new Map();
  exploredRooms.forEach((room) => {
    roomMap.set(`${room.x},${room.y}`, room);
  });

  return (
    <div className="h-full">
      {/* Map container - uses full available height */}
      <div
        ref={mapContainerRef}
        className="overflow-hidden border border-slate-600 bg-slate-900/50 rounded cursor-move select-none relative mx-auto h-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ width: "100%", maxWidth: "900px" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        tabIndex={0}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.3s ease",
          }}
        >
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${(maxX - minX + 1) * 2 - 1}, 1fr)`,
            }}
          >
            {Array.from(
              {
                length:
                  ((maxY - minY + 1) * 2 - 1) * ((maxX - minX + 1) * 2 - 1),
              },
              (_, index) => {
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
                        style={getExpandedFactionBorderStyle(room)}
                        title={`${room.name} (${x}, ${y})`}
                      >
                        {getRoomIcon(room)}
                        {room.isCurrentRoom && (
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-blue-300 animate-pulse shadow-lg shadow-blue-400/50 z-10" />
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div key={`empty-${col}-${row}`} className="w-12 h-12" />
                    );
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
                      <div
                        key={`h-${leftX}-${rightX}-${y}`}
                        className="w-12 h-12 flex items-center justify-center"
                      >
                        <div className="w-8 h-1 bg-slate-500"></div>
                      </div>
                    );
                  }
                  return (
                    <div key={`h-empty-${col}-${row}`} className="w-12 h-12" />
                  );
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
                      <div
                        key={`v-${x}-${topY}-${bottomY}`}
                        className="w-12 h-12 flex items-center justify-center"
                      >
                        <div className="w-1 h-8 bg-slate-500"></div>
                      </div>
                    );
                  }
                  return (
                    <div key={`v-empty-${col}-${row}`} className="w-12 h-12" />
                  );
                } else {
                  // Intersection
                  return (
                    <div
                      key={`intersection-${col}-${row}`}
                      className="w-12 h-12"
                    />
                  );
                }
              },
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
