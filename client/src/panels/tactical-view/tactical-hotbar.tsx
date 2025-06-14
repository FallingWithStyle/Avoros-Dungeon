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
    <div className="flex gap-1 p-2 bg-game-surface rounded-lg border border-game-border">
      {/* Attack Action */}
      <Button
        variant={activeActionMode?.actionId === "basic_attack" ? "default" : "outline"}
        size="sm"
        className="w-10 h-10 p-0 flex flex-col items-center justify-center relative"
        onClick={() => onHotbarClick("basic_attack", "attack", "Punch")}
        disabled={punchCooldown > 0}
        title="Attack [1]"
      >
        <Sword className="w-4 h-4" />
        <span className="text-xs text-muted-foreground">1</span>

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
        className="w-10 h-10 p-0 flex flex-col items-center justify-center relative"
        onClick={() => onHotbarClick("defend", "ability", "Defend")}
        title="Defend [2]"
      >
        <Shield className="w-4 h-4" />
        <span className="text-xs text-muted-foreground">2</span>
      </Button>

      {/* Special Ability */}
      <Button
        variant={activeActionMode?.actionId === "special" ? "default" : "outline"}
        size="sm"
        className="w-10 h-10 p-0 flex flex-col items-center justify-center relative"
        onClick={() => onHotbarClick("special", "ability", "Special")}
        title="Special [3]"
      >
        <Zap className="w-4 h-4" />
        <span className="text-xs text-muted-foreground">3</span>
      </Button>
    </div>
  );
}