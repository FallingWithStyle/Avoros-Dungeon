import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCrawlerSchema } from "@shared/schema";

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

  // Crawler candidates route (must come before the :id route)
  app.get('/api/crawlers/candidates', isAuthenticated, async (req: any, res) => {
    try {
      const candidates = await storage.generateCrawlerCandidates(30);
      res.json(candidates);
    } catch (error) {
      console.error("Error generating crawler candidates:", error);
      res.status(500).json({ message: "Failed to fetch crawler candidates" });
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

  // Exploration routes
  app.post('/api/crawlers/:id/explore', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Verify ownership
      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        return res.status(403).json({ message: "Not authorized to control this crawler" });
      }
      
      const encounter = await storage.exploreFloor(crawlerId);
      res.json(encounter);
    } catch (error) {
      console.error("Error during exploration:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/api/crawlers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, stats, competencies, background } = req.body;

      // Check if user can create primary crawler
      const canCreate = await storage.canCreatePrimaryCrawler(userId);
      if (!canCreate) {
        return res.status(400).json({ message: "Primary sponsorship already used this season" });
      }

      // Get the default crawler class (assuming ID 1 exists)
      const classes = await storage.getCrawlerClasses();
      const defaultClass = classes[0];
      
      if (!defaultClass) {
        return res.status(500).json({ message: "No crawler classes available" });
      }

      // Create crawler with the generated stats and info
      const newCrawler = await storage.createCrawler({
        name,
        classId: defaultClass.id,
        sponsorId: userId,
        health: stats.health,
        maxHealth: stats.maxHealth,
        attack: stats.attack,
        defense: stats.defense,
        speed: stats.speed,
        wit: stats.wit,
        charisma: stats.charisma,
        memory: stats.memory,
        luck: stats.luck,
        competencies,
        abilities: [], // Start with no special abilities
        background,
        currentFloor: 1,
        energy: 100,
        maxEnergy: 100,
        experience: 0,
        level: 1,
        credits: 0,
        isAlive: true,
      });

      // Update user's active crawler ID and mark primary sponsorship as used
      await storage.updateUserActiveCrawler(userId, newCrawler.id);
      
      const currentSeason = await storage.getCurrentSeason();
      if (currentSeason) {
        await storage.resetUserPrimarySponsorshipForNewSeason(userId, currentSeason.seasonNumber);
      }

      // Create activity
      await storage.createActivity({
        userId,
        crawlerId: newCrawler.id,
        type: 'crawler_created',
        message: `${newCrawler.name} has entered the dungeon sponsored by their corporation!`,
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
      const result = await storage.exploreFloor(crawlerId);
      res.json(result);
    } catch (error) {
      console.error("Error during exploration:", error);
      res.status(500).json({ message: "Failed to explore" });
    }
  });

  // New endpoint for making choices in encounters
  app.post('/api/crawlers/:id/choose', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const { choiceId, encounterData } = req.body;
      
      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      const result = await storage.processEncounterChoice(crawlerId, choiceId, encounterData);
      res.json(result);
    } catch (error) {
      console.error("Error processing choice:", error);
      res.status(500).json({ message: "Failed to process choice" });
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

  // Room navigation routes
  app.get('/api/crawlers/:id/current-room', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);
      
      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      const room = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      const availableDirections = await storage.getAvailableDirections(room.id);
      const playersInRoom = await storage.getPlayersInRoom(room.id);

      res.json({
        room,
        availableDirections,
        playersInRoom
      });
    } catch (error) {
      console.error("Error fetching current room:", error);
      res.status(500).json({ message: "Failed to fetch current room" });
    }
  });

  app.get('/api/crawlers/:id/explored-rooms', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);
      
      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      const exploredRooms = await storage.getExploredRooms(crawlerId);
      res.json(exploredRooms);
    } catch (error) {
      console.error("Error fetching explored rooms:", error);
      res.status(500).json({ message: "Failed to fetch explored rooms" });
    }
  });

  app.post('/api/crawlers/:id/move', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const { direction, debugEnergyDisabled } = req.body;
      const crawler = await storage.getCrawler(crawlerId);
      
      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      if (!crawler.isAlive) {
        return res.status(400).json({ message: "Dead crawlers cannot move" });
      }

      // Check minimum energy requirement (unless debug mode is enabled)
      if (!debugEnergyDisabled && crawler.energy < 5) {
        return res.status(400).json({ message: "Not enough energy to move" });
      }

      const result = await storage.moveToRoom(crawlerId, direction, debugEnergyDisabled);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error || "Cannot move in that direction" });
      }

      // Energy is deducted in moveToRoom function based on room visit history

      await storage.createActivity({
        userId: req.user.claims.sub,
        crawlerId,
        type: 'room_movement',
        message: `${crawler.name} moved ${direction} to ${result.newRoom?.name}`,
        details: null,
      });

      res.json({ success: true, newRoom: result.newRoom });
    } catch (error) {
      console.error("Error moving crawler:", error);
      res.status(500).json({ message: "Failed to move crawler" });
    }
  });

  // Debug endpoints
  app.post('/api/crawlers/:id/debug/heal', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      // Verify ownership
      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      const healedCrawler = await storage.updateCrawler(crawlerId, {
        health: crawler.maxHealth,
        energy: crawler.maxEnergy
      });

      res.json({ message: "Crawler healed", crawler: healedCrawler });
    } catch (error) {
      console.error("Error healing crawler:", error);
      res.status(500).json({ message: "Failed to heal crawler" });
    }
  });

  app.post('/api/crawlers/:id/debug/reset', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      // Verify ownership
      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      // Reset crawler to entrance and restore health/energy
      const resetCrawler = await storage.updateCrawler(crawlerId, {
        health: crawler.maxHealth,
        energy: crawler.maxEnergy,
        status: 'active'
      });

      // Move crawler back to entrance room
      await storage.resetCrawlerToEntrance(crawlerId);

      res.json({ message: "Crawler reset to entrance", crawler: resetCrawler });
    } catch (error) {
      console.error("Error resetting crawler:", error);
      res.status(500).json({ message: "Failed to reset crawler" });
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

  // Season routes
  app.get('/api/season/current', isAuthenticated, async (req, res) => {
    try {
      const season = await storage.getCurrentSeason();
      if (!season) {
        return res.status(404).json({ message: "No active season found" });
      }
      res.json(season);
    } catch (error) {
      console.error("Error fetching current season:", error);
      res.status(500).json({ message: "Failed to fetch current season" });
    }
  });

  app.get('/api/season/can-create-primary', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const canCreate = await storage.canCreatePrimaryCrawler(userId);
      res.json({ canCreate });
    } catch (error) {
      console.error("Error checking primary sponsorship eligibility:", error);
      res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  app.get('/api/season/secondary-sponsorships', isAuthenticated, async (req, res) => {
    try {
      const availableCrawlers = await storage.getAvailableSecondarySponsorships();
      res.json(availableCrawlers);
    } catch (error) {
      console.error("Error fetching secondary sponsorships:", error);
      res.status(500).json({ message: "Failed to fetch secondary sponsorships" });
    }
  });



  // Crawler generation
  app.get('/api/crawlers/candidates', isAuthenticated, async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 3;
      const candidates = await storage.generateCrawlerCandidates(count);
      res.json(candidates);
    } catch (error) {
      console.error("Error generating crawler candidates:", error);
      res.status(500).json({ message: "Failed to generate crawler candidates" });
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

  // DEBUG: Reset crawlers (temporary for development)
  app.post('/api/debug/reset-crawlers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.resetUserCrawlers(userId);
      res.json({ message: "All crawlers reset successfully" });
    } catch (error) {
      console.error("Error resetting crawlers:", error);
      res.status(500).json({ message: "Failed to reset crawlers" });
    }
  });

  // DEBUG: Restore crawler energy (temporary for development)
  app.post('/api/crawlers/:id/restore-energy', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);
      
      if (!crawler) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      // Update crawler energy to 100%
      await storage.updateCrawler(crawlerId, { 
        energy: 100,
        lastEnergyRegen: new Date()
      });
      
      res.json({ message: "Energy restored successfully" });
    } catch (error) {
      console.error("Restore energy error:", error);
      res.status(500).json({ message: "Failed to restore energy" });
    }
  });

  // DEBUG: Reset crawler to entrance
  app.post('/api/crawlers/:id/reset-position', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const { db } = await import('./db');
      const { rooms, crawlerPositions } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Find entrance room
      const [entranceRoom] = await db.select().from(rooms).where(eq(rooms.type, 'entrance'));
      if (!entranceRoom) {
        return res.status(404).json({ message: "Entrance room not found" });
      }

      // Clear existing position
      await db.delete(crawlerPositions).where(eq(crawlerPositions.crawlerId, crawlerId));
      
      // Set new position at entrance
      await db.insert(crawlerPositions).values({
        crawlerId: crawlerId,
        roomId: entranceRoom.id,
        enteredAt: new Date()
      });
      
      res.json({ message: "Crawler position reset to entrance" });
    } catch (error) {
      console.error("Reset position error:", error);
      res.status(500).json({ message: "Failed to reset position" });
    }
  });

  // Get all rooms for a floor (debug endpoint)
  app.get('/api/debug/rooms/:floorId', async (req, res) => {
    try {
      const floorId = parseInt(req.params.floorId);
      console.log("Debug endpoint called for floor:", floorId);
      
      const rooms = await storage.getRoomsForFloor(floorId);
      console.log("Retrieved rooms count:", rooms.length);
      
      // Transform rooms to match the ExploredRoom interface for consistency
      const transformedRooms = rooms.map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        isSafe: true, // Assume safe for debug view
        hasLoot: false, // Don't show loot markers in debug view
        x: room.x,
        y: room.y,
        isCurrentRoom: false, // Will be set by client
        isExplored: true // Mark all as explored in debug mode
      }));
      
      console.log("Sending transformed rooms:", transformedRooms.length);
      res.json(transformedRooms);
    } catch (error) {
      console.error("Error fetching floor rooms:", error);
      res.status(500).json({ message: "Failed to fetch floor rooms" });
    }
  });

  // DEBUG: Regenerate dungeon layout
  app.post('/api/debug/regenerate-dungeon', isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import('./db');
      const { rooms, roomConnections, crawlerPositions, floors } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // Clear existing room data
      await db.delete(crawlerPositions);
      await db.delete(roomConnections);
      await db.delete(rooms);
      
      // Generate full 10-floor dungeon
      const { generateFullDungeon } = await import('./dungeon-generator');
      await generateFullDungeon();
      
      // Reset all crawlers to entrance room
      const [floor1] = await db.select().from(floors).where(eq(floors.floorNumber, 1));
      if (floor1) {
        const [entranceRoom] = await db.select().from(rooms).where(eq(rooms.type, 'entrance'));
        if (entranceRoom) {
          // Get all active crawlers and reset their positions
          const { crawlers } = await import('@shared/schema');
          const activeCrawlers = await db.select().from(crawlers).where(eq(crawlers.status, 'active'));
          
          for (const crawler of activeCrawlers) {
            await db.insert(crawlerPositions).values({
              crawlerId: crawler.id,
              roomId: entranceRoom.id,
              enteredAt: new Date()
            }).onConflictDoNothing();
          }
        }
      }
      
      res.json({ message: "Dungeon layout regenerated with new room distribution" });
    } catch (error) {
      console.error("Error regenerating dungeon:", error);
      res.status(500).json({ message: "Failed to regenerate dungeon" });
    }
  });

  // Room and mapping routes
  app.get('/api/crawlers/:id/current-room', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const room = await storage.getCrawlerCurrentRoom(crawlerId);
      
      if (!room) {
        return res.status(404).json({ message: "Current room not found" });
      }

      const availableDirections = await storage.getAvailableDirections(room.id);
      const playersInRoom = await storage.getPlayersInRoom(room.id);
      
      res.json({
        room,
        availableDirections,
        playersInRoom
      });
    } catch (error) {
      console.error("Get current room error:", error);
      res.status(500).json({ message: "Failed to get current room" });
    }
  });

  app.post('/api/crawlers/:id/move', isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const { direction } = req.body;
      
      if (!direction) {
        return res.status(400).json({ message: "Direction is required" });
      }

      const result = await storage.moveToRoom(crawlerId, direction);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }

      // Get updated room info
      const availableDirections = await storage.getAvailableDirections(result.newRoom!.id);
      const playersInRoom = await storage.getPlayersInRoom(result.newRoom!.id);
      
      res.json({
        success: true,
        room: result.newRoom,
        availableDirections,
        playersInRoom
      });
    } catch (error) {
      console.error("Move crawler error:", error);
      res.status(500).json({ message: "Failed to move crawler" });
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
