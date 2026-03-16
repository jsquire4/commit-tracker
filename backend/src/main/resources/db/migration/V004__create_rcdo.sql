CREATE TABLE rally_cries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    title           TEXT NOT NULL,
    description     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE defining_objectives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    rally_cry_id    UUID NOT NULL REFERENCES rally_cries(id),
    title           TEXT NOT NULL,
    description     TEXT,
    owner_user_id   UUID REFERENCES users(id),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outcomes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    defining_objective_id UUID NOT NULL REFERENCES defining_objectives(id),
    title           TEXT NOT NULL,
    description     TEXT,
    owner_user_id   UUID REFERENCES users(id),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
