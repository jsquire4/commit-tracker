-- Growth areas: IC-private personal growth directions
CREATE TABLE growth_areas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id      UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    label       VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness per user, only among active areas
CREATE UNIQUE INDEX ux_growth_areas_user_label
    ON growth_areas (user_id, lower(label))
    WHERE is_active = TRUE;

CREATE INDEX idx_growth_areas_user_active
    ON growth_areas (user_id, is_active);

-- Join table: commitment <-> growth area (many-to-many)
CREATE TABLE commitment_growth_areas (
    commitment_id  UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
    growth_area_id UUID NOT NULL REFERENCES growth_areas(id) ON DELETE CASCADE,
    PRIMARY KEY (commitment_id, growth_area_id)
);

CREATE INDEX idx_cga_growth_area ON commitment_growth_areas (growth_area_id);

-- Auto-update updated_at (function already exists from V013)
CREATE TRIGGER trg_growth_areas_updated_at
    BEFORE UPDATE ON growth_areas
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
