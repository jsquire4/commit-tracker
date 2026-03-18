-- Displacement categories for reconciliation
-- When a commitment is NOT_STARTED or CARRIED_FORWARD, the employee can specify what displaced it
-- Valid values: MANAGER_REASSIGNED, PRODUCTION_EMERGENCY, RESOURCE_BLOCKED,
--               SCOPE_CHANGE, DEPRIORITIZED, EXTERNAL_DEPENDENCY, OTHER

-- Add displacement fields to reconciliation_records
ALTER TABLE reconciliation_records ADD COLUMN displacement_category VARCHAR(40)
    CHECK (displacement_category IS NULL OR displacement_category IN (
        'MANAGER_REASSIGNED', 'PRODUCTION_EMERGENCY', 'RESOURCE_BLOCKED',
        'SCOPE_CHANGE', 'DEPRIORITIZED', 'EXTERNAL_DEPENDENCY', 'OTHER'
    ));
ALTER TABLE reconciliation_records ADD COLUMN displacement_detail TEXT;
ALTER TABLE reconciliation_records ADD COLUMN displacing_commitment_id UUID REFERENCES commitments(id);

-- Indexes for aggregating displacement patterns
CREATE INDEX idx_reconciliation_displacement ON reconciliation_records(org_id, displacement_category)
    WHERE displacement_category IS NOT NULL;
CREATE INDEX idx_reconciliation_displacing ON reconciliation_records(displacing_commitment_id)
    WHERE displacing_commitment_id IS NOT NULL;
