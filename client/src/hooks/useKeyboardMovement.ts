
/**
 * File: useKeyboardMovement.ts
 * Responsibility: Handle keyboard input for 360-degree tactical movement using standard event listeners
 * Notes: Uses traditional event listeners instead of @use-gesture/react for better compatibility
 */

import { useEffect, useRef } from "react";

interface UseKeyboardMovementProps {
  onMovement: (direction: { x: number; y: number }) => void;
  onRotation?: (direction: 'clockwise' | 'counter-clockwise') => void;
  onStairs?: () => void;
  isEnabled: boolean;
}

export function useKeyboardMovement({
  onMovement,
  onRotation,
  onStairs,
  isEnabled,
}: UseKeyboardMovementProps) {
  const keysPressed = useRef<Set<string>>(new Set());
  const movementInterval = useRef<NodeJS.Timeout | null>(null);
  const onMovementRef = useRef(onMovement);
  const onRotationRef = useRef(onRotation);
  const onStairsRef = useRef(onStairs);

  // Keep the refs updated
  useEffect(() => {
    onMovementRef.current = onMovement;
    onRotationRef.current = onRotation;
    onStairsRef.current = onStairs;
  }, [onMovement, onRotation, onStairs]);

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
    
    console.log('⌨️ Starting continuous keyboard movement');
    movementInterval.current = setInterval(() => {
      const direction = calculateMovementVector();
      if (direction.x !== 0 || direction.y !== 0) {
        console.log('⌨️ Sending continuous movement:', direction);
        onMovementRef.current(direction);
      }
    }, 50); // 20 FPS movement updates, consistent with gesture movement
  };

  const stopMovement = () => {
    if (movementInterval.current) {
      clearInterval(movementInterval.current);
      movementInterval.current = null;
    }
    console.log('⌨️ Stopped keyboard movement - sending stop signal');
    onMovementRef.current({ x: 0, y: 0 });
  };

  // Keyboard event handlers
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isEnabled) return;
    
    const key = event.key.toLowerCase();
    const validKeys = [
      "w", "a", "s", "d",
      "arrowup", "arrowdown", "arrowleft", "arrowright",
      "q", "e", "z"
    ];
    
    if (!validKeys.includes(key)) return;
    event.preventDefault();

    // Handle special keys immediately (non-movement keys)
    if (key === 'q' && onRotationRef.current) {
      event.preventDefault();
      console.log('⌨️ Counter-clockwise rotation');
      onRotationRef.current('counter-clockwise');
      return;
    }
    
    if (key === 'e' && onRotationRef.current) {
      event.preventDefault();
      console.log('⌨️ Clockwise rotation');
      onRotationRef.current('clockwise');
      return;
    }
    
    if (key === 'z' && onStairsRef.current) {
      event.preventDefault();
      console.log('⌨️ Stairs/down action');
      onStairsRef.current();
      return;
    }

    // Prevent key repeat for movement keys
    if (keysPressed.current.has(key)) return;

    const wasEmpty = keysPressed.current.size === 0;
    keysPressed.current.add(key);
    
    console.log('⌨️ Key pressed:', key, 'Keys now:', Array.from(keysPressed.current));

    // Start continuous movement if this is the first key
    if (wasEmpty) {
      startMovement();
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (!isEnabled) return;
    
    const key = event.key.toLowerCase();
    const validKeys = [
      "w", "a", "s", "d",
      "arrowup", "arrowdown", "arrowleft", "arrowright",
      "q", "e", "z"
    ];
    
    if (!validKeys.includes(key)) return;
    
    keysPressed.current.delete(key);
    
    console.log('⌨️ Key released:', key, 'Keys now:', Array.from(keysPressed.current));

    // Only stop movement when no keys are pressed
    if (keysPressed.current.size === 0) {
      stopMovement();
    }
    // If keys are still pressed, the movement interval will continue automatically
  };

  // Handle window blur to stop movement
  const handleBlur = () => {
    keysPressed.current.clear();
    stopMovement();
    console.log('⌨️ Window blur - stopping movement');
  };

  // Setup and cleanup
  useEffect(() => {
    if (!isEnabled) {
      keysPressed.current.clear();
      if (movementInterval.current) {
        clearInterval(movementInterval.current);
        movementInterval.current = null;
      }
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
      if (movementInterval.current) {
        clearInterval(movementInterval.current);
        movementInterval.current = null;
      }
    };
  }, [isEnabled]); // Removed onMovement from dependency array to prevent effect restarts

  // Stop if disabled
  useEffect(() => {
    if (!isEnabled) {
      keysPressed.current.clear();
      if (movementInterval.current) {
        clearInterval(movementInterval.current);
        movementInterval.current = null;
      }
      onMovementRef.current({ x: 0, y: 0 });
    }
  }, [isEnabled]);
}
