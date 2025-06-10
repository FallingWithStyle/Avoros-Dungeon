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

      // Room transitions
      const gridSize = 100 / 15;
      const currentGridX = Math.round(playerEntity.position.x / gridSize);
      const currentGridY = Math.round(playerEntity.position.y / gridSize);
      const targetGridX = Math.round(newX / gridSize);
      const targetGridY = Math.round(newY / gridSize);

      let roomTransitionDirection = "";
      if (targetGridY < 0 && availableDirections.includes("north"))
        roomTransitionDirection = "north";
      else if (targetGridY > 14 && availableDirections.includes("south"))
        roomTransitionDirection = "south";
      else if (targetGridX > 14 && availableDirections.includes("east"))
        roomTransitionDirection = "east";
      else if (targetGridX < 0 && availableDirections.includes("west"))
        roomTransitionDirection = "west";

      if (roomTransitionDirection) {
        onRoomMovement(roomTransitionDirection);
        return;
      }

      // Clamp to boundaries
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
