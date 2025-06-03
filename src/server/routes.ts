
import express, { type Express } from 'express';
import { db } from './db';
import {
  users,
  crawlers,
  crawlerClasses,
  equipment,
  crawlerEquipment,
  floors,
  rooms,
  roomConnections,
  crawlerPositions,
  encounters,
  enemies,
  activities,
  chatMessages,
  marketplaceListings,
  seasons,
  insertCrawlerSchema,
  type UpsertUser,
  type Crawler,
  type CrawlerWithDetails,
  type ActivityWithDetails,
  type ChatMessageWithUser,
  type MarketplaceListingWithDetails,
  type User,
  type CrawlerClass,
  type Equipment,
  type EquipmentType,
  type CrawlerEquipment,
  type Floor,
  type Room,
  type RoomConnection,
  type CrawlerPosition,
  type Season,
} from "../../db/schema";

export function setupRoutes(app: Express) {
  app.use(express.json());
  
  // Basic health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  // Add your API routes here
  // Example: app.get('/api/users', async (req, res) => { ... });
}
