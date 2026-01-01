-- Migration: Add score field to deals table
-- Purpose: Enable A/B/C scoring for deal prioritization
-- Date: 2026-01-01

BEGIN;

-- Add score column with default value 'C'
ALTER TABLE deals ADD COLUMN IF NOT EXISTS score TEXT DEFAULT 'C';

-- Add comment to explain the purpose
COMMENT ON COLUMN deals.score IS 'Deal priority score: A (high), B (medium), C (low)';

COMMIT;
