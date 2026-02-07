-- Add remuneration fields to project_vendors table
ALTER TABLE project_vendors ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2) DEFAULT '0';
ALTER TABLE project_vendors ADD COLUMN IF NOT EXISTS estimated_days INTEGER DEFAULT 0;
ALTER TABLE project_vendors ADD COLUMN IF NOT EXISTS fixed_price DECIMAL(12, 2) DEFAULT '0';
