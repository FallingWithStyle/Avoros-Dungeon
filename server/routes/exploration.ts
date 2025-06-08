import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

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

  app.get("/api/crawlers/:id/explored-rooms", isAuthenticated, async (req: any, res) => {
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
      const { direction, debugEnergyDisabled } = req.body;
      
      console.log(`=== MOVE CRAWLER API CALL ===`);
      console.log(`Crawler ID: ${crawlerId}`);
      console.log(`Direction: ${direction}`);
      console.log(`Debug Energy Disabled: ${debugEnergyDisabled}`);
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

      // Check minimum energy requirement (unless debug mode is enabled)
      const energyRequired = 10; // Standard movement cost
      if (!debugEnergyDisabled && crawler.energy < energyRequired) {
        console.log(`ERROR: Not enough energy. Required: ${energyRequired}, Available: ${crawler.energy}`);
        return res.status(400).json({ message: `Not enough energy to move. Need ${energyRequired}, have ${crawler.energy}` });
      }

      console.log(`Attempting to move crawler ${crawlerId} ${direction}...`);
      const result = await storage.moveToRoom(
        crawlerId,
        direction,
        debugEnergyDisabled,
      );

      console.log(`Move result:`, result.success ? `Success - moved to ${result.newRoom?.name}` : `Failed - ${result.error}`);

      if (!result.success) {
        return res
          .status(400)
          .json({ message: result.error || "Cannot move in that direction" });
      }

      // Deduct energy if not in debug mode
      if (!debugEnergyDisabled) {
        console.log(`Deducting ${energyRequired} energy from crawler ${crawlerId}`);
        await storage.updateCrawlerEnergy(crawlerId, -energyRequired);
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

  // Get tactical data for current room
  app.get("/api/crawlers/:id/tactical-data", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);

      if (!crawlerId || isNaN(Number(crawlerId))) {
        return res.status(400).json({
          message: "Invalid crawler ID",
        });
      }

      const currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentRoom) {
        return res.status(404).json({ message: "Crawler not in any room" });
      }

      const directions = await storage.getAvailableDirections(currentRoom.id);
      const playersInRoom = await storage.getPlayersInRoom(currentRoom.id);

      // Generate or get tactical data with persistent positions
      const tacticalEntities = await storage.tacticalStorage.generateAndSaveTacticalData(currentRoom.id, {
        type: currentRoom.type,
        hasLoot: currentRoom.hasLoot,
        isSafe: currentRoom.isSafe,
        factionId: currentRoom.factionId,
      });

      res.json({
        room: currentRoom,
        availableDirections: directions,
        playersInRoom,
        tacticalEntities,
      });
    } catch (error) {
      console.error("Get tactical data error:", error);
      res.status(500).json({
        message: "Failed to get tactical data",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}