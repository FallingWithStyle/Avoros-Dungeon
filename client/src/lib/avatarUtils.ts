/**
 * File: avatarUtils.ts
 * Responsibility: Avatar generation utilities for creating deterministic profile images
 * Notes: Uses Dicebear API to generate consistent avatars based on crawler name and serial
 */

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

/**
 * Get avatar for a crawler - returns either image URL or text fallback
 * Never uses crawler ID as part of the avatar generation
 *
 * @param name - The crawler's name
 * @param serial - The crawler's serial number
 * @returns Object with either imageUrl or textFallback
 */
export function getAvatar(name?: string, serial?: string): { imageUrl?: string; textFallback?: string } {
  // Check if we have valid name and serial
  if (name && name.trim() && serial && serial.trim()) {
    return {
      imageUrl: getAvatarUrl(name, serial)
    };
  }
  
  // Return text fallback if name/serial are missing or invalid
  const fallbackName = name?.trim() || "Unknown";
  const fallbackSerial = serial?.trim() || "???";
  
  return {
    textFallback: `${fallbackName} [${fallbackSerial}]`
  };
}