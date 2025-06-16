/**
 * File: exploration.ts
 * Responsibility: Dungeon exploration and room navigation API routes
 * Notes: Handles room movement, exploration, tactical data, and floor/room information retrieval
 */
import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { db } from "../db";
import { crawlerPositions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export function registerExplorationRoutes(app: Express) {
  // Exploration routes
  app.post("/api/crawlers/:id/explore", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      // Verify ownership
      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        return res
          .status(403)
          .json({ message: "Not authorized to control this crawler" });
      }

      const encounter = await storage.exploreFloor(crawlerId);
      res.json(encounter);
    } catch (error) {
      console.error("Error during exploration:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Room navigation routes
  app.get("/api/crawlers/:id/current-room", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      console.log(`=== CURRENT-ROOM API CALL ===`);
      console.log(`Crawler ID: ${crawlerId}`);
      console.log(`User ID: ${req.user.claims.sub}`);

      // Try to get cached room data first
      try {
        const cachedRoomData = await storage.redisService.getCurrentRoomData(crawlerId);
        if (cachedRoomData) {
          console.log(`Found cached room data for crawler ${crawlerId}`);
          return res.json(cachedRoomData);
        }
        console.log(`No cached room data for crawler ${crawlerId}`);
      } catch (cacheError) {
        console.log(`Cache error (continuing with DB lookup):`, cacheError);
      }

      const crawler = await storage.getCrawler(crawlerId);
      console.log(`Crawler lookup result:`, crawler ? `Found ${crawler.name}` : 'Not found');

      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        console.log(`Access denied: crawler not found or not owned by user`);
        return res.status(404).json({ message: "Crawler not found" });
      }

      console.log(`Ensuring crawler ${crawlerId} has position...`);
      // Ensure crawler has a position
      await storage.ensureCrawlerHasPosition(crawlerId);
      console.log(`Position ensured for crawler ${crawlerId}`);

      console.log(`Getting current room for crawler ${crawlerId}...`);
      const room = await storage.getCrawlerCurrentRoom(crawlerId);
      console.log(`Current room result:`, room ? `Found room ${room.id} (${room.name})` : 'No room found');

      if (!room) {
        console.log(`ERROR: No room found for crawler ${crawlerId} after ensuring position`);
        return res.status(404).json({ message: "Room not found" });
      }

      console.log(`Getting available directions for room ${room.id}...`);
      const availableDirections = await storage.getAvailableDirections(room.id);
      console.log(`Available directions:`, availableDirections);

      console.log(`Getting players in room ${room.id}...`);
      const playersInRoom = await storage.getPlayersInRoom(room.id);
      console.log(`Players in room:`, playersInRoom.length);

      const roomData = {
        room,
        availableDirections,
        playersInRoom,
      };

      console.log(`Returning room data for crawler ${crawlerId}:`, {
        roomId: room.id,
        roomName: room.name,
        directionsCount: availableDirections.length,
        playersCount: playersInRoom.length
      });

      // Cache the result
      try {
        await storage.redisService.setCurrentRoomData(crawlerId, roomData, 180); // 3 minutes TTL
        console.log(`Cached room data for crawler ${crawlerId}`);
      } catch (cacheError) {
        console.log(`Failed to cache room data:`, cacheError);
      }

      res.json(roomData);
    } catch (error) {
      console.error("=== ERROR in current-room endpoint ===");
      console.error("Error details:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ message: "Failed to fetch current room" });
    }
  });

  // Get explored rooms for a crawler with caching
  app.get("/api/crawlers/:id/explored-rooms", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);

      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(403).json({ error: "Access denied" });
      }

      const exploredRooms = await storage.getExploredRooms(crawlerId);
      res.json(exploredRooms || []);
    } catch (error) {
      console.error("Error fetching explored rooms:", error);

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

  // Adjacent rooms prefetch endpoint
  app.get("/api/crawlers/:id/adjacent-rooms/:distance", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const distance = parseInt(req.params.distance) || 2;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        return res.status(404).json({ error: "Crawler not found" });
      }

      // Get current room
      const currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentRoom) {
        return res.status(404).json({ error: "Current room not found" });
      }

      // Get adjacent rooms within specified distance
      const adjacentRooms = await storage.getAdjacentRooms(currentRoom.id, distance);

      console.log(`🔮 Found ${adjacentRooms.length} adjacent rooms within ${distance} moves of room ${currentRoom.id}`);

      res.json({
        currentRoomId: currentRoom.id,
        distance: distance,
        adjacentRooms: adjacentRooms || []
      });

    } catch (error) {
      console.error("Error fetching adjacent rooms:", error);
      res.status(500).json({ error: "Failed to fetch adjacent rooms" });
    }
  });

  app.get("/api/crawlers/:id/scanned-rooms", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);

      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      // Use the crawler's effective scan range (includes bonuses from spells/equipment)
      const scanRange = crawler.scanRange || 2; // Default scan range of 2
      const scannedRooms = await storage.getScannedRooms(crawlerId, scanRange);
      res.json(scannedRooms);
    } catch (error) {
      console.error("Error fetching scanned rooms:", error);
      res.status(500).json({ message: "Failed to fetch scanned rooms" });
    }
  });

  app.post("/api/crawlers/:id/move", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const { direction } = req.body;

      console.log(`=== MOVE CRAWLER API CALL ===`);
      console.log(`Crawler ID: ${crawlerId}`);
      console.log(`Direction: ${direction}`);
      console.log(`User ID: ${req.user.claims.sub}`);

      if (!direction) {
        console.log(`ERROR: No direction provided`);
        return res.status(400).json({ message: "Direction is required" });
      }

      // Ensure crawler has a position first
      await storage.ensureCrawlerHasPosition(crawlerId);

      const crawler = await storage.getCrawler(crawlerId);
      console.log(`Crawler lookup result:`, crawler ? `Found ${crawler.name}` : 'Not found');

      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        console.log(`ERROR: Crawler not found or access denied`);
        return res.status(404).json({ message: "Crawler not found" });
      }

      if (!crawler.isAlive) {
        console.log(`ERROR: Crawler is dead`);
        return res.status(400).json({ message: "Dead crawlers cannot move" });
      }

      console.log(`Attempting to move crawler ${crawlerId} ${direction}...`);
      const result = await storage.moveToRoom(crawlerId, direction);

      console.log(`Move result:`, result.success ? `Success - moved to ${result.newRoom?.name}` : `Failed - ${result.error}`);

      if (!result.success) {
        return res
          .status(400)
          .json({ message: result.error || "Cannot move in that direction" });
      }

      await storage.createActivity({
        userId: req.user.claims.sub,
        crawlerId,
        type: "room_movement",
        message: `${crawler.name} moved ${direction} to ${result.newRoom?.name}`,
        details: null,
      });

      // Invalidate relevant caches when crawler moves
      try {
        await storage.redisService.invalidateCrawlerRoomData(crawlerId);
        if (result.newRoom) {
          await storage.redisService.invalidateRoomData(result.newRoom.id);
        }
        // Get current position for cache invalidation
        const [currentPos] = await db
          .select()
          .from(crawlerPositions)
          .where(eq(crawlerPositions.crawlerId, crawlerId))
          .orderBy(desc(crawlerPositions.enteredAt))
          .limit(2); // Get current and previous

        // Also invalidate tactical data for both old and new rooms
        if (currentPos) {
          await storage.redisService.del(`tactical:${currentPos.roomId}`);
        }
        if (result.newRoom) {
          await storage.redisService.del(`tactical:${result.newRoom.id}`);
        }
        console.log(`Invalidated tactical data caches for room transition`);
      } catch (cacheError) {
        console.log('Failed to invalidate caches:', cacheError);
      }

      console.log(`Movement successful - returning new room data`);
      res.json({ success: true, newRoom: result.newRoom });
    } catch (error) {
      console.error("=== ERROR in move endpoint ===");
      console.error("Error details:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ message: "Failed to move crawler" });
    }
  });

  // Get full map bounds for a floor
  app.get("/api/floors/:floorId/bounds", async (req, res) => {
    try {
      const floorId = parseInt(req.params.floorId);
      const bounds = await storage.getFloorBounds(floorId);
      res.json(bounds);
    } catch (error) {
      console.error("Error fetching floor bounds:", error);
      res.status(500).json({ error: "Failed to fetch floor bounds" });
    }
  });

  // Get all rooms on a floor (for complete map display)
  app.get("/api/floors/:floorId/rooms", async (req, res) => {
    try {
      const floorId = parseInt(req.params.floorId);
      const rooms = await storage.getRoomsForFloor(floorId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching floor rooms:", error);
      res.status(500).json({ error: "Failed to fetch floor rooms" });
    }
  });

  // Get available directions for current room
  app.get("/api/crawlers/:id/directions", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);

      const currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentRoom) {
        return res.status(404).json({ message: "Crawler not in any room" });
      }

      const directions = await storage.getAvailableDirections(currentRoom.id);
      res.json({ directions });
    } catch (error) {
      console.error("Get directions error:", error);
      res.status(500).json({ message: "Failed to get directions" });
    }
  });

  // Get adjacent room data for prefetching
  app.get("/api/crawlers/:id/adjacent-rooms/:radius", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const radius = parseInt(req.params.radius) || 2;
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Verify crawler ownership
      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      console.log(`Prefetching adjacent rooms for crawler ${crawlerId} with radius ${radius}`);

      // Get current room
      const currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentRoom) {
        return res.status(404).json({ message: "Crawler not in any room" });
      }

      // Check Redis cache first
      const cacheKey = `adjacent-rooms:${crawlerId}:${radius}`;
      const cached = await storage.redisService.get(cacheKey);

      if (cached && cached.currentRoomId === currentRoom.id) {
        console.log(`🔮 Cache hit for adjacent rooms - crawler ${crawlerId}, radius ${radius}`);
        return res.json(cached);
      }

      console.log(`🔮 Getting adjacent rooms within radius ${radius} for crawler ${crawlerId} from room ${currentRoom.id}`);

      // Get rooms within the specified radius
      const adjacentRooms = await storage.getRoomsWithinRadius(currentRoom.id, radius);
      console.log(`Found ${adjacentRooms.length} rooms within radius ${radius} of room ${currentRoom.id}`);

      // For each room, get basic room data and directions
      const roomDataPromises = adjacentRooms.map(async (room) => {
        const [availableDirections, playersInRoom] = await Promise.all([
          storage.getAvailableDirections(room.id),
          storage.getPlayersInRoom(room.id)
        ]);

        return {
          room,
          availableDirections,
          playersInRoom: playersInRoom.length, // Just send count for prefetch
          distance: room.distance // Distance from current room
        };
      });

      const roomsData = await Promise.all(roomDataPromises);

      // Sort by distance for better caching priority
      roomsData.sort((a, b) => a.distance - b.distance);

      const result = {
        currentRoomId: currentRoom.id,
        adjacentRooms: roomsData,
        radius
      };

      // Cache for 2 minutes (shorter than normal since we want to detect changes)
      await storage.redisService.set(cacheKey, result, 120);

      console.log(`Returning ${roomsData.length} adjacent rooms for prefetching`);
      res.json({
        currentRoomId: currentRoom.id,
        adjacentRooms: roomsData,
        radius
      });

    } catch (error) {
      console.error("Error fetching adjacent rooms:", error);
      res.status(500).json({ message: "Failed to fetch adjacent rooms" });
    }
  });

  // Get tactical data for current room
  app.get("/api/crawlers/:id/tactical-data", async (req, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      console.log(`=== TACTICAL DATA REQUEST for crawler ${crawlerId} ===`);

      try {
        if (isNaN(crawlerId)) {
          console.log(`ERROR: Invalid crawler ID: ${req.params.crawlerId}`);
          return res.status(400).json({ error: "Invalid crawler ID" });
        }

        // Ensure all storage components are available
        if (!storage || !storage.getCrawlerCurrentRoom || !storage.getAvailableDirections || !storage.getPlayersInRoom) {
          console.error("ERROR: Storage components not properly initialized");
          return res.status(500).json({ error: "Server storage not properly initialized" });
        }

        // Get current room with error handling
        console.log(`Getting current room for crawler ${crawlerId}...`);
        let currentRoom;
        try {
          currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
        } catch (roomError) {
          console.error(`ERROR getting current room for crawler ${crawlerId}:`, roomError);
          return res.status(500).json({ error: "Failed to get crawler's current room" });
        }

        if (!currentRoom) {
          console.log(`No current room found for crawler ${crawlerId}`);
          return res.status(404).json({ error: "Crawler not found or not in a room" });
        }

        console.log(`Current room: ${currentRoom.name} (ID: ${currentRoom.id}, Type: ${currentRoom.type})`);

        // Get available directions with error handling
        console.log(`Getting available directions for room ${currentRoom.id}...`);
        let availableDirections = [];
        try {
          availableDirections = await storage.getAvailableDirections(currentRoom.id);
          console.log(`Available directions: ${availableDirections.join(', ')}`);
        } catch (directionsError) {
          console.error(`ERROR getting available directions for room ${currentRoom.id}:`, directionsError);
          availableDirections = []; // Continue with empty directions
        }

        // Get all players in the current room with error handling
        console.log(`Getting players in room ${currentRoom.id}...`);
        let playersInRoom = [];
        try {
          playersInRoom = await storage.getPlayersInRoom(currentRoom.id);
          console.log(`Players in room: ${playersInRoom.length}`);
        } catch (playersError) {
          console.error(`ERROR getting players in room ${currentRoom.id}:`, playersError);
          playersInRoom = []; // Continue with empty players list
        }

        // Generate or get tactical entities for this room with comprehensive error handling
        console.log(`Generating tactical data for room ${currentRoom.id}...`);
        let tacticalEntities = [];

        if (storage.tacticalStorage && storage.tacticalStorage.generateAndSaveTacticalData) {
          try {
            const roomData = {
              type: currentRoom.type || 'normal',
              hasLoot: currentRoom.hasLoot || false,
              isSafe: currentRoom.isSafe || false,
              factionId: currentRoom.factionId || null,
              environment: currentRoom.environment || 'indoor'
            };

            console.log(`Room data for tactical generation:`, roomData);

            tacticalEntities = await storage.tacticalStorage.generateAndSaveTacticalData(
              currentRoom.id, 
              roomData
            );
            console.log(`Successfully generated ${tacticalEntities.length} tactical entities:`, 
              tacticalEntities.map(e => `${e.type}: ${e.name}`));
          } catch (tacticalError) {
            console.error(`ERROR generating tactical data for room ${currentRoom.id}:`, tacticalError);
            console.error(`Tactical error stack:`, tacticalError.stack);

            // Try to get existing tactical data instead
            try {
              if (storage.tacticalStorage.getTacticalPositions) {
                console.log(`Attempting to get existing tactical positions...`);
                tacticalEntities = await storage.tacticalStorage.getTacticalPositions(currentRoom.id);
                console.log(`Retrieved ${tacticalEntities.length} existing tactical entities`);
              }
            } catch (fallbackError) {
              console.error(`ERROR getting existing tactical data:`, fallbackError);
              tacticalEntities = []; // Final fallback to empty array
            }
          }
        } else {
          console.error(`ERROR: Tactical storage not properly initialized`);
          tacticalEntities = []; // Fallback to empty array
        }

        const response = {
          room: currentRoom,
          availableDirections,
          playersInRoom,
          tacticalEntities
        };

        console.log(`=== TACTICAL DATA RESPONSE ===`);
        console.log(`Room: ${currentRoom.name} (ID: ${currentRoom.id})`);
        console.log(`Entities: ${tacticalEntities.length}`);
        console.log(`Mob entities: ${tacticalEntities.filter(e => e.type === 'mob').length}`);

        res.json(response);
      } catch (error) {
        console.error("=== CRITICAL ERROR in tactical-data endpoint ===");
        console.error("Error details:", error);
        console.error("Stack trace:", error.stack);
        console.error("Crawler ID:", crawlerId);
        console.error("Request params:", req.params);

        res.status(500).json({ 
          error: "Failed to fetch tactical data",
          details: error instanceof Error ? error.message : "Unknown error",
          crawlerId: crawlerId
        });
      }
    } catch (error) {
      console.error("Error fetching tactical data:", error);
      res.status(500).json({ message: "Failed to fetch tactical data" });
    }
  });
  // Get room mobs summary
  app.get("/api/crawlers/:id/room-mobs-summary", async (req, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      if (isNaN(crawlerId)) {
        return res.status(400).json({ message: "Invalid crawler ID" });
      }

      let crawler;
      try {
        crawler = await storage.crawlerStorage.getCrawler(crawlerId);
      } catch (storageError) {
        console.error("Storage error fetching crawler:", storageError);
        return res.status(404).json({ message: "Crawler not found" });
      }

      if (!crawler || !crawler.currentRoomId) {
        return res.status(404).json({ message: "Crawler or current room not found" });
      }

      let mobs;
      try {
        mobs = await storage.mobStorage.getActiveMobs(crawler.currentRoomId);
      } catch (storageError) {
        console.error("Storage error fetching mobs:", storageError);
        // Return empty summary instead of failing
        mobs = [];
      }

      const summary = {
        totalMobs: mobs.length,
        hostileMobs: mobs.filter(mob => mob.disposition === 'hostile').length,
        neutralMobs: mobs.filter(mob => mob.disposition === 'neutral').length
      };

      res.json(summary);
    } catch (error) {
      console.error("Error fetching room mobs summary:", error);
      res.status(500).json({ message: "Failed to fetch room mobs summary" });
    }
  });
}