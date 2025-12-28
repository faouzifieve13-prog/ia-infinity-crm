-- Migration: Add CHECK constraints for invitation validation
-- Purpose: Enforce at DB level that client invitations have accountId and vendor invitations have vendorId
-- Date: 2025-12-28

BEGIN;

-- Ensure client invitations always have accountId
ALTER TABLE invitations
ADD CONSTRAINT check_client_has_account
CHECK (
  (role IN ('client_admin', 'client_member') AND account_id IS NOT NULL)
  OR
  (role NOT IN ('client_admin', 'client_member'))
);

-- Ensure vendor invitations always have vendorId
ALTER TABLE invitations
ADD CONSTRAINT check_vendor_has_vendor_id
CHECK (
  (role = 'vendor' AND vendor_id IS NOT NULL)
  OR
  (role != 'vendor')
);

-- Verification: Log constraint creation
DO $$
BEGIN
  RAISE NOTICE 'Invitation CHECK constraints added successfully';
  RAISE NOTICE '  - client_admin/client_member invitations require account_id';
  RAISE NOTICE '  - vendor invitations require vendor_id';
END $$;

COMMIT;

-- Rollback instructions (if needed):
-- BEGIN;
-- ALTER TABLE invitations DROP CONSTRAINT IF EXISTS check_client_has_account;
-- ALTER TABLE invitations DROP CONSTRAINT IF EXISTS check_vendor_has_vendor_id;
-- COMMIT;
