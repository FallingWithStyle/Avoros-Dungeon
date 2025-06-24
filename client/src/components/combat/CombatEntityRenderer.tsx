
/**
 * File: CombatEntityRenderer.tsx
 * Responsibility: Renders individual combat entities with health bars, facing indicators, and interaction
 * Notes: Extracted from combat-view-panel.tsx to reduce component complexity
 */

import React from "react";
import { Shield, Skull } from "lucide-react";
import type { CombatEntity } from "@shared/combat-system";

interface CombatEntityRendererProps {
  entities: CombatEntity[];
  selectedTarget: string | null;
  onTargetSelection: (entityId: string) => void;
}

export default function CombatEntityRenderer({
  entities,
  selectedTarget,
  onTargetSelection,
}: CombatEntityRendererProps) {
  return (
    <>
      {entities.map((entity) => (
        <div
          key={entity.id}
          className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
            entity.hp <= 0
              ? "cursor-not-allowed opacity-50"
              : entity.id !== "player"
                ? "cursor-pointer hover:scale-105"
                : "cursor-default"
          } ${selectedTarget === entity.id ? "scale-110 z-10" : ""}`}
          style={{
            left: `${entity.position.x}%`,
            top: `${entity.position.y}%`,
          }}
          onClick={() =>
            entity.id !== "player" && entity.hp > 0
              ? onTargetSelection(entity.id)
              : null
          }
        >
          {/* Main entity circle */}
          <div
            className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center ${
              entity.type === "player"
                ? "bg-blue-600 border-blue-400"
                : entity.hp <= 0
                  ? "bg-gray-600 border-gray-500"
                  : entity.type === "hostile"
                    ? "bg-red-600 border-red-400"
                    : "bg-gray-600 border-gray-400"
            }`}
          >
            {entity.type === "player" && (
              <Shield className="w-4 h-4 text-white" />
            )}
            {entity.type === "hostile" && (
              <Skull className="w-4 h-4 text-white" />
            )}

            {/* Facing direction indicator */}
            {entity.facing !== undefined && (
              <div
                className="absolute w-12 h-12 pointer-events-none z-10"
                style={{
                  transform: `rotate(${entity.facing}deg)`,
                  transformOrigin: "center",
                }}
              >
                <div className="w-full h-full flex items-start justify-center">
                  <div
                    className={`w-0 h-0 border-l-[6px] border-r-[6px] border-b-[12px] border-l-transparent border-r-transparent ${
                      entity.hp <= 0
                        ? "border-b-gray-500"
                        : entity.type === "player"
                          ? "border-b-blue-400"
                          : entity.type === "hostile"
                            ? "border-b-red-400"
                            : "border-b-gray-400"
                    }`}
                    style={{
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))",
                      marginTop: "-6px",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Health bar */}
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-700 rounded">
              <div
                className={`h-full rounded transition-all duration-300 ${
                  entity.hp <= 0
                    ? "bg-gray-500"
                    : entity.hp > entity.maxHp * 0.6
                      ? "bg-green-500"
                      : entity.hp > entity.maxHp * 0.3
                        ? "bg-yellow-500"
                        : "bg-red-500"
                }`}
                style={{ width: `${(entity.hp / entity.maxHp) * 100}%` }}
              />
            </div>

            {/* Selection indicator */}
            {selectedTarget === entity.id && entity.hp > 0 && (
              <div className="absolute -inset-1 rounded-full border-2 border-yellow-400 animate-pulse" />
            )}
          </div>
        </div>
      ))}
    </>
  );
}
