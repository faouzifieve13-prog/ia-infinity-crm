-- Migration: Add vendor_id column to projects table
-- Purpose: Simplify vendor-project relationship from N+1 via contacts to direct reference
-- Date: 2025-12-28

BEGIN;

-- Add vendor_id column with foreign key to vendors table
ALTER TABLE projects
ADD COLUMN vendor_id VARCHAR(255)
REFERENCES vendors(id) ON DELETE SET NULL;

-- Create index for performance on vendor queries
CREATE INDEX idx_projects_vendor_id ON projects(vendor_id);

-- Migrate existing data from vendor_contact_id to vendor_id
-- This finds the vendor_id through the contact relationship
UPDATE projects p
SET vendor_id = (
  SELECT c.vendor_id
  FROM contacts c
  WHERE c.id = p.vendor_contact_id
  LIMIT 1
)
WHERE p.vendor_contact_id IS NOT NULL;

-- Verification: Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
  total_with_vendor_contact INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_with_vendor_contact
  FROM projects
  WHERE vendor_contact_id IS NOT NULL;

  SELECT COUNT(*) INTO migrated_count
  FROM projects
  WHERE vendor_id IS NOT NULL;

  RAISE NOTICE 'Migration completed: % projects had vendor_contact_id, % now have vendor_id',
    total_with_vendor_contact, migrated_count;
END $$;

COMMIT;

-- Rollback instructions (if needed):
-- BEGIN;
-- DROP INDEX IF EXISTS idx_projects_vendor_id;
-- ALTER TABLE projects DROP COLUMN IF EXISTS vendor_id;
-- COMMIT;
