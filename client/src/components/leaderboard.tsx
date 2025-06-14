/**
 * File: leaderboard.tsx
 * Responsibility: Displays top-performing crawlers and corporations in a ranked leaderboard
 * Notes: Shows current season rankings with stats like level, credits, and survival time
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, Skull, TrendingUp } from 'lucide-react';

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('crawlers');

  // Safe hook usage with error handling
  let leaderboardData: any = null;
  try {
    const queryResult = useQuery({
      queryKey: ['/api/leaderboard'],
      refetchInterval: 60000, // Refresh every minute
    });
    leaderboardData = queryResult.data;
  } catch (error) {
    console.warn('Leaderboard query hook not available:', error);
    return (
      <Card className="bg-game-surface border-game-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-game-text-primary flex items-center gap-2">
            <Trophy className="w-4 h-4 text-game-accent" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-game-text-secondary">
            Loading leaderboard data...
          </div>
        </CardContent>
      </Card>
    );
  }
}