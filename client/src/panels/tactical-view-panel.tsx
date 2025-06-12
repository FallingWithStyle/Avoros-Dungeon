/**
 * File: tactical-view-panel.tsx
 * Responsibility: Main tactical view interface combining grid, hotbar, and tactical controls
 * Notes: Integrates tactical grid display with action hotbar and handles tactical positioning
 */

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTacticalData } from "./tactical-view/tactical-data-hooks";
import TacticalGrid from "./tactical-view/tactical-grid";
import TacticalHotbar from "./tactical-view/tactical-hotbar";
import ActionQueuePanel from "./action-queue-panel";
import { useLayoutSettings } from "@/hooks/useLayoutSettings";
import { Sword, Shield, Zap, Move, Eye, Users, Heart } from "lucide-react";
import type { CrawlerWithDetails } from "@shared/schema";

interface TacticalViewPanelProps {
  crawler: CrawlerWithDetails;
}

function TacticalViewPanel({ crawler }: TacticalViewPanelProps) {
  const { currentSettings } = useLayoutSettings();
  const { hotbarPosition } = currentSettings;

  const [activeActionMode, setActiveActionMode] = useState<{
    type: "move" | "attack" | "ability";
    actionId: string;
    actionName: string;
  } | null>(null);

  const {
    tacticalData,
    isLoading,
    error,
    refetch
  } = useTacticalData(crawler.id);

  // Mock actions for now - these would come from the crawler's abilities
  const availableActions = [
    { id: "move", type: "move", name: "Move", icon: Move },
    { id: "attack", type: "attack", name: "Attack", icon: Sword },
    { id: "defend", type: "ability", name: "Defend", icon: Shield },
    { id: "scan", type: "ability", name: "Scan", icon: Eye },
    { id: "ability1", type: "ability", name: "Ability 1", icon: Zap },
    { id: "ability2", type: "ability", name: "Ability 2", icon: Zap },
    { id: "ability3", type: "ability", name: "Ability 3", icon: Zap },
    { id: "ability4", type: "ability", name: "Ability 4", icon: Zap },
    { id: "heal", type: "ability", name: "Heal", icon: Heart },
    { id: "group", type: "ability", name: "Group", icon: Users },
  ];

  const handleActionClick = useCallback((actionId: string, actionType: string, actionName: string) => {
    setActiveActionMode({ type: actionType as "move" | "attack" | "ability", actionId, actionName });
  }, []);

  const handleGridClick = useCallback((event: React.MouseEvent) => {
    if (!activeActionMode) return;

    // Handle tactical action based on active mode
    console.log("Grid clicked with action mode:", activeActionMode);

    // Clear action mode after use
    setActiveActionMode(null);
  }, [activeActionMode]);

  const handleGridRightClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    // Handle right-click context menu
  }, []);

  const getCooldownPercentage = useCallback((actionId: string): number => {
    // Mock cooldown system - replace with actual cooldown logic
    return 0;
  }, []);

  if (isLoading) {
    return (
      <Card className="bg-game-surface border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center">
            <Sword className="w-5 h-5 mr-2 text-red-400" />
            Tactical View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">Loading tactical data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-game-surface border-game-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center">
            <Sword className="w-5 h-5 mr-2 text-red-400" />
            Tactical View
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-400 text-center">
            Error loading tactical data
          </div>
        </CardContent>
      </Card>
    );
  }

  const isInCombat = tacticalData?.tacticalEntities?.some(entity => 
    entity.type === "mob" && entity.data?.hostileType === "aggressive"
  ) || false;

  // Position hotbar based on layout settings
  const hotbarContainerClass = 
    hotbarPosition === "top" ? "mb-4" :
    hotbarPosition === "bottom" ? "mt-4" :
    hotbarPosition === "left" ? "mr-4 flex-row" :
    "ml-4 flex-row";

  const mainLayoutClass = 
    hotbarPosition === "left" || hotbarPosition === "right" 
      ? "flex items-start" 
      : "block";

  return (
    <Card className="bg-game-surface border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center">
          <Sword className="w-5 h-5 mr-2 text-red-400" />
          Tactical View
          {isInCombat && (
            <Badge variant="destructive" className="ml-2">
              In Combat
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={mainLayoutClass}>
          {/* Left hotbar */}
          {hotbarPosition === "left" && (
            <div className={hotbarContainerClass}>
              <TacticalHotbar
                actions={availableActions}
                activeActionMode={activeActionMode}
                onActionClick={handleActionClick}
                getCooldownPercentage={getCooldownPercentage}
              />
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1">
            {/* Top hotbar */}
            {hotbarPosition === "top" && (
              <div className={hotbarContainerClass}>
                <TacticalHotbar
                  actions={availableActions}
                  activeActionMode={activeActionMode}
                  onActionClick={handleActionClick}
                  getCooldownPercentage={getCooldownPercentage}
                />
              </div>
            )}

            {/* Tactical Grid */}
            <TacticalGrid 
              tacticalData={tacticalData}
              activeActionMode={activeActionMode}
              onActionModeCancel={() => setActiveActionMode(null)}
              onRoomMovement={(direction) => {
                console.log("🚪 Room movement triggered:", direction);
                refetch();
              }}
            />

            {/* Bottom hotbar */}
            {hotbarPosition === "bottom" && (
              <div className={hotbarContainerClass}>
                <TacticalHotbar
                  actions={availableActions}
                  activeActionMode={activeActionMode}
                  onActionClick={handleActionClick}
                  getCooldownPercentage={getCooldownPercentage}
                />
              </div>
            )}
          </div>

          {/* Right hotbar */}
          {hotbarPosition === "right" && (
            <div className={hotbarContainerClass}>
              <TacticalHotbar
                actions={availableActions}
                activeActionMode={activeActionMode}
                onActionClick={handleActionClick}
                getCooldownPercentage={getCooldownPercentage}
              />
            </div>
          )}
        </div>

        {/* Action Queue Panel */}
        <div className="mt-4">
          <ActionQueuePanel />
        </div>

        {/* Status Info */}
        <div className="flex justify-between text-sm text-slate-400 mt-4">
          <span>Room: {tacticalData?.room?.name || "Unknown"}</span>
          <span>
            Entities: {tacticalData?.tacticalEntities?.length || 0}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export { TacticalViewPanel };
export default TacticalViewPanel;