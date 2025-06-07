
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

interface DungeonMapProps {
  crawler: CrawlerWithDetails;
}

interface ExploredRoom {
  id: number | string;
  name: string;
  type: string;
  actualType?: string;
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
  hasEnemies?: boolean;
  enemyCount?: number;
  playerCount?: number;
  playersHere?: string[];
  neutralCount?: number;
  isUnexploredNeighbor?: boolean;
}

interface Faction {
  id: number;
  name: string;
  color: string;
}

// Helper function to get the icon for a room
const getRoomIcon = (
  room: ExploredRoom,
  isExpanded: boolean = false,
  actualCurrentRoomId?: number | string,
) => {
  const iconSize = isExpanded ? "w-6 h-6" : "w-3 h-3";
  const textSize = isExpanded ? "text-sm" : "text-xs";

  if (room.id === actualCurrentRoomId) {
    return (
      <div
        className={`${iconSize} bg-blue-500 rounded-full border-2 border-blue-300 animate-pulse shadow-lg shadow-blue-400/50 z-10`}
      />
    );
  }
  if (room.isUnexploredNeighbor) {
    return (
      <div
        className={`${iconSize} text-slate-500 ${textSize} flex items-center justify-center font-bold`}
      >
        ?
      </div>
    );
  }
  if (room.isExplored === false && !room.isScanned) {
    return (
      <div
        className={`${iconSize} text-slate-500 ${textSize} flex items-center justify-center font-bold`}
      >
        ?
      </div>
    );
  }
  if (room.isScanned) {
    return (
      <div
        className={`${iconSize} text-slate-400 ${textSize} flex items-center justify-center font-bold border border-slate-400 rounded`}
      >
        S
      </div>
    );
  }
  if (room.isSafe && room.type !== "entrance") {
    return <Shield className={`${iconSize} text-green-400`} />;
  }
  switch (room.type) {
    case "entrance":
      return <Home className={`${iconSize} text-green-400`} />;
    case "treasure":
      return <Gem className={`${iconSize} text-yellow-400`} />;
    case "boss":
    case "exit":
      return <Skull className={`${iconSize} text-red-400`} />;
    case "stairs":
      return <ArrowDown className={`${iconSize} text-purple-400`} />;
    default:
      return <div className={`${iconSize} bg-slate-600 rounded`} />;
  }
};

const getRoomIndicators = (room: ExploredRoom, isExpanded: boolean = false) => {
  const indicators = [];
  if (room.isUnexploredNeighbor) return indicators;

  if (isExpanded) {
    if (room.hasEnemies) {
      indicators.push(
        <div
          key="enemy"
          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-red-300 animate-pulse flex items-center justify-center"
          title="Enemies present"
        >
          <Skull className="w-2 h-2 text-white" />
        </div>,
      );
    }
    if (room.neutralCount && room.neutralCount > 0) {
      indicators.push(
        <div
          key="neutral"
          className="absolute -top-1 -left-1 w-4 h-3 bg-orange-400 rounded-full border border-orange-200 flex items-center justify-center text-xs font-bold text-white"
          title={`${room.neutralCount} neutral creatures`}
        >
          {room.neutralCount}
        </div>,
      );
    }
    if (room.playerCount && room.playerCount > 1) {
      indicators.push(
        <div
          key="players"
          className="absolute -bottom-1 -right-1 w-4 h-3 bg-cyan-400 rounded-full border border-cyan-200 flex items-center justify-center text-xs font-bold text-white"
          title={`${room.playerCount} players here`}
        >
          {room.playerCount}
        </div>,
      );
    }
  } else {
    if (room.hasEnemies) {
      indicators.push(
        <div
          key="enemy"
          className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-red-300 animate-pulse"
          title="Enemies present"
        />,
      );
    }
    if (room.neutralCount && room.neutralCount > 0) {
      indicators.push(
        <div
          key="neutral"
          className="absolute -top-1 -left-1 w-2 h-2 bg-orange-400 rounded-full border border-orange-200"
          title={`${room.neutralCount} neutral creatures`}
        />,
      );
    }
    if (room.playerCount && room.playerCount > 1) {
      indicators.push(
        <div
          key="players"
          className="absolute -bottom-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full border border-cyan-200"
          title={`${room.playerCount} players here`}
        />,
      );
    }
  }
  return indicators;
};

const getRoomColor = (room: ExploredRoom, factions: Faction[]) => {
  if (room.isUnexploredNeighbor) {
    return "bg-slate-800/30 border-dashed border-slate-600/30";
  }
  const hasFactionBorder =
    room.factionId && factions.find((f) => f.id === room.factionId);
  if (room.isScanned && room.actualType) {
    const opacity = "50";
    if (room.isSafe) {
      return hasFactionBorder
        ? `bg-green-600/${opacity}`
        : `bg-green-600/${opacity} border-green-600/40`;
    }
    switch (room.actualType) {
      case "entrance":
        return hasFactionBorder
          ? `bg-green-600/${opacity}`
          : `bg-green-600/${opacity} border-green-600/40`;
      case "treasure":
        return hasFactionBorder
          ? `bg-yellow-600/${opacity}`
          : `bg-yellow-600/${opacity} border-yellow-600/40`;
      case "boss":
      case "exit":
        return hasFactionBorder
          ? `bg-red-600/${opacity}`
          : `bg-red-600/${opacity} border-red-600/40`;
      case "stairs":
        return hasFactionBorder
          ? `bg-purple-600/${opacity}`
          : `bg-purple-600/${opacity} border-purple-600/40`;
      default:
        return hasFactionBorder
          ? `bg-slate-600/${opacity}`
          : `bg-slate-600/${opacity} border-slate-600/40`;
    }
  }
  if (room.isExplored === false && !room.isScanned) {
    return hasFactionBorder
      ? "bg-slate-800/30"
      : "bg-slate-800/30 border-slate-600/30";
  }
  if (room.isSafe) {
    return hasFactionBorder
      ? "bg-green-600/20"
      : "bg-green-600/20 border-green-600/50";
  }
  switch (room.type) {
    case "treasure":
      return hasFactionBorder
        ? "bg-yellow-600/20"
        : "bg-yellow-600/20 border-yellow-600/50";
    case "boss":
    case "exit":
      return hasFactionBorder
        ? "bg-red-600/20"
        : "bg-red-600/20 border-red-600/50";
    case "stairs":
      return hasFactionBorder
        ? "bg-purple-600/20"
        : "bg-purple-600/20 border-purple-600/50";
    default:
      return hasFactionBorder
        ? "bg-slate-600/20"
        : "bg-slate-600/20 border-slate-600/50";
  }
};

const getFactionBorderStyle = (
  room: ExploredRoom,
  isExpanded: boolean = false,
  factions: Faction[],
) => {
  if (!room.factionId || room.isUnexploredNeighbor) return {};
  const faction = factions.find((f) => f.id === room.factionId);
  if (!faction) return {};
  const borderWidth = isExpanded
    ? room.isScanned
      ? "3px"
      : "4px"
    : room.isScanned
      ? "2px"
      : "3px";
  if (room.isScanned) {
    return {
      borderColor: faction.color,
      borderWidth,
      borderStyle: "dashed",
      opacity: 0.6,
    };
  }
  return {
    borderColor: faction.color,
    borderWidth,
    borderStyle: "solid",
  };
};

export default function DungeonMap(props: DungeonMapProps | undefined) {
  const crawler = props?.crawler;
  if (!crawler) {
    return <div>Loading crawler data...</div>;
  }

  const [isMoving, setIsMoving] = useState(false);
  const [previousCurrentRoom, setPreviousCurrentRoom] =
    useState<ExploredRoom | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resetPanOnNextMove, setResetPanOnNextMove] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  // Fetch explored rooms
  const { data: exploredRooms = [], isLoading: isLoadingRooms } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
    refetchInterval: 30000,
    staleTime: 120000,
    retry: false,
  });

  // Fetch scanned rooms
  const { data: scannedRooms = [] } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/scanned-rooms`],
    refetchInterval: 30000,
    staleTime: 120000,
    retry: false,
  });

  // Fetch map bounds
  const { data: mapBounds } = useQuery<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>({
    queryKey: [`/api/floors/${crawler.currentFloor}/bounds`],
    retry: false,
  });

  // Fetch factions
  const { data: factions = [] } = useQuery<Faction[]>({
    queryKey: ["/api/factions"],
    retry: false,
  });

  // Fetch current room
  const { data: currentRoomData } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/current-room`],
    refetchInterval: 5000,
    staleTime: 30000,
    retry: false,
  });

  // Filter for current floor
  const floorRooms =
    exploredRooms?.filter(
      (room) =>
        room.floorId === crawler.currentFloor ||
        String(room.floorId) === String(crawler.currentFloor),
    ) ?? [];
  const floorScannedRooms =
    scannedRooms?.filter(
      (room) =>
        room.floorId === crawler.currentFloor ||
        String(room.floorId) === String(crawler.currentFloor),
    ) ?? [];

  // Current room ID
  const actualCurrentRoomId = currentRoomData?.room?.id;

  // Track room changes for smooth transitions and reset pan
  useEffect(() => {
    if (floorRooms && actualCurrentRoomId) {
      const currentRoom = floorRooms.find(
        (room) => room.id === actualCurrentRoomId,
      );
      if (
        currentRoom &&
        previousCurrentRoom &&
        currentRoom.id !== previousCurrentRoom.id
      ) {
        setIsMoving(true);
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
  }, [
    floorRooms,
    actualCurrentRoomId,
    previousCurrentRoom,
    resetPanOnNextMove,
  ]);

  // Mouse dragging for pan
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
      // fallback values for minX, maxX, etc. for initial render
      const minX = 0,
        maxX = 0,
        minY = 0,
        maxY = 0;
      const boundsMinX = mapBounds?.minX ?? minX;
      const boundsMaxX = mapBounds?.maxX ?? maxX;
      const boundsMinY = mapBounds?.minY ?? minY;
      const boundsMaxY = mapBounds?.maxY ?? maxY;
      const mapWidthCells = boundsMaxX - boundsMinX + 1;
      const mapHeightCells = boundsMaxY - boundsMinY + 1;
      const paddingX = Math.ceil(mapWidthCells * 0.1);
      const paddingY = Math.ceil(mapHeightCells * 0.1);
      const paddedWidth = ((mapWidthCells + paddingX * 2) * 2 - 1) * 24 + 8;
      const paddedHeight = ((mapHeightCells + paddingY * 2) * 2 - 1) * 24 + 8;
      const containerWidth = 250;
      const containerHeight = 250;
      const maxPanX = Math.max(0, (paddedWidth - containerWidth) / 2);
      const maxPanY = Math.max(0, (paddedHeight - containerHeight) / 2);
      setPanOffset({
        x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
      });
    }
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

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
  // Find current room
  const currentRoom =
    floorRooms.find((r) => r.id === actualCurrentRoomId) ||
    floorRooms.find((r) => r.isCurrentRoom);

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
          <div className="text-sm text-slate-400">
            No current room found. Crawler floor: {crawler.currentFloor}
            {floorRooms.length > 0 && (
              <div className="mt-1 text-xs">
                Found {floorRooms.length} rooms on this floor, but none marked
                as current.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Map bounds (centered on current room)
  const centerX = currentRoom.x;
  const centerY = currentRoom.y;
  const radius = 3;
  const minX = centerX - radius;
  const maxX = centerX + radius;
  const minY = centerY - radius;
  const maxY = centerY + radius;

  // Build roomMapMini: explored, scanned, and unexplored neighbors
  const roomMapMini = new Map<string, ExploredRoom>();
  
  // Add explored rooms to the map
  if (floorRooms && Array.isArray(floorRooms)) {
    floorRooms.forEach((room) => {
      if (room && typeof room.x === 'number' && typeof room.y === 'number') {
        roomMapMini.set(`${room.x},${room.y}`, {
          ...room,
          isCurrentRoom: room.id === actualCurrentRoomId,
        });
      }
    });
  }
  
  // Add scanned rooms to the map
  if (floorScannedRooms && Array.isArray(floorScannedRooms)) {
    floorScannedRooms.forEach((room) => {
      if (room && typeof room.x === 'number' && typeof room.y === 'number') {
        const key = `${room.x},${room.y}`;
        if (!roomMapMini.has(key)) {
          roomMapMini.set(key, {
            ...room,
            isScanned: true,
            isCurrentRoom: room.id === actualCurrentRoomId,
          });
        }
      }
    });
  }

  // Add unexplored neighbors
  const addUnexploredNeighbors = () => {
    // Only add for explored or scanned rooms
    const roomsToCheck = Array.from(roomMapMini.values());
    roomsToCheck.forEach((room) => {
      if (room && (room.isExplored || room.isScanned)) {
        const neighbors = [
          [room.x + 1, room.y],
          [room.x - 1, room.y],
          [room.x, room.y + 1],
          [room.x, room.y - 1],
        ];
        
        neighbors.forEach(([x, y]) => {
          const key = `${x},${y}`;
          if (!roomMapMini.has(key)) {
            roomMapMini.set(key, {
              id: `unexplored-${x}-${y}`,
              name: "Unexplored Neighbor",
              type: "unknown",
              environment: "unknown",
              isSafe: false,
              hasLoot: false,
              x,
              y,
              floorId: crawler.currentFloor,
              isCurrentRoom: false,
              isExplored: false,
              isScanned: false,
              isUnexploredNeighbor: true,
            });
          }
        });
      }
    });
  };
  
  // Call the function to add unexplored neighbors
  addUnexploredNeighbors();

  // Only connect real rooms (explored or scanned, not unexplored neighbor)
  const isRealRoom = (room: ExploredRoom | undefined) =>
    room &&
    !room.isUnexploredNeighbor &&
    (room.isExplored || room.isScanned || room.isCurrentRoom);

  const hasConnection = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): boolean => {
    const room1 = roomMapMini.get(`${x1},${y1}`);
    const room2 = roomMapMini.get(`${x2},${y2}`);
    return isRealRoom(room1) && isRealRoom(room2);
  };

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
                <ExpandedMapView
                  exploredRooms={[...roomMapMini.values()]}
                  factions={factions}
                  actualCurrentRoomId={actualCurrentRoomId}
                />
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
                    gridTemplateColumns: `repeat(${
                      (maxX - minX + 1) * 2 - 1
                    }, 1fr)`,
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
                        const room = roomMapMini.get(`${x},${y}`);
                        if (room) {
                          return (
                            <div
                              key={`room-${room.id}`}
                              className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-all duration-300 relative ${getRoomColor(
                                room,
                                factions,
                              )} ${
                                isMoving && room.id === actualCurrentRoomId
                                  ? "scale-110 animate-pulse"
                                  : ""
                              }`}
                              style={getFactionBorderStyle(
                                room,
                                false,
                                factions,
                              )}
                              title={`${room.name} (${x}, ${y})`}
                            >
                              {getRoomIcon(room, false, actualCurrentRoomId)}
                              {getRoomIndicators(room, false)}
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
                        if (hasConnection(leftX, y, rightX, y)) {
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
                        if (hasConnection(x, topY, x, bottomY)) {
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
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span>Enemies</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-400 rounded-full" />
                <span>Neutral Mobs</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                <span>Players</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ExpandedMapViewProps {
  exploredRooms: ExploredRoom[];
  factions: Faction[];
  actualCurrentRoomId?: number | string;
}

let expandedMapScale = 0.7;
let expandedMapPanOffset = { x: 0, y: 0 };
let expandedMapSetters: {
  setScale: (scale: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
} | null = null;

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
  return (
    <div className="flex items-center gap-2 mr-8">
      <Button onClick={zoomOut} size="sm" variant="outline">
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button onClick={zoomIn} size="sm" variant="outline">
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button onClick={resetView} size="sm" variant="outline">
        <RotateCcw className="w-4 h-4" />
      </Button>
    </div>
  );
}

function ExpandedMapView({
  exploredRooms,
  factions,
  actualCurrentRoomId,
}: ExpandedMapViewProps) {
  const [scale, setScale] = useState(expandedMapScale);
  const [panOffset, setPanOffset] = useState(expandedMapPanOffset);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    expandedMapSetters = { setScale, setPanOffset };
    return () => {
      expandedMapSetters = null;
    };
  }, [setScale, setPanOffset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
        e.preventDefault();
        setKeys((prev) => new Set(prev).add(e.key.toLowerCase()));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (["w", "a", "s", "d", "W", "A", "S", "D"].includes(e.key)) {
        setKeys((prev) => {
          const newKeys = new Set(prev);
          newKeys.delete(e.key.toLowerCase());
          return newKeys;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (keys.size === 0) return;
    const moveSpeed = 10;
    const interval = setInterval(() => {
      const deltaX =
        (keys.has("d") ? moveSpeed : 0) + (keys.has("a") ? -moveSpeed : 0);
      const deltaY =
        (keys.has("s") ? moveSpeed : 0) + (keys.has("w") ? -moveSpeed : 0);
      if (deltaX !== 0 || deltaY !== 0) {
        setPanOffset((current) => {
          const minX = Math.min(...exploredRooms.map((r) => r.x));
          const maxX = Math.max(...exploredRooms.map((r) => r.x));
          const minY = Math.min(...exploredRooms.map((r) => r.y));
          const maxY = Math.max(...exploredRooms.map((r) => r.y));
          const mapWidthCells = maxX - minX + 1;
          const mapHeightCells = maxY - minY + 1;
          const paddingX = Math.ceil(mapWidthCells * 0.1);
          const paddingY = Math.ceil(mapHeightCells * 0.1);
          const paddedWidth =
            ((mapWidthCells + paddingX * 2) * 2 - 1) * 48 * scale + 16;
          const paddedHeight =
            ((mapHeightCells + paddingY * 2) * 2 - 1) * 48 * scale + 16;
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
    }, 16);
    return () => clearInterval(interval);
  }, [keys, scale, exploredRooms]);

  const handleWheel = (e: React.WheelEvent) => {
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
      const minX = Math.min(...exploredRooms.map((r) => r.x));
      const maxX = Math.max(...exploredRooms.map((r) => r.x));
      const minY = Math.min(...exploredRooms.map((r) => r.y));
      const maxY = Math.max(...exploredRooms.map((r) => r.y));
      const mapWidthCells = maxX - minX + 1;
      const mapHeightCells = maxY - minY + 1;
      const paddingX = Math.ceil(mapWidthCells * 0.1);
      const paddingY = Math.ceil(mapHeightCells * 0.1);
      const paddedWidth =
        ((mapWidthCells + paddingX * 2) * 2 - 1) * 48 * scale + 16;
      const paddedHeight =
        ((mapHeightCells + paddingY * 2) * 2 - 1) * 48 * scale + 16;
      const containerWidth = 880;
      const containerHeight = 600;
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
  const handleMouseUp = () => setIsDragging(false);

  if (!exploredRooms || exploredRooms.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-400">
        No rooms explored yet on this floor
      </div>
    );
  }
  const minX = Math.min(...exploredRooms.map((r) => r.x));
  const maxX = Math.max(...exploredRooms.map((r) => r.x));
  const minY = Math.min(...exploredRooms.map((r) => r.y));
  const maxY = Math.max(...exploredRooms.map((r) => r.y));
  // Build roomMap for expanded view
  const roomMapExpanded = new Map<string, ExploredRoom>();

  if (exploredRooms && Array.isArray(exploredRooms)) {
    exploredRooms.forEach((room) => {
      if (room && typeof room.x === "number" && typeof room.y === "number") {
        roomMapExpanded.set(`${room.x},${room.y}`, room);
      }
    });
  }
  // Only connect real rooms (not unexplored neighbors)
  const isRealRoom = (room: ExploredRoom | undefined) =>
    room &&
    !room.isUnexploredNeighbor &&
    (room.isExplored || room.isScanned || room.isCurrentRoom);
  const hasConnectionExpanded = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => {
    const room1 = roomMapExpanded.get(`${x1},${y1}`);
    const room2 = roomMapExpanded.get(`${x2},${y2}`);
    return isRealRoom(room1) && isRealRoom(room2);
  };

  return (
    <div className="h-full">
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
                  const roomRow = Math.floor(row / 2);
                  const roomCol = Math.floor(col / 2);
                  const x = minX + roomCol;
                  const y = maxY - roomRow;
                  const room = roomMapExpanded.get(`${x},${y}`);
                  if (room) {
                    return (
                      <div
                        key={`room-${room.id}`}
                        className={`w-12 h-12 border-2 rounded flex items-center justify-center relative ${getRoomColor(
                          room,
                          factions,
                        )}`}
                        style={getFactionBorderStyle(room, true, factions)}
                        title={`${room.name} (${x}, ${y})`}
                      >
                        {getRoomIcon(room, true, actualCurrentRoomId)}
                        {getRoomIndicators(room, true)}
                      </div>
                    );
                  } else {
                    return (
                      <div key={`empty-${col}-${row}`} className="w-12 h-12" />
                    );
                  }
                } else if (isRoomRow && !isRoomCol) {
                  const roomRow = Math.floor(row / 2);
                  const leftCol = Math.floor(col / 2);
                  const rightCol = leftCol + 1;
                  const y = maxY - roomRow;
                  const leftX = minX + leftCol;
                  const rightX = minX + rightCol;
                  if (hasConnectionExpanded(leftX, y, rightX, y)) {
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
                  const roomCol = Math.floor(col / 2);
                  const topRow = Math.floor(row / 2);
                  const bottomRow = topRow + 1;
                  const x = minX + roomCol;
                  const topY = maxY - topRow;
                  const bottomY = maxY - bottomRow;
                  if (hasConnectionExpanded(x, topY, x, bottomY)) {
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
