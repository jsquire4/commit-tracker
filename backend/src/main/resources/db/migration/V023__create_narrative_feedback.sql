CREATE TABLE narrative_feedback (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES orgs(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    scope       VARCHAR(50) NOT NULL,
    cycle_id    UUID REFERENCES cycles(id),
    vote        VARCHAR(10) NOT NULL CHECK (vote IN ('up', 'down')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, user_id, scope, cycle_id)
);

CREATE INDEX idx_narrative_feedback_org_scope ON narrative_feedback(org_id, scope);
CREATE INDEX idx_narrative_feedback_vote ON narrative_feedback(org_id, vote);
