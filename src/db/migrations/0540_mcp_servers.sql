CREATE TABLE ursitoare.mcp_server (
  tenant_id text NOT NULL,
  tool_server_id text NOT NULL,
  endpoint text NOT NULL,
  registered_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, tool_server_id),
  FOREIGN KEY (tenant_id, tool_server_id)
    REFERENCES ursitoare.tool_server (tenant_id, tool_server_id),
  CHECK (char_length(endpoint) BETWEEN 1 AND 1024 AND endpoint ~ '^/[\x21-\x7e]*$' AND endpoint !~ '[?#]')
);
ALTER TABLE ursitoare.mcp_server ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY mcp_server_isolation ON ursitoare.mcp_server
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.mcp_server TO ursitoare_app;