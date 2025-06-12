/**
 * File: useKeyboardMovement.ts
 * Responsibility: Handle keyboard input for movement (WASD keys) in tactical view
 * Notes: Provides movement direction vectors based on pressed keys, respects enabled state
 */

import { useEffect, useCallback, useRef } from "react";

interface MovementVector {
  x: number;
  y: number;
}

interface UseKeyboardMovementProps {
  onMovement: (direction: MovementVector) => void;
  isEnabled: boolean;
}

export function useKeyboardMovement({
  onMovement,
  isEnabled,
}: UseKeyboardMovementProps) {
  const keysPressed = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>();

  const updateMovement = useCallback(() => {
    if (!isEnabled) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      return;
    }

    let x = 0;
    let y = 0;

    if (keysPressed.current.has("KeyW") || keysPressed.current.has("ArrowUp")) {
      y -= 1;
    }
    if (keysPressed.current.has("KeyS") || keysPressed.current.has("ArrowDown")) {
      y += 1;
    }
    if (keysPressed.current.has("KeyA") || keysPressed.current.has("ArrowLeft")) {
      x -= 1;
    }
    if (keysPressed.current.has("KeyD") || keysPressed.current.has("ArrowRight")) {
      x += 1;
    }

    if (x !== 0 || y !== 0) {
      // Normalize diagonal movement
      const magnitude = Math.sqrt(x * x + y * y);
      onMovement({
        x: x / magnitude,
        y: y / magnitude,
      });
    }

    // Continue the movement loop
    animationFrameRef.current = requestAnimationFrame(updateMovement);
  }, [isEnabled, onMovement]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isEnabled) return;

      const key = event.code;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        event.preventDefault();

        if (!keysPressed.current.has(key)) {
          keysPressed.current.add(key);

          // Start movement loop if this is the first key pressed
          if (keysPressed.current.size === 1 && !animationFrameRef.current) {
            updateMovement();
          }
        }
      }
    },
    [isEnabled, updateMovement]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      const key = event.code;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        keysPressed.current.delete(key);

        // Stop movement loop if no keys are pressed
        if (keysPressed.current.size === 0 && animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
        }
      }
    },
    []
  );

  useEffect(() => {
    if (isEnabled) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        keysPressed.current.clear();
      };
    }
  }, [isEnabled, handleKeyDown, handleKeyUp]);

  // Cleanup on disable
  useEffect(() => {
    if (!isEnabled) {
      keysPressed.current.clear();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }
  }, [isEnabled]);
}