-- Add detailed amount fields to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS audit_amount DECIMAL(12, 2) DEFAULT '0';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS development_amount DECIMAL(12, 2) DEFAULT '0';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recurring_amount DECIMAL(12, 2) DEFAULT '0';
