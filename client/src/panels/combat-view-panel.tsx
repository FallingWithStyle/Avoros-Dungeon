
/**
 * File: combat-view-panel.tsx
 * Responsibility: Combat interface panel using the new combat system with proper canvas rendering
 * Notes: Updated to match test combat implementation with smooth movement and proper rendering
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { combatSystem, type CombatEntity, type CombatState } from "@shared/combat-system";
import type { CrawlerWithDetails } from "@shared/schema";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Initialize combat system and canvas
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    const canvas = canvasRef.current;
    canvas.width = 600;
    canvas.height = 400;

    try {
      // Initialize combat system
      combatSystem.initialize(canvas);
    } catch (error) {
      console.error('Failed to initialize combat system:', error);
      return;
    }

    // Add crawler entity
    const playerEntity: CombatEntity = {
      id: "player",
      name: crawler.name,
      type: "player",
      position: { x: 50, y: 50 },
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
              x: parseFloat(entity.position_x) * 6, 
              y: parseFloat(entity.position_y) * 4 
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

    // Start render loop
    let animationFrameId: number;
    const renderLoop = () => {
      combatSystem.render();
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // Handle canvas clicks
    const handleCanvasClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const entity = combatSystem.getEntityAt(x, y);
      setSelectedEntity(entity);
    };

    canvas.addEventListener('click', handleCanvasClick);

    // Start AI loop
    combatSystem.startAILoop();

    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
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

    const moveDistance = 20;
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
    newX = Math.max(10, Math.min(590, newX));
    newY = Math.max(10, Math.min(390, newY));

    combatSystem.moveEntity(crawlerEntity.id, { x: newX, y: newY });
  }, [combatState.entities]);

  // Get current room info
  const currentRoom = tacticalData?.currentRoom || { name: "Unknown Room", type: "chamber" };

  return (
    <Card className="bg-game-surface border-game-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <span className="flex items-center">
            <i className="fas fa-crosshairs mr-2 text-red-400"></i>
            Combat View
          </span>
          <Badge variant="outline" className="text-xs">
            {currentRoom.name}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Combat Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full border border-game-border rounded bg-slate-900"
            style={{ maxHeight: "400px", imageRendering: "pixelated" }}
          />
          {selectedEntity && (
            <div className="absolute top-2 left-2 bg-black/80 text-white p-2 rounded text-xs">
              <div className="font-semibold">{selectedEntity.name}</div>
              <div>HP: {selectedEntity.hp}/{selectedEntity.maxHp}</div>
              <div>Type: {selectedEntity.type}</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleAttack}
            disabled={!selectedEntity || selectedEntity.type !== "hostile"}
            variant="destructive"
            size="sm"
          >
            <i className="fas fa-sword mr-1"></i>
            Attack
          </Button>
          <Button
            onClick={() => setSelectedEntity(null)}
            variant="outline"
            size="sm"
          >
            <i className="fas fa-hand-pointer mr-1"></i>
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
  );
}
