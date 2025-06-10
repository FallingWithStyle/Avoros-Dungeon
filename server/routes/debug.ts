
/**
 * File: debug.ts
 * Responsibility: Development and debugging utility API routes
 * Notes: Provides crawler healing, reset, deletion, cache clearing, and mob spawning for testing
 */
import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

export function registerDebugRoutes(app: Express) {
  // Debug endpoints
  app.post("/api/crawlers/:id/debug/heal", isAuthenticated, async (req: any, res) => {
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
        energy: crawler.maxEnergy,
      });

      res.json({ message: "Crawler healed", crawler: healedCrawler });
    } catch (error) {
      console.error("Error healing crawler:", error);
      res.status(500).json({ message: "Failed to heal crawler" });
    }
  });

  app.post("/api/crawlers/:id/debug/reset", isAuthenticated, async (req: any, res) => {
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
        status: "active",
      });

      // Move crawler back to entrance room
      await storage.resetCrawlerToEntrance(crawlerId);

      res.json({
        message: "Crawler reset to entrance",
        crawler: resetCrawler,
      });
    } catch (error) {
      console.error("Error resetting crawler:", error);
      res.status(500).json({ message: "Failed to reset crawler" });
    }
  });

  // DEBUG: Reset crawlers (temporary for development)
  app.post("/api/debug/reset-crawlers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.resetUserCrawlers(userId);
      res.json({ message: "All crawlers reset successfully" });
    } catch (error) {
      console.error("Error resetting crawlers:", error);
      res.status(500).json({ message: "Failed to reset crawlers" });
    }
  });

  // DEBUG: Delete all crawlers (complete removal)
  app.post("/api/debug/delete-crawlers", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is properly authenticated
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = req.user.claims.sub;
      const { db } = await import("../db");
      const { crawlers, crawlerPositions, crawlerEquipment } = await import("@shared/schema");
      const { eq, inArray } = await import("drizzle-orm");

      // Get all user's crawlers first
      const userCrawlers = await db
        .select()
        .from(crawlers)
        .where(eq(crawlers.sponsorId, userId));

      if (userCrawlers.length === 0) {
        return res.json({ message: "No crawlers to delete" });
      }

      const crawlerIds = userCrawlers.map(c => c.id);

      // Delete related data first - use inArray for multiple crawler IDs
      if (crawlerIds.length > 0) {
        // Import activities table
        const { activities } = await import("@shared/schema");
        
        // Delete activities first (foreign key constraint)
        await db
          .delete(activities)
          .where(inArray(activities.crawlerId, crawlerIds));
        
        await db
          .delete(crawlerPositions)
          .where(inArray(crawlerPositions.crawlerId, crawlerIds));
        
        await db
          .delete(crawlerEquipment)
          .where(inArray(crawlerEquipment.crawlerId, crawlerIds));
      }

      // Finally delete the crawlers themselves
      await db
        .delete(crawlers)
        .where(eq(crawlers.sponsorId, userId));

      // Reset user's active crawler
      await storage.updateUserActiveCrawler(userId, 0);

      res.json({ 
        message: `Successfully deleted ${userCrawlers.length} crawler(s)`,
        deletedCount: userCrawlers.length 
      });
    } catch (error) {
      console.error("Error deleting crawlers:", error);
      res.status(500).json({ 
        message: "Failed to delete crawlers",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // DEBUG: Restore crawler energy (temporary for development)
  app.post("/api/crawlers/:id/restore-energy", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const crawler = await storage.getCrawler(crawlerId);

      if (!crawler) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      // Update crawler energy to 100%
      await storage.updateCrawler(crawlerId, {
        energy: 100,
        lastEnergyRegen: new Date(),
      });

      res.json({ message: "Energy restored successfully" });
    } catch (error) {
      console.error("Restore energy error:", error);
      res.status(500).json({ message: "Failed to restore energy" });
    }
  });

  // DEBUG: Reset crawler to entrance
  app.post("/api/crawlers/:id/reset-position", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const { db } = await import("../db");
      const { rooms, crawlerPositions } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      // Find entrance room
      const [entranceRoom] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.type, "entrance"));
      if (!entranceRoom) {
        return res.status(404).json({ message: "Entrance room not found" });
      }

      // Clear existing position
      await db
        .delete(crawlerPositions)
        .where(eq(crawlerPositions.crawlerId, crawlerId));

      // Set new position at entrance
      await db.insert(crawlerPositions).values({
        crawlerId: crawlerId,
        roomId: entranceRoom.id,
        enteredAt: new Date(),
      });

      res.json({ message: "Crawler position reset to entrance" });
    } catch (error) {
      console.error("Reset position error:", error);
      res.status(500).json({ message: "Failed to reset position" });
    }
  });

  // DEBUG: Clear tactical data for current room
  app.post("/api/debug/clear-tactical-data/:crawlerId", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.crawlerId);
      
      const currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentRoom) {
        return res.status(404).json({ message: "Crawler not in any room" });
      }

      // Clear tactical positions from database
      await storage.tacticalStorage.clearTacticalPositions(currentRoom.id);
      
      // Clear from cache
      await storage.redisService.del(`tactical:${currentRoom.id}`);

      res.json({ 
        message: `Cleared tactical data for room ${currentRoom.id} (${currentRoom.name})`,
        roomId: currentRoom.id,
        roomName: currentRoom.name
      });
    } catch (error) {
      console.error("Clear tactical data error:", error);
      res.status(500).json({ message: "Failed to clear tactical data" });
    }
  });

  // DEBUG: Regenerate dungeon layout
  app.post("/api/debug/regenerate-dungeon", isAuthenticated, async (req: any, res) => {
    try {
      const { db } = await import("../db");
      const { rooms, roomConnections, crawlerPositions, floors } =
        await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      // Clear existing room data
      await db.delete(crawlerPositions);
      await db.delete(roomConnections);
      await db.delete(rooms);

      // Generate full 10-floor dungeon
      const { generateFullDungeon } = await import(
        "../../client/src/features/dungeon/generation/dungeon-generator"
      );
      await generateFullDungeon();

      // Reset all crawlers to entrance room
      const [floor1] = await db
        .select()
        .from(floors)
        .where(eq(floors.floorNumber, 1));
      if (floor1) {
        const [entranceRoom] = await db
          .select()
          .from(rooms)
          .where(eq(rooms.type, "entrance"));
        if (entranceRoom) {
          // Get all active crawlers and reset their positions
          const { crawlers } = await import("@shared/schema");
          const activeCrawlers = await db
            .select()
            .from(crawlers)
            .where(eq(crawlers.status, "active"));

          for (const crawler of activeCrawlers) {
            await db
              .insert(crawlerPositions)
              .values({
                crawlerId: crawler.id,
                roomId: entranceRoom.id,
                enteredAt: new Date(),
              })
              .onConflictDoNothing();
          }
        }
      }

      res.json({
        message: "Dungeon layout regenerated with new room distribution",
      });
    } catch (error) {
      console.error("Error regenerating dungeon:", error);
      res.status(500).json({ message: "Failed to regenerate dungeon" });
    }
  });

  // DEBUG: Clear all cached data for current room
  app.post("/api/debug/clear-room-cache/:crawlerId", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.crawlerId);
      const userId = req.user.claims.sub;

      // Verify ownership
      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      // Get current room
      const currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentRoom) {
        return res.status(400).json({ 
          success: false, 
          error: "Crawler is not in any room" 
        });
      }

      // Clear all cached data for this room
      try {
        await storage.redisService.invalidateRoomMobs(currentRoom.id);
        await storage.redisService.invalidateTacticalPositions(currentRoom.id);
        await storage.redisService.invalidateRoomData(currentRoom.id);
        await storage.redisService.invalidateCrawlerRoomData(crawlerId);
        
        console.log(`Cleared all cached data for room ${currentRoom.id}`);
        
        res.json({
          success: true,
          message: `Cleared all cached data for room ${currentRoom.id} (${currentRoom.name})`,
          roomId: currentRoom.id,
          roomName: currentRoom.name
        });
      } catch (cacheError) {
        console.error('Error clearing room cache:', cacheError);
        res.status(500).json({
          success: false,
          error: "Failed to clear room cache"
        });
      }
    } catch (error) {
      console.error("Error in clear room cache:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to clear room cache" 
      });
    }
  });

  // DEBUG: Enable/disable Redis fallback mode
  app.post("/api/debug/redis-fallback", isAuthenticated, async (req: any, res) => {
    try {
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          error: "Missing or invalid 'enabled' boolean parameter" 
        });
      }

      storage.redisService.setForceFallbackMode(enabled);

      res.json({
        success: true,
        message: `Redis fallback mode ${enabled ? 'enabled' : 'disabled'}`,
        fallbackMode: enabled
      });
    } catch (error) {
      console.error("Error toggling Redis fallback mode:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to toggle Redis fallback mode" 
      });
    }
  });

  // DEBUG: Get current Redis fallback mode status
  app.get("/api/debug/redis-fallback", isAuthenticated, async (req: any, res) => {
    try {
      const isFallbackMode = storage.redisService.isForceFallbackMode();
      
      res.json({
        success: true,
        fallbackMode: isFallbackMode,
        message: `Redis fallback mode is currently ${isFallbackMode ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error("Error getting Redis fallback mode status:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to get Redis fallback mode status" 
      });
    }
  });

  // DEBUG: Spawn hostile mob in current room
  app.post("/api/debug/spawn-mob/:crawlerId", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.crawlerId);
      const userId = req.user.claims.sub;

      console.log('🎯 Debug spawn mob request for crawler:', crawlerId);

      // Verify ownership
      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== userId) {
        console.log('❌ Crawler not found or access denied');
        return res.status(404).json({ message: "Crawler not found" });
      }

      // Get current room
      const currentRoom = await storage.getCrawlerCurrentRoom(crawlerId);
      if (!currentRoom) {
        console.log('❌ Crawler not in any room');
        return res.status(400).json({ 
          success: false, 
          error: "Crawler is not in any room" 
        });
      }

      console.log('🏠 Current room:', {
        id: currentRoom.id,
        name: currentRoom.name,
        type: currentRoom.type,
        isSafe: currentRoom.isSafe,
        environment: currentRoom.environment,
        factionId: currentRoom.factionId
      });

      // Don't spawn mobs in safe rooms
      if (currentRoom.isSafe || currentRoom.type === "safe" || currentRoom.type === "entrance") {
        console.log('❌ Cannot spawn in safe area');
        return res.status(400).json({ 
          success: false, 
          error: "Cannot spawn hostile mobs in safe areas" 
        });
      }

      // Get room data for contextual spawning
      const roomData = {
        type: currentRoom.type,
        environment: currentRoom.environment || "indoor",
        factionId: currentRoom.factionId
      };

      console.log('🎲 Room data for spawning:', roomData);

      // Check current mobs before spawning
      const mobsBefore = await storage.mobStorage.getRoomMobs(currentRoom.id);
      console.log('📊 Mobs before spawn:', mobsBefore.length);

      // Force spawn a single mob with debug flag
      console.log('🎯 About to call spawnSingleMob with roomData:', roomData);
      await storage.mobStorage.spawnSingleMob(currentRoom.id, roomData, true, true);
      console.log('✅ spawnSingleMob completed without throwing error');

      // Clear any Redis cache for this room to ensure fresh data
      try {
        await storage.redisService.invalidateRoomMobs(currentRoom.id);
        console.log('🗑️ Cleared Redis cache for fresh mob data');
      } catch (cacheError) {
        console.log('⚠️ Failed to clear cache, but continuing:', cacheError);
      }

      // Get mobs after spawning
      const mobsAfter = await storage.mobStorage.getRoomMobs(currentRoom.id);
      console.log('📊 Mobs after spawn:', mobsAfter.length);
      console.log('📋 Mob details after spawn:', mobsAfter.map(m => ({
        id: m.mob.id,
        name: m.mob.displayName,
        alive: m.mob.isAlive,
        active: m.mob.isActive
      })));

      if (mobsAfter.length <= mobsBefore.length) {
        console.log('❌ No new mob was spawned');
        console.log('Before count:', mobsBefore.length, 'After count:', mobsAfter.length);
        return res.status(500).json({
          success: false,
          error: "Mob spawn failed - no new mob created",
          details: {
            mobsBefore: mobsBefore.length,
            mobsAfter: mobsAfter.length,
            roomId: currentRoom.id,
            roomData
          }
        });
      }

      // Get the newly spawned mob for response
      const latestMob = mobsAfter[mobsAfter.length - 1];
      console.log('✅ Successfully spawned mob:', latestMob?.mob?.displayName);

      res.json({
        success: true,
        message: "Hostile mob spawned successfully",
        mobName: latestMob?.mob?.displayName || "Unknown Mob",
        roomName: currentRoom.name,
        mobsCount: mobsAfter.length
      });
    } catch (error) {
      console.error("❌ Error spawning mob:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        success: false, 
        error: `Failed to spawn mob: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });
}
