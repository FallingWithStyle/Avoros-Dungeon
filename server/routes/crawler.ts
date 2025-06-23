/**
 * File: crawler.ts
 * Responsibility: Crawler management and tactical data API routes
 * Notes: Handles crawler CRUD operations, advancement, tactical data, and scanned room information
 */
import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { redisService } from "../lib/redis-service";
import { getRequestCache } from "../lib/request-cache";

export function registerCrawlerRoutes(app: Express) {
  // Crawler routes
  app.get("/api/crawlers", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/crawlers/candidates", isAuthenticated, async (req: any, res) => {
    try {
      const candidates = await storage.generateCrawlerCandidates(30);
      res.json(candidates);
    } catch (error) {
      console.error("Error generating crawler candidates:", error);
      res.status(500).json({ message: "Failed to fetch crawler candidates" });
    }
  });

  app.get("/api/crawlers/:id", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/crawlers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, serial, stats, competencies, background } = req.body;

      // Check if user can create primary crawler
      const canCreate = await storage.canCreatePrimaryCrawler(userId);
      if (!canCreate) {
        return res
          .status(400)
          .json({ message: "Primary sponsorship already used this season" });
      }

      // Get the default crawler class (assuming ID 1 exists)
      const classes = await storage.getCrawlerClasses();
      const defaultClass = classes[0];

      if (!defaultClass) {
        return res
          .status(500)
          .json({ message: "No crawler classes available" });
      }

      // Create crawler with the generated stats and info
      const newCrawler = await storage.createCrawler({
        name,
        serial,
        classId: defaultClass.id,
        sponsorId: userId,
        health: stats.health,
        maxHealth: stats.maxHealth,
        might: stats.might,
        agility: stats.agility,
        endurance: stats.endurance,
        intellect: stats.intellect,
        charisma: stats.charisma,
        wisdom: stats.wisdom,
        power: stats.power,
        maxPower: stats.maxPower,
        luck: stats.luck,
        competencies,
        abilities: [], // Start with no special abilities
        background,
        currentFloor: 1,
        energy: stats.energy,
        maxEnergy: stats.maxEnergy,
        experience: 0,
        level: 1,
        gold: 0,
        isAlive: true,
      });

      // Update user's active crawler ID and mark primary sponsorship as used
      await storage.updateUserActiveCrawler(userId, newCrawler.id);

      const currentSeason = await storage.getCurrentSeason();
      if (currentSeason) {
        await storage.resetUserPrimarySponsorshipForNewSeason(
          userId,
          currentSeason.seasonNumber,
        );
      }

      // Create activity
      await storage.createActivity({
        userId,
        crawlerId: newCrawler.id,
        type: "crawler_created",
        message: `${newCrawler.name} has entered the dungeon sponsored by their corporation!`,
        details: null,
      });

      res.json(newCrawler);
    } catch (error) {
      console.error("Error creating crawler:", error);
      res.status(500).json({ message: "Failed to create crawler" });
    }
  });

  app.post("/api/crawlers/:id/advance-floor", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);

      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      if (!crawler.isAlive) {
        return res
          .status(400)
          .json({ message: "Dead crawlers cannot advance" });
      }

      const updatedCrawler = await storage.updateCrawler(crawlerId, {
        currentFloor: crawler.currentFloor + 1,
      });

      await storage.createActivity({
        userId: req.user.claims.sub,
        crawlerId,
        type: "floor_advance",
        message: `${crawler.name} advanced to Floor ${updatedCrawler.currentFloor}`,
        details: null,
      });

      res.json(updatedCrawler);
    } catch (error) {
      console.error("Error advancing floor:", error);
      res.status(500).json({ message: "Failed to advance floor" });
    }
  });

  app.post("/api/crawlers/:id/apply-effect/:effectId", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const effectId = req.params.effectId;
      const userId = req.user.claims.sub;

      // Verify ownership
      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      // Import effect definitions
      const { EFFECT_DEFINITIONS } = await import("@shared/effects");
      const effectDef = EFFECT_DEFINITIONS[effectId];

      if (!effectDef) {
        return res.status(400).json({ 
          success: false, 
          error: "Unknown effect" 
        });
      }

      // For debug mode, allow eyes_of_debug without energy cost
      if (effectId === 'eyes_of_debug') {
        // Check if effect is already active
        const activeEffects = crawler.activeEffects || [];
        const existingEffect = activeEffects.find(effect => effect.effectId === effectId);

        if (existingEffect && existingEffect.expiresAt && new Date(existingEffect.expiresAt) > new Date()) {
          return res.json({
            success: false,
            error: "Eyes of D'Bug is already active"
          });
        }

        // Add or update the effect
        const newEffect = {
          effectId: effectId,
          appliedAt: new Date(),
          expiresAt: new Date(Date.now() + effectDef.duration),
          properties: effectDef.properties
        };

        const updatedEffects = activeEffects.filter(effect => effect.effectId !== effectId);
        updatedEffects.push(newEffect);

        await storage.updateCrawler(crawlerId, {
          activeEffects: updatedEffects,
          scanRange: crawler.scanRange + (effectDef.properties?.scanRangeBonus || 0)
        });

        await storage.createActivity({
          userId,
          crawlerId,
          type: "effect_applied",
          message: `${crawler.name} activated ${effectDef.name}!`,
          details: { effectId, duration: effectDef.duration }
        });

        return res.json({ 
          success: true, 
          message: `${effectDef.name} applied successfully!`,
          effect: newEffect
        });
      }

      res.status(400).json({ 
        success: false, 
        error: "Effect not implemented" 
      });
    } catch (error) {
      console.error("Error applying effect:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to apply effect" 
      });
    }
  });

  // Get tactical data for current room
  app.get("/api/crawlers/:crawlerId/tactical-data", async (req, res) => {
    try {
      const crawlerId = parseInt(req.params.crawlerId);

      // Initialize request cache for this request
      const requestCache = getRequestCache(req);
      storage.tacticalStorage?.setRequestCache(requestCache);
      storage.mobStorage?.setRequestCache(requestCache);

      // Get current room using the main storage interface
      const currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentRoom) {
        return res.status(404).json({ error: "Crawler not found or not in a room" });
      }

      // Check for cached tactical data first
      const cacheKey = `tactical_data_${currentRoom.id}`;
      let cachedData = await redisService.get(cacheKey);

      if (cachedData) {
        // Handle case where cached data is already an object
        if (typeof cachedData === 'string') {
          try {
            cachedData = JSON.parse(cachedData);
          } catch (error) {
            cachedData = null;
          }
        }

        if (cachedData) {
          return res.json({
            room: currentRoom,
            availableDirections: cachedData.availableDirections,
            playersInRoom: cachedData.playersInRoom,
            tacticalEntities: cachedData.tacticalEntities,
          });
        }
      }

      // Get all players in the current room
      const playersInRoom = await storage.getPlayersInRoom(currentRoom.id);

      // Get available directions
      const availableDirections = await storage.getAvailableDirections(currentRoom.id);

      // Generate or get tactical entities for this room
      const tacticalEntities = await storage.generateAndSaveTacticalData(
        currentRoom.id, 
        currentRoom
      );

      // Cache the result for 30 seconds
      const resultData = {
        availableDirections,
        playersInRoom,
        tacticalEntities,
      };

      await redisService.set(cacheKey, JSON.stringify(resultData), 30);

      const response = {
        room: currentRoom,
        availableDirections,
        playersInRoom,
        tacticalEntities
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching tactical data:", error);
      res.status(500).json({ error: "Failed to fetch tactical data" });
    }
  });

  // Batch endpoint for faster room loading - gets all room data in one call
  app.get("/api/crawlers/:id/room-data-batch", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Check cache first for entire batch response
      const batchCacheKey = `batch:${crawlerId}:room-data`;
      const cached = await redisService.get(batchCacheKey);
      if (cached) {
        return res.json(cached);
      }

      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        return res.status(404).json({ error: "Crawler not found" });
      }

      // Initialize request cache for this request
      const requestCache = getRequestCache(req);
      storage.tacticalStorage?.setRequestCache(requestCache);
      storage.mobStorage?.setRequestCache(requestCache);

      // Get current position using the main storage interface
      const currentPosition = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentPosition) {
        return res.status(404).json({ error: "Crawler position not found" });
      }

      const currentRoomId = currentPosition.id;
      const scanRange = crawler.scanRange || 2;

      // Get players in room quickly
      const playersInRoomPromise = storage.getPlayersInRoom(currentRoomId);

      // Get all room data in parallel with optimized queries
      const [scannedRooms, exploredRooms, tacticalData, availableDirections, playersInRoom] = await Promise.all([
        storage.getScannedRooms(crawlerId, scanRange),
        storage.getExploredRooms(crawlerId),
        storage.generateAndSaveTacticalData(currentRoomId, currentPosition),
        storage.getAvailableDirections(currentRoomId),
        playersInRoomPromise
      ]);

      const response = {
        currentRoom: {
          room: currentPosition,
          availableDirections: availableDirections || [],
          playersInRoom: playersInRoom || []
        },
        tacticalData: tacticalData || [],
        scannedRooms: scannedRooms || [],
        exploredRooms: exploredRooms || [],
        crawlerHistory: [] // This can be expanded later if needed
      };

      // Cache the response for 60 seconds (shorter TTL for fresher data)
      await redisService.set(batchCacheKey, response, 60);

      res.json(response);

    } catch (error) {
      console.error("Error fetching room data batch:", error);
      res.status(500).json({ error: "Failed to fetch room data" });
    }
  });

  // Get scanned rooms for a crawler
  app.get("/api/crawlers/:id/scanned-rooms", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);

      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Use crawler's scan range, default to 2 if not set
      const scanRange = crawler.scanRange || 2;
      const scannedRooms = await storage.getScannedRooms(crawlerId, scanRange);
      res.json(scannedRooms || []);
    } catch (error) {
      console.error("Error fetching scanned rooms:", error);

      // Handle specific database timeout errors
      if (error.message && error.message.includes('timeout exceeded')) {
        return res.status(503).json({ 
          error: "Database temporarily unavailable", 
          message: "Please try again in a moment",
          fallback: []
        });
      }

      // Return empty array as fallback instead of complete failure
      res.status(200).json([]);
    }
  });

  app.get("/api/crawlers/:id/room-mobs-summary", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);

      if (!storage) {
        return res.status(500).json({ error: "Storage not properly initialized" });
      }

      // Initialize request cache for this request
      const requestCache = getRequestCache(req);
      storage.mobStorage?.setRequestCache(requestCache);

      const crawler = await storage.getCrawler(crawlerId);

      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get all explored and scanned rooms
      const exploredRooms = await storage.getExploredRooms(crawlerId);
      const scanRange = crawler.scanRange || 2;
      const scannedRooms = await storage.getScannedRooms(crawlerId, scanRange);

      const allRoomIds = new Set([
        ...exploredRooms.map(r => r.id),
        ...scannedRooms.map(r => r.id)
      ]);

      const mobSummary: Record<number, { hostileCount: number; neutralCount: number; friendlyCount: number; playerCount: number }> = {};

      // Get mob data for each room
      for (const roomId of allRoomIds) {
        try {
          const hostileMobs = await storage.mobStorage.getHostileMobs(roomId);
          const neutralMobs = await storage.mobStorage.getNeutralMobs(roomId);
          const friendlyMobs = await storage.mobStorage.getFriendlyMobs(roomId);

          // Get player count for this room (you may need to implement this)
          // For now, we'll set it to 0 as player tracking might be in a different system
          const playerCount = 0;

          mobSummary[roomId] = {
            hostileCount: hostileMobs.length,
            neutralCount: neutralMobs.length,
            friendlyCount: friendlyMobs.length,
            playerCount: playerCount
          };
        } catch (error) {
          console.error(`Error getting mob data for room ${roomId}:`, error);
          // Set default values if there's an error
          mobSummary[roomId] = {
            hostileCount: 0,
            neutralCount: 0,
            friendlyCount: 0,
            playerCount: 0
          };
        }
      }

      res.json(mobSummary);
    } catch (error) {
      console.error("Error fetching room mobs summary:", error);
      res.status(500).json({ error: "Failed to fetch room mobs summary" });
    }
  });

  app.post("/api/crawlers/:id/move", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const { direction } = req.body;
      const userId = req.user.claims.sub;

      // Validate input
      if (!direction || typeof direction !== 'string') {
        return res.status(400).json({ message: "Invalid direction specified" });
      }

      if (!['north', 'south', 'east', 'west'].includes(direction)) {
        return res.status(400).json({ message: "Invalid direction. Must be north, south, east, or west." });
      }

      // Verify ownership
      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        return res.status(404).json({ message: "Crawler not found or access denied" });
      }

      if (!crawler.isAlive) {
        return res.status(400).json({ message: "Dead crawlers cannot move" });
      }

      // Check if crawler has enough energy (if energy system is implemented)
      if (crawler.energy !== undefined && crawler.energy <= 0) {
        return res.status(400).json({ message: "Not enough energy to move" });
      }

      // Attempt movement
      const result = await storage.moveToRoom(crawlerId, direction);

      if (result.success) {
        await storage.createActivity({
          userId,
          crawlerId,
          type: "room_movement",
          message: `${crawler.name} moved ${direction}`,
          details: { direction, newRoomId: result.newRoom?.id },
        });

        res.json({ success: true, newRoom: result.newRoom });
      } else {
        // Provide more specific error messages
        let errorMessage = result.error || "Movement failed";

        if (errorMessage.includes("not found")) {
          errorMessage = "Current room not found. Try refreshing the page.";
        } else if (errorMessage.includes("locked")) {
          errorMessage = `The ${direction} exit is locked and requires a key.`;
        } else if (errorMessage.includes("No exit")) {
          errorMessage = `There is no exit to the ${direction} from this room.`;
        }

        res.status(400).json({ message: errorMessage });
      }
    } catch (error) {
      console.error("Error moving crawler:", error);

      // Provide different error messages based on error type
      let errorMessage = "Failed to move crawler";
      if (error instanceof Error) {
        if (error.message.includes("database")) {
          errorMessage = "Database error during movement. Please try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Movement request timed out. Please try again.";
        }
      }

      res.status(500).json({ message: errorMessage });
    }
  });

  // Get current room data with enhanced error handling and caching
  app.get("/api/crawlers/:id/current-room", async (req, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      if (isNaN(crawlerId)) {
        return res.status(400).json({ message: "Invalid crawler ID" });
      }

      // Use cached data if available
      try {
        const cached = await redisService.get(`crawler:${crawlerId}:current-room`);
        if (cached) {
          return res.json(cached);
        }
      } catch (cacheError) {
        console.warn("Cache error for current room:", cacheError.message);
        // Continue without cache
      }

      // Use the main storage interface instead of explorationStorage directly
      const roomData = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!roomData) {
        return res.status(404).json({ message: "Current room not found" });
      }

      // Try to cache, but don't fail if caching fails
      try {
        await redisService.set(`crawler:${crawlerId}:current-room`, roomData, 30);
      } catch (cacheError) {
        console.warn("Failed to cache current room data:", cacheError.message);
      }

      res.json(roomData);
    } catch (error) {
      console.error("Error fetching current room:", error);
      res.status(500).json({ message: "Failed to fetch current room data" });
    }
  });

  // Get comprehensive room data for tactical display
  app.get("/api/crawlers/:id/room-data-batch", async (req, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      if (isNaN(crawlerId)) {
        return res.status(400).json({ message: "Invalid crawler ID" });
      }

      // Fetch data with individual error handling
      let crawler, currentRoom, exploredRooms;

      try {
        crawler = await storage.crawlerStorage.getCrawler(crawlerId);
      } catch (error) {
        console.error("Error fetching crawler:", error);
        return res.status(404).json({ message: "Crawler not found" });
      }

      if (!crawler) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      try {
        currentRoom = await storage.explorationStorage.getCurrentRoom(crawlerId);
      } catch (error) {
        console.error("Error fetching current room:", error);
        currentRoom = null;
      }

      try {
        exploredRooms = await storage.explorationStorage.getExploredRooms(crawlerId);
      } catch (error) {
        console.error("Error fetching explored rooms:", error);
        exploredRooms = [];
      }

      res.json({
        crawler,
        room: currentRoom,
        exploredRooms: exploredRooms || []
      });
    } catch (error) {
      console.error("Error fetching room data batch:", error);
      res.status(500).json({ message: "Failed to fetch room data" });
    }
  });
}