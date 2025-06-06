import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Gem, Skull, Users, Sword, Shield, Target, MessageCircle, Package, Home, ArrowDown, Footprints, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CrawlerWithDetails } from "@shared/schema";
import { combatSystem, type CombatEntity, type CombatAction } from "@/features/combat/combat-system";
import { useEffect, useState, useRef } from "react";
import ActionQueuePanel from "./action-queue-panel";

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
  isExplored?: boolean;
  isScanned?: boolean;
  hasEnemies?: boolean;
  neutralCount?: number;
  playerCount?: number;
  isCurrentRoom?: boolean;
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
  clickPosition?: { x: number; y: number };
}

interface ExploredRoom extends Room {
  isExplored: boolean;
  isScanned: boolean;
  hasEnemies: boolean;
  neutralCount: number;
  playerCount: number;
  isCurrentRoom: boolean;
}

export default function TacticalViewPanel({ crawler }: TacticalViewPanelProps) {
  const [combatState, setCombatState] = useState(combatSystem.getState());
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [lastRoomId, setLastRoomId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    entityId: string;
    entity: CombatEntity;
    actions: CombatAction[];
    clickPosition?: { x: number; y: number };
  } | null>(null);
  const [hoveredLoot, setHoveredLoot] = useState<number | null>(null);
  const [activeActionMode, setActiveActionMode] = useState<{
    type: 'move' | 'attack' | 'ability';
    actionId: string;
    actionName: string;
  } | null>(null);
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

      // Clear existing entities except player and party members
      combatState.entities.forEach(entity => {
        if (!entity.id.startsWith('player') && !entity.id.startsWith('party-') && !entity.id.startsWith('companion-')) {
          combatSystem.removeEntity(entity.id);
        }
      });

      // Calculate entry position for the party
      const partyEntryPositions = getPartyEntryPositions(entryDirection, roomData.playersInRoom.length + 1); // +1 for main player

      // Add/update main player entity
      const playerEntity: CombatEntity = {
        id: 'player',
        name: crawler.name,
        type: 'player',
        hp: crawler.hp,
        maxHp: crawler.maxHp,
        attack: crawler.attack,
        defense: crawler.defense,
        speed: crawler.speed,
        position: partyEntryPositions[0], // Main player gets first position
        entryDirection,
      };

      if (!combatState.entities.find(e => e.id === 'player')) {
        combatSystem.addEntity(playerEntity);
      } else {
        combatSystem.updateEntity('player', playerEntity);
      }

      // TODO: Add party members when party system is implemented
      // Example placeholder for party members:
      /*
      const partyMembers = getPartyMembers(); // Future function to get party data
      partyMembers.forEach((member, index) => {
        const memberEntity: CombatEntity = {
          id: `party-${member.id}`,
          name: member.name,
          type: 'player',
          hp: member.hp,
          maxHp: member.maxHp,
          attack: member.attack,
          defense: member.defense,
          speed: member.speed,
          position: partyEntryPositions[index + 1] || partyEntryPositions[0], // Fallback to main position
          entryDirection,
        };
        combatSystem.addEntity(memberEntity);
      });
      */

      // TODO: Add companions/pets when companion system is implemented
      // Example placeholder for companions:
      /*
      const companions = getActiveCompanions(); // Future function to get companion data
      companions.forEach((companion, index) => {
        const companionEntity: CombatEntity = {
          id: `companion-${companion.id}`,
          name: companion.name,
          type: 'neutral',
          hp: companion.hp,
          maxHp: companion.maxHp,
          attack: companion.attack,
          defense: companion.defense,
          speed: companion.speed,
          position: getCompanionPosition(partyEntryPositions[0], index), // Position near main player
          entryDirection,
        };
        combatSystem.addEntity(companionEntity);
      });
      */

      // Add room entities based on tactical data
      const tacticalData = generateTacticalData(roomData);

      // Add mobs as combat entities
      tacticalData.mobs.forEach((mob, index) => {
        const maxHp = 100;
        const mobEntity: CombatEntity = {
          id: `mob-${index}`,
          name: mob.name,
          type: 'hostile',
          hp: maxHp, // Always spawn with full health
          maxHp: maxHp,
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
    }
  }, [roomData, crawler]);

  // Helper function to convert grid coordinates to percentage
  const gridToPercentage = (gridX: number, gridY: number): { x: number; y: number } => {
    // Convert 0-14 grid coordinates to percentage (with padding)
    const cellWidth = 100 / 15;
    const cellHeight = 100 / 15;
    return {
      x: (gridX + 0.5) * cellWidth, // Center of the cell
      y: (gridY + 0.5) * cellHeight
    };
  };

  // Helper function to get party entry positions based on direction
  const getPartyEntryPositions = (direction: 'north' | 'south' | 'east' | 'west' | null, partySize: number): { x: number; y: number }[] => {
    const positions: { x: number; y: number }[] = [];

    // Get base entry position
    let baseGridX = 7; // Center
    let baseGridY = 7; // Center
    let spreadDirection: 'horizontal' | 'vertical' = 'horizontal';

    switch (direction) {
      case 'north':
        baseGridX = 7;
        baseGridY = 13; // Enter from south side (bottom)
        spreadDirection = 'horizontal';
        break;
      case 'south':
        baseGridX = 7;
        baseGridY = 1; // Enter from north side (top)
        spreadDirection = 'horizontal';
        break;
      case 'east':
        baseGridX = 1;
        baseGridY = 7; // Enter from west side (left)
        spreadDirection = 'vertical';
        break;
      case 'west':
        baseGridX = 13;
        baseGridY = 7; // Enter from east side (right)
        spreadDirection = 'vertical';
        break;
      default:
        // No direction or center spawn
        baseGridX = 7;
        baseGridY = 7;
        spreadDirection = 'horizontal';
    }

    // Calculate positions for party members
    const halfParty = Math.floor(partySize / 2);

    for (let i = 0; i < partySize; i++) {
      let gridX = baseGridX;
      let gridY = baseGridY;

      if (partySize > 1) {
        const offset = i - halfParty;

        if (spreadDirection === 'horizontal') {
          gridX = Math.max(0, Math.min(14, baseGridX + offset));
        } else {
          gridY = Math.max(0, Math.min(14, baseGridY + offset));
        }
      }

      positions.push(gridToPercentage(gridX, gridY));
    }

    return positions;
  };

  // Helper function to position companions near their owner
  const getCompanionPosition = (ownerPosition: { x: number; y: number }, companionIndex: number): { x: number; y: number } => {
    // Convert owner position back to grid coordinates
    const ownerGridX = Math.floor((ownerPosition.x / 100) * 15);
    const ownerGridY = Math.floor((ownerPosition.y / 100) * 15);

    // Position companions in adjacent cells
    const companionOffsets = [
      { x: 1, y: 0 },   // Right
      { x: -1, y: 0 },  // Left
      { x: 0, y: 1 },   // Down
      { x: 0, y: -1 },  // Up
      { x: 1, y: 1 },   // Diagonal down-right
      { x: -1, y: -1 }, // Diagonal up-left
      { x: 1, y: -1 },  // Diagonal up-right
      { x: -1, y: 1 },  // Diagonal down-left
    ];

    const offset = companionOffsets[companionIndex % companionOffsets.length];
    const companionGridX = Math.max(0, Math.min(14, ownerGridX + offset.x));
    const companionGridY = Math.max(0, Math.min(14, ownerGridY + offset.y));

    return gridToPercentage(companionGridX, companionGridY);
  };

  // Helper function to get a random empty grid cell
  const getRandomEmptyCell = (excludeCells: Set<string> = new Set()): { gridX: number; gridY: number } => {
    let attempts = 0;
    while (attempts < 100) { // Prevent infinite loops
      const gridX = Math.floor(Math.random() * 15);
      const gridY = Math.floor(Math.random() * 15);
      const cellKey = `${gridX},${gridY}`;

      if (!excludeCells.has(cellKey)) {
        excludeCells.add(cellKey);
        return { gridX, gridY };
      }
      attempts++;
    }
    // Fallback if no empty cell found
    return { gridX: 7, gridY: 7 };
  };

  // Helper function to generate tactical data
  const generateTacticalData = (data: RoomData) => {
    const { room, availableDirections, playersInRoom } = data;
    const occupiedCells = new Set<string>();

    return {
      background: getRoomBackgroundType(room.environment, room.type),
      loot: generateLootPositions(room.hasLoot, room.type, occupiedCells),
      mobs: generateMobPositions(room.type, room.factionId, occupiedCells),
      npcs: generateNpcPositions(room.type, room.isSafe, occupiedCells),
      exits: {
        north: availableDirections.includes("north"),
        south: availableDirections.includes("south"),
        east: availableDirections.includes("east"),
        west: availableDirections.includes("west")
      },
      otherPlayers: playersInRoom.filter(p => p.id !== crawler.id)
    };
  };

  // Click handlers
  const handleEntityClick = (entityId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(null); // Close any open context menu

    if (event.button === 0) { // Left click
      if (activeActionMode?.type === 'attack') {
        // Queue the attack action on the selected entity
        handleActionClick({ id: activeActionMode.actionId, name: activeActionMode.actionName, type: activeActionMode.type }, entityId);
        setActiveActionMode(null); // Clear active action mode
      } else {
        // If clicking on already selected entity, deselect it
        const currentlySelected = combatSystem.getSelectedEntity();
        if (currentlySelected && currentlySelected.id === entityId) {
          combatSystem.selectEntity(null);
        } else {
          combatSystem.selectEntity(entityId);
        }
      }
    }
  };

  const handleGridRightClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const selectedEntity = combatSystem.getSelectedEntity();
    if (!selectedEntity || selectedEntity.type !== 'player') return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = ((event.clientX - rect.left) / rect.width) * 100;
    const clickY = ((event.clientY - rect.top) / rect.height) * 100;

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      entityId: 'grid',
      entity: {
        id: 'grid',
        name: 'Empty Space',
        type: 'neutral',
        hp: 1,
        maxHp: 1,
        attack: 0,
        defense: 0,
        speed: 0,
        position: { x: clickX, y: clickY }
      } as CombatEntity,
      actions: [],
      clickPosition: { x: clickX, y: clickY },
    });
  };

  const handleEntityRightClick = (entityId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const entity = combatState.entities.find(e => e.id === entityId);
    if (!entity) return;

    const selectedEntity = combatSystem.getSelectedEntity();
    let availableActions: CombatAction[] = [];

    if (selectedEntity && entity.type === 'hostile') {
      availableActions = combatSystem.getAvailableActions(selectedEntity.id);
    }

    // Calculate click position relative to the grid
    const gridElement = event.currentTarget.closest('.relative');
    if (gridElement) {
      const rect = gridElement.getBoundingClientRect();
      const clickX = ((event.clientX - rect.left) / rect.width) * 100;
      const clickY = ((event.clientY - rect.top) / rect.height) * 100;

      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        entityId,
        entity,
        actions: availableActions,
        clickPosition: { x: clickX, y: clickY },
      });
    }
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

  const handleActionClick = (action: CombatAction, targetId: string) => {
    const selectedEntity = combatSystem.getSelectedEntity();
    if (selectedEntity) {
      const success = combatSystem.queueAction(selectedEntity.id, action.id, targetId);
      if (success) {
        console.log(`${selectedEntity.name} queued ${action.name} on ${targetId}`);
      } else {
        console.log(`Failed to queue ${action.name} - check cooldown, range, or existing action`);
      }
    }
    setContextMenu(null);
  };

  const handleMoveToPosition = (targetPosition?: { x: number; y: number }) => {
    if (!targetPosition) return;

    const selectedEntity = combatSystem.getSelectedEntity();
    if (selectedEntity) {
      const success = combatSystem.queueMoveAction(selectedEntity.id, targetPosition);
      if (success) {
        console.log(`${selectedEntity.name} moving to ${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)}`);
      } else {
        console.log(`Failed to queue move action - check cooldown or existing action`);
      }
    }
    setContextMenu(null);
  };

  const handleGridClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only handle left clicks
    if (event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    console.log(`Grid clicked at: ${x.toFixed(1)}, ${y.toFixed(1)}, activeActionMode:`, activeActionMode);

    // Always try to queue a move action when clicking on the map, regardless of action mode
    const selectedEntity = combatSystem.getSelectedEntity();
    
    if (selectedEntity?.type === 'player') {
      const success = combatSystem.queueMoveAction(selectedEntity.id, { x, y });
      console.log('Move action queued:', success);
      
      if (success) {
        console.log(`${selectedEntity.name} moving to ${x.toFixed(1)}, ${y.toFixed(1)}`);
        // Clear active action mode after successful move
        if (activeActionMode) {
          setActiveActionMode(null);
        }
      } else {
        console.log(`Failed to queue move action - check cooldown or existing action`);
      }
    } else {
      // If no player selected, automatically select the player and then try to move
      const playerEntity = combatState.entities.find(e => e.id === 'player');
      if (playerEntity) {
        combatSystem.selectEntity('player');
        // Small delay to ensure selection is processed, then queue move
        setTimeout(() => {
          const success = combatSystem.queueMoveAction('player', { x, y });
          if (success) {
            console.log(`${playerEntity.name} moving to ${x.toFixed(1)}, ${y.toFixed(1)}`);
            if (activeActionMode) {
              setActiveActionMode(null);
            }
          }
        }, 50);
      } else {
        console.log('No player entity found');
      }
    }
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
  const tacticalData = generateTacticalData(roomData);

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

  function generateLootPositions(hasLoot: boolean, roomType: string, occupiedCells: Set<string>) {
    if (!hasLoot) return [];

    const lootItems = [];
    if (roomType === "treasure") {
      const chest = getRandomEmptyCell(occupiedCells);
      const chestPos = gridToPercentage(chest.gridX, chest.gridY);

      const coins = getRandomEmptyCell(occupiedCells);
      const coinsPos = gridToPercentage(coins.gridX, chest.gridY);

      const gems = getRandomEmptyCell(occupiedCells);
      const gemsPos = gridToPercentage(gems.gridX, chest.gridY);

      lootItems.push(
        { type: "treasure", name: "Treasure Chest", x: chestPos.x, y: chestPos.y },
        { type: "treasure", name: "Golden Coins", x: coinsPos.x, y: coinsPos.y },
        { type: "treasure", name: "Precious Gems", x: gemsPos.x, y: gemsPos.y }
      );
    } else {
      // Random loot positioning for normal rooms
      const lootCount = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < lootCount; i++) {
        const cell = getRandomEmptyCell(occupiedCells);
        const pos = gridToPercentage(cell.gridX, cell.gridY);

        lootItems.push({
          type: Math.random() > 0.5 ? "treasure" : "weapon",
          name: Math.random() > 0.5 ? "Dropped Item" : "Equipment",
          x: pos.x,
          y: pos.y
        });
      }
    }
    return lootItems;
  }

  function generateMobPositions(roomType: string, factionId: number | null | undefined, occupiedCells: Set<string>) {
    const mobs = [];

    if (roomType === "safe" || roomType === "entrance") return mobs;

    if (roomType === "boss") {
      const cell = getRandomEmptyCell(occupiedCells);
      const pos = gridToPercentage(cell.gridX, cell.gridY);

      mobs.push({
        type: "hostile",
        name: "Boss Monster",
        x: pos.x,
        y: pos.y,
        hp: 100
      });
    } else if (factionId) {
      // Add faction-based enemies
      const enemyCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < enemyCount; i++) {
        const cell = getRandomEmptyCell(occupiedCells);
        const pos = gridToPercentage(cell.gridX, cell.gridY);

        mobs.push({
          type: "hostile",
          name: "Faction Warrior",
          x: pos.x,
          y: pos.y,
          hp: 100
        });
      }
    } else {
      // Random enemies for unclaimed rooms
      if (Math.random() > 0.6) {
        const cell = getRandomEmptyCell(occupiedCells);
        const pos = gridToPercentage(cell.gridX, cell.gridY);

        mobs.push({
          type: "hostile",
          name: "Wild Monster",
          x: pos.x,
          y: pos.y,
          hp: 100
        });
      }
    }

    return mobs;
  }

  function generateNpcPositions(roomType: string, isSafe: boolean, occupiedCells: Set<string>) {
    const npcs = [];

    if (isSafe || roomType === "safe") {
      const cell = getRandomEmptyCell(occupiedCells);
      const pos = gridToPercentage(cell.gridX, cell.gridY);

      npcs.push({
        name: "Sanctuary Keeper",
        x: pos.x,
        y: pos.y,
        dialogue: true
      });
    } else if (Math.random() > 0.8) {
      const cell = getRandomEmptyCell(occupiedCells);
      const pos = gridToPercentage(cell.gridX, cell.gridY);

      npcs.push({
        name: "Wandering Merchant",
        x: pos.x,
        y: pos.y,
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

  // Add hotbar for actions
  const hotbarActions = [
    { id: 'move', name: 'Move', icon: <Footprints className="w-4 h-4" />, type: 'move' },
    { id: 'attack', name: 'Attack', icon: <Sword className="w-4 h-4" />, type: 'attack' },
    { id: 'defend', name: 'Defend', icon: <Shield className="w-4 h-4" />, type: 'ability' },
    { id: 'ability1', name: 'Ability 1', icon: <Target className="w-4 h-4" />, type: 'ability' },
    { id: 'ability2', name: 'Ability 2', icon: <Target className="w-4 h-4" />, type: 'ability' },
    { id: 'ability3', name: 'Ability 3', icon: <Target className="w-4 h-4" />, type: 'ability' },
    { id: 'ability4', name: 'Ability 4', icon: <Target className="w-4 h-4" />, type: 'ability' },
    { id: 'ability5', name: 'Ability 5', icon: <Target className="w-4 h-4" />, type: 'ability' },
    { id: 'ability6', name: 'Ability 6', icon: <Target className="w-4 h-4" />, type: 'ability' },
    { id: 'wait', name: 'Wait', icon: <Clock className="w-4 h-4" />, type: 'ability' },
  ];

  const handleHotbarClick = (actionId: string, actionType: string, actionName: string) => {
    console.log(`Hotbar action clicked: ${actionId}`);

    // Always select the player when any hotbar action is clicked, deselecting any other entity
    const playerEntity = combatState.entities.find(e => e.id === 'player');
    if (playerEntity) {
      combatSystem.selectEntity('player');
    }

    if (actionId === 'move') {
      // Activate move mode
      setActiveActionMode({ type: 'move', actionId: 'move', actionName: 'Move' });
    } else if (actionType === 'attack') {
      // Activate attack mode
      setActiveActionMode({ type: 'attack', actionId: actionId, actionName: actionName });
    } else {
      // Handle other abilities/actions
      console.log(`Casting ability: ${actionId}`);
      setActiveActionMode({ type: 'ability', actionId: actionId, actionName: actionName });
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
          className={`relative w-full aspect-square border-2 ${combatState.isInCombat ? 'border-red-400' : activeActionMode?.actionId === 'move' ? 'border-green-400' : 'border-game-border'} rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition-colors`}
          onClick={handleGridClick}
          onContextMenu={handleGridRightClick}
          title="Click to move your character"
        >
          {/* Room Background */}
          <div className={`absolute inset-0 ${getRoomBackground(tacticalData.background)}`}>
            {/* Grid overlay for tactical feel */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" viewBox="0 0 15 15" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                    <path d="M 1 0 L 0 0 0 1" fill="none" stroke="currentColor" strokeWidth="0.02"/>
                  </pattern>
                </defs>
                <rect width="15" height="15" fill="url(#grid)" />
              </svg>
            </div>
          </div>

          {/* Exit indicators */}
          {tacticalData.exits.north && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-green-400 rounded-b"></div>
          )}
          {tacticalData.exits.south && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-green-400 rounded-t"></div>
          )}
          {tacticalData.exits.east && (
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-green-400 rounded-l"></div>
          )}
          {tacticalData.exits.west && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-green-400 rounded-r"></div>
          )}

          {/*```text
          Combat Entities */}
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

              {/* HP bar for non-player entities (only show if damaged) */}
              {entity.type !== 'player' && entity.hp !== undefined && entity.maxHp !== undefined && entity.hp < entity.maxHp && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-700 rounded overflow-hidden">
                  <div 
                    className={`h-full rounded transition-all duration-300 ${entity.type === 'hostile' ? 'bg-red-400' : 'bg-green-400'}`}
                    style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
                  ></div>
                </div>
              )}

              {/* Selection indicator - always show when selected */}
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
          {tacticalData.loot.map((item, index) => (
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

              {/* Hover name display */}
              {hoveredLoot === index && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                  {item.name}
                </div>
              )}
            </div>
          ))}



          {/* Other Players */}
          {tacticalData.otherPlayers.map((player, index) => {
            // Generate a specific grid position for each other player
            const gridX = 2 + (index % 3) * 2; // Spread horizontally: 2, 4, 6, then wrap
            const gridY = 12 + Math.floor(index / 3); // Stack vertically if more than 3 players
            const pos = gridToPercentage(gridX, gridY);

            return (
              <div
                key={`player-${index}`}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
                style={{ 
                  left: `${pos.x}%`, 
                  top: `${pos.y}%` 
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
            );
          })}
        </div>

        {/* Hotbar */}
        <div className="flex justify-center gap-2 mt-2">
          {hotbarActions.map((action, index) => (
            <button
              key={action.id}
              className={`w-8 h-8 rounded-full ${activeActionMode?.actionId === action.id ? 'bg-yellow-500' : 'bg-gray-800 hover:bg-gray-700'} text-white flex items-center justify-center`}
              onClick={() => handleHotbarClick(action.id, action.type, action.name)}
              title={`${index + 1}: ${action.name}`}
            >
              {action.icon}
            </button>
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

            {/* Movement Actions */}
            {contextMenu.clickPosition && combatSystem.getSelectedEntity()?.type === 'player' && (
              <div className="px-3 py-2 border-b border-gray-700">
                <div className="text-xs text-gray-500 mb-2">Movement</div>
                <button
                  className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
                  onClick={() => handleMoveToPosition(contextMenu.clickPosition)}
                >
                  <Footprints className="w-4 h-4 text-green-400" />
                  <div>
                    <div>Move Here</div>
                    <div className="text-xs text-gray-500">Position: {contextMenu.clickPosition.x.toFixed(0)}, {contextMenu.clickPosition.y.toFixed(0)}</div>
                  </div>
                </button>
              </div>
            )}

            {/* Grid-specific actions */}
            {contextMenu.entityId === 'grid' && combatSystem.getSelectedEntity()?.type === 'player' && (
              <div className="px-3 py-2">
                <div className="text-xs text-gray-500 mb-2">Grid Actions</div>
                <button
                  className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
                  onClick={() => {
                    const selectedEntity = combatSystem.getSelectedEntity();
                    if (selectedEntity && contextMenu.clickPosition) {
                      const success = combatSystem.queueMoveAction(selectedEntity.id, contextMenu.clickPosition);
                      if (success) {
                        console.log(`${selectedEntity.name} moving to ${contextMenu.clickPosition.x.toFixed(1)}, ${contextMenu.clickPosition.y.toFixed(1)}`);
                      } else {
                        console.log(`Failed to queue move action - check cooldown or existing action`);
                      }
                    }
                    setContextMenu(null);
                  }}
                >
                  <Footprints className="w-4 h-4 text-green-400" />
                  <div>
                    <div>Move to Position</div>
                    <div className="text-xs text-gray-500">Grid: {contextMenu.clickPosition?.x.toFixed(0)}, {contextMenu.clickPosition?.y.toFixed(0)}</div>
                  </div>
                </button>
              </div>
            )}

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
              {tacticalData.loot.length} items
            </span>
            <span className="flex items-center gap-1">
              <Skull className="w-3 h-3 text-red-500" />
              {combatSystem.getHostileEntities().length} enemies
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" />
              {combatSystem.getFriendlyEntities().length - 1 + tacticalData.otherPlayers.length} friendlies
            </span>
            {combatState.isInCombat && (
              <span className="flex items-center gap-1 text-red-400 animate-pulse">
                <Sword className="w-3 h-3" />
                IN COMBAT
              </span>
            )}
            {combatState.selectedEntityId && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Eye className="w-3 h-3" />
                {combatState.entities.find(e => e.id === combatState.selectedEntityId)?.name} selected
              </span>
            )}
          </div>
        </div>

        {/* Action Queue Panel */}
        <div className="mt-4">
          <ActionQueuePanel />
        </div>
      </CardContent>
    </Card>
  );
}