import React from 'react';
import { Footprints, Sword, Shield, Target, Clock } from 'lucide-react';

interface TacticalHotbarProps {
  activeActionMode: any;
  onHotbarClick: (actionId: string, actionType: string, actionName: string) => void;
  getCooldownPercentage: (actionId: string) => number;
}

const hotbarActions = [
  { id: "move", name: "Move", icon: <Footprints className="w-4 h-4" />, type: "move" },
  { id: "attack", name: "Attack", icon: <Sword className="w-4 h-4" />, type: "attack" },
  { id: "defend", name: "Defend", icon: <Shield className="w-4 h-4" />, type: "ability" },
  { id: "ability1", name: "Ability 1", icon: <Target className="w-4 h-4" />, type: "ability" },
  { id: "ability2", name: "Ability 2", icon: <Target className="w-4 h-4" />, type: "ability" },
  { id: "ability3", name: "Ability 3", icon: <Target className="w-4 h-4" />, type: "ability" },
  { id: "basic_attack", name: "Normal Attack", icon: <Sword className="w-4 h-4" />, type: "attack" },
  { id: "heavy_attack", name: "Heavy Attack", icon: <Sword className="w-4 h-4" />, type: "attack" },
  { id: "ranged_attack", name: "Ranged Attack", icon: <Target className="w-4 h-4" />, type: "attack" },
  { id: "wait", name: "Wait", icon: <Clock className="w-4 h-4" />, type: "ability" },
];

export default function TacticalHotbar({ 
  activeActionMode, 
  onHotbarClick, 
  getCooldownPercentage 
}: TacticalHotbarProps) {
  return (
    <div className="flex justify-center gap-2 mt-2">
      {hotbarActions.map((action, index) => {
        const cooldownPercentage = getCooldownPercentage(action.id);
        const isOnCooldown = cooldownPercentage > 0;

        return (
          <button
            key={action.id}
            className={`relative w-8 h-8 rounded-full ${
              activeActionMode?.actionId === action.id 
                ? "bg-yellow-500" 
                : isOnCooldown 
                  ? "bg-gray-900 cursor-not-allowed" 
                  : "bg-gray-800 hover:bg-gray-700"
            } text-white flex items-center justify-center transition-all duration-150`}
            onClick={() => {
              if (!isOnCooldown) {
                onHotbarClick(action.id, action.type, action.name);
              }
            }}
            disabled={isOnCooldown}
            title={`${index + 1}: ${action.name}${isOnCooldown ? " (on cooldown)" : ""}`}
          >
            {/* Cooldown overlay */}
            {isOnCooldown && (
              <div className="absolute inset-0 rounded-full overflow-hidden">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r="14"
                    fill="none"
                    stroke="rgba(239, 68, 68, 0.8)"
                    strokeWidth="2"
                    strokeDasharray={`${(cooldownPercentage / 100) * 87.96} 87.96`}
                    className="transition-all duration-100"
                  />
                </svg>
              </div>
            )}

            {/* Icon */}
            <div className={`${isOnCooldown ? "opacity-50" : ""} transition-opacity duration-150`}>
              {action.icon}
            </div>

            {/* Number indicator */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-slate-600 text-xs rounded-full flex items-center justify-center text-slate-200">
              {index === 9 ? "0" : (index + 1).toString()}
            </div>
          </button>
        );
      })}
    </div>
  );
}