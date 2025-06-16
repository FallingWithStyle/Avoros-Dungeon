/**
 * File: action-queue-panel.tsx
 * Responsibility: Display active cooldowns and combat status instead of action queue
 * Notes: Simplified to show cooldown timers rather than complex queued actions
 */

import { useEffect, useState } from "react";
import { combatSystem, type CombatState } from "@shared/combat-system";
import { Sword, Shield, Footprints, Clock } from "lucide-react";

interface ActionQueuePanelProps {
  className?: string;
}

export default function ActionQueuePanel({ className }: ActionQueuePanelProps) {
  const [combatState, setCombatState] = useState(combatSystem.getState());
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Subscribe to combat system updates
  useEffect(() => {
    const unsubscribe = combatSystem.subscribe(setCombatState);
    return unsubscribe;
  }, []);

  // Update current time every 100ms for cooldown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const player = combatState.entities.find(e => e.id === "player");

  if (!player || !player.cooldowns) {
    return (
      <div className={`bg-slate-800 border border-slate-700 rounded-lg p-4 ${className}`}>
        <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Action Status
        </h3>
        <p className="text-xs text-slate-400">No active cooldowns</p>
      </div>
    );
  }

  const activeCooldowns = Object.entries(player.cooldowns)
    .map(([actionId, lastUsed]) => {
      const cooldownDurations = {
        "basic_attack": 800,
        "move": 0,
        "dodge": 3000
      };

      const cooldownDuration = cooldownDurations[actionId] || 1000;
      const timeRemaining = Math.max(0, (lastUsed + cooldownDuration) - currentTime);

      return {
        actionId,
        timeRemaining,
        isActive: timeRemaining > 0
      };
    })
    .filter(cooldown => cooldown.isActive);

  const getActionIcon = (actionId: string) => {
    switch (actionId) {
      case "basic_attack":
        return <Sword className="w-4 h-4 text-red-400" />;
      case "dodge":
        return <Shield className="w-4 h-4 text-blue-400" />;
      case "move":
        return <Footprints className="w-4 h-4 text-green-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionName = (actionId: string) => {
    switch (actionId) {
      case "basic_attack":
        return "Attack";
      case "dodge":
        return "Dodge";
      case "move":
        return "Move";
      default:
        return actionId;
    }
  };

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Action Cooldowns
      </h3>

      {combatState.isInCombat && (
        <div className="mb-3 p-2 bg-red-900/20 border border-red-700/50 rounded text-xs text-red-300">
          Combat Active
        </div>
      )}

      {activeCooldowns.length === 0 ? (
        <p className="text-xs text-slate-400">All actions ready</p>
      ) : (
        <div className="space-y-2">
          {activeCooldowns.map((cooldown) => (
            <div
              key={cooldown.actionId}
              className="flex items-center justify-between p-2 bg-slate-700/50 rounded"
            >
              <div className="flex items-center gap-2">
                {getActionIcon(cooldown.actionId)}
                <span className="text-xs text-slate-300">
                  {getActionName(cooldown.actionId)}
                </span>
              </div>
              <span className="text-xs text-orange-400 font-mono">
                {(cooldown.timeRemaining / 1000).toFixed(1)}s
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}