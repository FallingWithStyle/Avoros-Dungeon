/**
 * File: useTacticalMovement.ts
 * Responsibility: Coordinate movement inputs from different devices and handle 360-degree movement logic
 * Notes: Acts as a central hub for all movement input types, supporting vector-based movement
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

  // Central movement handler - now handles vector-based movement
  const handleMovement = useCallback((direction: { x: number; y: number }) => {
    const playerEntity = combatState.entities?.find((e: any) => e.id === "player");
    if (!playerEntity) {
      console.log("No player entity found for movement");
      return;
    }

    // Skip if no movement
    if (direction.x === 0 && direction.y === 0) return;

    const speed = isMobile ? 2 : 4; // Faster speed for desktop, slower for mobile  
    const newX = playerEntity.position.x + direction.x * speed;
    const newY = playerEntity.position.y + direction.y * speed;

    // Check for room boundaries and transitions
    const gridSize = 100 / 15; // Each grid cell is ~6.67% of the total area
    const currentGridX = Math.round(playerEntity.position.x / gridSize);
    const currentGridY = Math.round(playerEntity.position.y / gridSize);
    const targetGridX = Math.round(newX / gridSize);
    const targetGridY = Math.round(newY / gridSize);

    // Determine cardinal direction for room transitions
    let roomTransitionDirection = '';
    if (targetGridY < 0 && availableDirections.includes('north')) {
      roomTransitionDirection = 'north';
    } else if (targetGridY > 14 && availableDirections.includes('south')) {
      roomTransitionDirection = 'south';
    } else if (targetGridX > 14 && availableDirections.includes('east')) {
      roomTransitionDirection = 'east';
    } else if (targetGridX < 0 && availableDirections.includes('west')) {
      roomTransitionDirection = 'west';
    }

    // Handle room transitions
    if (roomTransitionDirection) {
      console.log("🎯 Movement: Moving to new room via " + roomTransitionDirection);
      onRoomMovement(roomTransitionDirection);
      return;
    }

    // Clamp to room boundaries for normal movement
    const finalX = Math.max(5, Math.min(95, newX));
    const finalY = Math.max(5, Math.min(95, newY));

    // Only move if position actually changed
    if (Math.abs(finalX - playerEntity.position.x) > 0.1 || Math.abs(finalY - playerEntity.position.y) > 0.1) {
      combatSystem.queueMoveAction(playerEntity.id, { x: finalX, y: finalY });
    }
  }, [availableDirections, combatState, onRoomMovement]);

  // Set up keyboard movement (always enabled for desktop)
  useKeyboardMovement({
    onMovement: handleMovement,
    isEnabled: !isMobile // Disable on mobile to prevent conflicts
  });

  useSwipeMovement({
        onMovement: handleMovement,
        isEnabled: isMobile
  });

  return {
    isMobile,
    handleMovement, // Export the movement handler for other hooks to use
  };
}