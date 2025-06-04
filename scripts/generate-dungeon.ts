
import { generateFullDungeon } from "../client/src/dungeon/generation/dungeon-generator.ts";
import { db } from "../server/db.ts";
import { factions as factionsTable } from "../shared/schema.ts";

// Define the Faction type directly to avoid import issues
interface Faction {
  id: number;
  name: string;
  description: string;
  mobTypes: string[];
  influence: number;
  color: string | null;
  icon: string | null;
}

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
    console.log("Starting dungeon generation...");
    
    // Test database connection first
    console.log("Testing database connection...");
    const testQuery = await db.select().from(factionsTable).limit(1);
    console.log("Database connection successful, found", testQuery.length, "factions");
    
    const factions = await getAllFactions();
    console.log("Retrieved", factions.length, "factions from database");
    
    await generateFullDungeon(factions);
    console.log("All 10 dungeon floors generated!");
    process.exit(0);
  } catch (err) {
    console.error("Dungeon generation failed:");
    console.error("Error name:", err?.constructor?.name);
    console.error("Error message:", err?.message);
    console.error("Full error:", err);
    process.exit(1);
  }
}

run();
