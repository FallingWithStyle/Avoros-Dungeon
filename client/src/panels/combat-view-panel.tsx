/**
 * File: combat-view-panel.tsx
 * Responsibility: Clean combat interface panel using only the proven test combat system logic
 * Notes: Built from test-combat.tsx without any legacy tactical view dependencies
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Sword, Shield, Zap, Target, Heart, Skull } from "lucide-react";
import { combatSystem, type CombatEntity } from "@shared/combat-system";
import { useKeyboardMovement } from "@/hooks/useKeyboardMovement";
import { useGestureMovement } from "@/hooks/useGestureMovement";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { CrawlerWithDetails } from "@shared/schema";
import { useTacticalData } from "./tactical-view/tactical-data-hooks";
import { useAdjacentRoomPrefetch } from "@/hooks/useAdjacentRoomPrefetch";
import { IS_DEBUG_MODE } from "@/components/debug-panel";
import { handleRoomChangeWithRefetch } from "@/lib/roomChangeUtils";

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
  const [combatState, setCombatState] = useState(combatSystem.getState());
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [activeActionMode, setActiveActionMode] = useState<{
    type: "move" | "attack" | "ability";
    actionId: string;
    actionName: string;
  } | null>(null);
  const [manualRotation, setManualRotation] = useState(false);
  const [equippedWeapon, setEquippedWeapon] = useState<Equipment | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [movementOptions, setMovementOptions] = useState<any>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [, forceUpdate] = useState({});

  // Use the same tactical data hooks as the tactical view panel
  const {
    roomData,
    tacticalData,
    isLoading: roomLoading,
    tacticalLoading,
    tacticalError,
    handleRoomChange,
  } = useTacticalData(crawler);

  // REMOVED: Redundant fallback query that was slowing down transitions
  // The main tactical data hook already handles fallbacks efficiently

  // Use primary room data source - prefetched data should be available immediately
  const effectiveRoomData = roomData?.currentRoom || roomData?.room;

  // Prefetch adjacent rooms for faster movement transitions
  const currentRoomId = effectiveRoomData?.id || effectiveRoomData?.room?.id;
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
  const effectiveTacticalData = tacticalData;

  // Extract room connections from various possible data structures
  const roomConnections = effectiveRoomData?.connections || 
                         (effectiveRoomData && effectiveRoomData.room?.connections) ||
                         (roomData?.currentRoom?.connections) ||
                         (roomData?.room?.connections) ||
                         (roomData?.connections) ||
                         [];

  // Debug logging reduced for performance

  // Extract the actual tactical entities array from the data structure
  const tacticalEntities =
    effectiveTacticalData?.tacticalEntities || effectiveTacticalData || [];

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

  // Initialize combat system with crawler data
  const initializeCombatSystem = useCallback(() => {
    if (!effectiveTacticalData || !tacticalEntities.length) {
      return;
    }

    // Clear existing entities first
    const currentState = combatSystem.getState();
    currentState.entities.forEach((entity) => {
      combatSystem.removeEntity(entity.id);
    });

    // Initialize player from crawler data
    const playerEntity: CombatEntity = {
      id: "player",
      name: crawler.name,
      type: "player",
      hp: crawler.health,
      maxHp: crawler.maxHealth,
      energy: crawler.energy,
      maxEnergy: crawler.maxEnergy,
      power: crawler.power,
      maxPower: crawler.maxPower,
      might: crawler.might,
      agility: crawler.agility,
      endurance: crawler.endurance,
      intellect: crawler.intellect,
      charisma: crawler.charisma,
      wisdom: crawler.wisdom,
      attack: Math.floor(crawler.might * 1.2) + 8,
      defense: Math.floor(crawler.endurance * 0.8) + 5,
      speed: Math.floor(crawler.agility * 1.1),
      accuracy: crawler.wisdom + crawler.intellect,
      evasion: Math.floor(crawler.agility * 1.2),
      position: { x: 25, y: 50 },
      facing: 0,
      level: crawler.level,
      serial: crawler.serial,
      isSelected: false,
      isAlive: true,
      cooldowns: {},
      equippedWeapon: availableWeapons[0],
    };

    combatSystem.addEntity(playerEntity);
    setEquippedWeapon(availableWeapons[0]);

    // Add entities from tactical data (mobs, etc.)
    if (tacticalEntities && Array.isArray(tacticalEntities)) {
      tacticalEntities.forEach((tacticalEntity: any, index: number) => {
        if (tacticalEntity.type === "mob") {
          // Handle new format where mob data is in the data field
          if (tacticalEntity.data) {
            const mobEntity: CombatEntity = {
              id: "mob_" + (tacticalEntity.data.id || index),
              name:
                tacticalEntity.name ||
                tacticalEntity.data.name ||
                "Unknown Mob",
              type: "hostile", // Default to hostile for now
              hp:
                tacticalEntity.data.hp ||
                tacticalEntity.data.currentHealth ||
                100,
              maxHp:
                tacticalEntity.data.maxHp ||
                tacticalEntity.data.maxHealth ||
                100,
              energy: 20,
              maxEnergy: 20,
              power: 10,
              maxPower: 10,
              might: 10,
              agility: 14,
              endurance: 8,
              intellect: 6,
              charisma: 4,
              wisdom: 7,
              attack: tacticalEntity.data.attack || 12,
              defense: tacticalEntity.data.defense || 8,
              speed: tacticalEntity.data.speed || 16,
              accuracy: 16,
              evasion: 18,
              position: {
                x: tacticalEntity.position?.x || 50,
                y: tacticalEntity.position?.y || 50,
              },
              facing: 180,
              level: 3,
              isAlive: true,
              cooldowns: {},
            };

            combatSystem.addEntity(mobEntity);
          }
          // Handle old format where mob data is in the entity field
          else if (tacticalEntity.entity) {
            const mobEntity: CombatEntity = {
              id: "mob_" + (tacticalEntity.entity.id || index),
              name:
                tacticalEntity.entity.displayName ||
                tacticalEntity.entity.name ||
                "Unknown Mob",
              type:
                tacticalEntity.entity.disposition === "hostile"
                  ? "hostile"
                  : "neutral",
              hp: tacticalEntity.entity.currentHealth || 100,
              maxHp: tacticalEntity.entity.maxHealth || 100,
              energy: 20,
              maxEnergy: 20,
              power: 10,
              maxPower: 10,
              might: 10,
              agility: 14,
              endurance: 8,
              intellect: 6,
              charisma: 4,
              wisdom: 7,
              attack: tacticalEntity.entity.attack || 12,
              defense: tacticalEntity.entity.defense || 8,
              speed: tacticalEntity.entity.speed || 16,
              accuracy: 16,
              evasion: 18,
              position: {
                x: tacticalEntity.x ? (tacticalEntity.x / 10) * 100 : 50,
                y: tacticalEntity.y ? (tacticalEntity.y / 10) * 100 : 50,
              },
              facing: 180,
              level: 3,
              isAlive: tacticalEntity.entity.isAlive !== false,
              cooldowns: {},
            };

            combatSystem.addEntity(mobEntity);
          }
        }
      });
    }

    if (aiEnabled) {
      combatSystem.startAILoop();
    }

    setIsInitialized(true);
  }, [
    crawler,
    aiEnabled,
    availableWeapons,
    effectiveTacticalData,
    tacticalEntities,
  ]);

  const handleRotation = useCallback(
    (direction: "left" | "right") => {
      const player = combatState.entities.find((e) => e.id === "player");
      if (!player) return;

      const rotationAmount = 15; // degrees
      const currentFacing = player.facing || 0;
      const newFacing =
        direction === "left"
          ? (currentFacing - rotationAmount + 360) % 360
          : (currentFacing + rotationAmount) % 360;

      combatSystem.updateEntity("player", { facing: newFacing });
    },
    [combatState.entities],
  );

  // Add movement state tracking
  const [isMoving, setIsMoving] = useState(false);
  const lastMoveTime = useRef<number>(0);
  const MOVE_COOLDOWN = 1000; // 1 second cooldown between moves

  // Room transition handler for combat view
  const handleRoomTransition = useCallback(
    async (direction: string) => {
      if (!crawler?.id) {
        console.error("No crawler ID available for room transition");
        return;
      }

      // Prevent concurrent movements and enforce cooldown
      const now = Date.now();
      if (isMoving || (now - lastMoveTime.current) < MOVE_COOLDOWN) {
        return;
      }

      setIsMoving(true);
      lastMoveTime.current = now;

      try {
        // Use the same room change logic as other panels
        const success = await handleRoomChangeWithRefetch(crawler.id, direction);

        if (success) {
          // Refetch tactical data to get new room information
          handleRoomChange();

          toast({
            title: "Room Changed",
            description: "Successfully moved to " + direction + " room",
            variant: "default",
          });
        } else {
          toast({
            title: "Movement Failed",
            description: "Could not move to the " + direction + " room",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Room transition error:", error);
        toast({
          title: "Movement Error",
          description: "Failed to change rooms. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsMoving(false);
      }
    },
    [crawler?.id, handleRoomChange, toast, isMoving],
  );

  // Movement handler with enhanced collision detection and room transitions
  const handleMovement = useCallback(
    (direction: { x: number; y: number }) => {
      const player = combatState.entities.find((e) => e.id === "player");
      if (!player) return;

      if (direction.x === 0 && direction.y === 0) return;

      const moveSpeed = 2.5; // Slightly slower for better control
      let newX = player.position.x + direction.x * moveSpeed;
      let newY = player.position.y + direction.y * moveSpeed;

      // Enhanced collision detection with room layout elements
      const playerRadius = 2.0; // Slightly larger for better collision feel

      const checkCollisionWithElements = (x: number, y: number): boolean => {
        if (!tacticalEntities || !Array.isArray(tacticalEntities)) return false;

        return tacticalEntities.some((entity: any) => {
          if (
            entity.type !== "cover" &&
            entity.type !== "wall" &&
            entity.type !== "door"
          )
            return false;

          // Use entity position directly (already in percentage format)
          const elementLeft = entity.position.x - 2;
          const elementRight = entity.position.x + 2;
          const elementTop = entity.position.y - 2;
          const elementBottom = entity.position.y + 2;

          const buffer = 1.0; // Larger buffer for smoother collision
          return (
            x + playerRadius > elementLeft - buffer &&
            x - playerRadius < elementRight + buffer &&
            y + playerRadius > elementTop - buffer &&
            y - playerRadius < elementBottom + buffer
          );
        });
      };

      // Check for collision with other entities (hostile mobs)
      const checkCollisionWithEntities = (x: number, y: number): boolean => {
        return combatState.entities.some((entity: any) => {
          if (entity.id === "player" || entity.hp <= 0) return false;

          const distance = Math.sqrt(
            Math.pow(x - entity.position.x, 2) +
              Math.pow(y - entity.position.y, 2),
          );

          return distance < 4; // Minimum distance to other entities
        });
      };

      // Check room boundaries with gates for exits
      const gateStart = 40;
      const gateEnd = 60;
      const boundary = 5;

      // Declare exitDirection outside the condition
      let exitDirection = "";
      
      // Check if we're trying to move through an exit (only if not already moving)
      if (!isMoving) {
        const availableDirections = roomConnections.map(
          (conn: any) => conn.direction,
        );

        // More lenient gate detection - larger gate area
        const gateAreaStart = 35;
        const gateAreaEnd = 65;
        const exitBoundary = 8; // Slightly larger boundary for exit detection

        if (
          newY <= exitBoundary &&
          direction.y < 0 &&
          availableDirections.includes("north")
        ) {
          if (newX >= gateAreaStart && newX <= gateAreaEnd) {
            exitDirection = "north";
            handleRoomTransition("north");
            return true; // Stop movement processing since we're transitioning
          }
        } else if (
          newY >= 100 - exitBoundary &&
          direction.y > 0 &&
          availableDirections.includes("south")
        ) {
          if (newX >= gateAreaStart && newX <= gateAreaEnd) {
            exitDirection = "south";
            handleRoomTransition("south");
            return true; // Stop movement processing since we're transitioning
          }
        } else if (
          newX >= 100 - exitBoundary &&
          direction.x > 0 &&
          availableDirections.includes("east")
        ) {
          if (newY >= gateAreaStart && newY <= gateAreaEnd) {
            exitDirection = "east";
            handleRoomTransition("east");
            return true; // Stop movement processing since we're transitioning
          }
        } else if (
          newX <= exitBoundary &&
          direction.x < 0 &&
          availableDirections.includes("west")
        ) {
          if (newY >= gateAreaStart && newY <= gateAreaEnd) {
            exitDirection = "west";
            handleRoomTransition("west");
            return true; // Stop movement processing since we're transitioning
          }
        }
      }

      // If trying to exit, clamp to boundary but allow closer approach to gates
      if (exitDirection) {
        // Allow player to get closer to the gate
        newX = Math.max(3, Math.min(97, newX));
        newY = Math.max(3, Math.min(97, newY));
      } else {
        // Normal boundary clamping
        newX = Math.max(boundary, Math.min(100 - boundary, newX));
        newY = Math.max(boundary, Math.min(100 - boundary, newY));
      }

      // Check for collisions and handle sliding movement
      const wouldCollideWithElements = checkCollisionWithElements(newX, newY);
      const wouldCollideWithEntities = checkCollisionWithEntities(newX, newY);

      if (wouldCollideWithElements || wouldCollideWithEntities) {
        // Try moving only horizontally
        const horizontalX = Math.max(
          boundary,
          Math.min(100 - boundary, player.position.x + direction.x * moveSpeed),
        );
        const horizontalY = player.position.y;

        if (
          !checkCollisionWithElements(horizontalX, horizontalY) &&
          !checkCollisionWithEntities(horizontalX, horizontalY)
        ) {
          newX = horizontalX;
          newY = horizontalY;
        } else {
          // Try moving only vertically
          const verticalX = player.position.x;
          const verticalY = Math.max(
            boundary,
            Math.min(
              100 - boundary,
              player.position.y + direction.y * moveSpeed,
            ),
          );

          if (
            !checkCollisionWithElements(verticalX, verticalY) &&
            !checkCollisionWithEntities(verticalX, verticalY)
          ) {
            newX = verticalX;
            newY = verticalY;
          } else {
            // Can't move at all, just update facing
            if (direction.x !== 0 || direction.y !== 0) {
              let facing =
                Math.atan2(direction.x, -direction.y) * (180 / Math.PI);
              if (facing < 0) facing += 360;
              combatSystem.updateEntity("player", {
                facing: Math.round(facing),
              });
            }
            return;
          }
        }
      }

      // Calculate facing direction based on movement
      let facing = Math.atan2(direction.x, -direction.y) * (180 / Math.PI);
      if (facing < 0) {
        facing += 360;
      }
      const newFacing = Math.round(facing);

      // Update position
      combatSystem.moveEntityToPosition("player", { x: newX, y: newY });

      // Update facing if not targeting something
      if (!selectedTarget) {
        const currentFacing = player.facing || 0;
        const facingDiff = Math.abs(newFacing - currentFacing);
        const normalizedDiff = Math.min(facingDiff, 360 - facingDiff);

        if (normalizedDiff > 2) {
          combatSystem.updateEntity("player", { facing: newFacing });
        }
      }
    },
    [
      combatState.entities,
      selectedTarget,
      tacticalEntities,
      effectiveRoomData,
      isInitialized,
      handleRoomTransition,
    ],
  );

  // Handle target cycling with Tab key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();

        const hostileTargets = combatState.entities.filter(
          (e) => e.type === "hostile" && e.hp > 0,
        );

        if (hostileTargets.length === 0) {
          setSelectedTarget(null);
          return;
        }

        if (!selectedTarget) {
          setSelectedTarget(hostileTargets[0].id);
        } else {
          const currentIndex = hostileTargets.findIndex(
            (e) => e.id === selectedTarget,
          );
          const nextIndex = (currentIndex + 1) % hostileTargets.length;
          setSelectedTarget(hostileTargets[nextIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [combatState.entities, selectedTarget]);

  // Enable keyboard movement
  useKeyboardMovement({
    onMovement: handleMovement,
    isEnabled: !combatState.isInCombat, // Only enable when not in combat
  });

  // Use gesture movement hook for mobile
  const { containerRef, bind } = useGestureMovement({
    onMovement: handleMovement,
    isEnabled: isMobile && !combatState.isInCombat,
  });

  // Hotbar action handler
  const handleHotbarAction = useCallback(
    (actionId: string, actionType: string, actionName: string) => {
      if (actionType === "attack" && actionId === "basic_attack") {
        if (selectedTarget) {
          const player = combatState.entities.find((e) => e.id === "player");
          const target = combatState.entities.find(
            (e) => e.id === selectedTarget,
          );

          if (player && target) {
            const weaponRange = equippedWeapon ? equippedWeapon.range * 10 : 10;
            const distance = Math.sqrt(
              Math.pow(target.position.x - player.position.x, 2) +
                Math.pow(target.position.y - player.position.y, 2),
            );

            if (distance <= weaponRange) {
              combatSystem.executeAttack("player", selectedTarget);
            } else {
              toast({
                title: "Out of Range",
                description: "Target is too far away to attack",
                variant: "destructive",
              });
            }
          }
        } else {
          combatSystem.executeAttack("player");
        }
        setActiveActionMode(null);
      } else if (actionType === "ability") {
        setActiveActionMode({ type: actionType as any, actionId, actionName });
      }
    },
    [selectedTarget, combatState.entities, equippedWeapon, toast],
  );

  // Get cooldown percentage for hotbar display
  const getCooldownPercentage = useCallback(
    (actionId: string): number => {
      const player = combatState.entities.find((e) => e.id === "player");
      if (!player || !player.cooldowns) return 0;

      const now = Date.now();
      const lastUsed = player.cooldowns[actionId] || 0;

      const cooldowns: Record<string, number> = {
        basic_attack: 800,
        defend: 3000,
        special: 5000,
      };

      const cooldown = cooldowns[actionId] || 1000;
      const timeLeft = Math.max(0, lastUsed + cooldown - now);
      return (timeLeft / cooldown) * 100;
    },
    [combatState.entities],
  );

  // Subscribe to combat system updates
  useEffect(() => {
    const unsubscribe = combatSystem.subscribe((state) => {
      setCombatState(state);

      // Clear selectedTarget if the currently selected entity is dead or no longer exists
      if (selectedTarget) {
        const selectedEntity = state.entities.find(
          (e) => e.id === selectedTarget,
        );
        if (!selectedEntity || selectedEntity.hp <= 0) {
          setSelectedTarget(null);
        }
      }
    });

    return unsubscribe;
  }, [selectedTarget]);

  // Only reset isInitialized if room or tactical entities actually changed
  const prevRoomIdRef = useRef<string | undefined>();
  const prevEntitiesLenRef = useRef<number | undefined>();

  useEffect(() => {
    const currentRoomId = effectiveRoomData?.room?.id;
    const entitiesLen = tacticalEntities?.length ?? 0;

    // Only reset isInitialized if room or entities have changed
    if (
      prevRoomIdRef.current !== undefined &&
      (prevRoomIdRef.current !== currentRoomId ||
        prevEntitiesLenRef.current !== entitiesLen)
    ) {
      setIsInitialized(false);
    }
    prevRoomIdRef.current = currentRoomId;
    prevEntitiesLenRef.current = entitiesLen;

    if (
      !roomLoading &&
      !tacticalLoading &&
      effectiveTacticalData &&
      entitiesLen > 0 &&
      !isInitialized
    ) {
      initializeCombatSystem();
    }

    return () => {
      combatSystem.stopAILoop();
    };
  }, [
    initializeCombatSystem,
    roomLoading,
    tacticalLoading,
    effectiveRoomData?.room?.id,
    tacticalEntities?.length,
    effectiveTacticalData,
    isInitialized,
  ]);

  // Force re-render during cooldowns
  useEffect(() => {
    const interval = setInterval(() => {
      const player = combatState.entities.find((e) => e.id === "player");
      if (player?.cooldowns) {
        const now = Date.now();
        const hasActiveCooldowns = Object.values(player.cooldowns).some(
          (lastUsed) => {
            const timeSince = now - lastUsed;
            return timeSince < 5000;
          },
        );

        if (hasActiveCooldowns) {
          forceUpdate({});
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [combatState.entities]);

  // CONDITIONAL LOGIC AFTER ALL HOOKS
  const player = combatState.entities.find((e) => e.id === "player");
  const enemies = combatState.entities.filter((e) => e.type === "hostile");
  const selectedEntity = combatState.entities.find(
    (e) => e.id === selectedTarget,
  );

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
          Combat View - {effectiveRoomData?.name || effectiveRoomData?.room?.name || "Unknown Room"}
          <Badge variant={combatState.isInCombat ? "destructive" : "secondary"}>
            {combatState.isInCombat ? "IN COMBAT" : isMoving ? "MOVING..." : "READY"}
          </Badge>
          {(effectiveRoomData?.environment || effectiveRoomData?.room?.environment) && (
            <Badge variant="outline" className="text-xs">
              {effectiveRoomData?.environment || effectiveRoomData?.room?.environment}
            </Badge>
          )}
          
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Combat Arena */}
        <div
          ref={containerRef}
          className={`relative border border-amber-600/20 rounded-lg overflow-hidden mx-auto ${
            (effectiveRoomData?.environment || effectiveRoomData?.room?.environment) === "outdoor"
              ? "bg-gradient-to-br from-green-900/20 to-blue-800/20"
              : (effectiveRoomData?.environment || effectiveRoomData?.room?.environment) === "cave"
                ? "bg-gradient-to-br from-gray-900/40 to-stone-800/40"
                : (effectiveRoomData?.environment || effectiveRoomData?.room?.environment) === "dungeon"
                  ? "bg-gradient-to-br from-purple-900/20 to-gray-800/30"
                  : "bg-gradient-to-br from-green-900/20 to-brown-800/20"
          }`}
          style={{
            backgroundImage:
              (effectiveRoomData?.environment || effectiveRoomData?.room?.environment) === "outdoor"
                ? "radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)"
                : (effectiveRoomData?.environment || effectiveRoomData?.room?.environment) === "cave"
                  ? "radial-gradient(circle at 30% 70%, rgba(75, 85, 99, 0.2) 0%, transparent 60%)"
                  : (effectiveRoomData?.environment || effectiveRoomData?.room?.environment) === "dungeon"
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
          {tacticalEntities && Array.isArray(tacticalEntities)
            ? tacticalEntities.map((entity: any) => {
                if (
                  entity.type !== "cover" &&
                  entity.type !== "wall" &&
                  entity.type !== "door"
                )
                  return null;

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
              })
            : null}

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
          {combatState.entities.map((entity) => (
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
                  ? setSelectedTarget(entity.id)
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
          {combatState.isInCombat && (
            <div className="text-red-400">
              Combat Mode: Movement restricted near enemies
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}