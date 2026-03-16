CREATE TABLE cycles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    label           TEXT NOT NULL,
    state           VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                    CHECK (state IN ('DRAFT', 'LOCKED', 'RECONCILING', 'RECONCILED')),
    starts_at       TIMESTAMPTZ NOT NULL,
    ends_at         TIMESTAMPTZ NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT cycle_date_order CHECK (ends_at > starts_at),
    UNIQUE (org_id, starts_at)
);
