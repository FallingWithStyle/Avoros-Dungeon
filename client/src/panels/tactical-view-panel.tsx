
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Gem, Skull, Users, Sword, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CrawlerWithDetails } from "@shared/schema";

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

export default function TacticalViewPanel({ crawler }: TacticalViewPanelProps) {
  // Fetch current room data
  const { data: roomData, isLoading } = useQuery({
    queryKey: ["currentRoom", crawler.id],
    queryFn: () => apiRequest(`/api/crawlers/${crawler.id}/current-room`),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

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

  // Generate tactical data based on room properties
  const tacticalData = {
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
        <div className="relative w-full h-48 border-2 border-game-border rounded-lg overflow-hidden">
          {/* Room Background */}
          <div className={`absolute inset-0 ${getRoomBackground(tacticalData.background)}`}>
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

          {/* Player position (center) */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full border-2 border-blue-300 animate-pulse shadow-lg shadow-blue-400/50 z-20">
            <div className="absolute inset-1 bg-blue-300 rounded-full"></div>
          </div>

          {/* Loot items */}
          {tacticalData.loot.map((item, index) => (
            <div
              key={`loot-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
              title={item.name}
            >
              <div className="w-6 h-6 bg-yellow-500 rounded border-2 border-yellow-300 flex items-center justify-center animate-bounce">
                {getLootIcon(item.type)}
              </div>
            </div>
          ))}

          {/* Mobs and NPCs */}
          {tacticalData.mobs.map((mob, index) => (
            <div
              key={`mob-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-15"
              style={{ left: `${mob.x}%`, top: `${mob.y}%` }}
              title={`${mob.name} (${mob.hp}% HP)`}
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                mob.type === "hostile" 
                  ? "bg-red-600 border-red-400 animate-pulse" 
                  : "bg-orange-500 border-orange-300"
              }`}>
                {getMobIcon(mob.type)}
              </div>
              {/* HP bar for mobs */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-700 rounded">
                <div 
                  className={`h-full rounded ${mob.type === "hostile" ? "bg-red-400" : "bg-green-400"}`}
                  style={{ width: `${mob.hp}%` }}
                ></div>
              </div>
            </div>
          ))}

          {/* NPCs */}
          {tacticalData.npcs.map((npc, index) => (
            <div
              key={`npc-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-15"
              style={{ left: `${npc.x}%`, top: `${npc.y}%` }}
              title={npc.name}
            >
              <div className="w-6 h-6 bg-cyan-500 rounded-full border-2 border-cyan-300 flex items-center justify-center">
                <Users className="w-3 h-3 text-white" />
              </div>
              {npc.dialogue && (
                <div className="absolute -top-2 -right-2 w-3 h-3 bg-white rounded-full border border-cyan-300 flex items-center justify-center">
                  <div className="w-1 h-1 bg-cyan-500 rounded-full"></div>
                </div>
              )}
            </div>
          ))}

          {/* Other Players */}
          {tacticalData.otherPlayers.map((player, index) => (
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
              {tacticalData.mobs.filter(m => m.type === "hostile").length} enemies
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" />
              {tacticalData.npcs.length + tacticalData.mobs.filter(m => m.type === "neutral").length + tacticalData.otherPlayers.length} friendlies
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
