/**
 * File: init-db.ts
 * Responsibility: Database initialization and seeding with default game data
 * Notes: Creates crawler classes, equipment, factions, floors, and dungeon layout on startup
 */
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function initializeDatabase() {
  console.log("Initializing database with game data...");

  // Initialize floors only!
  await initializeFloors();

  // Initialize crawler classes
  await initializeCrawlerClasses();

  // Initialize equipment system
  const { initializeEquipmentSystem } = await import("../scripts/seed-equipment");
  await initializeEquipmentSystem();

  // Initialize seasons
  await initializeSeasons();

  console.log("Database initialized successfully!");
}

async function initializeFloors() {
  const { floors } = await import("@shared/schema");

  // Check if floors already exist
  const existingFloors = await db.select().from(floors).limit(1);
  if (existingFloors.length > 0) {
    return; // Floors already initialized
  }

  // Create floors 1-10 with unique themes
  const floorData = [];
  for (let i = 1; i <= 10; i++) {
    floorData.push({
      floorNumber: i,
      name: getFloorName(i),
      description: getFloorDescription(i),
      dangerLevel: Math.min(i, 10),
      isActive: true,
    });
  }

  // Insert all floors
  for (const floor of floorData) {
    await db.insert(floors).values(floor);
  }
}

function getFloorName(floor: number): string {
  const names = [
    "", // 0 placeholder
    "Ruined Castle Grounds",
    "Ancient Crypts",
    "Alchemical Laboratories",
    "Prison Complex",
    "Flooded Caverns",
    "Mechanical Workshop",
    "Crystal Mines",
    "Ancient Temple",
    "Dragon's Lair",
    "Cosmic Observatory",
  ];
  return names[floor] || `Deep Level ${floor}`;
}

function getFloorDescription(floor: number): string {
  if (floor <= 5)
    return "The upper levels show signs of recent civilization and decay.";
  if (floor <= 10)
    return "Deeper chambers reveal stranger and more dangerous mysteries.";
  if (floor <= 20)
    return "The architecture becomes increasingly alien and hostile.";
  if (floor <= 30)
    return "Few adventurers have reported back from these depths.";
  if (floor <= 40)
    return "The boundaries between dimensions grow thin and unstable.";
  return "The deepest reaches where few have ventured and fewer have returned.";
}

async function initializeCrawlerClasses() {
  const { crawlerClasses } = await import("@shared/schema");

  // Check if classes already exist
  const existingClasses = await db.select().from(crawlerClasses).limit(1);
  if (existingClasses.length > 0) {
    return; // Classes already initialized
  }

  const classData = [
    {
      name: "Survivor",
      description: "Hardy individuals who excel at enduring harsh conditions and finding resources.",
      baseMight: 3,
      baseAgility: 4,
      baseEndurance: 5,
      baseIntellect: 3,
      baseCharisma: 2,
      baseWisdom: 4,
      basePower: 4,
      baseMaxPower: 15,
      baseLuck: 3,
    },
    {
      name: "Scavenger",
      description: "Resourceful explorers who excel at finding useful items in dangerous places.",
      baseMight: 1,
      baseAgility: 2,
      baseEndurance: 3,
      baseIntellect: 3,
      baseCharisma: 2,
      baseWisdom: 1,
      basePower: 2,
      baseMaxPower: 10,
      baseLuck: 5,
    },
    {
      name: "Brawler",
      description: "Tough fighters who prefer direct confrontation over subtlety.",
      baseMight: 4,
      baseAgility: 3,
      baseEndurance: 1,
      baseIntellect: 1,
      baseCharisma: 1,
      baseWisdom: 2,
      basePower: 6,
      baseMaxPower: 20,
      baseLuck: 5,
    },
    {
      name: "Trickster",
      description: "Clever manipulators who use wit and charm to overcome obstacles.",
      baseMight: 1,
      baseAgility: 1,
      baseEndurance: 3,
      baseIntellect: 4,
      baseCharisma: 3,
      baseWisdom: 0,
      basePower: 3,
      baseMaxPower: 12,
      baseLuck: 5,
    },
    {
      name: "Scholar",
      description: "Educated individuals who rely on knowledge and careful planning.",
      baseMight: 0,
      baseAgility: 1,
      baseEndurance: 2,
      baseIntellect: 3,
      baseCharisma: 2,
      baseWisdom: 4,
      basePower: 2,
      baseMaxPower: 8,
      baseLuck: 5,
    },
    {
      name: "Mystic",
      description: "Enigmatic figures with an uncanny understanding of supernatural forces.",
      baseMight: 1,
      baseAgility: 2,
      baseEndurance: 2,
      baseIntellect: 4,
      baseCharisma: 3,
      baseWisdom: 0,
      basePower: 3,
      baseMaxPower: 12,
      baseLuck: 5,
    },
    {
      name: "Warrior",
      description: "Hardy fighters with high combat prowess",
      baseMight: 8,
      baseAgility: 4,
      baseEndurance: 6,
      baseIntellect: 3,
      baseCharisma: 4,
      baseWisdom: 3,
      basePower: 7,
      baseMaxPower: 25,
      baseLuck: 5,
    },
    {
      name: "Scout",
      description: "Quick and agile explorers",
      baseMight: 5,
      baseAgility: 8,
      baseEndurance: 6,
      baseIntellect: 6,
      baseCharisma: 5,
      baseWisdom: 7,
      basePower: 5,
      baseMaxPower: 18,
      baseLuck: 6,
    },
    {
      name: "Engineer",
      description: "Tech-savvy problem solvers",
      baseMight: 4,
      baseAgility: 5,
      baseEndurance: 5,
      baseIntellect: 8,
      baseCharisma: 4,
      baseWisdom: 6,
      basePower: 4,
      baseMaxPower: 15,
      baseLuck: 5,
    },
  ];

  for (const crawlerClass of classData) {
    await db.insert(crawlerClasses).values(crawlerClass);
  }
}



async function initializeSeasons() {
  const { seasons } = await import("@shared/schema");

  // Check if seasons already exist
  const existingSeasons = await db.select().from(seasons).limit(1);
  if (existingSeasons.length > 0) {
    return; // Seasons already initialized
  }

  // Create initial season
  await db.insert(seasons).values({
    name: "Season 1: The Awakening",
    description: "The first season of corporate crawler expeditions",
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    isActive: true,
  });
}

async function initializeDynamicContent() {
  const { floorThemes } = await import("@shared/schema");

  // Check if content already exists
  const existingContent = await db.select().from(floorThemes).limit(1);
  if (existingContent.length > 0) {
    return; // Content already initialized
  }

  // Run the content seeding script
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'seed:content'], { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error(`Content seeding failed with code ${code}`));
      }
    });
  });
}