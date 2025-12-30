import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function resetPassword(email: string, newPassword: string) {
  console.log(`\n🔐 Réinitialisation du mot de passe pour: ${email}\n`);

  // Validation du mot de passe
  if (newPassword.length < 8) {
    console.log("❌ Le mot de passe doit contenir au moins 8 caractères");
    return;
  }

  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  if (!hasUpperCase) {
    console.log("❌ Le mot de passe doit contenir au moins une majuscule");
    return;
  }

  if (!hasLowerCase) {
    console.log("❌ Le mot de passe doit contenir au moins une minuscule");
    return;
  }

  if (!hasNumber) {
    console.log("❌ Le mot de passe doit contenir au moins un chiffre");
    return;
  }

  // Hacher le nouveau mot de passe
  console.log("🔄 Hachage du mot de passe...");
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Mettre à jour l'utilisateur
  console.log("💾 Mise à jour dans la base de données...");
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.email, email.toLowerCase()));

  console.log("✅ Mot de passe réinitialisé avec succès!");
  console.log("\n📝 Vous pouvez maintenant vous connecter avec:");
  console.log(`   Email: ${email}`);
  console.log(`   Mot de passe: ${newPassword}`);
  console.log("\n🔗 URL de connexion: http://localhost:5000/login");
}

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log("Usage: tsx reset-password.ts <email> <nouveau-mot-de-passe>");
  console.log("\nExemple: tsx reset-password.ts user@example.com MonNouveauMdp123");
  console.log("\nExigences du mot de passe:");
  console.log("  - Au moins 8 caractères");
  console.log("  - Au moins une majuscule");
  console.log("  - Au moins une minuscule");
  console.log("  - Au moins un chiffre");
} else {
  resetPassword(email, newPassword);
}
