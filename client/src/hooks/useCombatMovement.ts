/**
 * File: useCombatMovement.ts
 * Responsibility: Handle player movement, rotation, keyboard/gesture controls, and room transitions for combat view
 * Notes: Extracted from combat-view-panel.tsx to improve code organization and reusability
 */

import { useState, useCallback, useRef } from "react";
import { combatSystem } from "@shared/combat-system";
import { useToast } from "@/hooks/use-toast";
import * as CombatUtils from "../utils/combat-utils";
import { useKeyboardMovement } from "@/hooks/useKeyboardMovement";
import { useGestureMovement } from "@/hooks/useGestureMovement";
import { handleRoomChangeWithRefetch } from "@/lib/roomChangeUtils";
import type { CrawlerWithDetails } from "@shared/schema";

interface UseCombatMovementProps {
  crawler: CrawlerWithDetails;
  combatState: any;
  tacticalEntities: any[];
  roomConnections: any[];
  selectedTarget: string | null;
  isMobile: boolean;
  onRoomTransition: () => void;
  handleRoomChange: () => void;
  onTargetCycle?: () => void;
  onTargetClear?: () => void;
}

export function useCombatMovement({
  crawler,
  combatState,
  tacticalEntities,
  roomConnections,
  selectedTarget,
  isMobile,
  onRoomTransition,
  handleRoomChange,
  onTargetCycle,
  onTargetClear,
}: UseCombatMovementProps) {
  const { toast } = useToast();
  const [isMoving, setIsMoving] = useState(false);
  const lastMoveTime = useRef<number>(0);
  const MOVE_COOLDOWN = 1000; // 1 second cooldown between moves

  // Room transition handler for combat view - INSTANT with background validation
  const handleRoomTransition = useCallback(
    async (direction: string) => {
      if (!crawler?.id) {
        console.error("No crawler ID available for room transition");
        return;
      }

      // Prevent concurrent movements and enforce cooldown
      const now = Date.now();
      if (isMoving || (now - lastMoveTime.current) < MOVE_COOLDOWN) {
        return;
      }

      setIsMoving(true);
      lastMoveTime.current = now;

      // Store the movement direction for proper entry positioning
      sessionStorage.setItem('entryDirection', direction);

      // INSTANT: Clear combat state and update UI immediately
      onRoomTransition();
      handleRoomChange();

      // Show immediate feedback with room loading indicator
      toast({
        title: "🚪 Moving " + direction,
        description: "Loading new area...",
        variant: "default",
      });

      // Background validation - don't block UI
      try {
        const success = await handleRoomChangeWithRefetch(crawler.id, direction);

        if (!success) {
          // Only show error if server rejects - UI already updated optimistically
          toast({
            title: "Movement Issue",
            description: "Room transition may need validation",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Background room transition validation:", error);
        // Don't show error toast - movement already happened optimistically
      } finally {
        setIsMoving(false);
      }
    },
    [crawler?.id, handleRoomChange, toast, isMoving, onRoomTransition],
  );

  // Movement handler with enhanced collision detection and room transitions
  const handleMovement = useCallback(
    (direction: { x: number; y: number }) => {
      if (!combatState?.entities) return;

      const player = combatState.entities.find((e) => e.id === "player");
      if (!player) return;

      if (direction.x === 0 && direction.y === 0) return;

      const moveSpeed = 2.5; // Slightly slower for better control
      let newX = player.position.x + direction.x * moveSpeed;
      let newY = player.position.y + direction.y * moveSpeed;

      // Enhanced collision detection with room layout elements
      const playerRadius = 2.0; // Slightly larger for better collision feel

      const checkCollisionWithElements = (x: number, y: number): boolean => {
        if (!tacticalEntities || !Array.isArray(tacticalEntities)) return false;

        return tacticalEntities.some((entity: any) => {
          if (
            entity.type !== "cover" &&
            entity.type !== "wall" &&
            entity.type !== "door"
          )
            return false;

          // Use entity position directly (already in percentage format)
          const elementLeft = entity.position.x - 2;
          const elementRight = entity.position.x + 2;
          const elementTop = entity.position.y - 2;
          const elementBottom = entity.position.y + 2;

          const buffer = 1.0; // Larger buffer for smoother collision
          return (
            x + playerRadius > elementLeft - buffer &&
            x - playerRadius < elementRight + buffer &&
            y + playerRadius > elementTop - buffer &&
            y - playerRadius < elementBottom + buffer
          );
        });
      };

      // Check for collision with other entities (hostile mobs)
      const checkCollisionWithEntities = (x: number, y: number): boolean => {
        if (!combatState?.entities) return false;

        return combatState.entities.some((entity: any) => {
          if (entity.id === "player" || entity.hp <= 0) return false;

          const distance = CombatUtils.calculateDistance({x, y}, entity.position);

          return distance < 4; // Minimum distance to other entities
        });
      };

      // Check room boundaries with gates for exits
      const gateStart = 40;
      const gateEnd = 60;
      const boundary = 5;

      // Declare exitDirection outside the condition
      let exitDirection = "";

      // Check if we're trying to move through an exit (only if not already moving)
      if (!isMoving) {
        const availableDirections = roomConnections.map(
          (conn: any) => conn.direction,
        );

        // Tight gate detection - require player to actually reach the edge
        const gateAreaStart = 42;
        const gateAreaEnd = 58;
        const exitBoundary = 3; // Much tighter - must be very close to edge

        if (
          newY <= exitBoundary &&
          direction.y < 0 &&
          availableDirections.includes("north")
        ) {
          if (newX >= gateAreaStart && newX <= gateAreaEnd) {
            exitDirection = "north";
            handleRoomTransition("north");
            return true; // Stop movement processing since we're transitioning
          }
        } else if (
          newY >= 100 - exitBoundary &&
          direction.y > 0 &&
          availableDirections.includes("south")
        ) {
          if (newX >= gateAreaStart && newX <= gateAreaEnd) {
            exitDirection = "south";
            handleRoomTransition("south");
            return true; // Stop movement processing since we're transitioning
          }
        } else if (
          newX >= 100 - exitBoundary &&
          direction.x > 0 &&
          availableDirections.includes("east")
        ) {
          if (newY >= gateAreaStart && newY <= gateAreaEnd) {
            exitDirection = "east";
            handleRoomTransition("east");
            return true; // Stop movement processing since we're transitioning
          }
        } else if (
          newX <= exitBoundary &&
          direction.x < 0 &&
          availableDirections.includes("west")
        ) {
          if (newY >= gateAreaStart && newY <= gateAreaEnd) {
            exitDirection = "west";
            handleRoomTransition("west");
            return true; // Stop movement processing since we're transitioning
          }
        }
      }

      // If trying to exit, clamp to boundary but allow closer approach to gates
      if (exitDirection) {
        // Allow player to get closer to the gate
        newX = Math.max(3, Math.min(97, newX));
        newY = Math.max(3, Math.min(97, newY));
      } else {
        // Normal boundary clamping
        newX = Math.max(boundary, Math.min(100 - boundary, newX));
        newY = Math.max(boundary, Math.min(100 - boundary, newY));
      }

      // Check for collisions and handle sliding movement
      const wouldCollideWithElements = checkCollisionWithElements(newX, newY);
      const wouldCollideWithEntities = checkCollisionWithEntities(newX, newY);

      if (wouldCollideWithElements || wouldCollideWithEntities) {
        // Try moving only horizontally
        const horizontalX = Math.max(
          boundary,
          Math.min(100 - boundary, player.position.x + direction.x * moveSpeed),
        );
        const horizontalY = player.position.y;

        if (
          !checkCollisionWithElements(horizontalX, horizontalY) &&
          !checkCollisionWithEntities(horizontalX, horizontalY)
        ) {
          newX = horizontalX;
          newY = horizontalY;
        } else {
          // Try moving only vertically
          const verticalX = player.position.x;
          const verticalY = Math.max(
            boundary,
            Math.min(
              100 - boundary,
              player.position.y + direction.y * moveSpeed,
            ),
          );

          if (
            !checkCollisionWithElements(verticalX, verticalY) &&
            !checkCollisionWithEntities(verticalX, verticalY)
          ) {
            newX = verticalX;
            newY = verticalY;
          } else {
            // Can't move at all, just update facing
            if (direction.x !== 0 || direction.y !== 0) {
              let facing =
                Math.atan2(direction.x, -direction.y) * (180 / Math.PI);
              if (facing < 0) facing += 360;
              combatSystem.updateEntity("player", {
                facing: Math.round(facing),
              });
            }
            return;
          }
        }
      }

      // Calculate facing direction based on movement
      let facing = Math.atan2(direction.x, -direction.y) * (180 / Math.PI);
      if (facing < 0) {
        facing += 360;
      }
      const newFacing = Math.round(facing);

      // Update position
      combatSystem.moveEntityToPosition("player", { x: newX, y: newY });

      // Update facing if not targeting something
      if (!selectedTarget) {
        const currentFacing = player.facing || 0;
        const facingDiff = Math.abs(newFacing - currentFacing);
        const normalizedDiff = Math.min(facingDiff, 360 - facingDiff);

        if (normalizedDiff > 5) { // Increased threshold to reduce jitter
          combatSystem.updateEntity("player", { facing: newFacing });
        }
      }
    },
    [
      combatState?.entities,
      selectedTarget,
      tacticalEntities,
      handleRoomTransition,
      roomConnections,
      isMoving,
    ],
  );

  // Handle rotation
  const handleRotation = useCallback(
    (direction: "left" | "right") => {
      if (!combatState?.entities) return;

      const player = combatState.entities.find((e) => e.id === "player");
      if (!player) return;

      const rotationAmount = 15; // degrees
      const currentFacing = player.facing || 0;
      const newFacing =
        direction === "left"
          ? (currentFacing - rotationAmount + 360) % 360
          : (currentFacing + rotationAmount) % 360;

      combatSystem.updateEntity("player", { facing: newFacing });
    },
    [combatState?.entities],
  );

  // Enable keyboard movement
  useKeyboardMovement({
    onMovement: handleMovement,
    onRotation: handleRotation,
    onTargetCycle,
    onTargetClear,
    isEnabled: !combatState?.isInCombat, // Only enable when not in combat
  });

  // Use gesture movement hook for mobile
  const { containerRef, bind } = useGestureMovement({
    onMovement: handleMovement,
    isEnabled: isMobile && !combatState?.isInCombat,
  });

  return {
    handleMovement,
    handleRotation,
    handleRoomTransition,
    isMoving,
    containerRef,
    bind,
  };
}