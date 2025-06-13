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
      console.log(`=== TACTICAL DATA REQUEST for crawler ${crawlerId} ===`);

      // Initialize request cache for this request
      const requestCache = getRequestCache(req);
      storage.tacticalStorage?.setRequestCache(requestCache);
      storage.mobStorage?.setRequestCache(requestCache);

      // Get current room using the main storage interface
      const currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentRoom) {
        console.log(`No current room found for crawler ${crawlerId}`);
        return res.status(404).json({ error: "Crawler not found or not in a room" });
      }

      console.log(`Current room: ${currentRoom.name} (ID: ${currentRoom.id})`);

      // Check for cached tactical data first
      const cacheKey = `tactical_data_${currentRoom.id}`;
      let cachedData = await redisService.get(cacheKey);

      if (cachedData) {
        console.log(`Using cached tactical data for room ${currentRoom.id}`);
        cachedData = JSON.parse(cachedData);
        return res.json({
          room: currentRoom,
          availableDirections: cachedData.availableDirections,
          playersInRoom: cachedData.playersInRoom,
          tacticalEntities: cachedData.tacticalEntities,
        });
      }

      // Get all players in the current room
      const playersInRoom = await storage.getPlayersInRoom(currentRoom.id);
      console.log(`Players in room: ${playersInRoom.length}`);

      // Get available directions
      const availableDirections = await storage.getAvailableDirections(currentRoom.id);
      console.log(`Available directions: ${availableDirections.join(', ')}`);

      // Generate or get tactical entities for this room
      console.log(`Generating tactical data for room ${currentRoom.id}...`);
      const tacticalEntities = await storage.generateAndSaveTacticalData(
        currentRoom.id, 
        currentRoom
      );
      console.log(`Generated ${tacticalEntities.length} tactical entities:`, tacticalEntities.map(e => `${e.type}: ${e.name}`));

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

      console.log(`=== TACTICAL DATA RESPONSE ===`);
      console.log(`Entities: ${tacticalEntities.length}`);
      console.log(`Mob entities: ${tacticalEntities.filter(e => e.type === 'mob').length}`);

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
      console.log(`=== ROOM DATA BATCH REQUEST for crawler ${crawlerId} ===`);
      
      const crawler = await storage.getCrawler(crawlerId);

      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        console.log(`Access denied for crawler ${crawlerId}`);
        return res.status(403).json({ error: "Access denied" });
      }

      // Initialize request cache for this request
      const requestCache = getRequestCache(req);
      storage.tacticalStorage?.setRequestCache(requestCache);
      storage.mobStorage?.setRequestCache(requestCache);

      // Get current room first (needed for cache key)
      const currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentRoom) {
        console.log(`No current room found for crawler ${crawlerId}`);
        return res.status(404).json({ error: "No current room found" });
      }

      console.log(`Current room for crawler ${crawlerId}: ${currentRoom.name} (ID: ${currentRoom.id})`);

      // Check for complete batch cache first
      const batchCacheKey = `room_batch_${crawlerId}_${currentRoom.id}`;
      let cachedBatch = null;
      
      try {
        cachedBatch = await redisService.get(batchCacheKey);
        if (cachedBatch) {
          console.log(`Using cached batch data for crawler ${crawlerId} room ${currentRoom.id}`);
          return res.json(JSON.parse(cachedBatch));
        }
      } catch (cacheError) {
        console.log(`Cache error for batch data, proceeding without cache:`, cacheError.message);
      }

      // Get all data in parallel with proper error handling
      let tacticalData = null;
      let scannedRooms = [];

      try {
        // Get tactical data with fallback
        try {
          const cacheKey = `tactical_data_${currentRoom.id}`;
          let cachedData = null;
          
          try {
            cachedData = await redisService.get(cacheKey);
          } catch (cacheError) {
            console.log(`Tactical cache error, proceeding without cache:`, cacheError.message);
          }
          
          if (cachedData) {
            console.log(`Using cached tactical data for room ${currentRoom.id}`);
            tacticalData = JSON.parse(cachedData);
          } else {
            // Only regenerate if no cache exists
            console.log(`Generating fresh tactical data for room ${currentRoom.id}`);
            const [playersInRoom, availableDirections, tacticalEntities] = await Promise.all([
              storage.getPlayersInRoom(currentRoom.id).catch(err => {
                console.log(`Error getting players in room:`, err.message);
                return [];
              }),
              storage.getAvailableDirections(currentRoom.id).catch(err => {
                console.log(`Error getting available directions:`, err.message);
                return [];
              }),
              storage.generateAndSaveTacticalData(currentRoom.id, currentRoom).catch(err => {
                console.log(`Error generating tactical data:`, err.message);
                return [];
              })
            ]);

            tacticalData = { availableDirections, playersInRoom, tacticalEntities };
            
            // Try to cache, but don't fail if cache is unavailable
            try {
              await redisService.set(cacheKey, JSON.stringify(tacticalData), 60);
            } catch (cacheError) {
              console.log(`Failed to cache tactical data:`, cacheError.message);
            }
          }
        } catch (tacticalError) {
          console.log(`Error with tactical data generation:`, tacticalError.message);
          tacticalData = { availableDirections: [], playersInRoom: [], tacticalEntities: [] };
        }

        // Get scanned rooms with fallback
        try {
          const scanRange = crawler.scanRange || 2;
          scannedRooms = await storage.getScannedRooms(crawlerId, scanRange);
        } catch (scannedError) {
          console.log(`Error getting scanned rooms:`, scannedError.message);
          scannedRooms = [];
        }

      } catch (parallelError) {
        console.log(`Error in parallel data fetching:`, parallelError.message);
        // Use fallback data
        tacticalData = { availableDirections: [], playersInRoom: [], tacticalEntities: [] };
        scannedRooms = [];
      }

      const batchResult = {
        currentRoom,
        tacticalData: tacticalData ? {
          room: currentRoom,
          ...tacticalData
        } : null,
        scannedRooms
      };

      // Try to cache the complete batch, but don't fail if cache is unavailable
      try {
        await redisService.set(batchCacheKey, JSON.stringify(batchResult), 30);
      } catch (cacheError) {
        console.log(`Failed to cache batch result:`, cacheError.message);
      }

      console.log(`=== BATCH DATA RESPONSE for crawler ${crawlerId} ===`);
      console.log(`Tactical entities: ${tacticalData?.tacticalEntities?.length || 0}`);
      console.log(`Scanned rooms: ${scannedRooms.length}`);

      res.json(batchResult);
    } catch (error) {
      console.error("Error fetching batch room data:", error);
      res.status(500).json({ error: "Failed to fetch room data", details: error.message });
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
      res.json(scannedRooms);
    } catch (error) {
      console.error("Error fetching scanned rooms:", error);
      res.status(500).json({ error: "Failed to fetch scanned rooms" });
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
}