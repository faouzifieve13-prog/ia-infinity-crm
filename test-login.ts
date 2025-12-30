import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function testLogin(email: string, password: string) {
  console.log(`\n🔐 Test de connexion pour: "${email}"`);
  console.log(`📧 Email brut: [${email}]`);
  console.log(`🔑 Mot de passe brut: [${password}]`);
  console.log(`📏 Longueur du mot de passe: ${password.length}`);

  const normalizedEmail = email.toLowerCase();
  console.log(`📧 Email normalisé: [${normalizedEmail}]`);

  const user = await db.select().from(users).where(eq(users.email, normalizedEmail));

  if (user.length === 0) {
    console.log(`❌ ÉCHEC: Aucun utilisateur trouvé avec l'email "${normalizedEmail}"`);
    return;
  }

  const u = user[0];
  console.log(`\n✅ Utilisateur trouvé:`);
  console.log(`   - ID: ${u.id}`);
  console.log(`   - Nom: ${u.name}`);
  console.log(`   - Email en base: [${u.email}]`);

  if (!u.password) {
    console.log(`❌ ÉCHEC: Aucun mot de passe défini pour cet utilisateur`);
    return;
  }

  console.log(`\n🔍 Vérification du mot de passe...`);
  console.log(`   - Hash en base (premiers 30 car): ${u.password.substring(0, 30)}...`);

  const isValidPassword = await bcrypt.compare(password, u.password);

  if (isValidPassword) {
    console.log(`\n✅ ✅ ✅ SUCCÈS ! Le mot de passe est CORRECT ! ✅ ✅ ✅`);
    console.log(`\n✨ Vous pouvez vous connecter avec:`);
    console.log(`   Email: ${normalizedEmail}`);
    console.log(`   Mot de passe: ${password}`);
  } else {
    console.log(`\n❌ ❌ ❌ ÉCHEC ! Le mot de passe est INCORRECT ! ❌ ❌ ❌`);
    console.log(`\n💡 Problèmes possibles:`);
    console.log(`   1. Le mot de passe contient des espaces au début/fin`);
    console.log(`   2. Le mot de passe a une casse différente`);
    console.log(`   3. Le mot de passe n'a pas été correctement enregistré`);

    // Tester avec le mot de passe sans espaces
    const trimmedPassword = password.trim();
    if (trimmedPassword !== password) {
      console.log(`\n🔄 Test avec le mot de passe sans espaces...`);
      const isValidTrimmed = await bcrypt.compare(trimmedPassword, u.password);
      if (isValidTrimmed) {
        console.log(`✅ Le mot de passe SANS ESPACES fonctionne !`);
        console.log(`   Utilisez: "${trimmedPassword}"`);
      }
    }
  }
}

const email = process.argv[2] || "faouzi.fieve13@gmail.com";
const password = process.argv[3] || "Faouzi.89";

testLogin(email, password);
