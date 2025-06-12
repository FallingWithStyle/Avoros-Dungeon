
/**
 * File: useKeyboardMovement.ts
 * Responsibility: Handle keyboard input for 360-degree tactical movement using @use-gesture/react
 * Notes: Unified with gesture movement system for consistency across input methods
 */

import { useEffect, useRef } from "react";
import { useGesture } from "@use-gesture/react";

interface UseKeyboardMovementProps {
  onMovement: (direction: { x: number; y: number }) => void;
  isEnabled: boolean;
}

export function useKeyboardMovement({
  onMovement,
  isEnabled,
}: UseKeyboardMovementProps) {
  const keysPressed = useRef<Set<string>>(new Set());
  const movementInterval = useRef<NodeJS.Timeout | null>(null);
  const currentDirection = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  console.log('⌨️ useKeyboardMovement hook initialized - enabled:', isEnabled);

  // Compute movement vector from keys
  const calculateMovementVector = () => {
    let x = 0, y = 0;
    if (keysPressed.current.has("w") || keysPressed.current.has("arrowup")) y -= 1;
    if (keysPressed.current.has("s") || keysPressed.current.has("arrowdown")) y += 1;
    if (keysPressed.current.has("a") || keysPressed.current.has("arrowleft")) x -= 1;
    if (keysPressed.current.has("d") || keysPressed.current.has("arrowright")) x += 1;
    
    // Normalize diagonals
    if (x !== 0 && y !== 0) {
      const len = Math.sqrt(x * x + y * y);
      x /= len;
      y /= len;
    }
    return { x, y };
  };

  const startMovement = () => {
    if (movementInterval.current) return;
    
    console.log('⌨️ Starting keyboard movement interval');
    movementInterval.current = setInterval(() => {
      if (currentDirection.current.x !== 0 || currentDirection.current.y !== 0) {
        console.log('⌨️ Sending movement:', currentDirection.current);
        onMovement(currentDirection.current);
      }
    }, 50); // 20 FPS movement updates, consistent with gesture movement
  };

  const stopMovement = () => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
    currentDirection.current = { x: 0, y: 0 };
    console.log('⌨️ Stopped keyboard movement');
  };

  // Use @use-gesture/react for keyboard handling
  const bind = useGesture(
    {
      onKeyDown: ({ event, first }) => {
        if (!isEnabled) return;
        
        const key = event.key.toLowerCase();
        const validKeys = [
          "w", "a", "s", "d",
          "arrowup", "arrowdown", "arrowleft", "arrowright",
        ];
        
        if (!validKeys.includes(key)) return;
        event.preventDefault();

        // Prevent key repeat
        if (keysPressed.current.has(key)) return;

        const wasEmpty = keysPressed.current.size === 0;
        keysPressed.current.add(key);
        
        console.log('⌨️ Key pressed:', key, 'Keys now:', Array.from(keysPressed.current));

        // Update current direction
        currentDirection.current = calculateMovementVector();

        // Start movement if this is the first key
        if (wasEmpty && (currentDirection.current.x !== 0 || currentDirection.current.y !== 0)) {
          startMovement();
        }
      },
      onKeyUp: ({ event }) => {
        if (!isEnabled) return;
        
        const key = event.key.toLowerCase();
        const validKeys = [
          "w", "a", "s", "d",
          "arrowup", "arrowdown", "arrowleft", "arrowright",
        ];
        
        if (!validKeys.includes(key)) return;
        
        keysPressed.current.delete(key);
        currentDirection.current = calculateMovementVector();
        
        console.log('⌨️ Key released:', key, 'Keys now:', Array.from(keysPressed.current));

        if (keysPressed.current.size === 0) {
          stopMovement();
        }
      }
    },
    {
      eventOptions: { passive: false },
      target: typeof window !== 'undefined' ? window : undefined
    }
  );

  // Handle window blur to stop movement
  const handleBlur = () => {
    keysPressed.current.clear();
    stopMovement();
    onMovement({ x: 0, y: 0 });
    console.log('⌨️ Window blur - stopping movement');
  };

  // Setup and cleanup
  useEffect(() => {
    if (!isEnabled) {
      stopMovement();
      keysPressed.current.clear();
      return;
    }

    // Apply gesture bindings to window
    const bindResult = bind();
    
    // Add blur handler
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
      stopMovement();
      // Clean up gesture bindings
      if (bindResult && typeof bindResult === 'function') {
        bindResult();
      }
    };
  }, [isEnabled, bind]);

  // Stop if disabled
  useEffect(() => {
    if (!isEnabled) {
      stopMovement();
      keysPressed.current.clear();
      onMovement({ x: 0, y: 0 });
    }
  }, [isEnabled, onMovement]);
}
