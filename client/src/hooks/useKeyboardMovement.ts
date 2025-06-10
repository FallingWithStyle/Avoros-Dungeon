
/**
 * File: useKeyboardMovement.ts
 * Responsibility: Handle keyboard input for 360-degree tactical movement (WASD keys)
 * Notes: Detects movement direction from keyboard input combinations and passes to movement handler
 */

import { useCallback, useEffect, useRef } from 'react';

interface UseKeyboardMovementProps {
  onMovement: (direction: { x: number; y: number }) => void;
  isEnabled: boolean;
}

export function useKeyboardMovement({
  onMovement,
  isEnabled
}: UseKeyboardMovementProps) {
  const keysPressed = useRef<Set<string>>(new Set());
  const movementInterval = useRef<NodeJS.Timeout | null>(null);

  const calculateMovementVector = useCallback(() => {
    let x = 0;
    let y = 0;

    if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) y -= 1;
    if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) y += 1;
    if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) x -= 1;
    if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) x += 1;

    // Normalize diagonal movement to prevent faster diagonal movement
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x = x / length;
      y = y / length;
    }

    return { x, y };
  }, []);

  const startMovement = useCallback(() => {
    if (movementInterval.current) return;

    // Immediately send first movement
    const initialVector = calculateMovementVector();
    if (initialVector.x !== 0 || initialVector.y !== 0) {
      onMovement(initialVector);
    }

    movementInterval.current = setInterval(() => {
      const vector = calculateMovementVector();
      if (vector.x !== 0 || vector.y !== 0) {
        onMovement(vector);
      }
    }, 50); // 20 FPS continuous movement updates
  }, [calculateMovementVector, onMovement]);

  const stopMovement = useCallback(() => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
      
      // Prevent key repeat events from restarting movement
      if (event.repeat) return;
      
      const wasEmpty = keysPressed.current.size === 0;
      keysPressed.current.add(key);
      
      if (wasEmpty) {
        startMovement();
      }
    }
  }, [isEnabled, startMovement]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      keysPressed.current.delete(key);
      
      if (keysPressed.current.size === 0) {
        stopMovement();
      }
    }
  }, [isEnabled, stopMovement]);

  useEffect(() => {
    if (!isEnabled) {
      stopMovement();
      keysPressed.current.clear();
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Clear keys when window loses focus
    const handleBlur = () => {
      keysPressed.current.clear();
      stopMovement();
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      stopMovement();
    };
  }, [handleKeyDown, handleKeyUp, isEnabled, stopMovement]);
}
