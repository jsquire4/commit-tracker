-- USERS
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_users_reports_to ON users(reports_to) WHERE reports_to IS NOT NULL;
CREATE INDEX idx_users_org_active ON users(org_id) WHERE is_active = TRUE;

-- RCDO HIERARCHY
CREATE INDEX idx_rally_cries_org ON rally_cries(org_id) WHERE archived_at IS NULL;
CREATE INDEX idx_defining_objectives_rally_cry ON defining_objectives(rally_cry_id) WHERE archived_at IS NULL;
CREATE INDEX idx_defining_objectives_owner ON defining_objectives(owner_user_id) WHERE owner_user_id IS NOT NULL AND archived_at IS NULL;
CREATE INDEX idx_outcomes_defining_objective ON outcomes(defining_objective_id) WHERE archived_at IS NULL;
CREATE INDEX idx_outcomes_owner ON outcomes(owner_user_id) WHERE owner_user_id IS NOT NULL AND archived_at IS NULL;

-- CYCLES
CREATE UNIQUE INDEX idx_cycles_org_active ON cycles(org_id) WHERE is_active = TRUE;
CREATE INDEX idx_cycles_org_dates ON cycles(org_id, starts_at, ends_at);

-- COMMITMENTS
CREATE INDEX idx_commitments_user_cycle ON commitments(user_id, cycle_id);
CREATE INDEX idx_commitments_org_cycle ON commitments(org_id, cycle_id);
CREATE INDEX idx_commitments_rally_cry ON commitments(rally_cry_id) WHERE rally_cry_id IS NOT NULL;
CREATE INDEX idx_commitments_defining_objective ON commitments(defining_objective_id) WHERE defining_objective_id IS NOT NULL;
CREATE INDEX idx_commitments_outcome ON commitments(outcome_id) WHERE outcome_id IS NOT NULL;
CREATE INDEX idx_commitments_org_cycle_chess ON commitments(org_id, cycle_id, chess_category_id);
CREATE INDEX idx_commitments_assigned_by ON commitments(assigned_by, cycle_id) WHERE assigned_by IS NOT NULL;
CREATE INDEX idx_commitments_carried_from ON commitments(carried_from_id) WHERE carried_from_id IS NOT NULL;
-- TASK BULLETS
CREATE INDEX idx_task_bullets_commitment ON task_bullets(commitment_id, sort_order);

-- RECONCILIATION RECORDS
CREATE INDEX idx_reconciliation_commitment ON reconciliation_records(commitment_id);
CREATE INDEX idx_reconciliation_org_cycle ON reconciliation_records(org_id, cycle_id);
CREATE INDEX idx_reconciliation_status ON reconciliation_records(org_id, cycle_id, status);

-- ANALYST SCOPES
CREATE INDEX idx_analyst_scopes_analyst ON analyst_scopes(analyst_user_id);
