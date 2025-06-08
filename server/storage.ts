import {
  users,
  crawlers,
  crawlerClasses,
  equipment,
  equipmentTypes,
  crawlerEquipment,
  floors,
  factions,
  rooms,
  roomConnections,
  crawlerPositions,
  enemies,
  encounters,
  activities,
  chatMessages,
  marketplaceListings,
  seasons,
  corporationPrefixes,
  corporationSuffixes,
  humanFirstNames,
  humanLastNames,
  competencies,
  startingEquipment,
  type UpsertUser,
  type User,
  type InsertCrawler,
  type Crawler,
  type CrawlerWithDetails,
  type CrawlerClass,
  type Equipment,
  type EquipmentType,
  type Activity,
  type ActivityWithDetails,
  type ChatMessage,
  type ChatMessageWithUser,
  type MarketplaceListing,
  type MarketplaceListingWithDetails,
  type Floor,
  type Room,
  type RoomConnection,
  type CrawlerPosition,
  type Enemy,
  type Encounter,
  type Season,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, asc, like, inArray, not } from "drizzle-orm";
import { 
  UserStorage, 
  CrawlerStorage, 
  ExplorationStorage, 
  TacticalStorage,
  CorporationStorage,
  ContentStorage,
  MobStorage
} from "./storage/index";
import { ModularStorage, type IStorage } from "./storage/index";

// Re-export the main storage instance
export const storage = new ModularStorage();

// Re-export the interface for type checking
export type { IStorage };

export const userStorage = new UserStorage();
export const crawlerStorage = new CrawlerStorage();
export const explorationStorage = new ExplorationStorage();
export const tacticalStorage = new TacticalStorage();
export const corporationStorage = new CorporationStorage();
export const contentStorage = new ContentStorage();
export const mobStorage = new MobStorage();

// Set up dependencies
tacticalStorage.setCrawlerStorage(crawlerStorage);
tacticalStorage.setExplorationStorage(explorationStorage);
tacticalStorage.setMobStorage(mobStorage);