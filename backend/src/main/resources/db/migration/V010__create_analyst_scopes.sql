CREATE TABLE analyst_scopes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    analyst_user_id UUID NOT NULL REFERENCES users(id),
    rally_cry_id    UUID REFERENCES rally_cries(id),
    org_unit_root_user_id UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT at_least_one_scope CHECK (
        rally_cry_id IS NOT NULL OR org_unit_root_user_id IS NOT NULL
    )
);
