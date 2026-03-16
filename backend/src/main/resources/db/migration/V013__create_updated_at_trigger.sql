CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orgs_updated_at BEFORE UPDATE ON orgs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rally_cries_updated_at BEFORE UPDATE ON rally_cries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_defining_objectives_updated_at BEFORE UPDATE ON defining_objectives FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_outcomes_updated_at BEFORE UPDATE ON outcomes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_chess_categories_updated_at BEFORE UPDATE ON chess_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_cycles_updated_at BEFORE UPDATE ON cycles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_commitments_updated_at BEFORE UPDATE ON commitments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_task_bullets_updated_at BEFORE UPDATE ON task_bullets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
