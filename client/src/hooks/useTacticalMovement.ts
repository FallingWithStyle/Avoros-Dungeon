/**
 * File: useTacticalMovement.ts
 * Responsibility: Handles WASD keyboard movement and room transitions in the tactical view
 * Notes: Manages player movement within rooms and between rooms via keyboard input
 */
import { useEffect, useCallback } from 'react';
import { combatSystem } from '@shared/combat-system';

interface UseTacticalMovementProps {
  effectiveTacticalData: any;
  combatState: any;
  onRoomMovement: (direction: string) => void;
}

export function useTacticalMovement({
  effectiveTacticalData,
  combatState,
  onRoomMovement
}: UseTacticalMovementProps) {

  // Simple WASD Movement with room transition detection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const key = event.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) {
        return;
      }

      event.preventDefault();

      const playerEntity = combatState.entities.find(e => e.id === "player");
      if (!playerEntity) {
        console.log("No player entity found for movement");
        return;
      }

      // Calculate direction based on key
      let direction = { x: 0, y: 0 };
      let directionName = "";

      switch (key) {
        case 'w':
          direction.y = -1;
          directionName = "north";
          break;
        case 's':
          direction.y = 1;
          directionName = "south";
          break;
        case 'a':
          direction.x = -1;
          directionName = "west";
          break;
        case 'd':
          direction.x = 1;
          directionName = "east";
          break;
      }

      const speed = 8; // Reasonable movement speed
      const newX = playerEntity.position.x + direction.x * speed;
      const newY = playerEntity.position.y + direction.y * speed;

      // Check if we can move to the new position
      const availableDirections = effectiveTacticalData?.availableDirections || [];
      const canMoveInDirection = availableDirections.includes(directionName);

      // Simple boundary checks
      let finalX = newX;
      let finalY = newY;

      // Check for room transitions (when hitting boundaries with available exits)
      if (newX < 5 && canMoveInDirection && directionName === "west") {
        console.log("Moving to new room via west");
        onRoomMovement("west");
        return;
      }
      if (newX > 95 && canMoveInDirection && directionName === "east") {
        console.log("Moving to new room via east");
        onRoomMovement("east");
        return;
      }
      if (newY < 5 && canMoveInDirection && directionName === "north") {
        console.log("Moving to new room via north");
        onRoomMovement("north");
        return;
      }
      if (newY > 95 && canMoveInDirection && directionName === "south") {
        console.log("Moving to new room via south");
        onRoomMovement("south");
        return;
      }

      // Normal boundary clamping (keep player in room)
      finalX = Math.max(5, Math.min(95, newX));
      finalY = Math.max(5, Math.min(95, newY));

      // Only move if position actually changed
      if (Math.abs(finalX - playerEntity.position.x) > 0.1 || Math.abs(finalY - playerEntity.position.y) > 0.1) {
        combatSystem.queueMoveAction(playerEntity.id, { x: finalX, y: finalY });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [combatState.entities, effectiveTacticalData?.availableDirections, onRoomMovement]);

  return {
    // Return any utility functions that might be needed
  };
}