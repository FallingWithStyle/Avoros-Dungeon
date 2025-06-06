import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Gem, Skull, Users, Sword, Shield, Target, MessageCircle, Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CrawlerWithDetails } from "@shared/schema";
import { combatSystem, type CombatEntity, type CombatAction } from "@/features/combat/combat-system";
import { useEffect, useState, useRef } from "react";
import { generatePersistentTacticalData, saveTacticalDataChanges } from "../features/combat/persistent-tactical-data";

interface TacticalViewPanelProps {
  crawler: CrawlerWithDetails;
}

interface Room {
  id: number;
  name: string;
  description: string;
  type: string;
  environment: string;
  isSafe: boolean;
  hasLoot: boolean;
  x: number;
  y: number;
  factionId?: number | null;
}

interface RoomData {
  room: Room;
  availableDirections: string[];
  playersInRoom: CrawlerWithDetails[];
}

interface ContextMenu {
  x: number;
  y: number;
  entityId: string;
  entity: CombatEntity;
  actions: CombatAction[];
}

export default function TacticalViewPanel({ crawler }: TacticalViewPanelProps) {
  const [combatState, setCombatState] = useState(combatSystem.getState());
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [lastRoomId, setLastRoomId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [hoveredLoot, setHoveredLoot] = useState<number | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Subscribe to combat system updates
  useEffect(() => {
    const unsubscribe = combatSystem.subscribe(setCombatState);
    return unsubscribe;
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [contextMenu]);

  // Fetch current room data
  const { data: roomData, isLoading } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/current-room`],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Update combat system when room data changes
  useEffect(() => {
    if (roomData) {
      // Detect room change and calculate entry direction
      let entryDirection: 'north' | 'south' | 'east' | 'west' | null = null;

      if (lastRoomId !== null && lastRoomId !== roomData.room.id) {
        // Room has changed, get the movement direction from storage
        const storedDirection = sessionStorage.getItem('lastMovementDirection');
        if (storedDirection && ['north', 'south', 'east', 'west'].includes(storedDirection)) {
          entryDirection = storedDirection as 'north' | 'south' | 'east' | 'west';
          // Clear the stored direction after using it
          sessionStorage.removeItem('lastMovementDirection');
        }
      }

      setLastRoomId(roomData.room.id);

      // Clear existing entities
      combatState.entities.forEach(entity => {
        if (entity.id !== 'player') {
          combatSystem.removeEntity(entity.id);
        }
      });

      // Add player entity with correct position
      const playerEntity: CombatEntity = {
        id: 'player',
        name: crawler.name,
        type: 'player',
        hp: crawler.hp,
        maxHp: crawler.maxHp,
        attack: crawler.attack,
        defense: crawler.defense,
        speed: crawler.speed,
        position: { x: 50, y: 50 }, // Default center, will be updated below
        entryDirection,
      };

      if (!combatState.entities.find(e => e.id === 'player')) {
        combatSystem.addEntity(playerEntity);
      } else {
        combatSystem.updateEntity('player', playerEntity);
      }

      // Set entry direction and position in combat system AFTER adding/updating the entity
      if (entryDirection) {
        combatSystem.setPlayerEntryDirection(entryDirection);
      } else {
        // If no entry direction, place player in center
        const existingPlayer = combatState.entities.find(e => e.id === 'player');
        if (existingPlayer) {
          combatSystem.updateEntity('player', { position: { x: 50, y: 50 } });
        }
      }

      // Add room entities based on tactical data
      generatePersistentTacticalData(roomData.room.id).then(tacticalData => {
        // Add mobs as combat entities
        tacticalData.mobs.forEach((mob, index) => {
          const mobEntity: CombatEntity = {
            id: `mob-${index}`,
            name: mob.name,
            type: 'hostile',
            hp: mob.hp,
            maxHp: 100,
            attack: 15,
            defense: 5,
            speed: 10,
            position: { x: mob.x, y: mob.y },
          };
          combatSystem.addEntity(mobEntity);
        });

        // Add NPCs as neutral entities
        tacticalData.npcs.forEach((npc, index) => {
          const npcEntity: CombatEntity = {
            id: `npc-${index}`,
            name: npc.name,
            type: 'neutral',
            hp: 100,
            maxHp: 100,
            attack: 0,
            defense: 10,
            speed: 5,
            position: { x: npc.x, y: npc.y },
          };
          combatSystem.addEntity(npcEntity);
        });
      });
    }
  }, [roomData, crawler]);

  // Helper function to generate tactical data
  /*const generateTacticalData = (data: RoomData) => {
    const { room, availableDirections, playersInRoom } = data;
    return {
      background: getRoomBackgroundType(room.environment, room.type),
      loot: generateLootPositions(room.hasLoot, room.type),
      mobs: generateMobPositions(room.type, room.factionId),
      npcs: generateNpcPositions(room.type, room.isSafe),
      exits: {
        north: availableDirections.includes("north"),
        south: availableDirections.includes("south"),
        east: availableDirections.includes("east"),
        west: availableDirections.includes("west")
      },
      otherPlayers: playersInRoom.filter(p => p.id !== crawler.id)
    };
  };*/

  // Click handlers
  const handleEntityClick = (entityId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(null); // Close any open context menu

    if (event.button === 0) { // Left click
      combatSystem.selectEntity(entityId);
    }
  };

  const handleEntityRightClick = (entityId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const entity = combatState.entities.find(e => e.id === entityId);
    if (!entity) return;

    // Select the entity
    combatSystem.selectEntity(entityId);

    // Get available actions for the player towards this entity
    const availableActions = combatSystem.getAvailableActions('player');

    // Show context menu
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      entityId,
      entity,
      actions: availableActions
    });
  };

  const handleLootClick = (lootIndex: number, lootItem: any, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(null);

    if (event.button === 2) { // Right click
      // Show loot context menu
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        entityId: `loot-${lootIndex}`,
        entity: {
          id: `loot-${lootIndex}`,
          name: lootItem.name,
          type: 'neutral',
          hp: 1,
          maxHp: 1,
          attack: 0,
          defense: 0,
          speed: 0,
          position: { x: lootItem.x, y: lootItem.y }
        } as CombatEntity,
        actions: []
      });
    } else if (event.button === 0) { // Left click
      console.log(`Examining ${lootItem.name}`);
      // TODO: Implement loot examination/pickup
    }
  };

  const handleActionClick = (action: CombatAction, targetEntityId: string) => {
    const success = combatSystem.queueAction('player', action.id, targetEntityId);
    if (success) {
      console.log(`Queued action: ${action.name} on ${contextMenu?.entity.name}`);
    } else {
      console.log(`Cannot perform ${action.name} - on cooldown or already queued`);
    }
    setContextMenu(null);
  };

  const handleBackgroundClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      combatSystem.selectEntity(null);
      setContextMenu(null);
    }
  };

  if (isLoading || !roomData) {
    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Tactical View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-48 border-2 border-game-border rounded-lg flex items-center justify-center">
            <span className="text-slate-400">Loading room data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { room, availableDirections, playersInRoom } = roomData;
  //const tacticalData = generateTacticalData(roomData);

  function getRoomBackgroundType(environment: string, type: string): string {
    if (type === "entrance" || type === "exit") return "stone_chamber";
    if (type === "treasure") return "golden_chamber";
    if (type === "safe") return "peaceful_chamber";
    if (type === "boss") return "dark_chamber";

    switch (environment) {
      case "outdoor": return "forest_clearing";
      case "underground": return "dungeon_corridor";
      default: return "stone_chamber";
    }
  }

  function generateLootPositions(hasLoot: boolean, roomType: string) {
    if (!hasLoot) return [];

    const lootItems = [];
    if (roomType === "treasure") {
      lootItems.push(
        { type: "treasure", name: "Treasure Chest", x: 50, y: 70 },
        { type: "treasure", name: "Golden Coins", x: 30, y: 60 },
        { type: "treasure", name: "Precious Gems", x: 70, y: 50 }
      );
    } else {
      // Random loot positioning for normal rooms
      const lootCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < lootCount; i++) {
        lootItems.push({
          type: Math.random() > 0.5 ? "treasure" : "weapon",
          name: Math.random() > 0.5 ? "Dropped Item" : "Equipment",
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60
        });
      }
    }
    return lootItems;
  }

  function generateMobPositions(roomType: string, factionId: number | null | undefined) {
    const mobs = [];

    if (roomType === "safe" || roomType === "entrance") return mobs;

    if (roomType === "boss") {
      mobs.push({
        type: "hostile",
        name: "Boss Monster",
        x: 50,
        y: 30,
        hp: 90
      });
    } else if (factionId) {
      // Add faction-based enemies
      const enemyCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < enemyCount; i++) {
        mobs.push({
          type: "hostile",
          name: "Faction Warrior",
          x: 20 + Math.random() * 60,
          y: 20 + Math.random() * 60,
          hp: 60 + Math.random() * 40
        });
      }
    } else {
      // Random enemies for unclaimed rooms
      if (Math.random() > 0.6) {
        mobs.push({
          type: "hostile",
          name: "Wild Monster",
          x: 30 + Math.random() * 40,
          y: 25 + Math.random() * 50,
          hp: 50 + Math.random() * 50
        });
      }
    }

    return mobs;
  }

  function generateNpcPositions(roomType: string, isSafe: boolean) {
    const npcs = [];

    if (isSafe || roomType === "safe") {
      npcs.push({
        name: "Sanctuary Keeper",
        x: 60,
        y: 40,
        dialogue: true
      });
    } else if (Math.random() > 0.8) {
      npcs.push({
        name: "Wandering Merchant",
        x: 40 + Math.random() * 20,
        y: 30 + Math.random() * 40,
        dialogue: true
      });
    }

    return npcs;
  }

  const getRoomBackground = (bgType: string) => {
    switch (bgType) {
      case "stone_chamber":
        return "bg-gradient-to-br from-stone-600 to-stone-800";
      case "forest_clearing":
        return "bg-gradient-to-br from-green-600 to-green-800";
      case "dungeon_corridor":
        return "bg-gradient-to-br from-gray-700 to-gray-900";
      case "golden_chamber":
        return "bg-gradient-to-br from-yellow-600 to-amber-800";
      case "peaceful_chamber":
        return "bg-gradient-to-br from-blue-600 to-cyan-800";
      case "dark_chamber":
        return "bg-gradient-to-br from-purple-900 to-black";
      default:
        return "bg-gradient-to-br from-slate-600 to-slate-800";
    }
  };

  const getLootIcon = (type: string) => {
    switch (type) {
      case "treasure":
        return <Gem className="w-3 h-3 text-yellow-400" />;
      case "weapon":
        return <Sword className="w-3 h-3 text-red-400" />;
      case "armor":
        return <Shield className="w-3 h-3 text-blue-400" />;
      default:
        return <div className="w-3 h-3 bg-yellow-400 rounded" />;
    }
  };

  const getMobIcon = (type: string) => {
    switch (type) {
      case "hostile":
        return <Skull className="w-4 h-4 text-red-500" />;
      case "neutral":
        return <Users className="w-4 h-4 text-orange-400" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Tactical View
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="relative w-full aspect-square border-2 border-game-border rounded-lg overflow-hidden cursor-pointer"
          onClick={handleBackgroundClick}
        >
          {/* Room Background */}
          {/*<div className={`absolute inset-0 ${getRoomBackground(tacticalData.background)}`}>*/}
          <div className={`absolute inset-0 ${getRoomBackgroundType(room.environment, room.type)}`}>
            {/* Grid overlay for tactical feel */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          </div>

          {/* Exit indicators */}
          {availableDirections.includes("north") && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-green-400 rounded-b"></div>
          )}
          {availableDirections.includes("south") && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-green-400 rounded-t"></div>
          )}
          {availableDirections.includes("east") && (
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-green-400 rounded-l"></div>
          )}
          {availableDirections.includes("west") && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-green-400 rounded-r"></div>
          )}

          {/* Combat Entities */}
          {combatState.entities.map((entity) => (
            <div
              key={entity.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 ${
                entity.isSelected ? 'ring-2 ring-yellow-400 ring-offset-1' : ''
              } ${hoveredEntity === entity.id ? 'scale-110 z-30' : ''} transition-all duration-200`}
              style={{ left: `${entity.position.x}%`, top: `${entity.position.y}%` }}
              onClick={(e) => handleEntityClick(entity.id, e)}
              onContextMenu={(e) => handleEntityRightClick(entity.id, e)}
              onMouseEnter={() => setHoveredEntity(entity.id)}
              onMouseLeave={() => setHoveredEntity(null)}
              title={`${entity.name} (${entity.hp}/${entity.maxHp} HP) - Right-click for actions`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg ${
                entity.type === 'player' 
                  ? 'bg-blue-500 border-blue-300 animate-pulse shadow-blue-400/50' 
                  : entity.type === 'hostile'
                  ? 'bg-red-600 border-red-400 shadow-red-400/30'
                  : entity.type === 'neutral'
                  ? 'bg-orange-500 border-orange-300 shadow-orange-400/30'
                  : 'bg-cyan-500 border-cyan-300 shadow-cyan-400/30'
              } ${hoveredEntity === entity.id ? 'shadow-xl' : ''}`}>
                {entity.type === 'player' && (
                  <div className="absolute inset-1 bg-blue-300 rounded-full"></div>
                )}
                {entity.type === 'hostile' && <Skull className="w-3 h-3 text-white" />}
                {(entity.type === 'neutral' || entity.type === 'npc') && <Users className="w-3 h-3 text-white" />}
              </div>

              {/* HP bar for non-player entities */}
              {entity.type !== 'player' && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-700 rounded overflow-hidden">
                  <div 
                    className={`h-full rounded transition-all duration-300 ${entity.type === 'hostile' ? 'bg-red-400' : 'bg-green-400'}`}
                    style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
                  ></div>
                </div>
              )}

              {/* Selection indicator */}
              {entity.isSelected && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
              )}

              {/* Hover name display */}
              {hoveredEntity === entity.id && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                  {entity.name}
                  {entity.type !== 'player' && ` (${entity.hp}/${entity.maxHp})`}
                </div>
              )}

              {/* Action queue indicator */}
              {combatState.actionQueue.some(qa => qa.entityId === entity.id) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-spin">
                  <div className="w-full h-full bg-purple-300 rounded-full animate-ping"></div>
                </div>
              )}
            </div>
          ))}

          {/* Loot items */}
          {/*tacticalData.loot.map((item, index) => (
            <div
              key={`loot-${index}`}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer ${
                hoveredLoot === index ? 'scale-110 z-20' : ''
              } transition-all duration-200`}
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
              title={`${item.name} - Right-click to interact`}
              onClick={(e) => handleLootClick(index, item, e)}
              onContextMenu={(e) => handleLootClick(index, item, e)}
              onMouseEnter={() => setHoveredLoot(index)}
              onMouseLeave={() => setHoveredLoot(null)}
            >
              <div className={`w-6 h-6 bg-yellow-500 rounded border-2 border-yellow-300 flex items-center justify-center shadow-lg ${
                hoveredLoot === index ? 'animate-pulse shadow-yellow-400/50' : 'animate-bounce'
              }`}>
                {getLootIcon(item.type)}
              </div>

              {/* Hover name display *}
              {hoveredLoot === index && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                  {item.name}
                </div>
              )}
            </div>
          ))*/}



          {/* Other Players */}
          {playersInRoom.filter(p => p.id !== crawler.id).map((player, index) => (
            <div
              key={`player-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
              style={{ 
                left: `${25 + (index * 15)}%`, 
                top: `${75 - (index * 10)}%` 
              }}
              title={`${player.name} (Level ${player.level})`}
            >
              <div className="w-6 h-6 bg-purple-500 rounded-full border-2 border-purple-300 flex items-center justify-center">
                <Users className="w-3 h-3 text-white" />
              </div>
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-purple-300 font-medium whitespace-nowrap">
                {player.name}
              </div>
            </div>
          ))}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-2 min-w-48"
            style={{ 
              left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`, 
              top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px` 
            }}
          >
            {/* Entity Info Header */}
            <div className="px-3 py-2 border-b border-gray-700">
              <div className="flex items-center gap-2">
                {contextMenu.entity.type === 'hostile' && <Skull className="w-4 h-4 text-red-400" />}
                {(contextMenu.entity.type === 'neutral' || contextMenu.entity.type === 'npc') && <Users className="w-4 h-4 text-orange-400" />}
                {contextMenu.entityId.startsWith('loot-') && <Package className="w-4 h-4 text-yellow-400" />}
                <div>
                  <div className="text-white font-medium">{contextMenu.entity.name}</div>
                  {!contextMenu.entityId.startsWith('loot-') && (
                    <div className="text-xs text-gray-400">
                      {contextMenu.entity.hp}/{contextMenu.entity.maxHp} HP
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Info Actions */}
            <div className="px-3 py-2 border-b border-gray-700">
              <button
                className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
                onClick={() => {
                  console.log(`Examining ${contextMenu.entity.name}`);
                  setContextMenu(null);
                }}
              >
                <Eye className="w-4 h-4" />
                Examine
              </button>

              {contextMenu.entity.type === 'npc' && (
                <button
                  className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
                  onClick={() => {
                    console.log(`Talking to ${contextMenu.entity.name}`);
                    setContextMenu(null);
                  }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Talk
                </button>
              )}

              {contextMenu.entityId.startsWith('loot-') && (
                <button
                  className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
                  onClick={() => {
                    console.log(`Picking up ${contextMenu.entity.name}`);
                    setContextMenu(null);
                  }}
                >
                  <Package className="w-4 h-4" />
                  Pick Up
                </button>
              )}
            </div>

            {/* Combat Actions */}
            {contextMenu.actions.length > 0 && contextMenu.entity.type === 'hostile' && (
              <div className="px-3 py-2">
                <div className="text-xs text-gray-500 mb-2">Combat Actions</div>
                {contextMenu.actions.map((action) => (
                  <button
                    key={action.id}
                    className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
                    onClick={() => handleActionClick(action, contextMenu.entityId)}
                  >
                    {action.type === 'attack' && <Sword className="w-4 h-4 text-red-400" />}
                    {action.type === 'ability' && <Target className="w-4 h-4 text-blue-400" />}
                    <div>
                      <div>{action.name}</div>
                      {action.damage && (
                        <div className="text-xs text-gray-500">Damage: {action.damage}</div>
                      )}
                      <div className="text-xs text-gray-500">Cooldown: {action.cooldown/1000}s</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No actions available */}
            {contextMenu.actions.length === 0 && contextMenu.entity.type === 'hostile' && (
              <div className="px-3 py-2 text-xs text-gray-500">
                No actions available (on cooldown)
              </div>
            )}
          </div>
        )}

        {/* Room info */}
        <div className="mt-3 text-xs text-slate-400">
          <p className="font-medium text-slate-300">Current Room: {room.name}</p>
          <p>Environment: {room.environment} • Type: {room.type}</p>
          <div className="flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1">
              <Gem className="w-3 h-3 text-yellow-400" />
              {/*tacticalData.loot.length*/} 0 items
            </span>
            <span className="flex items-center gap-1">
              <Skull className="w-3 h-3 text-red-500" />
              {combatSystem.getHostileEntities().length} enemies
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" />
              {combatSystem.getFriendlyEntities().length - 1 + playersInRoom.filter(p => p.id !== crawler.id).length} friendlies
            </span>
            {combatState.selectedEntityId && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Eye className="w-3 h-3" />
                {combatState.entities.find(e => e.id === combatState.selectedEntityId)?.name} selected
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}