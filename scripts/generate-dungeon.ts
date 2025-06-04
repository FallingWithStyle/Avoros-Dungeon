import { generateFullDungeon } from "../client/src/dungeon/generation/dungeon-generator.ts";
import { db } from "../server/db";
import { factions as factionsTable } from "../shared/schema";
import type { Faction } from "../client/src/dungeon/generation/faction-assignment"; // Import Faction type to avoid typescript errors

// Utility: Fetch all factions from the DB with correct typing
async function getAllFactions(): Promise<Faction[]> {
  const dbFactions = await db.select().from(factionsTable);
  // Map and cast to ensure description is always a string
  return dbFactions.map((f) => ({
    ...f,
    description: f.description ?? "",
  })) as Faction[];
}

async function run() {
  try {
    const factions = await getAllFactions();
    await generateFullDungeon(factions); // No type error!
    console.log("All 10 dungeon floors generated!");
    process.exit(0);
  } catch (err) {
    console.error("Dungeon generation failed:", err);
    process.exit(1);
  }
}

run();
