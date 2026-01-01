-- Migration: Add lost reason fields to deals table
-- Purpose: Track why deals were lost with categorized reasons and details
-- Date: 2026-01-01

BEGIN;

-- Add lost_reason and lost_reason_details columns to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lost_reason_details TEXT;

-- Add comment to explain the purpose
COMMENT ON COLUMN deals.lost_reason IS 'Categorized reason why the deal was lost';
COMMENT ON COLUMN deals.lost_reason_details IS 'Additional details about why the deal was lost';

COMMIT;
