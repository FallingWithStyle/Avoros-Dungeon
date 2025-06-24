
/**
 * File: useCombatStatePreloader.ts
 * Responsibility: Preload combat system states for adjacent rooms to enable instant transitions
 */

import { useEffect, useCallback } from "react";
import { combatSystem } from "@shared/combat-system";
import { queryClient } from "@/lib/queryClient";
import type { CrawlerWithDetails } from "@shared/schema";

interface UseCombatStatePreloaderProps {
  crawler: CrawlerWithDetails;
  currentRoom: any;
  enabled?: boolean;
}

export function useCombatStatePreloader({
  crawler,
  currentRoom,
  enabled = true
}: UseCombatStatePreloaderProps) {
  
  const preloadAdjacentCombatStates = useCallback(async () => {
    if (!currentRoom || !enabled) return;
    
    try {
      // Get adjacent room data from cache
      const adjacentData = queryClient.getQueryData([`/api/crawlers/${crawler.id}/adjacent-rooms`]);
      
      if (adjacentData?.adjacentRooms) {
        adjacentData.adjacentRooms.forEach((roomData: any) => {
          if (roomData.distance === 1) { // Only preload immediate neighbors
            
            // Preload combat system state for this room
            const preloadedState = {
              isInCombat: false,
              entities: [
                {
                  id: "player",
                  name: crawler.name,
                  hp: crawler.hp,
                  maxHp: crawler.maxHp,
                  position: { x: 50, y: 50 }, // Default center position
                  facing: 0,
                  type: "player",
                  isPlayer: true
                }
              ],
              turn: 0,
              round: 1,
              roomId: roomData.room.id
            };
            
            // Cache the preloaded state
            combatSystem.setCachedState(roomData.room.id, preloadedState);
          }
        });
      }
      
    } catch (error) {
      console.log("Combat state preloader error:", error);
    }
  }, [crawler, currentRoom, enabled]);
  
  useEffect(() => {
    if (enabled) {
      preloadAdjacentCombatStates();
    }
  }, [preloadAdjacentCombatStates, enabled]);
  
  return { preloadAdjacentCombatStates };
}
