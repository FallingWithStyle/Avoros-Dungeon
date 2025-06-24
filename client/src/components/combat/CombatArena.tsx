
/**
 * File: CombatArena.tsx
 * Responsibility: Renders the main combat arena grid with environment styling and grid overlay
 * Notes: Extracted from combat-view-panel.tsx to reduce component complexity
 */

import React from "react";
import { IS_DEBUG_MODE } from "@/components/debug-panel";
import CombatEntityRenderer from "./CombatEntityRenderer";
import RoomExitIndicators from "./RoomExitIndicators";

interface CombatArenaProps {
  roomEnvironment?: string;
  roomConnections: any[];
  layoutEntities: any[];
  combatState: any;
  selectedTarget: string | null;
  containerRef: React.RefObject<HTMLDivElement>;
  bind: () => any;
  onTargetSelection: (entityId: string) => void;
}

export default function CombatArena({
  roomEnvironment,
  roomConnections,
  layoutEntities,
  combatState,
  selectedTarget,
  containerRef,
  bind,
  onTargetSelection,
}: CombatArenaProps) {
  // Get environment-specific styling
  const getEnvironmentStyles = () => {
    switch (roomEnvironment) {
      case "outdoor":
        return {
          className: "bg-gradient-to-br from-green-900/20 to-blue-800/20",
          backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
        };
      case "cave":
        return {
          className: "bg-gradient-to-br from-gray-900/40 to-stone-800/40",
          backgroundImage:
            "radial-gradient(circle at 30% 70%, rgba(75, 85, 99, 0.2) 0%, transparent 60%)",
        };
      case "dungeon":
        return {
          className: "bg-gradient-to-br from-purple-900/20 to-gray-800/30",
          backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)",
        };
      default:
        return {
          className: "bg-gradient-to-br from-green-900/20 to-brown-800/20",
          backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255, 119, 48, 0.1) 0%, transparent 50%)",
        };
    }
  };

  const envStyles = getEnvironmentStyles();

  return (
    <div
      ref={containerRef}
      className={`relative border border-amber-600/20 rounded-lg overflow-hidden mx-auto ${envStyles.className}`}
      style={{
        backgroundImage: envStyles.backgroundImage,
        width: "min(90vw, 90vh, 400px)",
        height: "min(90vw, 90vh, 400px)",
        aspectRatio: "1",
        touchAction: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
      {...bind()}
    >
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 11 }).map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute h-full w-px bg-amber-400"
            style={{ left: `${i * 10}%` }}
          />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute w-full h-px bg-amber-400"
            style={{ top: `${i * 10}%` }}
          />
        ))}
      </div>

      {/* Room Layout Elements */}
      {layoutEntities.map((entity: any) => {
        const x = entity.position.x;
        const y = entity.position.y;

        return (
          <div
            key={entity.id || entity.type + "-" + x + "-" + y}
            className={`absolute ${
              entity.type === "wall"
                ? "bg-stone-600 border-2 border-stone-500"
                : entity.type === "door"
                  ? "bg-amber-700 border-2 border-amber-500"
                  : "bg-stone-400 border-2 border-stone-300 opacity-80"
            } rounded-sm shadow-lg`}
            style={{
              left: `${x - 2}%`,
              top: `${y - 2}%`,
              width: `4%`,
              height: `4%`,
              zIndex:
                entity.type === "wall"
                  ? 15
                  : entity.type === "door"
                    ? 12
                    : 10,
              filter:
                entity.type === "wall"
                  ? "drop-shadow(2px 2px 4px rgba(0,0,0,0.6))"
                  : entity.type === "door"
                    ? "drop-shadow(1px 1px 3px rgba(245,158,11,0.5))"
                    : "drop-shadow(1px 1px 2px rgba(0,0,0,0.4))",
            }}
          />
        );
      })}

      {/* Debug: Show room connections data */}
      {IS_DEBUG_MODE && roomConnections.length > 0 && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded z-30">
          Connections: {roomConnections.map((c: any) => c.direction).join(", ")}
        </div>
      )}

      {/* Room Exit Indicators */}
      <RoomExitIndicators roomConnections={roomConnections} />

      {/* Combat Entities */}
      <CombatEntityRenderer
        entities={combatState?.entities || []}
        selectedTarget={selectedTarget}
        onTargetSelection={onTargetSelection}
      />
    </div>
  );
}
