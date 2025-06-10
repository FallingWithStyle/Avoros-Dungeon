/**
 * File: useSwipeMovement.ts
 * Responsibility: Handle touch/swipe input for tactical movement on mobile devices
 * Notes: Detects swipe direction from touch input and passes to movement handler
 */

import { useCallback, useRef, useEffect } from 'react';

interface UseSwipeMovementProps {
  onMovement: (direction: string) => void;
  isEnabled: boolean;
}

export function useSwipeMovement({
  onMovement,
  isEnabled
}: UseSwipeMovementProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isEnabled || e.touches.length !== 1) return;

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

    onMovement(direction);
    touchStartRef.current = null;
  }, [isEnabled, onMovement]);

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