/**
 * File: useTacticalMovement.ts
 * Responsibility: Coordinate movement inputs from different devices and handle 360-degree movement logic
 * Notes: Acts as a central hub for all movement input types, supporting vector-based movement
 */

import { useCallback } from "react";
import { useIsMobile } from "./use-mobile";
import { useKeyboardMovement } from "./useKeyboardMovement";
import { useSwipeMovement } from "./useSwipeMovement";
import { combatSystem } from "@shared/combat-system";

interface UseTacticalMovementProps {
  effectiveTacticalData: any;
  combatState: any;
  onRoomMovement: (direction: string) => void;
}

export function useTacticalMovement({
  effectiveTacticalData,
  combatState,
  onRoomMovement,
}: UseTacticalMovementProps) {
  const isMobile = useIsMobile();
  const availableDirections = effectiveTacticalData?.availableDirections || [];

  // Unify movement speed for parity
  const speed = 3;

  // Central movement handler
  const handleMovement = useCallback(
    (direction: { x: number; y: number }) => {
      const playerEntity = combatState.entities?.find(
        (e: any) => e.id === "player",
      );
      if (!playerEntity) return;
      if (direction.x === 0 && direction.y === 0) return;

      const newX = playerEntity.position.x + direction.x * speed;
      const newY = playerEntity.position.y + direction.y * speed;

      // Check if player is trying to exit through a gate
      const gateWidth = 20; // Gate covers 20% of wall (centered)
      const gateStart = 40; // Gate starts at 40% 
      const gateEnd = 60;   // Gate ends at 60%

      // Check for room transition through gates
      let roomTransitionDirection = "";
      
      if (newY < 0 && availableDirections.includes("north")) {
        // Check if player is within north gate bounds (horizontally centered)
        if (playerEntity.position.x >= gateStart && playerEntity.position.x <= gateEnd) {
          roomTransitionDirection = "north";
        }
      } else if (newY > 100 && availableDirections.includes("south")) {
        // Check if player is within south gate bounds (horizontally centered)
        if (playerEntity.position.x >= gateStart && playerEntity.position.x <= gateEnd) {
          roomTransitionDirection = "south";
        }
      } else if (newX > 100 && availableDirections.includes("east")) {
        // Check if player is within east gate bounds (vertically centered)
        if (playerEntity.position.y >= gateStart && playerEntity.position.y <= gateEnd) {
          roomTransitionDirection = "east";
        }
      } else if (newX < 0 && availableDirections.includes("west")) {
        // Check if player is within west gate bounds (vertically centered)
        if (playerEntity.position.y >= gateStart && playerEntity.position.y <= gateEnd) {
          roomTransitionDirection = "west";
        }
      }

      if (roomTransitionDirection) {
        console.log("🚪 Room transition through gate: " + roomTransitionDirection);
        onRoomMovement(roomTransitionDirection);
        return;
      }

      // Clamp to boundaries - prevent walking through walls outside of gates
      const finalX = Math.max(5, Math.min(95, newX));
      const finalY = Math.max(5, Math.min(95, newY));

      if (
        Math.abs(finalX - playerEntity.position.x) > 0.1 ||
        Math.abs(finalY - playerEntity.position.y) > 0.1
      ) {
        combatSystem.queueMoveAction(playerEntity.id, { x: finalX, y: finalY });
      }
    },
    [availableDirections, combatState, onRoomMovement, speed],
  );

  useKeyboardMovement({
    onMovement: handleMovement,
    isEnabled: !isMobile, // Only for desktop
  });

  useSwipeMovement({
    onMovement: handleMovement,
    isEnabled: isMobile,
  });

  return {
    isMobile,
    handleMovement,
  };
}
