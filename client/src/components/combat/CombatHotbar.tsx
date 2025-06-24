
/**
 * File: CombatHotbar.tsx
 * Responsibility: Renders action buttons with cooldown indicators and keyboard shortcuts
 * Notes: Extracted from combat-view-panel.tsx to reduce component complexity
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Sword, Shield, Zap } from "lucide-react";

interface CombatHotbarProps {
  activeActionMode: any;
  onHotbarAction: (actionId: string, actionType: string, actionName: string) => void;
  getCooldownPercentage: (actionId: string) => number;
}

export default function CombatHotbar({
  activeActionMode,
  onHotbarAction,
  getCooldownPercentage,
}: CombatHotbarProps) {
  const actions = [
    {
      id: "basic_attack",
      name: "Attack",
      type: "attack",
      icon: Sword,
      key: "1",
    },
    {
      id: "defend",
      name: "Defend",
      type: "ability",
      icon: Shield,
      key: "2",
    },
    {
      id: "special",
      name: "Special",
      type: "ability",
      icon: Zap,
      key: "3",
    },
  ];

  return (
    <div className="flex gap-1">
      {actions.map((action) => {
        const Icon = action.icon;
        const cooldownPercent = getCooldownPercentage(action.id);
        const isActive = activeActionMode?.actionId === action.id;
        const isOnCooldown = cooldownPercent > 0;

        return (
          <Button
            key={action.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className="w-12 h-12 p-0 flex flex-col items-center justify-center relative"
            onClick={() => onHotbarAction(action.id, action.type, action.name)}
            disabled={isOnCooldown}
            title={`${action.name} [${action.key}]`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-xs text-muted-foreground">{action.key}</span>

            {/* Cooldown indicator */}
            {isOnCooldown && (
              <div
                className="absolute inset-0 bg-gray-600/50 rounded"
                style={{
                  clipPath: `polygon(0 ${100 - cooldownPercent}%, 100% ${100 - cooldownPercent}%, 100% 100%, 0% 100%)`,
                }}
              />
            )}
          </Button>
        );
      })}
    </div>
  );
}
