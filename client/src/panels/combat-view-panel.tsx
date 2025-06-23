/**
 * File: combat-view-panel.tsx
 * Responsibility: Combat interface panel using the new combat system without tactical view dependencies
 * Notes: Clean implementation based on test combat system, avoiding complex tactical data hooks
 */

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CombatSystem, type CombatEntity } from "@shared/combat-system";
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
  const [combatSystem] = useState(() => new CombatSystem());
  const [selectedEntity, setSelectedEntity] = useState<CombatEntity | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize combat system
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
    const crawlerEntity = combatSystem.addEntity({
      id: "crawler-" + crawler.id,
      name: crawler.name,
      type: "player",
      position: { x: 50, y: 50 },
      stats: {
        health: crawler.health,
        maxHealth: crawler.maxHealth,
        might: crawler.might,
        agility: crawler.agility,
        endurance: crawler.endurance,
        intellect: crawler.intellect
      },
      equipment: {
        weapon: { name: "Basic Sword", damage: 10 },
        armor: { name: "Basic Armor", defense: 5 }
      }
    });

    // Add entities from tactical data if available
    if (tacticalData?.entities) {
      tacticalData.entities.forEach((entity: any, index: number) => {
        if (entity.entity_type === "mob") {
          const mobData = typeof entity.entity_data === 'string' 
            ? JSON.parse(entity.entity_data) 
            : entity.entity_data;

          combatSystem.addEntity({
            id: "mob-" + index,
            name: mobData.name || "Enemy",
            type: "enemy",
            position: { 
              x: parseFloat(entity.position_x) * 6, 
              y: parseFloat(entity.position_y) * 4 
            },
            stats: {
              health: mobData.health || 50,
              maxHealth: mobData.health || 50,
              might: mobData.attack || 10,
              agility: 10,
              endurance: 10,
              intellect: 10
            }
          });
        }
      });
    }

    setIsInitialized(true);

    // Start render loop
    const renderLoop = () => {
      combatSystem.render();
      requestAnimationFrame(renderLoop);
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

    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [combatSystem, crawler, tacticalData, isInitialized]);

  const handleAttack = () => {
    if (!selectedEntity) return;

    const crawlerEntity = combatSystem.getPlayerEntity();
    if (crawlerEntity && selectedEntity.type === "enemy") {
      combatSystem.performAttack(crawlerEntity.id, selectedEntity.id);
    }
  };

  const handleMove = (direction: string) => {
    const crawlerEntity = combatSystem.getPlayerEntity();
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
  };

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
            style={{ maxHeight: "400px" }}
          />
          {selectedEntity && (
            <div className="absolute top-2 left-2 bg-black/80 text-white p-2 rounded text-xs">
              <div className="font-semibold">{selectedEntity.name}</div>
              <div>HP: {selectedEntity.stats.health}/{selectedEntity.stats.maxHealth}</div>
              <div>Type: {selectedEntity.type}</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleAttack}
            disabled={!selectedEntity || selectedEntity.type !== "enemy"}
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
      </CardContent>
    </Card>
  );
}