/**
 * File: useTacticalMovement.ts
 * Responsibility: Coordinate movement inputs from different devices (keyboard, touch, controller)
 * Notes: Acts as a central hub for all movement input types, delegating to specific input handlers
 */

import { useCallback } from 'react';
import { useIsMobile } from './use-mobile';
import { useKeyboardMovement } from './useKeyboardMovement';
import { useSwipeMovement } from './useSwipeMovement';

interface UseTacticalMovementProps {
  effectiveTacticalData: any;
  combatState: any;
  onRoomMovement: (direction: string) => void;
}

export function useTacticalMovement({
  effectiveTacticalData,
  combatState,
  onRoomMovement
}: UseTacticalMovementProps) {
  const isMobile = useIsMobile();
  const availableDirections = effectiveTacticalData?.availableDirections || [];

  // Handle room movement callback
  const handleRoomMovement = useCallback((direction: string) => {
    console.log(`🎯 Movement coordinated: ${direction} direction`);
    onRoomMovement(direction);
  }, [onRoomMovement]);

  // Set up keyboard movement (always enabled for desktop)
  useKeyboardMovement({
    onRoomMovement: handleRoomMovement,
    availableDirections,
    combatState,
    isEnabled: !isMobile // Disable on mobile to prevent conflicts
  });

  // Set up swipe movement for mobile
  const { containerRef } = useSwipeMovement({
    onRoomMovement: handleRoomMovement,
    availableDirections,
    combatState,
    isEnabled: isMobile
  });

  // TODO: Add controller movement hook here when implemented
  // useControllerMovement({
  //   onRoomMovement: handleRoomMovement,
  //   availableDirections,
  //   combatState,
  //   isEnabled: true
  // });

  return {
    containerRef, // For mobile swipe detection
    isMobile,
    // TODO: Add controller connection status when implemented
    // isControllerConnected: false
  };
}