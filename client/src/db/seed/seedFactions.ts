import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import { factions } from '../../../../shared/schema';
/**
 * File: seedFactions.ts
 * Responsibility: Database seeding utility for populating faction data
 * Notes: Inserts faction information into the database from factionsData definitions
 */

import { factionsData } from './factionsData';

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    // Optional: clear existing data before seeding
    await db.delete(factions);

    await db.insert(factions).values(factionsData);
    console.log('Faction data seeded successfully!');
  } catch (err) {
    console.error('Error seeding factions:', err);
  } finally {
    await pool.end();
  }
}

main();