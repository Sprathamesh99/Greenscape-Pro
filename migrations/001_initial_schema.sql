-- ==============================================================================
-- GREENSCAPE PRO PROPOSAL INTELLIGENCE AGENT - DATABASE MIGRATION 001
-- Target: Supabase / PostgreSQL 15+
-- Description: Core schema with relational constraints, foreign keys, secondary indexes,
--              audit logging, version snapshots, and Row Level Security (RLS) policies.
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ESTIMATOR', 'OWNER', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE proposal_status AS ENUM (
        'DRAFT',
        'REVIEW_REQUIRED',
        'APPROVED',
        'REVISIONS_REQUIRED',
        'REJECTED',
        'CONVERTED_TO_JOB'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_status AS ENUM ('VALID', 'NEEDS_PRICING', 'MISSING_MEASUREMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE discrepancy_severity AS ENUM ('CRITICAL', 'WARNING', 'INFO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    property_address TEXT NOT NULL,
    target_budget NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PRICING CATALOG TABLE (Phoenix Master Item Price Book)
CREATE TABLE IF NOT EXISTS pricing_catalog (
    sku VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(32) NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL CHECK (unit_cost >= 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    labor_hours_per_unit NUMERIC(8, 3) NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PROPOSALS TABLE
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    proposal_number VARCHAR(64) NOT NULL UNIQUE,
    version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
    status proposal_status NOT NULL DEFAULT 'DRAFT',
    site_notes_raw TEXT NOT NULL,
    project_overview TEXT,
    site_access_notes TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
    tax_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0860 CHECK (tax_rate >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_price >= 0),
    gross_margin_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    confidence_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    approver_name VARCHAR(255),
    approver_role user_role,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_by_user_id VARCHAR(128) NOT NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PROPOSAL ZONES TABLE
CREATE TABLE IF NOT EXISTS proposal_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    zone_name VARCHAR(255) NOT NULL,
    narrative TEXT,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PROPOSAL ITEMS TABLE
CREATE TABLE IF NOT EXISTS proposal_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES proposal_zones(id) ON DELETE CASCADE,
    catalog_sku VARCHAR(64) REFERENCES pricing_catalog(sku) ON DELETE SET NULL,
    raw_item_name VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity NUMERIC(10, 2),
    unit VARCHAR(32) NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    extended_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (extended_cost >= 0),
    extended_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (extended_price >= 0),
    status item_status NOT NULL DEFAULT 'VALID',
    is_optional_addon BOOLEAN NOT NULL DEFAULT FALSE,
    specifications TEXT,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PROPOSAL DISCREPANCIES TABLE
CREATE TABLE IF NOT EXISTS proposal_discrepancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    severity discrepancy_severity NOT NULL DEFAULT 'WARNING',
    message TEXT NOT NULL,
    suggested_action TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PROPOSAL VERSIONS / IMMUTABLE SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS proposal_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    version INT NOT NULL,
    snapshot_data JSONB NOT NULL,
    change_summary TEXT,
    created_by_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(proposal_id, version)
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    actor_id VARCHAR(128) NOT NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role user_role NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. INTEGRATION EVENTS TABLE (Slack, GoHighLevel, Webhooks)
CREATE TABLE IF NOT EXISTS integration_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    channel VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    payload JSONB NOT NULL,
    response JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- SECONDARY INDEXES FOR ULTRA-FAST RELATIONAL LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_proposals_project_id ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_updated_at ON proposals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_zones_proposal_id ON proposal_zones(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal_id ON proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_zone_id ON proposal_items(zone_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_catalog_sku ON proposal_items(catalog_sku);
CREATE INDEX IF NOT EXISTS idx_proposal_discrepancies_proposal_id ON proposal_discrepancies(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal_id ON proposal_versions(proposal_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_proposal_id ON audit_logs(proposal_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_proposal_id ON integration_events(proposal_id);
CREATE INDEX IF NOT EXISTS idx_pricing_catalog_category ON pricing_catalog(category);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_catalog ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and service role full read/write access
CREATE POLICY "Allow service role full access on projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow service role full access on proposals" ON proposals FOR ALL USING (true);
CREATE POLICY "Allow service role full access on proposal_zones" ON proposal_zones FOR ALL USING (true);
CREATE POLICY "Allow service role full access on proposal_items" ON proposal_items FOR ALL USING (true);
CREATE POLICY "Allow service role full access on proposal_discrepancies" ON proposal_discrepancies FOR ALL USING (true);
CREATE POLICY "Allow service role full access on proposal_versions" ON proposal_versions FOR ALL USING (true);
CREATE POLICY "Allow service role full access on audit_logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow service role full access on integration_events" ON integration_events FOR ALL USING (true);
CREATE POLICY "Allow service role full access on pricing_catalog" ON pricing_catalog FOR ALL USING (true);
