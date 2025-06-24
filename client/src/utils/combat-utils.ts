
/**
 * File: combat-utils.ts
 * Responsibility: Combat utility functions for collision detection, distance calculations, and position validation
 * Notes: Extracted from combat-view-panel.tsx to reduce component complexity and improve reusability
 */

import type { CombatEntity } from "@shared/combat-system";

// Position and geometry interfaces
export interface Position {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
}

// Distance calculations
export function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateManhattanDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos2.x - pos1.x) + Math.abs(pos2.y - pos1.y);
}

export function calculateDistanceSquared(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return dx * dx + dy * dy;
}

// Position validation
export function isPositionValid(position: Position): boolean {
  return (
    position &&
    typeof position.x === "number" &&
    typeof position.y === "number" &&
    !isNaN(position.x) &&
    !isNaN(position.y) &&
    isFinite(position.x) &&
    isFinite(position.y)
  );
}

export function isPositionInBounds(position: Position, bounds: Rectangle): boolean {
  return (
    position.x >= bounds.x &&
    position.x <= bounds.x + bounds.width &&
    position.y >= bounds.y &&
    position.y <= bounds.y + bounds.height
  );
}

export function isPositionInGrid(position: Position, gridSize: number = 100): boolean {
  return (
    position.x >= 0 &&
    position.x <= gridSize &&
    position.y >= 0 &&
    position.y <= gridSize
  );
}

// Collision detection
export function isPointInCircle(point: Position, circle: Circle): boolean {
  const distance = calculateDistance(point, { x: circle.x, y: circle.y });
  return distance <= circle.radius;
}

export function isPointInRectangle(point: Position, rect: Rectangle): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function doCirclesOverlap(circle1: Circle, circle2: Circle): boolean {
  const distance = calculateDistance(
    { x: circle1.x, y: circle1.y },
    { x: circle2.x, y: circle2.y }
  );
  return distance <= circle1.radius + circle2.radius;
}

export function doRectanglesOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

// Entity-specific collision detection
export function isEntityBlocking(
  position: Position,
  entity: CombatEntity,
  entityRadius: number = 2
): boolean {
  if (!entity || !entity.position || entity.hp <= 0) {
    return false;
  }

  const distance = calculateDistance(position, entity.position);
  return distance < entityRadius;
}

export function findBlockingEntities(
  position: Position,
  entities: CombatEntity[],
  excludeEntityId?: string,
  entityRadius: number = 2
): CombatEntity[] {
  return entities.filter((entity) => {
    if (!entity || entity.id === excludeEntityId || entity.hp <= 0) {
      return false;
    }
    return isEntityBlocking(position, entity, entityRadius);
  });
}

// Range and weapon calculations
export function isPositionInRange(
  from: Position,
  to: Position,
  range: number
): boolean {
  const distance = calculateDistance(from, to);
  return distance <= range;
}

export function getEntitiesInRange(
  center: Position,
  entities: CombatEntity[],
  range: number,
  excludeEntityId?: string
): CombatEntity[] {
  return entities.filter((entity) => {
    if (!entity || entity.id === excludeEntityId || entity.hp <= 0) {
      return false;
    }
    return isPositionInRange(center, entity.position, range);
  });
}

export function getWeaponRange(weapon: any): number {
  if (!weapon) return 1; // Default unarmed range
  return weapon.range || weapon.baseRange || 1;
}

export function getWeaponRangeInGridUnits(weapon: any): number {
  const range = getWeaponRange(weapon);
  return range * 10; // Convert to grid units (1 range = 10 grid units)
}

// Movement validation
export function isMovementValid(
  from: Position,
  to: Position,
  entities: CombatEntity[],
  layoutEntities: any[] = [],
  excludeEntityId?: string
): { valid: boolean; reason?: string } {
  // Check if target position is valid
  if (!isPositionValid(to)) {
    return { valid: false, reason: "Invalid target position" };
  }

  // Check if target position is in bounds
  if (!isPositionInGrid(to)) {
    return { valid: false, reason: "Position out of bounds" };
  }

  // Check for entity collisions
  const blockingEntities = findBlockingEntities(to, entities, excludeEntityId);
  if (blockingEntities.length > 0) {
    return {
      valid: false,
      reason: "Position blocked by " + blockingEntities[0].name,
    };
  }

  // Check for layout entity collisions (walls, obstacles)
  const layoutCollision = layoutEntities.find((layoutEntity) => {
    if (layoutEntity.type === "wall" || layoutEntity.type === "obstacle") {
      const distance = calculateDistance(to, layoutEntity.position);
      return distance < 3; // 3 grid units collision radius for layout entities
    }
    return false;
  });

  if (layoutCollision) {
    return { valid: false, reason: "Position blocked by " + layoutCollision.type };
  }

  return { valid: true };
}

// Path finding helpers
export function getDirectionToTarget(from: Position, to: Position): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.atan2(dx, -dy) * (180 / Math.PI);
}

export function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 360;
  while (angle >= 360) angle -= 360;
  return angle;
}

export function getPositionInDirection(
  from: Position,
  direction: number,
  distance: number
): Position {
  const radians = (direction * Math.PI) / 180;
  return {
    x: from.x + Math.sin(radians) * distance,
    y: from.y - Math.cos(radians) * distance,
  };
}

// Grid and coordinate utilities
export function snapToGrid(position: Position, gridSize: number = 1): Position {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

export function clampToGrid(position: Position, maxSize: number = 100): Position {
  return {
    x: Math.max(0, Math.min(maxSize, position.x)),
    y: Math.max(0, Math.min(maxSize, position.y)),
  };
}

export function convertScreenToGrid(
  screenPos: Position,
  containerSize: { width: number; height: number }
): Position {
  return {
    x: (screenPos.x / containerSize.width) * 100,
    y: (screenPos.y / containerSize.height) * 100,
  };
}

export function convertGridToScreen(
  gridPos: Position,
  containerSize: { width: number; height: number }
): Position {
  return {
    x: (gridPos.x / 100) * containerSize.width,
    y: (gridPos.y / 100) * containerSize.height,
  };
}

// Room transition helpers
export function getExitPosition(direction: string): Position {
  switch (direction) {
    case "north":
      return { x: 50, y: 95 };
    case "south":
      return { x: 50, y: 5 };
    case "east":
      return { x: 5, y: 50 };
    case "west":
      return { x: 95, y: 50 };
    case "up":
    case "down":
      return { x: 50, y: 50 };
    default:
      return { x: 50, y: 50 };
  }
}

export function getEntrancePosition(direction: string): Position {
  switch (direction) {
    case "north":
      return { x: 50, y: 5 };
    case "south":
      return { x: 50, y: 95 };
    case "east":
      return { x: 95, y: 50 };
    case "west":
      return { x: 5, y: 50 };
    case "up":
    case "down":
      return { x: 50, y: 50 };
    default:
      return { x: 50, y: 50 };
  }
}

// Tactical positioning helpers
export function getRandomPositionInArea(
  center: Position,
  radius: number,
  gridSize: number = 100
): Position {
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radius;
  const position = {
    x: center.x + Math.cos(angle) * distance,
    y: center.y + Math.sin(angle) * distance,
  };
  return clampToGrid(position, gridSize);
}

export function getFormationPosition(
  center: Position,
  index: number,
  formation: "line" | "circle" | "square" = "circle",
  spacing: number = 10
): Position {
  switch (formation) {
    case "line":
      return {
        x: center.x + (index - 1) * spacing,
        y: center.y,
      };
    case "circle":
      const angle = (index * 2 * Math.PI) / 8; // Assume max 8 entities in circle
      return {
        x: center.x + Math.cos(angle) * spacing,
        y: center.y + Math.sin(angle) * spacing,
      };
    case "square":
      const row = Math.floor(index / 3);
      const col = index % 3;
      return {
        x: center.x + (col - 1) * spacing,
        y: center.y + (row - 1) * spacing,
      };
    default:
      return center;
  }
}

// Combat calculations
export function calculateCoverBonus(
  attacker: Position,
  target: Position,
  coverPositions: Position[]
): number {
  // Simple line-of-sight calculation for cover
  for (const cover of coverPositions) {
    const distanceToTarget = calculateDistance(attacker, target);
    const distanceToCover = calculateDistance(attacker, cover);
    const coverToTarget = calculateDistance(cover, target);

    // If cover is between attacker and target, apply bonus
    if (
      distanceToCover < distanceToTarget &&
      coverToTarget < distanceToTarget &&
      Math.abs(distanceToCover + coverToTarget - distanceToTarget) < 2
    ) {
      return 0.5; // 50% damage reduction
    }
  }
  return 0;
}

export function getOptimalAttackPosition(
  attacker: Position,
  target: Position,
  weapon: any,
  obstacles: Position[] = []
): Position {
  const weaponRange = getWeaponRangeInGridUnits(weapon);
  const direction = getDirectionToTarget(target, attacker);
  const distance = Math.min(weaponRange * 0.8, 15); // Stay slightly inside range

  let bestPosition = getPositionInDirection(target, direction, distance);

  // Adjust for obstacles
  for (const obstacle of obstacles) {
    if (calculateDistance(bestPosition, obstacle) < 5) {
      // Try alternative positions
      for (let angleOffset = 30; angleOffset <= 180; angleOffset += 30) {
        const altPosition1 = getPositionInDirection(
          target,
          direction + angleOffset,
          distance
        );
        const altPosition2 = getPositionInDirection(
          target,
          direction - angleOffset,
          distance
        );

        if (calculateDistance(altPosition1, obstacle) >= 5) {
          bestPosition = altPosition1;
          break;
        }
        if (calculateDistance(altPosition2, obstacle) >= 5) {
          bestPosition = altPosition2;
          break;
        }
      }
    }
  }

  return clampToGrid(bestPosition);
}
