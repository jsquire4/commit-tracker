-- Widen day/time-block VARCHAR columns from VARCHAR(10) to VARCHAR(20) for safety headroom.
-- The V020 migration created these as VARCHAR(10); expanding to VARCHAR(20) accommodates
-- any future enum values without a breaking migration.
--
-- Note: rows with NULL completion_day / completion_time_block in V020 were intentionally
-- left as NULL — they represent time-of-day horizons where the day is implied (today/current).

ALTER TABLE commitments ALTER COLUMN completion_day TYPE VARCHAR(20);
ALTER TABLE commitments ALTER COLUMN completion_time_block TYPE VARCHAR(20);

ALTER TABLE reconciliation_records ALTER COLUMN planned_day TYPE VARCHAR(20);
ALTER TABLE reconciliation_records ALTER COLUMN planned_time_block TYPE VARCHAR(20);
