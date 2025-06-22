/**
 * File: test-combat.tsx
 * Responsibility: Test page for the new combat system based on the combat philosophy
 * Notes: Provides a testing environment for fast-paced, immediate action combat
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { combatSystem, type CombatEntity } from "@shared/combat-system";
import { useKeyboardMovement } from "@/hooks/useKeyboardMovement";
import { Sword, Shield, Zap, Heart, Target, Move, Skull } from "lucide-react";

export interface Equipment {
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

export default function TestCombat() {
  const [combatState, setCombatState] = useState(combatSystem.getState());
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [activeActionMode, setActiveActionMode] = useState<{
    type: "move" | "attack" | "ability";
    actionId: string;
    actionName: string;
  } | null>(null);
  const [manualRotation, setManualRotation] = useState(false);
  const [availableWeapons, setAvailableWeapons] = useState<Equipment[]>([]);
  const [equippedWeapon, setEquippedWeapon] = useState<Equipment | null>(null);
  const [showTargetRangeIndicator, setShowTargetRangeIndicator] = useState(false);

  // Action handlers - Define these first before they're used
  const handleAttack = useCallback((targetId: string) => {
    setSelectedTarget(null);
    setActiveActionMode(null);
    combatSystem.executeAttack("player", targetId);
  }, []);

  const handleMove = (direction: string) => {
    const player = combatState.entities.find(e => e.id === "player");
    if (!player) return;

    let newX = player.position.x;
    let newY = player.position.y;
    const moveDistance = 10;

    switch (direction) {
      case "up":
        newY -= moveDistance;
        break;
      case "down":
        newY += moveDistance;
        break;
      case "left":
        newX -= moveDistance;
        break;
      case "right":
        newX += moveDistance;
        break;
    }

    combatSystem.moveEntityToPosition("player", { x: newX, y: newY });
  };

  // Keyboard movement handler
  const handleMovement = useCallback((direction: { x: number; y: number }) => {
    const player = combatState.entities.find(e => e.id === "player");
    if (!player) return;

    // Only move if there's actual movement input
    if (direction.x === 0 && direction.y === 0) return;

    const moveSpeed = 3; // Increased movement speed
    const newX = Math.max(0, Math.min(100, player.position.x + direction.x * moveSpeed));
    const newY = Math.max(0, Math.min(100, player.position.y + direction.y * moveSpeed));

    // Calculate facing direction based on movement
    // Convert movement vector to degrees (0° = North, positive clockwise)
    let facing = Math.atan2(direction.x, -direction.y) * (180 / Math.PI);
    if (facing < 0) {
      facing += 360;
    }
    const newFacing = Math.round(facing);

    // Update position immediately
    combatSystem.moveEntityToPosition("player", { x: newX, y: newY });

    // Only update facing from movement if no target is selected
    if (!selectedTarget) {
      const currentFacing = player.facing || 0;
      const facingDiff = Math.abs(newFacing - currentFacing);
      const normalizedDiff = Math.min(facingDiff, 360 - facingDiff);

      if (normalizedDiff > 2) { // Smaller threshold for smoother movement-based facing
        combatSystem.updateEntity("player", { facing: newFacing });
      }
    }
    // If target is selected, facing will be handled by the targeting effect
  }, [combatState.entities]);

  // Enable keyboard movement
  useKeyboardMovement({
    onMovement: handleMovement,
    isEnabled: true,
  });

  // Hotbar action handler
  const handleHotbarAction = useCallback((actionId: string, actionType: string, actionName: string) => {
    if (actionType === "attack" && actionId === "basic_attack") {
      if (selectedTarget) {
        // Check if target is in range before attacking
        const player = combatState.entities.find(e => e.id === "player");
        const target = combatState.entities.find(e => e.id === selectedTarget);

        if (player && target) {
          const weaponRange = equippedWeapon ? getWeaponRange(equippedWeapon) * 10 : 10;
          const distance = Math.sqrt(
            Math.pow(target.position.x - player.position.x, 2) + 
            Math.pow(target.position.y - player.position.y, 2)
          );

          if (distance <= weaponRange) {
            combatSystem.executeAttack("player", selectedTarget);
          } else {
            console.log("Target out of range for attack!");
          }
        }
      } else {
        // Show available targets or attack without target
        combatSystem.executeAttack("player");
      }
      setActiveActionMode(null);
    } else if (actionType === "ability") {
      // Handle other abilities
      setActiveActionMode({ type: actionType as any, actionId, actionName });
    }
  }, [selectedTarget, combatState.entities, equippedWeapon]);

  // Manual rotation handler
  const handleManualRotation = useCallback((direction: 'left' | 'right') => {
    setManualRotation(true);
    const player = combatState.entities.find(e => e.id === "player");
    if (!player) return;

    const rotationAmount = direction === 'right' ? 15 : -15; // 15 degrees per rotation
    let newFacing = (player.facing || 0) + rotationAmount;

    // Normalize angle to be between 0 and 360
    if (newFacing < 0) newFacing += 360;
    if (newFacing >= 360) newFacing -= 360;

    combatSystem.updateEntity("player", { facing: newFacing });

    setTimeout(() => {
      setManualRotation(false);
    }, 200);
  }, [combatState]);

  // Auto-target facing when target changes (only if not manually rotating)
  useEffect(() => {
    if (!selectedTarget || manualRotation) return;

    const player = combatState.entities.find(e => e.id === "player");
    const target = combatState.entities.find(e => e.id === selectedTarget);

    if (player && target) {
      // Calculate angle to target
      const dx = target.position.x - player.position.x;
      const dy = target.position.y - player.position.y;

      if (dx !== 0 || dy !== 0) {
        // Calculate angle in degrees (0° = North, positive clockwise)
        // For screen coordinates where Y increases downward
        let angle = Math.atan2(dx, -dy) * (180 / Math.PI);

        // Normalize angle to 0-360
        if (angle < 0) {
          angle += 360;
        }

        const newFacing = Math.round(angle);
        // Always update facing when targeting (override movement-based facing)
        combatSystem.updateEntity("player", { facing: newFacing });
      }
    }
  }, [selectedTarget, manualRotation, combatState.entities]); // Include full entities for proper change detection

  // Keyboard hotkey handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Hotkey shortcuts
      switch (key) {
        case '1':
          event.preventDefault();
          handleHotbarAction("basic_attack", "attack", "Attack");
          break;
        case '2':
          event.preventDefault();
          handleHotbarAction("defend", "ability", "Defend");
          break;
        case '3':
          event.preventDefault();
          handleHotbarAction("special", "ability", "Special");
          break;
        case 'q':
          event.preventDefault();
          handleManualRotation('left');
          break;
        case 'e':
          event.preventDefault();
          handleManualRotation('right');
          break;
        case 'tab':
          event.preventDefault();
          // Cycle through targets
          const enemies = combatState.entities.filter(e => e.type === "hostile" && e.hp > 0);
          if (enemies.length > 0) {
            const currentIndex = enemies.findIndex(e => e.id === selectedTarget);
            const nextIndex = (currentIndex + 1) % enemies.length;
            setSelectedTarget(enemies[nextIndex].id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleHotbarAction, selectedTarget, combatState, handleManualRotation]);

  // Get weapon range from equipment
  const getWeaponRange = (weapon: Equipment): number => {
    return weapon.range;
  };

  // Handle click events on the combat grid
  const handleGridClick = useCallback((gridX: number, gridY: number) => {
    if (activeActionMode?.type === "move") {
      const newPosition = { x: gridX, y: gridY };
      combatSystem.moveEntityToPosition("player", newPosition);
      setActiveActionMode(null);
    } else if (activeActionMode?.type === "attack") {
      // Check if target is within weapon range
      const player = combatState.entities.find(e => e.id === "player");
      if (!player) return;

      const weaponRange = equippedWeapon ? getWeaponRange(equippedWeapon) * 10 : 10; // Convert to grid units
      const distance = Math.sqrt(
        Math.pow(gridX - player.position.x, 2) + 
        Math.pow(gridY - player.position.y, 2)
      );

      if (distance > weaponRange) {
        console.log("Target out of range! Distance: " + Math.round(distance) + ", Range: " + weaponRange);
        return;
      }

      // Find entity at clicked position
      const clickedEntity = combatState.entities.find(entity => 
        Math.abs(entity.position.x - gridX) < 5 && 
        Math.abs(entity.position.y - gridY) < 5 &&
        entity.id !== "player"
      );

      if (clickedEntity) {
        handleAttack(clickedEntity.id);
      } else {
        // Cancel attack if no valid target
        setActiveActionMode(null);
        setSelectedTarget(null);
      }
    }
  }, [activeActionMode, combatState.entities, handleAttack, equippedWeapon]);

  const selectTarget = useCallback((targetId: string) => {
    setSelectedTarget(targetId);
  }, []);

  const handleWeaponChange = useCallback((weapon: Equipment) => {
    setEquippedWeapon(weapon);
    
    // Update the player entity with the new weapon
    const player = combatState.entities.find(e => e.id === "player");
    if (player) {
      const weaponAttack = weapon ? 
        (weapon.mightBonus || 0) + 5 : // Base weapon damage + bonus
        0; // Unarmed

      combatSystem.updateEntity("player", {
        attack: 18 + weaponAttack,
        equippedWeapon: weapon
      });
    }
  }, [combatState.entities]);

  const handleAttackMode = useCallback(() => {
    setActiveActionMode({
      type: "attack",
      actionId: "basic_attack",
      actionName: "Attack"
    });
  }, []);

  // Subscribe to combat system updates
  useEffect(() => {
    let updateTimeout: NodeJS.Timeout | null = null;

    const unsubscribe = combatSystem.subscribe((state) => {
      // Light throttling to prevent excessive updates while maintaining responsiveness
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = setTimeout(() => {
        setCombatState(state);
        updateTimeout = null;
      }, 8); // ~120fps throttling for better responsiveness
    });

    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      unsubscribe();
    };
  }, []);

  // Initialize test scenario only once
  useEffect(() => {
    initializeTestScenario();
  }, []);

  // Load mock weapons for testing
  useEffect(() => {
    const mockWeapons: Equipment[] = [
      {
        id: "sword1",
        name: "Iron Sword",
        description: "A sturdy iron blade",
        type: "weapon",
        damageAttribute: "might",
        range: 1,
        mightBonus: 5
      },
      {
        id: "bow1", 
        name: "Hunting Bow",
        description: "A flexible ranged weapon",
        type: "weapon",
        damageAttribute: "agility",
        range: 3,
        agilityBonus: 3
      },
      {
        id: "staff1",
        name: "Wizard Staff",
        description: "Channels magical energy",
        type: "weapon", 
        damageAttribute: "might",
        range: 2,
        mightBonus: 2
      }
    ];

    setAvailableWeapons(mockWeapons);
    // Auto-equip the first weapon for testing
    const firstWeapon = mockWeapons[0];
    setEquippedWeapon(firstWeapon);

    // Update player entity if it exists
    const player = combatState.entities.find(e => e.id === "player");
    if (player) {
      const weaponAttack = firstWeapon ? 
        (firstWeapon.mightBonus || 0) + 5 : 
        0;

      combatSystem.updateEntity("player", {
        attack: 18 + weaponAttack,
        equippedWeapon: firstWeapon
      });
    }
  }, [combatState.entities]);

  const initializeTestScenario = () => {
    // Clear existing entities
    combatState.entities.forEach(entity => {
      combatSystem.removeEntity(entity.id);
    });

    // Get current equipped weapon (will be set after useEffect runs)
    const currentWeapon = equippedWeapon || availableWeapons[0] || null;

    // Calculate weapon bonuses for player
    const weaponAttack = currentWeapon ? 
      (currentWeapon.mightBonus || 0) + 5 : // Base weapon damage + bonus
      0; // Unarmed

    // Create player entity
    const player: CombatEntity = {
      id: "player",
      name: "Test Crawler",
      type: "player",
      hp: 100,
      maxHp: 100,
      energy: 50,
      maxEnergy: 50,
      power: 25,
      maxPower: 25,
      might: 15,
      agility: 12,
      endurance: 14,
      intellect: 10,
      charisma: 8,
      wisdom: 11,
      attack: 18 + weaponAttack,
      defense: 12,
      speed: 15,
      accuracy: 22,
      evasion: 14,
      position: { x: 25, y: 50 },
      facing: 0,
      level: 5,
      serial: 1001,
      isSelected: false,
      isAlive: true,
      cooldowns: {},
      equippedWeapon: currentWeapon
    };

    combatSystem.addEntity(player);

    // Create enemy entities
    const goblin: CombatEntity = {
      id: "goblin1",
      name: "Goblin Warrior",
      type: "hostile",
      hp: 45,
      maxHp: 45,
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
      attack: 12,
      defense: 8,
      speed: 16,
      accuracy: 16,
      evasion: 18,
      position: { x: 75, y: 35 },
      facing: 180,
      level: 3,
      isAlive: true,
      cooldowns: {}
    };

    const orc: CombatEntity = {
      id: "orc1",
      name: "Orc Brute",
      type: "hostile",
      hp: 80,
      maxHp: 80,
      energy: 30,
      maxEnergy: 30,
      power: 15,
      maxPower: 15,
      might: 18,
      agility: 8,
      endurance: 16,
      intellect: 5,
      charisma: 3,
      wisdom: 6,
      attack: 22,
      defense: 14,
      speed: 10,
      accuracy: 14,
      evasion: 8,
      position: { x: 75, y: 65 },
      facing: 180,
      level: 4,
      isAlive: true,
      cooldowns: {}
    };

    combatSystem.addEntity(goblin);
    combatSystem.addEntity(orc);
  };

  const resetScenario = () => {
    // Clear all state first
    setSelectedTarget(null);
    setActiveActionMode(null);
    setManualRotation(false);

    // Then reinitialize
    initializeTestScenario();
  };

  // Get cooldown percentage for hotbar display
  const getCooldownPercentage = (actionId: string): number => {
    const player = combatState.entities.find(e => e.id === "player");
    if (!player || !player.cooldowns) return 0;

    const now = Date.now();
    const lastUsed = player.cooldowns[actionId] || 0;

    const cooldowns: Record<string, number> = {
      "basic_attack": 800,
      "defend": 3000,
      "special": 5000
    };

    const cooldown = cooldowns[actionId] || 1000;
    const timeLeft = Math.max(0, (lastUsed + cooldown) - now);
    return (timeLeft / cooldown) * 100;
  };

  const player = combatState.entities.find(e => e.id === "player");
  const enemies = combatState.entities.filter(e => e.type === "hostile");
  const selectedEntity = combatState.entities.find(e => e.id === selectedTarget);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-amber-950/20 to-orange-900/30 p-4">
      <div className="container mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <Card className="border-amber-600/30 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-300">
              <Sword className="w-5 h-5" />
              Combat System Test
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant={combatState.isInCombat ? "destructive" : "secondary"}>
                {combatState.isInCombat ? "IN COMBAT" : "READY"}
              </Badge>
              <Button onClick={resetScenario} variant="outline" size="sm">
                Reset Scenario
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Combat Arena */}
          <div className="lg:col-span-2">
            <Card className="border-amber-600/30 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-amber-300">Combat Arena</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="relative w-full h-96 bg-gradient-to-br from-green-900/20 to-brown-800/20 border border-amber-600/20 rounded-lg overflow-hidden"
                  style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255, 119, 48, 0.1) 0%, transparent 50%)' }}
                >
                  {/* Grid overlay */}
                  <div className="absolute inset-0 opacity-10">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={`v-${i}`} className="absolute h-full w-px bg-amber-400" style={{ left: `${i * 10}%` }} />
                    ))}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={`h-${i}`} className="absolute w-full h-px bg-amber-400" style={{ top: `${i * 10}%` }} />
                    ))}
                  </div>



                  {/* Entities */}
                  {combatState.entities.map((entity) => {
                    // Calculate if this entity is in range of player's weapon (for non-player entities)
                    let isInRange = false;
                    let friendlinessColor = "border-red-400"; // Default for hostile

                    if (entity.id !== "player") {
                      const player = combatState.entities.find(e => e.id === "player");
                      if (player) {
                        const weaponRange = equippedWeapon ? getWeaponRange(equippedWeapon) * 10 : 10;
                        const distance = Math.sqrt(
                          Math.pow(entity.position.x - player.position.x, 2) + 
                          Math.pow(entity.position.y - player.position.y, 2)
                        );
                        isInRange = distance <= weaponRange;

                        // Set color based on entity type/friendliness
                        if (entity.type === "hostile") {
                          friendlinessColor = "border-red-400";
                        } else if (entity.type === "neutral") {
                          friendlinessColor = "border-yellow-400";
                        } else if (entity.type === "friendly" || entity.type === "ally") {
                          friendlinessColor = "border-green-400";
                        }
                      }
                    }

                    return (
                      <div
                        key={entity.id}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                          selectedTarget === entity.id ? 'scale-110 z-10' : 'hover:scale-105'
                        }`}
                        style={{
                          left: `${entity.position.x}%`,
                          top: `${entity.position.y}%`,
                        }}
                        onClick={() => entity.type === "hostile" ? setSelectedTarget(entity.id) : null}
                      >
                        {/* Range indicator ring - only show when in range */}
                        {entity.id !== "player" && isInRange && (
                          <div className={`absolute -inset-2 rounded-full border-2 ${friendlinessColor} shadow-lg transition-all duration-300`} style={{
                            boxShadow: `0 0 10px ${friendlinessColor.includes('red') ? 'rgba(239, 68, 68, 0.5)' : 
                                                    friendlinessColor.includes('yellow') ? 'rgba(245, 158, 11, 0.5)' : 
                                                    'rgba(34, 197, 94, 0.5)'}`
                          }} />
                        )}

                        {/* Main entity circle */}
                        <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          entity.type === "player" 
                            ? "bg-blue-600 border-blue-400" 
                            : entity.type === "hostile"
                            ? isInRange 
                              ? "bg-red-600 border-green-400 shadow-lg shadow-green-400/30" 
                              : "bg-red-600 border-red-400"
                            : "bg-green-600 border-green-400"
                        }`}>
                          {entity.type === "player" && <Shield className="w-4 h-4 text-white" />}
                          {entity.type === "hostile" && <Skull className="w-4 h-4 text-white" />}

                          {/* Facing direction indicator - colored arrows based on entity type */}
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
                                    entity.type === "player" 
                                      ? "border-b-blue-400" 
                                      : entity.type === "hostile"
                                      ? "border-b-red-400"
                                      : "border-b-green-400"
                                  }`}
                                  style={{
                                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
                                    marginTop: "-6px", // Position arrow to extend from behind the circle
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Health bar */}
                          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-700 rounded">
                            <div 
                              className={`h-full rounded transition-all duration-300 ${
                                entity.hp > entity.maxHp * 0.6 ? "bg-green-500" :
                                entity.hp > entity.maxHp * 0.3 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
                            />
                          </div>

                          {/* Selection indicator */}
                          {selectedTarget === entity.id && (
                            <div className="absolute -inset-1 rounded-full border-2 border-yellow-400 animate-pulse" />
                          )}

                          {/* Range status indicator for enemies */}
                          {entity.type === "hostile" && isInRange && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-green-200 animate-pulse" 
                                 title="In weapon range" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control Panel */}
          <div className="space-y-4">

            {/* Weapon Selection */}
            <Card className="border-amber-600/30 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-amber-300 text-sm flex items-center gap-2">
                  <Sword className="w-4 h-4" />
                  Weapon Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Weapon Display & Cycle Button */}
                <button
                  onClick={() => {
                    const currentIndex = equippedWeapon ? availableWeapons.findIndex(w => w.id === equippedWeapon.id) : -1;
                    const nextIndex = (currentIndex + 1) % availableWeapons.length;
                    handleWeaponChange(availableWeapons[nextIndex]);
                  }}
                  className="w-full p-3 bg-blue-900/30 border border-blue-600/30 rounded-lg backdrop-blur-sm hover:bg-blue-800/40 transition-colors"
                  title="Click to cycle to next weapon"
                >
                  {equippedWeapon ? (
                    <div>
                      <div className="font-medium text-blue-200 flex items-center justify-between">
                        {equippedWeapon.name}
                        <span className="text-xs text-blue-400">Click to cycle</span>
                      </div>
                      <div className="text-sm text-blue-300">{equippedWeapon.description}</div>
                      <div className="text-xs text-blue-400 mt-1">
                        Range: {getWeaponRange(equippedWeapon)} | 
                        Damage Attr: {equippedWeapon.damageAttribute} |
                        Bonus: +{equippedWeapon.mightBonus || 0}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-gray-300 flex items-center justify-between">
                        Unarmed (Fists)
                        <span className="text-xs text-gray-400">Click to equip weapon</span>
                      </div>
                      <div className="text-xs text-gray-400">Range: 1 | Base damage</div>
                    </div>
                  )}
                </button>

                {/* Weapon Count Indicator */}
                <div className="text-xs text-center text-amber-400">
                  Weapon {equippedWeapon ? availableWeapons.findIndex(w => w.id === equippedWeapon.id) + 1 : 0} of {availableWeapons.length}
                </div>
              </CardContent>
            </Card>

            {/* Player Status */}
            {player && (
              <Card className="border-blue-600/30 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-blue-300 text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {player.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-red-300">HP:</span>
                    <span className="text-white">{player.hp}/{player.maxHp}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-blue-300">Energy:</span>
                    <span className="text-white">{player.energy}/{player.maxEnergy}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-purple-300">Power:</span>
                    <span className="text-white">{player.power}/{player.maxPower}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                    <div>Might: {player.might}</div>
                    <div>Agility: {player.agility}</div>
                    <div>Endurance: {player.endurance}</div>
                    <div>Intellect: {player.intellect}</div>
                    <div>Charisma: {player.charisma}</div>
                    <div>Wisdom: {player.wisdom}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hotbar */}
            <Card className="border-amber-600/30 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-amber-300 text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Combat Hotbar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-1">
                  {/* Attack Action */}
                  <Button
                    variant={activeActionMode?.actionId === "basic_attack" ? "default" : "outline"}
                    size="sm"
                    className="w-12 h-12 p-0 flex flex-col items-center justify-center relative"
                    onClick={() => handleHotbarAction("basic_attack", "attack", "Attack")}
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
                          clipPath: `polygon(0 ${100 - getCooldownPercentage("basic_attack")}%, 100% ${100 - getCooldownPercentage("basic_attack")}%, 100% 100%, 0% 100%)` 
                        }}
                      />
                    )}
                  </Button>

                  {/* Defend Action */}
                  <Button
                    variant={activeActionMode?.actionId === "defend" ? "default" : "outline"}
                    size="sm"
                    className="w-12 h-12 p-0 flex flex-col items-center justify-center relative"
                    onClick={() => handleHotbarAction("defend", "ability", "Defend")}
                    disabled={getCooldownPercentage("defend") > 0}
                    title="Defend [2]"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-xs text-muted-foreground">2</span>

                    {/* Cooldown indicator */}
                    {getCooldownPercentage("defend") > 0 && (
                      <div 
                        className="absolute inset-0 bg-gray-600/50 rounded"
                        style={{ 
                          clipPath: `polygon(0 ${100 - getCooldownPercentage("defend")}%, 100% ${100 - getCooldownPercentage("defend")}%, 100% 100%, 0% 100%)` 
                        }}
                      />
                    )}
                  </Button>

                  {/* Special Ability */}
                  <Button
                    variant={activeActionMode?.actionId === "special" ? "default" : "outline"}
                    size="sm"
                    className="w-12 h-12 p-0 flex flex-col items-center justify-center relative"
                    onClick={() => handleHotbarAction("special", "ability", "Special")}
                    disabled={getCooldownPercentage("special") > 0}
                    title="Special [3]"
                  >
                    <Zap className="w-4 h-4" />
                    <span className="text-xs text-muted-foreground">3</span>

                    {/* Cooldown indicator */}
                    {getCooldownPercentage("special") > 0 && (
                      <div 
                        className="absolute inset-0 bg-gray-600/50 rounded"
                        style={{ 
                          clipPath: `polygon(0 ${100 - getCooldownPercentage("special")}%, 100% ${100 - getCooldownPercentage("special")}%, 100% 100%, 0% 100%)` 
                        }}
                      />
                    )}
                  </Button>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  <div>WASD: Move</div>
                  <div>QE: Rotate Left/Right</div>
                  <div>1-3: Hotbar Actions</div>
                  <div>Tab: Cycle Targets</div>
                  {selectedTarget && <div className="text-yellow-400">Target: {selectedEntity?.name}</div>}
                  {activeActionMode && <div className="text-green-400">Mode: {activeActionMode.actionName}</div>}
                </div>
              </CardContent>
            </Card>

            {/* Manual Combat Actions */}
            <Card className="border-red-600/30 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-red-300 text-sm flex items-center gap-2">
                  <Sword className="w-4 h-4" />
                  Manual Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    if (selectedTarget) {
                      const player = combatState.entities.find(e => e.id === "player");
                      const target = combatState.entities.find(e => e.id === selectedTarget);

                      if (player && target) {
                        const weaponRange = equippedWeapon ? getWeaponRange(equippedWeapon) * 10 : 10;
                        const distance = Math.sqrt(
                          Math.pow(target.position.x - player.position.x, 2) + 
                          Math.pow(target.position.y - player.position.y, 2)
                        );

                        if (distance <= weaponRange) {
                          combatSystem.executeAttack("player", selectedTarget);
                        } else {
                          console.log("Target out of range for manual attack!");
                        }
                      }
                    } else {
                      handleAttackMode();
                    }
                  }}
                  variant={activeActionMode?.type === "attack" ? "destructive" : "outline"}
                  disabled={selectedTarget && (() => {
                    const player = combatState.entities.find(e => e.id === "player");
                    const target = combatState.entities.find(e => e.id === selectedTarget);

                    if (player && target) {
                      const weaponRange = equippedWeapon ? getWeaponRange(equippedWeapon) * 10 : 10;
                      const distance = Math.sqrt(
                        Math.pow(target.position.x - player.position.x, 2) + 
                        Math.pow(target.position.y - player.position.y, 2)
                      );
                      return distance > weaponRange;
                    }
                    return false;
                  })()}
                >
                  <Target className="w-4 h-4 mr-2" />
                  {selectedTarget && (() => {
                    const player = combatState.entities.find(e => e.id === "player");
                    const target = combatState.entities.find(e => e.id === selectedTarget);

                    if (player && target) {
                      const weaponRange = equippedWeapon ? getWeaponRange(equippedWeapon) * 10 : 10;
                      const distance = Math.sqrt(
                        Math.pow(target.position.x - player.position.x, 2) + 
                        Math.pow(target.position.y - player.position.y, 2)
                      );

                      if (distance > weaponRange) {
                        return `Out of Range (${selectedEntity?.name})`;
                      }
                    }
                    return `Attack ${selectedEntity?.name}`;
                  })() || "Attack Target"}
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}