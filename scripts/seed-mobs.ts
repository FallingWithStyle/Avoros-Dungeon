/**
 * File: seed-mobs.ts
 * Responsibility: Seeds database with basic mob type data for dungeon encounters
 * Notes: Populates mob types table with creature stats and descriptions for combat system
 */
import { db } from "../server/db";
import { mobTypes } from "../shared/schema";

const mobData = [
  {
    name: "Goblin",
    description: "A small, mischievous creature.",
    hit_points: 10,
    attack: 5,
    defense: 2,
    speed: 7,
  },
  {
    name: "Wolf",
    description: "A wild predator.",
    hit_points: 15,
    attack: 8,
    defense: 3,
    speed: 9,
  },
  {
    name: "Bear",
    description: "A large, powerful beast.",
    hit_points: 30,
    attack: 12,
    defense: 7,
    speed: 4,
  },
];

async function seedMobTypes() {
  try {
    console.log("Seeding mob type data...");

    // Clear existing mob types
    await db.delete(mobTypes);

    // Insert new mob type data
    for (const mob of mobData) {
      await db.insert(mobTypes).values(mob);
    }

    console.log(`Successfully seeded ${mobData.length} mob types`);
  } catch (error) {
    console.error("Error seeding mob types:", error);
    throw error;
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMobTypes()
    .then(() => {
      console.log("Mob type seeding complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Mob type seeding failed:", error);
      process.exit(1);
    });
}

export { seedMobTypes };