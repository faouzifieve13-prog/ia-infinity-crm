import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanupOrphanedData() {
  console.log("Starting cleanup of orphaned data...");

  try {
    // Clean up orphaned memberships
    const result1 = await pool.query(`
      DELETE FROM memberships
      WHERE account_id IS NOT NULL
        AND account_id NOT IN (SELECT id FROM accounts)
    `);
    console.log(`Deleted ${result1.rowCount} orphaned memberships`);

    // Clean up orphaned invitations
    const result2 = await pool.query(`
      DELETE FROM invitations
      WHERE account_id IS NOT NULL
        AND account_id NOT IN (SELECT id FROM accounts)
    `);
    console.log(`Deleted ${result2.rowCount} orphaned invitations`);

    // Clean up orphaned channels
    const result3 = await pool.query(`
      DELETE FROM channels
      WHERE account_id IS NOT NULL
        AND account_id NOT IN (SELECT id FROM accounts)
    `);
    console.log(`Deleted ${result3.rowCount} orphaned channels`);

    console.log("Cleanup completed successfully!");
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

cleanupOrphanedData();
