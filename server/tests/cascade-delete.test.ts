import { db } from '../db';
import { accounts, deals, followUpHistory, organizations } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

async function testCascadeDelete() {
  console.log('=== Test de suppression en cascade ===\n');
  
  const testOrgId = 'test-org-cascade-' + Date.now();
  const testAccountId = 'test-account-cascade-' + Date.now();
  const testDealId = 'test-deal-cascade-' + Date.now();
  const testFollowUpId = 'test-followup-cascade-' + Date.now();

  try {
    // 1. Créer une organisation de test
    console.log('1. Création de l\'organisation de test...');
    await db.insert(organizations).values({
      id: testOrgId,
      name: 'Test Org Cascade',
      slug: 'test-cascade-' + Date.now(),
    });
    console.log('   ✓ Organisation créée:', testOrgId);

    // 2. Créer un compte de test
    console.log('\n2. Création du compte de test...');
    await db.insert(accounts).values({
      id: testAccountId,
      orgId: testOrgId,
      name: 'Test Account Cascade',
      status: 'active',
    });
    console.log('   ✓ Compte créé:', testAccountId);

    // 3. Créer un deal lié au compte
    console.log('\n3. Création du deal lié au compte...');
    await db.insert(deals).values({
      id: testDealId,
      orgId: testOrgId,
      accountId: testAccountId,
      name: 'Test Deal Cascade',
      amount: '10000',
      probability: 50,
      stage: 'prospect',
    });
    console.log('   ✓ Deal créé:', testDealId);

    // 4. Créer un follow_up_history lié au deal
    console.log('\n4. Création du follow_up_history lié au deal...');
    await db.insert(followUpHistory).values({
      id: testFollowUpId,
      orgId: testOrgId,
      dealId: testDealId,
      type: 'email',
      content: 'Test follow-up content',
      recipientEmail: 'test@example.com',
    });
    console.log('   ✓ Follow-up créé:', testFollowUpId);

    // 5. Vérifier que toutes les données existent
    console.log('\n5. Vérification des données avant suppression...');
    const accountBefore = await db.select().from(accounts).where(eq(accounts.id, testAccountId));
    const dealBefore = await db.select().from(deals).where(eq(deals.id, testDealId));
    const followUpBefore = await db.select().from(followUpHistory).where(eq(followUpHistory.id, testFollowUpId));
    
    console.log('   - Compte existe:', accountBefore.length === 1 ? '✓' : '✗');
    console.log('   - Deal existe:', dealBefore.length === 1 ? '✓' : '✗');
    console.log('   - Follow-up existe:', followUpBefore.length === 1 ? '✓' : '✗');

    if (accountBefore.length !== 1 || dealBefore.length !== 1 || followUpBefore.length !== 1) {
      throw new Error('Les données de test n\'ont pas été créées correctement');
    }

    // 6. Supprimer le compte (doit déclencher la cascade)
    console.log('\n6. Suppression du compte (test CASCADE)...');
    await db.delete(accounts).where(eq(accounts.id, testAccountId));
    console.log('   ✓ Compte supprimé');

    // 7. Vérifier que tout a été supprimé en cascade
    console.log('\n7. Vérification de la suppression en cascade...');
    const accountAfter = await db.select().from(accounts).where(eq(accounts.id, testAccountId));
    const dealAfter = await db.select().from(deals).where(eq(deals.id, testDealId));
    const followUpAfter = await db.select().from(followUpHistory).where(eq(followUpHistory.id, testFollowUpId));

    const accountDeleted = accountAfter.length === 0;
    const dealDeleted = dealAfter.length === 0;
    const followUpDeleted = followUpAfter.length === 0;

    console.log('   - Compte supprimé:', accountDeleted ? '✓' : '✗');
    console.log('   - Deal supprimé en cascade:', dealDeleted ? '✓' : '✗');
    console.log('   - Follow-up supprimé en cascade:', followUpDeleted ? '✓' : '✗');

    // 8. Résultat final
    console.log('\n=== Résultat du test ===');
    if (accountDeleted && dealDeleted && followUpDeleted) {
      console.log('✓ SUCCÈS: La suppression en cascade fonctionne correctement!');
      console.log('  - Le compte a été supprimé');
      console.log('  - Les deals associés ont été supprimés automatiquement');
      console.log('  - Les follow_up_history associés ont été supprimés automatiquement');
    } else {
      console.log('✗ ÉCHEC: La suppression en cascade n\'a pas fonctionné');
      if (!dealDeleted) console.log('  - Le deal n\'a pas été supprimé');
      if (!followUpDeleted) console.log('  - Le follow-up n\'a pas été supprimé');
    }

    // Nettoyage de l'organisation de test
    await db.delete(organizations).where(eq(organizations.id, testOrgId));
    console.log('\n✓ Nettoyage terminé');

    return accountDeleted && dealDeleted && followUpDeleted;

  } catch (error) {
    console.error('\n✗ ERREUR:', error);
    
    // Nettoyage en cas d'erreur
    try {
      await db.delete(followUpHistory).where(eq(followUpHistory.id, testFollowUpId));
      await db.delete(deals).where(eq(deals.id, testDealId));
      await db.delete(accounts).where(eq(accounts.id, testAccountId));
      await db.delete(organizations).where(eq(organizations.id, testOrgId));
    } catch (cleanupError) {
      // Ignorer les erreurs de nettoyage
    }
    
    return false;
  }
}

// Exécuter le test
testCascadeDelete()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
