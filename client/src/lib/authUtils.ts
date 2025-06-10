/**
 * File: authUtils.ts
 * Responsibility: Authentication utility functions for error handling and user session management
 * Notes: Primarily used for detecting 401 unauthorized errors in API responses
 */

export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}