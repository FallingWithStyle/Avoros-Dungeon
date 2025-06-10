/**
 * File: authUtils.ts
 * Responsibility: Provides authentication utilities for user login, logout, and session management
 */
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}