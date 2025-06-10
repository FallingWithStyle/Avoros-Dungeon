/**
 * File: routes.ts
 * Responsibility: Central route registration that organizes all API endpoints
 * Notes: Imports and registers all route modules for the Express application
 */
import express from "express";
import { registerAuthRoutes } from "./routes/auth";
import { registerSeasonRoutes } from "./routes/season";
import { registerDataRoutes } from "./routes/data";
import { registerCrawlerRoutes } from "./routes/crawler";
import { registerExplorationRoutes } from "./routes/exploration";
import { registerCombatRoutes } from "./routes/combat";
import { registerDebugRoutes } from "./routes/debug";