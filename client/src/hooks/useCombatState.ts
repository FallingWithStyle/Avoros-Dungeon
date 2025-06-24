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
    if (!crawler || !tacticalData) return;

    // Get current combat state and ensure clean initialization
    const currentState = combatSystem.getState();

    // Clear all existing entities except player to avoid duplicates
    currentState.entities.forEach(entity => {
      if (entity.id !== "player") {
        combatSystem.removeEntity(entity.id);
      }
    });

    // Initialize player position at center
    const playerPosition = { x: 50, y: 50 };

    // Check if player already exists and update position, or create new player
    const existingPlayer = currentState.entities.find(e => e.id === "player");
    if (existingPlayer) {
      combatSystem.updateEntity("player", { position: playerPosition });
    } else {
      // Initialize player with comprehensive crawler data
      combatSystem.initializePlayer(playerPosition, {
        name: crawler.name,
        serial: crawler.serial,
        currentHealth: crawler.currentHealth,
        maxHealth: crawler.maxHealth,
        currentEnergy: crawler.currentEnergy,
        maxEnergy: crawler.maxEnergy,
        currentPower: crawler.currentPower,
        maxPower: crawler.maxPower,
        level: crawler.level,
        might: crawler.might,
        agility: crawler.agility,
        endurance: crawler.endurance,
        intellect: crawler.intellect,
        charisma: crawler.charisma,
        wisdom: crawler.wisdom,
        attack: crawler.attack,
        defense: crawler.defense,
      });
    }

    // Update player equipment if available
    if (availableWeapons && availableWeapons.length > 0) {
      const equippedWeapon = availableWeapons.find(w => w.isEquipped);
      if (equippedWeapon) {
        combatSystem.updateEntity("player", { 
          equippedWeapon: equippedWeapon 
        });
      }
    }

    // Process and add tactical entities from server data with validation
    const tacticalEntities = tacticalData?.tacticalEntities || [];
    let entitiesAdded = 0;

    if (tacticalEntities && Array.isArray(tacticalEntities)) {
      tacticalEntities.forEach((tacticalEntity: any, index: number) => {
        // Validate entity data before processing
        if (!tacticalEntity || !tacticalEntity.type) {
          console.warn(`Skipping invalid tactical entity at index ${index}:`, tacticalEntity);
          return;
        }

        if (tacticalEntity.type === "mob") {
          // Enhanced mob entity creation with comprehensive combat stats
          const combatStats = tacticalEntity.combatStats || {};
          const entityData = tacticalEntity.data || {};

          const mobEntity: CombatEntity = {
            id: tacticalEntity.id || `mob_${entityData.id || index}_${Date.now()}`,
            name: tacticalEntity.name || entityData.name || "Unknown Mob",
            type: tacticalEntity.hostile !== false ? "hostile" : "neutral",

            // Enhanced health and resource management
            hp: combatStats.hp || entityData.hp || entityData.currentHealth || 100,
            maxHp: combatStats.maxHp || entityData.maxHp || entityData.maxHealth || 100,
            energy: combatStats.energy || entityData.energy || 20,
            maxEnergy: combatStats.maxEnergy || entityData.maxEnergy || 20,
            power: combatStats.power || entityData.power || 10,
            maxPower: combatStats.maxPower || entityData.maxPower || 10,

            // Enhanced primary stats from combat stats or entity data
            might: combatStats.might || entityData.might || 10,
            agility: combatStats.agility || entityData.agility || 10,
            endurance: combatStats.endurance || entityData.endurance || 10,
            intellect: combatStats.intellect || entityData.intellect || 10,
            charisma: combatStats.charisma || entityData.charisma || 10,
            wisdom: combatStats.wisdom || entityData.wisdom || 10,

            // Enhanced derived combat stats with proper calculations
            attack: combatStats.attack || entityData.attack || Math.floor((combatStats.might || entityData.might || 10) * 1.2),
            defense: combatStats.defense || entityData.defense || Math.floor((combatStats.endurance || entityData.endurance || 10) * 0.8),
            speed: combatStats.speed || entityData.speed || Math.floor((combatStats.agility || entityData.agility || 10) * 1.1),
            accuracy: (combatStats.wisdom || entityData.wisdom || 10) + (combatStats.intellect || entityData.intellect || 10),
            evasion: Math.floor((combatStats.agility || entityData.agility || 10) * 1.2),

            // Enhanced positioning with proper validation and fallback
            position: {
              x: Math.max(5, Math.min(95, tacticalEntity.position?.x || (20 + Math.random() * 60))),
              y: Math.max(5, Math.min(95, tacticalEntity.position?.y || (20 + Math.random() * 60)))
            },
            facing: Math.random() * 360, // Random initial facing

            level: combatStats.level || entityData.level || 1,
            isAlive: true,
            cooldowns: {}
          };

          // Add mob to combat system with validation
          try {
            combatSystem.addEntity(mobEntity);
            entitiesAdded++;
            console.log(`Added mob entity: ${mobEntity.name} at position (${mobEntity.position.x.toFixed(1)}, ${mobEntity.position.y.toFixed(1)})`);
          } catch (error) {
            console.error(`Failed to add mob entity ${mobEntity.name}:`, error);
          }

        } else if (tacticalEntity.type === "npc") {
          // Enhanced NPC entity creation
          const entityData = tacticalEntity.data || {};

          const npcEntity: CombatEntity = {
            id: tacticalEntity.id || `npc_${index}_${Date.now()}`,
            name: tacticalEntity.name || entityData.name || "Unknown NPC",
            type: "neutral",

            hp: 100,
            maxHp: 100,
            energy: 50,
            maxEnergy: 50,
            power: 25,
            maxPower: 25,

            might: 8,
            agility: 8,
            endurance: 12,
            intellect: 12,
            charisma: 15,
            wisdom: 12,

            attack: 10,
            defense: 15,
            speed: 8,
            accuracy: 24,
            evasion: 10,

            position: {
              x: Math.max(5, Math.min(95, tacticalEntity.position?.x || (30 + Math.random() * 40))),
              y: Math.max(5, Math.min(95, tacticalEntity.position?.y || (30 + Math.random() * 40)))
            },
            facing: Math.random() * 360,

            level: 1,
            isAlive: true,
            cooldowns: {}
          };

          // Add NPC to combat system with validation
          try {
            combatSystem.addEntity(npcEntity);
            entitiesAdded++;
            console.log(`Added NPC entity: ${npcEntity.name} at position (${npcEntity.position.x.toFixed(1)}, ${npcEntity.position.y.toFixed(1)})`);
          } catch (error) {
            console.error(`Failed to add NPC entity ${npcEntity.name}:`, error);
          }
        }
      });
    }

    console.log(`Combat system initialized: ${entitiesAdded} tactical entities added to combat system`);

    // Set room data in combat system for context
    if (tacticalData?.room) {
      combatSystem.setCurrentRoomData(tacticalData.room);
    }

    // Start AI loop if enabled and there are hostile entities
    if (aiEnabled) {
      const hostileCount = combatSystem.getState().entities.filter(e => e.type === "hostile").length;
      if (hostileCount > 0) {
        combatSystem.startAILoop();
        console.log(`AI enabled for ${hostileCount} hostile entities`);
      }
    }

    setIsInitialized(true);
  }, [
    crawler,
    aiEnabled,
    availableWeapons,
    tacticalData,
  ]);

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

    // Clear all entities except player, then clear room data
    const currentState = combatSystem.getState();
    const nonPlayerEntities = currentState.entities.filter(e => e.id !== "player");

    nonPlayerEntities.forEach(entity => {
      combatSystem.removeEntity(entity.id);
    });

    console.log(`Cleared ${nonPlayerEntities.length} entities for room transition`);

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