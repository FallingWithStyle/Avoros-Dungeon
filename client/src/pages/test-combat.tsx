
/**
 * File: test-combat.tsx
 * Responsibility: Combat system testing and demonstration page
 * Notes: Provides a sandbox environment for testing combat mechanics, positioning, and interactions
 */

import React, { useEffect, useState, useCallback } from "react";
import { combatSystem } from "@shared/combat-system";
import { calculateWeaponDamage } from "@shared/equipment-system";
import type { CombatEntity, CombatState } from "@shared/combat-system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Skull, Users, Heart, Zap, Power, Target, Swords, Sword } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Weapon {
  id: number;
  name: string;
  description: string;
  weaponType: string;
  damageAttribute: string;
  baseRange: number;
  specialAbility?: string;
  mightBonus: number;
  agilityBonus: number;
  intellectBonus: number;
  wisdomBonus: number;
  rarity: string;
  price: number;
}

export default function TestCombat() {
  const [combatState, setCombatState] = useState<CombatState>(combatSystem.getState());
  const [selectedAction, setSelectedAction] = useState<string>("move");
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [selectedWeaponId, setSelectedWeaponId] = useState<number | null>(null);
  const { toast } = useToast();

  // Mock crawler data for testing
  const mockCrawler = {
    name: "Test Crawler",
    serial: 1001,
    currentHealth: 100,
    maxHealth: 100,
    currentEnergy: 50,
    maxEnergy: 50,
    currentPower: 25,
    maxPower: 25,
    might: 12,
    agility: 10,
    endurance: 8,
    intellect: 6,
    charisma: 4,
    wisdom: 5,
    level: 3,
    attack: 0, // Will be calculated with weapon
    defense: 5
  };

  // Get selected weapon
  const selectedWeapon = weapons.find(w => w.id === selectedWeaponId);

  // Calculate damage and range with current weapon
  const calculateCurrentWeaponStats = () => {
    if (!selectedWeapon) {
      return { damage: mockCrawler.might, range: 1, attribute: "might" };
    }

    const weaponForCalc = {
      weaponType: selectedWeapon.weaponType,
      damageAttribute: selectedWeapon.damageAttribute,
      mightBonus: selectedWeapon.mightBonus,
      agilityBonus: selectedWeapon.agilityBonus,
      intellectBonus: selectedWeapon.intellectBonus,
      wisdomBonus: selectedWeapon.wisdomBonus
    };

    const damage = calculateWeaponDamage(weaponForCalc as any, mockCrawler, 0);
    return {
      damage,
      range: selectedWeapon.baseRange,
      attribute: selectedWeapon.damageAttribute
    };
  };

  const weaponStats = calculateCurrentWeaponStats();

  const initializeTestScenario = useCallback(() => {
    // Clear existing entities
    combatSystem.getState().entities.forEach(entity => {
      combatSystem.removeEntity(entity.id);
    });

    // Add player with weapon stats
    const playerData = {
      ...mockCrawler,
      attack: weaponStats.damage
    };
    combatSystem.initializePlayer({ x: 25, y: 50 }, playerData);

    // Spawn 2 default enemies
    spawnEnemy(75, 30, "Goblin Scout");
    spawnEnemy(70, 70, "Orc Warrior");
  }, [selectedWeaponId, weaponStats.damage]);

  const spawnEnemy = (x: number, y: number, name: string = "Test Enemy") => {
    combatSystem.spawnTestEnemy({ x, y }, name);
  };

  const handleGridClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * 100);

    if (selectedAction === "attack") {
      combatSystem.handleAttack(x, y);
    } else if (selectedAction === "spawn") {
      spawnEnemy(x, y);
    } else if (selectedAction === "move") {
      const player = combatState.entities.find(e => e.id === "player");
      if (player) {
        combatSystem.moveEntityToPosition("player", { x, y });
      }
    }
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * 100);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * 100);
    combatSystem.setHoveredPosition({ x, y });
  };

  // Subscribe to combat system updates
  useEffect(() => {
    const unsubscribe = combatSystem.subscribe((newState) => {
      setCombatState(newState);
    });

    return unsubscribe;
  }, []);

  // Fetch weapons for testing
  useEffect(() => {
    const fetchWeapons = async () => {
      try {
        const response = await fetch("/api/debug/weapons");
        const data = await response.json();
        if (data.success) {
          setWeapons(data.weapons);
          if (data.weapons.length > 0) {
            setSelectedWeaponId(data.weapons[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch weapons:", error);
      }
    };

    fetchWeapons();
  }, []);

  // Initialize test scenario when weapon changes
  useEffect(() => {
    if (weapons.length > 0) {
      initializeTestScenario();
    }
  }, [initializeTestScenario, weapons.length]);

  const selectedEntity = combatState.entities.find((entity) => entity.isSelected);

  return (
    <div className="container mx-auto p-4 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Combat System Test</h1>
          <p className="text-slate-400">Test combat mechanics, positioning, and interactions</p>
        </div>

        {/* Weapon Selection */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <Sword className="h-5 w-5" />
              Weapon Testing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Selected Weapon
                </label>
                <Select
                  value={selectedWeaponId?.toString() || ""}
                  onValueChange={(value) => setSelectedWeaponId(parseInt(value))}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                    <SelectValue placeholder="Select a weapon" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {weapons.map((weapon) => (
                      <SelectItem key={weapon.id} value={weapon.id.toString()} className="text-slate-100">
                        {weapon.name} ({weapon.weaponType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedWeapon && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-300">Weapon Stats</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-400">
                      Damage: <span className="text-green-400">{weaponStats.damage}</span>
                    </div>
                    <div className="text-slate-400">
                      Range: <span className="text-blue-400">{weaponStats.range}</span>
                    </div>
                    <div className="text-slate-400">
                      Attribute: <span className="text-yellow-400">{weaponStats.attribute}</span>
                    </div>
                    <div className="text-slate-400">
                      Rarity: <span className={`${selectedWeapon.rarity === 'common' ? 'text-gray-400' : 
                        selectedWeapon.rarity === 'uncommon' ? 'text-green-400' :
                        selectedWeapon.rarity === 'rare' ? 'text-blue-400' :
                        selectedWeapon.rarity === 'epic' ? 'text-purple-400' : 'text-orange-400'}`}>
                        {selectedWeapon.rarity}
                      </span>
                    </div>
                  </div>
                  {selectedWeapon.specialAbility && (
                    <div className="text-xs text-slate-400 mt-2">
                      <span className="text-amber-400">Special:</span> {selectedWeapon.specialAbility}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Combat Grid */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Combat Arena</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Grid overlay */}
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-20">
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} className="border border-slate-600" />
                ))}
              </div>

              {/* Range indicator overlay */}
              {selectedEntity?.id === "player" && weaponStats.range > 1 && (
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute border-2 border-yellow-400 rounded-full opacity-30"
                    style={{
                      left: `calc(${selectedEntity.position.x}% - ${weaponStats.range * 10}px)`,
                      top: `calc(${selectedEntity.position.y}% - ${weaponStats.range * 10}px)`,
                      width: `${weaponStats.range * 20}px`,
                      height: `${weaponStats.range * 20}px`,
                    }}
                  />
                </div>
              )}

              {/* Combat area */}
              <div
                className="relative w-full h-96 bg-slate-900 border-2 border-slate-600 rounded-lg overflow-hidden cursor-crosshair"
                onClick={handleGridClick}
                onMouseMove={handleMouseMove}
              >
                {combatState.entities.map((entity) => (
                  <div
                    key={entity.id}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${entity.isSelected ? 'scale-110 z-10' : 'hover:scale-105'}`}
                    style={{
                      left: `${entity.position.x}%`,
                      top: `${entity.position.y}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      combatSystem.selectEntity(entity.id);
                    }}
                  >
                    <div className="relative">
                      {/* Entity Icon */}
                      <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center ${entity.type === "player" ? "bg-blue-600 border-blue-400" : entity.type === "hostile" ? "bg-red-600 border-red-400" : "bg-green-600 border-green-400"}`}>
                        {entity.type === "player" && <Shield className="w-4 h-4 text-white" />}
                        {entity.type === "hostile" && <Skull className="w-4 h-4 text-white" />}
                      </div>

                      {/* Selection Indicator */}
                      {entity.isSelected && (
                        <div className="absolute -inset-1 rounded-full border-2 border-yellow-400 animate-pulse" />
                      )}

                      {/* Health Bar */}
                      <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-12">
                        <div className="h-1 bg-gray-700 rounded">
                          <div
                            className="h-full bg-red-500 rounded"
                            style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Name */}
                      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 text-xs text-white text-center whitespace-nowrap">
                        {entity.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug & Control Panel */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Debug &amp; Control Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Entity List & Stats */}
            {combatState.entities.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-200">Entities</h3>
                <ul className="space-y-1">
                  {combatState.entities.map((entity) => (
                    <li
                      key={entity.id}
                      className={`p-2 rounded border cursor-pointer transition-colors ${entity.isSelected ? "border-yellow-400 bg-yellow-400/10" : "border-slate-700 hover:border-slate-500"}`}
                      onClick={() => combatSystem.selectEntity(entity.id)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-300">{entity.name}</span>
                        <Badge variant="outline" className="text-xs">
                          Lv.{entity.level}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>HP: {entity.hp}/{entity.maxHp}</div>
                        <div>Energy: {entity.energy}/{entity.maxEnergy}</div>
                        <div>Power: {entity.power}/{entity.maxPower}</div>
                        <div>Level: {entity.level}</div>
                        {entity.id === "player" && selectedWeapon && (
                          <>
                            <div className="col-span-2 border-t border-slate-600 pt-1 mt-1">
                              <div className="text-amber-400">{selectedWeapon.name}</div>
                              <div>Dmg: {weaponStats.damage} | Range: {weaponStats.range}</div>
                            </div>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-slate-400">No entities in combat.</p>
            )}

            {/* Action Selection */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-200">Actions</h3>
              <div className="flex space-x-2">
                <Button
                  variant={selectedAction === "move" ? "default" : "outline"}
                  onClick={() => setSelectedAction("move")}
                >
                  Move
                </Button>
                <Button
                  variant={selectedAction === "attack" ? "default" : "outline"}
                  onClick={() => setSelectedAction("attack")}
                >
                  Attack
                </Button>
                <Button
                  variant={selectedAction === "spawn" ? "default" : "outline"}
                  onClick={() => setSelectedAction("spawn")}
                >
                  Spawn Enemy
                </Button>
              </div>
            </div>

            {/* Real-time Combat Status */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-200">Combat Status</h3>
              <div className="text-sm text-slate-400">
                Status: {combatState.isInCombat ? "In Combat" : "Peaceful"}
              </div>
              {combatState.isInCombat && combatState.combatStartTime && (
                <div className="text-sm text-slate-400">
                  Combat Duration: {Math.floor((Date.now() - combatState.combatStartTime) / 1000)}s
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-200">Instructions</h3>
              <div className="text-xs text-slate-400 space-y-1">
                <div>• Click "Move" then click on the grid to move your character</div>
                <div>• Click "Attack" then click near enemies to attack them</div>
                <div>• Click "Spawn Enemy" then click anywhere to spawn a new enemy</div>
                <div>• Click on entities to select them and see their stats</div>
                <div>• Change weapons to see different damage and range values</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
