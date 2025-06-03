/**
 * Returns the experience required to reach the next level.
 * @param level - The current level of the crawler (integer).
 * @param baseExp - The base EXP factor for scaling (default: 100).
 * @returns The required experience as a rounded integer.
 */
export function expRequired(level: number, baseExp: number = 100): number {
  return Math.round(baseExp * Math.log(level + 1));
}

