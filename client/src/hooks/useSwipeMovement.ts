import { useEffect, useRef } from 'react';
import { useIsMobile } from './use-mobile';

interface SwipeMovementProps {
  onRoomMovement: (direction: string) => void;
  availableDirections: string[];
  isEnabled?: boolean;
}

interface TouchPosition {
  x: number;
  y: number;
}

export function useSwipeMovement({
  onRoomMovement,
  availableDirections,
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
      const minSwipeDistance = 50;

      // Check if the swipe is long enough
      const swipeDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (swipeDistance < minSwipeDistance) {
        return;
      }

      // Determine the primary direction
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      let direction = "";

      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        direction = deltaX > 0 ? "east" : "west";
      } else {
        // Vertical swipe - swipe up (negative deltaY) = north, swipe down (positive deltaY) = south
        direction = deltaY < 0 ? "north" : "south";
      }

      // Only move if the direction is available
      if (availableDirections.includes(direction)) {
        console.log(`🎯 Swipe detected: ${direction} (${deltaX.toFixed(1)}, ${deltaY.toFixed(1)})`);
        onRoomMovement(direction);
      } else {
        console.log(`❌ Swipe ${direction} blocked - not an available direction`);
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
  }, [isMobile, isEnabled, availableDirections, onRoomMovement]);

  return {
    containerRef,
    isMobile
  };
}