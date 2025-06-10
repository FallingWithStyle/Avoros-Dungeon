
/**
 * File: useKeyboardMovement.ts
 * Responsibility: WASD keyboard input detection for tactical movement
 * Notes: Converts keyboard input to movement commands like swipe gestures, with room transitions only at boundaries
 */

import { useEffect, useRef } from 'react';
import { combatSystem } from '@shared/combat-system';

interface KeyboardMovementProps {
  onRoomMovement: (direction: string) => void;
  availableDirections: string[];
  combatState: any;
  isEnabled?: boolean;
}

export function useKeyboardMovement({
  onRoomMovement,
  availableDirections,
  combatState,
  isEnabled = true
}: KeyboardMovementProps) {
  const keyPressedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const key = event.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) {
        return;
      }

      // Prevent repeated keydown events
      if (keyPressedRef.current.has(key)) {
        return;
      }

      event.preventDefault();
      keyPressedRef.current.add(key);

      const playerEntity = combatState.entities.find(e => e.id === "player");
      if (!playerEntity) {
        console.log("No player entity found for keyboard movement");
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

      const speed = 8; // Consistent with previous keyboard movement
      const newX = playerEntity.position.x + direction.x * speed;
      const newY = playerEntity.position.y + direction.y * speed;

      // Check if we can move to the new position for room transitions
      const canMoveInDirection = availableDirections.includes(directionName);

      // Simple boundary checks
      let finalX = newX;
      let finalY = newY;

      // Check for room transitions (when hitting boundaries with available exits)
      if (newX < 5 && canMoveInDirection && directionName === "west") {
        console.log("🎯 Keyboard: Moving to new room via west");
        onRoomMovement("west");
        return;
      }
      if (newX > 95 && canMoveInDirection && directionName === "east") {
        console.log("🎯 Keyboard: Moving to new room via east");
        onRoomMovement("east");
        return;
      }
      if (newY < 5 && canMoveInDirection && directionName === "north") {
        console.log("🎯 Keyboard: Moving to new room via north");
        onRoomMovement("north");
        return;
      }
      if (newY > 95 && canMoveInDirection && directionName === "south") {
        console.log("🎯 Keyboard: Moving to new room via south");
        onRoomMovement("south");
        return;
      }

      // Normal boundary clamping (keep player in room)
      finalX = Math.max(5, Math.min(95, newX));
      finalY = Math.max(5, Math.min(95, newY));

      // Only move if position actually changed
      if (Math.abs(finalX - playerEntity.position.x) > 0.1 || Math.abs(finalY - playerEntity.position.y) > 0.1) {
        console.log(`🎯 Keyboard: Moving within room ${directionName} to (${finalX.toFixed(1)}, ${finalY.toFixed(1)})`);
        combatSystem.queueMoveAction(playerEntity.id, { x: finalX, y: finalY });
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keyPressedRef.current.delete(key);
    };

    // Add keyboard event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      keyPressedRef.current.clear();
    };
  }, [isEnabled, availableDirections, onRoomMovement, combatState.entities]);

  return {
    // Return any utility functions that might be needed
  };
}
