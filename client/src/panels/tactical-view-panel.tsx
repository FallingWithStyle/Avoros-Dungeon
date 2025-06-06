
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Gem, Skull, Users, Sword, Shield } from "lucide-react";
import type { CrawlerWithDetails } from "@shared/schema";

interface TacticalViewPanelProps {
  crawler: CrawlerWithDetails;
}

export default function TacticalViewPanel({ crawler }: TacticalViewPanelProps) {
  // Mock data for demonstration - this would come from the current room's data
  const roomData = {
    background: "stone_chamber", // Could be: stone_chamber, forest_clearing, dungeon_corridor, etc.
    loot: [
      { type: "treasure", name: "Golden Coin", x: 75, y: 60 },
      { type: "weapon", name: "Iron Sword", x: 25, y: 80 }
    ],
    mobs: [
      { type: "hostile", name: "Goblin Warrior", x: 80, y: 30, hp: 75 },
      { type: "neutral", name: "Merchant", x: 40, y: 20, hp: 100 }
    ],
    npcs: [
      { name: "Village Elder", x: 60, y: 40, dialogue: true }
    ],
    exits: {
      north: true,
      south: false,
      east: true,
      west: false
    }
  };

  const getRoomBackground = (bgType: string) => {
    switch (bgType) {
      case "stone_chamber":
        return "bg-gradient-to-br from-stone-600 to-stone-800";
      case "forest_clearing":
        return "bg-gradient-to-br from-green-600 to-green-800";
      case "dungeon_corridor":
        return "bg-gradient-to-br from-gray-700 to-gray-900";
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
          <div className={`absolute inset-0 ${getRoomBackground(roomData.background)}`}>
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
          {roomData.exits.north && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-green-400 rounded-b"></div>
          )}
          {roomData.exits.south && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-green-400 rounded-t"></div>
          )}
          {roomData.exits.east && (
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-green-400 rounded-l"></div>
          )}
          {roomData.exits.west && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-green-400 rounded-r"></div>
          )}

          {/* Player position (center) */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full border-2 border-blue-300 animate-pulse shadow-lg shadow-blue-400/50 z-20">
            <div className="absolute inset-1 bg-blue-300 rounded-full"></div>
          </div>

          {/* Loot items */}
          {roomData.loot.map((item, index) => (
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
          {roomData.mobs.map((mob, index) => (
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
          {roomData.npcs.map((npc, index) => (
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
        </div>

        {/* Room info */}
        <div className="mt-3 text-xs text-slate-400">
          <p className="font-medium text-slate-300">Current Room: Collapsed Watchtower</p>
          <p>Environment: Indoor • Type: Normal</p>
          <div className="flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1">
              <Gem className="w-3 h-3 text-yellow-400" />
              {roomData.loot.length} items
            </span>
            <span className="flex items-center gap-1">
              <Skull className="w-3 h-3 text-red-500" />
              {roomData.mobs.filter(m => m.type === "hostile").length} enemies
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-cyan-400" />
              {roomData.npcs.length + roomData.mobs.filter(m => m.type === "neutral").length} friendlies
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
