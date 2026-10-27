CREATE TABLE ursitoare.audit_head (
  tenant_id text PRIMARY KEY REFERENCES ursitoare.tenant (tenant_id),
  seq bigint NOT NULL CHECK (seq >= 0),
  hash bytea NOT NULL CHECK (octet_length(hash) = 32));
CREATE TABLE ursitoare.audit_event (
  tenant_id text NOT NULL,
  seq bigint NOT NULL CHECK (seq >= 1),
  at timestamptz NOT NULL,
  prev_hash bytea NOT NULL CHECK (octet_length(prev_hash) = 32),
  hash bytea NOT NULL CHECK (octet_length(hash) = 32),
  event_type text NOT NULL CHECK (event_type ~ '^[a-z][a-z0-9_.]{0,63}$'),
  actor jsonb NOT NULL,
  target jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  origin text NOT NULL DEFAULT 'ursitoare' CHECK (origin IN ('ursitoare', 'mintkey')),
  mk_trace_id text, mk_request_id text, mk_jti text,
  CHECK (origin = 'mintkey' OR (mk_trace_id IS NULL AND mk_request_id IS NULL AND mk_jti IS NULL)),
  PRIMARY KEY (tenant_id, seq, at)) PARTITION BY RANGE (at);
COMMENT ON TABLE ursitoare.audit_event IS 'partition: month';
CREATE TABLE ursitoare.audit_event_default PARTITION OF ursitoare.audit_event DEFAULT;
CREATE TABLE ursitoare.audit_anchor (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  seq bigint NOT NULL CHECK (seq >= 1),
  hash bytea NOT NULL CHECK (octet_length(hash) = 32),
  mac bytea NOT NULL CHECK (octet_length(mac) = 32),
  at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, seq));
ALTER TABLE ursitoare.audit_head ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.audit_event ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.audit_anchor ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_head_isolation ON ursitoare.audit_head
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY audit_event_isolation ON ursitoare.audit_event
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
CREATE POLICY audit_anchor_isolation ON ursitoare.audit_anchor
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.audit_head TO ursitoare_app;
GRANT UPDATE (seq, hash) ON TABLE ursitoare.audit_head TO ursitoare_app;
GRANT SELECT, INSERT ON TABLE ursitoare.audit_event TO ursitoare_app;
GRANT SELECT, INSERT ON TABLE ursitoare.audit_anchor TO ursitoare_app;

CREATE FUNCTION ursitoare.audit_reject_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $fn$
BEGIN
  RAISE EXCEPTION 'audit rows are append-only' USING ERRCODE = 'U0801';
END;
$fn$;
CREATE FUNCTION ursitoare.audit_check_head() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ursitoare.audit_head h
                  WHERE h.tenant_id = NEW.tenant_id AND h.seq = NEW.seq AND h.hash = NEW.hash) THEN
    RAISE EXCEPTION 'audit event does not match the chain head' USING ERRCODE = 'U0802';
  END IF;
  RETURN NEW;
END;
$fn$;
CREATE TRIGGER audit_event_append_only BEFORE UPDATE OR DELETE ON ursitoare.audit_event
  FOR EACH ROW EXECUTE FUNCTION ursitoare.audit_reject_change();
CREATE TRIGGER audit_event_head_match BEFORE INSERT ON ursitoare.audit_event
  FOR EACH ROW EXECUTE FUNCTION ursitoare.audit_check_head();
CREATE TRIGGER audit_anchor_append_only BEFORE UPDATE OR DELETE ON ursitoare.audit_anchor
  FOR EACH ROW EXECUTE FUNCTION ursitoare.audit_reject_change();
