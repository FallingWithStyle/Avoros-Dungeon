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

      // Try to get cached room data first
      const cachedRoomData = await storage.redisService.getCurrentRoomData(crawlerId);
      if (cachedRoomData) {
        return res.json(cachedRoomData);
      }

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

      const roomData = {
        room,
        availableDirections,
        playersInRoom,
      };

      // Cache the result
      await storage.redisService.setCurrentRoomData(crawlerId, roomData, 180); // 3 minutes TTL

      res.json(roomData);
    } catch (error) {
      console.error("Error fetching current room:", error);
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

      const result = await storage.moveToRoom(
        crawlerId,
        direction,
        debugEnergyDisabled,
      );

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
      await storage.redisService.invalidateCrawlerRoomData(crawlerId);
      if (result.newRoom) {
        await storage.redisService.invalidateRoomData(result.newRoom.id);
      }

      res.json({ success: true, newRoom: result.newRoom });
    } catch (error) {
      console.error("Error moving crawler:", error);
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

      const directions = await storage.explorationStorage.getAvailableDirections(currentRoom.id);
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

      const directions = await storage.explorationStorage.getAvailableDirections(currentRoom.id);
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