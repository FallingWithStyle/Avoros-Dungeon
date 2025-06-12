/**
 * File: sponsor-view.tsx  
 * Responsibility: Main sponsor dashboard view with crawler management and game overview
 * Notes: Combines multiple panels and components for comprehensive sponsor interface
 */

import React from "react";
import { Toaster } from "@/components/ui/toaster";
import GameHeader from "@/components/game-header";
import CrawlerSelection from "@/components/crawler-selection";
import SeasonStatus from "@/components/season-status";
import Leaderboard from "@/components/leaderboard";
import ActivityFeed from "@/components/activity-feed";
import RedisStatusIndicator from "@/components/redis-status-indicator";

function SponsorView() {
  return (
    <div className="min-h-screen bg-slate-900">
      <GameHeader />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Top Status Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <SeasonStatus />
          <RedisStatusIndicator />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Crawler Selection */}
          <div className="lg:col-span-2">
            <CrawlerSelection />
          </div>

          {/* Right Column - Leaderboard */}
          <div>
            <Leaderboard />
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <ActivityFeed />
        </div>
      </div>

      <Toaster />
    </div>
  );
}

export default SponsorView;