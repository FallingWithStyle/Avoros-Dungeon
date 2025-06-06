import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  Sword, 
  Shield, 
  Eye, 
  ArrowDown, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  Users,
  Skull,
  Heart,
  Zap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { CrawlerWithDetails } from "@shared/schema";
import { combatSystem } from "@/features/combat/combat-system";
import { useEffect, useState, useRef } from "react";

interface RoomEventsPanelProps {
  crawler: CrawlerWithDetails;
}

interface RoomEvent {
  id: string;
  timestamp: number;
  type: 'movement' | 'combat' | 'discovery' | 'interaction' | 'status';
  message: string;
  entityId?: string;
  entityName?: string;
  targetId?: string;
  targetName?: string;
  damage?: number;
  direction?: string;
  priority: 'low' | 'medium' | 'high';
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
  const [lastRoomId, setLastRoomId] = useState<number | null>(null);
  const [roomEntryTime, setRoomEntryTime] = useState<number>(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch current room data
  const { data: roomData } = useQuery<RoomData>({
    queryKey: [`/api/crawlers/${crawler.id}/current-room`],
    refetchInterval: 5000,
  });

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  // Subscribe to combat system events for real-time updates
  useEffect(() => {
    const unsubscribe = combatSystem.subscribe((state) => {
      const now = Date.now();

      // Track new combat actions
      state.actionQueue.forEach(queuedAction => {
        const existingEvent = events.find(e => 
          e.id === `action-${queuedAction.entityId}-${queuedAction.queuedAt}`
        );

        if (!existingEvent && queuedAction.queuedAt >= roomEntryTime) {
          const entity = state.entities.find(e => e.id === queuedAction.entityId);
          const target = queuedAction.targetId ? 
            state.entities.find(e => e.id === queuedAction.targetId) : null;

          if (entity) {
            const newEvent: RoomEvent = {
              id: `action-${queuedAction.entityId}-${queuedAction.queuedAt}`,
              timestamp: queuedAction.queuedAt,
              type: 'combat',
              message: target ? 
                `${entity.id === 'player' ? `Crawler ${entity.name} (#${crawler.id})` : entity.name} used ${queuedAction.action.name} on ${target.name}` :
                `${entity.id === 'player' ? `Crawler ${entity.name} (#${crawler.id})` : entity.name} used ${queuedAction.action.name}`,
              entityId: entity.id,
              entityName: entity.name,
              targetId: target?.id,
              targetName: target?.name,
              damage: queuedAction.action.damage,
              priority: queuedAction.action.type === 'attack' ? 'high' : 'medium'
            };

            setEvents(prev => {
              // Avoid duplicates
              if (prev.find(e => e.id === newEvent.id)) return prev;
              return [...prev, newEvent];
            });
          }
        }
      });
    });

    return unsubscribe;
  }, [roomEntryTime]);

  // Handle room changes and generate entry events
  useEffect(() => {
    if (roomData && roomData.room.id !== lastRoomId) {
      const now = Date.now();
      setRoomEntryTime(now);

      // Clear events when entering a new room
      setEvents([]);

      // Determine entry direction from stored movement direction
      const storedDirection = sessionStorage.getItem('lastMovementDirection');
      let entryMessage = `Crawler ${crawler.name} (#${crawler.id}) entered the room`;

      if (storedDirection && ['north', 'south', 'east', 'west'].includes(storedDirection)) {
        const oppositeDirection = {
          'north': 'south',
          'south': 'north',
          'east': 'west',
          'west': 'east'
        }[storedDirection];
        entryMessage = `Crawler ${crawler.name} (#${crawler.id}) entered from the ${oppositeDirection}`;
      }

      // Add entry event
      const entryEvent: RoomEvent = {
        id: `entry-${now}`,
        timestamp: now,
        type: 'movement',
        message: entryMessage,
        entityId: 'player',
        entityName: crawler.name,
        direction: storedDirection || undefined,
        priority: 'medium'
      };

      setEvents([entryEvent]);
      setLastRoomId(roomData.room.id);

      // Add events for discovering entities in the room after a brief delay
      setTimeout(() => {
        const combatState = combatSystem.getState();
        const discoveryEvents: RoomEvent[] = [];

        combatState.entities.forEach(entity => {
          if (entity.id !== 'player') {
            discoveryEvents.push({
              id: `discovery-${entity.id}-${now}`,
              timestamp: now + 1500, // Slight delay after entry
              type: 'discovery',
              message: entity.type === 'hostile' ? 
                `Crawler ${crawler.name} (#${crawler.id}) notices a dangerous ${entity.name}` :
                `Crawler ${crawler.name} (#${crawler.id}) spots ${entity.name} in the room`,
              entityId: entity.id,
              entityName: entity.name,
              priority: entity.type === 'hostile' ? 'high' : 'low'
            });
          }
        });

        if (discoveryEvents.length > 0) {
          setEvents(prev => [...prev, ...discoveryEvents]);
        }
      }, 1500);
    }
  }, [roomData, lastRoomId, crawler.name]);

  const getEventIcon = (event: RoomEvent) => {
    switch (event.type) {
      case 'movement':
        if (event.direction === 'north') return <ArrowUp className="w-3 h-3" />;
        if (event.direction === 'south') return <ArrowDown className="w-3 h-3" />;
        if (event.direction === 'east') return <ArrowRight className="w-3 h-3" />;
        if (event.direction === 'west') return <ArrowLeft className="w-3 h-3" />;
        return <Zap className="w-3 h-3" />;
      case 'combat':
        return <Sword className="w-3 h-3" />;
      case 'discovery':
        return <Eye className="w-3 h-3" />;
      case 'interaction':
        return <Users className="w-3 h-3" />;
      case 'status':
        return <Heart className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getEventColor = (event: RoomEvent) => {
    switch (event.type) {
      case 'combat':
        return 'text-red-400';
      case 'discovery':
        return event.priority === 'high' ? 'text-orange-400' : 'text-green-400';
      case 'movement':
        return 'text-blue-400';
      case 'interaction':
        return 'text-purple-400';
      case 'status':
        return 'text-yellow-400';
      default:
        return 'text-slate-300';
    }
  };

  const getEventBadgeStyle = (event: RoomEvent) => {
    switch (event.type) {
      case 'movement':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'combat':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'discovery':
        return event.priority === 'high' 
          ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
          : 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'interaction':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'status':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Room Events
          </div>
          <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
            {events.length} events
          </Badge>
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
              events.map((event) => (
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
                        {new Date(event.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event.type === 'combat' && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getEventBadgeStyle(event)}`}
                      >
                        combat
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
            Room entered: {formatTimestamp(roomEntryTime)}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-400" />
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}