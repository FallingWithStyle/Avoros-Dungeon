/**
 * File: crawler-status-panel.tsx
 * Responsibility: Displays crawler vitals, stats, and equipment in a comprehensive status overview
 * Notes: Shows health, energy, power, experience bars, combat stats, and equipment slots
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAvatarUrl } from "@/lib/avatarUtils";
import { expRequired } from "@/lib/progressionUtils";
import { 
  Heart, 
  Zap, 
  User, 
  Package, 
  Sword, 
  Shield, 
  HardHat,
  Shirt as ShirtIcon
} from "lucide-react";
import type { CrawlerWithDetails } from "@shared/schema";

interface CrawlerStatusPanelProps {
  crawler: CrawlerWithDetails;
}

export default function CrawlerStatusPanel({ crawler }: CrawlerStatusPanelProps) {
  const healthPercent = (crawler.health / crawler.maxHealth) * 100;
  const energyPercent = (crawler.energy / crawler.maxEnergy) * 100;
  const baseExp = 100;
  const expReq = expRequired(crawler.level, baseExp);
  const expPercent = Math.min((crawler.experience / expReq) * 100, 100);

  // Equipment slot configuration for future expansion
  const equipmentSlots = [
    { id: 'weapon', name: 'Weapon', icon: Sword, equipped: false },
    { id: 'armor', name: 'Armor', icon: Shield, equipped: false },
    { id: 'accessory', name: 'Accessory', icon: Gem, equipped: false },
  ];

  return (
    <div className="space-y-6">
      {/* Crawler Status & Vitals */}
      <Card className="bg-game-surface border-game-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Heart className="w-4 h-4 mr-2 text-red-400" />
            Status & Vitals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Health Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">Health</span>
              <span className="text-white">
                {crawler.health}/{crawler.maxHealth}
              </span>
            </div>
            <Progress
              value={healthPercent}
              className="h-2"
              barColor="#ef4444"
            />
          </div>

          {/* Energy Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">Energy</span>
              <span className="text-white">
                {crawler.energy}/{crawler.maxEnergy}
              </span>
            </div>
            <Progress
              value={energyPercent}
              className="h-2"
              barColor="#38bdf8"
            />
          </div>

          {/* Power Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">Power</span>
              <span className="text-white">
                {crawler.power}/{crawler.maxPower}
              </span>
            </div>
            <Progress
              value={(crawler.power / crawler.maxPower) * 100}
              className="h-2"
              barColor="#f97316"
            />
          </div>

          {/* Experience Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-300">Experience</span>
              <span className="text-white">
                {crawler.experience}/{expReq}
              </span>
            </div>
            <Progress
              value={expPercent}
              className="h-2"
              barColor="#facc15"
            />
          </div>

          {/* Inventory Info */}
          <div className="pt-2 border-t border-game-border">
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Gold</span>
              <span className="text-sm font-mono text-yellow-400">
                {crawler.gold}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Combat Stats */}
      <Card className="bg-game-surface border-game-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Sword className="w-4 h-4 mr-2 text-orange-400" />
            Combat Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Might</span>
              <span className="text-sm font-mono text-red-400">
                {crawler.might}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Agility</span>
              <span className="text-sm font-mono text-green-400">
                {crawler.agility}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Endurance</span>
              <span className="text-sm font-mono text-blue-400">
                {crawler.endurance}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Intellect</span>
              <span className="text-sm font-mono text-purple-400">
                {crawler.intellect}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Charisma</span>
              <span className="text-sm font-mono text-yellow-400">
                {crawler.charisma}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Wisdom</span>
              <span className="text-sm font-mono text-cyan-400">
                {crawler.wisdom}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Slots */}
      <Card className="bg-game-surface border-game-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Package className="w-4 h-4 mr-2 text-green-400" />
            Equipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {equipmentSlots.map((slot) => {
              const IconComponent = slot.icon;
              return (
                <div key={slot.id} className="flex items-center justify-between p-2 border border-game-border rounded bg-game-bg/30">
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">{slot.name}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {slot.equipped ? "Equipped" : "Empty"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Future expansion note */}
          <div className="mt-3 text-center text-slate-500 text-xs">
            Equipment system coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  );
}