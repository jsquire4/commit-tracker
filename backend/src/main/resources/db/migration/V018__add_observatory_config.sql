-- Per-org configuration for observatory thresholds
-- All thresholds are configurable by the executive — no hardcoded defaults in the code
CREATE TABLE observatory_config (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                      UUID NOT NULL REFERENCES orgs(id) UNIQUE,

    -- Drift detection thresholds (number of weeks before signal is surfaced)
    drift_emerging_weeks        INTEGER NOT NULL DEFAULT 3,
    drift_sustained_weeks       INTEGER NOT NULL DEFAULT 6,
    drift_structural_weeks      INTEGER NOT NULL DEFAULT 12,

    -- Alignment thresholds
    strategic_alignment_target  DECIMAL(5,2) NOT NULL DEFAULT 60.0,
    misalignment_warning_pct    DECIMAL(5,2) NOT NULL DEFAULT 40.0,

    -- Assignment thresholds
    dark_work_warning_pct       DECIMAL(5,2) NOT NULL DEFAULT 60.0,
    concentration_risk_pct      DECIMAL(5,2) NOT NULL DEFAULT 50.0,

    -- Signal integrity
    uniformity_threshold        DECIMAL(5,2) NOT NULL DEFAULT 90.0,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ordering: emerging < sustained < structural (prevent inverted severity ladder)
    CONSTRAINT drift_weeks_ordered CHECK (
        drift_emerging_weeks > 0
        AND drift_sustained_weeks > drift_emerging_weeks
        AND drift_structural_weeks > drift_sustained_weeks
    ),
    -- All percentages must be in valid range
    CONSTRAINT pct_ranges CHECK (
        strategic_alignment_target BETWEEN 0 AND 100
        AND misalignment_warning_pct BETWEEN 0 AND 100
        AND dark_work_warning_pct BETWEEN 0 AND 100
        AND concentration_risk_pct BETWEEN 0 AND 100
        AND uniformity_threshold BETWEEN 0 AND 100
    ),
    -- Warning threshold must be below target (otherwise warning fires when above target)
    CONSTRAINT warning_below_target CHECK (
        misalignment_warning_pct < strategic_alignment_target
    )
);

CREATE TRIGGER trg_observatory_config_updated_at BEFORE UPDATE ON observatory_config FOR EACH ROW EXECUTE FUNCTION set_updated_at();
