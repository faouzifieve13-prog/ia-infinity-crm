import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testAccountDeletion() {
  console.log("Testing account deletion...\n");

  try {
    // Find the "hitcall formation" account
    const accountQuery = await pool.query(`
      SELECT id, name, org_id FROM accounts WHERE LOWER(name) LIKE '%hitcall%formation%'
    `);

    if (accountQuery.rows.length === 0) {
      console.log("No account found matching 'hitcall formation'");
      return;
    }

    const account = accountQuery.rows[0];
    console.log(`Found account: ${account.name} (ID: ${account.id})`);
    console.log(`Organization ID: ${account.org_id}\n`);

    // Count related entities before deletion
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM projects WHERE account_id = $1) as projects,
        (SELECT COUNT(*) FROM contacts WHERE account_id = $1) as contacts,
        (SELECT COUNT(*) FROM deals WHERE account_id = $1) as deals,
        (SELECT COUNT(*) FROM memberships WHERE account_id = $1) as memberships,
        (SELECT COUNT(*) FROM invitations WHERE account_id = $1) as invitations,
        (SELECT COUNT(*) FROM channels WHERE account_id = $1) as channels
    `, [account.id]);

    console.log("Related entities before deletion:");
    console.log(`  - Projects: ${counts.rows[0].projects}`);
    console.log(`  - Contacts: ${counts.rows[0].contacts}`);
    console.log(`  - Deals: ${counts.rows[0].deals}`);
    console.log(`  - Memberships: ${counts.rows[0].memberships}`);
    console.log(`  - Invitations: ${counts.rows[0].invitations}`);
    console.log(`  - Channels: ${counts.rows[0].channels}\n`);

    // Delete the account
    console.log("Deleting account...");
    const deleteResult = await pool.query(`
      DELETE FROM accounts WHERE id = $1 AND org_id = $2
    `, [account.id, account.org_id]);

    console.log(`\n✓ Account deleted successfully! (${deleteResult.rowCount} row affected)`);
    console.log("All related entities should have been deleted automatically via CASCADE constraints.");

  } catch (error) {
    console.error("\n✗ Error during deletion:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

testAccountDeletion();
