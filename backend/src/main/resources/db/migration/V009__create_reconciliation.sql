CREATE TABLE reconciliation_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    commitment_id   UUID NOT NULL REFERENCES commitments(id),
    cycle_id        UUID NOT NULL REFERENCES cycles(id),
    status          VARCHAR(30) NOT NULL
                    CHECK (status IN ('COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_STARTED', 'CARRIED_FORWARD')),
    notes           TEXT,
    planned_horizon VARCHAR(20)
                    CHECK (planned_horizon IS NULL OR planned_horizon IN ('MORNING', 'MIDDAY', 'AFTERNOON', 'EOD', 'EOW')),
    reconciled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    reconciled_by   UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (commitment_id, cycle_id)
);
