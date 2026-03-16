-- Per-team activation: a user can be marked as having the commit module enabled.
-- When NULL, inherits from org-level is_active.
-- When TRUE, the user and their subtree are activated regardless of org default.
-- When FALSE, the user is explicitly deactivated.
ALTER TABLE users ADD COLUMN commit_module_enabled BOOLEAN;

-- Index for quick lookup of activated users
CREATE INDEX idx_users_commit_module_enabled ON users(org_id) WHERE commit_module_enabled = TRUE;
