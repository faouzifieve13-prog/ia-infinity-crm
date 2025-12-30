import { db } from "./server/db";
import { invitations } from "./shared/schema";

async function checkInvitations() {
  const allInvitations = await db.select().from(invitations);

  console.log(`\n📧 Total: ${allInvitations.length} invitation(s)\n`);

  for (const inv of allInvitations) {
    console.log(`Email: ${inv.email}`);
    console.log(`  - Statut: ${inv.status}`);
    console.log(`  - Rôle: ${inv.role}`);
    console.log(`  - Expire le: ${inv.expiresAt}`);
    console.log(`  - Créé le: ${inv.createdAt}`);

    if (inv.status === 'pending' && inv.token) {
      const now = new Date();
      const expired = inv.expiresAt && new Date(inv.expiresAt) < now;

      if (expired) {
        console.log(`  - ⚠️  EXPIRÉ`);
      } else {
        console.log(`  - ✅ VALIDE`);
        console.log(`  - 🔗 Lien d'activation: http://localhost:5000/setup-password?token=${inv.token}`);
      }
    } else if (inv.status === 'accepted') {
      console.log(`  - ✅ Acceptée`);
    }
    console.log('');
  }
}

checkInvitations();
