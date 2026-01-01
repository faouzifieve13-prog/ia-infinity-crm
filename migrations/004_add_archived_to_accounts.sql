-- Migration: Add 'archived' status to account_status enum
-- Purpose: Enable archiving functionality for client accounts
-- Date: 2026-01-01

BEGIN;

-- Add 'archived' value to the account_status enum
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'archived';

-- Verification: Check enum values
DO $$
BEGIN
  RAISE NOTICE 'Updated account_status enum values: %',
    (SELECT array_agg(enumlabel ORDER BY enumsortorder)
     FROM pg_enum
     WHERE enumtypid = 'account_status'::regtype);
END $$;

COMMIT;
