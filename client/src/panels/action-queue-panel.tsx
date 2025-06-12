/**
 * File: action-queue-panel.tsx
 * Responsibility: Display and manage the action queue for tactical combat
 * Notes: Shows queued actions with the ability to cancel or reorder them
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, X, ArrowUp, ArrowDown } from "lucide-react";

interface QueuedAction {
  id: string;
  type: "move" | "attack" | "ability" | "item";
  name: string;
  target?: { x: number; y: number };
  entityId?: string;
  estimatedDuration: number;
  priority: number;
}

function ActionQueuePanel() {
  // Mock queue data - replace with actual queue state management
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([
    {
      id: "1",
      type: "move",
      name: "Move to (45, 60)",
      target: { x: 45, y: 60 },
      estimatedDuration: 1500,
      priority: 1,
    },
    {
      id: "2",
      type: "attack",
      name: "Attack Goblin",
      entityId: "goblin_1",
      estimatedDuration: 2000,
      priority: 2,
    },
    {
      id: "3",
      type: "ability",
      name: "Heal Self",
      estimatedDuration: 3000,
      priority: 3,
    },
  ]);

  const handleCancelAction = (actionId: string) => {
    setQueuedActions(prev => prev.filter(action => action.id !== actionId));
  };

  const handleMoveUp = (actionId: string) => {
    setQueuedActions(prev => {
      const index = prev.findIndex(action => action.id === actionId);
      if (index > 0) {
        const newActions = [...prev];
        [newActions[index - 1], newActions[index]] = [newActions[index], newActions[index - 1]];
        return newActions;
      }
      return prev;
    });
  };

  const handleMoveDown = (actionId: string) => {
    setQueuedActions(prev => {
      const index = prev.findIndex(action => action.id === actionId);
      if (index < prev.length - 1) {
        const newActions = [...prev];
        [newActions[index], newActions[index + 1]] = [newActions[index + 1], newActions[index]];
        return newActions;
      }
      return prev;
    });
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "move": return "🏃";
      case "attack": return "⚔️";
      case "ability": return "✨";
      case "item": return "🎒";
      default: return "❓";
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case "move": return "bg-blue-500";
      case "attack": return "bg-red-500";
      case "ability": return "bg-purple-500";
      case "item": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Card className="bg-game-surface border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-400" />
          Action Queue
          {queuedActions.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {queuedActions.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {queuedActions.length === 0 ? (
          <div className="text-center text-slate-400 py-4">
            No actions queued
          </div>
        ) : (
          <div className="space-y-2">
            {queuedActions.map((action, index) => (
              <div
                key={action.id}
                className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg border border-slate-600"
              >
                {/* Priority indicator */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold">
                  {index + 1}
                </div>

                {/* Action icon and type */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getActionColor(action.type)} flex items-center justify-center text-white text-sm`}>
                  {getActionIcon(action.type)}
                </div>

                {/* Action details */}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {action.name}
                  </div>
                  <div className="text-slate-400 text-xs">
                    ~{(action.estimatedDuration / 1000).toFixed(1)}s
                  </div>
                </div>

                {/* Action controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveUp(action.id)}
                    disabled={index === 0}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveDown(action.id)}
                    disabled={index === queuedActions.length - 1}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelAction(action.id)}
                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Queue stats */}
        {queuedActions.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-600 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Total actions: {queuedActions.length}</span>
              <span>
                Est. time: {(queuedActions.reduce((sum, action) => sum + action.estimatedDuration, 0) / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActionQueuePanel;