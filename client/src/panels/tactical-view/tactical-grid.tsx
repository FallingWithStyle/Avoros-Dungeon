/**
 * File: tactical-grid.tsx
 * Responsibility: Renders the tactical combat grid with entities and room connections
 * Notes: Displays tactical entities, handles room gates, and manages tactical positioning
 */
import React, { useCallback, useEffect, useMemo } from "react";
import { useTacticalPositioning } from "@/hooks/useTacticalPositioning";
import { useKeyboardMovement } from "@/hooks/useKeyboardMovement";
import { combatSystem } from "../../../shared/combat-system";

interface TacticalGridProps {
  tacticalData: any;
  activeActionMode: {
    type: "move" | "attack" | "ability";
    actionId: string;
    actionName: string;
  } | null;
  onActionModeCancel: () => void;
  onRoomMovement: (direction: string) => void;
}

function TacticalGrid({
  tacticalData,
  activeActionMode,
  onActionModeCancel,
  onRoomMovement,
}: TacticalGridProps) {
  // Early return if no tactical data
  if (!tacticalData) {
    return (
      <div className="tactical-grid-container relative bg-slate-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-center h-64 text-slate-400">
          Loading tactical view...
        </div>
      </div>
    );
  }

  // Safely extract data with fallbacks
  const room = tacticalData.room || {};
  const availableDirections = tacticalData.availableDirections || [];
  const tacticalEntities = tacticalData.tacticalEntities || [];

  // Get combat state
  const combatState = combatSystem.getState();

  // Check if we're in combat
  const isInCombat = combatState.isInCombat;

  // Setup tactical positioning
  const { handleMovement } = useTacticalPositioning({
    effectiveTacticalData: tacticalData,
    combatState,
    onRoomMovement,
  });

  // Setup keyboard movement - only enable when not in combat
  useKeyboardMovement({
    onMovement: handleMovement,
    isEnabled: !isInCombat,
  });

  // Handle grid click
  const handleGridClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (activeActionMode) {
        console.log("Grid clicked with action mode:", activeActionMode);
        onActionModeCancel();
      }
    },
    [activeActionMode, onActionModeCancel]
  );

  // Handle right click
  const handleGridRightClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (activeActionMode) {
        onActionModeCancel();
      }
    },
    [activeActionMode, onActionModeCancel]
  );

  // Render tactical entities
  const renderTacticalEntities = () => {
    return tacticalEntities.map((entity: any, index: number) => {
      const positionStyle = {
        left: entity.position?.x + "%" || "50%",
        top: entity.position?.y + "%" || "50%",
      };

      let entityColor = "bg-blue-500";
      let entityIcon = "👤";

      switch (entity.type) {
        case "player":
          entityColor = "bg-green-500";
          entityIcon = "🏃";
          break;
        case "mob":
          entityColor = "bg-red-500";
          entityIcon = "👹";
          break;
        case "npc":
          entityColor = "bg-yellow-500";
          entityIcon = "🧙";
          break;
        case "loot":
          entityColor = "bg-purple-500";
          entityIcon = "💎";
          break;
      }

      return (
        <div
          key={entity.id || index}
          className={`absolute w-4 h-4 rounded-full ${entityColor} flex items-center justify-center text-xs transform -translate-x-1/2 -translate-y-1/2 z-10`}
          style={positionStyle}
          title={entity.data?.name || entity.type}
        >
          <span className="text-white text-xs">{entityIcon}</span>
        </div>
      );
    });
  };

  // Render room gates
  const renderRoomGates = () => {
    const gates = [];
    const gateStart = 40; // Gate starts at 40%
    const gateEnd = 60;   // Gate ends at 60%

    availableDirections.forEach((direction: string) => {
      let gateStyle = {};
      let gateClass = "absolute bg-green-400 opacity-50";

      switch (direction) {
        case "north":
          gateStyle = {
            top: "0%",
            left: gateStart + "%",
            width: (gateEnd - gateStart) + "%",
            height: "4px",
          };
          break;
        case "south":
          gateStyle = {
            bottom: "0%",
            left: gateStart + "%",
            width: (gateEnd - gateStart) + "%",
            height: "4px",
          };
          break;
        case "east":
          gateStyle = {
            right: "0%",
            top: gateStart + "%",
            width: "4px",
            height: (gateEnd - gateStart) + "%",
          };
          break;
        case "west":
          gateStyle = {
            left: "0%",
            top: gateStart + "%",
            width: "4px",
            height: (gateEnd - gateStart) + "%",
          };
          break;
      }

      gates.push(
        <div
          key={direction}
          className={gateClass}
          style={gateStyle}
          title={"Exit: " + direction}
        />
      );
    });

    return gates;
  };

  return (
    <div className="tactical-grid-container relative bg-slate-800 rounded-lg overflow-hidden">
      {/* Grid Background */}
      <div
        className="tactical-grid relative w-full h-64 bg-slate-700 cursor-crosshair"
        onClick={handleGridClick}
        onContextMenu={handleGridRightClick}
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      >
        {/* Room Boundaries */}
        <div className="absolute inset-2 border-2 border-slate-500 rounded"></div>

        {/* Room Gates */}
        {renderRoomGates()}

        {/* Tactical Entities */}
        {renderTacticalEntities()}

        {/* Action Mode Overlay */}
        {activeActionMode && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
            <div className="bg-black bg-opacity-75 px-4 py-2 rounded text-white">
              {activeActionMode.actionName} Mode - Click to use, Right-click to cancel
            </div>
          </div>
        )}

        {/* Combat Mode Indicator */}
        {isInCombat && (
          <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs">
            COMBAT
          </div>
        )}
      </div>

      {/* Room Info */}
      <div className="p-3 bg-slate-900 text-sm">
        <div className="flex justify-between text-slate-400">
          <span>Room: {room.name || "Unknown"}</span>
          <span>Entities: {tacticalEntities.length}</span>
        </div>
        {availableDirections.length > 0 && (
          <div className="text-slate-500 text-xs mt-1">
            Exits: {availableDirections.join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

export default TacticalGrid;