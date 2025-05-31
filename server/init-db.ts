import { db } from "./db";
import { crawlerClasses, equipment, equipmentTypes, floors, enemies } from "@shared/schema";

export async function initializeDatabase() {
  try {
    console.log("Initializing database with game data...");

    // Insert crawler classes
    await db.insert(crawlerClasses).values([
      {
        name: "Combat Veteran",
        description: "Former military personnel with extensive combat training. High attack and defense capabilities.",
        baseHealth: 120,
        baseAttack: 25,
        baseDefense: 20,
        baseSpeed: 15,
        baseWit: 10,
        baseCharisma: 8,
        baseMemory: 12,
        baseLuck: 5,
      },
      {
        name: "Scholar",
        description: "Expert in problem-solving and information processing. High mental stats.",
        baseHealth: 80,
        baseAttack: 15,
        baseDefense: 12,
        baseSpeed: 22,
        baseWit: 30,
        baseCharisma: 15,
        baseMemory: 25,
        baseLuck: 5,
      },
      {
        name: "Social Engineer",
        description: "Masters of persuasion and manipulation. High charisma and social skills.",
        baseHealth: 100,
        baseAttack: 18,
        baseDefense: 15,
        baseSpeed: 28,
        baseWit: 18,
        baseCharisma: 30,
        baseMemory: 20,
        baseLuck: 5,
      },
    ]).onConflictDoNothing();

    // Insert equipment types
    await db.insert(equipmentTypes).values([
      { name: "Assault Rifle", slot: "weapon" },
      { name: "Plasma Cannon", slot: "weapon" },
      { name: "Combat Armor", slot: "armor" },
      { name: "Tech Augmentation", slot: "accessory" },
    ]).onConflictDoNothing();

    // Insert basic equipment
    await db.insert(equipment).values([
      {
        typeId: 1,
        name: "Makeshift Shiv",
        description: "Crude improvised weapon",
        attackBonus: 5,
        price: 50,
        rarity: "common",
        minFloor: 1,
      },
      {
        typeId: 2,
        name: "Neural Enhancer",
        description: "Basic cognitive augmentation device",
        attackBonus: 2,
        witBonus: 8,
        price: 800,
        rarity: "uncommon",
        minFloor: 3,
      },
      {
        typeId: 3,
        name: "Patched Vest",
        description: "Worn protective clothing",
        defenseBonus: 5,
        healthBonus: 15,
        price: 200,
        rarity: "common",
        minFloor: 1,
      },
      {
        typeId: 4,
        name: "Charm Bracelet",
        description: "Enhances personal magnetism",
        charismaBonus: 6,
        speedBonus: 2,
        price: 600,
        rarity: "rare",
        minFloor: 2,
      },
    ]).onConflictDoNothing();

    // Insert floors
    const floorData = [];
    for (let i = 1; i <= 50; i++) {
      floorData.push({
        floorNumber: i,
        name: `Level ${i} - ${getFloorName(i)}`,
        description: getFloorDescription(i),
        difficulty: Math.floor(i / 5) + 1,
        minRecommendedLevel: i,
      });
    }
    await db.insert(floors).values(floorData).onConflictDoNothing();

    // Insert enemies
    await db.insert(enemies).values([
      {
        name: "Security Drone",
        description: "Automated defense system",
        health: 50,
        attack: 12,
        defense: 8,
        speed: 18,
        creditsReward: 100,
        experienceReward: 25,
        minFloor: 1,
        maxFloor: 10,
      },
      {
        name: "Mutant Scavenger",
        description: "Twisted creature lurking in the depths",
        health: 80,
        attack: 18,
        defense: 10,
        speed: 15,
        creditsReward: 150,
        experienceReward: 40,
        minFloor: 3,
        maxFloor: 15,
      },
      {
        name: "Corrupted AI Core",
        description: "Malevolent artificial intelligence",
        health: 120,
        attack: 25,
        defense: 15,
        speed: 20,
        creditsReward: 300,
        experienceReward: 75,
        minFloor: 8,
        maxFloor: 25,
      },
      {
        name: "Void Stalker",
        description: "Interdimensional predator",
        health: 200,
        attack: 35,
        defense: 25,
        speed: 30,
        creditsReward: 500,
        experienceReward: 120,
        minFloor: 15,
        maxFloor: 35,
      },
      {
        name: "Dungeon Guardian",
        description: "Ancient protector of the deepest levels",
        health: 400,
        attack: 50,
        defense: 40,
        speed: 25,
        creditsReward: 1000,
        experienceReward: 250,
        minFloor: 25,
        maxFloor: 50,
      },
    ]).onConflictDoNothing();

    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

function getFloorName(floor: number): string {
  if (floor <= 10) return "Upper Chambers";
  if (floor <= 20) return "Industrial Complex";
  if (floor <= 30) return "Corrupted Sectors";
  if (floor <= 40) return "Void Territories";
  return "The Abyss";
}

function getFloorDescription(floor: number): string {
  if (floor <= 10) return "The initial levels of the dungeon, still showing signs of civilization.";
  if (floor <= 20) return "Abandoned industrial facilities with malfunctioning machinery.";
  if (floor <= 30) return "Reality begins to warp as dark energy permeates the environment.";
  if (floor <= 40) return "The boundaries between dimensions grow thin and unstable.";
  return "The deepest reaches where few have ventured and fewer have returned.";
}