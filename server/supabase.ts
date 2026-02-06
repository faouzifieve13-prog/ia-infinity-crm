import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials missing: SUPABASE_URL and SUPABASE_ANON_KEY must be set"
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");

export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  url: string;
  error?: string;
  tables?: string[];
}> {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        connected: false,
        url: "",
        error: "SUPABASE_URL or SUPABASE_ANON_KEY not configured",
      };
    }

    const { data, error } = await supabase.from("_test_connection").select("*").limit(1);

    if (error && error.code === "PGRST116") {
      return {
        connected: true,
        url: supabaseUrl,
        tables: [],
      };
    }

    if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
      return {
        connected: true,
        url: supabaseUrl,
        tables: [],
      };
    }

    if (error && error.message?.includes("Invalid API key")) {
      return {
        connected: false,
        url: supabaseUrl,
        error: "Invalid API key (SUPABASE_ANON_KEY)",
      };
    }

    return {
      connected: true,
      url: supabaseUrl,
      tables: [],
    };
  } catch (err: any) {
    return {
      connected: false,
      url: supabaseUrl ?? "",
      error: err.message,
    };
  }
}

export function getRlsPoliciesSQL(): string {
  return `
-- ============================================
-- IA Infinity - Row Level Security (RLS) Policies
-- Execute this SQL in the Supabase SQL Editor
-- ============================================

-- Enable RLS on all relevant tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADMIN POLICIES (full access within org)
-- ============================================

CREATE POLICY "admin_full_access_projects" ON projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = projects.org_id
        AND m.role = 'admin'
    )
  );

CREATE POLICY "admin_full_access_contracts" ON contracts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = contracts.org_id
        AND m.role = 'admin'
    )
  );

CREATE POLICY "admin_full_access_invoices" ON invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = invoices.org_id
        AND m.role = 'admin'
    )
  );

CREATE POLICY "admin_full_access_tasks" ON tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = tasks.org_id
        AND m.role = 'admin'
    )
  );

CREATE POLICY "admin_full_access_documents" ON documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = documents.org_id
        AND m.role = 'admin'
    )
  );

-- ============================================
-- CLIENT POLICIES (access only own account data)
-- ============================================

CREATE POLICY "client_view_own_projects" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = projects.org_id
        AND m.role IN ('client_admin', 'client_member')
        AND projects.account_id = u.account_id
    )
  );

CREATE POLICY "client_view_own_contracts" ON contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = contracts.org_id
        AND m.role IN ('client_admin', 'client_member')
        AND contracts.account_id = u.account_id
    )
  );

CREATE POLICY "client_view_own_invoices" ON invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = invoices.org_id
        AND m.role IN ('client_admin', 'client_member')
        AND invoices.account_id = u.account_id
    )
  );

CREATE POLICY "client_view_own_tasks" ON tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = tasks.org_id
        AND m.role IN ('client_admin', 'client_member')
        AND tasks.project_id IN (
          SELECT p.id FROM projects p WHERE p.account_id = u.account_id
        )
    )
  );

CREATE POLICY "client_view_own_documents" ON documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = documents.org_id
        AND m.role IN ('client_admin', 'client_member')
        AND documents.account_id = u.account_id
    )
  );

-- ============================================
-- VENDOR POLICIES (access only assigned projects)
-- ============================================

CREATE POLICY "vendor_view_assigned_projects" ON projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN vendors v ON v.user_id = u.id
      JOIN project_vendors pv ON pv.vendor_id = v.id AND pv.project_id = projects.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = projects.org_id
        AND m.role = 'vendor'
        AND pv.is_active = true
    )
  );

CREATE POLICY "vendor_view_assigned_contracts" ON contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN vendors v ON v.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = contracts.org_id
        AND m.role = 'vendor'
        AND contracts.vendor_id = v.id
    )
  );

CREATE POLICY "vendor_view_assigned_invoices" ON invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN vendors v ON v.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = invoices.org_id
        AND m.role = 'vendor'
        AND invoices.vendor_id = v.id
    )
  );

CREATE POLICY "vendor_view_assigned_tasks" ON tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN vendors v ON v.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = tasks.org_id
        AND m.role = 'vendor'
        AND tasks.project_id IN (
          SELECT pv.project_id FROM project_vendors pv
          WHERE pv.vendor_id = v.id AND pv.is_active = true
        )
    )
  );

CREATE POLICY "vendor_update_assigned_tasks" ON tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN vendors v ON v.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = tasks.org_id
        AND m.role = 'vendor'
        AND (tasks.assigned_to = u.id OR tasks.project_id IN (
          SELECT pv.project_id FROM project_vendors pv
          WHERE pv.vendor_id = v.id AND pv.is_active = true
        ))
    )
  );

CREATE POLICY "vendor_view_assigned_documents" ON documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN vendors v ON v.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND m.org_id = documents.org_id
        AND m.role = 'vendor'
        AND documents.project_id IN (
          SELECT pv.project_id FROM project_vendors pv
          WHERE pv.vendor_id = v.id AND pv.is_active = true
        )
    )
  );

-- ============================================
-- PROJECT_VENDORS (vendors see their own assignments)
-- ============================================

ALTER TABLE project_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_project_vendors" ON project_vendors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN projects p ON p.id = project_vendors.project_id
      WHERE u.id = auth.uid()::text
        AND m.org_id = p.org_id
        AND m.role = 'admin'
    )
  );

CREATE POLICY "vendor_view_own_assignments" ON project_vendors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN vendors v ON v.user_id = u.id
      WHERE u.id = auth.uid()::text
        AND project_vendors.vendor_id = v.id
    )
  );

-- ============================================
-- PROJECT_DELIVERABLES
-- ============================================

ALTER TABLE project_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_deliverables" ON project_deliverables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN projects p ON p.id = project_deliverables.project_id
      WHERE u.id = auth.uid()::text
        AND m.org_id = p.org_id
        AND m.role = 'admin'
    )
  );

CREATE POLICY "client_view_own_deliverables" ON project_deliverables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN projects p ON p.id = project_deliverables.project_id
      WHERE u.id = auth.uid()::text
        AND m.org_id = p.org_id
        AND m.role IN ('client_admin', 'client_member')
        AND p.account_id = u.account_id
    )
  );

CREATE POLICY "vendor_view_assigned_deliverables" ON project_deliverables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN vendors v ON v.user_id = u.id
      JOIN project_vendors pv ON pv.vendor_id = v.id AND pv.project_id = project_deliverables.project_id
      WHERE u.id = auth.uid()::text
        AND pv.is_active = true
    )
  );

CREATE POLICY "vendor_manage_assigned_deliverables" ON project_deliverables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN vendors v ON v.user_id = u.id
      JOIN project_vendors pv ON pv.vendor_id = v.id AND pv.project_id = project_deliverables.project_id
      WHERE u.id = auth.uid()::text
        AND pv.is_active = true
        AND pv.role = 'lead'
    )
  );
  `.trim();
}
