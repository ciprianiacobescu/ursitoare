CREATE TABLE ursitoare.effect_intent (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  idem_key text NOT NULL CHECK (idem_key ~ '^ik1_[0-9a-f]{64}$'),
  run_id text NOT NULL CHECK (run_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  node_id text NOT NULL CHECK (node_id ~ '^[a-z][a-z0-9_]{0,127}$'),
  tool text NOT NULL CHECK (char_length(tool) BETWEEN 1 AND 256),
  args_digest text NOT NULL CHECK (args_digest ~ '^[0-9a-f]{64}$'),
  mode text NOT NULL CHECK (mode IN ('live', 'mock', 'stub')),
  state text NOT NULL CHECK (state IN ('intent', 'done', 'unknown')),
  result_ref text CHECK (result_ref ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (tenant_id, idem_key),
  FOREIGN KEY (tenant_id, run_id) REFERENCES ursitoare.run (tenant_id, run_id),
  CHECK ((state = 'done') = (result_ref IS NOT NULL) AND (state = 'done') = (completed_at IS NOT NULL)));
CREATE INDEX effect_intent_run_idx ON ursitoare.effect_intent (tenant_id, run_id);
ALTER TABLE ursitoare.effect_intent ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.effect_intent FORCE ROW LEVEL SECURITY;
CREATE POLICY effect_intent_isolation ON ursitoare.effect_intent USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.effect_intent TO ursitoare_app;
GRANT UPDATE (state, result_ref, completed_at) ON TABLE ursitoare.effect_intent TO ursitoare_app;
CREATE FUNCTION ursitoare.effect_intent_check_transition() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $fn$
BEGIN
  IF (OLD.state, NEW.state) NOT IN (('intent', 'done'), ('intent', 'unknown'), ('unknown', 'done')) THEN
    RAISE EXCEPTION 'effect intent transition is not allowed' USING ERRCODE = 'U3401';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER effect_intent_transition BEFORE UPDATE ON ursitoare.effect_intent
  FOR EACH ROW EXECUTE FUNCTION ursitoare.effect_intent_check_transition();
