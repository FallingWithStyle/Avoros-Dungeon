import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations, sql } from "drizzle-orm";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Game seasons
export const seasons = pgTable("seasons", {
  id: serial("id").primaryKey(),
  seasonNumber: integer("season_number").notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(false).notNull(),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  corporationName: varchar("corporation_name").notNull(),
  corporationType: varchar("corporation_type")
    .default("Mining Consortium")
    .notNull(), // Mining Consortium, Tech Corp, Military Contractor, etc.
  credits: integer("credits").default(50000).notNull(),
  sponsorReputation: integer("sponsor_reputation").default(0).notNull(),
  activeCrawlerId: integer("active_crawler_id"),
  primarySponsorshipUsed: boolean("primary_sponsorship_used")
    .default(false)
    .notNull(),
  lastPrimarySponsorshipSeason: integer("last_primary_sponsorship_season")
    .default(1)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Crawler classes/types
export const crawlerClasses = pgTable("crawler_classes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description").notNull(),
  baseHealth: integer("base_health").notNull(),
  baseAttack: integer("base_attack").notNull(),
  baseDefense: integer("base_defense").notNull(),
  baseSpeed: integer("base_speed").notNull(),
  baseWit: integer("base_wit").notNull(),
  baseCharisma: integer("base_charisma").notNull(),
  baseMemory: integer("base_memory").notNull(),
  baseLuck: integer("base_luck").notNull(),
});

// Crawlers
export const crawlers = pgTable("crawlers", {
  id: serial("id").primaryKey(),
  sponsorId: varchar("sponsor_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 50 }).notNull(),
  background: text("background").notNull(), // Brief story/background
  classId: integer("class_id").references(() => crawlerClasses.id), // Null until they choose a class
  level: integer("level").default(0).notNull(), // Start at Level 0
  currentFloor: integer("current_floor").default(1).notNull(),
  health: integer("health").notNull(),
  maxHealth: integer("max_health").notNull(),
  attack: integer("attack").notNull(),
  defense: integer("defense").notNull(),
  speed: integer("speed").notNull(),
  wit: integer("wit").notNull(),
  charisma: integer("charisma").notNull(),
  memory: integer("memory").notNull(),
  luck: integer("luck").notNull(),
  credits: integer("credits").default(0).notNull(),
  experience: integer("experience").default(0).notNull(),
  energy: integer("energy").default(100).notNull(),
  maxEnergy: integer("max_energy").default(100).notNull(),
  detectRange: integer("detect_range").default(0).notNull(), // How far crawler can detect room types
  analyzeRange: integer("analyze_range").default(0).notNull(), // How far crawler can analyze room details
  competencies: text("competencies").array().notNull(), // Array of starting competencies
  abilities: text("abilities").array().notNull(), // Unlocked special abilities
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, resting, dead, exploring
  isAlive: boolean("is_alive").default(true).notNull(),
  sponsorshipType: varchar("sponsorship_type").default("primary").notNull(), // "primary" or "secondary"
  seasonNumber: integer("season_number").default(1).notNull(),
  lastAction: timestamp("last_action").defaultNow(),
  lastEnergyRegen: timestamp("last_energy_regen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Equipment types
export const equipmentTypes = pgTable("equipment_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  slot: varchar("slot", { length: 20 }).notNull(), // weapon, armor, accessory
});

// Equipment items
export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  typeId: integer("type_id")
    .notNull()
    .references(() => equipmentTypes.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  attackBonus: integer("attack_bonus").default(0),
  defenseBonus: integer("defense_bonus").default(0),
  speedBonus: integer("speed_bonus").default(0),
  witBonus: integer("wit_bonus").default(0),
  charismaBonus: integer("charisma_bonus").default(0),
  memoryBonus: integer("memory_bonus").default(0),
  healthBonus: integer("health_bonus").default(0),
  rarity: varchar("rarity", { length: 20 }).default("common"), // common, uncommon, rare, epic, legendary
  price: integer("price").notNull(),
  minFloor: integer("min_floor").default(1),
});

// Crawler equipment (what equipment each crawler has)
export const crawlerEquipment = pgTable("crawler_equipment", {
  id: serial("id").primaryKey(),
  crawlerId: integer("crawler_id")
    .notNull()
    .references(() => crawlers.id),
  equipmentId: integer("equipment_id")
    .notNull()
    .references(() => equipment.id),
  equipped: boolean("equipped").default(false),
  acquiredAt: timestamp("acquired_at").defaultNow(),
});

// Dungeon floors
export const floors = pgTable("floors", {
  id: serial("id").primaryKey(),
  floorNumber: integer("floor_number").notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  difficulty: integer("difficulty").notNull(),
  minRecommendedLevel: integer("min_recommended_level").default(1),
});

// Rooms within each floor
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  floorId: integer("floor_id")
    .notNull()
    .references(() => floors.id),
  x: integer("x").notNull(), // Grid position X
  y: integer("y").notNull(), // Grid position Y
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  type: varchar("type", { length: 30 }).default("normal").notNull(), // normal, safe, boss, treasure, trap, entrance, exit
  isExplored: boolean("is_explored").default(false).notNull(),
  hasLoot: boolean("has_loot").default(false).notNull(),
  isSafe: boolean("is_safe").default(false).notNull(), // Safe rooms for leveling/resting
  factionId: integer("faction_id"),
  placementId: integer("placement_id").default(-1).notNull(), // id to help with the arrangement of rooms on the map, default -1 means "not yet placed"
  environment: varchar("environment", { length: 20 }).default("indoors").notNull(), // indoors, outdoors, underground
  hasCreatures: boolean("has_creatures").default(false).notNull(), // Whether creatures are present
  territoryStatus: varchar("territory_status", { length: 10 }).default("neutral").notNull(), // friendly, neutral, unfriendly
  createdAt: timestamp("created_at").defaultNow(),
});

// Room connections (which rooms connect to which)
export const roomConnections = pgTable("room_connections", {
  id: serial("id").primaryKey(),
  fromRoomId: integer("from_room_id")
    .notNull()
    .references(() => rooms.id),
  toRoomId: integer("to_room_id")
    .notNull()
    .references(() => rooms.id),
  direction: varchar("direction", { length: 10 }).notNull(), // north, south, east, west
  isLocked: boolean("is_locked").default(false).notNull(),
  keyRequired: varchar("key_required", { length: 50 }), // Optional key requirement
  createdAt: timestamp("created_at").defaultNow(),
});

// Player positions in rooms
export const crawlerPositions = pgTable("crawler_positions", {
  id: serial("id").primaryKey(),
  crawlerId: integer("crawler_id")
    .notNull()
    .references(() => crawlers.id),
  roomId: integer("room_id")
    .notNull()
    .references(() => rooms.id),
  enteredAt: timestamp("entered_at").defaultNow(),
});

// Factions for NPCs, level theming, etc
export const factions = pgTable("factions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  mobTypes: text("mob_type").array().notNull(),
  influence: integer("influence").notNull().default(1),
  color: varchar("color", { length: 16 }),
  icon: text("icon"),
});

// Enemies
export const enemies = pgTable("enemies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  health: integer("health").notNull(),
  attack: integer("attack").notNull(),
  defense: integer("defense").notNull(),
  speed: integer("speed").notNull(),
  creditsReward: integer("credits_reward").notNull(),
  experienceReward: integer("experience_reward").notNull(),
  minFloor: integer("min_floor").default(1),
  maxFloor: integer("max_floor").default(100),
});

// NPCs in the dungeon
export const npcs = pgTable("npcs", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  personality: varchar("personality", { length: 50 }).notNull(), // quirky, hostile, helpful, mysterious, etc.
  dialogue: text("dialogue").array().notNull(), // Array of possible dialogue lines
  services: text("services").array().notNull(), // trade, information, quests, etc.
  floorRange: text("floor_range").default("1-5").notNull(), // "1-3", "5-10", etc.
  rarity: varchar("rarity", { length: 20 }).default("common").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Combat encounters and exploration events
export const encounters = pgTable("encounters", {
  id: serial("id").primaryKey(),
  crawlerId: integer("crawler_id")
    .notNull()
    .references(() => crawlers.id),
  floorId: integer("floor_id")
    .notNull()
    .references(() => floors.id),
  type: varchar("type", { length: 20 }).default("combat").notNull(), // combat, npc, treasure, trap, event
  enemyId: integer("enemy_id").references(() => enemies.id),
  npcId: integer("npc_id").references(() => npcs.id),
  energyCost: integer("energy_cost").default(10).notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, completed, failed
  result: jsonb("result"), // stores encounter outcome details
  storyText: text("story_text"), // Custom encounter description
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Activity feed
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  crawlerId: integer("crawler_id").references(() => crawlers.id),
  type: varchar("type", { length: 30 }).notNull(), // combat_victory, floor_advance, death, level_up, equipment_found
  message: text("message").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Marketplace listings
export const marketplaceListings = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(),
  sellerId: varchar("seller_id")
    .notNull()
    .references(() => users.id),
  equipmentId: integer("equipment_id")
    .notNull()
    .references(() => equipment.id),
  price: integer("price").notNull(),
  quantity: integer("quantity").default(1),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  crawlers: many(crawlers),
  activities: many(activities),
  chatMessages: many(chatMessages),
  marketplaceListings: many(marketplaceListings),
}));

export const crawlersRelations = relations(crawlers, ({ one, many }) => ({
  sponsor: one(users, {
    fields: [crawlers.sponsorId],
    references: [users.id],
  }),
  class: one(crawlerClasses, {
    fields: [crawlers.classId],
    references: [crawlerClasses.id],
  }),
  equipment: many(crawlerEquipment),
  encounters: many(encounters),
  activities: many(activities),
}));

export const crawlerClassesRelations = relations(
  crawlerClasses,
  ({ many }) => ({
    crawlers: many(crawlers),
  }),
);

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  type: one(equipmentTypes, {
    fields: [equipment.typeId],
    references: [equipmentTypes.id],
  }),
  crawlerEquipment: many(crawlerEquipment),
  marketplaceListings: many(marketplaceListings),
}));

export const equipmentTypesRelations = relations(
  equipmentTypes,
  ({ many }) => ({
    equipment: many(equipment),
  }),
);

export const crawlerEquipmentRelations = relations(
  crawlerEquipment,
  ({ one }) => ({
    crawler: one(crawlers, {
      fields: [crawlerEquipment.crawlerId],
      references: [crawlers.id],
    }),
    equipment: one(equipment, {
      fields: [crawlerEquipment.equipmentId],
      references: [equipment.id],
    }),
  }),
);

export const floorsRelations = relations(floors, ({ many }) => ({
  encounters: many(encounters),
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  floor: one(floors, {
    fields: [rooms.floorId],
    references: [floors.id],
  }),
  crawlerPositions: many(crawlerPositions),
  connectionsFrom: many(roomConnections, { relationName: "fromRoom" }),
  connectionsTo: many(roomConnections, { relationName: "toRoom" }),
}));

export const roomConnectionsRelations = relations(
  roomConnections,
  ({ one }) => ({
    fromRoom: one(rooms, {
      fields: [roomConnections.fromRoomId],
      references: [rooms.id],
      relationName: "fromRoom",
    }),
    toRoom: one(rooms, {
      fields: [roomConnections.toRoomId],
      references: [rooms.id],
      relationName: "toRoom",
    }),
  }),
);

export const crawlerPositionsRelations = relations(
  crawlerPositions,
  ({ one }) => ({
    crawler: one(crawlers, {
      fields: [crawlerPositions.crawlerId],
      references: [crawlers.id],
    }),
    room: one(rooms, {
      fields: [crawlerPositions.roomId],
      references: [rooms.id],
    }),
  }),
);

export const enemiesRelations = relations(enemies, ({ many }) => ({
  encounters: many(encounters),
}));

export const encountersRelations = relations(encounters, ({ one }) => ({
  crawler: one(crawlers, {
    fields: [encounters.crawlerId],
    references: [crawlers.id],
  }),
  floor: one(floors, {
    fields: [encounters.floorId],
    references: [floors.id],
  }),
  enemy: one(enemies, {
    fields: [encounters.enemyId],
    references: [enemies.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  crawler: one(crawlers, {
    fields: [activities.crawlerId],
    references: [crawlers.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const marketplaceListingsRelations = relations(
  marketplaceListings,
  ({ one }) => ({
    seller: one(users, {
      fields: [marketplaceListings.sellerId],
      references: [users.id],
    }),
    equipment: one(equipment, {
      fields: [marketplaceListings.equipmentId],
      references: [equipment.id],
    }),
  }),
);

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCrawlerSchema = createInsertSchema(crawlers).omit({
  id: true,
  createdAt: true,
  lastAction: true,
});

export const insertCrawlerClassSchema = createInsertSchema(crawlerClasses).omit(
  {
    id: true,
  },
);

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
});

export const insertEquipmentTypeSchema = createInsertSchema(
  equipmentTypes,
).omit({
  id: true,
});

export const insertCrawlerEquipmentSchema = createInsertSchema(
  crawlerEquipment,
).omit({
  id: true,
  acquiredAt: true,
});

export const insertFloorSchema = createInsertSchema(floors).omit({
  id: true,
});

export const insertEnemySchema = createInsertSchema(enemies).omit({
  id: true,
});

export const insertEncounterSchema = createInsertSchema(encounters).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertMarketplaceListingSchema = createInsertSchema(
  marketplaceListings,
).omit({
  id: true,
  createdAt: true,
});

export const insertSeasonSchema = createInsertSchema(seasons).omit({
  id: true,
  createdAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
});

export const insertRoomConnectionSchema = createInsertSchema(
  roomConnections,
).omit({
  id: true,
  createdAt: true,
});

export const insertCrawlerPositionSchema = createInsertSchema(
  crawlerPositions,
).omit({
  id: true,
  enteredAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCrawler = z.infer<typeof insertCrawlerSchema>;
export type Crawler = typeof crawlers.$inferSelect;
export type CrawlerClass = typeof crawlerClasses.$inferSelect;
export type Equipment = typeof equipment.$inferSelect;
export type EquipmentType = typeof equipmentTypes.$inferSelect;
export type CrawlerEquipment = typeof crawlerEquipment.$inferSelect;
export type Floor = typeof floors.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type RoomConnection = typeof roomConnections.$inferSelect;
export type CrawlerPosition = typeof crawlerPositions.$inferSelect;
export type Enemy = typeof enemies.$inferSelect;
export type Encounter = typeof encounters.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type Season = typeof seasons.$inferSelect;

// Extended types with relations
export type CrawlerWithDetails = Crawler & {
  class: CrawlerClass;
  equipment: (CrawlerEquipment & { equipment: Equipment })[];
};

export type ActivityWithDetails = Activity & {
  crawler?: Crawler;
};

export type ChatMessageWithUser = ChatMessage & {
  user: User;
};

export type MarketplaceListingWithDetails = MarketplaceListing & {
  equipment: Equipment & { type: EquipmentType };
  seller: User;
};
