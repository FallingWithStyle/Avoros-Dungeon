import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCrawlerSchema, insertChatMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Crawler routes
  app.get('/api/crawlers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const crawlers = await storage.getCrawlersBySponssor(userId);
      res.json(crawlers);
    } catch (error) {
      console.error("Error fetching crawlers:", error);
      res.status(500).json({ message: "Failed to fetch crawlers" });
    }
  });

  app.get('/api/crawlers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);
      
      if (!crawler) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      // Verify ownership
      if (crawler.sponsorId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(crawler);
    } catch (error) {
      console.error("Error fetching crawler:", error);
      res.status(500).json({ message: "Failed to fetch crawler" });
    }
  });

  app.post('/api/crawlers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const crawlerData = insertCrawlerSchema.parse({
        ...req.body,
        sponsorId: userId,
      });

      // Get crawler class to set base stats
      const classes = await storage.getCrawlerClasses();
      const crawlerClass = classes.find(c => c.id === crawlerData.classId);
      
      if (!crawlerClass) {
        return res.status(400).json({ message: "Invalid crawler class" });
      }

      // Set initial stats based on class
      const newCrawler = await storage.createCrawler({
        ...crawlerData,
        health: crawlerClass.baseHealth,
        maxHealth: crawlerClass.baseHealth,
        attack: crawlerClass.baseAttack,
        defense: crawlerClass.baseDefense,
        speed: crawlerClass.baseSpeed,
        tech: crawlerClass.baseTech,
      });

      // Create activity
      await storage.createActivity({
        userId,
        crawlerId: newCrawler.id,
        type: 'crawler_created',
        message: `${newCrawler.name} has entered the dungeon!`,
        details: null,
      });

      res.json(newCrawler);
    } catch (error) {
      console.error("Error creating crawler:", error);
      res.status(500).json({ message: "Failed to create crawler" });
    }
  });

  // Crawler classes
  app.get('/api/crawler-classes', async (req, res) => {
    try {
      const classes = await storage.getCrawlerClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching crawler classes:", error);
      res.status(500).json({ message: "Failed to fetch crawler classes" });
    }
  });

  // Combat and actions
  app.post('/api/crawlers/:id/explore', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);
      
      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      if (!crawler.isAlive || crawler.status !== 'active') {
        return res.status(400).json({ message: "Crawler is not available for exploration" });
      }

      // Check for existing active encounter
      const activeEncounter = await storage.getActiveEncounter(crawlerId);
      if (activeEncounter) {
        return res.status(400).json({ message: "Crawler is already in an encounter" });
      }

      // Get current floor info
      const floor = await storage.getFloor(crawler.currentFloor);
      if (!floor) {
        return res.status(400).json({ message: "Invalid floor" });
      }

      // Random encounter type
      const encounterChance = Math.random();
      let encounter;

      if (encounterChance < 0.6) {
        // Combat encounter
        const enemies = await storage.getEnemiesForFloor(crawler.currentFloor);
        if (enemies.length > 0) {
          const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
          encounter = await storage.createEncounter(crawlerId, floor.id, randomEnemy.id);
          
          await storage.createActivity({
            userId: req.user.claims.sub,
            crawlerId,
            type: 'combat_start',
            message: `${crawler.name} encountered ${randomEnemy.name} on Floor ${crawler.currentFloor}`,
            details: null,
          });
        }
      }

      if (!encounter) {
        // Exploration or other encounter
        encounter = await storage.createEncounter(crawlerId, floor.id);
        
        await storage.createActivity({
          userId: req.user.claims.sub,
          crawlerId,
          type: 'exploration',
          message: `${crawler.name} is exploring Floor ${crawler.currentFloor}`,
          details: null,
        });
      }

      res.json(encounter);
    } catch (error) {
      console.error("Error starting exploration:", error);
      res.status(500).json({ message: "Failed to start exploration" });
    }
  });

  app.post('/api/crawlers/:id/advance-floor', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);
      
      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      if (!crawler.isAlive) {
        return res.status(400).json({ message: "Dead crawlers cannot advance" });
      }

      const updatedCrawler = await storage.updateCrawler(crawlerId, {
        currentFloor: crawler.currentFloor + 1,
      });

      await storage.createActivity({
        userId: req.user.claims.sub,
        crawlerId,
        type: 'floor_advance',
        message: `${crawler.name} advanced to Floor ${updatedCrawler.currentFloor}`,
        details: null,
      });

      res.json(updatedCrawler);
    } catch (error) {
      console.error("Error advancing floor:", error);
      res.status(500).json({ message: "Failed to advance floor" });
    }
  });

  // Activities
  app.get('/api/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivities(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // Chat
  app.get('/api/chat/messages', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getRecentChatMessages(limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post('/api/chat/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message } = insertChatMessageSchema.parse(req.body);
      
      const chatMessage = await storage.createChatMessage(userId, message);
      res.json(chatMessage);
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Leaderboards
  app.get('/api/leaderboards/crawlers', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topCrawlers = await storage.getTopCrawlers(limit);
      res.json(topCrawlers);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Marketplace
  app.get('/api/marketplace', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const listings = await storage.getMarketplaceListings(limit);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching marketplace:", error);
      res.status(500).json({ message: "Failed to fetch marketplace" });
    }
  });

  // Equipment
  app.get('/api/equipment', async (req, res) => {
    try {
      const equipment = await storage.getEquipment();
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time features
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Broadcast message to all connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
