/**
 * File: tactical-view-panel.tsx
 * Responsibility: Main tactical combat interface with grid-based positioning, entity management, and action controls
 * Notes: Integrates tactical grid, hotbar, context menu, and action queue for real-time combat gameplay
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { useTacticalPositioning } from "@/hooks/useTacticalPositioning";
import { handleRoomChangeWithRefetch } from "@/lib/roomChangeUtils";
import type { CrawlerWithDetails } from "@shared/schema";
import { combatSystem, type CombatEntity } from "@shared/combat-system";
import { useToast } from "@/hooks/use-toast";
import { useKeyboardMovement } from "@/hooks/useKeyboardMovement";
import { useGestureMovement } from "@/hooks/useGestureMovement";
import { useAdjacentRoomPrefetch } from "@/hooks/useAdjacentRoomPrefetch";
import { useTacticalData } from "./tactical-view/tactical-data-hooks";
import TacticalGrid from "./tactical-view/tactical-grid";
import TacticalHotbar from "./tactical-view/tactical-hotbar";
import ActionQueuePanel from "./action-queue-panel";
import TacticalContextMenu from "./tactical-view/tactical-context-menu";
import { generateFallbackTacticalData, getRoomBackgroundType } from "./tactical-view/tactical-utils";
import { queryClient } from "@/lib/queryClient";
import { getEntryPosition, storeMovementDirection, clearStoredMovementDirection, getStoredEntryDirection } from "@/lib/entryPositioning";

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
    refetchExploredRooms,
    handleRoomChange
  } = useTacticalData(crawler);

  // Use adjacent room prefetching for faster transitions
  const { prefetchAdjacentRooms } = useAdjacentRoomPrefetch({
    crawler,
    currentRoomId: roomData?.room?.id,
    enabled: !isLoading && !!roomData?.room,
    radius: 2
  });

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

  // Room movement handler with better fallback functionality
  const handleRoomMovement = useCallback(
    async (direction: string) => {
      console.log(`⚡ Ultra-fast room transition ${direction} starting...`);

      // Store the movement direction for proper entry positioning
      console.log(`📍 Storing movement direction: ${direction}`);
      storeMovementDirection(direction);
      
      // Verify it was stored
      const storedDirection = getStoredEntryDirection();
      console.log(`✅ Verified stored direction: ${storedDirection}`);

      try {
        const result = await handleRoomChangeWithRefetch(crawler.id, direction);
        if (result === true) {
          console.log(`✅ Room movement successful to ${direction}`);

          // Force invalidate and refetch all room-related data
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["/api/crawlers/" + crawler.id + "/room-data-batch"] }),
            queryClient.invalidateQueries({ queryKey: ["/api/crawlers/" + crawler.id + "/current-room"] }),
            queryClient.invalidateQueries({ queryKey: ["/api/crawlers/" + crawler.id + "/tactical-data"] }),
            queryClient.invalidateQueries({ queryKey: ["/api/crawlers/" + crawler.id + "/explored-rooms"] }),
            queryClient.invalidateQueries({ queryKey: ["dungeonMap"] })
          ]);

          // Force refetch the data immediately
          await Promise.all([
            refetchTacticalData(),
            refetchExploredRooms()
          ]);

          console.log('⚡ Room transition and data refresh completed successfully');

          // Clear movement direction after a delay to ensure positioning is complete
          setTimeout(() => {
            console.log('🧹 Clearing stored movement direction after successful transition');
            clearStoredMovementDirection();
          }, 500);
        } else {
          console.error('❌ Room movement failed: API returned false');
          toast({
            title: "Room Movement Failed",
            description: "Could not move to the " + direction + " room. Try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("❌ Room movement API call failed:", error instanceof Error ? error.message : 'Unknown error');
        toast({
          title: "Room Movement Failed",
          description: "Network error during room transition. Try again.",
          variant: "destructive",
        });
      }
    },
    [crawler, queryClient, refetchTacticalData, refetchExploredRooms]
  );

  // Use tactical positioning hook for movement validation logic
  const { handleMovement: handleTacticalMovement } = useTacticalPositioning({
    effectiveTacticalData,
    combatState,
    onRoomMovement: handleRoomMovement
  });

  // Detect mobile device with more comprehensive detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      const isMobileDevice = hasTouch && isSmallScreen;
      console.log('🔍 Mobile detection:', { hasTouch, isSmallScreen, isMobileDevice, innerWidth: window.innerWidth });
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle rotation
  const handleRotation = useCallback((direction: 'clockwise' | 'counter-clockwise') => {
    const playerEntity = combatState.entities.find((e: any) => e.id === "player");
    if (!playerEntity) return;

    const rotationAmount = direction === 'clockwise' ? 15 : -15; // 15 degrees per rotation
    let newFacing = (playerEntity.facing || 0) + rotationAmount;

    // Normalize angle to be between 0 and 360
    if (newFacing < 0) newFacing += 360;
    if (newFacing >= 360) newFacing -= 360;

    console.log('🔄 Rotating player to:', newFacing, 'degrees');

    // Update player facing
    playerEntity.facing = newFacing;
    combatSystem.updateEntity(playerEntity.id, { facing: newFacing });
  }, [combatState]);

  // Handle stairs/down action (placeholder - can be expanded based on game needs)
  const handleStairs = useCallback(() => {
    console.log('🏃 Stairs/down action - implement stairs logic here');
    // TODO: Implement stairs functionality when stairwells are added to the game
  }, []);

  // Use keyboard movement hook
  useKeyboardMovement({
    onMovement: handleTacticalMovement,
    onRotation: handleRotation,
    onStairs: handleStairs,
    isEnabled: !isLoading && !combatState.isInCombat,
  });

  // Use gesture movement hook for mobile
  const { containerRef, bind } = useGestureMovement({
    onMovement: handleTacticalMovement,
    isEnabled: isMobile && !combatState.isInCombat
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
    if (roomData?.room && roomData.room.id !== lastRoomId) {
      console.log(`🚪 Room changed from ${lastRoomId} to ${roomData.room.id}, repositioning player immediately`);
      setLastRoomId(roomData.room.id);

      // Clear existing entities except player
      const currentState = combatSystem.getState();

      // Clear all non-player entities
      currentState.entities.forEach(entity => {
        if (entity.id !== "player") {
          combatSystem.removeEntity(entity.id);
        }
      });

      // Get the entry direction and position player correctly using centralized logic
      const storedDirection = getStoredEntryDirection();
      console.log(`🔍 Stored entry direction from session storage: '${storedDirection}'`);
      
      const entryPosition = getEntryPosition(storedDirection);
      console.log(`🎯 Calculated entry position for direction '${storedDirection}': {x: ${entryPosition.x}, y: ${entryPosition.y}}`);

      // Position player immediately at the correct entry point
      combatSystem.initializePlayer(entryPosition, {
        name: crawler.name,
        serial: crawler.serial
      });

      console.log(`✅ Player repositioned immediately to (${entryPosition.x}, ${entryPosition.y})`);

      // Trigger adjacent room prefetching when room changes
      if (roomData?.room && prefetchAdjacentRooms) {
        console.log(`🔮 Room changed to ${roomData.room.id}, triggering adjacent room prefetch`);
        prefetchAdjacentRooms();
      }
    }
  }, [roomData?.room, lastRoomId, crawler, effectiveTacticalData]);

  // Grid event handlers - disabled for now
  const handleGridClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Grid clicking disabled - use keyboard/swipe movement instead
    console.log("Grid click disabled - use WASD keys or swipe to move");
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

    // If in attack mode, try to attack the clicked entity
    if (activeActionMode?.type === "attack" && entityId !== "player") {
      const targetEntity = combatState.entities.find(e => e.id === entityId);
      if (targetEntity?.type === "hostile") {
        const success = combatSystem.queueAction("player", activeActionMode.actionId, entityId);
        if (success) {
          toast({
            title: "Attack Queued",
            description: "Player will " + activeActionMode.actionName + " " + (targetEntity.name || entityId),
          });
          setActiveActionMode(null); // Clear attack mode after use
        } else {
          toast({
            title: "Attack Failed",
            description: "Cannot attack - check cooldown or range",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Invalid Target",
          description: "Can only attack hostile enemies",
          variant: "destructive",
        });
      }
      return;
    }

    // Otherwise just select the entity
    combatSystem.selectEntity(entityId);
  }, [activeActionMode, combatState.entities, toast]);

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
    if (actionType === "attack" && actionId === "basic_attack") {
      // For punch attacks, always fire the attack
      const playerEntity = combatState.entities.find(e => e.id === "player");
      if (!playerEntity) {
        toast({
          title: "Attack Failed",
          description: "Player not found",
          variant: "destructive",
        });
        return;
      }

      // Find nearby hostile entities within punch range
      const hostileEntities = combatState.entities.filter(e =>
        e.type === "hostile" &&
        e.hp > 0 &&
        combatSystem.calculateDistance(playerEntity.position, e.position) <= 8 // Punch range
      );

      if (hostileEntities.length === 0) {
        // No targets - fire punch animation into empty air and start cooldown
        const success = combatSystem.queueAction("player", actionId);
        if (success) {
          toast({
            title: "Punch!",
            description: "You swing at empty air",
          });
        } else {
          toast({
            title: "Attack Failed",
            description: "Cannot attack - still on cooldown",
            variant: "destructive",
          });
        }
      } else {
        // Attack the closest hostile entity
        const closestEnemy = hostileEntities.reduce((closest, current) => {
          const closestDist = combatSystem.calculateDistance(playerEntity.position, closest.position);
          const currentDist = combatSystem.calculateDistance(playerEntity.position, current.position);
          return currentDist < closestDist ? current : closest;
        });

        const success = combatSystem.queueAction("player", actionId, closestEnemy.id);
        if (success) {
          toast({
            title: "Attack!",
            description: "Punching " + (closestEnemy.name || closestEnemy.id),
          });
        } else {
          toast({
            title: "Attack Failed",
            description: "Cannot attack - still on cooldown",
            variant: "destructive",
          });
        }
      }
    } else {
      // For other actions, use toggle behavior
      if (activeActionMode?.actionId === actionId) {
        setActiveActionMode(null);
      } else {
        setActiveActionMode({ type: actionType as "move" | "attack" | "ability", actionId, actionName });
      }
    }
  }, [activeActionMode, combatState.entities, toast]);

  const getCooldownPercentage = useCallback((actionId: string): number => {
    const playerEntity = combatState.entities.find(e => e.id === "player");
    if (!playerEntity?.cooldowns) return 0;

    const lastUsed = playerEntity.cooldowns[actionId] || 0;
    const now = Date.now();

    // Get action cooldown (punch = 1200ms)
    const actionCooldown = actionId === "basic_attack" ? 1200 : 1000;
    const timeRemaining = Math.max(0, (lastUsed + actionCooldown) - now);

    return (timeRemaining / actionCooldown) * 100;
  }, [combatState.entities]);

  // Context menu handlers
  const handleActionClick = useCallback((action: any, targetEntityId: string) => {
    if (action.type === "attack") {
      const success = combatSystem.queueAction("player", action.id, targetEntityId);
      if (success) {
        toast({
          title: "Attack Queued",
          description: "Player will " + action.name + " " + targetEntityId,
        });
      } else {
        toast({
          title: "Attack Failed",
          description: "Cannot attack right now - check cooldown or range",
          variant: "destructive",
        });
      }
    }
    setContextMenu(null);
  }, [toast]);

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
      <CardContent className="space-y-4">
        <div
          className="flex-1 relative"
          ref={containerRef}
          style={{
            touchAction: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
          {...bind()}
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

        <div className="pt-2">
          <TacticalHotbar
            activeActionMode={activeActionMode}
            onHotbarClick={handleHotbarClick}
            getCooldownPercentage={getCooldownPercentage}
          />
        </div>

        {contextMenu && (
          <TacticalContextMenu
            contextMenu={contextMenu}
            contextMenuRef={contextMenuRef}
            onActionClick={handleActionClick}
            onMoveToPosition={handleMoveToPosition}
            onClose={() => setContextMenu(null)}
          />
        )}

        <div className="pt-2">
          <ActionQueuePanel />
        </div>

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