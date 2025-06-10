/**
 * File: tactical-view-panel.tsx
 * Responsibility: Main tactical combat interface with grid-based positioning, entity management, and action controls
 * Notes: Integrates tactical grid, hotbar, context menu, and action queue for real-time combat gameplay
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import type { CrawlerWithDetails } from "@shared/schema";
import { combatSystem, type CombatEntity } from "@shared/combat-system";
import { useToast } from "@/hooks/use-toast";
import { useTacticalMovement } from "@/hooks/useTacticalMovement";
import { useSwipeMovement } from "@/hooks/useSwipeMovement";
import { useTacticalData } from "./tactical-view/tactical-data-hooks";
import TacticalGrid from "./tactical-view/tactical-grid";
import TacticalHotbar from "./tactical-view/tactical-hotbar";
import ActionQueuePanel from "./action-queue-panel";
import TacticalContextMenu from "./tactical-view/tactical-context-menu";
import { generateFallbackTacticalData, getRoomBackgroundType } from "./tactical-view/tactical-utils";
import { queryClient } from "@/lib/queryClient";

interface TacticalViewPanelProps {
  crawler: CrawlerWithDetails;
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  entityId: string;
  entity: CombatEntity;
  actions: any[];
  clickPosition?: { x: number; y: number };
}

export default function TacticalViewPanel({ crawler }: TacticalViewPanelProps) {
  // ALL HOOKS MUST BE CALLED FIRST - NO CONDITIONAL CALLING
  const { toast } = useToast();

  // Use the extracted tactical data hooks
  const {
    roomData,
    tacticalData,
    isLoading,
    tacticalLoading,
    tacticalError,
    refetchTacticalData,
    refetchExploredRooms
  } = useTacticalData(crawler);

  // Local state - ALL HOOKS BEFORE ANY CONDITIONAL LOGIC
  const [combatState, setCombatState] = useState(combatSystem.getState());
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [hoveredLoot, setHoveredLoot] = useState<number | null>(null);
  const [lastRoomId, setLastRoomId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [activeActionMode, setActiveActionMode] = useState<{
    type: "move" | "attack" | "ability";
    actionId: string;
    actionName: string;
  } | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Use fallback data when tactical data is unavailable
  const effectiveTacticalData = tacticalData || generateFallbackTacticalData(roomData);

  // Room movement handler
  const handleRoomMovement = useCallback(async (direction: string) => {
    if (!crawler || !effectiveTacticalData?.availableDirections.includes(direction)) {
      console.log("Cannot move " + direction + " - not available or no crawler");
      return;
    }

    try {
      console.log("Moving crawler " + crawler.id + " " + direction + " to new room");
      sessionStorage.setItem('lastMovementDirection', direction);

      const response = await fetch("/api/crawlers/" + crawler.id + "/move", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log("Successfully moved " + direction + " to " + (result.newRoom?.name || 'unknown room'));
          refetchTacticalData();
          refetchExploredRooms();

          // Invalidate minimap queries to update dungeon map
          queryClient.invalidateQueries({ queryKey: ["dungeonMap"] });
          queryClient.invalidateQueries({ queryKey: ["/api/crawlers/" + crawler.id + "/explored-rooms"] });

          // Clear entities for room transition
          const currentEntities = combatSystem.getState().entities;
          currentEntities.forEach((entity) => {
            combatSystem.removeEntity(entity.id);
          });
        }
      }
    } catch (error) {
      console.error("Failed to move " + direction + ":", error);
      toast({
        title: "Movement failed",
        description: "Could not move in that direction.",
        variant: "destructive",
      });
    }
  }, [crawler, effectiveTacticalData?.availableDirections, toast, refetchTacticalData, refetchExploredRooms]);

  // Use tactical movement hook
  useTacticalMovement({
    effectiveTacticalData,
    combatState,
    onRoomMovement: handleRoomMovement
  });

  // Use swipe movement for mobile
  const { containerRef } = useSwipeMovement({
    onRoomMovement: handleRoomMovement,
    availableDirections: effectiveTacticalData?.availableDirections || [],
    combatState,
    isEnabled: true
  });

  // Subscribe to combat system updates
  useEffect(() => {
    const unsubscribe = combatSystem.subscribe((state) => {
      if (!state.isInCombat && combatState.isInCombat && activeActionMode) {
        setActiveActionMode(null);
      }
      setCombatState(state);
    });
    return unsubscribe;
  }, [combatState.isInCombat, activeActionMode]);

  // Handle room changes and entity management
  useEffect(() => {
    if (!roomData?.room) return;

    const currentRoomId = roomData.room.id;
    const shouldClearEntities = lastRoomId !== null && lastRoomId !== currentRoomId;

    if (shouldClearEntities) {
      refetchTacticalData();
      const currentEntities = combatSystem.getState().entities;
      currentEntities.forEach((entity) => {
        combatSystem.removeEntity(entity.id);
      });
    }

    setLastRoomId(currentRoomId);
    combatSystem.setCurrentRoomData(roomData.room);

    // Ensure player entity exists
    const existingPlayer = combatSystem.getState().entities.find(e => e.id === "player");
    if (!existingPlayer) {
      const lastDirection = sessionStorage.getItem("lastMovementDirection") as 'north' | 'south' | 'east' | 'west' | null;
      let entryPosition;

      // When you move in a direction, you enter the new room from the OPPOSITE side
      if (lastDirection === 'north') {
        entryPosition = { x: 50, y: 90 }; // Enter from south when you moved north
      } else if (lastDirection === 'south') {
        entryPosition = { x: 50, y: 10 }; // Enter from north when you moved south
      } else if (lastDirection === 'east') {
        entryPosition = { x: 10, y: 50 }; // Enter from west when you moved east
      } else if (lastDirection === 'west') {
        entryPosition = { x: 90, y: 50 }; // Enter from east when you moved west
      } else {
        entryPosition = { x: 50, y: 50 }; // Default center position
      }

      const playerEntity: CombatEntity = {
        id: "player",
        name: crawler.name,
        type: "player",
        hp: crawler.health || 100,
        maxHp: crawler.maxHealth || 100,
        attack: 20,
        defense: 10,
        speed: 15,
        position: entryPosition,
        facing: lastDirection || 'south',
      };

      combatSystem.addEntity(playerEntity);
      combatSystem.selectEntity("player");
    }
  }, [roomData?.room, lastRoomId, crawler, refetchTacticalData]);

  // Grid event handlers
  const handleGridClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Disabled for now - clicking on screen should not do anything
    console.log("Grid clicked - functionality disabled");
    return;
  }, []);

  const handleGridRightClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    // Disabled for now - right-clicking on screen should not do anything
    console.log("Grid right-clicked - functionality disabled");
    return;
  }, []);

  // Entity event handlers
  const handleEntityClick = useCallback((entityId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    // Disabled for now - clicking on entities should not do anything
    console.log("Entity clicked: " + entityId + " - functionality disabled");
    return;
  }, []);

  const handleEntityRightClick = useCallback((entityId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Disabled for now - right-clicking on entities should not do anything
    console.log("Entity right-clicked: " + entityId + " - functionality disabled");
    return;
  }, []);

  // Loot event handlers
  const handleLootClick = useCallback((index: number, item: any, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toast({
      title: "Loot Interaction",
      description: "Interacting with " + item.name,
    });
  }, [toast]);

  // Hotbar handlers
  const handleHotbarClick = useCallback((actionId: string, actionType: string, actionName: string) => {
    if (activeActionMode?.actionId === actionId) {
      setActiveActionMode(null);
    } else {
      setActiveActionMode({ type: actionType as "move" | "attack" | "ability", actionId, actionName });
    }
  }, [activeActionMode]);

  const getCooldownPercentage = useCallback((actionId: string): number => {
    return 0; // Placeholder
  }, []);

  // Context menu handlers
  const handleActionClick = useCallback((action: any, targetEntityId: string) => {
    // Disabled for now - action clicks should not do anything
    console.log("Action clicked - functionality disabled");
    setContextMenu(null);
  }, []);

  const handleMoveToPosition = useCallback((position?: { x: number; y: number }) => {
    // Disabled for now - move to position should not do anything
    console.log("Move to position clicked - functionality disabled");
    setContextMenu(null);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [contextMenu]);

  // CONDITIONAL RENDERING ONLY AFTER ALL HOOKS HAVE BEEN CALLED
  // Early return if no data - MUST be after all hooks
  if (!effectiveTacticalData || !effectiveTacticalData.room) {
    console.log("No effective tactical data available");
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Tactical View - No Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-48 border-2 border-red-600 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <span className="text-red-400">No room data available</span>
              <br />
              <button 
                onClick={() => window.location.reload()} 
                className="text-blue-400 underline text-xs mt-2"
              >
                Reload page
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Process tactical data for grid
  const { room, availableDirections = [], playersInRoom = [] } = effectiveTacticalData || {};
  const tacticalEntities = effectiveTacticalData?.tacticalEntities || [];

  const gridData = {
    background: getRoomBackgroundType(room?.environment || 'underground', room?.type || 'normal'),
    loot: tacticalEntities.filter(e => e.type === 'loot'),
    mobs: tacticalEntities.filter(e => e.type === 'mob'),
    npcs: tacticalEntities.filter(e => e.type === 'npc'),
    exits: {
      north: availableDirections.includes("north"),
      south: availableDirections.includes("south"),
      east: availableDirections.includes("east"),
      west: availableDirections.includes("west"),
    },
    otherPlayers: playersInRoom.filter((p) => p.id !== crawler.id),
  };

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Tactical View
          {!tacticalData && effectiveTacticalData && (
            <span className="text-xs text-amber-400 ml-2">(Limited Data)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
        className="flex-1 relative" 
        ref={containerRef}
        style={{ touchAction: 'none' }}
      >
          <TacticalGrid
            roomBackground={gridData.background}
            exits={gridData.exits}
            entities={combatState.entities}
            lootItems={gridData.loot}
            otherPlayers={gridData.otherPlayers}
            hoveredEntity={hoveredEntity}
            hoveredLoot={hoveredLoot}
            onGridClick={handleGridClick}
            onGridRightClick={handleGridRightClick}
            onEntityClick={handleEntityClick}
            onEntityRightClick={handleEntityRightClick}
            onLootClick={handleLootClick}
            onEntityHover={setHoveredEntity}
            onLootHover={setHoveredLoot}
            isInCombat={combatState.isInCombat}
            activeActionMode={activeActionMode}
            tacticalMobs={gridData.mobs}
            tacticalNpcs={gridData.npcs}
          />
        </div>

        <TacticalHotbar
          activeActionMode={activeActionMode}
          onHotbarClick={handleHotbarClick}
          getCooldownPercentage={getCooldownPercentage}
        />

        {contextMenu && (
          <TacticalContextMenu
            contextMenu={contextMenu}
            contextMenuRef={contextMenuRef}
            onActionClick={handleActionClick}
            onMoveToPosition={handleMoveToPosition}
            onClose={() => setContextMenu(null)}
          />
        )}

        <ActionQueuePanel />

        {activeActionMode && (
          <div className="mt-2 p-2 bg-blue-900/30 border border-blue-500 rounded text-center">
            <span className="text-blue-300 text-sm">
              {activeActionMode.actionName} mode active - {
                activeActionMode.type === "move" ? "Click to move" :
                activeActionMode.type === "attack" ? "Click enemy to attack" :
                "Click to use ability"
              }
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}