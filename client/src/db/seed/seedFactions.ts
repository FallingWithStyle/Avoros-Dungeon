import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { factions } from '../../../../shared/schema';
import { factionsData } from './factionsData';

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