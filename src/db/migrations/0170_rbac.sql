CREATE TABLE ursitoare.role (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  role_id text NOT NULL CHECK (role_id ~ '^[a-z][a-z0-9_]{0,31}$'),
  PRIMARY KEY (tenant_id, role_id));
CREATE TABLE ursitoare.team (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  team_id text NOT NULL CHECK (team_id ~ '^[a-z][a-z0-9_-]{0,63}$'),
  PRIMARY KEY (tenant_id, team_id));
CREATE TABLE ursitoare.idp_group_map (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  issuer text NOT NULL,
  group_name text NOT NULL,
  role_id text,
  team_id text,
  reviewed_by text NOT NULL,
  PRIMARY KEY (tenant_id, issuer, group_name),
  FOREIGN KEY (tenant_id, role_id) REFERENCES ursitoare.role (tenant_id, role_id),
  FOREIGN KEY (tenant_id, team_id) REFERENCES ursitoare.team (tenant_id, team_id),
  CHECK (num_nonnulls(role_id, team_id) = 1));
CREATE TABLE ursitoare.membership (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  membership_id text NOT NULL CHECK (membership_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  user_id text NOT NULL,
  role_id text,
  team_id text,
  source text NOT NULL CHECK (source IN ('idp_claim', 'local')),
  source_issuer text NOT NULL DEFAULT '',
  granted_by text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, membership_id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES ursitoare."user" (tenant_id, user_id),
  FOREIGN KEY (tenant_id, role_id) REFERENCES ursitoare.role (tenant_id, role_id),
  FOREIGN KEY (tenant_id, team_id) REFERENCES ursitoare.team (tenant_id, team_id),
  CHECK (num_nonnulls(role_id, team_id) = 1),
  CHECK ((source = 'idp_claim' AND source_issuer <> '' AND granted_by IS NULL)
    OR (source = 'local' AND source_issuer = '' AND role_id IS NOT NULL AND granted_by IS NOT NULL)));
CREATE UNIQUE INDEX membership_role_uq ON ursitoare.membership (tenant_id, user_id, role_id, source, source_issuer) WHERE role_id IS NOT NULL;
CREATE UNIQUE INDEX membership_team_uq ON ursitoare.membership (tenant_id, user_id, team_id, source, source_issuer) WHERE team_id IS NOT NULL;
CREATE INDEX membership_user_idx ON ursitoare.membership (tenant_id, user_id);
DO $do$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['role', 'team', 'idp_group_map', 'membership'] LOOP
    EXECUTE format('ALTER TABLE ursitoare.%I ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I ON ursitoare.%I USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true))$p$, t || '_isolation', t);
  END LOOP;
END $do$;
GRANT SELECT ON TABLE ursitoare.role TO ursitoare_app;
GRANT SELECT, INSERT, DELETE ON TABLE ursitoare.team, ursitoare.idp_group_map, ursitoare.membership TO ursitoare_app;
GRANT UPDATE (role_id, team_id, reviewed_by) ON TABLE ursitoare.idp_group_map TO ursitoare_app;
GRANT UPDATE (synced_at) ON TABLE ursitoare.membership TO ursitoare_app;
CREATE FUNCTION ursitoare.seed_default_roles(p_tenant_id text) RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, ursitoare, pg_temp AS $fn$
DECLARE v_prev text := current_setting('app.tenant_id', true);
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id, true);
  INSERT INTO ursitoare.role (tenant_id, role_id)
  VALUES (p_tenant_id, 'tenant_admin'), (p_tenant_id, 'author'), (p_tenant_id, 'approver'), (p_tenant_id, 'auditor')
  ON CONFLICT DO NOTHING;
  PERFORM set_config('app.tenant_id', coalesce(v_prev, ''), true);
END
$fn$;
CREATE FUNCTION ursitoare.tenant_default_roles() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, ursitoare, pg_temp AS $fn$
BEGIN
  PERFORM ursitoare.seed_default_roles(NEW.tenant_id);
  RETURN NEW;
END
$fn$;
CREATE TRIGGER tenant_default_roles AFTER INSERT ON ursitoare.tenant
  FOR EACH ROW EXECUTE FUNCTION ursitoare.tenant_default_roles();
REVOKE ALL ON FUNCTION ursitoare.seed_default_roles(text), ursitoare.tenant_default_roles() FROM PUBLIC;
SELECT ursitoare.seed_default_roles(tenant_id) FROM ursitoare.tenant;
