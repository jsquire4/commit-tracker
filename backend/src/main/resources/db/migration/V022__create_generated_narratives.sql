-- Stores LLM-generated narratives with verification metadata.
-- Keyed by (org, cycle, type, scope) so each unique context is generated once and cached.

CREATE TABLE generated_narratives (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES orgs(id),
    cycle_id        UUID REFERENCES cycles(id),
    narrative_type  VARCHAR(50) NOT NULL,
    scope_key       VARCHAR(255) NOT NULL DEFAULT '',
    content         TEXT NOT NULL,
    suggestions     JSONB,
    model           VARCHAR(100) NOT NULL,
    prompt_hash     VARCHAR(64) NOT NULL,
    verification    JSONB NOT NULL,
    generated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    CONSTRAINT uq_narrative UNIQUE (org_id, cycle_id, narrative_type, scope_key)
);

CREATE INDEX idx_narrative_org_type ON generated_narratives (org_id, narrative_type);
CREATE INDEX idx_narrative_cycle ON generated_narratives (cycle_id);

COMMENT ON TABLE generated_narratives IS 'Cached LLM-generated narrative summaries with cite-and-verify audit trail';
COMMENT ON COLUMN generated_narratives.narrative_type IS 'BRIEFING | WEEK_NARRATIVE | TEAM_SUMMARY | PROGRAM_SUMMARY';
COMMENT ON COLUMN generated_narratives.scope_key IS 'Context key — e.g. manager UUID for TEAM_SUMMARY, fromCycleId:toCycleId for PROGRAM_SUMMARY';
COMMENT ON COLUMN generated_narratives.prompt_hash IS 'SHA-256 of the assembled prompt input — detects stale cache';
COMMENT ON COLUMN generated_narratives.verification IS 'JSON verification log — citation checks, pass/fail, uncited numbers';
