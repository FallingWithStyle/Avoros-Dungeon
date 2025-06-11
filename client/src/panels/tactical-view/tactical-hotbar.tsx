/**
 * File: tactical-hotbar.tsx
 * Responsibility: Renders hotbar with action buttons for tactical combat
 * Notes: Displays action buttons in configurable layout with cooldown indicators
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";

interface TacticalHotbarProps {
  actions: {
    id: string;
    label: string;
    cooldown: number;
    onClick: () => void;
  }[];
  activeActionMode: string | null;
  onActionClick: (actionId: string) => void;
  getCooldownPercentage: (actionId: string) => number;
}

function TacticalHotbar({
  actions,
  activeActionMode,
  onActionClick,
  getCooldownPercentage,
}: TacticalHotbarProps) {
  const { hotbarLayout } = useLayoutSettings();

  return (
    <div>
      {actions.map((action) => {
        const cooldownPercentage = getCooldownPercentage(action.id);
        const isOnCooldown = cooldownPercentage > 0;
        const isDisabled = isOnCooldown || (activeActionMode !== null && activeActionMode !== action.id);

        return (
          <Button
            key={action.id}
            onClick={() => onActionClick(action.id)}
            disabled={isDisabled}
            className="relative"
          >
            {action.label}
            {isOnCooldown && (
              <Badge className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                {Math.ceil(cooldownPercentage * 100)}%
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}

export default TacticalHotbar;