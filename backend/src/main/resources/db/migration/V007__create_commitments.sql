CREATE TABLE commitments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              UUID NOT NULL REFERENCES orgs(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    cycle_id            UUID NOT NULL REFERENCES cycles(id),
    rally_cry_id        UUID REFERENCES rally_cries(id),
    defining_objective_id UUID REFERENCES defining_objectives(id),
    outcome_id          UUID REFERENCES outcomes(id),
    chess_category_id   UUID REFERENCES chess_categories(id),
    priority_rank       INTEGER NOT NULL DEFAULT 0,
    title               TEXT NOT NULL,
    description         TEXT,
    completion_horizon  VARCHAR(20) NOT NULL DEFAULT 'EOW'
                        CHECK (completion_horizon IN ('MORNING', 'MIDDAY', 'AFTERNOON', 'EOD', 'EOW')),
    assigned_by         UUID REFERENCES users(id),
    carried_from_id     UUID REFERENCES commitments(id),
    is_unplanned        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT rcdo_hierarchy_consistency CHECK (
        (outcome_id IS NULL OR defining_objective_id IS NOT NULL)
        AND (defining_objective_id IS NULL OR rally_cry_id IS NOT NULL)
    )
);
