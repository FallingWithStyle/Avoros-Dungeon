
/**
 * File: useKeyboardMovement.ts
 * Responsibility: Handle keyboard input for 360-degree tactical movement using native keyboard events
 * Notes: Uses native keyboard events for better reliability, consistent with gesture movement patterns
 */

import { useCallback, useEffect, useRef } from "react";

interface UseKeyboardMovementProps {
  onMovement: (direction: { x: number; y: number }) => void;
  isEnabled: boolean;
}

export function useKeyboardMovement({
  onMovement,
  isEnabled,
}: UseKeyboardMovementProps) {
  const keysPressed = useRef<Set<string>>(new Set());
  const movementInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute movement vector from keys
  const calculateMovementVector = useCallback(() => {
    let x = 0,
      y = 0;
    if (keysPressed.current.has("w") || keysPressed.current.has("arrowup"))
      y -= 1;
    if (keysPressed.current.has("s") || keysPressed.current.has("arrowdown"))
      y += 1;
    if (keysPressed.current.has("a") || keysPressed.current.has("arrowleft"))
      x -= 1;
    if (keysPressed.current.has("d") || keysPressed.current.has("arrowright"))
      x += 1;
    // Normalize diagonals
    if (x !== 0 && y !== 0) {
      const len = Math.sqrt(x * x + y * y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }, []);

  // Start the interval to send movement
  const startMovement = useCallback(() => {
    if (movementInterval.current) return;
    
    console.log('🎮 Starting keyboard movement interval');
    
    // Send immediate movement
    const initialVector = calculateMovementVector();
    if (initialVector.x !== 0 || initialVector.y !== 0) {
      console.log('🎮 Initial movement:', initialVector);
      onMovement(initialVector);
    }
    
    movementInterval.current = setInterval(() => {
      const vector = calculateMovementVector();
      if (vector.x !== 0 || vector.y !== 0) {
        console.log('🎮 Interval movement:', vector, 'Keys:', Array.from(keysPressed.current));
        onMovement(vector);
      }
    }, 50);
  }, [calculateMovementVector, onMovement]);

  // Stop the interval
  const stopMovement = useCallback(() => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
  }, []);

  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;
    const key = event.key.toLowerCase();
    const valid = [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ];
    if (!valid.includes(key)) return;
    event.preventDefault();
    
    // Prevent key repeat
    if (keysPressed.current.has(key)) return;
    
    const wasEmpty = keysPressed.current.size === 0;
    keysPressed.current.add(key);
    
    console.log('🎮 Key pressed:', key, 'Keys now:', Array.from(keysPressed.current));
    
    // Start movement if this is the first key, or send immediate movement if already moving
    if (wasEmpty) {
      startMovement();
    } else {
      // Send immediate movement update for key combinations
      const vector = calculateMovementVector();
      if (vector.x !== 0 || vector.y !== 0) {
        console.log('🎮 Combination movement:', vector);
        onMovement(vector);
      }
    }
  }, [isEnabled, calculateMovementVector, onMovement, startMovement]);

  // Handle keyup events
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;
    const key = event.key.toLowerCase();
    const valid = [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
    ];
    if (!valid.includes(key)) return;
    keysPressed.current.delete(key);
    if (keysPressed.current.size === 0) {
      stopMovement();
    }
  }, [isEnabled, stopMovement]);

  // Handle window blur
  const handleBlur = useCallback(() => {
    keysPressed.current.clear();
    stopMovement();
    onMovement({ x: 0, y: 0 });
  }, [stopMovement, onMovement]);

  // Setup and cleanup
  useEffect(() => {
    if (!isEnabled) {
      stopMovement();
      keysPressed.current.clear();
      return;
    }

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      stopMovement();
    };
  }, [isEnabled, handleKeyDown, handleKeyUp, handleBlur, stopMovement]);

  // Stop if disabled
  useEffect(() => {
    if (!isEnabled) {
      stopMovement();
      keysPressed.current.clear();
      onMovement({ x: 0, y: 0 });
    }
  }, [isEnabled, stopMovement, onMovement]);
}
