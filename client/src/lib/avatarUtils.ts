/**
 * Utility function to generate a deterministic avatar URL for a crawler.
 * Accepts a string or number for the id parameter.
 *
 * @param name - The crawler's name
 * @param id - The crawler's unique identifier (string or number)
 * @returns The avatar image URL as a string
 */
export function getAvatarUrl(name: string, id: string | number): string {
  // Ensure id is a string
  const idStr = String(id);
  const seed = name + idStr;
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1e293b`;
}
