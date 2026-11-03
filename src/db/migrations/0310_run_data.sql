CREATE TABLE ursitoare.envelope_payload (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  media_type text NOT NULL DEFAULT 'application/json',
  size integer NOT NULL CHECK (size BETWEEN 1 AND 1048576),
  data jsonb NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  PRIMARY KEY (tenant_id, sha256));
ALTER TABLE ursitoare.envelope_payload ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY envelope_payload_isolation ON ursitoare.envelope_payload
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.envelope_payload TO ursitoare_app;

CREATE TABLE ursitoare.run (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  run_id text NOT NULL,
  lineage_id text NOT NULL,
  parent_run_id text,
  flow_id text NOT NULL,
  flow_hash text NOT NULL,
  owner_team text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('live', 'mock', 'stub')),
  trigger text NOT NULL CHECK (trigger IN ('test')),
  state text NOT NULL CHECK (state IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  principal_user_id text NOT NULL,
  principal_kind text NOT NULL CHECK (principal_kind IN ('human', 'service')),
  actor_chain text[] NOT NULL DEFAULT '{}',
  input_ref text CHECK (input_ref IS NULL OR input_ref ~ '^[0-9a-f]{64}$'),
  mocks_ref text CHECK (mocks_ref IS NULL OR mocks_ref ~ '^[0-9a-f]{64}$'),
  output_ref text CHECK (output_ref IS NULL OR output_ref ~ '^[0-9a-f]{64}$'),
  error jsonb,
  terminal_node text,
  run_day date NOT NULL,
  created_at timestamptz NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  PRIMARY KEY (tenant_id, run_id));
CREATE INDEX run_created_idx ON ursitoare.run (tenant_id, created_at DESC, run_id COLLATE "C" DESC);
ALTER TABLE ursitoare.run ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY run_isolation ON ursitoare.run
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.run TO ursitoare_app;
GRANT UPDATE (state, output_ref, error, terminal_node, started_at, ended_at)
  ON TABLE ursitoare.run TO ursitoare_app;

CREATE TABLE ursitoare.step_execution (
  tenant_id text NOT NULL,
  run_day date NOT NULL,
  run_id text NOT NULL,
  node_id text NOT NULL,
  effect_seq integer NOT NULL CHECK (effect_seq >= 0),
  turn integer NOT NULL CHECK (turn >= 0),
  attempt integer NOT NULL CHECK (attempt >= 1),
  generation integer NOT NULL CHECK (generation >= 0),
  seq integer NOT NULL CHECK (seq >= 0),
  kind text NOT NULL,
  state text NOT NULL CHECK (state IN ('started', 'completed', 'failed', 'skipped')),
  input_ref text CHECK (input_ref IS NULL OR input_ref ~ '^[0-9a-f]{64}$'),
  output_ref text CHECK (output_ref IS NULL OR output_ref ~ '^[0-9a-f]{64}$'),
  outcome text,
  error jsonb,
  taint text[] NOT NULL DEFAULT '{}',
  policy_decision_id text,
  idem_key text,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  PRIMARY KEY (tenant_id, run_day, run_id, node_id, effect_seq, turn, attempt, generation),
  UNIQUE (tenant_id, run_day, run_id, seq),
  FOREIGN KEY (tenant_id, run_id) REFERENCES ursitoare.run (tenant_id, run_id)
) PARTITION BY RANGE (run_day);
COMMENT ON TABLE ursitoare.step_execution IS 'partition: day';
CREATE TABLE ursitoare.step_execution_default PARTITION OF ursitoare.step_execution DEFAULT;
ALTER TABLE ursitoare.step_execution ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY step_execution_isolation ON ursitoare.step_execution
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.step_execution TO ursitoare_app;
GRANT UPDATE (kind, state, input_ref, output_ref, outcome, error, taint, policy_decision_id, idem_key, ended_at)
  ON TABLE ursitoare.step_execution TO ursitoare_app;

CREATE TABLE ursitoare.event (
  tenant_id text NOT NULL,
  event_id text NOT NULL,
  "time" timestamptz NOT NULL,
  run_id text,
  correlation_id text,
  type text NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (tenant_id, event_id, "time")
) PARTITION BY RANGE ("time");
COMMENT ON TABLE ursitoare.event IS 'partition: month';
CREATE TABLE ursitoare.event_default PARTITION OF ursitoare.event DEFAULT;
ALTER TABLE ursitoare.event ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY event_isolation ON ursitoare.event
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.event TO ursitoare_app;
