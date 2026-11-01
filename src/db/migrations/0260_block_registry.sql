CREATE TABLE ursitoare.block_version (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  ref text NOT NULL CHECK (char_length(ref) <= 128 AND ref ~ '^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$'),
  effect text NOT NULL CHECK (effect IN ('read', 'write', 'send', 'pay')),
  description text CHECK (char_length(description) <= 2000),
  input jsonb NOT NULL CHECK (jsonb_typeof(input) = 'object'),
  output jsonb NOT NULL CHECK (jsonb_typeof(output) = 'object'),
  untrusted_fields text[] NOT NULL DEFAULT '{}',
  data_class text CHECK (data_class IN ('public', 'private')),
  untrusted_result boolean NOT NULL DEFAULT false,
  unsafe_to_retry boolean NOT NULL DEFAULT false,
  binding jsonb CHECK (jsonb_typeof(binding) = 'object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  imported_by text NOT NULL CHECK (char_length(imported_by) BETWEEN 1 AND 200),
  imported_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, ref));
ALTER TABLE ursitoare.block_version ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY block_version_isolation ON ursitoare.block_version
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.block_version TO ursitoare_app;
