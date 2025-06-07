
import { db } from "../db";
import { 
  crawlerBackgrounds, 
  preDungeonJobs, 
  combatFlavorText,
  floorThemes,
  roomTypes,
  corporationPrefixes,
  corporationSuffixes,
  humanFirstNames,
  humanLastNames,
  competencies,
  startingEquipment,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { BaseStorage } from "./base-storage";
import { redisService } from "../lib/redis-service";

export class ContentStorage extends BaseStorage {
  
  async getRandomCrawlerBackground(category: string = "desperate"): Promise<string> {
    const cacheKey = `backgrounds:${category}`;
    let backgrounds = await redisService.getContentData(cacheKey);
    
    if (!backgrounds) {
      backgrounds = await db
        .select()
        .from(crawlerBackgrounds)
        .where(eq(crawlerBackgrounds.category, category));
      
      await redisService.setContentData(cacheKey, backgrounds);
    }
    
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

  async getRandomCorporationPrefix(): Promise<string> {
    const prefixes = await db.select().from(corporationPrefixes);
    
    if (prefixes.length === 0) {
      return "Generic";
    }
    
    const totalWeight = prefixes.reduce((sum, prefix) => sum + (prefix.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const prefix of prefixes) {
      random -= (prefix.weight || 1);
      if (random <= 0) {
        return prefix.name;
      }
    }
    
    return prefixes[0].name;
  }

  async getRandomCorporationSuffix(): Promise<string> {
    const suffixes = await db.select().from(corporationSuffixes);
    
    if (suffixes.length === 0) {
      return "Corporation";
    }
    
    const totalWeight = suffixes.reduce((sum, suffix) => sum + (suffix.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const suffix of suffixes) {
      random -= (suffix.weight || 1);
      if (random <= 0) {
        return suffix.name;
      }
    }
    
    return suffixes[0].name;
  }

  async getRandomHumanFirstName(): Promise<string> {
    const names = await db.select().from(humanFirstNames);
    
    if (names.length === 0) {
      return "John";
    }
    
    const totalWeight = names.reduce((sum, name) => sum + (name.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const name of names) {
      random -= (name.weight || 1);
      if (random <= 0) {
        return name.name;
      }
    }
    
    return names[0].name;
  }

  async getRandomHumanLastName(): Promise<string> {
    const names = await db.select().from(humanLastNames);
    
    if (names.length === 0) {
      return "Doe";
    }
    
    const totalWeight = names.reduce((sum, name) => sum + (name.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const name of names) {
      random -= (name.weight || 1);
      if (random <= 0) {
        return name.name;
      }
    }
    
    return names[0].name;
  }

  async getRandomCompetencies(count: number = 3): Promise<string[]> {
    const allCompetencies = await db.select().from(competencies);
    
    if (allCompetencies.length === 0) {
      return ["Survival", "Combat", "Negotiation"];
    }
    
    // Simple random selection without replacement
    const shuffled = [...allCompetencies].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, allCompetencies.length)).map(c => c.name);
  }

  async getRandomPreDungeonJob(): Promise<string> {
    const jobs = await db.select().from(preDungeonJobs);
    
    if (jobs.length === 0) {
      return "office clerk";
    }
    
    const totalWeight = jobs.reduce((sum, job) => sum + (job.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const job of jobs) {
      random -= (job.weight || 1);
      if (random <= 0) {
        return job.name;
      }
    }
    
    return jobs[0].name;
  }

  async getStartingEquipment(background: string): Promise<any[]> {
    const equipment = await db.select().from(startingEquipment);
    
    if (equipment.length === 0) {
      return [
        { name: "Emergency Rations", description: "Compressed nutrition bars" },
        { name: "Multi-tool", description: "Basic cutting and repair implement" },
      ];
    }
    
    // For now, return a simple selection - in the future this could be based on background
    const shuffled = [...equipment].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map(eq => ({
      name: eq.name,
      description: eq.description,
    }));
  }

  async getStartingEquipment(backgroundText: string): Promise<any[]> {
    const equipment = [];
    
    // Get survival gear (2-3 items)
    const survivalGear = await db
      .select()
      .from(startingEquipment)
      .where(eq(startingEquipment.category, "survival"));
    
    if (survivalGear.length > 0) {
      const survivalCount = 2 + Math.floor(Math.random() * 2);
      const shuffledSurvival = survivalGear.sort(() => 0.5 - Math.random());
      equipment.push(...shuffledSurvival.slice(0, survivalCount));
    }
    
    // Always include one personal item
    const personalItems = await db
      .select()
      .from(startingEquipment)
      .where(eq(startingEquipment.category, "personal"));
    
    if (personalItems.length > 0) {
      const randomPersonal = personalItems[Math.floor(Math.random() * personalItems.length)];
      equipment.push(randomPersonal);
    }
    
    // 60% chance of weird item
    if (Math.random() < 0.6) {
      const weirdItems = await db
        .select()
        .from(startingEquipment)
        .where(eq(startingEquipment.category, "weird"));
      
      if (weirdItems.length > 0) {
        const randomWeird = weirdItems[Math.floor(Math.random() * weirdItems.length)];
        equipment.push(randomWeird);
      }
    }
    
    // Check for contextual gear based on background
    const contextualTriggers = this.getContextualTriggers(backgroundText);
    if (contextualTriggers.length > 0 && Math.random() < 0.7) {
      const contextualGear = await db
        .select()
        .from(startingEquipment)
        .where(eq(startingEquipment.category, "contextual"));
      
      const relevantGear = contextualGear.filter(item => 
        contextualTriggers.some(trigger => 
          item.contextualTrigger?.includes(trigger)
        )
      );
      
      if (relevantGear.length > 0) {
        const randomContextual = relevantGear[Math.floor(Math.random() * relevantGear.length)];
        equipment.push(randomContextual);
      }
    }
    
    return equipment;
  }

  private getContextualTriggers(backgroundText: string): string[] {
    const triggers = [];
    const background = backgroundText.toLowerCase();
    
    if (background.includes("clinic") || background.includes("medical") || background.includes("nurse")) {
      triggers.push("medical");
    }
    if (background.includes("research") || background.includes("experiment") || background.includes("lab")) {
      triggers.push("research");
    }
    if (background.includes("security") || background.includes("criminal") || background.includes("gang")) {
      triggers.push("security");
    }
    if (background.includes("restaurant") || background.includes("food") || background.includes("chef")) {
      triggers.push("food");
    }
    if (background.includes("tech") || background.includes("hacker") || background.includes("programmer")) {
      triggers.push("tech");
    }
    if (background.includes("teacher") || background.includes("school") || background.includes("student")) {
      triggers.push("education");
    }
    
    return triggers;
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
    const cached = await redisService.getFloorTheme(floorNumber);
    if (cached) return cached;

    const [theme] = await db
      .select()
      .from(floorThemes)
      .where(eq(floorThemes.floorNumber, floorNumber));
    
    if (!theme) return null;

    const themeRoomTypes = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.floorThemeId, theme.id));

    const result = {
      name: theme.name,
      description: theme.description,
      roomTypes: themeRoomTypes.map(rt => ({
        name: rt.name,
        description: rt.description,
      })),
    };

    await redisService.setFloorTheme(floorNumber, result);
    return result;
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
