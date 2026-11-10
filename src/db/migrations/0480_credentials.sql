CREATE TABLE ursitoare.credential_ref (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  credential_id text NOT NULL CHECK (credential_id ~ '^cred_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  tool_server_id text NOT NULL,
  mintkey_service_id text NOT NULL CHECK (mintkey_service_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  auth_scheme text NOT NULL CHECK (auth_scheme IN ('API_KEY_HEADER', 'BEARER_TOKEN')),
  header_name text,
  target_origin text NOT NULL CHECK (target_origin ~ '^https?://[^/?#@[:space:]]+$'),
  key_version integer NOT NULL CHECK (key_version >= 1),
  provisioned_by text NOT NULL,
  provisioned_at timestamptz NOT NULL,
  rotated_at timestamptz,
  CHECK ((auth_scheme = 'BEARER_TOKEN') = (header_name IS NULL)),
  CHECK (header_name IS NULL OR (
    header_name ~ '^[A-Za-z0-9-]{1,64}$'
    AND lower(header_name) NOT IN ('authorization', 'x-ursitoare-call', 'host', 'cookie',
      'proxy-authorization', 'connection', 'content-length', 'transfer-encoding', 'upgrade',
      'te', 'trailer'))),
  CONSTRAINT credential_ref_pkey PRIMARY KEY (tenant_id, credential_id),
  CONSTRAINT credential_ref_server_key UNIQUE (tenant_id, tool_server_id),
  CONSTRAINT credential_ref_service_key UNIQUE (tenant_id, mintkey_service_id),
  CONSTRAINT credential_ref_tool_server_fkey FOREIGN KEY (tenant_id, tool_server_id)
    REFERENCES ursitoare.tool_server (tenant_id, tool_server_id));
ALTER TABLE ursitoare.credential_ref ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY credential_ref_isolation ON ursitoare.credential_ref
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.credential_ref TO ursitoare_app;
GRANT UPDATE (key_version, rotated_at) ON TABLE ursitoare.credential_ref TO ursitoare_app;
