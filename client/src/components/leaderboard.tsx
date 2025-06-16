/**
 * File: leaderboard.tsx
 * Responsibility: Displays top crawlers ranked by credits and progression
 * Notes: Shows rankings with avatars, levels, floors, and credit totals
 */

import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAvatarUrl } from "@/lib/avatarUtils";
import type { CrawlerWithDetails } from "@shared/schema";

// New function to get avatar URL or fallback
function getAvatar(name: string | null | undefined, serial: string | null | undefined): { imageUrl?: string; textFallback?: string } {
  if (name && serial) {
    return { imageUrl: getAvatarUrl(name, serial) }; // Use existing avatar URL generation
  } else {
    const fallbackText = `[${name || 'Unknown'}, ${serial || 'Unknown'}]`;
    return { textFallback: fallbackText };
  }
}

export default function Leaderboard() {
  const { data: topCrawlers, isLoading } = useQuery<CrawlerWithDetails[]>({
    queryKey: ["/api/leaderboards/crawlers"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-yellow-600';
      case 1:
        return 'bg-gray-500';
      case 2:
        return 'bg-amber-700';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="flex flex-col">
      <div className="p-4 border-b border-game-border">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <i className="fas fa-trophy mr-2"></i>
          Top Crawlers by Gold
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-6 h-6 rounded-full bg-gray-700" />
                <div className="space-y-1">
                  <Skeleton className="h-4 bg-gray-700 w-20" />
                  <Skeleton className="h-3 bg-gray-700 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 bg-gray-700 w-16" />
            </div>
          ))
        ) : topCrawlers && topCrawlers.length > 0 ? (
          topCrawlers.map((crawler, index) => (
            <div key={crawler.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full ${getRankColor(index)} flex items-center justify-center text-xs font-bold text-white`}>
                  {index + 1}
                </div>
                <Avatar className="w-8 h-8">
                  {(() => {
                    const avatar = getAvatar(crawler.name, crawler.serial);
                    if (avatar.imageUrl) {
                      return <AvatarImage src={avatar.imageUrl} alt={crawler.name || 'Unknown'} />;
                    }
                    return null;
                  })()}
                  <AvatarFallback className="bg-blue-600 text-xs">
                    {(() => {
                      const avatar = getAvatar(crawler.name, crawler.serial);
                      return avatar.textFallback || (crawler.name || 'Unknown').charAt(0).toUpperCase();
                    })()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-white">{crawler.name || 'Unknown Crawler'}</p>
                  <p className="text-xs text-slate-400">Floor {crawler.currentFloor} • Level {crawler.level}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-yellow-400">
                  {crawler.gold.toLocaleString()} gp
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-slate-400 py-8">
            <i className="fas fa-trophy text-2xl mb-2"></i>
            <p className="text-sm">No crawlers on the leaderboard yet.</p>
          </div>
        )}

        {topCrawlers && topCrawlers.length > 0 && (
          <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white mt-4">
            View Full Rankings
          </Button>
        )}
      </div>
    </div>
  );
}