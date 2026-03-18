-- Effort estimation on commitments for cost-weighted analysis
ALTER TABLE commitments ADD COLUMN estimated_hours DECIMAL(5,2)
    CHECK (estimated_hours IS NULL OR estimated_hours > 0);
