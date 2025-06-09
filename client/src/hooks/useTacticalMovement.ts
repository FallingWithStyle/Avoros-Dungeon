
import { useEffect, useCallback } from 'react';
import { combatSystem } from '@shared/combat-system';
import type { CombatEntity } from '@shared/combat-system';

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
  
  // WASD Movement Input with diagonal support
  useEffect(() => {
    const keysPressed = new Set<string>();
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const key = event.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) {
        return; // Ignore other keys
      }

      keysPressed.add(key);
      event.preventDefault(); // Prevent default scrolling

      const playerEntity = combatState.entities.find(e => e.id === "player");
      if (!playerEntity) {
        console.log("WASD pressed but no player entity found. Entities:", combatState.entities.map(e => e.id));
        return;
      }

      // Calculate direction based on all currently pressed keys
      let direction = { x: 0, y: 0 };
      let keyPressed = "";

      if (keysPressed.has('w')) {
        direction.y -= 1;
        keyPressed += "W";
      }
      if (keysPressed.has('s')) {
        direction.y += 1;
        keyPressed += "S";
      }
      if (keysPressed.has('a')) {
        direction.x -= 1;
        keyPressed += "A";
      }
      if (keysPressed.has('d')) {
        direction.x += 1;
        keyPressed += "D";
      }

      // Normalize diagonal movement to prevent faster diagonal speed
      if (direction.x !== 0 && direction.y !== 0) {
        const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        direction.x /= length;
        direction.y /= length;
        keyPressed += " (Diagonal)";
      }

      console.log(`${keyPressed} pressed. Player at:`, playerEntity.position);

      const speed = 20; // 10x faster movement speed
      const moveDistance = speed; // Move in larger percentage units
      let newX = playerEntity.position.x + direction.x * moveDistance;
      let newY = playerEntity.position.y + direction.y * moveDistance;

      // Check if player is approaching a door and allow boundary crossing
      const isApproachingDoor = (x: number, y: number, dir: { x: number, y: number }) => {
        if (!effectiveTacticalData?.availableDirections) return false;

        const exits = {
          north: effectiveTacticalData.availableDirections.includes("north"),
          south: effectiveTacticalData.availableDirections.includes("south"),
          east: effectiveTacticalData.availableDirections.includes("east"),
          west: effectiveTacticalData.availableDirections.includes("west"),
        };

        // Check if moving toward a door (within gate area)
        if (dir.y < 0 && exits.north && y <= 10 && x >= 35 && x <= 65) return true; // Moving north toward north door
        if (dir.y > 0 && exits.south && y >= 90 && x >= 35 && x <= 65) return true; // Moving south toward south door  
        if (dir.x > 0 && exits.east && x >= 90 && y >= 35 && y <= 65) return true; // Moving east toward east door
        if (dir.x < 0 && exits.west && x <= 8 && y >= 35 && y <= 65) return true; // Moving west toward west door

        return false;
      };

      // Allow crossing boundaries if approaching a door, otherwise clamp
      if (isApproachingDoor(playerEntity.position.x, playerEntity.position.y, direction)) {
        // Allow movement beyond normal boundaries for door transitions
        newX = Math.max(-5, Math.min(105, newX)); // Extended boundary for door crossing
        newY = Math.max(-5, Math.min(105, newY));
        console.log(`Door approach detected - allowing extended movement to (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
      } else {
        // Normal boundary clamping
        newX = Math.max(2, Math.min(98, newX)); // Leave small border
        newY = Math.max(2, Math.min(98, newY));
      }

      console.log(`Moving from (${playerEntity.position.x.toFixed(1)}, ${playerEntity.position.y.toFixed(1)}) to (${newX.toFixed(1)}, ${newY.toFixed(1)})`);

      // Queue the move action
      const success = combatSystem.queueMoveAction(playerEntity.id, { x: newX, y: newY });
      console.log(`Move action queued:`, success);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        keysPressed.delete(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [combatState.entities, effectiveTacticalData?.availableDirections]);

  // Gate crossing detection - triggers when player crosses through gates in correct direction
  useEffect(() => {
    if (!effectiveTacticalData?.room || !effectiveTacticalData?.availableDirections) return;

    const playerEntity = combatState.entities.find(e => e.id === "player");
    if (!playerEntity) return;

    const exits = {
      north: effectiveTacticalData.availableDirections.includes("north"),
      south: effectiveTacticalData.availableDirections.includes("south"),
      east: effectiveTacticalData.availableDirections.includes("east"),
      west: effectiveTacticalData.availableDirections.includes("west"),
    };

    const { x, y } = playerEntity.position;

    // Track player's previous position to determine movement direction
    const prevPosKey = `prevPlayerPosition_${effectiveTacticalData.room.id}`;
    const prevPosString = sessionStorage.getItem(prevPosKey);
    const prevPos = prevPosString ? JSON.parse(prevPosString) : null;

    // Skip detection if this is the first frame in a room (no previous position)
    if (!prevPos) {
      sessionStorage.setItem(prevPosKey, JSON.stringify({ x, y }));
      return;
    }

    // Calculate movement direction
    const deltaX = x - prevPos.x;
    const deltaY = y - prevPos.y;

    // Ignore large movement deltas (likely from room transitions)
    const maxDelta = 10; // Ignore movements larger than 10% of screen
    if (Math.abs(deltaX) > maxDelta || Math.abs(deltaY) > maxDelta) {
      sessionStorage.setItem(prevPosKey, JSON.stringify({ x, y }));
      return;
    }

    // Store current position for next frame
    sessionStorage.setItem(prevPosKey, JSON.stringify({ x, y }));

    // Define gate zones (center area of each wall)
    const gateZoneMin = 35;
    const gateZoneMax = 65;
    const edgeThreshold = 10; // Increased threshold for more reliable detection
    const minMovement = 0.1; // Lower minimum movement required

    let triggerDirection: string | null = null;

    // Check if player is in a gate zone AND actively moving through the door (not just near it)
    // Also check if player has moved beyond the normal boundary (indicating door crossing)
    if (exits.north && x >= gateZoneMin && x <= gateZoneMax && (y <= edgeThreshold || y < 0) && deltaY < -minMovement) {
      // Moving north through north gate - must be actively moving north
      triggerDirection = "north";
    } 
    else if (exits.south && x >= gateZoneMin && x <= gateZoneMax && (y >= (100 - edgeThreshold) || y > 100) && deltaY > minMovement) {
      // Moving south through south gate - must be actively moving south
      triggerDirection = "south";
    }
    else if (exits.east && y >= gateZoneMin && y <= gateZoneMax && (x >= (100 - edgeThreshold) || x > 100) && deltaX > minMovement) {
      // Moving east through east gate - must be actively moving east
      triggerDirection = "east";
    }
    else if (exits.west && y >= gateZoneMin && y <= gateZoneMax && (x <= edgeThreshold || x < 0) && deltaX < -minMovement) {
      // Moving west through west gate - must be actively moving west
      triggerDirection = "west";
    }

    if (triggerDirection) {
      // Prevent rapid multiple movements with a simple debounce
      const now = Date.now();
      const lastMovement = sessionStorage.getItem('lastProximityMovement');
      const lastMovementTime = lastMovement ? parseInt(lastMovement) : 0;

      if (now - lastMovementTime > 1000) { // 1 second cooldown
        console.log(`Player moving ${triggerDirection} through ${triggerDirection} gate at position (${x.toFixed(1)}, ${y.toFixed(1)}) with delta (${deltaX.toFixed(1)}, ${deltaY.toFixed(1)})`);
        sessionStorage.setItem('lastProximityMovement', now.toString());

        onRoomMovement(triggerDirection);
      }
    }
  }, [combatState.entities, effectiveTacticalData?.room?.id, effectiveTacticalData?.availableDirections, onRoomMovement]);

  return {
    // Return any utility functions that might be needed
  };
}
