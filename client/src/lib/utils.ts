/**
 * File: utils.ts
 * Responsibility: General utility functions including CSS class merging and common helpers
 */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}