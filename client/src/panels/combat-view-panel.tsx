/**
 * File: combat-view-panel.tsx
 * Responsibility: Clean combat interface panel using only the proven test combat system logic
 * Notes: Built from test-combat.tsx without any legacy tactical view dependencies
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Sword, Shield, Zap, Target, Heart, Skull } from "lucide-react";
import { combatSystem, type CombatEntity } from "@shared/combat-system";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrawlerWithDetails } from "@shared/schema";
import { useTacticalData } from "./tactical-view/tactical-data-hooks";
import { useAdjacentRoomPrefetch } from "@/hooks/useAdjacentRoomPrefetch";
import { useCombatState } from "@/hooks/useCombatState";
import { useCombatMovement } from "@/hooks/useCombatMovement";
import { useCombatActions } from "@/hooks/useCombatActions";
import { useCombatEntities } from "@/hooks/useCombatEntities";
import CombatArena from "@/components/combat/CombatArena";
import CombatHotbar from "@/components/combat/CombatHotbar";
import * as CombatUtils from "@/utils/combat-utils";
import { useCombatStatePreloader } from "@/hooks/useCombatStatePreloader";

interface Equipment {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "armor";
  damageAttribute: "might" | "agility";
  range: number;
  mightBonus?: number;
  agilityBonus?: number;
  defenseBonus?: number;
}

interface CombatViewPanelProps {
  crawler: CrawlerWithDetails;
}

export default function CombatViewPanel({ crawler }: CombatViewPanelProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC
  const { toast } = useToast();
  const [manualRotation, setManualRotation] = useState(false);
  const [equippedWeapon, setEquippedWeapon] = useState<Equipment | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [movementOptions, setMovementOptions] = useState<any>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | undefined>(undefined);

  // Use the same tactical data hooks as the tactical view panel
  const {
    roomData,
    exploredRooms,
    tacticalData,
    isLoading: roomLoading,
    tacticalLoading,
    tacticalError,
    refetchTacticalData,
    refetchExploredRooms,
    refetchRoomData,
    handleRoomChange,
  } = useTacticalData(crawler);

  // OPTIMIZED: Use cached data immediately with intelligent fallbacks
  const effectiveRoomData = roomData?.currentRoom || roomData?.room || roomData;
  const effectiveTacticalData = tacticalData;

  // PERFORMANCE: Extract data early to prevent repeated processing
  const roomName = effectiveRoomData?.name || effectiveRoomData?.room?.name || "Unknown Room";
  const roomEnvironment = effectiveRoomData?.environment || effectiveRoomData?.room?.environment;

  // Extract the actual tactical entities array from the data structure
  const tacticalEntities =
    effectiveTacticalData?.tacticalEntities || effectiveTacticalData || [];

  // OPTIMIZED: Extract room connections from all possible sources immediately
  const initialRoomConnections = effectiveRoomData?.connections || 
                         effectiveRoomData?.room?.connections ||
                         roomData?.currentRoom?.connections ||
                         roomData?.room?.connections ||
                         roomData?.connections ||
                         roomData?.availableDirections?.map(dir => ({ direction: dir })) ||
                         [];

  // Mock weapons for testing - in real implementation these would come from crawler equipment
  const availableWeapons: Equipment[] = [
    {
      id: "sword1",
      name: "Iron Sword",
      description: "A sturdy iron blade",
      type: "weapon",
      damageAttribute: "might",
      range: 1.5,
      mightBonus: 5,
    },
    {
      id: "bow1",
      name: "Hunting Bow",
      description: "A flexible ranged weapon",
      type: "weapon",
      damageAttribute: "agility",
      range: 3,
      agilityBonus: 3,
    },
  ];

  // Use the combat state management hook (must be called early to avoid hook order issues)
  const {
    combatState,
    isInitialized,
    player,
    enemies,
    initializeCombatSystem,
    handleRoomTransition: onRoomTransition,
  } = useCombatState({
    crawler,
    tacticalData: effectiveTacticalData,
    aiEnabled,
    availableWeapons,
  });

  // Use combat actions hook for hotbar, targeting, and attacks
  const {
    selectedTarget,
    selectedEntity,
    activeActionMode,
    setSelectedTarget,
    setActiveActionMode,
    handleHotbarAction,
    handleTargetSelection,
    getCooldownPercentage,
  } = useCombatActions({
    combatState,
    equippedWeapon,
  });

  // Use combat entities hook for entity processing and management
  const {
    tacticalMobs,
    tacticalNpcs,
    tacticalLoot,
    layoutEntities,
    initializeCombatEntities,
    getEntityById,
    isEntityInWeaponRange,
    getWeaponRange,
  } = useCombatEntities({
    crawler,
    tacticalData: effectiveTacticalData,
    availableWeapons,
    combatState,
    isInitialized,
  });

    const queryClient = useQueryClient();

  // Room connections for exit indicators - use cached data if available
  const roomConnections = useMemo(() => {
    // First try to get from cached room data
    const cachedRoomData = queryClient.getQueryData([`/api/crawlers/${crawler.id}/room-data-batch`]);
    if (cachedRoomData?.roomConnections) {
      return cachedRoomData.roomConnections;
    }

    // Fallback to initial room connections or tactical data
    if (initialRoomConnections && initialRoomConnections.length > 0) {
      return initialRoomConnections;
    }

    if (!effectiveTacticalData?.availableDirections) return [];

    return effectiveTacticalData.availableDirections.map((direction: string) => ({
      direction,
      isLocked: false, // TODO: Add locked status from server
    }));
  }, [effectiveTacticalData?.availableDirections, crawler.id, initialRoomConnections]);

  // OPTIMIZED: Single effect for all room data logging to reduce overhead
  useEffect(() => {
    const now = new Date().toLocaleTimeString();

    if (!effectiveRoomData) {
      console.log(now + " - Combat View: No room data");
      return;
    }

    const roomName = effectiveRoomData.name || effectiveRoomData.room?.name || "Unknown Room";
    console.log(now + " - Combat View: Loaded room - " + roomName);

    // Log connections immediately if available
    if (roomConnections && roomConnections.length > 0) {
      const directions = roomConnections.map(c => c.direction).join(", ");
      console.log(now + " - Combat View: Loaded exits - " + directions);
    }

    // Log entities if available
    if (tacticalEntities && tacticalEntities.length > 0) {
      const mobCount = tacticalEntities.filter(e => e.type === 'mob').length;
      const npcCount = tacticalEntities.filter(e => e.type === 'npc').length;
      const lootCount = tacticalEntities.filter(e => e.type === 'loot').length;

      console.log(now + " - Combat View: Loaded entities - " + mobCount + " mobs, " + npcCount + " npcs, " + lootCount + " loot");
    }
  }, [currentRoomId, roomConnections.length, tacticalEntities?.length]);

  // Log combat entities after combat state is available
  useEffect(() => {
    if (!combatState?.entities) return;

    const now = new Date().toLocaleTimeString();

    if (combatState.entities.length > 0) {
      const playerCount = combatState.entities.filter(e => e.type === 'player').length;
      const hostileCount = combatState.entities.filter(e => e.type === 'hostile').length;
      const neutralCount = combatState.entities.filter(e => e.type === 'neutral').length;

      console.log(now + " - Combat View: Initialized combat entities - " + playerCount + " players, " + hostileCount + " hostiles, " + neutralCount + " neutrals");
    }
  }, [combatState?.entities?.length]);

  // OPTIMIZED: Prefetch adjacent rooms using cached room ID
  useAdjacentRoomPrefetch({
    crawler,
    currentRoomId,
    enabled: !!currentRoomId && !roomLoading,
    radius: 2 // Prefetch 2 rooms in each direction
  });

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      const isMobileDevice = hasTouch && isSmallScreen;
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Use combat movement hook
  const {
    handleMovement,
    handleRotation,
    isMoving,
    containerRef,
    bind,
  } = useCombatMovement({
    crawler,
    combatState,
    tacticalEntities,
    roomConnections,
    selectedTarget,
    isMobile,
    onRoomTransition,
    handleRoomChange,
  });

  // OPTIMIZED: Faster initialization with better caching
  const prevRoomIdRef = useRef<string | undefined>();
  const prevEntitiesLenRef = useRef<number | undefined>();

  useEffect(() => {
    const entitiesLen = tacticalEntities?.length ?? 0;

    // Only reset isInitialized if room or entities have changed
    if (
      prevRoomIdRef.current !== undefined &&
      (prevRoomIdRef.current !== currentRoomId ||
        prevEntitiesLenRef.current !== entitiesLen)
    ) {
      // Trigger re-initialization in the hook
      initializeCombatSystem();
    }
    prevRoomIdRef.current = currentRoomId;
    prevEntitiesLenRef.current = entitiesLen;

    // OPTIMIZED: Initialize immediately with cached data, don't wait for loading states
    if (effectiveTacticalData && entitiesLen >= 0 && !isInitialized) {
      initializeCombatSystem();
    }

    return () => {
      combatSystem.stopAILoop();
    };
  }, [
    initializeCombatSystem,
    currentRoomId,
    tacticalEntities?.length,
    effectiveTacticalData,
    isInitialized,
  ]);

  // Enhanced room change handling with proper entity cleanup
  useEffect(() => {
    if (roomData?.room && roomData.room.id !== currentRoomId) {
      const prevRoomId = currentRoomId;
      setCurrentRoomId(roomData.room.id);

      console.log(`Room transition: ${prevRoomId || 'unknown'} -> ${roomData.room.id} (${roomData.room.name})`);

      // Trigger room transition cleanup in the combat state hook
      onRoomTransition();
    }
  }, [roomData?.room, currentRoomId, onRoomTransition]);

  // Show loading state
  if (
    (roomLoading || tacticalLoading) &&
    (!effectiveTacticalData || !tacticalEntities.length)
  ) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Combat View
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full h-64 bg-gray-800/20 border border-gray-600/20 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <span className="text-slate-400">Loading tactical data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Combat View - {roomName}
          <Badge variant={combatState?.isInCombat ? "destructive" : "secondary"}>
            {combatState?.isInCombat ? "IN COMBAT" : isMoving ? "MOVING..." : "READY"}
          </Badge>
          {roomEnvironment && (
            <Badge variant="outline" className="text-xs">
              {roomEnvironment}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Combat Arena */}
        <CombatArena
          roomEnvironment={roomEnvironment}
          roomConnections={roomConnections}
          layoutEntities={layoutEntities}
          combatState={combatState}
          selectedTarget={selectedTarget}
          containerRef={containerRef}
          bind={bind}
          onTargetSelection={handleTargetSelection}
        />

        {/* Hotbar */}
        <CombatHotbar
          activeActionMode={activeActionMode}
          onHotbarAction={handleHotbarAction}
          getCooldownPercentage={getCooldownPercentage}
        />

        {/* Controls hint */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>
            {isMobile
              ? "Touch & Drag: Move | Tap: Actions"
              : "WASD: Move | 1-3: Actions | Tab: Cycle Targets"}
          </div>
          {selectedTarget && (
            <div className="text-yellow-400">
              Target: {selectedEntity?.name}
            </div>
          )}
          {combatState?.isInCombat && (
            <div className="text-red-400">
              Combat Mode: Movement restricted near enemies
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}