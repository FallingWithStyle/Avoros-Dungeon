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
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Broadcast message to all connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  return httpServer;
}