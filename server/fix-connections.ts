import { db } from "./db";
import { roomConnections } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function fixDuplicateConnections() {
  console.log("Fixing duplicate room connections...");
  
  // Remove duplicate connections using SQL
  await db.execute(sql`
    DELETE FROM room_connections 
    WHERE id NOT IN (
      SELECT MIN(id) 
      FROM room_connections 
      GROUP BY from_room_id, to_room_id, direction
    )
  `);
  
  console.log("Duplicate connections removed!");
}