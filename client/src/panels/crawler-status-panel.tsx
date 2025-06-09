import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAvatarUrl } from "@/lib/avatarUtils";
import { expRequired } from "@/lib/progressionUtils";
import { Heart, Zap, Shield, Sword, Clock, Gauge, Package, Shirt, Gem } from "lucide-react";
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
              <span className="text-sm text-slate-300">Credits</span>
              <span className="text-sm font-mono text-green-400">
                {crawler.credits}
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
              <span className="text-sm text-slate-300">Attack</span>
              <span className="text-sm font-mono text-red-400">
                {crawler.attack}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Defense</span>
              <span className="text-sm font-mono text-blue-400">
                {crawler.defense}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Speed</span>
              <span className="text-sm font-mono text-green-400">
                {crawler.speed}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Wit</span>
              <span className="text-sm font-mono text-purple-400">
                {crawler.wit}
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

          {/* Power Bar */}
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-300">Power</span>
              <span className="text-xs text-cyan-400">
                {crawler.power}/{crawler.maxPower}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, (crawler.power / crawler.maxPower) * 100))}%`,
                }}
              />
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