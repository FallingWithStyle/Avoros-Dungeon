/**
 * File: vector.ts
 * Responsibility: Vector math utilities for movement and directional calculations
 * Notes: Provides functions for converting movement vectors to degrees and other vector operations
 */

export function getFacingDegreesFromMovement(dx: number, dy: number): number {
  let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return Math.round(angle);
}