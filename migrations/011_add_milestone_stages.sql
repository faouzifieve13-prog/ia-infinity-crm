-- Add missing milestone stages to the enum
ALTER TYPE milestone_stage ADD VALUE IF NOT EXISTS 'audit_client';
ALTER TYPE milestone_stage ADD VALUE IF NOT EXISTS 'production_v2';
ALTER TYPE milestone_stage ADD VALUE IF NOT EXISTS 'implementation_client';
ALTER TYPE milestone_stage ADD VALUE IF NOT EXISTS 'client_feedback';
ALTER TYPE milestone_stage ADD VALUE IF NOT EXISTS 'final_version';
