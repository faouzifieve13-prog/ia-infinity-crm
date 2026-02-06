# Configuration Supabase pour IA Infinity

## Prérequis

- Un compte Supabase (https://supabase.com)
- Un projet Supabase créé

## Variables d'environnement requises

| Variable | Description |
|---|---|
| `SUPABASE_URL` | URL de votre projet Supabase (ex: `https://xxxxxxxxxxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Clé publique anonyme de votre projet Supabase |
| `DATABASE_URL` | URL de connexion PostgreSQL fournie par Supabase |

## Obtenir les valeurs depuis Supabase

1. Connectez-vous à https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans **Settings** > **API**
4. Copiez les valeurs suivantes :
   - **Project URL** → `SUPABASE_URL`
   - **anon public** (sous Project API keys) → `SUPABASE_ANON_KEY`
5. Pour `DATABASE_URL`, allez dans **Settings** > **Database**
   - Copiez le **Connection string** (URI) sous la section "Connection string"
   - Le format est : `postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres`

## Ajouter les secrets dans Replit

### Pour l'environnement de production (Production app secrets)

1. Dans votre projet Replit, ouvrez l'onglet **Secrets** (icône de cadenas dans le panneau latéral gauche)
2. Cliquez sur **+ New Secret** pour chaque variable :

   **Secret 1 :**
   - Key : `SUPABASE_URL`
   - Value : collez l'URL de votre projet Supabase

   **Secret 2 :**
   - Key : `SUPABASE_ANON_KEY`
   - Value : collez la clé anon public de votre projet Supabase

   **Secret 3 :**
   - Key : `DATABASE_URL`
   - Value : collez la connection string PostgreSQL de Supabase

3. Les secrets sont automatiquement disponibles dans votre application via `process.env`

## Vérification

Une fois les variables configurées, le fichier `server/supabase.ts` initialise automatiquement le client Supabase au démarrage de l'application. Si les variables sont manquantes, un avertissement s'affiche dans la console.
