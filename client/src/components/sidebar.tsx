/**
 * File: sidebar.tsx
 * Responsibility: Main application sidebar with navigation links and user controls
 */
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, Home, User, Map, Trophy, Activity, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-game-surface border-r border-game-border hidden lg:block">
      <nav className="p-4 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start bg-blue-600 text-white hover:bg-blue-700"
        >
          <i className="fas fa-tachometer-alt w-5 h-5 mr-3"></i>
          Overview
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-game-bg hover:text-white"
        >
          <i className="fas fa-users w-5 h-5 mr-3"></i>
          My Crawlers
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-game-bg hover:text-white"
        >
          <i className="fas fa-store w-5 h-5 mr-3"></i>
          Marketplace
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-game-bg hover:text-white"
        >
          <i className="fas fa-trophy w-5 h-5 mr-3"></i>
          Leaderboards
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-game-bg hover:text-white"
        >
          <i className="fas fa-comments w-5 h-5 mr-3"></i>
          Command Chat
        </Button>
      </nav>

      {/* Sponsor Quick Stats */}
      <div className="p-4 border-t border-game-border mt-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">SPONSOR STATUS</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Reputation</span>
            <span className="text-sm font-mono text-sponsor">{user?.sponsorReputation || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Active Crawlers</span>
            <span className="text-sm font-mono text-green-400">0</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Total Sponsored</span>
            <span className="text-sm font-mono text-slate-300">0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}