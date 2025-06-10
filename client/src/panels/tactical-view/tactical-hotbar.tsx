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
  getCooldownPercentage
}: TacticalHotbarProps) {
  const actions = [
    { id: "move", type: "move", name: "Move", icon: Move, shortcut: "M" },
    { id: "attack", type: "attack", name: "Attack", icon: Sword, shortcut: "A" },
    { id: "defend", type: "ability", name: "Defend", icon: Shield, shortcut: "D" },
    { id: "ability1", type: "ability", name: "Ability", icon: Zap, shortcut: "1" },
  ];

  return (
    <div className="mt-3 flex gap-2 justify-center">
      {actions.map((action) => {
        const isActive = activeActionMode?.actionId === action.id;
        const cooldownPercentage = getCooldownPercentage(action.id);
        const IconComponent = action.icon;

        return (
          <Button
            key={action.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className={`relative w-12 h-12 p-0 ${
              isActive 
                ? "bg-blue-600 border-blue-400 text-white" 
                : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
            }`}
            onClick={() => onHotbarClick(action.id, action.type, action.name)}
            title={`${action.name} (${action.shortcut})`}
            disabled={cooldownPercentage > 0}
          >
            <IconComponent className="w-4 h-4" />

            {/* Cooldown overlay */}
            {cooldownPercentage > 0 && (
              <div 
                className="absolute inset-0 bg-gray-900/70 flex items-center justify-center text-xs font-bold text-white"
                style={{
                  background: `conic-gradient(from 0deg, rgba(0,0,0,0.8) ${cooldownPercentage}%, transparent ${cooldownPercentage}%)`
                }}
              >
                {Math.ceil(cooldownPercentage / 100 * 10)}
              </div>
            )}

            {/* Hotkey indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-800 border border-gray-600 rounded text-xs flex items-center justify-center font-mono">
              {action.shortcut}
            </div>
          </Button>
        );
      })}
    </div>
  );
}