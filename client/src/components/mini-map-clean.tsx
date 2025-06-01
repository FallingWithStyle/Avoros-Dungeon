import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from 'lucide-react';

interface ExploredRoom {
  id: number;
  name: string;
  x: number;
  y: number;
  isCurrentRoom: boolean;
  isExplored?: boolean;
  type: string;
  isSafe: boolean;
  hasLoot: boolean;
}

interface ExpandedMapViewProps {
  exploredRooms: ExploredRoom[];
}

function ExpandedMapView({ exploredRooms }: ExpandedMapViewProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);

  // Calculate bounds
  const bounds = exploredRooms.reduce((acc, room) => ({
    minX: Math.min(acc.minX, room.x),
    maxX: Math.max(acc.maxX, room.x),
    minY: Math.min(acc.minY, room.y),
    maxY: Math.max(acc.maxY, room.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

  const gridWidth = (bounds.maxX - bounds.minX + 1) * 2 - 1;
  const gridHeight = (bounds.maxY - bounds.minY + 1) * 2 - 1;
  const mapWidth = 600;
  const mapHeight = 600;
  const cellSize = Math.min(mapWidth / gridWidth, mapHeight / gridHeight);

  // Auto-center on current room
  useEffect(() => {
    const currentRoom = exploredRooms.find(r => r.isCurrentRoom);
    if (currentRoom && exploredRooms.length > 0) {
      const roomCol = (currentRoom.x - bounds.minX) * 2;
      const roomRow = (currentRoom.y - bounds.minY) * 2;
      const roomPixelX = roomCol * cellSize;
      const roomPixelY = roomRow * cellSize;
      
      const centerX = mapWidth / 2 - roomPixelX;
      const centerY = mapHeight / 2 - roomPixelY;
      
      setPanOffset({ x: centerX, y: centerY });
    }
  }, [exploredRooms, bounds, cellSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    
    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  }, [isDragging, lastPanPoint]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging, handleMouseUp]);

  return (
    <div 
      ref={mapRef}
      className="relative w-full h-[600px] border-2 border-slate-600 bg-slate-900 overflow-hidden cursor-move"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      style={{ userSelect: 'none' }}
    >
      <div 
        className="absolute"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          width: gridWidth * cellSize,
          height: gridHeight * cellSize
        }}
      >
        {exploredRooms.map(room => {
          const col = (room.x - bounds.minX) * 2;
          const row = (room.y - bounds.minY) * 2;
          
          return (
            <div
              key={room.id}
              className={`absolute border-2 flex items-center justify-center text-xs font-bold
                ${room.isCurrentRoom 
                  ? 'bg-blue-500 border-blue-300 text-white' 
                  : room.isSafe 
                    ? 'bg-green-600 border-green-400 text-white'
                    : 'bg-red-600 border-red-400 text-white'
                }`}
              style={{
                left: col * cellSize,
                top: row * cellSize,
                width: cellSize,
                height: cellSize
              }}
              title={room.name}
            >
              {room.isCurrentRoom && (
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-pulse opacity-50" />
              )}
              <span className="relative z-10 truncate px-1">
                {room.name.split(' ').map(w => w[0]).join('').slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MiniMap({ crawler }: { crawler: any }) {
  // All hooks at top level - always called
  const [showFullMap, setShowFullMap] = useState(false);
  
  const { data: exploredRooms, isLoading: exploredLoading, error: exploredError } = useQuery({
    queryKey: [`/api/crawlers/${crawler?.id}/explored-rooms`],
    enabled: !!crawler?.id,
  });

  const { data: allRooms, isLoading: allRoomsLoading } = useQuery({
    queryKey: ['/api/floors', crawler?.currentFloor, 'rooms'],
    enabled: showFullMap && !!crawler?.currentFloor,
  });

  // Early return for loading states
  if (exploredLoading) {
    return (
      <Card className="w-full h-64">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">Loading map...</div>
        </CardContent>
      </Card>
    );
  }

  if (exploredError) {
    return (
      <Card className="w-full h-64">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-400">Error loading map</div>
        </CardContent>
      </Card>
    );
  }

  if (!exploredRooms || exploredRooms.length === 0) {
    return (
      <Card className="w-full h-64">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">No rooms explored yet</div>
        </CardContent>
      </Card>
    );
  }

  // Process rooms for display
  let displayRooms: ExploredRoom[] = [];
  
  if (showFullMap && allRooms) {
    // In full map mode, merge all rooms with explored status
    const exploredCurrentRoom = exploredRooms.find(r => r.isCurrentRoom);
    const currentRoomId = exploredCurrentRoom?.id;
    
    displayRooms = allRooms.map(room => ({
      ...room,
      isCurrentRoom: room.id === currentRoomId,
      isExplored: exploredRooms.some(er => er.id === room.id)
    }));
  } else {
    // In explored mode, use explored rooms directly
    displayRooms = exploredRooms;
  }

  const currentRoom = displayRooms.find(r => r.isCurrentRoom);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {showFullMap ? 'Full Floor Map' : 'Explored Map'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullMap(!showFullMap)}
            className="h-8 w-8 p-0"
          >
            {showFullMap ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
        
        {currentRoom && (
          <div className="text-xs text-slate-400">
            Current: {currentRoom.name} ({currentRoom.x}, {currentRoom.y})
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {showFullMap ? (
          allRoomsLoading ? (
            <div className="h-[600px] flex items-center justify-center text-slate-400">
              Loading full map...
            </div>
          ) : (
            <ExpandedMapView exploredRooms={displayRooms} />
          )
        ) : (
          <ExpandedMapView exploredRooms={displayRooms} />
        )}
        
        <div className="flex items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 border border-blue-300 rounded-sm"></div>
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-600 border border-green-400 rounded-sm"></div>
            <span>Safe</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-600 border border-red-400 rounded-sm"></div>
            <span>Dangerous</span>
          </div>
          {showFullMap && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-slate-700 border border-slate-500 rounded-sm"></div>
              <span>Unexplored</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}