/**
 * File: db.ts
 * Responsibility: Database connection and configuration using Drizzle ORM
 * Notes: Connects to PostgreSQL via Neon with connection pooling to prevent connection overload
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

// Create connection pool with limited connections
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Limit concurrent connections
  idleTimeoutMillis: 10000, // Close idle connections after 10 seconds
  connectionTimeoutMillis: 5000 // Timeout connection attempts after 5 seconds
});

export const db = drizzle({ client: pool, schema,
  logger: process.env.NODE_ENV === 'development'
});