
import { db } from "../db";
import { corporationPrefixes, corporationSuffixes } from "@shared/schema";
import { BaseStorage } from "./base-storage";

export class CorporationStorage extends BaseStorage {
  async generateCorporationName(): Promise<string> {
    const prefix = await this.getRandomCorporationPrefix();
    const suffix = await this.getRandomCorporationSuffix();
    return `${prefix} ${suffix}`;
  }

  private async getRandomCorporationPrefix(): Promise<string> {
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

  private async getRandomCorporationSuffix(): Promise<string> {
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
}
