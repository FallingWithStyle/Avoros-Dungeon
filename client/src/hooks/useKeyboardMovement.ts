/**
 * File: useKeyboardMovement.ts
 * Responsibility: Handle keyboard input for 360-degree tactical movement (WASD/arrows)
 * Notes: Uses interval to ensure continuous, normalized movement while any valid key is held.
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

  // Keydown: start movement loop if this is the first movement key pressed
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isEnabled) return;
      
      // Check if any dialog/modal is open by looking for dialog overlay
      const dialogOverlay = document.querySelector('[data-state="open"]');
      if (dialogOverlay) {
        console.log('🚫 Keyboard movement disabled - dialog is open');
        return;
      }
      
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
    },
    [isEnabled, startMovement, calculateMovementVector, onMovement],
  );

  // Keyup: stop movement loop if this was the last key released
  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!isEnabled) return;
      
      // Check if any dialog/modal is open by looking for dialog overlay
      const dialogOverlay = document.querySelector('[data-state="open"]');
      if (dialogOverlay) {
        // Clear any pressed keys when dialog is open to prevent stuck movement
        keysPressed.current.clear();
        stopMovement();
        return;
      }
      
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
    },
    [isEnabled, stopMovement],
  );

  // Proper effect setup (no stale closures)
  useEffect(() => {
    if (!isEnabled) {
      stopMovement();
      keysPressed.current.clear();
      return;
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    // On window blur, stop movement
    const handleBlur = () => {
      keysPressed.current.clear();
      stopMovement();
      onMovement({ x: 0, y: 0 });
    };
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      stopMovement();
    };
  }, [isEnabled, handleKeyDown, handleKeyUp, stopMovement, onMovement]);

  // Stop if disabled
  useEffect(() => {
    if (!isEnabled) {
      stopMovement();
      keysPressed.current.clear();
      onMovement({ x: 0, y: 0 });
    }
  }, [isEnabled, stopMovement, onMovement]);
}
