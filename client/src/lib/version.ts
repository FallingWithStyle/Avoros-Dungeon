// App version - update this when making releases or significant changes
export const APP_VERSION = "1.0.1";

// Build timestamp for development tracking
export const BUILD_TIMESTAMP = new Date().toISOString();

// Version display utility
export const getVersionInfo = () => {
  return {
    version: APP_VERSION,
    buildTime: BUILD_TIMESTAMP,
    displayVersion: `v${APP_VERSION}`,
    fullVersion: `v${APP_VERSION} (${BUILD_TIMESTAMP.split('T')[0]})`
  };
};