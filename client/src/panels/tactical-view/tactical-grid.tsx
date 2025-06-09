import React from 'react';
import { CombatEntity } from '@shared/combat-system';

interface TacticalGridProps {
  roomBackground: string;
  exits: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  entities: CombatEntity[];
  lootItems: any[];
  otherPlayers: any[];
  hoveredEntity: string | null;
  hoveredLoot: number | null;
  onGridClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onGridRightClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEntityClick: (entityId: string, event: React.MouseEvent) => void;
  onEntityRightClick: (entityId: string, event: React.MouseEvent) => void;
  onLootClick: (lootIndex: number, lootItem: any, event: React.MouseEvent) => void;
  onEntityHover: (entityId: string | null) => void;
  onLootHover: (lootIndex: number | null) => void;
  isInCombat: boolean;
  activeActionMode: any;
}

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

// Helper function to convert grid coordinates to percentage
const gridToPercentage = (gridX: number, gridY: number): { x: number; y: number } => {
  const cellWidth = 100 / 15;
  const cellHeight = 100 / 15;
  return {
    x: (gridX + 0.5) * cellWidth,
    y: (gridY + 0.5) * cellHeight,
  };
};

export default function TacticalGrid({
  roomBackground,
  exits,
  entities,
  lootItems,
  otherPlayers,
  hoveredEntity,
  hoveredLoot,
  onGridClick,
  onGridRightClick,
  onEntityClick,
  onEntityRightClick,
  onLootClick,
  onEntityHover,
  onLootHover,
  isInCombat,
  activeActionMode
}: TacticalGridProps) {
  return (
    <div
      className={`relative w-full aspect-square border-2 ${
        isInCombat 
          ? "border-red-400" 
          : activeActionMode?.actionId === "move" 
            ? "border-green-400" 
            : "border-game-border"
      } rounded-lg cursor-pointer hover:border-blue-400 transition-colors`}
      onClick={onGridClick}
      onContextMenu={onGridRightClick}
      title="Click to move your character"
    >
      {/* Room Background */}
      <div className={`absolute inset-0 grid-background ${getRoomBackground(roomBackground)} rounded-lg overflow-hidden`}>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-20 grid-background">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 15 15"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                <path d="M 1 0 L 0 0 0 1" fill="none" stroke="currentColor" strokeWidth="0.02" />
              </pattern>
            </defs>
            <rect width="15" height="15" fill="url(#grid)" className="grid-background" />
          </svg>
        </div>
      </div>

      {/* Exit indicators */}
      {exits.north && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-green-400 rounded-b"></div>
      )}
      {exits.south && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-green-400 rounded-t"></div>
      )}
      {exits.east && (
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-green-400 rounded-l"></div>
      )}
      {exits.west && (
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-2 h-8 bg-green-400 rounded-r"></div>
      )}

      {/* Combat Entities */}
      {entities.map((entity) => (
        <TacticalEntity
          key={entity.id}
          entity={entity}
          isHovered={hoveredEntity === entity.id}
          onClick={onEntityClick}
          onRightClick={onEntityRightClick}
          onHover={onEntityHover}
        />
      ))}

      {/* Loot Items */}
      {lootItems.map((item, index) => (
        <TacticalLoot
          key={`loot-${index}`}
          item={item}
          index={index}
          isHovered={hoveredLoot === index}
          onClick={onLootClick}
          onHover={onLootHover}
        />
      ))}

      {/* Other Players */}
      {otherPlayers.map((player, index) => {
        const gridX = 2 + (index % 3) * 2;
        const gridY = 12 + Math.floor(index / 3);
        const pos = gridToPercentage(gridX, gridY);

        return (
          <div
            key={`player-${index}`}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
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
  );
}

// Separate component for tactical entities
function TacticalEntity({ 
  entity, 
  isHovered, 
  onClick, 
  onRightClick, 
  onHover 
}: {
  entity: CombatEntity;
  isHovered: boolean;
  onClick: (entityId: string, event: React.MouseEvent) => void;
  onRightClick: (entityId: string, event: React.MouseEvent) => void;
  onHover: (entityId: string | null) => void;
}) {
  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 ${
        entity.isSelected ? "ring-2 ring-yellow-400 ring-offset-1" : ""
      } ${isHovered ? "scale-110 z-30" : ""} transition-all duration-200`}
      style={{ left: `${entity.position.x}%`, top: `${entity.position.y}%` }}
      onClick={(e) => onClick(entity.id, e)}
      onContextMenu={(e) => onRightClick(entity.id, e)}
      onMouseEnter={() => onHover(entity.id)}
      onMouseLeave={() => onHover(null)}
      title={`${entity.name} (${entity.hp}/${entity.maxHp} HP)`}
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
        } ${isHovered ? "shadow-xl" : ""}`}
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

      {/* HP bar for non-player entities */}
      {entity.type !== "player" &&
        entity.hp !== undefined &&
        entity.maxHp !== undefined &&
        entity.hp < entity.maxHp && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-700 rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-300 ${
                entity.type === "hostile" ? "bg-red-400" : "bg-green-400"
              }`}
              style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
            ></div>
          </div>
        )}

      {/* Selection indicator */}
      {entity.isSelected && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
      )}
    </div>
  );
}

// Separate component for loot items
function TacticalLoot({
  item,
  index,
  isHovered,
  onClick,
  onHover
}: {
  item: any;
  index: number;
  isHovered: boolean;
  onClick: (lootIndex: number, lootItem: any, event: React.MouseEvent) => void;
  onHover: (lootIndex: number | null) => void;
}) {
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

  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer ${
        isHovered ? "scale-110 z-20" : ""
      } transition-all duration-200`}
      style={{ left: `${item.x}%`, top: `${item.y}%` }}
      title={`${item.name} - Right-click to interact`}
      onClick={(e) => onClick(index, item, e)}
      onContextMenu={(e) => onClick(index, item, e)}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={`w-6 h-6 bg-yellow-500 rounded border-2 border-yellow-300 flex items-center justify-center shadow-lg ${
          isHovered ? "animate-pulse shadow-yellow-400/50" : "animate-bounce"
        }`}
      >
        {getLootIcon(item.type)}
      </div>
    </div>
  );
}

// Add any additional entities from server data
  if (tacticalData?.entities) {
    console.log('Processing tactical entities from server:', tacticalData.entities);
    tacticalData.entities.forEach((entity: any) => {
      console.log('Processing entity:', entity);
      if (entity.type === 'mob') {
        console.log('Adding mob entity:', entity.name, 'at position', entity.position);
        allEntities.push({
          id: entity.data?.id || `mob-${Math.random()}`,
          type: "hostile" as const,
          name: entity.name,
          x: entity.position.x,
          y: entity.position.y,
          hp: entity.data?.hp || 100,
          maxHp: entity.data?.maxHp || 100,
          rarity: entity.data?.rarity || 'common'
        });
      } else if (entity.type === 'loot') {
        console.log('Adding loot entity:', entity.name);
        allEntities.push({
          id: `loot-${Math.random()}`,
          type: "loot" as const,
          name: entity.name,
          x: entity.position.x,
          y: entity.position.y,
          itemType: entity.data?.itemType || "treasure",
          value: entity.data?.value || 10
        });
      } else if (entity.type === 'npc') {
        console.log('Adding NPC entity:', entity.name);
        allEntities.push({
          id: `npc-${Math.random()}`,
          type: "npc" as const,
          name: entity.name,
          x: entity.position.x,
          y: entity.position.y,
          services: entity.data?.services || [],
          personality: entity.data?.personality || "neutral"
        });
      }
    });
  }

  console.log('Total entities after processing:', allEntities.length);