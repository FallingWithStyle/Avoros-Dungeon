/**
 * File: action-queue-panel.tsx
 * Responsibility: Displays queued combat actions and their execution status
 * Notes: Shows pending actions with progress indicators and cancellation options
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, X, Zap } from "lucide-react";
import { combatSystem } from "../../../shared/combat-system";

interface ActionQueuePanelProps {
  className?: string;
}

function ActionQueuePanel({ className }: ActionQueuePanelProps) {
  const [queuedActions, setQueuedActions] = React.useState<any[]>([]);
  const [currentAction, setCurrentAction] = React.useState<any>(null);

  // Subscribe to combat system updates
  React.useEffect(() => {
    const updateQueue = () => {
      const state = combatSystem.getState();
      setQueuedActions(state.actionQueue || []);
      setCurrentAction(state.currentAction || null);
    };

    // Initial update
    updateQueue();

    // Set up interval to check for updates
    const interval = setInterval(updateQueue, 100);

    return () => clearInterval(interval);
  }, []);

  const handleCancelAction = (actionId: string) => {
    // Find and cancel the action
    const actionIndex = queuedActions.findIndex(action => action.id === actionId);
    if (actionIndex >= 0) {
      combatSystem.cancelAction(actionId);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "move":
        return "🏃";
      case "attack":
        return "⚔️";
      case "ability":
        return "✨";
      case "defend":
        return "🛡️";
      default:
        return "❓";
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "move":
        return "bg-blue-500";
      case "attack":
        return "bg-red-500";
      case "ability":
        return "bg-purple-500";
      case "defend":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className={`bg-game-surface border-game-border ${className || ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-400" />
          Action Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Action */}
        {currentAction && (
          <div className="mb-4">
            <div className="text-sm text-slate-400 mb-1">Executing:</div>
            <div className="bg-slate-700 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-lg mr-2">{getActionIcon(currentAction.type)}</span>
                  <span className="text-white font-medium">{currentAction.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {currentAction.type}
                  </Badge>
                </div>
                <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
              </div>
              <Progress 
                value={currentAction.progress || 0} 
                className="w-full"
              />
              <div className="text-xs text-slate-400 mt-1">
                {Math.round(currentAction.progress || 0)}% complete
              </div>
            </div>
          </div>
        )}

        {/* Queued Actions */}
        <div className="space-y-2">
          {queuedActions.length === 0 && !currentAction ? (
            <div className="text-center text-slate-400 py-4">
              No actions queued
            </div>
          ) : (
            queuedActions.map((action, index) => (
              <div
                key={action.id || index}
                className="bg-slate-700 rounded p-2 flex items-center justify-between"
              >
                <div className="flex items-center flex-1">
                  <div className={`w-3 h-3 rounded-full ${getActionColor(action.type)} mr-2`}></div>
                  <span className="text-white text-sm">{action.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {action.type}
                  </Badge>
                  <span className="text-slate-400 text-xs ml-2">
                    #{index + 1}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCancelAction(action.id)}
                  className="h-6 w-6 p-0 hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Queue Stats */}
        {(queuedActions.length > 0 || currentAction) && (
          <div className="mt-4 pt-3 border-t border-slate-600">
            <div className="flex justify-between text-xs text-slate-400">
              <span>
                {currentAction ? "1 executing, " : ""}
                {queuedActions.length} queued
              </span>
              <span>
                ETA: {Math.round((queuedActions.length + (currentAction ? 1 : 0)) * 1.5)}s
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActionQueuePanel;