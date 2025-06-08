
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
}
