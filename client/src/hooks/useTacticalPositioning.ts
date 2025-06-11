
/**
 * File: useTacticalPositioning.ts
 * Responsibility: Handle tactical positioning, gate detection, and room transitions
 * Notes: Focuses on movement validation and positioning logic, relies on other hooks for input handling
 */

import { useCallback } from "react";
import { combatSystem } from "@shared/combat-system";

interface UseTacticalPositioningProps {
  effectiveTacticalData: any;
  combatState: any;
  onRoomMovement: (direction: string) => void;
}

interface MovementVector {
  x: number;
  y: number;
}

export function useTacticalPositioning({
  effectiveTacticalData,
  combatState,
  onRoomMovement
}: UseTacticalPositioningProps) {
  const speed = 2.5; // Movement speed per frame

  const handleMovement = useCallback(
    (direction: MovementVector) => {
      if (!effectiveTacticalData || combatState.isInCombat) {
        console.log("Movement blocked - no tactical data or in combat");
        return;
      }

      const playerEntity = combatState.entities.find((e: any) => e.id === "player");
      if (!playerEntity) {
        console.log("No player entity found for movement");
        return;
      }

      const availableDirections = effectiveTacticalData.availableDirections || [];

      // Calculate new position
      let newX = playerEntity.position.x + (direction.x * speed);
      let newY = playerEntity.position.y + (direction.y * speed);

      const gateStart = 40; // Gate starts at 40% 
      const gateEnd = 60;   // Gate ends at 60%

      console.log("🎯 Movement attempt:", {
        currentPos: { x: playerEntity.position.x, y: playerEntity.position.y },
        newPos: { x: newX, y: newY },
        availableDirections,
        gateZone: { start: gateStart, end: gateEnd }
      });

      // Check for room transition through gates
      let roomTransitionDirection = "";

      if (newY < 0 && availableDirections.includes("north")) {
        console.log("🚪 Attempting north exit - checking gate bounds");
        console.log("Player X position:", playerEntity.position.x, "Gate bounds:", gateStart, "-", gateEnd);
        if (playerEntity.position.x >= gateStart && playerEntity.position.x <= gateEnd) {
          console.log("✅ Player is within north gate bounds - allowing transition");
          roomTransitionDirection = "north";
        } else {
          console.log("❌ Player is outside north gate bounds - blocking movement");
        }
      } else if (newY > 100 && availableDirections.includes("south")) {
        console.log("🚪 Attempting south exit - checking gate bounds");
        console.log("Player X position:", playerEntity.position.x, "Gate bounds:", gateStart, "-", gateEnd);
        if (playerEntity.position.x >= gateStart && playerEntity.position.x <= gateEnd) {
          console.log("✅ Player is within south gate bounds - allowing transition");
          roomTransitionDirection = "south";
        } else {
          console.log("❌ Player is outside south gate bounds - blocking movement");
        }
      } else if (newX > 100 && availableDirections.includes("east")) {
        console.log("🚪 Attempting east exit - checking gate bounds");
        console.log("Player Y position:", playerEntity.position.y, "Gate bounds:", gateStart, "-", gateEnd);
        if (playerEntity.position.y >= gateStart && playerEntity.position.y <= gateEnd) {
          console.log("✅ Player is within east gate bounds - allowing transition");
          roomTransitionDirection = "east";
        } else {
          console.log("❌ Player is outside east gate bounds - blocking movement");
        }
      } else if (newX < 0 && availableDirections.includes("west")) {
        console.log("🚪 Attempting west exit - checking gate bounds");
        console.log("Player Y position:", playerEntity.position.y, "Gate bounds:", gateStart, "-", gateEnd);
        if (playerEntity.position.y >= gateStart && playerEntity.position.y <= gateEnd) {
          console.log("✅ Player is within west gate bounds - allowing transition");
          roomTransitionDirection = "west";
        } else {
          console.log("❌ Player is outside west gate bounds - blocking movement");
        }
      }

      // Handle room transition
      if (roomTransitionDirection) {
        console.log("🏃 Transitioning to new room:", roomTransitionDirection);
        onRoomMovement(roomTransitionDirection);
        return;
      }

      // Clamp to room boundaries (5% margin from edges)
      const finalX = Math.max(5, Math.min(95, newX));
      const finalY = Math.max(5, Math.min(95, newY));

      // Log wall collisions
      if (newX !== finalX || newY !== finalY) {
        console.log("🧱 Wall collision detected:");
        console.log("  Attempted position:", { x: newX, y: newY });
        console.log("  Clamped to:", { x: finalX, y: finalY });
        console.log("  Collision type:", 
          newX < 5 ? "west wall" : 
          newX > 95 ? "east wall" : 
          newY < 5 ? "north wall" : 
          newY > 95 ? "south wall" : "boundary"
        );
      }

      if (
        Math.abs(finalX - playerEntity.position.x) > 0.1 ||
        Math.abs(finalY - playerEntity.position.y) > 0.1
      ) {
        console.log("🏃 Moving player to:", { x: finalX, y: finalY });
        combatSystem.queueMoveAction(playerEntity.id, { x: finalX, y: finalY });
      } else {
        console.log("🚫 Movement blocked - no significant position change");
      }
    },
    [effectiveTacticalData, combatState, onRoomMovement, speed],
  );

  return {
    handleMovement
  };
}
