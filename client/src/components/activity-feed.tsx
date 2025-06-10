/**
 * File: activity-feed.tsx
 * Responsibility: Displays a real-time feed of recent game activities across all crawlers
 * Notes: Shows exploration, combat, and other significant events from all players
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActivityWithDetails } from "@shared/schema";

interface ActivityFeedProps {
  activities?: ActivityWithDetails[];
  isLoading?: boolean;
}

export default function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'combat_victory':
        return 'fas fa-sword text-green-400';
      case 'combat_defeat':
        return 'fas fa-skull text-red-400';
      case 'floor_advance':
        return 'fas fa-level-up-alt text-blue-400';
      case 'crawler_created':
        return 'fas fa-user-plus text-purple-400';
      case 'equipment_found':
        return 'fas fa-gem text-yellow-400';
      case 'exploration':
        return 'fas fa-search text-gray-400';
      case 'combat_start':
        return 'fas fa-fist-raised text-orange-400';
      case 'encounter_choice':
        return 'fas fa-dice text-cyan-400';
      default:
        return 'fas fa-info-circle text-blue-400';
    }
  };

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'combat_victory':
        return 'bg-green-600';
      case 'combat_defeat':
        return 'bg-red-600';
      case 'floor_advance':
        return 'bg-blue-600';
      case 'crawler_created':
        return 'bg-purple-600';
      case 'equipment_found':
        return 'bg-yellow-600';
      case 'exploration':
        return 'bg-gray-600';
      case 'combat_start':
        return 'bg-orange-600';
      case 'encounter_choice':
        return 'bg-cyan-600';
      default:
        return 'bg-blue-600';
    }
  };

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - activityDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  return (
    <Card className="bg-game-surface border-game-border">
      <CardHeader>
        <CardTitle className="text-white">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-4 p-4 bg-game-bg rounded-lg">
                <Skeleton className="w-10 h-10 rounded-lg bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 bg-gray-700 w-3/4" />
                  <Skeleton className="h-3 bg-gray-700 w-1/2" />
                </div>
                <Skeleton className="h-3 bg-gray-700 w-16" />
              </div>
            ))
          ) : activities && activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-4 bg-game-bg rounded-lg">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 ${getActivityBgColor(activity.type)} rounded-lg flex items-center justify-center`}>
                    <i className={`${getActivityIcon(activity.type)} text-white text-sm`}></i>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white">{activity.message}</p>
                    <span className="text-xs text-slate-400">{formatTimeAgo(activity.createdAt!)}</span>
                  </div>
                  {activity.type === 'encounter_choice' && activity.details?.results?.summary && (
                    <p className="text-xs text-cyan-300 mt-1 font-mono">
                      {activity.details.results.summary}
                    </p>
                  )}
                  {activity.crawler && (
                    <p className="text-xs text-slate-400 mt-1">
                      <span className="text-crawler font-medium">{activity.crawler.name}</span>
                      {activity.crawler.health && (
                        <> • Health: {activity.crawler.health}/{activity.crawler.maxHealth}</>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <i className="fas fa-clipboard-list text-4xl text-slate-400 mb-4"></i>
              <h3 className="text-lg font-semibold text-white mb-2">No Recent Activity</h3>
              <p className="text-slate-400">
                Deploy crawlers and start exploring to see activity here.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}