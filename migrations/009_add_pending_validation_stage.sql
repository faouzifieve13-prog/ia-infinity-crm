-- Add pending_validation to deal_stage enum
ALTER TYPE deal_stage ADD VALUE IF NOT EXISTS 'pending_validation';
