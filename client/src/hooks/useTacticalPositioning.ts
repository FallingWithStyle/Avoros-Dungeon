/**
 * File: useTacticalPositioning.ts
 * Responsibility: Handle tactical positioning, gate detection, and room transitions
 * Notes: Focuses on movement validation and positioning logic, relies on other hooks for input handling
 */

import { useCallback, useRef } from "react";
import { combatSystem } from "../../../shared/combat-system";
import { getFacingDegreesFromMovement } from "@/lib/vector";
import { RoomChangeManager } from "@/lib/roomChangeUtils";

interface MovementVector {
  x: number;
  y: number;
}

interface UseTacticalPositioningProps {
  effectiveTacticalData: any;
  combatState: any;
  onRoomMovement: (direction: string) => void;
}

export function useTacticalPositioning({
  effectiveTacticalData,
  combatState,
  onRoomMovement,
}: UseTacticalPositioningProps) {
  const speed = 2.5; // Movement speed per frame
  const ROOM_TRANSITION_COOLDOWN = 2000; // 2 second cooldown between room transitions
  const lastRoomTransitionTime = useRef<number>(0);
  const isTransitioning = useRef<boolean>(false);

  const handleMovement = useCallback(
    (direction: MovementVector) => {
      if (!effectiveTacticalData || combatState.isInCombat) {
        console.log("Movement blocked - no tactical data or in combat");
        return;
      }

      let playerEntity = combatState.entities.find(
        (e: any) => e.id === "player",
      );

      // If no player entity exists, recreate it at default position
      if (!playerEntity) {
        // Use centralized entry positioning logic
        const entryDirection = RoomChangeManager.getStoredMovementDirection();
        
        if (entryDirection) {
          console.log("🔄 useTacticalPositioning: Placing player = " + entryDirection.toUpperCase() + " entry");
          // Use the centralized positioning method
          RoomChangeManager.handleRoomEntryPositioning(
            entryDirection,
            combatSystem,
            {
              name: effectiveTacticalData?.crawler?.name || "Unknown",
              serial: effectiveTacticalData?.crawler?.serial || ""
            }
          );
        } else {
          console.log("🔄 useTacticalPositioning: Placing player = CENTER (no entry direction)");
          // No stored direction, place at center
          combatSystem.initializePlayer({ x: 50, y: 50 }, {
            name: effectiveTacticalData?.crawler?.name || "Unknown",
            serial: effectiveTacticalData?.crawler?.serial || ""
          });
        }
        
        const newPlayerEntity = combatSystem.getState().entities.find((e) => e.id === "player");
        if (!newPlayerEntity) {
          console.error(`❌ Failed to create player entity after initialization`);
          return;
        }
        
        // Re-get the player entity for further movement processing
        playerEntity = newPlayerEntity;
      }

      // Determine facing direction based on movement (360-degree rotation)
      let newFacing = playerEntity.facing || 0; // Keep current facing if no movement, default to 0 degrees (north)
      if (direction.x !== 0 || direction.y !== 0) {
        newFacing = getFacingDegreesFromMovement(direction.x, direction.y);
      }

      // Calculate new position
      let newX = playerEntity.position.x + direction.x * speed;
      let newY = playerEntity.position.y + direction.y * speed;

      const availableDirections = effectiveTacticalData.availableDirections || [];
      const gateStart = 40; // Gate starts at 40%
      const gateEnd = 60; // Gate ends at 60%

      // Check for room transition through gates - only allow transition when moving toward the exit
      let roomTransitionDirection = "";

      // North exit: only trigger when moving north (negative Y direction) AND hitting boundary
      if (
        newY <= 5 &&
        direction.y < 0 &&
        availableDirections.includes("north")
      ) {
        if (
          playerEntity.position.x >= gateStart &&
          playerEntity.position.x <= gateEnd
        ) {
          roomTransitionDirection = "north";
        }
      }
      // South exit: only trigger when moving south (positive Y direction) AND hitting boundary
      else if (
        newY >= 95 &&
        direction.y > 0 &&
        availableDirections.includes("south")
      ) {
        if (
          playerEntity.position.x >= gateStart &&
          playerEntity.position.x <= gateEnd
        ) {
          roomTransitionDirection = "south";
        }
      }
      // East exit: only trigger when moving east (positive X direction) AND hitting boundary
      else if (
        newX >= 95 &&
        direction.x > 0 &&
        availableDirections.includes("east")
      ) {
        if (
          playerEntity.position.y >= gateStart &&
          playerEntity.position.y <= gateEnd
        ) {
          roomTransitionDirection = "east";
        }
      }
      // West exit: only trigger when moving west (negative X direction) AND hitting boundary
      else if (
        newX <= 5 &&
        direction.x < 0 &&
        availableDirections.includes("west")
      ) {
        if (
          playerEntity.position.y >= gateStart &&
          playerEntity.position.y <= gateEnd
        ) {
          roomTransitionDirection = "west";
        }
      }

      // Handle room transition - delegate to parent component
      if (roomTransitionDirection && !isTransitioning.current) {
        // Check for room transition cooldown to prevent spam
        const now = Date.now();
        if (now - lastRoomTransitionTime.current < ROOM_TRANSITION_COOLDOWN) {
          return;
        }

        lastRoomTransitionTime.current = now;
        isTransitioning.current = true;

        // Delegate to parent component which handles roomChangeUtils
        onRoomMovement(roomTransitionDirection);

        // Clear transition flag after cooldown period
        setTimeout(() => {
          isTransitioning.current = false;
        }, ROOM_TRANSITION_COOLDOWN);

        return;
      } else if (roomTransitionDirection && isTransitioning.current) {
        return;
      }
      // Clamp to room boundaries (5% margin from edges)
      const finalX = Math.max(5, Math.min(95, newX));
      const finalY = Math.max(5, Math.min(95, newY));

      if (
        Math.abs(finalX - playerEntity.position.x) > 0.1 ||
        Math.abs(finalY - playerEntity.position.y) > 0.1 ||
        newFacing !== playerEntity.facing
      ) {
        // Update player position and facing directly
        playerEntity.position.x = finalX;
        playerEntity.position.y = finalY;
        playerEntity.facing = newFacing;

        // Notify combat system of state change to trigger UI updates
        combatSystem.updateEntity(playerEntity.id, { 
          position: { x: finalX, y: finalY },
          facing: newFacing
        });
      }
    },
    [
      effectiveTacticalData,
      combatState,
      onRoomMovement,
      speed,
      ROOM_TRANSITION_COOLDOWN,
    ],
  );

  return {
    handleMovement,
  };
}