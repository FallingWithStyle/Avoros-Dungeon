export function getFacingDegreesFromMovement(dx: number, dy: number): number {
  let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return Math.round(angle);
}