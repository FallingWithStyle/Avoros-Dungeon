/**
 * File: version.ts
 * Responsibility: Application version management and build information tracking
 * Notes: Provides version constants and utilities for displaying app version in UI
 */

// App version - update this when making releases or significant changes
export const APP_VERSION = "0.8.6";

// Build timestamp for development tracking
export const BUILD_TIMESTAMP = new Date().toISOString();

// Version display utility
export const getVersionInfo = () => {
  return {
    version: APP_VERSION,
    buildTime: BUILD_TIMESTAMP,
    displayVersion: `v${APP_VERSION}`,
    fullVersion: `v${APP_VERSION} (${BUILD_TIMESTAMP.split("T")[0]})`,
  };
};

// Example dungeon (This part is added to demonstrate renaming)
const dungeon = { name: "Avavor" };
console.log(`Original dungeon name: ${dungeon.name}`);
dungeon.name = "Avoros";
console.log(`New dungeon name: ${dungeon.name}`);
