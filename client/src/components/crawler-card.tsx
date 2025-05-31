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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={getAvatarUrl()} alt={crawler.name} />
              <AvatarFallback className="bg-crawler text-white">
                {crawler.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-white">{crawler.name}</h3>
              <p className="text-sm text-slate-400">{crawler.class.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${crawler.status === 'active' ? 'bg-green-400 animate-pulse' : crawler.status === 'resting' ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
            <span className={`text-xs font-medium ${getStatusColor(crawler.status)}`}>
              {crawler.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Floor</span>
            <span className="text-sm font-mono text-crawler font-bold">{crawler.currentFloor}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Health</span>
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
            <span className="text-sm text-slate-300">Credits Earned</span>
            <span className="text-sm font-mono text-green-400">{crawler.credits.toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-game-border">
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
