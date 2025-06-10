/**
 * File: combat.ts
 * Responsibility: Combat system API routes for battle mechanics and combat actions
 */
import express from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";

export function registerCombatRoutes(app: Express) {
  // New endpoint for making choices in encounters
  app.post("/api/crawlers/:id/choose", isAuthenticated, async (req: any, res) => {
    try {
      const crawlerId = parseInt(req.params.id);
      const { choiceId, encounterData } = req.body;

      const crawler = await storage.getCrawler(crawlerId);
      if (!crawler || crawler.sponsorId !== req.user.claims.sub) {
        return res.status(404).json({ message: "Crawler not found" });
      }

      const result = await storage.processEncounterChoice(
        crawlerId,
        choiceId,
        encounterData,
      );
      res.json(result);
    } catch (error) {
      console.error("Error processing choice:", error);
      res.status(500).json({ message: "Failed to process choice" });
    }
  });

  // Apply effect to crawler
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

      const result = await storage.applyEffect(crawlerId, effectId);
      res.json(result);
    } catch (error) {
      console.error("Failed to apply effect:", error);
      res.status(500).json({ message: "Failed to apply effect" });
    }
  });
}