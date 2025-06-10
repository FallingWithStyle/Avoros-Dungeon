/**
 * File: utils.ts
 * Responsibility: General utility functions for the application
 * Notes: Contains the cn function for merging Tailwind CSS classes with conditional logic
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
