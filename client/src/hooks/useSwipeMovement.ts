/**
 * File: useSwipeMovement.ts
 * Responsibility: Touch gesture detection for mobile tactical movement
 * Notes: Converts swipe gestures to tactical positioning movement like WASD, with room transitions only at boundaries
 */

import { useEffect, useRef } from 'react';
import { useIsMobile } from './use-mobile';
import { combatSystem } from '@shared/combat-system';

interface SwipeMovementProps {
  onRoomMovement: (direction: string) => void;
  availableDirections: string[];
  combatState: any;
  isEnabled?: boolean;
}

interface TouchPosition {
  x: number;
  y: number;
}

export function useSwipeMovement({
  onRoomMovement,
  availableDirections,
  combatState,
  isEnabled = true
}: SwipeMovementProps) {
  const isMobile = useIsMobile();
  const touchStartRef = useRef<TouchPosition | null>(null);
  const touchEndRef = useRef<TouchPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobile || !isEnabled || !containerRef.current) {
      return;
    }

    const container = containerRef.current;

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY
      };
      touchEndRef.current = null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      // Prevent scrolling while swiping
      event.preventDefault();

      const touch = event.touches[0];
      touchEndRef.current = {
        x: touch.clientX,
        y: touch.clientY
      };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      event.preventDefault();

      if (!touchStartRef.current || !touchEndRef.current) {
        return;
      }

      const deltaX = touchEndRef.current.x - touchStartRef.current.x;
      const deltaY = touchEndRef.current.y - touchStartRef.current.y;

      // Minimum swipe distance (in pixels)
      const minSwipeDistance = 30;

      // Check if the swipe is long enough
      const swipeDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (swipeDistance < minSwipeDistance) {
        return;
      }

      // Find player entity
      const playerEntity = combatState.entities.find(e => e.id === "player");
      if (!playerEntity) {
        console.log("No player entity found for mobile movement");
        return;
      }

      // Determine the primary direction
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      let direction = { x: 0, y: 0 };
      let directionName = "";

      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          direction.x = 1;
          directionName = "east";
        } else {
          direction.x = -1;
          directionName = "west";
        }
      } else {
        // Vertical swipe - swipe up (negative deltaY) = north, swipe down (positive deltaY) = south
        if (deltaY < 0) {
          direction.y = -1;
          directionName = "north";
        } else {
          direction.y = 1;
          directionName = "south";
        }
      }

      const speed = 12; // Slightly faster for mobile swipe responsiveness
      const newX = playerEntity.position.x + direction.x * speed;
      const newY = playerEntity.position.y + direction.y * speed;

      // Check if we can move to the new position for room transitions
      const canMoveInDirection = availableDirections.includes(directionName);

      // Simple boundary checks
      let finalX = newX;
      let finalY = newY;

      // Check for room transitions (when hitting boundaries with available exits)
      if (newX < 5 && canMoveInDirection && directionName === "west") {
        console.log("🎯 Mobile swipe: Moving to new room via west");
        onRoomMovement("west");
        return;
      }
      if (newX > 95 && canMoveInDirection && directionName === "east") {
        console.log("🎯 Mobile swipe: Moving to new room via east");
        onRoomMovement("east");
        return;
      }
      if (newY < 5 && canMoveInDirection && directionName === "north") {
        console.log("🎯 Mobile swipe: Moving to new room via north");
        onRoomMovement("north");
        return;
      }
      if (newY > 95 && canMoveInDirection && directionName === "south") {
        console.log("🎯 Mobile swipe: Moving to new room via south");
        onRoomMovement("south");
        return;
      }

      // Normal boundary clamping (keep player in room)
      finalX = Math.max(5, Math.min(95, newX));
      finalY = Math.max(5, Math.min(95, newY));

      // Only move if position actually changed
      if (Math.abs(finalX - playerEntity.position.x) > 0.1 || Math.abs(finalY - playerEntity.position.y) > 0.1) {
        console.log(`🎯 Mobile swipe: Moving within room ${directionName} to (${finalX.toFixed(1)}, ${finalY.toFixed(1)})`);
        combatSystem.queueMoveAction(playerEntity.id, { x: finalX, y: finalY });
      }

      // Reset touch positions
      touchStartRef.current = null;
      touchEndRef.current = null;
    };

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isEnabled, availableDirections, onRoomMovement, combatState.entities]);

  return {
    containerRef,
    isMobile
  };
}