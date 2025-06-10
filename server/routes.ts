/**
 * File: routes.ts
 * Responsibility: Legacy routes entry point for backward compatibility
 * Notes: Re-exports registerRoutes from the modular routes directory structure
 */
// Legacy routes file - now using modular structure
// See server/routes/ directory for the new organized route modules
export { registerRoutes } from "./routes/index";