CREATE TABLE ursitoare."grant" (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  grant_id text NOT NULL CHECK (grant_id ~ '^grant_[A-Za-z0-9-]{1,64}$'),
  subject_kind text NOT NULL CHECK (subject_kind IN ('role', 'user')),
  subject_id text NOT NULL,
  tool text NOT NULL CHECK (char_length(tool) <= 128 AND tool ~ '^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$'),
  scope_kind text NOT NULL CHECK (scope_kind IN ('any_step', 'node')),
  flow_id text,
  node_id text,
  args jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(args) = 'array' AND jsonb_array_length(args) <= 8),
  fingerprints text[] NOT NULL DEFAULT '{}' CHECK (cardinality(fingerprints) = 0 OR array_to_string(fingerprints, ',') ~ '^nf1_[0-9a-f]{64}(,nf1_[0-9a-f]{64})*$'),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'revoked')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL,
  revoked_by text,
  revoked_at timestamptz,
  PRIMARY KEY (tenant_id, grant_id),
  CHECK ((scope_kind = 'any_step' AND flow_id IS NULL AND node_id IS NULL AND cardinality(fingerprints) = 0)
    OR (scope_kind = 'node' AND flow_id IS NOT NULL AND node_id IS NOT NULL AND cardinality(fingerprints) >= 1)),
  CHECK ((state = 'active' AND revoked_by IS NULL AND revoked_at IS NULL)
    OR (state = 'revoked' AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL)));
ALTER TABLE ursitoare."grant" ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY grant_isolation ON ursitoare."grant"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare."grant" TO ursitoare_app;
GRANT UPDATE (fingerprints, state, revoked_by, revoked_at) ON TABLE ursitoare."grant" TO ursitoare_app;
