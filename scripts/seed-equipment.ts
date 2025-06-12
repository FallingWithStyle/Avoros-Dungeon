
/**
 * File: seed-equipment.ts
 * Responsibility: Database seeding for equipment items and equipment types
 * Notes: Separated from init-db.ts for better organization as equipment data grows
 */

import { db } from "../server/db";
import { eq } from "drizzle-orm";

export async function seedEquipmentTypes() {
  const { equipmentTypes } = await import("../shared/schema");

  // Check if equipment types already exist
  const existingTypes = await db.select().from(equipmentTypes).limit(1);
  if (existingTypes.length > 0) {
    console.log("Equipment types already exist, skipping...");
    return;
  }

  console.log("Seeding equipment types...");

  const types = [
    { name: "Weapon", category: "weapon", description: "Items used for combat and defense" },
    { name: "Armor", category: "armor", description: "Protective gear and clothing" },
    { name: "Tool", category: "tool", description: "Utility items and equipment" },
    { name: "Consumable", category: "consumable", description: "Single-use items and supplies" },
    {
      name: "Accessory",
      category: "accessory",
      description: "Jewelry, trinkets, and enhancement items",
    },
    { name: "Shield", category: "shield", description: "Protective shields used for blocking attacks" },
  ];

  for (const type of types) {
    await db.insert(equipmentTypes).values(type);
  }

  console.log("Equipment types seeded successfully!");
}

export async function seedEquipment() {
  const { equipment, equipmentTypes } = await import("../shared/schema");

  // Check if equipment already exists
  const existingEquipment = await db.select().from(equipment).limit(1);
  if (existingEquipment.length > 0) {
    console.log("Equipment already exists, skipping...");
    return;
  }

  console.log("Seeding equipment items...");

  // Get equipment type IDs
  const types = await db.select().from(equipmentTypes);
  const weaponType = types.find((t) => t.name === "Weapon");
  const armorType = types.find((t) => t.name === "Armor");
  const toolType = types.find((t) => t.name === "Tool");
  const consumableType = types.find((t) => t.name === "Consumable");
  const accessoryType = types.find((t) => t.name === "Accessory");
  const shieldType = types.find((t) => t.name === "Shield");

  const equipmentItems = [
    // Weapons
    {
      name: "Rusty Knife",
      description: "A dull blade that's seen better days.",
      typeId: weaponType?.id,
      weaponType: "melee",
      damageAttribute: "might",
      baseRange: 1,
      rarity: "common",
      price: 5,
    },
    {
      name: "Makeshift Club",
      description: "A heavy piece of wood wrapped with cloth.",
      typeId: weaponType?.id,
      weaponType: "melee",
      damageAttribute: "might",
      baseRange: 1,
      rarity: "common",
      price: 8,
    },
    {
      name: "Crowbar",
      description: "Useful for both breaking things and breaking into things.",
      typeId: weaponType?.id,
      weaponType: "melee",
      damageAttribute: "might",
      baseRange: 1,
      rarity: "common",
      price: 12,
    },

    // Armor - Scavenger Set
    {
      name: "Scavenger Hood",
      description: "Makeshift head protection from scrapped materials.",
      typeId: armorType?.id,
      defenseValue: 2,
      armorSlot: "head",
      armorSet: "Scavenger",
      rarity: "common",
      price: 15,
    },
    {
      name: "Scavenger Vest",
      description: "Patched leather vest with metal plates.",
      typeId: armorType?.id,
      defenseValue: 4,
      armorSlot: "torso",
      armorSet: "Scavenger",
      rarity: "common",
      price: 25,
    },
    {
      name: "Scavenger Pants",
      description: "Reinforced work pants with knee guards.",
      typeId: armorType?.id,
      defenseValue: 3,
      armorSlot: "legs",
      armorSet: "Scavenger",
      rarity: "common",
      price: 20,
    },
    {
      name: "Steel-Toed Boots",
      description: "Heavy work boots with steel reinforcement.",
      typeId: armorType?.id,
      defenseValue: 2,
      armorSlot: "feet",
      armorSet: "Scavenger",
      rarity: "common",
      price: 18,
    },

    // Armor - Security Set
    {
      name: "Security Helmet",
      description: "Tactical helmet with face protection.",
      typeId: armorType?.id,
      defenseValue: 4,
      armorSlot: "head",
      armorSet: "Security",
      rarity: "uncommon",
      price: 45,
      minFloor: 2,
    },
    {
      name: "Kevlar Vest",
      description: "Ballistic protection vest used by security forces.",
      typeId: armorType?.id,
      defenseValue: 6,
      armorSlot: "torso",
      armorSet: "Security",
      rarity: "uncommon",
      price: 80,
      minFloor: 2,
    },

    // Shields
    {
      name: "Makeshift Shield",
      description: "Scrap metal welded into a crude but effective shield.",
      typeId: shieldType?.id,
      defenseValue: 3,
      blockChance: 25,
      rarity: "common",
      price: 30,
    },
    {
      name: "Riot Shield",
      description: "Transparent polycarbonate shield used by security forces.",
      typeId: shieldType?.id,
      defenseValue: 5,
      blockChance: 35,
      specialAbility: "Bash: Can be used to stun enemies",
      rarity: "uncommon",
      price: 75,
      minFloor: 2,
    },
    {
      name: "Energy Shield",
      description: "High-tech personal defense system with energy barriers.",
      typeId: shieldType?.id,
      defenseValue: 8,
      blockChance: 45,
      specialAbility: "Energy Absorption: Blocked energy attacks restore power",
      rarity: "rare",
      price: 250,
      minFloor: 4,
      powerBonus: 5,
    },

    // Tools
    {
      name: "Flashlight",
      description: "Provides light in dark places.",
      typeId: toolType?.id,
      rarity: "common",
      price: 6,
    },
    {
      name: "Rope",
      description: "50 feet of sturdy climbing rope.",
      typeId: toolType?.id,
      rarity: "common",
      price: 10,
    },
    {
      name: "First Aid Kit",
      description: "Basic medical supplies.",
      typeId: toolType?.id,
      rarity: "common",
      price: 20,
    },

    // Consumables
    {
      name: "Energy Bar",
      description: "Restores a small amount of energy.",
      typeId: consumableType?.id,
      rarity: "common",
      price: 3,
    },
    {
      name: "Water Bottle",
      description: "Clean drinking water.",
      typeId: consumableType?.id,
      rarity: "common",
      price: 2,
    },
    {
      name: "Painkiller",
      description: "Reduces pain and improves focus.",
      typeId: consumableType?.id,
      rarity: "common",
      price: 5,
    },

    // Accessories
    {
      name: "Lucky Coin",
      description: "A shiny coin that might bring good fortune.",
      typeId: accessoryType?.id,
      rarity: "uncommon",
      luckBonus: 1,
      price: 25,
    },
    {
      name: "Digital Watch",
      description: "Keeps accurate time and has basic functions.",
      typeId: accessoryType?.id,
      rarity: "common",
      price: 15,
    },
    {
      name: "Compass",
      description: "Always points toward magnetic north.",
      typeId: accessoryType?.id,
      rarity: "common",
      price: 12,
    },
  ];

  for (const item of equipmentItems) {
    if (item.typeId) {
      await db.insert(equipment).values(item);
    }
  }

  console.log("Equipment items seeded successfully!");
}

// Main seeding function that runs both
export async function initializeEquipmentSystem() {
  await seedEquipmentTypes();
  await seedEquipment();
}

// If run directly
if (require.main === module) {
  initializeEquipmentSystem()
    .then(() => {
      console.log("Equipment system initialization complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error initializing equipment system:", error);
      process.exit(1);
    });
}
