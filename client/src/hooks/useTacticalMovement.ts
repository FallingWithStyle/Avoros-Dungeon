/**
 * File: useTacticalMovement.ts
 * Responsibility: Coordinate movement inputs from different devices and handle movement logic
 * Notes: Acts as a central hub for all movement input types, containing the actual movement mechanics
 */

import { useCallback } from 'react';
import { useIsMobile } from './use-mobile';
import { useKeyboardMovement } from './useKeyboardMovement';
import { useSwipeMovement } from './useSwipeMovement';
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
  const isMobile = useIsMobile();
  const availableDirections = effectiveTacticalData?.availableDirections || [];

  // Central movement handler - this is where all the movement logic lives
  const handleMovement = useCallback((direction: string) => {
    const playerEntity = combatState.entities?.find((e: any) => e.id === "player");
    if (!playerEntity) {
      console.log("No player entity found for movement");
      return;
    }

    // Calculate movement vector based on direction
    const directionVectors = {
      north: { x: 0, y: -1 },
      south: { x: 0, y: 1 },
      east: { x: 1, y: 0 },
      west: { x: -1, y: 0 },
    };

    const dir = directionVectors[direction as keyof typeof directionVectors];
    if (!dir) {
      console.log(`Invalid direction: ${direction}`);
      return;
    }

    // Check if this direction leads to a room transition
    if (availableDirections.includes(direction)) {
      // Convert current position to grid coordinates for boundary checks
      const gridSize = 100 / 15; // Each grid cell is ~6.67% of the total area
      const currentGridX = Math.round(playerEntity.position.x / gridSize);
      const currentGridY = Math.round(playerEntity.position.y / gridSize);

      // Calculate target grid position
      const targetGridX = currentGridX + dir.x;
      const targetGridY = currentGridY + dir.y;

      // Check if we're at a boundary that should trigger room movement
      const shouldMoveToNewRoom = 
        (direction === "north" && targetGridY < 0) ||
        (direction === "south" && targetGridY > 14) ||
        (direction === "east" && targetGridX > 14) ||
        (direction === "west" && targetGridX < 0);

      if (shouldMoveToNewRoom) {
        console.log(`🎯 Movement: Moving to new room via ${direction}`);
        onRoomMovement(direction);
        return;
      }
    }

    // Normal movement within the room
    const speed = 1; // Precise grid movement
    const newX = playerEntity.position.x + dir.x * speed;
    const newY = playerEntity.position.y + dir.y * speed;

    // Clamp to room boundaries for normal movement
    const finalX = Math.max(5, Math.min(95, newX));
    const finalY = Math.max(5, Math.min(95, newY));

    // Only move if position actually changed
    if (Math.abs(finalX - playerEntity.position.x) > 0.1 || Math.abs(finalY - playerEntity.position.y) > 0.1) {
      console.log(`🎯 Movement: Moving within room ${direction} to (${finalX}, ${finalY})`);
      combatSystem.queueMoveAction(playerEntity.id, { x: finalX, y: finalY });
    }
  }, [availableDirections, combatState, onRoomMovement]);

  // Set up keyboard movement (always enabled for desktop)
  useKeyboardMovement({
    onMovement: handleMovement,
    isEnabled: !isMobile // Disable on mobile to prevent conflicts
  });

  // Set up swipe movement for mobile
  const { containerRef } = useSwipeMovement({
    onMovement: handleMovement,
    isEnabled: isMobile
  });

  // TODO: Add controller movement hook here when implemented
  // useControllerMovement({
  //   onMovement: handleMovement,
  //   isEnabled: true
  // });

  return {
    containerRef, // For mobile swipe detection
    isMobile,
    // TODO: Add controller connection status when implemented
    // isControllerConnected: false
  };
}