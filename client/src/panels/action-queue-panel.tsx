
/**
 * File: action-queue-panel.tsx
 * Responsibility: Displays a real-time queue of combat actions with execution timers and progress indicators
 * Notes: Shows queued player and enemy actions with cooldowns, execution order, and visual feedback
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Sword,
  Shield,
  Target,
  Footprints,
  Zap,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { combatSystem, type QueuedAction } from "@shared/combat-system";

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

  // Update current time every 100ms for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Sort actions by execution time (soonest first)
  const sortedActions = [...combatState.actionQueue].sort((a, b) => a.executesAt - b.executesAt);

  const getActionIcon = (action: QueuedAction) => {
    switch (action.action.type) {
      case "attack":
        return <Sword className="w-4 h-4 text-red-400" />;
      case "ability":
        if (action.action.id === "dodge") {
          return <Shield className="w-4 h-4 text-blue-400" />;
        }
        return <Zap className="w-4 h-4 text-purple-400" />;
      case "move":
        return <Footprints className="w-4 h-4 text-green-400" />;
      default:
        return <Target className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionBadgeStyle = (action: QueuedAction) => {
    switch (action.action.type) {
      case "attack":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "ability":
        if (action.action.id === "dodge") {
          return "bg-blue-500/20 text-blue-300 border-blue-500/30";
        }
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "move":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  const getEntityDisplayName = (entityId: string) => {
    const entity = combatState.entities.find(e => e.id === entityId);
    if (!entity) return entityId;
    
    if (entity.type === 'player') {
      return `${entity.name} (You)`;
    }
    return entity.name;
  };

  const getTargetDisplayName = (targetId?: string) => {
    if (!targetId) return null;
    const target = combatState.entities.find(e => e.id === targetId);
    return target ? target.name : targetId;
  };

  const formatTimeRemaining = (executesAt: number) => {
    const remaining = Math.max(0, executesAt - currentTime);
    if (remaining === 0) return "Executing...";
    if (remaining < 1000) return `${Math.ceil(remaining / 100) * 100}ms`;
    return `${(remaining / 1000).toFixed(1)}s`;
  };

  const getActionDescription = (action: QueuedAction) => {
    const entityName = getEntityDisplayName(action.entityId);
    const targetName = getTargetDisplayName(action.targetId);
    
    if (action.action.type === "move") {
      if (action.targetPosition) {
        return `${entityName} moving to (${action.targetPosition.x.toFixed(0)}, ${action.targetPosition.y.toFixed(0)})`;
      }
      return `${entityName} moving`;
    }
    
    if (targetName) {
      return `${entityName} using ${action.action.name} on ${targetName}`;
    }
    
    return `${entityName} using ${action.action.name}`;
  };

  const getEntityTypeColor = (entityId: string) => {
    const entity = combatState.entities.find(e => e.id === entityId);
    if (!entity) return "text-gray-400";
    
    switch (entity.type) {
      case "player":
        return "text-blue-400";
      case "hostile":
        return "text-red-400";
      case "neutral":
      case "npc":
        return "text-orange-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <Card className={`bg-game-panel border-game-border ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Action Queue
          {sortedActions.length > 0 && (
            <Badge variant="outline" className="ml-auto bg-slate-700/50 text-slate-300 border-slate-600">
              {sortedActions.length} queued
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48 w-full">
          <div className="space-y-2">
            {sortedActions.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8">
                No actions queued
              </div>
            ) : (
              sortedActions.map((queuedAction, index) => {
                const timeRemaining = queuedAction.executesAt - currentTime;
                const isExecuting = timeRemaining <= 0;
                
                return (
                  <div
                    key={`${queuedAction.entityId}-${queuedAction.queuedAt}`}
                    className={`flex items-center gap-3 p-3 rounded border transition-all duration-200 ${
                      isExecuting
                        ? "bg-yellow-500/20 border-yellow-500/50 animate-pulse"
                        : index === 0
                        ? "bg-slate-800/50 border-slate-600/50"
                        : "bg-slate-800/30 border-slate-700/30"
                    } hover:bg-slate-700/40`}
                  >
                    {/* Position indicator */}
                    <div className="flex flex-col items-center justify-center w-8">
                      <div className={`text-xs font-bold ${
                        index === 0 ? "text-yellow-400" : "text-slate-500"
                      }`}>
                        #{index + 1}
                      </div>
                      {index < sortedActions.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-600 mt-1" />
                      )}
                    </div>

                    {/* Action icon */}
                    <div className="flex-shrink-0">
                      {getActionIcon(queuedAction)}
                    </div>

                    {/* Action details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${getEntityTypeColor(queuedAction.entityId)} leading-snug`}>
                            {getActionDescription(queuedAction)}
                          </p>
                          
                          {/* Additional action info */}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getActionBadgeStyle(queuedAction)}`}
                            >
                              {queuedAction.action.name}
                            </Badge>
                            
                            {queuedAction.action.damage && (
                              <span className="text-xs text-red-400">
                                {queuedAction.action.damage} dmg
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Time remaining */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className={`text-xs font-mono ${
                            isExecuting
                              ? "text-yellow-400 font-bold"
                              : timeRemaining < 1000
                              ? "text-orange-400"
                              : "text-slate-400"
                          }`}>
                            {formatTimeRemaining(queuedAction.executesAt)}
                          </span>
                          
                          {/* Progress bar for current action */}
                          {index === 0 && !isExecuting && (
                            <div className="w-16 h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-100 ease-linear"
                                style={{
                                  width: `${Math.max(0, Math.min(100, 
                                    ((queuedAction.action.executionTime - timeRemaining) / queuedAction.action.executionTime) * 100
                                  ))}%`
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Queue statistics */}
        {sortedActions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Next: {formatTimeRemaining(sortedActions[0]?.executesAt || 0)}
              </span>
              <span>
                Queue depth: {sortedActions.length}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
