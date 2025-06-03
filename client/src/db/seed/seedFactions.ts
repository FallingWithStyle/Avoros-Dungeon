import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from '@neondatabase/serverless';
import { factions } from '../../../../shared/schema';
import { factionsData } from './factionsData';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL! });
  const db = drizzle(client);

  try {
    await client.connect();
    // Optional: clear existing data before seeding
    await db.delete(factions);

    await db.insert(factions).values(factionsData);
    console.log('Faction data seeded!');
  } catch (err) {
    console.error('Error seeding factions:', err);
  } finally {
    await client.end();
  }
}

main();