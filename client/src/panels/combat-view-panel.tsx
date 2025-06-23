
/**
 * File: combat-view-panel.tsx
 * Responsibility: Clean combat interface panel using only the proven test combat system logic
 * Notes: Built from test-combat.tsx without any legacy tactical view dependencies
 */

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Sword, Shield, Zap, Target, Heart, Skull } from "lucide-react";
import { combatSystem, type CombatEntity } from "@shared/combat-system";
import { useKeyboardMovement } from "@/hooks/useKeyboardMovement";
import { useGestureMovement } from "@/hooks/useGestureMovement";
import { useToast } from "@/hooks/use-toast";
import type { CrawlerWithDetails } from "@shared/schema";

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

  // Cover elements for testing - in real implementation these would come from room data
  const [coverElements] = useState<Array<{
    id: string;
    type: "full_wall" | "half_wall";
    position: { x: number; y: number };
    width: number;
    height: number;
    facing: number;
  }>>([
    {
      id: "wall1",
      type: "full_wall" as const,
      position: { x: 35, y: 30 },
      width: 15,
      height: 3,
      facing: 0
    },
    {
      id: "wall2", 
      type: "half_wall" as const,
      position: { x: 65, y: 45 },
      width: 12,
      height: 3,
      facing: 90
    },
    {
      id: "wall3",
      type: "full_wall" as const,
      position: { x: 50, y: 75 },
      width: 8,
      height: 3,
      facing: 0
    }
  ]);

  // Mock weapons for testing - in real implementation these would come from crawler equipment
  const availableWeapons: Equipment[] = [
    {
      id: "sword1",
      name: "Iron Sword",
      description: "A sturdy iron blade",
      type: "weapon",
      damageAttribute: "might",
      range: 1.5,
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
    }
  ];

  // Initialize combat system with crawler data
  const initializeCombatSystem = useCallback(() => {
    if (isInitialized) return;

    // Clear existing entities
    const currentState = combatSystem.getState();
    currentState.entities.forEach(entity => {
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
      equippedWeapon: availableWeapons[0]
    };

    combatSystem.addEntity(playerEntity);
    setEquippedWeapon(availableWeapons[0]);

    // Add some test enemies for demonstration
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

    combatSystem.addEntity(goblin);

    if (aiEnabled) {
      combatSystem.startAILoop();
    }

    setIsInitialized(true);
  }, [crawler, aiEnabled, isInitialized, availableWeapons]);

  // Movement handler with collision detection
  const handleMovement = useCallback((direction: { x: number; y: number }) => {
    const player = combatState.entities.find(e => e.id === "player");
    if (!player) return;

    if (direction.x === 0 && direction.y === 0) return;

    const moveSpeed = 3;
    let newX = Math.max(0, Math.min(100, player.position.x + direction.x * moveSpeed));
    let newY = Math.max(0, Math.min(100, player.position.y + direction.y * moveSpeed));

    // Check collision with cover elements
    const playerRadius = 1.5;
    
    const checkCollisionWithCover = (x: number, y: number): boolean => {
      return coverElements.some(cover => {
        let wallLeft, wallRight, wallTop, wallBottom;
        
        if (cover.facing === 90) {
          wallLeft = cover.position.x - cover.height / 2;
          wallRight = cover.position.x + cover.height / 2;
          wallTop = cover.position.y - cover.width / 2;
          wallBottom = cover.position.y + cover.width / 2;
        } else {
          wallLeft = cover.position.x - cover.width / 2;
          wallRight = cover.position.x + cover.width / 2;
          wallTop = cover.position.y - cover.height / 2;
          wallBottom = cover.position.y + cover.height / 2;
        }

        const buffer = 0.5;
        return (x + playerRadius > wallLeft - buffer && 
                x - playerRadius < wallRight + buffer &&
                y + playerRadius > wallTop - buffer && 
                y - playerRadius < wallBottom + buffer);
      });
    };

    const wouldCollide = checkCollisionWithCover(newX, newY);

    if (wouldCollide) {
      // Try moving only horizontally
      const horizontalX = Math.max(0, Math.min(100, player.position.x + direction.x * moveSpeed));
      const horizontalY = player.position.y;
      
      if (!checkCollisionWithCover(horizontalX, horizontalY)) {
        newX = horizontalX;
        newY = horizontalY;
      } else {
        // Try moving only vertically
        const verticalX = player.position.x;
        const verticalY = Math.max(0, Math.min(100, player.position.y + direction.y * moveSpeed));
        
        if (!checkCollisionWithCover(verticalX, verticalY)) {
          newX = verticalX;
          newY = verticalY;
        } else {
          return; // Can't move at all
        }
      }
    }

    // Calculate facing direction based on movement
    let facing = Math.atan2(direction.x, -direction.y) * (180 / Math.PI);
    if (facing < 0) {
      facing += 360;
    }
    const newFacing = Math.round(facing);

    combatSystem.moveEntityToPosition("player", { x: newX, y: newY });

    if (!selectedTarget) {
      const currentFacing = player.facing || 0;
      const facingDiff = Math.abs(newFacing - currentFacing);
      const normalizedDiff = Math.min(facingDiff, 360 - facingDiff);

      if (normalizedDiff > 2) {
        combatSystem.updateEntity("player", { facing: newFacing });
      }
    }
  }, [combatState.entities, selectedTarget, coverElements]);

  // Enable keyboard movement
  useKeyboardMovement({
    onMovement: handleMovement,
    isEnabled: true,
  });

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      const isMobileDevice = hasTouch && isSmallScreen;
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use gesture movement hook for mobile
  const { containerRef, bind } = useGestureMovement({
    onMovement: handleMovement,
    isEnabled: isMobile && !combatState.isInCombat
  });

  // Hotbar action handler
  const handleHotbarAction = useCallback((actionId: string, actionType: string, actionName: string) => {
    if (actionType === "attack" && actionId === "basic_attack") {
      if (selectedTarget) {
        const player = combatState.entities.find(e => e.id === "player");
        const target = combatState.entities.find(e => e.id === selectedTarget);

        if (player && target) {
          const weaponRange = equippedWeapon ? equippedWeapon.range * 10 : 10;
          const distance = Math.sqrt(
            Math.pow(target.position.x - player.position.x, 2) + 
            Math.pow(target.position.y - player.position.y, 2)
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
  }, [selectedTarget, combatState.entities, equippedWeapon, toast]);

  // Get cooldown percentage for hotbar display
  const getCooldownPercentage = useCallback((actionId: string): number => {
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
  }, [combatState.entities]);

  // Subscribe to combat system updates
  useEffect(() => {
    const unsubscribe = combatSystem.subscribe((state) => {
      setCombatState(state);

      // Clear selectedTarget if the currently selected entity is dead or no longer exists
      if (selectedTarget) {
        const selectedEntity = state.entities.find(e => e.id === selectedTarget);
        if (!selectedEntity || selectedEntity.hp <= 0) {
          setSelectedTarget(null);
        }
      }
    });

    return unsubscribe;
  }, [selectedTarget]);

  // Initialize when component mounts
  useEffect(() => {
    initializeCombatSystem();
    
    return () => {
      combatSystem.stopAILoop();
    };
  }, [initializeCombatSystem]);

  // Force re-render during cooldowns
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const interval = setInterval(() => {
      const player = combatState.entities.find(e => e.id === "player");
      if (player?.cooldowns) {
        const now = Date.now();
        const hasActiveCooldowns = Object.values(player.cooldowns).some(lastUsed => {
          const timeSince = now - lastUsed;
          return timeSince < 5000;
        });

        if (hasActiveCooldowns) {
          forceUpdate({});
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [combatState.entities]);

  const player = combatState.entities.find(e => e.id === "player");
  const enemies = combatState.entities.filter(e => e.type === "hostile");
  const selectedEntity = combatState.entities.find(e => e.id === selectedTarget);

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Combat View
          <Badge variant={combatState.isInCombat ? "destructive" : "secondary"}>
            {combatState.isInCombat ? "IN COMBAT" : "READY"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Combat Arena */}
        <div
          ref={containerRef}
          className="relative bg-gradient-to-br from-green-900/20 to-brown-800/20 border border-amber-600/20 rounded-lg overflow-hidden mx-auto"
          style={{ 
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255, 119, 48, 0.1) 0%, transparent 50%)',
            width: 'min(90vw, 90vh, 400px)',
            height: 'min(90vw, 90vh, 400px)',
            aspectRatio: '1',
            touchAction: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
          {...bind()}
        >
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={`v-${i}`} className="absolute h-full w-px bg-amber-400" style={{ left: `${i * 10}%` }} />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <div key={`h-${i}`} className="absolute w-full h-px bg-amber-400" style={{ top: `${i * 10}%` }} />
            ))}
          </div>

          {/* Cover Elements */}
          {coverElements.map((cover) => (
            <div
              key={cover.id}
              className={`absolute ${
                cover.type === "full_wall" 
                  ? "bg-stone-600 border-2 border-stone-500" 
                  : "bg-stone-400 border-2 border-stone-300 opacity-80"
              } rounded-sm shadow-lg`}
              style={{
                left: `${cover.position.x - cover.width / 2}%`,
                top: `${cover.position.y - cover.height / 2}%`,
                width: `${cover.width}%`,
                height: `${cover.height}%`,
                zIndex: cover.type === "full_wall" ? 15 : 10,
                transform: `rotate(${cover.facing}deg)`,
                transformOrigin: "center",
                filter: cover.type === "full_wall" 
                  ? "drop-shadow(2px 2px 4px rgba(0,0,0,0.6))"
                  : "drop-shadow(1px 1px 2px rgba(0,0,0,0.4))"
              }}
            />
          ))}

          {/* Entities */}
          {combatState.entities.map((entity) => (
            <div
              key={entity.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                entity.hp <= 0 
                  ? 'cursor-not-allowed opacity-50' 
                  : entity.id !== "player"
                    ? 'cursor-pointer hover:scale-105' 
                    : 'cursor-default'
              } ${selectedTarget === entity.id ? 'scale-110 z-10' : ''}`}
              style={{
                left: `${entity.position.x}%`,
                top: `${entity.position.y}%`,
              }}
              onClick={() => entity.id !== "player" && entity.hp > 0 ? setSelectedTarget(entity.id) : null}
            >
              {/* Main entity circle */}
              <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                entity.type === "player" 
                  ? "bg-blue-600 border-blue-400" 
                  : entity.hp <= 0
                  ? "bg-gray-600 border-gray-500"
                  : entity.type === "hostile"
                  ? "bg-red-600 border-red-400"
                  : "bg-gray-600 border-gray-400"
              }`}>
                {entity.type === "player" && <Shield className="w-4 h-4 text-white" />}
                {entity.type === "hostile" && <Skull className="w-4 h-4 text-white" />}

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
                          entity.hp <= 0 ? "border-b-gray-500" :
                          entity.type === "player" 
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
                      entity.hp <= 0 ? "bg-gray-500" :
                      entity.hp > entity.maxHp * 0.6 ? "bg-green-500" :
                      entity.hp > entity.maxHp * 0.3 ? "bg-yellow-500" : "bg-red-500"
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

        {/* Player Status */}
        {player && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-red-300">HP:</span>
              <span className="text-white">{player.hp}/{player.maxHp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-300">Energy:</span>
              <span className="text-white">{player.energy}/{player.maxEnergy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-300">Power:</span>
              <span className="text-white">{player.power}/{player.maxPower}</span>
            </div>
          </div>
        )}

        {/* Controls hint */}
        <div className="text-xs text-muted-foreground text-center">
          <div>WASD: Move | 1-3: Actions | Tab: Cycle Targets</div>
          {selectedTarget && <div className="text-yellow-400">Target: {selectedEntity?.name}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
