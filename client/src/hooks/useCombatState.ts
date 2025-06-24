/**
 * File: useCombatState.ts
 * Responsibility: Manages combat system state, subscriptions, and entity operations for combat view
 * Notes: Extracted from combat-view-panel.tsx to reduce component complexity and improve reusability
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { combatSystem, type CombatEntity } from "@shared/combat-system";
import type { CrawlerWithDetails } from "@shared/schema";

interface Equipment {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "armor";
  damageAttribute: "might" | "agility";
  range: number;
  mightBonus?: number;
  agilityBonus?: number;
  defenseBonus?: number;
}

interface UseCombatStateProps {
  crawler: CrawlerWithDetails;
  tacticalData: any;
  aiEnabled?: boolean;
  availableWeapons?: Equipment[];
}

export function useCombatState({
  crawler,
  tacticalData,
  aiEnabled = true,
  availableWeapons = []
}: UseCombatStateProps) {
  const [combatState, setCombatState] = useState(combatSystem.getState());
  const [isInitialized, setIsInitialized] = useState(false);
  const [, forceUpdate] = useState({});

  // Enhanced entity integration from tactical data with comprehensive management
  const initializeCombatSystem = useCallback(() => {
    console.log("🎮 Initializing combat system...");

    if (!tacticalData) {
      console.log("❌ No tactical data available for combat initialization");
      return;
    }

    // Always clear existing entities first to ensure clean slate
    combatSystem.clearEntities();

    // Get stored entry direction and calculate proper position
    const entryDirection = sessionStorage.getItem('entryDirection');
    let playerPosition: { x: number; y: number };

    if (entryDirection) {
      // Use room transition positioning logic
      switch (entryDirection.toLowerCase()) {
        case "north":
          // Player moved NORTH, so they enter from the SOUTH edge (bottom) of the new room
          playerPosition = { x: 50, y: 85 };
          break;
        case "south":
          // Player moved SOUTH, so they enter from the NORTH edge (top) of the new room
          playerPosition = { x: 50, y: 15 };
          break;
        case "east":
          // Player moved EAST, so they enter from the WEST edge (left) of the new room
          playerPosition = { x: 15, y: 50 };
          break;
        case "west":
          // Player moved WEST, so they enter from the EAST edge (right) of the new room
          playerPosition = { x: 85, y: 50 };
          break;
        default:
          playerPosition = { x: 50, y: 50 };
      }
      console.log(`🚪 Positioning player for ${entryDirection} entry at (${playerPosition.x}, ${playerPosition.y})`);

      // Clear the stored direction after using it
      sessionStorage.removeItem('entryDirection');
    } else {
      // Default center position for initial spawns
      playerPosition = { x: 50, y: 50 };
    }

    // Initialize player first to ensure they're always present
    combatSystem.initializePlayer(playerPosition, crawler);

    // Store room connection data for instant availability
    if (tacticalData?.availableDirections) {
      const roomConnections = tacticalData.roomConnections || 
        tacticalData.availableDirections.map((dir: string) => ({ direction: dir, isLocked: false }));
      combatSystem.setRoomConnections(roomConnections);
      console.log(`🚪 Loaded ${roomConnections.length} room exits: ${tacticalData.availableDirections.join(', ')}`);
    }

    // Immediately load tactical entities from cached data if available
    if (tacticalData?.tacticalEntities && Array.isArray(tacticalData.tacticalEntities)) {
      console.log(`🏃‍♂️ Loading ${tacticalData.tacticalEntities.length} cached tactical entities immediately...`);
      
      tacticalData.tacticalEntities.forEach((entity: any) => {
        try {
          const combatEntity = {
            id: entity.id || `entity-${Math.random().toString(36).substr(2, 9)}`,
            name: entity.name || entity.displayName || "Unknown Entity",
            type: entity.type === "mob" ? "hostile" : entity.type || "neutral",
            position: entity.position || { x: entity.x || 50, y: entity.y || 50 },
            facing: entity.facing || 0,
            
            // Health stats
            hp: entity.currentHealth || entity.hp || entity.hitPoints || 100,
            maxHp: entity.maxHealth || entity.maxHp || entity.hitPoints || 100,
            
            // Combat stats with proper fallbacks
            attack: entity.attack || Math.floor((entity.might || 10) * 1.2),
            defense: entity.defense || Math.floor((entity.endurance || 10) * 0.8),
            speed: entity.speed || Math.floor((entity.agility || 10) * 1.1),
            accuracy: (entity.wisdom || 10) + (entity.intellect || 10),
            evasion: Math.floor((entity.agility || 10) * 1.2),
            
            // Primary stats
            might: entity.might || 10,
            agility: entity.agility || 10,
            endurance: entity.endurance || 10,
            intellect: entity.intellect || 10,
            
            // Entity state
            level: entity.level || 1,
            isAlive: entity.isAlive !== false && (entity.hp || entity.currentHealth || 100) > 0,
            cooldowns: {},
            
            // Additional properties for specific entity types
            rarity: entity.rarity,
            disposition: entity.disposition,
            serial: entity.serial
          };
          
          combatSystem.addEntity(combatEntity);
        } catch (entityError) {
          console.warn(`Failed to load entity ${entity.name}:`, entityError);
        }
      });
      
      console.log(`✅ Loaded ${tacticalData.tacticalEntities.length} entities from cache immediately`);
    } else {
      console.log("⚠️ No cached tactical entities available for immediate loading");
    }

    setIsInitialized(true);
    console.log("✅ Combat system initialized successfully with cached entities");
  }, [tacticalData, crawler]);

  // Subscribe to combat system updates
  useEffect(() => {
    const unsubscribe = combatSystem.subscribe((state) => {
      setCombatState(state);
    });

    return unsubscribe;
  }, []);

  // Force re-render during cooldowns
  useEffect(() => {
    const interval = setInterval(() => {
      const player = combatState.entities.find((e) => e.id === "player");
      if (player?.cooldowns) {
        const now = Date.now();
        const hasActiveCooldowns = Object.values(player.cooldowns).some(
          (lastUsed) => {
            const timeSince = now - lastUsed;
            return timeSince < 5000;
          },
        );

        if (hasActiveCooldowns) {
          forceUpdate({});
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [combatState.entities]);

  // Enhanced room change handling with proper entity cleanup
  const handleRoomTransition = useCallback(() => {
    setIsInitialized(false);

    // Enhanced combat system cleanup for room transition
    combatSystem.endCombat();

    // Immediately clear ALL entities including player for clean slate
    const currentState = combatSystem.getState();
    const entityCount = currentState.entities.length;
    
    // Clear all entities completely
    combatSystem.clearEntities();
    
    console.log(`Cleared ${entityCount} entities for room transition`);

    // Clear room-specific data
    combatSystem.clearRoomData();
  }, []);

  // Get cooldown percentage for hotbar display
  const getCooldownPercentage = useCallback(
    (actionId: string): number => {
      const player = combatState.entities.find((e) => e.id === "player");
      if (!player || !player.cooldowns) return 0;

      const now = Date.now();
      const lastUsed = player.cooldowns[actionId] || 0;

      const cooldowns: Record<string, number> = {
        basic_attack: 800,
        defend: 3000,
        special: 5000,
      };

      const cooldown = cooldowns[actionId] || 1000;
      const timeLeft = Math.max(0, lastUsed + cooldown - now);
      return (timeLeft / cooldown) * 100;
    },
    [combatState.entities],
  );

  // Computed values
  const player = combatState.entities.find((e) => e.id === "player");
  const enemies = combatState.entities.filter((e) => e.type === "hostile");

  return {
    // State
    combatState,
    isInitialized,
    player,
    enemies,

    // Actions
    initializeCombatSystem,
    handleRoomTransition,
    getCooldownPercentage,
  };
}