CREATE TABLE ursitoare.policy_decision (
  tenant_id text NOT NULL CHECK (char_length(tenant_id) BETWEEN 1 AND 64),
  decided_at timestamptz NOT NULL,
  decision_id text NOT NULL CHECK (char_length(decision_id) BETWEEN 1 AND 128),
  run_id text CHECK (char_length(run_id) BETWEEN 1 AND 128),
  node_id text CHECK (char_length(node_id) BETWEEN 1 AND 128),
  action text NOT NULL CHECK (char_length(action) <= 128),
  principal text NOT NULL CHECK (char_length(principal) <= 512),
  resource text NOT NULL CHECK (char_length(resource) <= 512),
  decision text NOT NULL CHECK (decision IN ('allow', 'deny')),
  reasons text[] NOT NULL DEFAULT '{}',
  errors text[] NOT NULL DEFAULT '{}',
  policy_set_version text NOT NULL CHECK (policy_set_version ~ '^[0-9a-f]{64}$'),
  request_digest text NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  permit jsonb CHECK (permit IS NULL OR decision = 'allow'),
  PRIMARY KEY (tenant_id, decision_id, decided_at)
) PARTITION BY RANGE (decided_at);
COMMENT ON TABLE ursitoare.policy_decision IS 'partition: month';
CREATE TABLE ursitoare.policy_decision_default PARTITION OF ursitoare.policy_decision DEFAULT;
ALTER TABLE ursitoare.policy_decision ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.policy_decision FORCE ROW LEVEL SECURITY;
CREATE POLICY policy_decision_isolation ON ursitoare.policy_decision
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.policy_decision TO ursitoare_app;
