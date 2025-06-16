
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

export default function TestCombat() {
  const [combatState, setCombatState] = useState(combatSystem.getState());
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [activeActionMode, setActiveActionMode] = useState<{
    type: "move" | "attack" | "ability";
    actionId: string;
    actionName: string;
  } | null>(null);

  // Keyboard movement handler
  const handleMovement = useCallback((direction: { x: number; y: number }) => {
    const player = combatState.entities.find(e => e.id === "player");
    if (!player) return;

    // Only move if there's actual movement input
    if (direction.x === 0 && direction.y === 0) return;

    const moveSpeed = 2; // Movement speed
    const newX = Math.max(0, Math.min(100, player.position.x + direction.x * moveSpeed));
    const newY = Math.max(0, Math.min(100, player.position.y + direction.y * moveSpeed));

    combatSystem.moveEntityToPosition("player", { x: newX, y: newY });
  }, [combatState]);

  // Enable keyboard movement
  useKeyboardMovement({
    onMovement: handleMovement,
    isEnabled: true,
  });

  // Hotbar action handler
  const handleHotbarAction = useCallback((actionId: string, actionType: string, actionName: string) => {
    if (actionType === "attack" && actionId === "basic_attack") {
      if (selectedTarget) {
        combatSystem.executeAttack("player", selectedTarget);
      } else {
        // Show available targets or attack without target
        combatSystem.executeAttack("player");
      }
      setActiveActionMode(null);
    } else if (actionType === "ability") {
      // Handle other abilities
      setActiveActionMode({ type: actionType as any, actionId, actionName });
    }
  }, [selectedTarget]);

  // Keyboard hotkey handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key;
      
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
        case 'Tab':
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
  }, [handleHotbarAction, selectedTarget, combatState]);

  useEffect(() => {
    // Subscribe to combat system updates
    const unsubscribe = combatSystem.subscribe((state) => {
      setCombatState(state);
    });

    // Initialize test scenario
    initializeTestScenario();

    return unsubscribe;
  }, []);

  const initializeTestScenario = () => {
    // Clear existing entities
    combatState.entities.forEach(entity => {
      combatSystem.removeEntity(entity.id);
    });

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
      attack: 18,
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
      cooldowns: {}
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

  const handleAttack = (targetId?: string) => {
    const target = targetId || selectedTarget;
    if (!target) {
      console.log("No target selected");
      return;
    }
    combatSystem.executeAttack("player", target);
  };

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

  const resetScenario = () => {
    initializeTestScenario();
    setSelectedTarget(null);
    setActiveActionMode(null);
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
                  {combatState.entities.map((entity) => (
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
                      <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                        entity.type === "player" 
                          ? "bg-blue-600 border-blue-400" 
                          : entity.type === "hostile"
                          ? "bg-red-600 border-red-400"
                          : "bg-green-600 border-green-400"
                      }`}>
                        {entity.type === "player" && <Shield className="w-4 h-4 text-white" />}
                        {entity.type === "hostile" && <Skull className="w-4 h-4 text-white" />}
                        
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
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control Panel */}
          <div className="space-y-4">
            
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

            {/* Movement Controls */}
            <Card className="border-amber-600/30 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-amber-300 text-sm flex items-center gap-2">
                  <Move className="w-4 h-4" />
                  Movement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-1">
                  <div></div>
                  <Button size="sm" variant="outline" onClick={() => handleMove("up")}>↑</Button>
                  <div></div>
                  <Button size="sm" variant="outline" onClick={() => handleMove("left")}>←</Button>
                  <div></div>
                  <Button size="sm" variant="outline" onClick={() => handleMove("right")}>→</Button>
                  <div></div>
                  <Button size="sm" variant="outline" onClick={() => handleMove("down")}>↓</Button>
                  <div></div>
                </div>
              </CardContent>
            </Card>

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
                  onClick={() => handleAttack()}
                  disabled={!selectedTarget || !combatSystem.canUseAction("player", "basic_attack")}
                  variant={selectedTarget ? "destructive" : "outline"}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Attack {selectedEntity?.name || "Target"}
                </Button>
              </CardContent>
            </Card>

            {/* Enemy Status */}
            {enemies.length > 0 && (
              <Card className="border-red-600/30 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-red-300 text-sm flex items-center gap-2">
                    <Skull className="w-4 h-4" />
                    Enemies
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {enemies.map((enemy) => (
                    <div 
                      key={enemy.id}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        selectedTarget === enemy.id 
                          ? "border-yellow-400 bg-yellow-400/10" 
                          : "border-red-600/30 hover:border-red-400/50"
                      }`}
                      onClick={() => setSelectedTarget(enemy.id)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{enemy.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Lv.{enemy.level}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span>HP: {enemy.hp}/{enemy.maxHp}</span>
                        <span>ATK: {enemy.attack}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
