-- Fix narrative_feedback: add updated_at, make cycle_id NOT NULL
ALTER TABLE narrative_feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE narrative_feedback SET updated_at = created_at WHERE updated_at IS NULL;

-- Make cycle_id NOT NULL (all existing rows should already have it)
ALTER TABLE narrative_feedback ALTER COLUMN cycle_id SET NOT NULL;
