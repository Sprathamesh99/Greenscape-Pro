-- ============================================================================
-- GREENSCAPE PRO PROPOSAL INTELLIGENCE AGENT
-- Production Supabase / PostgreSQL Schema & Row-Level Security (RLS) Policies
-- ============================================================================

-- 1. Create Enums
CREATE TYPE user_role_enum AS ENUM ('OWNER', 'ESTIMATOR', 'PROJECT_MANAGER', 'CREW_LEAD', 'SYSTEM');
CREATE TYPE proposal_status_enum AS ENUM ('DRAFT', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'REVISIONS_REQUIRED', 'SENT');
CREATE TYPE item_status_enum AS ENUM ('VALID', 'NEEDS_PRICING', 'MISSING_MEASUREMENT', 'CUSTOM');
CREATE TYPE audit_action_enum AS ENUM (
  'PROJECT_CREATED', 'NOTES_INGESTED', 'AI_EXTRACTION_COMPLETED',
  'ITEM_UPDATED', 'ITEM_ADDED', 'ITEM_DELETED',
  'PRICE_OVERRIDDEN', 'PROPOSAL_APPROVED', 'PROPOSAL_REJECTED',
  'PROPOSAL_REGENERATED', 'PROPOSAL_SENT'
);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  property_address TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  target_budget NUMERIC(12, 2),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Proposals Table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  proposal_number TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  status proposal_status_enum NOT NULL DEFAULT 'REVIEW_REQUIRED',
  raw_notes TEXT NOT NULL,
  project_overview TEXT NOT NULL,
  site_access_notes TEXT,
  rejection_reason TEXT,
  subtotal_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  gross_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0860,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Proposal Zones Table
CREATE TABLE IF NOT EXISTS proposal_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  narrative TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Proposal Line Items Table
CREATE TABLE IF NOT EXISTS proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES proposal_zones(id) ON DELETE CASCADE,
  catalog_sku TEXT,
  raw_item_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity NUMERIC(10, 2),
  unit TEXT NOT NULL,
  unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  extended_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  extended_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status item_status_enum NOT NULL DEFAULT 'VALID',
  is_optional_addon BOOLEAN NOT NULL DEFAULT FALSE,
  specifications TEXT,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Discrepancies Table
CREATE TABLE IF NOT EXISTS proposal_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'WARNING',
  item_reference TEXT NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  action audit_action_enum NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role user_role_enum NOT NULL,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Integration Events Table (Outbox pattern)
CREATE TABLE IF NOT EXISTS integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  target_system TEXT NOT NULL,
  event_trigger TEXT NOT NULL,
  status TEXT NOT NULL,
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user role from auth.jwt() claims
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', 'ESTIMATOR');
$$ LANGUAGE sql STABLE;

-- PROJECTS POLICIES
-- 1. All authenticated staff can read projects
CREATE POLICY "Staff can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- 2. Estimators and Owners can insert/update projects
CREATE POLICY "Estimators and Owners can manage projects"
  ON projects FOR ALL
  TO authenticated
  USING (auth.user_role() IN ('OWNER', 'ESTIMATOR', 'PROJECT_MANAGER'));

-- PROPOSALS POLICIES
-- 1. Staff can view proposals
CREATE POLICY "Staff can view proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (true);

-- 2. Estimators can create and update proposals in DRAFT, REVIEW_REQUIRED, or REVISIONS_REQUIRED state
CREATE POLICY "Estimators can create and modify draft proposals"
  ON proposals FOR UPDATE
  TO authenticated
  USING (
    (auth.user_role() IN ('OWNER', 'ESTIMATOR'))
    AND (status IN ('DRAFT', 'REVIEW_REQUIRED', 'REVISIONS_REQUIRED') OR auth.user_role() = 'OWNER')
  );

-- 3. ONLY OWNER can approve proposals (transition to APPROVED status)
CREATE POLICY "Only OWNER can set status to APPROVED"
  ON proposals FOR UPDATE
  TO authenticated
  WITH CHECK (
    (status = 'APPROVED' AND auth.user_role() = 'OWNER')
    OR (status != 'APPROVED')
  );

-- PROPOSAL ITEMS POLICIES
-- 1. Staff can read line items
CREATE POLICY "Staff can view proposal items"
  ON proposal_items FOR SELECT
  TO authenticated
  USING (true);

-- 2. Estimators can edit items on unapproved proposals; Owners can edit on any proposal
CREATE POLICY "Estimators can manage items on unapproved proposals"
  ON proposal_items FOR ALL
  TO authenticated
  USING (
    auth.user_role() = 'OWNER'
    OR (
      auth.user_role() IN ('ESTIMATOR', 'PROJECT_MANAGER')
      AND EXISTS (
        SELECT 1 FROM proposals
        WHERE proposals.id = proposal_items.proposal_id
        AND proposals.status IN ('DRAFT', 'REVIEW_REQUIRED', 'REVISIONS_REQUIRED')
      )
    )
  );

-- AUDIT LOGS POLICIES
-- 1. All staff can view audit history
CREATE POLICY "Staff can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- 2. System and API can insert immutable audit logs (No update or delete allowed)
CREATE POLICY "System can append audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Explicitly deny UPDATE and DELETE on audit logs (Immutability guarantee)
CREATE POLICY "Audit logs are strictly append-only"
  ON audit_logs FOR DELETE
  TO authenticated
  USING (false);

-- INTEGRATION EVENTS POLICIES
-- 1. Staff can view integration events
CREATE POLICY "Staff can view integration events"
  ON integration_events FOR SELECT
  TO authenticated
  USING (true);

-- 2. System / Service role can insert and update outbox status
CREATE POLICY "Service can manage integration events"
  ON integration_events FOR ALL
  TO authenticated
  USING (auth.user_role() IN ('OWNER', 'SYSTEM', 'ESTIMATOR'));
