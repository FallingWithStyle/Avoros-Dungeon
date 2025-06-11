
/**
 * File: tactical-hotbar.tsx
 * Responsibility: Renders hotbar with action buttons for tactical combat
 * Notes: Displays action buttons in configurable layout with cooldown indicators
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";

interface ActionData {
  id: string;
  type: string;
  name: string;
  icon: React.ComponentType<any>;
}

interface TacticalHotbarProps {
  actions: ActionData[];
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
    hotbarPosition === "left" || hotbarPosition === "right" 
      ? "flex flex-col gap-2" 
      : "flex flex-row gap-2 justify-center";

  const buttonClass = 
    hotbarPosition === "left" || hotbarPosition === "right"
      ? "w-12 h-12 p-0 flex flex-col items-center justify-center text-xs"
      : "w-16 h-12 p-1 flex flex-col items-center justify-center text-xs";

  return (
    <div className={containerClass}>
      {displayedActions.map((action, index) => {
        const cooldownPercentage = getCooldownPercentage(action.id);
        const isOnCooldown = cooldownPercentage > 0;
        const isActive = activeActionMode?.actionId === action.id;
        const isDisabled = isOnCooldown && !isActive;

        const IconComponent = action.icon;
        const hotkey = (index + 1).toString();

        return (
          <div key={action.id} className="relative">
            <Button
              onClick={() => onActionClick(action.id, action.type, action.name)}
              disabled={isDisabled}
              variant={isActive ? "default" : "secondary"}
              className={`${buttonClass} ${
                isActive 
                  ? "bg-blue-600 border-blue-400 text-white" 
                  : "bg-game-surface border-game-border text-slate-300 hover:bg-slate-700"
              } relative overflow-hidden`}
            >
              {/* Icon */}
              <IconComponent className="w-4 h-4 mb-1" />
              
              {/* Action name (truncated) */}
              <span className="text-[10px] leading-none truncate max-w-full">
                {action.name}
              </span>

              {/* Hotkey indicator */}
              <span className="absolute top-0 right-0 text-[8px] bg-slate-900 text-slate-400 px-1 rounded-bl">
                {hotkey}
              </span>

              {/* Cooldown overlay */}
              {isOnCooldown && (
                <div 
                  className="absolute inset-0 bg-red-900/50 flex items-center justify-center"
                  style={{
                    background: `linear-gradient(to top, rgba(153, 27, 27, 0.8) ${cooldownPercentage * 100}%, transparent ${cooldownPercentage * 100}%)`
                  }}
                >
                  <Badge variant="destructive" className="text-[8px] px-1 py-0">
                    {Math.ceil(cooldownPercentage * 10)}
                  </Badge>
                </div>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export default TacticalHotbar;
