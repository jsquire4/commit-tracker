CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- NOTE: We use VARCHAR columns with CHECK constraints instead of Postgres ENUM types.
-- Reason: Postgres ENUMs cannot have values removed and adding values cannot be
-- rolled back inside a transaction (before PG 12). VARCHAR + CHECK is equally safe
-- at the DB level, simpler to evolve, and avoids Hibernate NAMED_ENUM mapping issues.
