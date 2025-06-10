/**
 * File: data.ts
 * Responsibility: General data API routes for game content, factions, and static information
 */
import express from "express";
import { storage } from "../storage";

export function registerDataRoutes(app: Express) {
  // Crawler classes
  app.get("/api/crawler-classes", async (req, res) => {
    try {
      const classes = await storage.getCrawlerClasses();
      res.json(classes);
    } catch (error) {
      console.error("Error fetching crawler classes:", error);
      res.status(500).json({ message: "Failed to fetch crawler classes" });
    }
  });

  // Crawler generation
  app.get("/api/crawlers/candidates", async (req, res) => {
    try {
      const count = parseInt(req.query.count as string) || 3;
      const candidates = await storage.generateCrawlerCandidates(count);
      res.json(candidates);
    } catch (error) {
      console.error("Error generating crawler candidates:", error);
      res
        .status(500)
        .json({ message: "Failed to generate crawler candidates" });
    }
  });

  // Equipment
  app.get("/api/equipment", async (req, res) => {
    try {
      const equipment = await storage.getEquipment();
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  // Factions
  app.get("/api/factions", async (req, res) => {
    try {
      const allFactions = await storage.getFactions();
      res.json(allFactions);
    } catch (error) {
      console.error("Error fetching factions:", error);
      res.status(500).json({ message: "Failed to fetch factions" });
    }
  });
}