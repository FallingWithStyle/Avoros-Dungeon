import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { CrawlerWithDetails } from "@shared/schema";

interface CrawlerCardProps {
  crawler: CrawlerWithDetails;
}

export default function CrawlerCard({ crawler }: CrawlerCardProps) {
  const [, setLocation] = useLocation();

  const healthPercent = (crawler.health / crawler.maxHealth) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'resting':
        return 'text-yellow-400';
      case 'dead':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return 'fas fa-circle';
      case 'resting':
        return 'fas fa-pause-circle';
      case 'dead':
        return 'fas fa-skull';
      default:
        return 'fas fa-question-circle';
    }
  };

  const handleEnterCrawlerMode = () => {
    setLocation(`/crawler/${crawler.id}`);
  };

  const getAvatarUrl = () => {
    // Generate a deterministic avatar based on crawler name and class
    const seed = crawler.name + crawler.class.name;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1e293b`;
  };

  return (
    <Card className="bg-game-surface border-game-border">
      <CardContent className="p-6">
        {/* Header with avatar, name, and status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={getAvatarUrl()} alt={crawler.name} />
              <AvatarFallback className="bg-crawler text-white">
                {crawler.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-white text-lg">{crawler.name}</h3>
              <p className="text-sm text-slate-400 font-medium">{crawler.class.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${crawler.status === 'active' ? 'bg-green-400 animate-pulse' : crawler.status === 'resting' ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
            <span className={`text-xs font-medium ${getStatusColor(crawler.status)}`}>
              {crawler.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Core Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">ATK</div>
            <div className="text-lg font-bold text-red-400">{crawler.attack}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">DEF</div>
            <div className="text-lg font-bold text-blue-400">{crawler.defense}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">SPD</div>
            <div className="text-lg font-bold text-green-400">{crawler.speed}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">WIT</div>
            <div className="text-lg font-bold text-purple-400">{crawler.wit}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">CHA</div>
            <div className="text-lg font-bold text-yellow-400">{crawler.charisma}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">MEM</div>
            <div className="text-lg font-bold text-cyan-400">{crawler.memory}</div>
          </div>
        </div>

        {/* Class Description */}
        <div className="mb-4 p-3 bg-slate-800/20 rounded-lg border border-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Class Specialty</div>
          <p className="text-sm text-slate-300">{crawler.class.description}</p>
        </div>

        {/* Background Story */}
        <div className="mb-4 p-3 bg-amber-900/10 rounded-lg border border-amber-700/30">
          <div className="text-xs text-amber-400 mb-1">Background</div>
          <p className="text-sm text-slate-300 leading-relaxed">{crawler.background}</p>
        </div>

        {/* Quick Stats */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Floor</span>
            <span className="text-sm font-mono text-crawler font-bold">{crawler.currentFloor}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Health</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2 bg-game-bg rounded-full overflow-hidden">
                <Progress value={healthPercent} className="h-full" />
              </div>
              <span className={`text-xs font-mono ${healthPercent > 60 ? 'text-green-400' : healthPercent > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                {crawler.health}/{crawler.maxHealth}
              </span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Energy</span>
            <span className="text-sm font-mono text-blue-400">{crawler.energy}/{crawler.maxEnergy}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Credits</span>
            <span className="text-sm font-mono text-green-400">{crawler.credits.toLocaleString()}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-game-border">
          {crawler.isAlive && crawler.status === 'active' ? (
            <Button
              onClick={handleEnterCrawlerMode}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <i className="fas fa-gamepad mr-2"></i>
              Enter Crawler Mode
            </Button>
          ) : crawler.status === 'resting' ? (
            <Button
              disabled
              className="w-full bg-gray-600 text-gray-300 cursor-not-allowed"
            >
              <i className="fas fa-bed mr-2"></i>
              Recovering...
            </Button>
          ) : (
            <Button
              disabled
              className="w-full bg-red-600 text-red-300 cursor-not-allowed"
            >
              <i className="fas fa-skull mr-2"></i>
              Deceased
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
