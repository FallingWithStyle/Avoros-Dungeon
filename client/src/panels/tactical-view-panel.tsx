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
        body: JSON.stringify({ direction, debugEnergyDisabled: false }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log("Successfully moved " + direction + " to " + (result.newRoom?.name || 'unknown room'));
          refetchTacticalData();
          refetchExploredRooms();

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
      const entryPosition = lastDirection ? combatSystem.getEntryPosition(lastDirection) : { x: 50, y: 50 };

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
    if (!effectiveTacticalData?.room) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const selectedEntity = combatSystem.getSelectedEntity();
    if (selectedEntity?.id === "player") {
      const success = combatSystem.queueMoveAction(selectedEntity.id, { x, y });
      if (success) {
        console.log("Player moving to " + x.toFixed(1) + ", " + y.toFixed(1));
      }
    }
  }, [effectiveTacticalData?.room]);

  const handleGridRightClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      entityId: "grid",
      entity: { id: "grid", name: "Grid", type: "grid", hp: 0, maxHp: 0, attack: 0, defense: 0, speed: 0, position: { x, y } } as CombatEntity,
      actions: [],
      clickPosition: { x, y }
    });
  }, []);

  // Entity event handlers
  const handleEntityClick = useCallback((entityId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    combatSystem.selectEntity(entityId);
  }, []);

  const handleEntityRightClick = useCallback((entityId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const entity = combatState.entities.find(e => e.id === entityId);
    if (!entity) return;

    const actions = combatSystem.getAvailableActions(entityId);
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      entityId,
      entity,
      actions,
    });
  }, [combatState.entities]);

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
    const selectedEntity = combatSystem.getSelectedEntity();
    if (!selectedEntity) return;

    const success = combatSystem.queueAction(selectedEntity.id, action, targetEntityId);
    if (success) {
      console.log("Queued " + action.name + " from " + selectedEntity.name + " to " + targetEntityId);
    }
    setContextMenu(null);
  }, []);

  const handleMoveToPosition = useCallback((position?: { x: number; y: number }) => {
    if (!position) return;

    const selectedEntity = combatSystem.getSelectedEntity();
    if (!selectedEntity) return;

    const success = combatSystem.queueMoveAction(selectedEntity.id, position);
    if (success) {
      console.log(selectedEntity.name + " moving to " + position.x.toFixed(1) + ", " + position.y.toFixed(1));
    }
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
        <div ref={containerRef}>
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