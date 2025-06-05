import { db } from "./db";
import { eq } from "drizzle-orm";

export async function initializeDatabase() {
  console.log("Initializing database with game data...");

  // Initialize floors only!
  await initializeFloors();

  // Initialize crawler classes
  await initializeCrawlerClasses();

  // Initialize equipment types
  await initializeEquipmentTypes();

  // Initialize equipment
  await initializeEquipment();

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

  const classes = [
    {
      name: "Survivor",
      description:
        "Hardy individuals who've learned to adapt and endure against all odds.",
      startingStats: JSON.stringify({
        attack: 2,
        defense: 3,
        speed: 2,
        wit: 2,
        charisma: 1,
        memory: 2,
      }),
      competencies: JSON.stringify(["Survival", "Scavenging"]),
      rarity: "common",
    },
    {
      name: "Scavenger",
      description:
        "Resourceful explorers who excel at finding useful items in dangerous places.",
      startingStats: JSON.stringify({
        attack: 1,
        defense: 2,
        speed: 3,
        wit: 3,
        charisma: 2,
        memory: 1,
      }),
      competencies: JSON.stringify(["Scavenging", "Trap Detection"]),
      rarity: "common",
    },
    {
      name: "Brawler",
      description:
        "Tough fighters who prefer direct confrontation over subtlety.",
      startingStats: JSON.stringify({
        attack: 4,
        defense: 3,
        speed: 1,
        wit: 1,
        charisma: 1,
        memory: 2,
      }),
      competencies: JSON.stringify(["Combat", "Intimidation"]),
      rarity: "common",
    },
    {
      name: "Trickster",
      description:
        "Clever manipulators who use wit and charm to overcome obstacles.",
      startingStats: JSON.stringify({
        attack: 1,
        defense: 1,
        speed: 3,
        wit: 4,
        charisma: 3,
        memory: 0,
      }),
      competencies: JSON.stringify(["Deception", "Trap Detection"]),
      rarity: "uncommon",
    },
    {
      name: "Scholar",
      description:
        "Educated individuals who rely on knowledge and careful planning.",
      startingStats: JSON.stringify({
        attack: 0,
        defense: 1,
        speed: 2,
        wit: 3,
        charisma: 2,
        memory: 4,
      }),
      competencies: JSON.stringify(["Research", "Ancient Lore"]),
      rarity: "uncommon",
    },
    {
      name: "Mystic",
      description:
        "Enigmatic figures with an uncanny understanding of supernatural forces.",
      startingStats: JSON.stringify({
        attack: 1,
        defense: 2,
        speed: 2,
        wit: 4,
        charisma: 3,
        memory: 0,
      }),
      competencies: JSON.stringify(["Supernatural", "Intuition"]),
      rarity: "rare",
    },
  ];

  for (const crawlerClass of classes) {
    await db.insert(crawlerClasses).values(crawlerClass);
  }
}

async function initializeEquipmentTypes() {
  const { equipmentTypes } = await import("@shared/schema");

  // Check if equipment types already exist
  const existingTypes = await db.select().from(equipmentTypes).limit(1);
  if (existingTypes.length > 0) {
    return; // Equipment types already initialized
  }

  const types = [
    { name: "Weapon", description: "Items used for combat and defense" },
    { name: "Armor", description: "Protective gear and clothing" },
    { name: "Tool", description: "Utility items and equipment" },
    { name: "Consumable", description: "Single-use items and supplies" },
    {
      name: "Accessory",
      description: "Jewelry, trinkets, and enhancement items",
    },
  ];

  for (const type of types) {
    await db.insert(equipmentTypes).values(type);
  }
}

async function initializeEquipment() {
  const { equipment, equipmentTypes } = await import("@shared/schema");

  // Check if equipment already exists
  const existingEquipment = await db.select().from(equipment).limit(1);
  if (existingEquipment.length > 0) {
    return; // Equipment already initialized
  }

  // Get equipment type IDs
  const types = await db.select().from(equipmentTypes);
  const weaponType = types.find((t) => t.name === "Weapon");
  const armorType = types.find((t) => t.name === "Armor");
  const toolType = types.find((t) => t.name === "Tool");
  const consumableType = types.find((t) => t.name === "Consumable");
  const accessoryType = types.find((t) => t.name === "Accessory");

  const equipmentItems = [
    // Weapons
    {
      name: "Rusty Knife",
      description: "A dull blade that's seen better days.",
      typeId: weaponType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({ attack: 1 }),
      marketValue: 5,
    },
    {
      name: "Makeshift Club",
      description: "A heavy piece of wood wrapped with cloth.",
      typeId: weaponType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({ attack: 2 }),
      marketValue: 8,
    },
    {
      name: "Crowbar",
      description: "Useful for both breaking things and breaking into things.",
      typeId: weaponType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({ attack: 1 }),
      marketValue: 12,
    },

    // Armor
    {
      name: "Worn Jacket",
      description: "A sturdy jacket with multiple pockets.",
      typeId: armorType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({ defense: 1 }),
      marketValue: 10,
    },
    {
      name: "Work Boots",
      description: "Heavy boots that protect your feet.",
      typeId: armorType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({ defense: 1 }),
      marketValue: 15,
    },
    {
      name: "Hard Hat",
      description: "Industrial safety equipment.",
      typeId: armorType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({ defense: 1 }),
      marketValue: 8,
    },

    // Tools
    {
      name: "Flashlight",
      description: "Provides light in dark places.",
      typeId: toolType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({}),
      marketValue: 6,
    },
    {
      name: "Rope",
      description: "50 feet of sturdy climbing rope.",
      typeId: toolType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({}),
      marketValue: 10,
    },
    {
      name: "First Aid Kit",
      description: "Basic medical supplies.",
      typeId: toolType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({}),
      marketValue: 20,
    },

    // Consumables
    {
      name: "Energy Bar",
      description: "Restores a small amount of energy.",
      typeId: consumableType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({}),
      marketValue: 3,
    },
    {
      name: "Water Bottle",
      description: "Clean drinking water.",
      typeId: consumableType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({}),
      marketValue: 2,
    },
    {
      name: "Painkiller",
      description: "Reduces pain and improves focus.",
      typeId: consumableType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({}),
      marketValue: 5,
    },

    // Accessories
    {
      name: "Lucky Coin",
      description: "A shiny coin that might bring good fortune.",
      typeId: accessoryType?.id,
      rarity: "uncommon",
      statModifiers: JSON.stringify({ luck: 1 }),
      marketValue: 25,
    },
    {
      name: "Digital Watch",
      description: "Keeps accurate time and has basic functions.",
      typeId: accessoryType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({}),
      marketValue: 15,
    },
    {
      name: "Compass",
      description: "Always points toward magnetic north.",
      typeId: accessoryType?.id,
      rarity: "common",
      statModifiers: JSON.stringify({}),
      marketValue: 12,
    },
  ];

  for (const item of equipmentItems) {
    if (item.typeId) {
      await db.insert(equipment).values(item);
    }
  }
}

async function initializeSeasons() {
  const { seasons } = await import("@shared/schema");

  // Check if seasons already exist
  const existingSeason = await db.select().from(seasons).limit(1);
  if (existingSeason.length > 0) {
    return; // Season already initialized
  }

  // Create Season 1
  await db.insert(seasons).values({
    seasonNumber: 1,
    name: "The Descent Begins",
    description:
      "The first brave souls venture into the mysterious depths beneath the old castle.",
    startDate: new Date(),
    endDate: null, // Ongoing
    isActive: true,
    maxPrimarySponsorsips: 1000,
  });
}