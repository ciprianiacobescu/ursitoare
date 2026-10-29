CREATE TABLE ursitoare.session (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  session_id_hash bytea NOT NULL CHECK (octet_length(session_id_hash) = 32),
  user_id text NOT NULL,
  created_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  idle_timeout_s integer NOT NULL CHECK (idle_timeout_s BETWEEN 60 AND 86400),
  csrf_token_hash bytea NOT NULL CHECK (octet_length(csrf_token_hash) = 32),
  end_session_hint text,
  revoked_at timestamptz,
  PRIMARY KEY (tenant_id, session_id_hash),
  CONSTRAINT session_user_fkey FOREIGN KEY (tenant_id, user_id) REFERENCES ursitoare."user" (tenant_id, user_id),
  CONSTRAINT session_times CHECK (expires_at > created_at));
CREATE INDEX session_live_idx ON ursitoare.session (tenant_id, expires_at) WHERE revoked_at IS NULL;
ALTER TABLE ursitoare.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.session FORCE ROW LEVEL SECURITY;
CREATE POLICY session_isolation ON ursitoare.session
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.session TO ursitoare_app;
GRANT UPDATE (last_seen_at, csrf_token_hash, revoked_at) ON TABLE ursitoare.session TO ursitoare_app;
