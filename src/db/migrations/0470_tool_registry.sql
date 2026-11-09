CREATE TABLE ursitoare.tool_server (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  tool_server_id text NOT NULL CHECK (tool_server_id ~ '^[a-z][a-z0-9_]{0,31}$'),
  adapter text NOT NULL CHECK (adapter IN ('fixture', 'mcp', 'http_openapi', 'code_block')),
  origin text NOT NULL,
  local boolean NOT NULL,
  state text NOT NULL CHECK (state IN ('pending', 'approved', 'drifted')),
  approved_digest text CHECK (approved_digest IS NULL OR approved_digest ~ '^sha256:[0-9a-f]{64}$'),
  registered_by text NOT NULL,
  registered_at timestamptz NOT NULL,
  CHECK ((state = 'pending') = (approved_digest IS NULL)),
  PRIMARY KEY (tenant_id, tool_server_id));
ALTER TABLE ursitoare.tool_server ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY tool_server_isolation ON ursitoare.tool_server
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.tool_server TO ursitoare_app;
GRANT UPDATE (state, approved_digest) ON TABLE ursitoare.tool_server TO ursitoare_app;

CREATE TABLE ursitoare.tool_surface (
  tenant_id text NOT NULL,
  tool_server_id text NOT NULL,
  surface_digest text NOT NULL CHECK (surface_digest ~ '^sha256:[0-9a-f]{64}$'),
  surface jsonb NOT NULL CHECK (jsonb_typeof(surface) = 'object'),
  submitted_by text NOT NULL,
  submitted_at timestamptz NOT NULL,
  approved_by text,
  approved_at timestamptz,
  self_approved boolean,
  CHECK (
    (approved_by IS NULL AND approved_at IS NULL AND self_approved IS NULL)
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND self_approved IS NOT NULL)),
  FOREIGN KEY (tenant_id, tool_server_id)
    REFERENCES ursitoare.tool_server (tenant_id, tool_server_id),
  PRIMARY KEY (tenant_id, tool_server_id, surface_digest));
CREATE INDEX tool_surface_newest_idx
  ON ursitoare.tool_surface (tenant_id, tool_server_id, submitted_at DESC, surface_digest DESC);
ALTER TABLE ursitoare.tool_surface ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY tool_surface_isolation ON ursitoare.tool_surface
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.tool_surface TO ursitoare_app;
GRANT UPDATE (approved_by, approved_at, self_approved) ON TABLE ursitoare.tool_surface TO ursitoare_app;
