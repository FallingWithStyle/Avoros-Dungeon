
import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

export function registerSeasonRoutes(app: Express) {
  // Activities
  app.get("/api/activities", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/leaderboards/crawlers", async (req, res) => {
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
  app.get("/api/marketplace", async (req, res) => {
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
  app.get("/api/season/current", isAuthenticated, async (req, res) => {
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

  app.get("/api/season/can-create-primary", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const canCreate = await storage.canCreatePrimaryCrawler(userId);
      res.json({ canCreate });
    } catch (error) {
      console.error("Error checking primary sponsorship eligibility:", error);
      res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  app.get("/api/season/secondary-sponsorships", isAuthenticated, async (req, res) => {
    try {
      const availableCrawlers = await storage.getAvailableSecondarySponsorships();
      res.json(availableCrawlers);
    } catch (error) {
      console.error("Error fetching secondary sponsorships:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch secondary sponsorships" });
    }
  });
}
