-- Portfolio: a group of organizations (portcos) managed by a PE firm
CREATE TABLE portfolios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link orgs to portfolios
ALTER TABLE orgs ADD COLUMN portfolio_id UUID REFERENCES portfolios(id);
CREATE INDEX idx_orgs_portfolio ON orgs(portfolio_id) WHERE portfolio_id IS NOT NULL;

CREATE TRIGGER trg_portfolios_updated_at BEFORE UPDATE ON portfolios FOR EACH ROW EXECUTE FUNCTION set_updated_at();
