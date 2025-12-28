-- Migration: Add ON DELETE CASCADE constraints to foreign keys
-- Purpose: Replace 286 lines of manual cascade deletion with DB-level guarantees
-- Date: 2025-12-28

BEGIN;

-- Contacts -> Accounts
-- When an account is deleted, delete all associated contacts
ALTER TABLE contacts
DROP CONSTRAINT IF EXISTS contacts_account_id_accounts_id_fk,
ADD CONSTRAINT contacts_account_id_accounts_id_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Tasks -> Projects
-- When a project is deleted, delete all associated tasks
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_project_id_projects_id_fk,
ADD CONSTRAINT tasks_project_id_projects_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Quotes -> Deals
-- When a deal is deleted, delete all associated quotes
ALTER TABLE quotes
DROP CONSTRAINT IF EXISTS quotes_deal_id_deals_id_fk,
ADD CONSTRAINT quotes_deal_id_deals_id_fk
  FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;

-- Invitations -> Accounts
-- When an account is deleted, delete all pending invitations
ALTER TABLE invitations
DROP CONSTRAINT IF EXISTS invitations_account_id_accounts_id_fk,
ADD CONSTRAINT invitations_account_id_accounts_id_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Channels -> Accounts
-- When an account is deleted, delete all associated channels
ALTER TABLE channels
DROP CONSTRAINT IF EXISTS channels_account_id_accounts_id_fk,
ADD CONSTRAINT channels_account_id_accounts_id_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Documents -> Projects
-- When a project is deleted, delete all associated documents
ALTER TABLE documents
DROP CONSTRAINT IF EXISTS documents_project_id_projects_id_fk,
ADD CONSTRAINT documents_project_id_projects_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Missions -> Projects
-- When a project is deleted, delete all associated missions
ALTER TABLE missions
DROP CONSTRAINT IF EXISTS missions_project_id_projects_id_fk,
ADD CONSTRAINT missions_project_id_projects_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Project Comments -> Projects
-- When a project is deleted, delete all associated comments
ALTER TABLE project_comments
DROP CONSTRAINT IF EXISTS project_comments_project_id_projects_id_fk,
ADD CONSTRAINT project_comments_project_id_projects_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Invoices -> Projects
-- When a project is deleted, delete all associated invoices
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_project_id_projects_id_fk,
ADD CONSTRAINT invoices_project_id_projects_id_fk
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Contracts -> Projects (if exists)
-- When a project is deleted, delete all associated contracts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'contracts'
  ) THEN
    ALTER TABLE contracts
    DROP CONSTRAINT IF EXISTS contracts_project_id_projects_id_fk,
    ADD CONSTRAINT contracts_project_id_projects_id_fk
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Projects -> Accounts
-- When an account is deleted, delete all associated projects (and cascade to all project children)
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_account_id_accounts_id_fk,
ADD CONSTRAINT projects_account_id_accounts_id_fk
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Verification message
DO $$
BEGIN
  RAISE NOTICE 'CASCADE constraints added successfully';
END $$;

COMMIT;

-- Rollback instructions (if needed):
-- To rollback, you would need to replace CASCADE with RESTRICT or NO ACTION
-- This should be done carefully as it affects data integrity
-- BEGIN;
-- ALTER TABLE contacts DROP CONSTRAINT contacts_account_id_accounts_id_fk,
--   ADD CONSTRAINT contacts_account_id_accounts_id_fk
--   FOREIGN KEY (account_id) REFERENCES accounts(id);
-- ... (repeat for all tables)
-- COMMIT;
