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
import { useQuery } from "@tanstack/react-query";
import type { CrawlerWithDetails } from "@shared/schema";
import { useTacticalData } from "./tactical-view/tactical-data-hooks";
import { useAdjacentRoomPrefetch } from "@/hooks/useAdjacentRoomPrefetch";
import { useCombatState } from "@/hooks/useCombatState";
import { useCombatMovement } from "@/hooks/useCombatMovement";
import { useCombatActions } from "@/hooks/useCombatActions";
import { useCombatEntities } from "@/hooks/useCombatEntities";
import { IS_DEBUG_MODE } from "@/components/debug-panel";

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
  const roomConnections = effectiveRoomData?.connections || 
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
        <div
          ref={containerRef}
          className={`relative border border-amber-600/20 rounded-lg overflow-hidden mx-auto ${
            roomEnvironment === "outdoor"
              ? "bg-gradient-to-br from-green-900/20 to-blue-800/20"
              : roomEnvironment === "cave"
                ? "bg-gradient-to-br from-gray-900/40 to-stone-800/40"
                : roomEnvironment === "dungeon"
                  ? "bg-gradient-to-br from-purple-900/20 to-gray-800/30"
                  : "bg-gradient-to-br from-green-900/20 to-brown-800/20"
          }`}
          style={{
            backgroundImage:
              roomEnvironment === "outdoor"
                ? "radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)"
                : roomEnvironment === "cave"
                  ? "radial-gradient(circle at 30% 70%, rgba(75, 85, 99, 0.2) 0%, transparent 60%)"
                  : roomEnvironment === "dungeon"
                    ? "radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)"
                    : "radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255, 119, 48, 0.1) 0%, transparent 50%)",
            width: "min(90vw, 90vh, 400px)",
            height: "min(90vw, 90vh, 400px)",
            aspectRatio: "1",
            touchAction: "none",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
          {...bind()}
        >
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 11 }).map((_, i) => (
              <div
                key={`v-${i}`}
                className="absolute h-full w-px bg-amber-400"
                style={{ left: `${i * 10}%` }}
              />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <div
                key={`h-${i}`}
                className="absolute w-full h-px bg-amber-400"
                style={{ top: `${i * 10}%` }}
              />
            ))}
          </div>

          {/* Room Layout Elements */}
          {layoutEntities.map((entity: any) => {

                const x = entity.position.x;
                const y = entity.position.y;

                const x = entity.position.x;
            const y = entity.position.y;

            return (
              <div
                key={entity.id || entity.type + "-" + x + "-" + y}
                className={`absolute ${
                  entity.type === "wall"
                    ? "bg-stone-600 border-2 border-stone-500"
                    : entity.type === "door"
                      ? "bg-amber-700 border-2 border-amber-500"
                      : "bg-stone-400 border-2 border-stone-300 opacity-80"
                } rounded-sm shadow-lg`}
                style={{
                  left: `${x - 2}%`,
                  top: `${y - 2}%`,
                  width: `4%`,
                  height: `4%`,
                  zIndex:
                    entity.type === "wall"
                      ? 15
                      : entity.type === "door"
                        ? 12
                        : 10,
                  filter:
                    entity.type === "wall"
                      ? "drop-shadow(2px 2px 4px rgba(0,0,0,0.6))"
                      : entity.type === "door"
                        ? "drop-shadow(1px 1px 3px rgba(245,158,11,0.5))"
                        : "drop-shadow(1px 1px 2px rgba(0,0,0,0.4))",
                }}
              />
            );
          })}

          {/* Debug: Show room connections data */}
          {IS_DEBUG_MODE && roomConnections.length > 0 && (
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded z-30">
              Connections: {roomConnections.map((c: any) => c.direction).join(", ")}
            </div>
          )}

          {/* Gate-style exit indicators */}
          {roomConnections.map((connection: any) => {
            let gateStyle = {};
            let gateClass = "";

            switch (connection.direction) {
              case "north":
                gateStyle = {
                  top: "2px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "48px",
                  height: "12px",
                };
                gateClass = "rounded-b-lg";
                break;
              case "south":
                gateStyle = {
                  bottom: "2px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "48px",
                  height: "12px",
                };
                gateClass = "rounded-t-lg";
                break;
              case "east":
                gateStyle = {
                  right: "2px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "12px",
                  height: "48px",
                };
                gateClass = "rounded-l-lg";
                break;
              case "west":
                gateStyle = {
                  left: "2px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "12px",
                  height: "48px",
                };
                gateClass = "rounded-r-lg";
                break;
              case "up":
              case "down":
                gateStyle = {
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "32px",
                  height: "32px",
                };
                gateClass = "rounded-full";
                break;
              default:
                return null;
            }

            return (
              <div
                key={connection.direction}
                className={`absolute ${gateClass} ${
                  connection.isLocked
                    ? "bg-red-400 border-2 border-red-300"
                    : "bg-green-400 border-2 border-green-300"
                } transition-all duration-200 hover:scale-110 cursor-pointer`}
                style={{
                  ...gateStyle,
                  zIndex: 25,
                  boxShadow: connection.isLocked 
                    ? "0 0 8px rgba(239, 68, 68, 0.4)" 
                    : "0 0 8px rgba(34, 197, 94, 0.4)",
                }}
                title={`${connection.isLocked ? "🔒 Locked " : "🚪 "}Exit: ${connection.direction}${connection.keyRequired ? ` (Key: ${connection.keyRequired})` : ""}`}
              >
                {/* Gate indicator dot */}
                <div
                  className={`absolute inset-0 flex items-center justify-center`}
                >
                  <div
                    className={`w-2 h-2 rounded-full animate-pulse ${
                      connection.isLocked ? "bg-red-100" : "bg-green-100"
                    }`}
                  />
                </div>

                {/* Directional arrow for vertical/horizontal gates */}
                {(connection.direction === "north" || connection.direction === "south" || 
                  connection.direction === "east" || connection.direction === "west") && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div
                      className={`text-xs font-bold ${
                        connection.isLocked ? "text-red-100" : "text-green-100"
                      }`}
                    >
                      {connection.direction === "north" && "↑"}
                      {connection.direction === "south" && "↓"}
                      {connection.direction === "east" && "→"}
                      {connection.direction === "west" && "←"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Entities */}
          {combatState?.entities?.map((entity) => (
            <div
              key={entity.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                entity.hp <= 0
                  ? "cursor-not-allowed opacity-50"
                  : entity.id !== "player"
                    ? "cursor-pointer hover:scale-105"
                    : "cursor-default"
              } ${selectedTarget === entity.id ? "scale-110 z-10" : ""}`}
              style={{
                left: `${entity.position.x}%`,
                top: `${entity.position.y}%`,
              }}
              onClick={() =>
                entity.id !== "player" && entity.hp > 0
                  ? handleTargetSelection(entity.id)
                  : null
              }
            >
              {/* Main entity circle */}
              <div
                className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  entity.type === "player"
                    ? "bg-blue-600 border-blue-400"
                    : entity.hp <= 0
                      ? "bg-gray-600 border-gray-500"
                      : entity.type === "hostile"
                        ? "bg-red-600 border-red-400"
                        : "bg-gray-600 border-gray-400"
                }`}
              >
                {entity.type === "player" && (
                  <Shield className="w-4 h-4 text-white" />
                )}
                {entity.type === "hostile" && (
                  <Skull className="w-4 h-4 text-white" />
                )}

                {/* Facing direction indicator */}
                {entity.facing !== undefined && (
                  <div
                    className="absolute w-12 h-12 pointer-events-none z-10"
                    style={{
                      transform: `rotate(${entity.facing}deg)`,
                      transformOrigin: "center",
                    }}
                  >
                    <div className="w-full h-full flex items-start justify-center">
                      <div
                        className={`w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent ${
                          entity.hp <= 0
                            ? "border-b-gray-500"
                            : entity.type === "player"
                              ? "border-b-blue-400"
                              : entity.type === "hostile"
                                ? "border-b-red-400"
                                : "border-b-gray-400"
                        }`}
                        style={{
                          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
                          marginTop: "-6px",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Health bar */}
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-700 rounded">
                  <div
                    className={`h-full rounded transition-all duration-300 ${
                      entity.hp <= 0
                        ? "bg-gray-500"
                        : entity.hp > entity.maxHp * 0.6
                          ? "bg-green-500"
                          : entity.hp > entity.maxHp * 0.3
                            ? "bg-yellow-500"
                            : "bg-red-500"
                    }`}
                    style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
                  />
                </div>

                {/* Selection indicator */}
                {selectedTarget === entity.id && entity.hp > 0 && (
                  <div className="absolute -inset-1 rounded-full border-2 border-yellow-400 animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Hotbar */}
        <div className="flex gap-1">
          {/* Attack Action */}
          <Button
            variant={
              activeActionMode?.actionId === "basic_attack"
                ? "default"
                : "outline"
            }
            size="sm"
            className="w-12 h-12 p-0 flex flex-col items-center justify-center relative"
            onClick={() =>
              handleHotbarAction("basic_attack", "attack", "Attack")
            }
            disabled={getCooldownPercentage("basic_attack") > 0}
            title="Attack [1]"
          >
            <Sword className="w-4 h-4" />
            <span className="text-xs text-muted-foreground">1</span>

            {/* Cooldown indicator */}
            {getCooldownPercentage("basic_attack") > 0 && (
              <div
                className="absolute inset-0 bg-gray-600/50 rounded"
                style={{
                  clipPath: `polygon(0 ${100 - getCooldownPercentage("basic_attack")}%, 100% ${100 - getCooldownPercentage("basic_attack")}%, 100% 100%, 0% 100%)`,
                }}
              />
            )}
          </Button>

          {/* Defend Action */}
          <Button
            variant={
              activeActionMode?.actionId === "defend" ? "default" : "outline"
            }
            size="sm"
            className="w-12 h-12 p-0 flex flex-col items-center justify-center relative"
            onClick={() => handleHotbarAction("defend", "ability", "Defend")}
            disabled={getCooldownPercentage("defend") > 0}
            title="Defend [2]"
          >
            <Shield className="w-4 h-4" />
            <span className="text-xs text-muted-foreground">2</span>

            {getCooldownPercentage("defend") > 0 && (
              <div
                className="absolute inset-0 bg-gray-600/50 rounded"
                style={{
                  clipPath: `polygon(0 ${100 - getCooldownPercentage("defend")}%, 100% ${100 - getCooldownPercentage("defend")}%, 100% 100%, 0% 100%)`,
                }}
              />
            )}
          </Button>

          {/* Special Ability */}
          <Button
            variant={
              activeActionMode?.actionId === "special" ? "default" : "outline"
            }
            size="sm"
            className="w-12 h-12 p-0 flex flex-col items-center justify-center relative"
            onClick={() => handleHotbarAction("special", "ability", "Special")}
            disabled={getCooldownPercentage("special") > 0}
            title="Special [3]"
          >
            <Zap className="w-4 h-4" />
            <span className="text-xs text-muted-foreground">3</span>

            {getCooldownPercentage("special") > 0 && (
              <div
                className="absolute inset-0 bg-gray-600/50 rounded"
                style={{
                  clipPath: `polygon(0 ${100 - getCooldownPercentage("special")}%, 100% ${100 - getCooldownPercentage("special")}%, 100% 100%, 0% 100%)`,
                }}
              />
            )}
          </Button>
        </div>

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