import { db } from "./server/db";
import { users, memberships, invitations } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkUser(email: string) {
  console.log(`\n🔍 Vérification du compte: ${email}\n`);

  // Rechercher l'utilisateur
  const user = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

  if (user.length === 0) {
    console.log("❌ PROBLÈME: Aucun compte trouvé avec cet email");
    console.log("\n📋 Solutions possibles:");
    console.log("1. Vérifiez l'orthographe de votre email");
    console.log("2. Demandez à un administrateur de vous inviter");

    // Vérifier s'il y a une invitation en attente
    const invitation = await db.select().from(invitations).where(eq(invitations.email, email.toLowerCase()));
    if (invitation.length > 0) {
      const inv = invitation[0];
      console.log(`\n✉️  INVITATION TROUVÉE:`);
      console.log(`   - Statut: ${inv.status}`);
      console.log(`   - Rôle: ${inv.role}`);
      console.log(`   - Expire le: ${inv.expiresAt}`);
      if (inv.status === 'pending') {
        console.log(`   - Token: ${inv.token?.substring(0, 20)}...`);
        console.log(`\n👉 Vous devez accepter votre invitation pour activer votre compte!`);
        console.log(`   URL: http://localhost:5000/setup-password?token=${inv.token}`);
      }
    }
    return;
  }

  const u = user[0];
  console.log("✅ Compte trouvé!");
  console.log(`   - ID: ${u.id}`);
  console.log(`   - Nom: ${u.name}`);
  console.log(`   - Email: ${u.email}`);
  console.log(`   - Actif: ${u.isActive ? 'Oui' : 'Non (DÉSACTIVÉ)'}`);
  console.log(`   - Mot de passe défini: ${u.password ? 'Oui ✅' : 'Non ❌ (INVITATION NON ACCEPTÉE)'}`);

  if (!u.password) {
    console.log("\n❌ PROBLÈME: Votre compte existe mais vous n'avez pas encore défini de mot de passe!");
    console.log("👉 Vous devez accepter votre invitation pour définir un mot de passe.");

    // Chercher l'invitation
    const invitation = await db.select().from(invitations).where(eq(invitations.email, email.toLowerCase()));
    if (invitation.length > 0) {
      const inv = invitation[0];
      console.log(`\n✉️  Invitation trouvée:`);
      console.log(`   - Statut: ${inv.status}`);
      if (inv.status === 'pending' && inv.token) {
        console.log(`\n👉 Utilisez ce lien pour définir votre mot de passe:`);
        console.log(`   http://localhost:5000/setup-password?token=${inv.token}`);
      } else if (inv.status === 'accepted') {
        console.log(`   ⚠️  L'invitation a été marquée comme acceptée mais le mot de passe n'a pas été enregistré.`);
      }
    }
    return;
  }

  if (!u.isActive) {
    console.log("\n❌ PROBLÈME: Votre compte est DÉSACTIVÉ!");
    console.log("👉 Contactez un administrateur pour réactiver votre compte.");
    return;
  }

  // Vérifier les memberships
  const userMemberships = await db.select().from(memberships).where(eq(memberships.userId, u.id));
  console.log(`\n👥 Memberships: ${userMemberships.length}`);
  userMemberships.forEach((m, i) => {
    console.log(`   ${i + 1}. Rôle: ${m.role}, Espace: ${m.space}`);
  });

  console.log("\n✅ Votre compte est configuré correctement!");
  console.log("Si vous obtenez toujours 'identifiants invalides', vérifiez:");
  console.log("  1. Que vous utilisez le bon mot de passe");
  console.log("  2. Que vous utilisez exactement cet email: " + u.email);
}

// Récupérer l'email depuis les arguments de la ligne de commande
const email = process.argv[2];

if (!email) {
  console.log("Usage: tsx check-user.ts <email>");
  console.log("\nOu pour lister tous les utilisateurs:");
  console.log("tsx check-user.ts --all");
} else if (email === '--all') {
  // Lister tous les utilisateurs
  (async () => {
    const allUsers = await db.select().from(users);
    console.log(`\n📋 Total: ${allUsers.length} utilisateur(s)\n`);
    for (const u of allUsers) {
      console.log(`${u.email}`);
      console.log(`  - Nom: ${u.name}`);
      console.log(`  - Actif: ${u.isActive ? 'Oui' : 'Non'}`);
      console.log(`  - Mot de passe: ${u.password ? 'Oui' : 'Non'}`);
      console.log('');
    }
  })();
} else {
  checkUser(email);
}
