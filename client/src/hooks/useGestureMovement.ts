/**
 * File: useGestureMovement.ts
 * Responsibility: Handle gesture input for movement using react-use-gesture library
 * Notes: Replaces swipe movement with more robust gesture recognition for better mobile support
 */

import { useEffect, useRef } from 'react';
import { useGesture } from '@use-gesture/react';

interface UseGestureMovementProps {
  onMovement: (direction: { x: number; y: number }) => void;
  isEnabled: boolean;
}

export function useGestureMovement({
  onMovement,
  isEnabled
}: UseGestureMovementProps) {
  // console.log(`🎯 useGestureMovement hook initialized - enabled: ${enabled}`);

  const containerRef = useRef<HTMLDivElement>(null);
  const movementInterval = useRef<NodeJS.Timeout | null>(null);
  const currentDirection = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const startMovement = () => {
    if (movementInterval.current) return;

    movementInterval.current = setInterval(() => {
      if (currentDirection.current.x !== 0 || currentDirection.current.y !== 0) {
        onMovement(currentDirection.current);
      }
    }, 50); // 20 FPS movement updates
  };

  const stopMovement = () => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
    currentDirection.current = { x: 0, y: 0 };
  };

  const calculateDirection = (deltaX: number, deltaY: number) => {
    const deadZone = 20;
    const maxDistance = 100;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < deadZone) {
      return { x: 0, y: 0 };
    }

    // Normalize direction
    const normalizedX = deltaX / distance;
    const normalizedY = deltaY / distance;

    // Calculate intensity
    const intensity = Math.min((distance - deadZone) / (maxDistance - deadZone), 1.0);

    return {
      x: normalizedX * intensity,
      y: normalizedY * intensity
    };
  };

  const bind = useGesture(
    {
      onDrag: ({ movement: [x, y], velocity, active, first, last }) => {
        if (!isEnabled) return;

        if (first) {
          currentDirection.current = { x: 0, y: 0 };
        }

        if (active) {
          const direction = calculateDirection(x, y);
          currentDirection.current = direction;

          if (!movementInterval.current && (direction.x !== 0 || direction.y !== 0)) {
            startMovement();
          }
        }

        if (last) {
          stopMovement();
        }
      },
      onPinch: ({ active }) => {
        // Disable pinch to prevent zoom interference
        if (active) {
        }
      }
    },
    {
      drag: {
        filterTaps: true,
        threshold: 10,
        preventDefault: true
      },
      pinch: {
        preventDefault: true
      }
    }
  );

  useEffect(() => {
    if (!isEnabled) {
      stopMovement();
    }

    return () => {
      stopMovement();
    };
  }, [isEnabled]);

  return { 
    containerRef, 
    bind: isEnabled ? bind : () => ({}) 
  };
}