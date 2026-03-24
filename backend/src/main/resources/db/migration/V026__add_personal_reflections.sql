CREATE TABLE personal_reflections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id          UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    cycle_id        UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    alignment_signal VARCHAR(10) NOT NULL CHECK (alignment_signal IN ('CLOSER','SAME','FURTHER')),
    learning_note   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, cycle_id)
);

CREATE INDEX idx_personal_reflections_user ON personal_reflections (user_id);
