/**
 * Utility function to generate a deterministic avatar URL for a crawler.
 * Accepts a string or number for the id parameter.
 *
 * @param name - The crawler's name
 * @param serial - The crawler's unique identifier (string or number)
 * @returns The avatar image URL as a string
 */
export function getAvatarUrl(name: string, serial: string | number, backgroundColor: string = "1e293b"): string {
  const seed = `${name}${serial}`;
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${backgroundColor}`;
}