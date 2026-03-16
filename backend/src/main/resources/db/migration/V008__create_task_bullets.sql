CREATE TABLE task_bullets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commitment_id   UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL REFERENCES orgs(id),
    body            TEXT NOT NULL,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_completed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
