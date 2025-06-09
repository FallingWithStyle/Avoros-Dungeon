import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye,
  Gem,
  Skull,
  Users,
  Sword,
  Shield,
  Target,
  MessageCircle,
  Package,
  Home,
  ArrowDown,
  Footprints,
  Clock,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CrawlerWithDetails } from "@shared/schema";
import {
  combatSystem,
  type CombatEntity,
  type CombatAction,
} from "@shared/combat-system";
import { useEffect, useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { isEnergyDisabled } from "@/components/debug-panel";
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

// Helper function to convert grid coordinates to percentage
const gridToPercentage = (
  gridX: number,
  gridY: number,
): { x: number; y: number } => {
  // Convert 0-14 grid coordinates to percentage (with padding)
  const cellWidth = 100 / 15;
  const cellHeight = 100 / 15;
  return {
    x: (gridX + 0.5) * cellWidth, // Center of the cell
    y: (gridY + 0.5) * cellHeight,
  };
};

// Helper function to get party entry positions based on direction
const getPartyEntryPositions = (
  direction: "north" | "south" | "east" | "west" | null,
  partySize: number,
): { x: number; y: number }[] => {
  const positions: { x: number; y: number }[] = [];

  // Get base entry position - spawn at opposite end from movement direction
  let baseGridX = 7; // Center
  let baseGridY = 7; // Center
  let spreadDirection: "horizontal" | "vertical" = "horizontal";

  switch (direction) {
    case "north":
      // Moved north - spawn at south side (bottom) of new room
      baseGridX = 7;
      baseGridY = 13;
      spreadDirection = "horizontal";
      break;
    case "south":
      // Moved south - spawn at north side (top) of new room
      baseGridX = 7;
      baseGridY = 1;
      spreadDirection = "horizontal";
      break;
    case "east":
      // Moved east - spawn at west side (left) of new room
      baseGridX = 1;
      baseGridY = 7;
      spreadDirection = "vertical";
      break;
    case "west":
      // Moved west - spawn at east side (right) of new room
      baseGridX = 13;
      baseGridY = 7;
      spreadDirection = "vertical";
      break;
    default:
      // No direction or center spawn
      baseGridX = 7;
      baseGridY = 7;
      spreadDirection = "horizontal";
  }

  // Calculate positions for party members
  const halfParty = Math.floor(partySize / 2);

  for (let i = 0; i < partySize; i++) {
    let gridX = baseGridX;
    let gridY = baseGridY;

    if (partySize > 1) {
      const offset = i - halfParty;

      if (spreadDirection === "horizontal") {
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
const getCompanionPosition = (
  ownerPosition: { x: number; y: number },
  companionIndex: number,
): { x: number; y: number } => {
  // Convert owner position back to grid coordinates
  const ownerGridX = Math.floor((ownerPosition.x / 100) * 15);
  const ownerGridY = Math.floor((ownerPosition.y / 100) * 15);

  // Position companions in adjacent cells
  const companionOffsets = [
    { x: 1, y: 0 }, // Right
    { x: -1, y: 0 }, // Left
    { x: 0, y: 1 }, // Down
    { x: 0, y: -1 }, // Up
    { x: 1, y: 1 }, // Diagonal down-right
    { x: -1, y: -1 }, // Diagonal up-left
    { x: 1, y: -1 }, // Diagonal up-right
    { x: -1, y: 1 }, // Diagonal down-left
  ];

  const offset = companionOffsets[companionIndex % companionOffsets.length];
  const companionGridX = Math.max(0, Math.min(14, ownerGridX + offset.x));
  const companionGridY = Math.max(0, Math.min(14, ownerGridY + offset.y));

  return gridToPercentage(companionGridX, companionGridY);
};

// Helper function to get a random empty grid cell
const getRandomEmptyCell = (
  excludeCells: Set<string> = new Set(),
): { gridX: number; gridY: number } => {
  let attempts = 0;
  while (attempts < 100) {
    // Prevent infinite loops
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

// Helper function to get room background type
const getRoomBackgroundType = (environment: string, type: string): string => {
  if (type === "entrance" || type === "exit") return "stone_chamber";
  if (type === "treasure") return "golden_chamber";
  if (type === "safe") return "peaceful_chamber";
  if (type === "boss") return "dark_chamber";

  switch (environment) {
    case "outdoor":
      return "forest_clearing";
    case "underground":
      return "dungeon_corridor";
    default:
      return "stone_chamber";
  }
};

// Helper function to generate loot positions
const generateLootPositions = (
  hasLoot: boolean,
  roomType: string,
  occupiedCells: Set<string>,
) => {
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
      {
        type: "treasure",
        name: "Treasure Chest",
        x: chestPos.x,
        y: chestPos.y,
      },
      {
        type: "treasure",
        name: "Golden Coins",
        x: coinsPos.x,
        y: coinsPos.y,
      },
      { type: "treasure", name: "Precious Gems", x: gemsPos.x, y: gemsPos.y },
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
        y: pos.y,
      });
    }
  }
  return lootItems;
};

// Helper function to generate mob positions
const generateMobPositions = (
  roomType: string,
  factionId: number | null | undefined,
  occupiedCells: Set<string>,
) => {
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
      hp: 100,
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
        hp: 100,
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
        hp: 100,
      });
    }
  }

  return mobs;
};

// Helper function to generate NPC positions
const generateNpcPositions = (
  roomType: string,
  isSafe: boolean,
  occupiedCells: Set<string>,
) => {
  const npcs = [];

  if (isSafe || roomType === "safe") {
    const cell = getRandomEmptyCell(occupiedCells);
    const pos = gridToPercentage(cell.gridX, cell.gridY);

    npcs.push({
      name: "Sanctuary Keeper",
      x: pos.x,
      y: pos.y,
      dialogue: true,
    });
  } else if (Math.random() > 0.8) {
    const cell = getRandomEmptyCell(occupiedCells);
    const pos = gridToPercentage(cell.gridX, cell.gridY);

    npcs.push({
      name: "Wandering Merchant",
      x: pos.x,
      y: pos.y,
      dialogue: true,
    });
  }

  return npcs;
};

// Helper function to generate tactical data
const generateTacticalData = (data: RoomData, crawler: CrawlerWithDetails) => {
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
      west: availableDirections.includes("west"),
    },
    otherPlayers: playersInRoom.filter((p) => p.id !== crawler.id),
  };
};

// Helper function to get room background CSS class
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

// Helper function to get loot icon
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

// Helper function to get mob icon
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

export default function TacticalViewPanel({ crawler }: TacticalViewPanelProps) {
  // ALL HOOKS AT TOP LEVEL - NEVER MOVE THESE OR ADD HOOKS ELSEWHERE
  const { toast } = useToast();

  // Fetch current room data for navigation
  const { data: currentRoomData } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/current-room`],
    refetchInterval: 2000,
  });

  // Fetch explored rooms for map refresh
  const { refetch: refetchExploredRooms } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
    refetchInterval: 30000,
    staleTime: 120000,
    retry: false,
  });

  // Function to handle cell click and initiate the movement - MUST BE AT TOP LEVEL
  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (!combatSystem) return;

      const player = combatSystem.getState().entities.find(e => e.id === 'player');
      if (!player) return;

      // Calculate if the clicked cell is adjacent to player
      const dx = Math.abs(x - player.position.x);
      const dy = Math.abs(y - player.position.y);
      const isAdjacent = (dx === 1 && dy === 0) || (dx === 0 && dy === 1);

      if (!isAdjacent) return;

      // Determine direction - fix the y-axis logic
      let direction: string;
      if (dx === 1) {
        direction = x > player.position.x ? 'east' : 'west';
      } else {
        // In a grid where y increases downward, north should be y - 1, south should be y + 1
        direction = y < player.position.y ? 'north' : 'south';
      }

      console.log(`Attempting to move ${direction} from player position (${player.position.x}, ${player.position.y}) to (${x}, ${y})`);

      // Check if this direction is available - need to access roomData from queries
      // This will be handled in the grid click handler where roomData is available
    },
    [] // Empty dependency array since we'll handle data access in the click handler
  );

  const hotbarActions = [
    {
      id: "move",
      name: "Move",
      icon: <Footprints className="w-4 h-4" />,
      type: "move",
    },
    {
      id: "attack",
      name: "Attack",
      icon: <Sword className="w-4 h-4" />,
      type: "attack",
    },
    {
      id: "defend",
      name: "Defend",
      icon: <Shield className="w-4 h-4" />,
      type: "ability",
    },
    {
      id: "ability1",
      name: "Ability 1",
      icon: <Target className="w-4 h-4" />,
      type: "ability",
    },
    {
      id: "ability2",
      name: "Ability 2",
      icon: <Target className="w-4 h-4" />,
      type: "ability",
    },
    {
      id: "ability3",
      name: "Ability 3",
      icon: <Target className="w-4 h-4" />,
      type: "ability",
    },
    {
      id: "basic_attack",
      name: "Normal Attack",
      icon: <Sword className="w-4 h-4" />,
      type: "attack",
    },
    {
      id: "heavy_attack",
      name: "Heavy Attack",
      icon: <Sword className="w-4 h-4" />,
      type: "attack",
    },
    {
      id: "ranged_attack",
      name: "Ranged Attack",
      icon: <Target className="w-4 h-4" />,
      type: "attack",
    },
    {
      id: "wait",
      name: "Wait",
      icon: <Clock className="w-4 h-4" />,
      type: "ability",
    },
  ];

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
    type: "move" | "attack" | "ability";
    actionId: string;
    actionName: string;
  } | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Fetch current room data with tactical positions
  const { data: roomData, isLoading } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/current-room`],
    refetchInterval: 2000, // Refresh every 2 seconds for more responsive room changes
  });

    // Generate client-side fallback tactical data when server data is unavailable
  const generateFallbackTacticalData = () => {
    if (!roomData?.room) return null;

    const fallbackEntities: any[] = [];
    const occupiedCells = new Set<string>();

    // Generate some basic entities based on room properties
    if (roomData.room.hasLoot && roomData.room.type !== 'safe') {
      // Add a loot item
      const lootCell = getRandomEmptyCell(occupiedCells);
      const lootPos = gridToPercentage(lootCell.gridX, lootCell.gridY);
      fallbackEntities.push({
        type: 'loot',
        name: 'Treasure',
        position: lootPos,
        data: { type: 'treasure' },
        x: lootPos.x,
        y: lootPos.y
      });
    }

    // Add basic enemies for non-safe rooms
    if (!roomData.room.isSafe && roomData.room.type !== 'entrance' && roomData.room.type !== 'safe') {
      if (Math.random() > 0.5) { // 50% chance for enemies
        const mobCell = getRandomEmptyCell(occupiedCells);
        const mobPos = gridToPercentage(mobCell.gridX, mobCell.gridY);
        fallbackEntities.push({
          type: 'mob',
          name: 'Unknown Enemy',
          position: mobPos,
          data: { 
            hp: 50,
            maxHp: 50,
            attack: 10,
            defense: 5,
            hostile: true
          }
        });
      }
    }

    return {
      room: roomData.room,
      availableDirections: roomData.availableDirections || [],
      playersInRoom: roomData.playersInRoom || [],
      tacticalEntities: fallbackEntities
    };
  };

  // Fetch tactical data separately for better caching with improved error handling
  const { data: tacticalData, isLoading: tacticalLoading, error: tacticalError, refetch: refetchTactical } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/tactical-data`],
    refetchInterval: (data, error) => {
      // Stop auto-refetching if there's a persistent error
      if (error) return false;
      return 2000; // Refresh every 2 seconds when successful
    },
    retry: (failureCount, error) => {
      // Don't retry 500 errors more than once to prevent infinite loops
      if (error?.message?.includes('500')) {
        return failureCount < 1;
      }
      // Don't retry 4xx errors except timeouts
      if (error?.message?.includes('4')) {
        const status = parseInt(error.message.split(':')[0]);
        if (status >= 400 && status < 500 && status !== 408) {
          return false;
        }
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 10000, // Consider data stale after 10 seconds
    onError: (error) => {
      console.error("=== TACTICAL DATA FETCH ERROR ===");
      console.error("Error details:", error);
      // Only show toast once per error to avoid spam
      if (!sessionStorage.getItem(`tactical-error-${crawler.id}`)) {
        sessionStorage.setItem(`tactical-error-${crawler.id}`, 'true');
        toast({
          title: "Tactical Data Error",
          description: "Using fallback tactical data. Some features may be limited.",
          variant: "destructive",
        });
        // Clear the flag after 30 seconds
        setTimeout(() => {
          sessionStorage.removeItem(`tactical-error-${crawler.id}`);
        }, 30000);
      }
    },
    onSuccess: (data) => {
      console.log("=== TACTICAL DATA FETCH SUCCESS ===");
      console.log("Room:", data.room?.name);
      console.log("Entities:", data.tacticalEntities?.length || 0);
      console.log("Directions:", data.availableDirections?.length || 0);
      console.log("Players:", data.playersInRoom?.length || 0);
      // Clear any error flags on success
      sessionStorage.removeItem(`tactical-error-${crawler.id}`);
    },
  });

  // Log tactical data for debugging
  useEffect(() => {
    if (tacticalData) {
      console.log('🎯 Tactical data updated in panel:', {
        entities: tacticalData.entities?.length || 0,
        tacticalEntities: tacticalData.tacticalEntities?.length || 0,
        entityTypes: tacticalData.entities?.map(e => `${e.type}: ${e.name}`) || [],
        tacticalEntityTypes: tacticalData.tacticalEntities?.map(e => `${e.type}: ${e.name}`) || [],
        room: tacticalData.room?.name,
        fullData: tacticalData
      });
    }
  }, [tacticalData]);

  // Use fallback data when tactical data is unavailable
  const effectiveTacticalData = tacticalData || generateFallbackTacticalData();

  // Subscribe to combat system updates
  useEffect(() => {
    const unsubscribe = combatSystem.subscribe((state) => {
      console.log("Combat state changed", state);

      // Clear active action mode when combat ends
      if (!state.isInCombat && combatState.isInCombat && activeActionMode) {
        console.log("Combat ended - clearing active action mode");
        setActiveActionMode(null);
      }

      setCombatState(state);
    });

    return unsubscribe;
  }, [combatState.isInCombat, activeActionMode]);

  // Room movement function using the actual API
  const handleRoomMovement = useCallback(async (direction: string) => {
    if (!crawler || !effectiveTacticalData?.availableDirections.includes(direction)) {
      console.log(`Cannot move ${direction} - not available or no crawler`);
      return;
    }

    try {
      console.log(`Moving crawler ${crawler.id} ${direction} to new room`);

      // Store the movement direction for tactical view positioning in the next room
      sessionStorage.setItem('lastMovementDirection', direction);

      const response = await apiRequest("POST", `/api/crawlers/${crawler.id}/move`, {
        direction,
        debugEnergyDisabled: isEnergyDisabled(),
      });

      if (response.success) {
        console.log(`Successfully moved ${direction} to ${response.newRoom?.name}`);

        // Refresh all relevant data when moving through doors
        refetchTactical();
        refetchExploredRooms(); // This will refresh the dungeon map

        // Force a re-render by clearing and re-adding the player entity with new position
        const currentEntities = combatSystem.getState().entities;
        currentEntities.forEach((entity) => {
          combatSystem.removeEntity(entity.id);
        });

        console.log(`Room transition complete - tactical view and map will refresh with new data`);
      }
    } catch (error) {
      console.error(`Failed to move ${direction}:`, error);
      toast({
        title: "Movement failed",
        description: error.message || "Could not move in that direction.",
        variant: "destructive",
      });
    }
  }, [crawler, effectiveTacticalData?.availableDirections, toast, refetchTactical, refetchExploredRooms]);

  // Gate crossing detection - triggers when player crosses through gates in correct direction
  useEffect(() => {
    if (!effectiveTacticalData?.room || !effectiveTacticalData?.availableDirections) return;

    const playerEntity = combatState.entities.find(e => e.id === "player");
    if (!playerEntity) return;

    const exits = {
      north: effectiveTacticalData.availableDirections.includes("north"),
      south: effectiveTacticalData.availableDirections.includes("south"),
      east: effectiveTacticalData.availableDirections.includes("east"),
      west: effectiveTacticalData.availableDirections.includes("west"),
    };

    const { x, y } = playerEntity.position;

    // Track player's previous position to determine movement direction
    const prevPosKey = 'prevPlayerPosition';
    const prevPosString = sessionStorage.getItem(prevPosKey);
    const prevPos = prevPosString ? JSON.parse(prevPosString) : { x, y };

    // Calculate movement direction
    const deltaX = x - prevPos.x;
    const deltaY = y - prevPos.y;

    // Store current position for next frame
    sessionStorage.setItem(prevPosKey, JSON.stringify({ x, y }));

    // Define gate zones (center third of each wall)
    const gateZoneMin = 35;
    const gateZoneMax = 65;
    const edgeThreshold = 3; // How close to edge before triggering

    let triggerDirection: string | null = null;

    // Check if player is in a gate zone AND moving in the correct direction AND near the edge
    if (exits.north && x >= gateZoneMin && x <= gateZoneMax && y <= edgeThreshold && deltaY < -0.5) {
      // Moving north through north gate
      triggerDirection = "north";
    } 
    else if (exits.south && x >= gateZoneMin && x <= gateZoneMax && y >= (100 - edgeThreshold) && deltaY > 0.5) {
      // Moving south through south gate
      triggerDirection = "south";
    }
    else if (exits.east && y >= gateZoneMin && y <= gateZoneMax && x >= (100 - edgeThreshold) && deltaX > 0.5) {
      // Moving east through east gate
      triggerDirection = "east";
    }
    else if (exits.west && y >= gateZoneMin && y <= gateZoneMax && x <= edgeThreshold && deltaX < -0.5) {
      // Moving west through west gate
      triggerDirection = "west";
    }

    // Log gate check failures for debugging
    if (!triggerDirection) {
      // Check each gate and log why it failed
      if (exits.north) {
        const inXRange = x >= gateZoneMin && x <= gateZoneMax;
        const nearEdge = y <= edgeThreshold;
        const movingCorrectly = deltaY < -0.5;
        
        if (!inXRange || !nearEdge || !movingCorrectly) {
          console.log(`❌ North gate check failed: inXRange=${inXRange} (x=${x.toFixed(1)}, need ${gateZoneMin}-${gateZoneMax}), nearEdge=${nearEdge} (y=${y.toFixed(1)}, need <=${edgeThreshold}), movingCorrectly=${movingCorrectly} (deltaY=${deltaY.toFixed(2)}, need <-0.5)`);
        }
      }
      
      if (exits.south) {
        const inXRange = x >= gateZoneMin && x <= gateZoneMax;
        const nearEdge = y >= (100 - edgeThreshold);
        const movingCorrectly = deltaY > 0.5;
        
        if (!inXRange || !nearEdge || !movingCorrectly) {
          console.log(`❌ South gate check failed: inXRange=${inXRange} (x=${x.toFixed(1)}, need ${gateZoneMin}-${gateZoneMax}), nearEdge=${nearEdge} (y=${y.toFixed(1)}, need >=${100 - edgeThreshold}), movingCorrectly=${movingCorrectly} (deltaY=${deltaY.toFixed(2)}, need >0.5)`);
        }
      }
      
      if (exits.east) {
        const inYRange = y >= gateZoneMin && y <= gateZoneMax;
        const nearEdge = x >= (100 - edgeThreshold);
        const movingCorrectly = deltaX > 0.5;
        
        if (!inYRange || !nearEdge || !movingCorrectly) {
          console.log(`❌ East gate check failed: inYRange=${inYRange} (y=${y.toFixed(1)}, need ${gateZoneMin}-${gateZoneMax}), nearEdge=${nearEdge} (x=${x.toFixed(1)}, need >=${100 - edgeThreshold}), movingCorrectly=${movingCorrectly} (deltaX=${deltaX.toFixed(2)}, need >0.5)`);
        }
      }
      
      if (exits.west) {
        const inYRange = y >= gateZoneMin && y <= gateZoneMax;
        const nearEdge = x <= edgeThreshold;
        const movingCorrectly = deltaX < -0.5;
        
        if (!inYRange || !nearEdge || !movingCorrectly) {
          console.log(`❌ West gate check failed: inYRange=${inYRange} (y=${y.toFixed(1)}, need ${gateZoneMin}-${gateZoneMax}), nearEdge=${nearEdge} (x=${x.toFixed(1)}, need <=${edgeThreshold}), movingCorrectly=${movingCorrectly} (deltaX=${deltaX.toFixed(2)}, need <-0.5)`);
        }
      }
    }

    if (triggerDirection) {
      // Prevent rapid multiple movements with a simple debounce
      const now = Date.now();
      const lastMovement = sessionStorage.getItem('lastProximityMovement');
      const lastMovementTime = lastMovement ? parseInt(lastMovement) : 0;

      if (now - lastMovementTime > 1000) { // 1 second cooldown
        console.log(`Player moving ${triggerDirection} through ${triggerDirection} gate at position (${x.toFixed(1)}, ${y.toFixed(1)}) with delta (${deltaX.toFixed(1)}, ${deltaY.toFixed(1)})`);
        sessionStorage.setItem('lastProximityMovement', now.toString());

        handleRoomMovement(triggerDirection);
      }
    }
  }, [combatState.entities, effectiveTacticalData?.room?.id, effectiveTacticalData?.availableDirections, handleRoomMovement]);

  // WASD Movement Input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const playerEntity = combatState.entities.find(e => e.id === "player");
      if (!playerEntity) {
        console.log("WASD pressed but no player entity found. Entities:", combatState.entities.map(e => e.id));
        return;
      }

      let direction: { x: number, y: number } | null = null;
      let keyPressed = "";

      switch (event.key.toLowerCase()) {
        case 'w':
          direction = { x: 0, y: -1 };
          keyPressed = "W (North)";
          break;
        case 'a':
          direction = { x: -1, y: 0 };
          keyPressed = "A (West)";
          break;
        case 's':
          direction = { x: 0, y: 1 };
          keyPressed = "S (South)";
          break;
        case 'd':
          direction = { x: 1, y: 0 };
          keyPressed = "D (East)";
          break;
        default:
          return; // Ignore other keys
      }

      event.preventDefault(); // Prevent default scrolling

      console.log(`${keyPressed} pressed. Player at:`, playerEntity.position);

      const speed = playerEntity.speed || 3; // Much smaller movement increments for smoothness
      const moveDistance = speed; // Move in small percentage units
      let newX = playerEntity.position.x + direction.x * moveDistance;
      let newY = playerEntity.position.y + direction.y * moveDistance;

      // Check if player is approaching a door and allow boundary crossing
      const isApproachingDoor = (x: number, y: number, dir: { x: number, y: number }) => {
        if (!effectiveTacticalData?.availableDirections) return false;

        const exits = {
          north: effectiveTacticalData.availableDirections.includes("north"),
          south: effectiveTacticalData.availableDirections.includes("south"),
          east: effectiveTacticalData.availableDirections.includes("east"),
          west: effectiveTacticalData.availableDirections.includes("west"),
        };

        // Check if moving toward a door (within gate area)
        const inGateArea = (x >= 35 && x <= 65) || (y >= 35 && y <= 65);

        if (dir.y < 0 && exits.north && y <= 10 && x >= 35 && x <= 65) return true; // Moving north toward north door
        if (dir.y > 0 && exits.south && y >= 90 && x >= 35 && x <= 65) return true; // Moving south toward south door  
        if (dir.x > 0 && exits.east && x >= 90 && y >= 35 && y <= 65) return true; // Moving east toward east door
        if (dir.x < 0 && exits.west && x <= 10 && y >= 35 && y <= 65) return true; // Moving west toward west door

        return false;      };

      // Allow crossing boundaries if approaching a door, otherwise clamp
      if (isApproachingDoor(playerEntity.position.x, playerEntity.position.y, direction)) {
        // Allow movement beyond normal boundaries for door transitions
        newX = Math.max(-5, Math.min(105, newX)); // Extended boundary for door crossing
        newY = Math.max(-5, Math.min(105, newY));
        console.log(`Door approach detected - allowing extended movement to (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
      } else {
        // Normal boundary clamping
        newX = Math.max(2, Math.min(98, newX)); // Leave small border
        newY = Math.max(2, Math.min(98, newY));
      }

      console.log(`Moving from (${playerEntity.position.x.toFixed(1)}, ${playerEntity.position.y.toFixed(1)}) to (${newX.toFixed(1)}, ${newY.toFixed(1)})`);

      // Queue the move action
      const success = combatSystem.queueMoveAction(playerEntity.id, { x: newX, y: newY });
      console.log(`Move action queued:`, success);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [combatState.entities, effectiveTacticalData?.availableDirections]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [contextMenu]);

  // Handle hotbar keyboard shortcuts (1-0)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const key = event.key;
      let actionIndex = -1;

      // Handle keys 1-9 and 0 (which maps to index 9)
      if (key >= "1" && key <= "9") {
        actionIndex = parseInt(key) - 1; // Convert 1-9 to 0-8
      } else if (key === "0") {
        actionIndex = 9; // 0 key maps to the 10th action (index 9)
      }

      if (actionIndex >= 0 && actionIndex < hotbarActions.length) {
        event.preventDefault();
        const action = hotbarActions[actionIndex];
        const cooldownPercentage = getCooldownPercentage(action.id);

        if (cooldownPercentage === 0) {
          // Only trigger if not on cooldown
          handleHotbarClick(action.id, action.type, action.name);
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [hotbarActions]);

  // Update room data and player position when room changes
  useEffect(() => {
    if (!roomData?.room) return;

    const currentRoomId = roomData.room.id;
    const shouldClearEntities = lastRoomId !== null && lastRoomId !== currentRoomId;

    // If room changed, immediately refetch tactical data
    if (shouldClearEntities) {
      console.log(`Room changed from ${lastRoomId} to ${currentRoomId} - immediately refreshing tactical data`);
      refetchTactical();
    }

    // Update lastRoomId
    setLastRoomId(currentRoomId);

    // Update combat system with current room data for safe room detection
    combatSystem.setCurrentRoomData(roomData.room);

    // Clear ALL entities when room changes, then rebuild from scratch
    if (shouldClearEntities || lastRoomId === null) {
      const currentEntities = combatSystem.getState().entities;
      currentEntities.forEach((entity) => {
        combatSystem.removeEntity(entity.id);
      });
      console.log(`Cleared all entities for room ${currentRoomId}`);
    }

    // Always ensure player entity exists - check after any clearing
    const existingPlayer = combatSystem.getState().entities.find(e => e.id === "player");
    if (!existingPlayer) {
      // Get last movement direction from session storage to position player appropriately
      const lastDirection = sessionStorage.getItem("lastMovementDirection") as 'north' | 'south' | 'east' | 'west' | null;
      console.log(`Player entering room ${currentRoomId}, came from direction: ${lastDirection}`);

      const entryPosition = combatSystem.getEntryPosition(lastDirection);
      console.log(`Calculated entry position: ${entryPosition.x}, ${entryPosition.y}`);
      const playerEntity: CombatEntity = {
        id: "player",
        name: crawler.name,
        type: "player",
        hp: crawler.health || 100,
        maxHp: crawler.maxHealth || 100,
        attack: 20, // Base attack for player
        defense: 10, // Base defense for player
        speed: 15,
        position: entryPosition,
        facing: lastDirection || 'south', // Face in the direction moved or default south
        entryDirection: lastDirection,
      };

      combatSystem.addEntity(playerEntity);
      combatSystem.selectEntity("player"); // Auto-select the player
      console.log(`Added player entity at position for room ${currentRoomId}`, playerEntity.position);
    }
  }, [roomData?.room, lastRoomId, crawler.name, crawler.health, crawler.maxHealth]);

  // Additional effect to ensure player entity is always present
  useEffect(() => {
    const ensurePlayerExists = () => {
      const existingPlayer = combatSystem.getState().entities.find(e => e.id === "player");
      if (!existingPlayer && roomData?.room) {
        console.log("Player entity missing, creating fallback player");
        const fallbackPosition = { x: 50, y: 50 }; // Center position
        const playerEntity: CombatEntity = {
          id: "player",
          name: crawler.name,
          type: "player",
          hp: crawler.health || 100,
          maxHp: crawler.maxHealth || 100,
          attack: 20,
          defense: 10,
          speed: 15,
          position: fallbackPosition,
          facing: 'south', // Default facing direction
        };

        combatSystem.addEntity(playerEntity);
        combatSystem.selectEntity("player");
        console.log(`Created fallback player entity at center position`);
      }
    };

    // Check immediately
    ensurePlayerExists();

    // Also check every few seconds to make sure player entity doesn't get lost
    const interval = setInterval(ensurePlayerExists, 3000);
    return () => clearInterval(interval);
  }, [crawler.name, crawler.health, crawler.maxHealth, roomData?.room]);

  // Separate effect for tactical entities to avoid conflicts

  // NON-HOOK FUNCTIONS DEFINED INSIDE COMPONENT (NO STATE/HOOK DEPENDENCIES)
  const getCooldownPercentage = (actionId: string): number => {
    const playerEntity = combatState.entities.find((e) => e.id === "player");
    if (!playerEntity || !playerEntity.cooldowns) return 0;

    const action = combatSystem.actionDefinitions?.get(actionId);
    if (!action) return 0;

    const lastUsed = playerEntity.cooldowns[actionId] || 0;
    const now = Date.now();
    const timeSinceLastUse = now - lastUsed;

    if (timeSinceLastUse >= action.cooldown) return 0; // No cooldown

    return ((action.cooldown - timeSinceLastUse) / action.cooldown) * 100;
  };

  const findViableTarget = (): CombatEntity | null => {
    const hostileEntities = combatSystem.getHostileEntities();
    if (hostileEntities.length === 0) return null;

    const playerEntity = combatState.entities.find((e) => e.id === "player");
    if (!playerEntity) return null;

    // Find the closest hostile entity
    let closestTarget: CombatEntity | null = null;
    let closestDistance = Infinity;

    hostileEntities.forEach((entity) => {
      const distance = combatSystem.calculateDistance(
        playerEntity.position,
        entity.position,
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestTarget = entity;
      }
    });

    return closestTarget;
  };

  const handleHotbarClick = (
    actionId: string,
    actionType: string,
    actionName: string,
  ) => {
    console.log(`Hotbar action clicked: ${actionId}`);

    // Check if this action is already selected - if so, deselect it
    if (activeActionMode?.actionId === actionId) {
      console.log(`Deselecting active action mode: ${actionId}`);
      setActiveActionMode(null);
      return;
    }

    // Always select the player when any hotbar action is clicked, deselecting any other entity
    const playerEntity = combatState.entities.find((e) => e.id === "player");
    if (playerEntity) {
      combatSystem.selectEntity("player");
    }

    if (actionId === "move") {
      // Activate move mode
      setActiveActionMode({
        type: "move",
        actionId: "move",
        actionName: "Move",
      });
    } else if (actionType === "attack") {
      // Execute directional attack immediately - attack all enemies in front of player
      if (playerEntity) {
        const success = combatSystem.executeDirectionalAttack(playerEntity.id, actionId);
        if (success) {
          console.log(`Executed directional attack: ${actionName}`);
        } else {
          console.log(`Failed to execute directional attack - check cooldown, range, or no enemies in direction`);
        }
      } else {
        console.log("No player entity found for directional attack");
      }
    } else {
      // Handle other abilities/actions
      console.log(`Casting ability: ${actionId}`);
      setActiveActionMode({
        type: "ability",
        actionId: actionId,
        actionName: actionName,
      });
    }
  };

  // Click handlers
  const handleEntityClick = (entityId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(null); // Close any open context menu

    if (event.button === 0) {
      // Left click
      if (activeActionMode?.type === "attack") {
        // Handle attack mode - move to target if necessary, then attack
        const playerEntity = combatState.entities.find((e) => e.id === "player");
        const target = combatState.entities.find((e) => e.id === entityId);

        if (playerEntity && target && target.type === "hostile") {
          const attackAction = combatSystem.actionDefinitions?.get(activeActionMode.actionId) || {
            id: activeActionMode.actionId,
            name: activeActionMode.actionName,
            type: "attack",
            cooldown: 2000,
            damage: 20,
            range: 15,
            targetType: "single",
            executionTime: 1000,
          };

          // Check if target is in range
          const distance = combatSystem.calculateDistance(playerEntity.position, target.position);

          if (distance <= (attackAction.range || 15)) {
            // Target is in range, attack directly
            const success = combatSystem.queueAction(
              playerEntity.id,
              activeActionMode.actionId,
              target.id,
            );
            if (success) {
              console.log(`Attacking ${target.name} directly`);
              setActiveActionMode(null); // Clear active action mode
            } else {
              console.log(`Failed to attack ${target.name} - check cooldown or existing action`);
            }
          } else {
            // Target is out of range, queue move then attack
            console.log(`Target out of range, moving closer to ${target.name}`);

            // Calculate position to move to (just within attack range)
            const dx = target.position.x - playerEntity.position.x;
            const dy = target.position.y - playerEntity.position.y;
            const targetDistance = Math.sqrt(dx * dx + dy * dy);
            const moveDistance = Math.max(0, targetDistance - (attackAction.range || 15) + 2); // Leave small buffer

            const moveX = playerEntity.position.x + (dx / targetDistance) * moveDistance;
            const moveY = playerEntity.position.y + (dy / targetDistance) * moveDistance;

            // Queue move action first
            const moveSuccess = combatSystem.queueMoveAction(playerEntity.id, {
              x: moveX,
              y: moveY,
            });

            if (moveSuccess) {
              console.log(`Queued movement to get in range of ${target.name}`);

              // Schedule the attack to be queued after move completes
              setTimeout(() => {
                const attackSuccess = combatSystem.queueAction(
                  playerEntity.id,
                  activeActionMode.actionId,
                  target.id,
                );
                if (attackSuccess) {
                  console.log(`Queued attack on ${target.name} after movement`);
                }
              }, 900); // Slightly before move action completes (800ms execution time)

              setActiveActionMode(null); // Clear active action mode
            } else {
              console.log(`Failed to queue movement - check cooldown or existing action`);
            }
          }
        } else {
          console.log("Invalid target for attack - must be a hostile entity");
        }
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
    if (!selectedEntity || selectedEntity.type !== "player") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = ((event.clientX - rect.left) / rect.width) * 100;
    const clickY = ((event.clientY - rect.top) / rect.height) * 100;

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      entityId: "grid",
      entity: {
        id: "grid",
        name: "Empty Space",
        type: "neutral",
        hp: 1,
        maxHp: 1,
        attack: 0,
        defense: 0,
        speed: 0,
        position: { x: clickX, y: clickY },
      } as CombatEntity,
      actions: [],
      clickPosition: { x: clickX, y: clickY },
    });
  };

  const handleEntityRightClick = (
    entityId: string,
    event: React.MouseEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const entity = combatState.entities.find((e) => e.id === entityId);
    if (!entity) return;

    const selectedEntity = combatSystem.getSelectedEntity();
    let availableActions: CombatAction[] = [];

    if (selectedEntity && entity.type === "hostile") {
      availableActions = combatSystem.getAvailableActions(selectedEntity.id);
    }

    // Calculate click position relative to the grid
    const gridElement = event.currentTarget.closest(".relative");
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

  const handleLootClick = (
    lootIndex: number,
    lootItem: any,
    event: React.MouseEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu(null);

    if (event.button === 2) {
      // Right click
      // Show loot context menu
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        entityId: `loot-${lootIndex}`,
        entity: {
          id: `loot-${lootIndex}`,
          name: lootItem.name,
          type: "neutral",
          hp: 1,
          maxHp: 1,
          attack: 0,
          defense: 0,
          speed: 0,
          position: { x: lootItem.x, y: lootItem.y },
        } as CombatEntity,
        actions: [],
      });
    } else if (event.button === 0) {
      // Left click
      console.log(`Examining ${lootItem.name}`);
      // TODO: Implement loot examination/pickup
    }
  };

  const handleActionClick = (action: CombatAction, targetId: string) => {
    const selectedEntity = combatSystem.getSelectedEntity();
    if (selectedEntity) {
      const success = combatSystem.queueAction(
        selectedEntity.id,
        action.id,
        targetId,
      );
      if (success) {
        console.log(
          `${selectedEntity.name} queued ${action.name} on ${targetId}`,
        );
      } else {
        console.log(
          `Failed to queue ${action.name} - check cooldown, range, or existing action`,
        );
      }
    }
    setContextMenu(null);
  };

  const handleMoveToPosition = (targetPosition?: { x: number; y: number }) => {
    if (!targetPosition) return;

    const selectedEntity = combatSystem.getSelectedEntity();
    if (selectedEntity) {
      const success = combatSystem.queueMoveAction(
        selectedEntity.id,
        targetPosition,
      );
      if (success) {
        console.log(
          `${selectedEntity.name} moving to ${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)}`,
        );
      } else {
        console.log(
          `Failed to queue move action - check cooldown or existing action`,
        );
      }
    }
    setContextMenu(null);
  };

  const handleGridClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only handle left clicks
    if (event.button !== 0) return;

    // Check if we actually clicked on the grid background, not on an entity
    const target = event.target as HTMLElement;
    const clickedOnGrid =
      target === event.currentTarget || target.closest(".grid-background");

    if (!clickedOnGrid) {
      // Clicked on an entity or other element, let their handlers deal with it
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    console.log(
      `Grid clicked at: ${x.toFixed(1)}, ${y.toFixed(1)}, activeActionMode:`,
      activeActionMode,
    );

    // Check if clicked on an entity
    const clickedEntity = combatState.entities.find((entity) => {
      const dx = Math.abs(entity.position.x - x);
      const dy = Math.abs(entity.position.y - y);
      return dx < 3 && dy < 3; // 3% tolerance for clicking on entities
    });

    if (clickedEntity) {
      // Clicking on an entity - select it
      combatSystem.selectEntity(clickedEntity.id);
      return;
    }

    // Clicking on empty space - only allow move actions for player
    const selectedEntity = combatSystem.getSelectedEntity();
    const playerEntity = combatState.entities.find((e) => e.id === "player");

    if (selectedEntity?.type !== "player" && playerEntity) {
      combatSystem.selectEntity("player");
    }

    const activePlayer =
      selectedEntity?.type === "player" ? selectedEntity : playerEntity;

    if (!activePlayer) {
      console.log("No player entity found");
      return;
    }

    // If no action mode is active, automatically activate move mode
    if (!activeActionMode) {
      setActiveActionMode({
        type: "move",
        actionId: "move",
        actionName: "Move",
      });
      console.log("Auto-activated move mode");
    }

    // Handle different action modes
    if (activeActionMode?.type === "move" || !activeActionMode) {
      // Move action
      const success = combatSystem.queueMoveAction(activePlayer.id, { x, y });
      console.log("Move action queued:", success);

      if (success) {
        console.log(
          `${activePlayer.name} moving to ${x.toFixed(1)}, ${y.toFixed(1)}`,
        );
        // Keep move mode active for subsequent clicks
      } else {
        console.log(
          `Failed to queue move action - check cooldown or existing action`,
        );
      }
    } else if (activeActionMode?.type === "attack") {
      // Attack mode - check if clicking on an entity or empty space
      const clickedEntity = combatState.entities.find((entity) => {
        const dx = Math.abs(entity.position.x - x);
        const dy = Math.abs(entity.position.y - y);
        return dx < 3 && dy < 3 && entity.type === "hostile";
      });

      if (clickedEntity) {
        // Clicked on a hostile entity - attack it
        const attackAction = combatSystem.actionDefinitions?.get(
          activeActionMode.actionId,
        ) || {
          id: activeActionMode.actionId,
          name: activeActionMode.actionName,
          type: "attack",
          cooldown: 2000,
          damage: 20,
          range: 15,
          targetType: "single",
          executionTime: 1000,
        };

        // Check if target is in range
        const distance = combatSystem.calculateDistance(
          activePlayer.position,
          clickedEntity.position,
        );
        if (distance <= (attackAction.range || 15)) {
          // Target is in range, attack directly
          const success = combatSystem.queueAction(
            activePlayer.id,
            activeActionMode.actionId,
            clickedEntity.id,
          );
          if (success) {
            console.log(`Attacking ${clickedEntity.name}`);
            setActiveActionMode(null); // Clear attack mode after successful attack
          } else {
            console.log(
              `Failed to attack ${clickedEntity.name} - check cooldown or existing action`,
            );
          }
        } else {
          // Target is out of range, queue move then attack
          console.log(
            `Target out of range, moving closer to ${clickedEntity.name}`,
          );

          // Calculate position to move to (just within attack range)
          const dx = clickedEntity.position.x - activePlayer.position.x;
          const dy = clickedEntity.position.y - activePlayer.position.y;
          const targetDistance = Math.sqrt(dx * dx + dy * dy);
          const moveDistance = Math.max(
            0,
            targetDistance - (attackAction.range || 15) + 2,
          ); // Leave small buffer

          const moveX =
            activePlayer.position.x + (dx / targetDistance) * moveDistance;
          const moveY =
            activePlayer.position.y + (dy / targetDistance) * moveDistance;

          // Queue move action first
          const moveSuccess = combatSystem.queueMoveAction(activePlayer.id, {
            x: moveX,
            y: moveY,
          });
          if (moveSuccess) {
            // Schedule the attack to be queued after move completes
            setTimeout(() => {
              const attackSuccess = combatSystem.queueAction(
                activePlayer.id,
                activeActionMode.actionId,
                clickedEntity.id,
              );
              if (attackSuccess) {
                console.log(
                  `Queued attack on ${clickedEntity.name} after movement`,
                );
              }
            }, 900); // Slightly before move action completes (800ms execution time)

            setActiveActionMode(null); // Clear attack mode after queuing actions
          }
        }
      } else {
        console.log("Attack mode active - click on an enemy to attack");
      }
    } else if (activeActionMode?.type === "ability") {
      // Ability mode - handle based on specific ability
      console.log(`Ability mode active: ${activeActionMode.actionName}`);
      // TODO: Handle different abilities
    }
  };

  const handleBackgroundClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      combatSystem.selectEntity(null);
      setContextMenu(null);
    }
  };

    // Render entities
  const renderEntity = (entity: any) => {
    console.log('Rendering entity:', entity.type, entity.name, entity.position);

    const GRID_SIZE = 15;
    const cellX = Math.floor((entity.position.x / 100) * GRID_SIZE);
    const cellY = Math.floor((entity.position.y / 100) * GRID_SIZE);
    const key = `${cellX}-${cellY}`;

    if (entity.type === "loot") {
      return (
        <div
          key={`loot-${entity.data.id}`}
          className="absolute w-3 h-3 bg-yellow-400 rounded-full border border-yellow-600 animate-pulse"
          style={{
            left: `${entity.position.x}%`,
            top: `${entity.position.y}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
          title={`${entity.name} (${entity.data.rarity})`}
        />
      );
    }

    if (entity.type === "npc") {
      return (
        <div
          key={`npc-${entity.data.id || entity.name}`}
          className="absolute w-4 h-4 bg-blue-400 rounded-full border-2 border-blue-600"
          style={{
            left: `${entity.position.x}%`,
            top: `${entity.position.y}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
          title={`${entity.name} (NPC)`}
        />
      );
    }

    if (entity.type === "mob") {
      const isHostile = entity.data.hostileType === "boss" || entity.data.hp > 0;
      const colorClass = entity.data.hostileType === "boss" 
        ? "bg-purple-600 border-purple-800" 
        : "bg-red-500 border-red-700";

      return (
        <div
          key={`mob-${entity.data.id}`}
          className={`absolute w-4 h-4 ${colorClass} rounded-full border-2`}
          style={{
            left: `${entity.position.x}%`,
            top: `${entity.position.y}%`,
            transform: "translate(-50%, -50%)",
            zIndex: 10,
          }}
          title={`${entity.name} (${entity.data.hp}/${entity.data.maxHp} HP)`}
        />
      );
    }

    return null;
  };

  if (isLoading || tacticalLoading || !roomData) {
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
            <div className="text-center">
              <span className="text-slate-400">
                {isLoading ? "Loading room data..." : 
                 tacticalLoading ? "Loading tactical data..." : 
                 !roomData ? "No room data available" : "Loading..."}
              </span>
              {tacticalError && (
                <div className="text-red-400 text-sm mt-2">
                  Error: {(tacticalError as any)?.message || "Failed to load tactical data"}
                  <br />
                  <button 
                    onClick={() => window.location.reload()} 
                    className="text-blue-400 underline text-xs mt-1"
                  >
                    Reload page
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }



  // Handle case where no data is available at all
  if (!effectiveTacticalData) {
    console.error("=== CRITICAL: No tactical or room data available ===");
    console.error("Tactical error:", tacticalError);

    return (
      <Card className="bg-game-panel border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Tactical View - Offline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-48 border-2 border-red-600 rounded-lg flex items-center justify-center relative">
            <div className="text-center">
              <span className="text-red-400 text-sm">
                Unable to load tactical data
              </span>
              <br />
              <span className="text-xs text-gray-400 mt-1">
                Room data could not be retrieved
              </span>
              <br />
              <button 
                onClick={() => window.location.reload()} 
                className="text-blue-400 underline text-xs mt-2"
              >
                Reload page
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { room, availableDirections, playersInRoom } = effectiveTacticalData;
  // Process tactical entities for rendering
  const tacticalEntities = effectiveTacticalData.tacticalEntities || [];
  console.log('🎯 Processing tactical entities for rendering:', {
    total: tacticalEntities.length,
    types: tacticalEntities.map(e => `${e.type}: ${e.name}`)
  });

  const persistentTacticalData = {
    background: getRoomBackgroundType(room.environment, room.type),
    loot: tacticalEntities.filter(e => e.type === 'loot'),
    mobs: tacticalEntities.filter(e => e.type === 'mob'),
    npcs: tacticalEntities.filter(e => e.type === 'npc'),
    exits: {
      north: availableDirections.includes("north"),
      south: availableDirections.includes("south"),
      east: availableDirections.includes("east"),
      west: availableDirections.includes("west"),
    },
    otherPlayers: playersInRoom.filter((p) => p.id !== crawler.id),
  };

  const GRID_SIZE = 15;





  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Tactical View
          {!tacticalData && effectiveTacticalData && (
            <span className="text-xs text-amber-400 ml-2">(Limited Data)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`relative w-full aspect-square border-2 ${combatState.isInCombat ? "border-red-400" : activeActionMode?.actionId === "move" ? "border-green-400" : "border-game-border"} rounded-lg cursor-pointer hover:border-blue-400 transition-colors`}
          onClick={handleGridClick}
          onContextMenu={handleGridRightClick}
          title="Click to move your character"
        >
          {/* Room Background */}
          <div
            className={`absolute inset-0 grid-background ${getRoomBackground(persistentTacticalData.background)} rounded-lg overflow-hidden`}
          >
            {/* Grid overlay for tactical feel */}
            <div className="absolute inset-0 opacity-20 grid-background">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 15 15"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <defs>
                  <pattern
                    id="grid"
                    width="1"
                    height="1"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 1 0 L 0 0 0 1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.02"
                    />
                  </pattern>
                </defs>
                <rect
                  width="15"
                  height="15"
                  fill="url(#grid)"
                  className="grid-background"
                />
              </svg>
            </div>
          </div>

          {/* Exit indicators */}
          {persistentTacticalData.exits.north && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-green-400 rounded-b"></div>
          )}
          {persistentTacticalData.exits.south && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-green-400 rounded-t"></div>
          )}
          {persistentTacticalData.exits.east && (
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-green-400 rounded-l"></div>
          )}
          {persistentTacticalData.exits.west && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-green-400 rounded-r"></div>
          )}

          {/* Tactical Mobs from Server */}
          {persistentTacticalData.mobs.map((mob, index) => (
            <div
              key={`tactical-mob-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 transition-all duration-200"
              style={{
                left: `${mob.position.x}%`,
                top: `${mob.position.y}%`,
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`Clicked on tactical mob: ${mob.name}`);
              }}
              title={`${mob.name} (Tactical Entity) - HP: ${mob.data?.hp || 'Unknown'}`}
            >
              <div className="w-6 h-6 bg-red-600 border-2 border-red-400 shadow-red-400/30 rounded-full flex items-center justify-center shadow-lg">
                <Skull className="w-3 h-3 text-white" />
              </div>
              
              {/* HP bar for tactical mobs */}
              {mob.data?.hp !== undefined && mob.data?.maxHp !== undefined && mob.data.hp < mob.data.maxHp && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-700 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-300 bg-red-400"
                    style={{ width: `${(mob.data.hp / mob.data.maxHp) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          ))}

          {/* Tactical NPCs from Server */}
          {persistentTacticalData.npcs.map((npc, index) => (
            <div
              key={`tactical-npc-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 transition-all duration-200"
              style={{
                left: `${npc.position.x}%`,
                top: `${npc.position.y}%`,
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`Clicked on tactical NPC: ${npc.name}`);
              }}
              title={`${npc.name} (NPC)`}
            >
              <div className="w-6 h-6 bg-cyan-500 border-2 border-cyan-300 shadow-cyan-400/30 rounded-full flex items-center justify-center shadow-lg">
                <Users className="w-3 h-3 text-white" />
              </div>
            </div>
          ))}

          {/* Combat Entities */}
          {combatState.entities.map((entity) => (
            <div
              key={entity.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 ${
                entity.isSelected ? "ring-2 ring-yellow-400 ring-offset-1" : ""
              } ${hoveredEntity === entity.id ? "scale-110 z-30" : ""} transition-all duration-200`}
              style={{
                left: `${entity.position.x}%`,
                top: `${entity.position.y}%`,
              }}
              onClick={(e) => handleEntityClick(entity.id, e)}
              onContextMenu={(e) => handleEntityRightClick(entity.id, e)}
              onMouseEnter={() => setHoveredEntity(entity.id)}
              onMouseLeave={() => setHoveredEntity(null)}
              title={`${entity.name} (${entity.hp}/${entity.maxHp} HP) - Right-click for actions`}
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg relative ${
                  entity.type === "player"
                    ? "bg-blue-500 border-blue-300 animate-pulse shadow-blue-400/50"
                    : entity.type === "hostile"
                      ? "bg-red-600 border-red-400 shadow-red-400/30"
                      : entity.type === "neutral"
                        ? "bg-orange-500 border-orange-300 shadow-orange-400/30"
                        : "bg-cyan-500 border-cyan-300 shadow-cyan-400/30"
                } ${hoveredEntity === entity.id ? "shadow-xl" : ""}`}
              >
                {entity.type === "player" && (
                  <div className="absolute inset-1 bg-blue-300 rounded-full"></div>
                )}
                {entity.type === "hostile" && (
                  <Skull className="w-3 h-3 text-white" />
                )}
                {(entity.type === "neutral" || entity.type === "npc") && (
                  <Users className="w-3 h-3 text-white" />
                )}

                {/* Facing direction indicator */}
                {entity.facing && (
                  <div 
                    className={`absolute w-2 h-2 bg-yellow-400 rounded-sm transform ${
                      entity.facing === 'north' ? '-translate-y-4' : 
                      entity.facing === 'south' ? 'translate-y-4' :
                      entity.facing === 'east' ? 'translate-x-4' : 
                      '-translate-x-4'
                    }`}
                    style={{
                      clipPath: entity.facing === 'north' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' :
                               entity.facing === 'south' ? 'polygon(50% 100%, 0% 0%, 100% 0%)' :
                               entity.facing === 'east' ? 'polygon(100% 50%, 0% 0%, 0% 100%)' :
                               'polygon(0% 50%, 100% 0%, 100% 100%)'
                    }}
                  />
                )}
              </div>

              {/* HP bar for non-player entities (only show if damaged) */}
              {entity.type !== "player" &&
                entity.hp !== undefined &&
                entity.maxHp !== undefined &&
                entity.hp < entity.maxHp && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-700 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all duration-300 ${entity.type === "hostile" ? "bg-red-400" : "bg-green-400"}`}
                      style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
                    ></div>
                  </div>
                )}

              {/* Selection indicator - always show when selected */}
              {entity.isSelected && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
              )}

              {/* Hover name display - positioned relative to viewport */}
              {hoveredEntity === entity.id && (
                <div className="fixed bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50 shadow-lg border border-gray-600"
                     style={{
                       left: `${Math.min(window.innerWidth - 200, Math.max(10, (entity.position.x / 100) * 400 + 200))}px`,
                       top: `${Math.max(10, (entity.position.y / 100) * 400 + 100)}px`
                     }}>
                  {entity.name}
                  {entity.type !== "player" &&
                    ` (${entity.hp}/${entity.maxHp})`}
                </div>
              )}

              {/* Action queue indicator */}
              {combatState.actionQueue.some(
                (qa) => qa.entityId === entity.id,
              ) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-spin">
                  <div className="w-full h-full bg-purple-300 rounded-full animate-ping"></div>
                </div>
              )}
            </div>
          ))}

          {/* Tactical Loot from Server */}
          {persistentTacticalData.loot.map((item, index) => (
            <div
              key={`loot-${index}`}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer ${
                hoveredLoot === index ? "scale-110 z-20" : ""
              } transition-all duration-200`}
              style={{ left: `${item.position.x}%`, top: `${item.position.y}%` }}
              title={`${item.name} - Right-click to interact`}
              onClick={(e) => handleLootClick(index, item, e)}
              onContextMenu={(e) => handleLootClick(index, item, e)}
              onMouseEnter={() => setHoveredLoot(index)}
              onMouseLeave={() => setHoveredLoot(null)}
            >
              <div
                className={`w-6 h-6 bg-yellow-500 rounded border-2 border-yellow-300 flex items-center justify-center shadow-lg ${
                  hoveredLoot === index
                    ? "animate-pulse shadow-yellow-400/50"
                    : "animate-bounce"
                }`}
              >
                {getLootIcon(item.data?.type || 'treasure')}
              </div>

              {/* Hover name display - positioned relative to viewport */}
              {hoveredLoot === index && (
                <div className="fixed bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50 shadow-lg border border-gray-600"
                     style={{
                       left: `${Math.min(window.innerWidth - 200, Math.max(10, (item.x / 100) * 400 + 200))}px`,
                       top: `${Math.max(10, (item.y / 100) * 400 + 100)}px`
                     }}>
                  {item.name}
                </div>
              )}
            </div>
          ))}

          {/* Other Players */}
          {persistentTacticalData.otherPlayers.map((player, index) => {
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
                  top: `${pos.y}%`,
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
          {hotbarActions.map((action, index) => {
            const cooldownPercentage = getCooldownPercentage(action.id);
            const isOnCooldown = cooldownPercentage > 0;

            return (
              <button
                key={action.id}
                className={`relative w-8 h-8 rounded-full ${activeActionMode?.actionId === action.id ? "bg-yellow-500" : isOnCooldown ? "bg-gray-900 cursor-not-allowed" : "bg-gray-800 hover:bg-gray-700"} text-white flex items-center justify-center transition-all duration-150`}
                onClick={() => {
                  if (!isOnCooldown) {
                    handleHotbarClick(action.id, action.type, action.name);
                  }
                }}
                disabled={isOnCooldown}
                title={`${index + 1}: ${action.name}${isOnCooldown ? " (on cooldown)" : ""}`}
              >
                {/* Cooldown overlay */}
                {isOnCooldown && (
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <svg
                      className="w-full h-full transform -rotate-90"
                      viewBox="0 0 32 32"
                    >
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        fill="none"
                        stroke="rgba(239, 68, 68, 0.8)"
                        strokeWidth="2"
                        strokeDasharray={`${(cooldownPercentage / 100) * 87.96} 87.96`}
                        className="transition-all duration-100"
                      />
                    </svg>
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`${isOnCooldown ? "opacity-50" : ""} transition-opacity duration-150`}
                >
                  {action.icon}
                </div>

                {/* Number indicator */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-600 text-xs rounded-full flex items-center justify-center text-slate-200">
                  {index === 9 ? "0" : (index + 1).toString()}
                </div>
              </button>
            );
          })}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div
            ref={contextMenuRef}
            className="fixed bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 py-2 min-w-48 max-w-64"
            style={{
              left: `${Math.min(contextMenu.x, window.innerWidth - 250)}px`,
              top: `${Math.min(contextMenu.y, window.innerHeight - 300)}px`,
            }}
          >
            {/* Entity Info Header */}
            <div className="px-3 py-2 border-b border-gray-700">
              <div className="flex items-center gap-2">
                {contextMenu.entity.type === "hostile" && (
                  <Skull className="w-4 h-4 text-red-400" />
                )}
                {(contextMenu.entity.type === "neutral" ||
                  contextMenu.entity.type === "npc") && (
                  <Users className="w-4 h-4 text-orange-400" />
                )}
                {contextMenu.entityId.startsWith("loot-") && (
                  <Package className="w-4 h-4 text-yellow-400" />
                )}
                <div>
                  <div className="text-white font-medium">
                    {contextMenu.entity.name}
                  </div>
                  {!contextMenu.entityId.startsWith("loot-") && (
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

              {contextMenu.entity.type === "npc" && (
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

              {contextMenu.entityId.startsWith("loot-") && (
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
            {contextMenu.clickPosition &&
              combatSystem.getSelectedEntity()?.type === "player" && (
                <div className="px-3 py-2 border-b border-gray-700">
                  <div className="text-xs text-gray-500 mb-2">Movement</div>
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
                    onClick={() =>
                      handleMoveToPosition(contextMenu.clickPosition)
                    }
                  >
                    <Footprints className="w-4 h-4 text-green-400" />
                    <div>
                      <div>Move Here</div>
                      <div className="text-xs text-gray-500">
                        Position: {contextMenu.clickPosition.x.toFixed(0)},{" "}
                        {contextMenu.clickPosition.y.toFixed(0)}
                      </div>
                    </div>
                  </button>
                </div>
              )}

            {/* Grid-specific actions */}
            {contextMenu.entityId === "grid" &&
              combatSystem.getSelectedEntity()?.type === "player" && (
                <div className="px-3 py-2">
                  <div className="text-xs text-gray-500 mb-2">Grid Actions</div>
                  <button
                    className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
                    onClick={() => {
                      const selectedEntity = combatSystem.getSelectedEntity();
                      if (selectedEntity && contextMenu.clickPosition) {
                        const success = combatSystem.queueMoveAction(
                          selectedEntity.id,
                          contextMenu.clickPosition,
                        );
                        if (success) {
                          console.log(
                            `${selectedEntity.name} moving to ${contextMenu.clickPosition.x.toFixed(1)}, ${contextMenu.clickPosition.y.toFixed(1)}`,
                          );
                        } else {
                          console.log(
                            `Failed to queue move action - check cooldown or existing action`,
                          );
                        }
                      }
                      setContextMenu(null);
                    }}
                  >
                    <Footprints className="w-4 h-4 text-green-400" />
                    <div>
                      <div>Move to Position</div>
                      <div className="text-xs text-gray-500">
                        Grid: {contextMenu.clickPosition?.x.toFixed(0)},{" "}
                        {contextMenu.clickPosition?.y.toFixed(0)}
                      </div>
                    </div>
                  </button>
                </div>
              )}

            {/* Combat Actions */}
            {contextMenu.actions.length > 0 &&
              contextMenu.entity.type === "hostile" && (
                <div className="px-3 py-2">
                  <div className="text-xs text-gray-500 mb-2">
                    Combat Actions
                  </div>
                  {contextMenu.actions.map((action) => (
                    <button
                      key={action.id}
                      className="flex items-center gap-2 w-full px-2 py-1 text-sm text-gray-300 hover:bg-gray-800 rounded"
                      onClick={() =>
                        handleActionClick(action, contextMenu.entityId)
                      }
                    >
                      {action.type === "attack" && (
                        <Sword className="w-4 h-4 text-red-400" />
                      )}
                      {action.type === "ability" && (
                        <Target className="w-4 h-4 text-blue-400" />
                      )}
                      <div>
                        <div>{action.name}</div>
                        <div className="text-xs text-gray-500">
                          {action.type === "attack" && `Damage: ${action.damage || "N/A"}`}
                          {action.type === "ability" && `Cooldown: ${action.cooldown || 0}ms`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Action Queue Panel */}
        <ActionQueuePanel />

        {/* Status Messages */}
        {activeActionMode && (
          <div className="mt-2 p-2 bg-blue-900/30 border border-blue-500 rounded text-center">
            <span className="text-blue-300 text-sm">
              {activeActionMode.actionName} mode active - {
                activeActionMode.type === "move" ? "Click to move" :
                activeActionMode.type === "attack" ? "Click enemy to attack" :
                "Click to use ability"
              }
            </span>
          </div>
        )}

        {/* Compass Navigation - Hidden but functionality preserved */}
        {/* WASD compass is hidden but movement still works via keyboard */}
      </CardContent>
    </Card>
  );
}