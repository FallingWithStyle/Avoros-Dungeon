/**
 * File: room-events-panel.tsx
 * Responsibility: Displays recent events and activities that occurred in the current room
 * Notes: Shows combat logs, item discoveries, and other room-specific events
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { CrawlerWithDetails } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Sword,
  Eye,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Users,
  Footprints,
  Heart,
  Skull,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CrawlerWithDetails } from "@shared/schema";
import { eventsSystem, type RoomEvent } from "@shared/events-system";

interface RoomEventsPanelProps {
  crawler: CrawlerWithDetails;
}

interface RoomData {
  room: {
    id: number;
    name: string;
  };
  playersInRoom: CrawlerWithDetails[];
}

export default function RoomEventsPanel({ crawler }: RoomEventsPanelProps) {
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch current room data to detect room changes
  const { data: roomData } = useQuery<RoomData>({
    queryKey: [`/api/crawlers/${crawler.id}/current-room`],
    refetchInterval: 5000,
  });

  // Subscribe to events system
  useEffect(() => {
    const unsubscribe = eventsSystem.subscribe((newEvents) => {
      setEvents(newEvents);
    });

    return unsubscribe;
  }, []);

  // Handle room changes
  useEffect(() => {
    if (roomData) {
      eventsSystem.onRoomChange(roomData.room.id, crawler.name, crawler.id);
    }
  }, [roomData?.room.id, crawler.name, crawler.id]);

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const getEventIcon = (event: RoomEvent) => {
    switch (event.type) {
      case "movement":
        if (event.direction === "north") return <ArrowUp className="w-3 h-3" />;
        if (event.direction === "south") return <ArrowDown className="w-3 h-3" />;
        if (event.direction === "east") return <ArrowRight className="w-3 h-3" />;
        if (event.direction === "west") return <ArrowLeft className="w-3 h-3" />;
        return <Footprints className="w-3 h-3" />;
      case "combat":
        // Check if it's a friendly outgoing attack (player attacking something)
        if (event.message.includes(`${crawler.name} attacks`) || 
            event.message.includes(`${crawler.name} uses`) ||
            event.message.includes(`${crawler.name} casts`)) {
          return <Sword className="w-3 h-3 text-blue-400" />; // Blue icon for friendly attacks
        }
        // Red icon for enemy attacks
        return <Sword className="w-3 h-3 text-red-400" />;
      case "discovery":
        return <Eye className="w-3 h-3" />;
      case "interaction":
        return <Users className="w-3 h-3" />;
      case "status":
        return <Heart className="w-3 h-3" />;
      case "death":
        return <Skull className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getEventColor = (event: RoomEvent) => {
    switch (event.type) {
      case "combat":
        return "text-red-400"; // Red text for all combat events
      case "discovery":
        return event.priority === "high" ? "text-red-400" : "text-green-400";
      case "movement":
        return "text-blue-400";
      case "interaction":
        return "text-purple-400";
      case "status":
        return "text-yellow-400";
      case "death":
        return event.victimType === "player" ? "text-red-600" : "text-orange-400";
      default:
        return "text-slate-300";
    }
  };

  const getEventBadgeStyle = (event: RoomEvent) => {
    switch (event.type) {
      case "movement":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "combat":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "discovery":
        return event.priority === "high"
          ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
          : "bg-green-500/20 text-green-300 border-green-500/30";
      case "interaction":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "status":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "death":
        return event.victimType === "player" 
          ? "bg-red-600/20 text-red-300 border-red-600/30"
          : "bg-orange-600/20 text-orange-300 border-orange-600/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 1000) return "Just now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Room Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48 w-full" ref={scrollRef}>
          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8">
                Waiting for room activity...
              </div>
            ) : (
              events.slice().reverse().map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-2 p-2 rounded bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/30 transition-colors duration-150"
                >
                  <div className={`${getEventColor(event)} flex-shrink-0`}>
                    {getEventIcon(event)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-slate-200 leading-snug flex-1">
                        {event.message}
                        {event.damage && (
                          <span className="text-red-400 font-medium ml-1">
                            (dealing {event.damage} damage)
                          </span>
                        )}
                      </p>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event.type === "combat" && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${getEventBadgeStyle(event)}`}
                      >
                        combat
                      </Badge>
                    )}
                    {event.type === "death" && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${getEventBadgeStyle(event)}`}
                      >
                        {event.victimType === "player" ? "player death" : "death"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-2">
            Room entered: {formatTimestamp(eventsSystem.getRoomEntryTime())}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Footprints className="w-3 h-3 text-blue-400" />
              Movement
            </span>
            <span className="flex items-center gap-1">
              <Sword className="w-3 h-3 text-red-400" />
              Combat
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-green-400" />
              Discovery
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" />
              Interaction
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-yellow-400" />
              Status
            </span>
            <span className="flex items-center gap-1">
              <Skull className="w-3 h-3 text-orange-400" />
              Death
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}