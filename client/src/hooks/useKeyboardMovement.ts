/**
 * File: useKeyboardMovement.ts
 * Responsibility: Handle keyboard input for tactical movement (WASD keys)
 * Notes: Detects movement direction from keyboard input and passes to movement handler
 */

import { useCallback, useEffect } from 'react';

interface UseKeyboardMovementProps {
  onMovement: (direction: string) => void;
  isEnabled: boolean;
}

export function useKeyboardMovement({
  onMovement,
  isEnabled
}: UseKeyboardMovementProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;

    // Prevent default behavior for movement keys
    if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }

    let direction = '';
    switch (event.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        direction = 'north';
        break;
      case 's':
      case 'arrowdown':
        direction = 'south';
        break;
      case 'd':
      case 'arrowright':
        direction = 'east';
        break;
      case 'a':
      case 'arrowleft':
        direction = 'west';
        break;
      default:
        return;
    }

    onMovement(direction);
  }, [isEnabled, onMovement]);

  useEffect(() => {
    if (!isEnabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, isEnabled]);
}