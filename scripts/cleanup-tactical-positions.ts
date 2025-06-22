
/**
 * File: cleanup-tactical-positions.ts
 * Responsibility: Command-line script to clean up redundant tactical positions data
 * Notes: Removes mob entries from tactical_positions and reclaims disk space
 */

import { db } from "../server/db";
import { tacticalPositions } from "@shared/schema";
import { sql } from "drizzle-orm";
import { storage } from "../server/storage";

async function cleanupTacticalPositions() {
  try {
    console.log("🧹 Starting tactical positions cleanup...\n");

    // Get count before cleanup
    const countBefore = await db.execute(sql`SELECT COUNT(*) as count FROM tactical_positions`);
    const beforeCount = countBefore.rows?.[0]?.count || countBefore[0]?.count || 0;
    console.log("📊 Records before cleanup:", beforeCount);

    // 1. Remove ALL mob positions (mobs should only be in mobs table)
    console.log("🧹 Removing all mob entries from tactical_positions...");
    const deletedMobsCount = await storage.tacticalStorage.removeAllMobsFromTacticalPositions();
    console.log("✅ Removed " + deletedMobsCount + " mob entries");

    // 2. Remove tactical positions for rooms that don't exist
    console.log("🧹 Removing positions for non-existent rooms...");
    await db.execute(sql`
      DELETE FROM tactical_positions 
      WHERE room_id NOT IN (SELECT id FROM rooms)
    `);
    console.log("✅ Removed orphaned room positions");

    // 3. Remove ALL inactive positions
    console.log("🧹 Removing all inactive positions...");
    await db.execute(sql`
      DELETE FROM tactical_positions 
      WHERE is_active = false
    `);
    console.log("✅ Removed all inactive positions");

    // 4. Remove duplicate active positions (keep only most recent)
    console.log("🧹 Removing duplicate positions...");
    await db.execute(sql`
      DELETE FROM tactical_positions 
      WHERE id NOT IN (
        SELECT DISTINCT ON (room_id, entity_type, position_x, position_y) id
        FROM tactical_positions 
        WHERE is_active = true
        ORDER BY room_id, entity_type, position_x, position_y, created_at DESC
      )
    `);
    console.log("✅ Removed duplicate positions");

    // 5. VACUUM the table to reclaim space
    console.log("🧹 Vacuuming tactical_positions table to reclaim space...");
    await db.execute(sql`VACUUM FULL tactical_positions`);
    console.log("✅ Table vacuumed - space reclaimed");

    // Get count after cleanup
    const countAfter = await db.execute(sql`SELECT COUNT(*) as count FROM tactical_positions`);
    const afterCount = countAfter.rows?.[0]?.count || countAfter[0]?.count || 0;
    const deletedCount = beforeCount - afterCount;

    console.log("\n📊 Cleanup Summary:");
    console.log("Records before:", beforeCount);
    console.log("Records after:", afterCount);
    console.log("Records deleted:", deletedCount);
    console.log("Space saved (estimated):", Math.round((deletedCount / beforeCount) * 619) + " MB");
    console.log("\n✅ Tactical positions cleanup completed successfully!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTacticalPositions();
