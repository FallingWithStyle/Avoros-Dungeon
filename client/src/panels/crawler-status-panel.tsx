
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CrawlerWithDetails } from "@shared/schema";
import { expRequired } from "@/lib/progressionUtils";

interface CrawlerStatusPanelProps {
  crawler: CrawlerWithDetails;
}

export default function CrawlerStatusPanel({ crawler }: CrawlerStatusPanelProps) {
  const healthPercent = (crawler.health / crawler.maxHealth) * 100;
  const energyPercent = (crawler.energy / crawler.maxEnergy) * 100;
  const baseExp = 100;
  const expReq = expRequired(crawler.level, baseExp);
  const expPercent = Math.min((crawler.experience / expReq) * 100, 100);

  return (
    <>
      {/* Crawler Status */}
      <Card className="bg-game-surface border-game-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <i className="fas fa-heart mr-2 text-red-400"></i>
            Crawler Status
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

          {/* Stats */}
          <div className="space-y-2 pt-2 border-t border-game-border">
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
              <span className="text-sm font-mono text-pink-400">
                {crawler.charisma}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-300">Memory</span>
              <span className="text-sm font-mono text-cyan-400">
                {crawler.memory}
              </span>
            </div>
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

      {/* Equipment */}
      <Card className="bg-game-surface border-game-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <i className="fas fa-shield-alt mr-2 text-green-400"></i>
            Equipment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-400 py-8">
            <i className="fas fa-box-open text-3xl mb-2"></i>
            <p className="text-sm">No equipment equipped</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
