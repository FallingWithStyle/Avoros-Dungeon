
import { db } from "../db";
import { 
  crawlerBackgrounds, 
  preDungeonJobs, 
  combatFlavorText,
  floorThemes,
  roomTypes,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { BaseStorage } from "./base-storage";

export class ContentStorage extends BaseStorage {
  
  async getRandomCrawlerBackground(category: string = "desperate"): Promise<string> {
    const backgrounds = await db
      .select()
      .from(crawlerBackgrounds)
      .where(eq(crawlerBackgrounds.category, category));
    
    if (backgrounds.length === 0) {
      return "A person with a mysterious past seeking fortune in the depths.";
    }
    
    // Weighted random selection
    const totalWeight = backgrounds.reduce((sum, bg) => sum + (bg.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const bg of backgrounds) {
      random -= (bg.weight || 1);
      if (random <= 0) {
        return bg.story;
      }
    }
    
    return backgrounds[0].story;
  }

  async getRandomPreDungeonJob(): Promise<string> {
    const jobs = await db.select().from(preDungeonJobs);
    
    if (jobs.length === 0) {
      return "Office Worker";
    }
    
    const totalWeight = jobs.reduce((sum, job) => sum + (job.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const job of jobs) {
      random -= (job.weight || 1);
      if (random <= 0) {
        return job.jobTitle;
      }
    }
    
    return jobs[0].jobTitle;
  }

  async getRandomFlavorText(category: string): Promise<string> {
    const flavorTexts = await db
      .select()
      .from(combatFlavorText)
      .where(eq(combatFlavorText.category, category));
    
    if (flavorTexts.length === 0) {
      return "Something interesting happens.";
    }
    
    const totalWeight = flavorTexts.reduce((sum, text) => sum + (text.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const text of flavorTexts) {
      random -= (text.weight || 1);
      if (random <= 0) {
        return text.text;
      }
    }
    
    return flavorTexts[0].text;
  }

  async getFloorTheme(floorNumber: number): Promise<{
    name: string;
    description: string;
    roomTypes: Array<{ name: string; description: string }>;
  } | null> {
    const [theme] = await db
      .select()
      .from(floorThemes)
      .where(eq(floorThemes.floorNumber, floorNumber));
    
    if (!theme) return null;

    const themeRoomTypes = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.floorThemeId, theme.id));

    return {
      name: theme.name,
      description: theme.description,
      roomTypes: themeRoomTypes.map(rt => ({
        name: rt.name,
        description: rt.description,
      })),
    };
  }

  async addCrawlerBackground(category: string, story: string, weight: number = 1): Promise<void> {
    await db.insert(crawlerBackgrounds).values({
      category,
      story,
      weight,
    });
  }

  async addFlavorText(category: string, text: string, weight: number = 1): Promise<void> {
    await db.insert(combatFlavorText).values({
      category,
      text,
      weight,
    });
  }
}
