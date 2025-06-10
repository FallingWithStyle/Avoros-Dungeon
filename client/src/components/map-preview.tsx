/**
 * File: map-preview.tsx
 * Responsibility: Compact dungeon map preview showing nearby rooms and current position
 * Notes: Provides minimap functionality for quick spatial awareness
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Gem, Home, Skull } from "lucide-react";

export default function MapPreview() {
  return (
    <div className="space-y-4 p-4">
      <Card className="bg-game-panel border-game-border">
        <CardHeader>
          <CardTitle className="text-slate-200">Map Indicator Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-slate-300 mb-4">Here's how the indicators will look:</div>

            {/* Mini-map style examples */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-400">Mini-Map Style:</div>
              <div className="flex gap-4 items-center flex-wrap">
                {/* Room with enemies */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-6 h-6 bg-slate-600/20 border-2 border-slate-600/50 rounded flex items-center justify-center">
                    <Shield className="w-3 h-3 text-green-400" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-red-300 animate-pulse" 
                         title="Hostile mobs present" />
                  </div>
                  <span className="text-xs text-slate-400">Room with Enemies</span>
                </div>

                {/* Room with multiple players */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-6 h-6 bg-green-600/20 border-2 border-green-600/50 rounded flex items-center justify-center">
                    <Home className="w-3 h-3 text-green-400" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full border border-cyan-200" 
                         title="3 players here" />
                  </div>
                  <span className="text-xs text-slate-400">Room with Players</span>
                </div>

                {/* Room with neutral mobs */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-6 h-6 bg-blue-600/20 border-2 border-blue-600/50 rounded flex items-center justify-center">
                    <Shield className="w-3 h-3 text-blue-400" />
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-orange-400 rounded-full border border-orange-200" 
                         title="Neutral creatures" />
                  </div>
                  <span className="text-xs text-slate-400">Room with Neutrals</span>
                </div>

                {/* Room with all three */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-6 h-6 bg-yellow-600/20 border-2 border-yellow-600/50 rounded flex items-center justify-center">
                    <Gem className="w-3 h-3 text-yellow-400" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-red-300 animate-pulse" 
                         title="Hostile mobs present" />
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-orange-400 rounded-full border border-orange-200" 
                         title="Neutral creatures" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full border border-cyan-200" 
                         title="2 players here" />
                  </div>
                  <span className="text-xs text-slate-400">All Creature Types</span>
                </div>
              </div>
            </div>

            {/* Expanded map style examples */}
            <div className="space-y-3 mt-6">
              <div className="text-xs font-medium text-slate-400">Expanded Map Style:</div>
              <div className="flex gap-4 items-center flex-wrap">
                {/* Room with enemies - expanded */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-12 h-12 bg-slate-600/20 border-2 border-slate-600/50 rounded flex items-center justify-center">
                    <Shield className="w-6 h-6 text-green-400" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-red-300 animate-pulse flex items-center justify-center" 
                         title="Enemies present">
                      <Skull className="w-2 h-2 text-white" />
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">Room with Enemies</span>
                </div>

                {/* Room with multiple players - expanded */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-12 h-12 bg-green-600/20 border-2 border-green-600/50 rounded flex items-center justify-center">
                    <Home className="w-6 h-6 text-green-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-3 bg-cyan-400 rounded-full border border-cyan-200 flex items-center justify-center text-xs font-bold text-white" 
                         title="3 players here">
                      3
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">Room with 3 Players</span>
                </div>

                {/* Room with neutral mobs - expanded */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-12 h-12 bg-blue-600/20 border-2 border-blue-600/50 rounded flex items-center justify-center">
                    <Shield className="w-6 h-6 text-blue-400" />
                    <div className="absolute -top-1 -left-1 w-4 h-3 bg-orange-400 rounded-full border border-orange-200 flex items-center justify-center text-xs font-bold text-white" 
                         title="3 neutral creatures">
                      3
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">Room with 3 Neutrals</span>
                </div>

                {/* Room with all three - expanded */}
                <div className="flex flex-col items-center gap-1">
                  <div className="relative w-12 h-12 bg-yellow-600/20 border-2 border-yellow-600/50 rounded flex items-center justify-center">
                    <Gem className="w-6 h-6 text-yellow-400" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-red-300 animate-pulse flex items-center justify-center" 
                         title="Enemies present">
                      <Skull className="w-2 h-2 text-white" />
                    </div>
                    <div className="absolute -top-1 -left-1 w-4 h-3 bg-orange-400 rounded-full border border-orange-200 flex items-center justify-center text-xs font-bold text-white" 
                         title="2 neutral creatures">
                      2
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-3 bg-cyan-400 rounded-full border border-cyan-200 flex items-center justify-center text-xs font-bold text-white" 
                         title="2 players here">
                      2
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">All Mob Types</span>
                </div>
              </div>
            </div>

            {/* Legend for indicators */}
            <div className="space-y-2 mt-6 p-3 bg-slate-800/30 rounded">
              <div className="text-xs font-medium text-slate-300">Indicator Legend:</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span>Enemies Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full" />
                  <span>Neutral Mobs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                  <span>Other Players</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                • Red indicators pulse to draw attention to danger<br/>
                • Orange indicators show neutral/non-hostile creatures<br/>
                • Cyan indicators show player count in expanded view<br/>
                • Indicators stack when multiple types are present
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}