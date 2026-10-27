CREATE TABLE ursitoare.tenant (
  tenant_id text PRIMARY KEY CHECK (tenant_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  name text NOT NULL UNIQUE CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 200),
  review_profile text NOT NULL DEFAULT 'solo' CHECK (review_profile IN ('solo', 'team')),
  mintkey_tenant_uuid uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE ursitoare.tenant ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ursitoare.tenant
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT ON TABLE ursitoare.tenant TO ursitoare_app;

CREATE TABLE ursitoare.tenant_route (
  kind text NOT NULL CHECK (kind ~ '^[a-z][a-z0-9_]{0,31}$'),
  key_hash bytea NOT NULL CHECK (octet_length(key_hash) = 32),
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, key_hash));
CREATE INDEX tenant_route_tenant_idx ON ursitoare.tenant_route (tenant_id);
REVOKE ALL ON TABLE ursitoare.tenant_route FROM PUBLIC, ursitoare_app;

CREATE FUNCTION ursitoare.register_tenant_route(p_kind text, p_key_hash bytea) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $fn$
DECLARE
  v_tenant text := nullif(current_setting('app.tenant_id', true), '');
  v_existing text;
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'tenant context is not set' USING ERRCODE = 'U0001'; END IF;
  IF p_kind IS NULL OR p_kind !~ '^[a-z][a-z0-9_]{0,31}$' OR p_key_hash IS NULL OR octet_length(p_key_hash) <> 32 THEN
    RAISE EXCEPTION 'invalid route kind or key hash' USING ERRCODE = 'U0003'; END IF;
  IF p_kind = ANY (ARRAY['idp']) AND session_user <> 'ursitoare_owner' THEN
    RAISE EXCEPTION 'route kind is reserved' USING ERRCODE = 'U0004'; END IF;
  INSERT INTO ursitoare.tenant_route (kind, key_hash, tenant_id)
  VALUES (p_kind, p_key_hash, v_tenant) ON CONFLICT (kind, key_hash) DO NOTHING;
  IF FOUND THEN RETURN true; END IF;
  SELECT r.tenant_id INTO v_existing FROM ursitoare.tenant_route r
   WHERE r.kind = p_kind AND r.key_hash = p_key_hash;
  IF v_existing IS DISTINCT FROM v_tenant THEN RAISE EXCEPTION 'route is already registered' USING ERRCODE = 'U0002'; END IF;
  RETURN false;
END
$fn$;

CREATE FUNCTION ursitoare.unregister_tenant_route(p_kind text, p_key_hash bytea) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $fn$
DECLARE v_tenant text := nullif(current_setting('app.tenant_id', true), '');
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'tenant context is not set' USING ERRCODE = 'U0001'; END IF;
  IF p_kind IS NULL OR p_kind !~ '^[a-z][a-z0-9_]{0,31}$' OR p_key_hash IS NULL OR octet_length(p_key_hash) <> 32 THEN
    RAISE EXCEPTION 'invalid route kind or key hash' USING ERRCODE = 'U0003'; END IF;
  IF p_kind = ANY (ARRAY['idp']) AND session_user <> 'ursitoare_owner' THEN
    RAISE EXCEPTION 'route kind is reserved' USING ERRCODE = 'U0004'; END IF;
  DELETE FROM ursitoare.tenant_route r
   WHERE r.kind = p_kind AND r.key_hash = p_key_hash AND r.tenant_id = v_tenant;
  RETURN FOUND;
END
$fn$;

CREATE FUNCTION ursitoare.resolve_tenant(p_kind text, p_key_hash bytea) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $fn$
  SELECT r.tenant_id FROM ursitoare.tenant_route r WHERE r.kind = p_kind AND r.key_hash = p_key_hash
$fn$;

REVOKE ALL ON FUNCTION ursitoare.register_tenant_route(text, bytea), ursitoare.unregister_tenant_route(text, bytea), ursitoare.resolve_tenant(text, bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ursitoare.register_tenant_route(text, bytea), ursitoare.unregister_tenant_route(text, bytea), ursitoare.resolve_tenant(text, bytea) TO ursitoare_app;
