import { db } from "./db";
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
  insertCrawlerSchema,
  type Crawler,
  type CrawlerWithDetails,
  type ActivityWithDetails,
  type ChatMessageWithUser,
  type MarketplaceListingWithDetails,
  type UpsertUser,
  type User,
  type CrawlerClass,
  type Equipment,
  type EquipmentType,
  type CrawlerEquipment,
  type Floor,
  type Room,
  type RoomConnection,
  type CrawlerPosition,
} from "../../db/schema";
import { eq } from "drizzle-orm";

export const storage = {
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  },

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  },
};