
/**
 * File: tactical-hotbar.tsx
 * Responsibility: Renders hotbar with action buttons for tactical combat
 * Notes: Displays action buttons in configurable layout with cooldown indicators
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";

interface TacticalAction {
  id: string;
  type: string;
  name: string;
  icon: React.ComponentType<any>;
}

interface TacticalHotbarProps {
  actions: TacticalAction[];
  activeActionMode: {
    type: "move" | "attack" | "ability";
    actionId: string;
    actionName: string;
  } | null;
  onActionClick: (actionId: string, actionType: string, actionName: string) => void;
  getCooldownPercentage: (actionId: string) => number;
}

function TacticalHotbar({
  actions,
  activeActionMode,
  onActionClick,
  getCooldownPercentage,
}: TacticalHotbarProps) {
  const { currentSettings } = useLayoutSettings();
  const { hotbarCount, hotbarPosition } = currentSettings;

  // Limit actions to the configured count
  const displayedActions = actions.slice(0, hotbarCount);

  // Determine layout classes based on position
  const containerClass = 
    hotbarPosition === "top" || hotbarPosition === "bottom"
      ? "flex flex-row gap-2 justify-center flex-wrap"
      : "flex flex-col gap-2";

  const buttonClass = 
    hotbarPosition === "top" || hotbarPosition === "bottom"
      ? "flex-shrink-0 w-12 h-12"
      : "w-full h-12";

  return (
    <div className={containerClass}>
      {displayedActions.map((action, index) => {
        const cooldownPercentage = getCooldownPercentage(action.id);
        const isOnCooldown = cooldownPercentage > 0;
        const isActive = activeActionMode?.actionId === action.id;
        const isDisabled = isOnCooldown || (activeActionMode !== null && !isActive);

        const IconComponent = action.icon;

        return (
          <div key={action.id} className="relative">
            <Button
              onClick={() => onActionClick(action.id, action.type, action.name)}
              disabled={isDisabled}
              variant={isActive ? "default" : "outline"}
              className={`${buttonClass} relative overflow-hidden flex flex-col items-center justify-center p-1 ${
                isActive ? "bg-blue-600 border-blue-400" : ""
              }`}
              title={action.name + " (" + (index + 1) + ")"}
            >
              {/* Action Icon */}
              <IconComponent className="w-4 h-4 mb-1" />
              
              {/* Action Name (shortened for small buttons) */}
              <span className="text-xs leading-none">
                {hotbarPosition === "left" || hotbarPosition === "right" 
                  ? action.name 
                  : action.name.slice(0, 4)
                }
              </span>

              {/* Keyboard shortcut indicator */}
              <div className="absolute top-0 right-0 bg-slate-600 text-white text-xs px-1 rounded-bl opacity-75">
                {index + 1}
              </div>

              {/* Cooldown overlay */}
              {isOnCooldown && (
                <div 
                  className="absolute inset-0 bg-red-600 opacity-50 transition-all duration-100"
                  style={{
                    clipPath: `polygon(0 0, 100% 0, 100% ${100 - cooldownPercentage}%, 0 ${100 - cooldownPercentage}%)`
                  }}
                />
              )}
            </Button>

            {/* Cooldown percentage badge */}
            {isOnCooldown && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 text-xs px-1 py-0 min-w-0 h-5"
              >
                {Math.ceil(cooldownPercentage)}%
              </Badge>
            )}

            {/* Active indicator */}
            {isActive && (
              <div className="absolute inset-0 border-2 border-blue-400 rounded pointer-events-none animate-pulse" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default TacticalHotbar;
