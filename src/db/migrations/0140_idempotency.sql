CREATE TABLE ursitoare.idempotency_key (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id) ON DELETE CASCADE,
  principal_id text NOT NULL CHECK (char_length(principal_id) BETWEEN 1 AND 200),
  key text NOT NULL CHECK (key ~ '^[!-~]{1,128}$'),
  request_digest text NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  state text NOT NULL CHECK (state IN ('in_progress', 'done')),
  response_status integer CHECK (response_status BETWEEN 100 AND 599),
  response_body jsonb,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, principal_id, key),
  CONSTRAINT idempotency_key_state_shape CHECK (
    (state = 'in_progress' AND response_status IS NULL AND response_body IS NULL)
    OR (state = 'done' AND response_status IS NOT NULL AND response_body IS NOT NULL)));
CREATE INDEX idempotency_key_created_idx ON ursitoare.idempotency_key (tenant_id, created_at);
ALTER TABLE ursitoare.idempotency_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.idempotency_key FORCE ROW LEVEL SECURITY;
CREATE POLICY idempotency_key_isolation ON ursitoare.idempotency_key
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ursitoare.idempotency_key TO ursitoare_app;
