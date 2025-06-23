
/**
 * File: combat-view-panel.tsx
 * Responsibility: Combat interface panel using the test combat arena styling and structure
 * Notes: Reuses the polished arena design from test-combat.tsx for consistent experience
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { combatSystem, type CombatEntity, type CombatState } from "@shared/combat-system";
import type { CrawlerWithDetails } from "@shared/schema";
import { Sword, Shield, Zap, Heart, Target, Move, Skull } from "lucide-react";

interface CombatViewPanelProps {
  crawler: CrawlerWithDetails;
  tacticalData?: any;
  handleRoomMovement: (direction: string) => void;
}

export default function CombatViewPanel({ 
  crawler, 
  tacticalData, 
  handleRoomMovement 
}: CombatViewPanelProps) {
  const [combatState, setCombatState] = useState<CombatState>(combatSystem.getState());
  const [selectedEntity, setSelectedEntity] = useState<CombatEntity | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Subscribe to combat system updates
  useEffect(() => {
    let updateTimeout: NodeJS.Timeout | null = null;

    const unsubscribe = combatSystem.subscribe((state) => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = setTimeout(() => {
        setCombatState(state);

        // Clear selectedEntity if the currently selected entity is dead or no longer exists
        if (selectedEntity) {
          const selectedEntityStill = state.entities.find(e => e.id === selectedEntity.id);
          if (!selectedEntityStill || selectedEntityStill.hp <= 0) {
            setSelectedEntity(null);
          }
        }

        updateTimeout = null;
      }, 8); // ~120fps throttling for better responsiveness
    });

    return () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      unsubscribe();
    };
  }, [selectedEntity]);

  // Initialize combat system
  useEffect(() => {
    if (isInitialized) return;

    // Clear existing entities
    combatState.entities.forEach(entity => {
      combatSystem.removeEntity(entity.id);
    });

    // Add crawler entity
    const playerEntity: CombatEntity = {
      id: "player",
      name: crawler.name,
      type: "player",
      position: { x: 25, y: 50 },
      hp: crawler.health,
      maxHp: crawler.maxHealth,
      energy: crawler.energy || 50,
      maxEnergy: crawler.maxEnergy || 50,
      power: crawler.power || 25,
      maxPower: crawler.maxPower || 25,
      might: crawler.might,
      agility: crawler.agility,
      endurance: crawler.endurance,
      intellect: crawler.intellect,
      charisma: crawler.charisma || 10,
      wisdom: crawler.wisdom || 10,
      attack: crawler.might + 5,
      defense: Math.floor(crawler.endurance * 0.8),
      speed: Math.floor(crawler.agility * 1.1),
      accuracy: (crawler.wisdom || 10) + (crawler.intellect || 10),
      evasion: Math.floor(crawler.agility * 1.2),
      level: crawler.level || 1,
      facing: 0,
      isAlive: true,
      cooldowns: {}
    };

    combatSystem.addEntity(playerEntity);

    // Add entities from tactical data if available
    if (tacticalData?.entities) {
      tacticalData.entities.forEach((entity: any, index: number) => {
        if (entity.entity_type === "mob") {
          const mobData = typeof entity.entity_data === 'string' 
            ? JSON.parse(entity.entity_data) 
            : entity.entity_data;

          const mobEntity: CombatEntity = {
            id: "mob-" + index,
            name: mobData.name || "Enemy",
            type: "hostile",
            position: { 
              x: parseFloat(entity.position_x), 
              y: parseFloat(entity.position_y) 
            },
            hp: mobData.health || 50,
            maxHp: mobData.health || 50,
            energy: 25,
            maxEnergy: 25,
            power: 10,
            maxPower: 10,
            might: mobData.attack || 10,
            agility: 10,
            endurance: 10,
            intellect: 10,
            charisma: 10,
            wisdom: 10,
            attack: mobData.attack || 10,
            defense: 5,
            speed: 10,
            accuracy: 15,
            evasion: 10,
            level: 1,
            facing: 0,
            isAlive: true,
            cooldowns: {}
          };

          combatSystem.addEntity(mobEntity);
        }
      });
    }

    setIsInitialized(true);

    // Start AI loop
    combatSystem.startAILoop();

    return () => {
      combatSystem.stopAILoop();
    };
  }, [combatSystem, crawler, tacticalData, isInitialized]);

  const handleAttack = useCallback(() => {
    if (!selectedEntity) return;

    const crawlerEntity = combatState.entities.find(e => e.id === "player");
    if (crawlerEntity && selectedEntity.type === "hostile") {
      combatSystem.performAttack(crawlerEntity.id, selectedEntity.id);
    }
  }, [selectedEntity, combatState.entities]);

  const handleMove = useCallback((direction: string) => {
    const crawlerEntity = combatState.entities.find(e => e.id === "player");
    if (!crawlerEntity) return;

    const moveDistance = 5;
    let newX = crawlerEntity.position.x;
    let newY = crawlerEntity.position.y;

    switch (direction) {
      case "north":
        newY -= moveDistance;
        break;
      case "south":
        newY += moveDistance;
        break;
      case "east":
        newX += moveDistance;
        break;
      case "west":
        newX -= moveDistance;
        break;
    }

    // Ensure entity stays within bounds
    newX = Math.max(0, Math.min(100, newX));
    newY = Math.max(0, Math.min(100, newY));

    combatSystem.moveEntity(crawlerEntity.id, { x: newX, y: newY });
  }, [combatState.entities]);

  // Get current room info
  const currentRoom = tacticalData?.currentRoom || { name: "Unknown Room", type: "chamber" };
  const player = combatState.entities.find(e => e.id === "player");
  const enemies = combatState.entities.filter(e => e.type === "hostile");

  return (
    <div className="h-full">
      <Card className="border-amber-600/30 bg-black/40 backdrop-blur-sm h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-300 flex items-center gap-2">
            <Sword className="w-5 h-5" />
            Combat Arena
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={combatState.isInCombat ? "destructive" : "secondary"}>
              {combatState.isInCombat ? "IN COMBAT" : "READY"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {currentRoom.name}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Combat Arena - Using test combat styling */}
          <div 
            className="relative bg-gradient-to-br from-green-900/20 to-brown-800/20 border border-amber-600/20 rounded-lg overflow-hidden mx-auto"
            style={{ 
              backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255, 119, 48, 0.1) 0%, transparent 50%)',
              width: 'min(90vw, 90vh, 500px)',
              height: 'min(90vw, 90vh, 500px)',
              aspectRatio: '1'
            }}
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

            {/* Entities */}
            {combatState.entities.map((entity) => {
              return (
                <div
                  key={entity.id}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                    entity.hp <= 0 
                      ? 'cursor-not-allowed opacity-50' 
                      : entity.id !== "player"
                        ? 'cursor-pointer hover:scale-105' 
                        : 'cursor-default'
                  } ${selectedEntity?.id === entity.id ? 'scale-110 z-10' : ''}`}
                  style={{
                    left: `${entity.position.x}%`,
                    top: `${entity.position.y}%`,
                  }}
                  onClick={() => entity.id !== "player" && entity.hp > 0 ? setSelectedEntity(entity) : null}
                >
                  {/* Main entity circle */}
                  <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    entity.type === "player" 
                      ? "bg-blue-600 border-blue-400" 
                      : entity.hp <= 0
                      ? "bg-gray-600 border-gray-500"
                      : entity.type === "hostile"
                      ? "bg-red-600 border-red-400"
                      : entity.type === "neutral"
                      ? "bg-yellow-600 border-yellow-400"
                      : entity.type === "friendly" || entity.type === "ally"
                      ? "bg-green-600 border-green-400"
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
                                : entity.type === "neutral"
                                ? "border-b-yellow-400"
                                : entity.type === "friendly" || entity.type === "ally"
                                ? "border-b-green-400"
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
                    {selectedEntity?.id === entity.id && entity.hp > 0 && (
                      <div className="absolute -inset-1 rounded-full border-2 border-yellow-400 animate-pulse" />
                    )}

                    {/* Hit Impact Effect */}
                    {(() => {
                      const recentDamageTime = entity.lastDamageTime || 0;
                      const timeSinceDamage = Date.now() - recentDamageTime;
                      if (timeSinceDamage < 500) {
                        const impactProgress = timeSinceDamage / 500;
                        return (
                          <div className="absolute -inset-2 pointer-events-none">
                            <div 
                              className="w-full h-full rounded-full border-4 border-red-400"
                              style={{
                                opacity: (1 - impactProgress) * 0.8,
                                transform: `scale(${1 + impactProgress * 0.5})`,
                                filter: "drop-shadow(0 0 8px rgba(239,68,68,0.6))",
                              }}
                            />
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

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
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleAttack}
              disabled={!selectedEntity || selectedEntity.type !== "hostile"}
              variant="destructive"
              size="sm"
            >
              <Sword className="w-4 h-4 mr-1" />
              Attack
            </Button>
            <Button
              onClick={() => setSelectedEntity(null)}
              variant="outline"
              size="sm"
            >
              <Target className="w-4 h-4 mr-1" />
              Deselect
            </Button>
          </div>

          {/* Movement Controls */}
          <div className="grid grid-cols-3 gap-1 max-w-32 mx-auto">
            <div></div>
            <Button
              onClick={() => handleMove("north")}
              variant="outline"
              size="sm"
              className="p-2"
            >
              <i className="fas fa-arrow-up"></i>
            </Button>
            <div></div>

            <Button
              onClick={() => handleMove("west")}
              variant="outline"
              size="sm"
              className="p-2"
            >
              <i className="fas fa-arrow-left"></i>
            </Button>
            <div></div>
            <Button
              onClick={() => handleMove("east")}
              variant="outline"
              size="sm"
              className="p-2"
            >
              <i className="fas fa-arrow-right"></i>
            </Button>

            <div></div>
            <Button
              onClick={() => handleMove("south")}
              variant="outline"
              size="sm"
              className="p-2"
            >
              <i className="fas fa-arrow-down"></i>
            </Button>
            <div></div>
          </div>

          {/* Room Navigation */}
          <div className="grid grid-cols-4 gap-1 pt-2 border-t border-game-border">
            <Button
              onClick={() => handleRoomMovement("north")}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              N
            </Button>
            <Button
              onClick={() => handleRoomMovement("east")}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              E
            </Button>
            <Button
              onClick={() => handleRoomMovement("south")}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              S
            </Button>
            <Button
              onClick={() => handleRoomMovement("west")}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              W
            </Button>
          </div>

          {/* Combat Status */}
          {combatState.isInCombat && (
            <div className="text-center">
              <Badge variant="destructive" className="text-xs">
                IN COMBAT
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
