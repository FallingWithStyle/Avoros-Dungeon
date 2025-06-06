
export interface RoomEvent {
  id: string;
  timestamp: number;
  type: "movement" | "combat" | "discovery" | "interaction" | "status";
  message: string;
  entityId?: string;
  entityName?: string;
  targetId?: string;
  targetName?: string;
  damage?: number;
  direction?: string;
  priority: "low" | "medium" | "high";
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
    const storedDirection = typeof sessionStorage !== 'undefined' 
      ? sessionStorage.getItem("lastMovementDirection") 
      : null;
    let entryMessage = `Crawler ${crawlerName} (#${crawlerId}) entered the room`;

    if (storedDirection && ["north", "south", "east", "west"].includes(storedDirection)) {
      const oppositeDirection = {
        north: "south",
        south: "north",
        east: "west",
        west: "east",
      }[storedDirection];
      entryMessage = `Crawler ${crawlerName} (#${crawlerId}) entered from the ${oppositeDirection}`;
    }

    // Add entry event
    this.addEvent({
      id: `entry-${now}`,
      timestamp: now,
      type: "movement",
      message: entryMessage,
      entityId: "player",
      entityName: crawlerName,
      direction: storedDirection || undefined,
      priority: "medium",
    });

    // Add discovery events after a brief delay
    setTimeout(() => {
      this.generateDiscoveryEvents(crawlerName, crawlerId, now);
    }, 1500);
  }

  private async generateDiscoveryEvents(crawlerName: string, crawlerId: number, baseTime: number) {
    // Only generate discovery events if we have access to combat system
    try {
      const { combatSystem } = await import("./combat-system");
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
    } catch (error) {
      // Combat system not available, skip discovery events
      console.log("Combat system not available for discovery events");
    }
  }

  onCombatAction(action: any, entityId: string, targetId?: string, damage?: number) {
    const eventId = `action-${entityId}-${Date.now()}`;
    
    let message: string;
    let eventType: "movement" | "combat" | "discovery" | "interaction" | "status";
    let priority: "low" | "medium" | "high";

    // Get entity information if available
    let entityName = entityId;
    let targetName = targetId;

    try {
      // Try to get combat system for entity details
      const { combatSystem } = require("./combat-system");
      const combatState = combatSystem.getState();
      const entity = combatState.entities.find((e: any) => e.id === entityId);
      const target = targetId ? combatState.entities.find((e: any) => e.id === targetId) : null;
      
      if (entity) {
        entityName = entity.name;
      }
      if (target) {
        targetName = target.name;
      }
    } catch (error) {
      // Combat system not available, use IDs as names
    }

    if (action.type === "move") {
      message = `${entityId === "player" ? `Crawler ${entityName}` : entityName} moved to a new position`;
      eventType = "movement";
      priority = "low";
    } else {
      message = targetName
        ? `${entityId === "player" ? `Crawler ${entityName}` : entityName} used ${action.name} on ${targetName}`
        : `${entityId === "player" ? `Crawler ${entityName}` : entityName} used ${action.name}`;
      eventType = "combat";
      priority = action.type === "attack" ? "high" : "medium";
    }

    this.addEvent({
      id: eventId,
      timestamp: Date.now(),
      type: eventType,
      message,
      entityId: entityId,
      entityName: entityName,
      targetId: targetId,
      targetName: targetName,
      damage,
      priority,
    });
  }

  getRoomEntryTime(): number {
    return this.roomEntryTime;
  }
}

export const eventsSystem = new EventsSystem();
