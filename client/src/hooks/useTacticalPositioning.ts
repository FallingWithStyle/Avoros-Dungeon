/**
 * File: useTacticalPositioning.ts
 * Responsibility: Handle tactical positioning, gate detection, and room transitions
 * Notes: Focuses on movement validation and positioning logic, relies on other hooks for input handling
 */

import { useCallback, useRef } from "react";
import { handleRoomChangeWithRefetch } from "@/lib/roomChangeUtils";
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
        console.log("🔄 No player entity found - attempting recovery");

        // Use centralized entry positioning logic
        const entryDirection = RoomChangeManager.getStoredMovementDirection();
        console.log(`🔄 Recovery: stored movement direction = '${entryDirection}'`);
        const recoveryPosition = RoomChangeManager.getEntryPosition(entryDirection);
        
        if (entryDirection) {
          console.log(`🔄 Recovering player position based on entry direction '${entryDirection}': (${recoveryPosition.x}, ${recoveryPosition.y})`);
        } else {
          console.log("🔄 No entry direction found, using center position for recovery");
        }

        console.log(`🔄 Initializing player at recovery position: (${recoveryPosition.x}, ${recoveryPosition.y})`);
        combatSystem.initializePlayer(recoveryPosition, {
          name: effectiveTacticalData?.crawler?.name || "Unknown",
          serial: effectiveTacticalData?.crawler?.serial || ""
        });
        
        const newPlayerEntity = combatSystem.getState().entities.find((e) => e.id === "player");
        if (!newPlayerEntity) {
          console.log("❌ Failed to create player entity - movement blocked");
          return;
        } else {
          console.log(`✅ Player entity recovered at position: (${newPlayerEntity.position.x}, ${newPlayerEntity.position.y})`);
        }
        
        // Re-get the player entity for further movement processing
        playerEntity = newPlayerEntity;
      }

      // Determine facing direction based on movement (360-degree rotation)
      let newFacing = playerEntity.facing || 0; // Keep current facing if no movement, default to 0 degrees (north)
      if (direction.x !== 0 || direction.y !== 0) {
        newFacing = getFacingDegreesFromMovement(direction.x, direction.y);
        console.log("🧭 Updating facing direction to:", newFacing, "degrees (from vector:", direction, ")");
      }

      // Check for room transition cooldown to prevent spam
      const now = Date.now();
      if (now - lastRoomTransitionTime.current < ROOM_TRANSITION_COOLDOWN) {
        console.log("🚫 Room transition on cooldown - ignoring movement");
        return;
      }

      const availableDirections =
        effectiveTacticalData.availableDirections || [];

      // Calculate new position
      let newX = playerEntity.position.x + direction.x * speed;
      let newY = playerEntity.position.y + direction.y * speed;

      const gateStart = 40; // Gate starts at 40%
      const gateEnd = 60; // Gate ends at 60%

      console.log("🎯 Movement attempt:", {
        currentPos: { x: playerEntity.position.x, y: playerEntity.position.y },
        newPos: { x: newX, y: newY },
        availableDirections,
        gateZone: { start: gateStart, end: gateEnd },
      });

      // Check for room transition through gates - only allow transition when moving toward the exit
      let roomTransitionDirection = "";

      // North exit: only trigger when moving north (negative Y direction) AND hitting boundary
      if (
        newY <= 5 &&
        direction.y < 0 &&
        availableDirections.includes("north")
      ) {
        console.log("🚪 Moving north toward north exit - checking gate bounds");
        console.log(
          "Player X position:",
          playerEntity.position.x,
          "Gate bounds:",
          gateStart,
          "-",
          gateEnd,
        );
        if (
          playerEntity.position.x >= gateStart &&
          playerEntity.position.x <= gateEnd
        ) {
          console.log(
            "✅ Player is within north gate bounds - allowing transition",
          );
          roomTransitionDirection = "north";
        } else {
          console.log(
            "❌ Player is outside north gate bounds - blocking movement",
          );
        }
      }
      // South exit: only trigger when moving south (positive Y direction) AND hitting boundary
      else if (
        newY >= 95 &&
        direction.y > 0 &&
        availableDirections.includes("south")
      ) {
        console.log("🚪 Moving south toward south exit - checking gate bounds");
        console.log(
          "Player X position:",
          playerEntity.position.x,
          "Gate bounds:",
          gateStart,
          "-",
          gateEnd,
        );
        if (
          playerEntity.position.x >= gateStart &&
          playerEntity.position.x <= gateEnd
        ) {
          console.log(
            "✅ Player is within south gate bounds - allowing transition",
          );
          roomTransitionDirection = "south";
        } else {
          console.log(
            "❌ Player is outside south gate bounds - blocking movement",
          );
        }
      }
      // East exit: only trigger when moving east (positive X direction) AND hitting boundary
      else if (
        newX >= 95 &&
        direction.x > 0 &&
        availableDirections.includes("east")
      ) {
        console.log("🚪 Moving east toward east exit - checking gate bounds");
        console.log(
          "Player Y position:",
          playerEntity.position.y,
          "Gate bounds:",
          gateStart,
          "-",
          gateEnd,
        );
        if (
          playerEntity.position.y >= gateStart &&
          playerEntity.position.y <= gateEnd
        ) {
          console.log(
            "✅ Player is within east gate bounds - allowing transition",
          );
          roomTransitionDirection = "east";
        } else {
          console.log(
            "❌ Player is outside east gate bounds - blocking movement",
          );
        }
      }
      // West exit: only trigger when moving west (negative X direction) AND hitting boundary
      else if (
        newX <= 5 &&
        direction.x < 0 &&
        availableDirections.includes("west")
      ) {
        console.log("🚪 Moving west toward west exit - checking gate bounds");
        console.log(
          "Player Y position:",
          playerEntity.position.y,
          "Gate bounds:",
          gateStart,
          "-",
          gateEnd,
        );
        if (
          playerEntity.position.y >= gateStart &&
          playerEntity.position.y <= gateEnd
        ) {
          console.log(
            "✅ Player is within west gate bounds - allowing transition",
          );
          roomTransitionDirection = "west";
        } else {
          console.log(
            "❌ Player is outside west gate bounds - blocking movement",
          );
        }
      }

      // Handle room transition
      if (roomTransitionDirection && !isTransitioning.current) {
        console.log("🏃 Transitioning to new room:", roomTransitionDirection);
        lastRoomTransitionTime.current = Date.now();
        isTransitioning.current = true;

        // Execute the room movement immediately
        try {
          onRoomMovement(roomTransitionDirection);
          console.log("✅ Room movement function called successfully");
        } catch (error) {
          console.error("❌ Room movement failed:", error);
          isTransitioning.current = false; // Reset flag on error
        }

        // Clear transition flag after cooldown period
        setTimeout(() => {
          isTransitioning.current = false;
          console.log("🔓 Room transition cooldown complete");
        }, ROOM_TRANSITION_COOLDOWN);

        return;
      } else if (roomTransitionDirection && isTransitioning.current) {
        console.log("🚫 Room transition already in progress - ignoring duplicate transition");
        return;
      }

      // Only clamp and move if we're NOT transitioning rooms
      // Clamp to room boundaries (5% margin from edges)
      const finalX = Math.max(5, Math.min(95, newX));
      const finalY = Math.max(5, Math.min(95, newY));

      // Log wall collisions only if we're not transitioning
      if (newX !== finalX || newY !== finalY) {
        console.log("🧱 Wall collision detected:");
        console.log("  Attempted position:", { x: newX, y: newY });
        console.log("  Clamped to:", { x: finalX, y: finalY });
        console.log(
          "  Collision type:",
          newX < 5
            ? "west wall"
            : newX > 95
              ? "east wall"
              : newY < 5
                ? "north wall"
                : newY > 95
                  ? "south wall"
                  : "boundary",
        );
      }

      if (
        Math.abs(finalX - playerEntity.position.x) > 0.1 ||
        Math.abs(finalY - playerEntity.position.y) > 0.1 ||
        newFacing !== playerEntity.facing
      ) {
        console.log("🏃 Moving player to:", { x: finalX, y: finalY, facing: newFacing });
        // Update player position and facing directly
        playerEntity.position.x = finalX;
        playerEntity.position.y = finalY;
        playerEntity.facing = newFacing;

        // Notify combat system of state change to trigger UI updates
        combatSystem.updateEntity(playerEntity.id, { 
          position: { x: finalX, y: finalY },
          facing: newFacing
        });

        console.log("✅ Player updated to:", { position: playerEntity.position, facing: playerEntity.facing });
      } else {
        console.log("🚫 Movement blocked - no significant position or facing change");
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