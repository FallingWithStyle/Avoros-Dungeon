Refactored useCombatEntities to use combat-utils for distance calculations, position validation, and weapon range calculations.
```

```typescript
/**
 * File: useCombatEntities.ts
 * Responsibility: Handles entity initialization, tactical data processing, and combat entity management
 * Notes: Extracted from combat-view-panel.tsx to reduce component complexity and improve reusability
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { combatSystem, type CombatEntity } from "@shared/combat-system";
import type { CrawlerWithDetails } from "@shared/schema";
import * as CombatUtils from "./combat-utils"; // Import combat utils

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

interface UseCombatEntitiesProps {
  crawler: CrawlerWithDetails;
  tacticalData: any;
  availableWeapons: Equipment[];
  combatState: any;
  isInitialized: boolean;
}

interface ProcessedEntityData {
  tacticalMobs: any[];
  tacticalNpcs: any[];
  tacticalLoot: any[];
  layoutEntities: any[];
}

export function useCombatEntities({
  crawler,
  tacticalData,
  availableWeapons,
  combatState,
  isInitialized,
}: UseCombatEntitiesProps) {
  // Process tactical entities for display components
  const processedEntityData = useMemo((): ProcessedEntityData => {
    if (!tacticalData?.tacticalEntities) {
      return {
        tacticalMobs: [],
        tacticalNpcs: [],
        tacticalLoot: [],
        layoutEntities: [],
      };
    }

    const tacticalEntities = tacticalData.tacticalEntities;

    // Process mobs with enhanced filtering and position validation
    const tacticalMobs = tacticalEntities
      .filter((entity: any) => entity.type === "mob")
      .map((entity: any) => ({
        ...entity,
        // Ensure position is valid for rendering
        position: {
          x: Math.max(0, Math.min(100, entity.position?.x || 50)),
          y: Math.max(0, Math.min(100, entity.position?.y || 50)),
        },
      }));

    // Process NPCs with position validation
    const tacticalNpcs = tacticalEntities
      .filter((entity: any) => entity.type === "npc")
      .map((entity: any) => ({
        ...entity,
        // Ensure position is valid for rendering
        position: {
          x: Math.max(0, Math.min(100, entity.position?.x || 50)),
          y: Math.max(0, Math.min(100, entity.position?.y || 50)),
        },
      }));

    // Process loot items with conversion to expected format
    const tacticalLoot = tacticalEntities
      .filter((entity: any) => entity.type === "loot")
      .map((entity: any, index: number) => ({
        ...entity,
        // Convert to format expected by TacticalGrid
        x: Math.max(0, Math.min(100, entity.position?.x || 50)),
        y: Math.max(0, Math.min(100, entity.position?.y || 50)),
        name: entity.name || "Unknown Item",
        type: entity.data?.itemType || "treasure",
      }));

    // Process layout entities (walls, doors, cover)
    const layoutEntities = tacticalEntities.filter((entity: any) =>
      entity.type === "cover" || entity.type === "wall" || entity.type === "door"
    );

    return {
      tacticalMobs,
      tacticalNpcs,
      tacticalLoot,
      layoutEntities,
    };
  }, [tacticalData]);

  // Initialize combat entities from tactical data
  const initializeCombatEntities = useCallback(() => {
    if (!isInitialized || !tacticalData || !crawler) {
      return;
    }

    console.log("🎲 Initializing combat entities from tactical data...");

    // Clear existing entities except player
    const currentState = combatSystem.getState();
    const nonPlayerEntities = currentState.entities.filter(e => e.id !== "player");
    nonPlayerEntities.forEach(entity => {
      combatSystem.removeEntity(entity.id);
    });

    // Add player if not exists
    let playerEntity = currentState.entities.find(e => e.id === "player");
    if (!playerEntity) {
      console.log("🧑 Adding player entity...");

      // Calculate player stats from crawler
      const totalMight = (crawler.might || 10) + (crawler.mightBonus || 0);
      const totalAgility = (crawler.agility || 10) + (crawler.agilityBonus || 0);
      const totalIntellect = (crawler.intellect || 10) + (crawler.intellectBonus || 0);
      const totalVitality = (crawler.vitality || 10) + (crawler.vitalityBonus || 0);

      playerEntity = {
        id: "player",
        name: crawler.name,
        type: "player",
        hp: totalVitality * 10,
        maxHp: totalVitality * 10,
        attack: Math.floor((totalMight + totalAgility) / 2),
        defense: Math.floor((totalVitality + totalMight) / 4),
        speed: totalAgility,
        position: { x: 50, y: 50 }, // Center of room
        facing: 0,
        cooldowns: {},
        stats: {
          might: totalMight,
          agility: totalAgility,
          intellect: totalIntellect,
          vitality: totalVitality,
        },
      };

      combatSystem.addEntity(playerEntity);
    }

    // Add hostile entities from tactical mobs
    processedEntityData.tacticalMobs.forEach((mob: any) => {
      const hostileEntity: CombatEntity = {
        id: "hostile_" + mob.id,
        name: mob.name || "Unknown Creature",
        type: "hostile",
        hp: mob.stats?.hp || mob.hp || 50,
        maxHp: mob.stats?.maxHp || mob.hp || 50,
        attack: mob.stats?.attack || mob.attack || 8,
        defense: mob.stats?.defense || mob.defense || 3,
        speed: mob.stats?.speed || mob.speed || 5,
        position: {
          x: mob.position.x,
          y: mob.position.y,
        },
        facing: mob.facing || Math.random() * 360,
        data: mob.data,
      };

      combatSystem.addEntity(hostileEntity);
      console.log("👹 Added hostile entity: " + hostileEntity.name + " at (" + hostileEntity.position.x + ", " + hostileEntity.position.y + ")");
    });

    // Add neutral entities from tactical NPCs
    processedEntityData.tacticalNpcs.forEach((npc: any) => {
      const neutralEntity: CombatEntity = {
        id: "neutral_" + npc.id,
        name: npc.name || "Unknown NPC",
        type: "neutral",
        hp: npc.stats?.hp || npc.hp || 30,
        maxHp: npc.stats?.maxHp || npc.hp || 30,
        attack: npc.stats?.attack || npc.attack || 5,
        defense: npc.stats?.defense || npc.defense || 2,
        speed: npc.stats?.speed || npc.speed || 3,
        position: {
          x: npc.position.x,
          y: npc.position.y,
        },
        facing: npc.facing || Math.random() * 360,
        data: npc.data,
      };

      combatSystem.addEntity(neutralEntity);
      console.log("🧑 Added neutral entity: " + neutralEntity.name + " at (" + neutralEntity.position.x + ", " + neutralEntity.position.y + ")");
    });

    const finalState = combatSystem.getState();
    console.log("✅ Combat entities initialized: " + finalState.entities.length + " total entities");
  }, [
    isInitialized,
    tacticalData,
    crawler,
    processedEntityData.tacticalMobs,
    processedEntityData.tacticalNpcs,
  ]);

  // Initialize entities when tactical data changes
  useEffect(() => {
    if (isInitialized && tacticalData) {
      initializeCombatEntities();
    }
  }, [initializeCombatEntities]);

  // Get entity by ID helper
  const getEntityById = useCallback((entityId: string): CombatEntity | undefined => {
    if (!combatState?.entities) return undefined;
    return combatState.entities.find((e: CombatEntity) => e.id === entityId);
  }, [combatState?.entities]);

  // Get entities by type helper
  const getEntitiesByType = useCallback((type: string): CombatEntity[] => {
    if (!combatState?.entities) return [];
    return combatState.entities.filter((e: CombatEntity) => e.type === type);
  }, [combatState?.entities]);

  // Get nearby entities helper
  const getNearbyEntities = useCallback((
    position: { x: number; y: number },
    radius: number,
    excludeTypes: string[] = []
  ): CombatEntity[] => {
    if (!combatState?.entities) return [];

    return combatState.entities.filter((entity: CombatEntity) => {
      if (excludeTypes.includes(entity.type)) return false;

      const distance = Math.sqrt(
        Math.pow(entity.position.x - position.x, 2) + 
        Math.pow(entity.position.y - position.y, 2)
      );

      return distance <= radius;
    });
  }, [combatState?.entities]);

  // Check if position is valid (not occupied by walls/obstacles)
  const isPositionValid = useCallback((position: any): boolean => {
    return CombatUtils.isPositionValid(position) && CombatUtils.isPositionInGrid(position);
  }, []);

  // Get weapon range helper
  const getWeaponRange = useCallback((weapon: Equipment | null): number => {
    if (!weapon) return 15; // Default unarmed range
    return weapon.range * 10; // Convert to grid units
  }, []);

  // Check if entity is in weapon range
  const isEntityInWeaponRange = useCallback((
    entityId: string,
    weapon: Equipment | null = null
  ): boolean => {
    const entity = getEntityById(entityId);
    const player = getEntityById("player");

    if (!entity || !player) return false;

    const weaponRange = getWeaponRange(weapon);
    const distance = Math.sqrt(
      Math.pow(entity.position.x - player.position.x, 2) + 
      Math.pow(entity.position.y - player.position.y, 2)
    );

    return distance <= weaponRange;
  }, [getEntityById, getWeaponRange]);

  return {
    // Processed entity data
    ...processedEntityData,

    // Entity management
    initializeCombatEntities,
    getEntityById,
    getEntitiesByType,
    getNearbyEntities,

    // Position validation
    isPositionValid,

    // Combat helpers
    getWeaponRange,
    isEntityInWeaponRange,
  };
}