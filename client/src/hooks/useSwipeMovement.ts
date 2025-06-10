/**
 * File: useSwipeMovement.ts
 * Responsibility: Handle touch/swipe input for tactical movement on mobile devices
 * Notes: Detects swipe direction from touch input and passes to movement handler
 */

import { useCallback, useRef, useEffect } from 'react';

interface UseSwipeMovementProps {
  onRoomMovement: (direction: string) => void;
  availableDirections: string[];
  combatState: any;
  isEnabled: boolean;
}

export function useSwipeMovement({
  onRoomMovement,
  availableDirections,
  combatState,
  isEnabled
}: UseSwipeMovementProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isEnabled || e.touches.length !== 1) return;
    
    console.log('🎯 Touch start detected');
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, [isEnabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isEnabled || !touchStartRef.current || e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    const minSwipeDistance = 30;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < minSwipeDistance && absY < minSwipeDistance) {
      touchStartRef.current = null;
      return;
    }

    let direction = '';
    if (absX > absY) {
      direction = deltaX > 0 ? 'east' : 'west';
    } else {
      direction = deltaY > 0 ? 'south' : 'north';
    }

    console.log(`🎯 Swipe detected: ${direction}, available: ${availableDirections.join(',')}`);
    
    // Check if this direction is available for room movement
    if (availableDirections.includes(direction)) {
      console.log(`🎯 Calling room movement for direction: ${direction}`);
      onRoomMovement(direction);
    } else {
      console.log(`🎯 Direction ${direction} not available for room movement`);
    }
    
    touchStartRef.current = null;
  }, [isEnabled, onRoomMovement, availableDirections]);

  useEffect(() => {
    if (!isEnabled) return;

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd, isEnabled]);

  return { containerRef };
}