
/**
 * File: useSwipeMovement.ts
 * Responsibility: Handle touch/swipe input for 360-degree movement on mobile devices
 * Notes: Implements virtual thumbstick behavior for continuous directional movement
 */

import { useCallback, useRef, useEffect } from 'react';
import { combatSystem } from '@shared/combat-system';

interface UseSwipeMovementProps {
  onMovement: (direction: { x: number; y: number }) => void;
  availableDirections: string[];
  combatState: any;
  isEnabled: boolean;
}

export function useSwipeMovement({
  onMovement,
  availableDirections,
  combatState,
  isEnabled
}: UseSwipeMovementProps) {
  console.log('🎯 useSwipeMovement hook initialized - enabled:', isEnabled);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const movementInterval = useRef<NodeJS.Timeout | null>(null);
  const currentTouchRef = useRef<{ x: number; y: number } | null>(null);

  const calculateMovementVector = useCallback(() => {
    if (!touchStartRef.current || !currentTouchRef.current) {
      return { x: 0, y: 0 };
    }

    const deltaX = currentTouchRef.current.x - touchStartRef.current.x;
    const deltaY = currentTouchRef.current.y - touchStartRef.current.y;

    const deadZone = 15; // Reduced dead zone for more responsive movement
    const maxDistance = 80; // Reduced max distance for better control

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance < deadZone) {
      return { x: 0, y: 0 };
    }

    // Normalize the direction vector first
    const normalizedX = deltaX / distance;
    const normalizedY = deltaY / distance;
    
    // Apply intensity based on distance from dead zone
    const intensity = Math.min((distance - deadZone) / (maxDistance - deadZone), 1.0);
    
    console.log('🎯 Movement vector:', { 
      deltaX, deltaY, distance, intensity,
      result: { x: normalizedX * intensity, y: normalizedY * intensity }
    });
    
    return {
      x: normalizedX * intensity,
      y: normalizedY * intensity
    };
  }, []);

  const startMovement = useCallback(() => {
    if (movementInterval.current) return;

    movementInterval.current = setInterval(() => {
      const vector = calculateMovementVector();
      if (vector.x !== 0 || vector.y !== 0) {
        onMovement(vector);
      }
    }, 50); // 20 FPS movement updates
  }, [calculateMovementVector, onMovement]);

  const stopMovement = useCallback(() => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    console.log('🎯 Touch start event fired - enabled:', isEnabled, 'touches:', e.touches.length);
    
    if (!isEnabled || e.touches.length !== 1) {
      console.log('🎯 Touch start ignored - enabled:', isEnabled, 'touches:', e.touches.length);
      return;
    }
    
    // Don't prevent default on touchstart to allow scrolling if needed
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    currentTouchRef.current = { x: touch.clientX, y: touch.clientY };
    
    console.log('🎯 Touch start - virtual thumbstick active at:', { 
      x: touch.clientX, 
      y: touch.clientY,
      target: e.target?.constructor?.name 
    });
  }, [isEnabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isEnabled || !touchStartRef.current || e.touches.length !== 1) return;

    // Always prevent default on touchmove to prevent scrolling during movement
    e.preventDefault();
    const touch = e.touches[0];
    currentTouchRef.current = { x: touch.clientX, y: touch.clientY };
    
    console.log('🎯 Touch move to:', { x: touch.clientX, y: touch.clientY });
    
    // Start movement if not already started
    if (!movementInterval.current) {
      console.log('🎯 Starting movement from touch move');
      startMovement();
    }
  }, [isEnabled, startMovement]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isEnabled) return;

    e.preventDefault();
    console.log('🎯 Touch end - stopping virtual thumbstick');
    
    touchStartRef.current = null;
    currentTouchRef.current = null;
    stopMovement();
  }, [isEnabled, stopMovement]);

  useEffect(() => {
    console.log('🎯 Setting up touch events - enabled:', isEnabled);
    
    if (!isEnabled) {
      console.log('🎯 Touch events disabled, stopping movement');
      stopMovement();
      return;
    }

    const container = containerRef.current;
    if (!container) {
      console.log('🎯 No container ref available for touch events');
      return;
    }

    console.log('🎯 Adding touch event listeners to container:', container.className);
    
    // Add event listeners with debugging
    const wrappedTouchStart = (e: TouchEvent) => {
      console.log('🎯 Container touchstart wrapper called');
      handleTouchStart(e);
    };
    
    const wrappedTouchMove = (e: TouchEvent) => {
      console.log('🎯 Container touchmove wrapper called');
      handleTouchMove(e);
    };
    
    const wrappedTouchEnd = (e: TouchEvent) => {
      console.log('🎯 Container touchend wrapper called');
      handleTouchEnd(e);
    };

    container.addEventListener('touchstart', wrappedTouchStart, { passive: false });
    container.addEventListener('touchmove', wrappedTouchMove, { passive: false });
    container.addEventListener('touchend', wrappedTouchEnd, { passive: false });
    container.addEventListener('touchcancel', wrappedTouchEnd, { passive: false });

    return () => {
      console.log('🎯 Removing touch event listeners');
      container.removeEventListener('touchstart', wrappedTouchStart);
      container.removeEventListener('touchmove', wrappedTouchMove);
      container.removeEventListener('touchend', wrappedTouchEnd);
      container.removeEventListener('touchcancel', wrappedTouchEnd);
      stopMovement();
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isEnabled, stopMovement]);

  return { containerRef };
}
