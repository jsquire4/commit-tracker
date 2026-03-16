CREATE TABLE audit_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    entity_type     TEXT NOT NULL,
    entity_id       UUID NOT NULL,
    action          TEXT NOT NULL,
    actor_id        UUID NOT NULL REFERENCES users(id),
    actor_role      TEXT NOT NULL,
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_entries_org ON audit_entries(org_id, created_at DESC);
CREATE INDEX idx_audit_entries_entity ON audit_entries(entity_type, entity_id);
CREATE INDEX idx_audit_entries_actor ON audit_entries(actor_id);
