CREATE TABLE ursitoare.policy_set (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  deploy_seq bigint NOT NULL CHECK (deploy_seq >= 1),
  version text NOT NULL CHECK (version ~ '^[0-9a-f]{64}$'),
  source text NOT NULL CHECK (char_length(source) <= 65536),
  grant_ids text[] NOT NULL DEFAULT '{}' CHECK (cardinality(grant_ids) <= 500),
  tenant_sources jsonb NOT NULL CHECK (jsonb_typeof(tenant_sources) = 'array'),
  tool_args jsonb NOT NULL CHECK (jsonb_typeof(tool_args) = 'object'),
  current boolean NOT NULL,
  deployed_by text NOT NULL,
  deployed_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, deploy_seq));
CREATE UNIQUE INDEX policy_set_current_idx ON ursitoare.policy_set (tenant_id) WHERE current;
ALTER TABLE ursitoare.policy_set ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.policy_set FORCE ROW LEVEL SECURITY;
CREATE POLICY policy_set_isolation ON ursitoare.policy_set USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.policy_set TO ursitoare_app;
GRANT UPDATE (current) ON TABLE ursitoare.policy_set TO ursitoare_app;
