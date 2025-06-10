/**
 * File: index.ts
 * Responsibility: Main route registration and WebSocket server setup
 * Notes: Orchestrates all route modules, WebSocket connections, and system status endpoints
 */
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "../replitAuth";
import { registerAuthRoutes } from "./auth";
import { registerCrawlerRoutes } from "./crawler";
import { registerExplorationRoutes } from "./exploration";
import { registerCombatRoutes } from "./combat";
import { registerDebugRoutes } from "./debug";
import { registerSeasonRoutes } from "./season";
import { registerDataRoutes } from "./data";
import { redisStatus } from "../lib/redis-status";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Register all route modules
  registerAuthRoutes(app);
  registerCrawlerRoutes(app);
  registerExplorationRoutes(app);
  registerCombatRoutes(app);
  registerDebugRoutes(app);
  registerSeasonRoutes(app);
  registerDataRoutes(app);

  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: "/ws",
    perMessageDeflate: false
  });

  wss.on("connection", (ws, request) => {
    console.log("WebSocket client connected from:", request.socket.remoteAddress);

    // Send welcome message
    ws.send(JSON.stringify({
      type: "connection",
      data: { message: "Connected to game server" },
      timestamp: Date.now()
    }));

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log("WebSocket message received:", message);

        // Echo the message back to sender
        ws.send(JSON.stringify({
          type: "echo",
          data: message,
          timestamp: Date.now()
        }));

        // Broadcast message to all other connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "broadcast",
              data: message,
              timestamp: Date.now()
            }));
          }
        });
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        ws.send(JSON.stringify({
          type: "error",
          data: { message: "Failed to process message" },
          timestamp: Date.now()
        }));
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Debug routes are already registered above with registerDebugRoutes(app)

  // Redis status endpoint
  app.get("/api/system/redis-status", async (req, res) => {
    try {
      const { redisService } = await import('./lib/redis-service');
      const isAvailable = await redisStatus.getStatus();
      const isForcedFallback = redisService.isForceFallbackMode();
      
      let message = 'Redis is operational';
      if (isForcedFallback) {
        message = 'Redis fallback mode enabled (debug override)';
      } else if (!isAvailable) {
        message = 'Redis is unavailable - using database fallback';
      }
      
      res.json({ 
        available: isAvailable && !isForcedFallback,
        fallbackMode: isForcedFallback,
        message
      });
    } catch (error) {
      res.json({ 
        available: false, 
        fallbackMode: false,
        message: 'Redis status check failed'
      });
    }
  });

  return httpServer;
}