/**
 * File: index.ts
 * Responsibility: Main server entry point and application initialization
 * Notes: Sets up Express server, middleware, routes, database initialization, and background processes
 */
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./init-db";
import { storage } from "./storage";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Only log movement/input related API calls
      const inputRelatedPaths = ['/movement', '/move', '/direction', '/input'];
      const isInputRelated = inputRelatedPaths.some(inputPath => 
        path.includes(inputPath)
      );
      
      if (isInputRelated) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    }
  });

  next();
});

(async () => {
  try {
    console.log('🚀 Starting server initialization...');

    // Initialize database with game data - with timeout and fallback
    console.log('📊 Initializing database...');
    let dbInitialized = false;

    try {
      // Add shorter timeout to database initialization
      const initPromise = initializeDatabase();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database initialization timeout')), 15000)
      );

      await Promise.race([initPromise, timeoutPromise]);
      dbInitialized = true;
      console.log('✅ Database initialized');
    } catch (error) {
      console.warn(`⚠️ Database initialization failed:`, error.message);
      console.log('🔄 Continuing with server startup - database may need manual initialization');
      // Don't throw - allow server to start anyway
    }

    console.log('🛣️ Registering routes...');
    const server = await registerRoutes(app);
    console.log('✅ Routes registered');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5000;
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';

  // Start mob respawn background service
  setInterval(async () => {
    try {
      await storage.mobStorage.processRespawns();
    } catch (error) {
      console.error('Error processing mob respawns:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  // Global error handlers to prevent crashes
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit, just log the error
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit, just log the error - but ensure it's handled
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => {}); // Silence the rejection
    }
  });

  // Start the server with error handling
  const PORT = process.env.PORT || 5000;
  const serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 App URL: http://localhost:${PORT}`);
  });

  serverInstance.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
    } else {
      console.error('Server error:', error);
    }
  });
    } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();