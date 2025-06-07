
import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

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
}
