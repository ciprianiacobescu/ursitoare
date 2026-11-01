# Data model of add-flow-registry

`src/db/migrations/0270_flow_registry.sql`, verbatim (the runner supplies the transaction).

```sql
CREATE TABLE ursitoare.flow (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  flow_id text NOT NULL CHECK (flow_id ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' AND char_length(flow_id) <= 64),
  owner_team text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL,
  last_no integer NOT NULL DEFAULT 0 CHECK (last_no >= 0),
  PRIMARY KEY (tenant_id, flow_id),
  FOREIGN KEY (tenant_id, owner_team) REFERENCES ursitoare.team (tenant_id, team_id),
  FOREIGN KEY (tenant_id, created_by) REFERENCES ursitoare."user" (tenant_id, user_id));
CREATE INDEX flow_owner_team_idx ON ursitoare.flow (tenant_id, owner_team, flow_id);
CREATE TABLE ursitoare.flow_version (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  content_hash text NOT NULL CHECK (content_hash ~ '^sha256:[0-9a-f]{64}$'),
  flow_id text NOT NULL,
  version_no integer NOT NULL CHECK (version_no >= 1),
  source_surface text NOT NULL CHECK (source_surface IN ('yaml', 'json')),
  source_text text NOT NULL,
  canonical jsonb NOT NULL,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'validated', 'tested', 'reviewed', 'published', 'deprecated')),
  author text NOT NULL,
  requested_by text,
  created_at timestamptz NOT NULL,
  validation jsonb,
  validated_at timestamptz,
  PRIMARY KEY (tenant_id, content_hash),
  UNIQUE (tenant_id, flow_id, version_no),
  FOREIGN KEY (tenant_id, flow_id) REFERENCES ursitoare.flow (tenant_id, flow_id),
  FOREIGN KEY (tenant_id, author) REFERENCES ursitoare."user" (tenant_id, user_id),
  FOREIGN KEY (tenant_id, requested_by) REFERENCES ursitoare."user" (tenant_id, user_id),
  CHECK ((validation IS NULL) = (validated_at IS NULL)));
ALTER TABLE ursitoare.flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.flow FORCE ROW LEVEL SECURITY;
CREATE POLICY flow_isolation ON ursitoare.flow USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
ALTER TABLE ursitoare.flow_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.flow_version FORCE ROW LEVEL SECURITY;
CREATE POLICY flow_version_isolation ON ursitoare.flow_version USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.flow, ursitoare.flow_version TO ursitoare_app;
GRANT UPDATE (last_no) ON TABLE ursitoare.flow TO ursitoare_app;
GRANT UPDATE (state, validation, validated_at) ON TABLE ursitoare.flow_version TO ursitoare_app;
```
