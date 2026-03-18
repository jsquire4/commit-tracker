-- Cost bands for role-tier weighting and dollar-denominated cost calculations
CREATE TABLE cost_bands (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    name            TEXT NOT NULL,
    tier            INTEGER NOT NULL,
    annual_cost     DECIMAL(12,2),
    hourly_rate     DECIMAL(8,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, name),
    CONSTRAINT cost_band_has_rate CHECK (annual_cost IS NOT NULL OR hourly_rate IS NOT NULL)
);

-- Add cost_band reference and capacity fields to users
ALTER TABLE users ADD COLUMN cost_band_id UUID REFERENCES cost_bands(id);
ALTER TABLE users ADD COLUMN weekly_capacity_hours DECIMAL(5,2) NOT NULL DEFAULT 40.0;

CREATE INDEX idx_cost_bands_org ON cost_bands(org_id);
CREATE INDEX idx_users_cost_band ON users(cost_band_id) WHERE cost_band_id IS NOT NULL;

CREATE TRIGGER trg_cost_bands_updated_at BEFORE UPDATE ON cost_bands FOR EACH ROW EXECUTE FUNCTION set_updated_at();
