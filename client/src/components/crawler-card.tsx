import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
/**
 * File: crawler-card.tsx
 * Responsibility: Displays individual crawler information in a card format with stats and status
 * Notes: Shows avatar, name, level, location, and key statistics for a single crawler
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatarUtils.ts";
import type { CrawlerWithDetails } from "@shared/schema";

interface CrawlerCardProps {
  crawler: CrawlerWithDetails;
}

export default function CrawlerCard({ crawler }: CrawlerCardProps) {
  const [, setLocation] = useLocation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400";
      case "resting":
        return "text-yellow-400";
      case "dead":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return "fas fa-circle";
      case "resting":
        return "fas fa-pause-circle";
      case "dead":
        return "fas fa-skull";
      default:
        return "fas fa-question-circle";
    }
  };

  const handleEnterCrawlerMode = () => {
    setLocation(`/crawler/${crawler.id}`);
  };

  const avatarUrl = getAvatarUrl(crawler.name, crawler.id);

  return (
    <Card className="bg-game-surface border-game-border h-full flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col">
        {/* Header with avatar, name, and status - Fixed height */}
        <div className="flex items-start justify-between mb-4 h-16">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarImage
                src={getAvatarUrl(crawler.name, crawler.serial)}
                alt={crawler.name}
              />
              <AvatarFallback className="bg-crawler text-white">
                {crawler.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white text-lg leading-tight truncate">
                {crawler.name}
              </h3>
              <p className="text-sm text-slate-400 font-medium truncate">
                {crawler.class.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${crawler.status === "active" ? "bg-green-400 animate-pulse" : crawler.status === "resting" ? "bg-yellow-400" : "bg-red-400"}`}
            ></div>
            <span
              className={`text-xs font-medium ${getStatusColor(crawler.status)}`}
            >
              {crawler.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Core Stats Grid - Fixed height with proper spacing */}
        <div className="mb-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">MGT</div>
              <div className="text-lg font-bold text-red-400">
                {crawler.might}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">AGI</div>
              <div className="text-lg font-bold text-green-400">
                {crawler.agility}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">END</div>
              <div className="text-lg font-bold text-blue-400">
                {crawler.endurance}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">INT</div>
              <div className="text-lg font-bold text-purple-400">
                {crawler.intellect}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">CHA</div>
              <div className="text-lg font-bold text-yellow-400">
                {crawler.charisma}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">WIS</div>
              <div className="text-lg font-bold text-cyan-400">
                {crawler.wisdom}
              </div>
            </div>
          </div>
        </div>

        {/* Background Story - Fixed height with overflow handling */}
        <div className="mb-4 p-3 bg-amber-900/10 rounded-lg border border-amber-700/30 h-24 overflow-hidden">
          <div className="text-xs text-amber-400 mb-1">Background</div>
          <p
            className="text-sm text-slate-300 leading-tight overflow-hidden text-ellipsis"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
            }}
          >
            {crawler.background}
          </p>
        </div>

        {/* Quick Stats - Fixed height */}
        <div className="space-y-2 mb-4 h-28">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Floor</span>
            <span className="text-sm font-mono text-red-400 font-bold">
              {crawler.currentFloor}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Health</span>
            <span className="text-sm font-mono text-green-400">
              {crawler.health}/{crawler.maxHealth}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Energy</span>
            <span className="text-sm font-mono text-blue-400">
              {crawler.energy}/{crawler.maxEnergy}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Power</span>
            <span className="text-sm font-mono text-orange-400">
              {crawler.power}/{crawler.maxPower}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Gold</span>
            <span className="text-sm font-mono text-yellow-400">
              {crawler.gold.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Action Button - Fixed at bottom */}
        <div className="mt-auto pt-4">
          {crawler.isAlive && crawler.status === "active" ? (
            <Button
              onClick={handleEnterCrawlerMode}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
            >
              <i className="fas fa-gamepad mr-2"></i>
              Enter Crawler Mode
            </Button>
          ) : crawler.status === "resting" ? (
            <Button
              disabled
              className="w-full bg-gray-600 text-gray-300 cursor-not-allowed border-0"
            >
              <i className="fas fa-bed mr-2"></i>
              Recovering...
            </Button>
          ) : (
            <Button
              disabled
              className="w-full bg-red-600 text-red-300 cursor-not-allowed border-0"
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