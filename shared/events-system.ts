/**
 * File: events-system.ts
 * Responsibility: Manages real-time room event tracking and broadcasting system
 * Notes: Handles movement, combat, discovery, and death events with subscriber pattern for UI updates
 */
export type RoomEventType = 
  | "movement" 
  | "combat" 
  | "discovery" 
  | "interaction" 
  | "status"
  | "death";

export interface RoomEvent {
  id: string;
  type: RoomEventType;
  message: string;
  timestamp: number;
  priority: "low" | "medium" | "high";
  direction?: "north" | "south" | "east" | "west";
  damage?: number;
  entityId?: string;
  entityName?: string;
  killedBy?: string;
  victimType?: "player" | "mob" | "npc";
}

type EventsSubscriber = (events: RoomEvent[]) => void;

class EventsSystem {
  private events: RoomEvent[] = [];
  private subscribers: Set<EventsSubscriber> = new Set();
  private lastRoomId: number | null = null;
  private roomEntryTime: number = Date.now();

  subscribe(callback: EventsSubscriber): () => void {
    this.subscribers.add(callback);
    // Send current events immediately
    callback([...this.events]);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback([...this.events]));
  }

  addEvent(event: RoomEvent) {
    // Avoid duplicates
    if (this.events.find(e => e.id === event.id)) return;

    this.events.push(event);
    this.notifySubscribers();
  }

  clearEvents() {
    this.events = [];
    this.notifySubscribers();
  }

  onRoomChange(roomId: number, crawlerName: string, crawlerId: number) {
    if (roomId === this.lastRoomId) return;

    const now = Date.now();
    this.roomEntryTime = now;
    this.lastRoomId = roomId;

    // Clear events when entering a new room
    this.clearEvents();

    // Determine entry direction from stored movement direction
    let storedDirection = null;
    if (typeof window !== 'undefined') {
      storedDirection = sessionStorage.getItem("lastMovementDirection");
    }

    let entryMessage = `Crawler ${crawlerName} (#${crawlerId}) entered the room`;

    if (storedDirection && ["north", "south", "east", "west"].includes(storedDirection)) {
      const oppositeDirection = {
        north: "south",
        south: "north",
        east: "west",
        west: "east",
      }[storedDirection];
      entryMessage = `Crawler ${crawlerName} (#${crawlerId}) entered from the ${oppositeDirection}`;

      // Store the entry position for immediate use in combat system
      sessionStorage.setItem('entryDirection', storedDirection);
    }

    // Add entry event
    this.addEvent({
      id: `entry-${now}`,
      timestamp: now,
      type: "movement",
      message: entryMessage,
      entityId: "player",
      entityName: crawlerName,
      direction: (storedDirection && ["north", "south", "east", "west"].includes(storedDirection)) 
        ? storedDirection as "north" | "south" | "east" | "west" 
        : undefined,
      priority: "medium",
    });

    // Add discovery events after a brief delay
    setTimeout(() => {
      this.generateDiscoveryEvents(crawlerName, crawlerId, now);
    }, 1500);
  }

  private generateDiscoveryEvents(crawlerName: string, crawlerId: number, baseTime: number) {
    // Only generate events in client environment
    if (typeof window === 'undefined') return;

    import('./combat-system').then(({ combatSystem }) => {
      const combatState = combatSystem.getState();

      combatState.entities.forEach((entity) => {
        if (entity.id !== "player") {
          this.addEvent({
            id: `discovery-${entity.id}-${baseTime}`,
            timestamp: baseTime + 1500,
            type: "discovery",
            message:
              entity.type === "hostile"
                ? `Crawler ${crawlerName} (#${crawlerId}) notices a dangerous ${entity.name}`
                : `Crawler ${crawlerName} (#${crawlerId}) spots ${entity.name} in the room`,
            entityId: entity.id,
            entityName: entity.name,
            priority: entity.type === "hostile" ? "high" : "low",
          });
        }
      });
    }).catch(() => {
      // Combat system not available, skip
    });
  }

  onCombatAction(action: any, entityId: string, targetId?: string, damage?: number) {
    // Only generate events in client environment
    if (typeof window === 'undefined') return;

    import('./combat-system').then(({ combatSystem }) => {
      const combatState = combatSystem.getState();
      const entity = combatState.entities.find(e => e.id === entityId);
      const target = targetId ? combatState.entities.find(e => e.id === targetId) : null;

      if (!entity) return;

      const eventId = `action-${entityId}-${Date.now()}`;

      let message: string;
      let eventType: "movement" | "combat" | "discovery" | "interaction" | "status";
      let priority: "low" | "medium" | "high";

      if (action.type === "move") {
        message = `${entity.id === "player" ? `Crawler ${entity.name}` : entity.name} moved to a new position`;
        eventType = "movement";
        priority = "low";
      } else {
        message = target
          ? `${entity.id === "player" ? `Crawler ${entity.name}` : entity.name} used ${action.name} on ${target.name}`
          : `${entity.id === "player" ? `Crawler ${entity.name}` : entity.name} used ${action.name}`;
        eventType = "combat";
        priority = action.type === "attack" ? "high" : "medium";
      }

      this.addEvent({
        id: eventId,
        timestamp: Date.now(),
        type: eventType,
        message,
        entityId: entity.id,
        entityName: entity.name,
        damage,
        priority,
      });
    }).catch(() => {
      // Combat system not available, skip
    });
  }

  // Combat events
  onCombatStart(attackerName: string, defenderName: string): void {
    this.addEvent({
      id: `combat-start-${Date.now()}`,
      type: "combat",
      message: `${attackerName} attacks ${defenderName}!`,
      timestamp: Date.now(),
      priority: "medium",
    });
  }

  onCombatDamage(attackerName: string, defenderName: string, damage: number): void {
    this.addEvent({
      id: `combat-damage-${Date.now()}`,
      type: "combat",
      message: `${attackerName} deals damage to ${defenderName}`,
      timestamp: Date.now(),
      priority: "medium",
      damage,
    });
  }

  onCombatEnd(winnerName: string): void {
    this.addEvent({
      id: `combat-end-${Date.now()}`,
      type: "combat",
      message: `Combat ends - ${winnerName} is victorious!`,
      timestamp: Date.now(),
      priority: "high",
    });
  }

  // Death events
  onMobDeath(mobName: string, killerName: string): void {
    this.addEvent({
      id: `mob-death-${Date.now()}`,
      type: "death",
      message: `${mobName} has been slain by ${killerName}!`,
      timestamp: Date.now(),
      priority: "high",
      entityName: mobName,
      killedBy: killerName,
      victimType: "mob",
    });
  }

  onCrawlerDeath(crawlerName: string, killerName?: string): void {
    const message = killerName 
      ? `${crawlerName} has been killed by ${killerName}!`
      : `${crawlerName} has died!`;

    this.addEvent({
      id: `crawler-death-${Date.now()}`,
      type: "death",
      message,
      timestamp: Date.now(),
      priority: "high",
      entityName: crawlerName,
      killedBy: killerName,
      victimType: "player",
    });
  }

  onNpcDeath(npcName: string, killerName: string): void {
    this.addEvent({
      id: `npc-death-${Date.now()}`,
      type: "death",
      message: `${npcName} has been killed by ${killerName}!`,
      timestamp: Date.now(),
      priority: "high",
      entityName: npcName,
      killedBy: killerName,
      victimType: "npc",
    });
  }

  getRoomEntryTime(): number {
    return this.roomEntryTime;
  }
}

export const eventsSystem = new EventsSystem();