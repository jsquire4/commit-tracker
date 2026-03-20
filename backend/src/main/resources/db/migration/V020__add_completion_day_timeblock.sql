-- Add day + time-block columns to commitments (nullable, dual-write with legacy completion_horizon)
ALTER TABLE commitments ADD COLUMN completion_day VARCHAR(10);
ALTER TABLE commitments ADD COLUMN completion_time_block VARCHAR(10);

-- Add day + time-block columns to reconciliation_records (nullable, dual-write with legacy planned_horizon)
ALTER TABLE reconciliation_records ADD COLUMN planned_day VARCHAR(10);
ALTER TABLE reconciliation_records ADD COLUMN planned_time_block VARCHAR(10);

-- Backfill commitments: EOW -> FRIDAY/EOD, time-of-day horizons -> today implied (null day) + matching time block
UPDATE commitments SET completion_day = 'FRIDAY', completion_time_block = 'EOD' WHERE completion_horizon = 'EOW';
UPDATE commitments SET completion_time_block = completion_horizon WHERE completion_horizon IN ('MORNING', 'MIDDAY', 'AFTERNOON', 'EOD');

-- Backfill reconciliation_records
UPDATE reconciliation_records SET planned_day = 'FRIDAY', planned_time_block = 'EOD' WHERE planned_horizon = 'EOW';
UPDATE reconciliation_records SET planned_time_block = planned_horizon WHERE planned_horizon IN ('MORNING', 'MIDDAY', 'AFTERNOON', 'EOD');
