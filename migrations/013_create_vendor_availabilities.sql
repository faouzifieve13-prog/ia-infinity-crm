CREATE TABLE IF NOT EXISTS vendor_availabilities (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR NOT NULL REFERENCES organizations(id),
  vendor_id VARCHAR NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status vendor_availability NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS vendor_availabilities_org_idx ON vendor_availabilities(org_id);
CREATE INDEX IF NOT EXISTS vendor_availabilities_vendor_idx ON vendor_availabilities(vendor_id);
CREATE INDEX IF NOT EXISTS vendor_availabilities_date_idx ON vendor_availabilities(vendor_id, start_date, end_date);
