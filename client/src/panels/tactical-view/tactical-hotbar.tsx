/**
 * File: tactical-hotbar.tsx
 * Responsibility: Renders the tactical action hotbar with move, attack, defend, and ability buttons
 * Notes: Displays cooldown states, active action modes, and keyboard shortcuts for tactical combat actions
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Sword, Shield, Zap, Move } from 'lucide-react';

interface TacticalHotbarProps {
  activeActionMode: {
    type: "move" | "attack" | "ability";
    actionId: string;
    actionName: string;
  } | null;
  onHotbarClick: (actionId: string, actionType: string, actionName: string) => void;
  getCooldownPercentage: (actionId: string) => number;
}

export default function TacticalHotbar({
  activeActionMode,
  onHotbarClick,
  getCooldownPercentage,
}: TacticalHotbarProps) {
  const punchCooldown = getCooldownPercentage("basic_attack");

  return (
    <div className="flex gap-2 p-3 bg-game-surface rounded-lg border border-game-border">
      {/* Move Action */}
      <Button
        variant={activeActionMode?.actionId === "move" ? "default" : "outline"}
        size="sm"
        className="flex items-center gap-1 relative"
        onClick={() => onHotbarClick("move", "move", "Move")}
      >
        <Move className="w-4 h-4" />
        <span className="hidden sm:inline">Move</span>
        <span className="text-xs text-muted-foreground ml-1">[W]</span>
      </Button>

      {/* Punch Attack */}
      <Button
        variant={activeActionMode?.actionId === "basic_attack" ? "default" : "outline"}
        size="sm"
        className="flex items-center gap-1 relative"
        onClick={() => onHotbarClick("basic_attack", "attack", "Punch")}
        disabled={punchCooldown > 0}
      >
        <span className="text-lg">👊</span>
        <span className="hidden sm:inline">Punch</span>
        <span className="text-xs text-muted-foreground ml-1">[A]</span>

        {/* Cooldown indicator */}
        {punchCooldown > 0 && (
          <div 
            className="absolute inset-0 bg-gray-600/50 rounded"
            style={{ 
              clipPath: `polygon(0 ${100 - punchCooldown}%, 100% ${100 - punchCooldown}%, 100% 100%, 0% 100%)` 
            }}
          />
        )}
      </Button>

      {/* Defend Action */}
      <Button
        variant={activeActionMode?.actionId === "defend" ? "default" : "outline"}
        size="sm"
        className="flex items-center gap-1 relative"
        onClick={() => onHotbarClick("defend", "ability", "Defend")}
      >
        <Shield className="w-4 h-4" />
        <span className="hidden sm:inline">Defend</span>
        <span className="text-xs text-muted-foreground ml-1">[S]</span>
      </Button>

      {/* Special Ability */}
      <Button
        variant={activeActionMode?.actionId === "special" ? "default" : "outline"}
        size="sm"
        className="flex items-center gap-1 relative"
        onClick={() => onHotbarClick("special", "ability", "Special")}
      >
        <Zap className="w-4 h-4" />
        <span className="hidden sm:inline">Special</span>
        <span className="text-xs text-muted-foreground ml-1">[D]</span>
      </Button>
    </div>
  );
}