CREATE TABLE ursitoare."user" (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  user_id text NOT NULL CHECK (user_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  kind text NOT NULL CHECK (kind IN ('human', 'service')),
  owner_user_id text,
  display_name text NOT NULL CHECK (display_name = btrim(display_name) AND char_length(display_name) BETWEEN 1 AND 200),
  email text CHECK (email IS NULL OR (email = btrim(email) AND char_length(email) BETWEEN 1 AND 320)),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id),
  CONSTRAINT user_owner_fkey FOREIGN KEY (tenant_id, owner_user_id) REFERENCES ursitoare."user" (tenant_id, user_id),
  CONSTRAINT user_kind_owner CHECK ((kind = 'human' AND owner_user_id IS NULL)
    OR (kind = 'service' AND owner_user_id IS NOT NULL AND owner_user_id <> user_id)));

CREATE TABLE ursitoare.idp_link (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  issuer text NOT NULL CHECK (char_length(issuer) BETWEEN 1 AND 2048),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 512),
  user_id text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, issuer, subject),
  CONSTRAINT idp_link_user_fkey FOREIGN KEY (tenant_id, user_id) REFERENCES ursitoare."user" (tenant_id, user_id));

CREATE TABLE ursitoare.tenant_idp (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  issuer text NOT NULL CHECK (char_length(issuer) BETWEEN 1 AND 2048 AND position(E'\n' in issuer) = 0),
  organization text NOT NULL CHECK (char_length(organization) BETWEEN 1 AND 255 AND position(E'\n' in organization) = 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, issuer, organization));

ALTER TABLE ursitoare."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare."user" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON ursitoare."user" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
ALTER TABLE ursitoare.idp_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.idp_link FORCE ROW LEVEL SECURITY;
CREATE POLICY idp_link_isolation ON ursitoare.idp_link USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
ALTER TABLE ursitoare.tenant_idp ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.tenant_idp FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_idp_isolation ON ursitoare.tenant_idp USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT ON TABLE ursitoare."user" TO ursitoare_app;
GRANT UPDATE (display_name, email, state, updated_at) ON TABLE ursitoare."user" TO ursitoare_app;
GRANT SELECT, INSERT ON TABLE ursitoare.idp_link TO ursitoare_app;
GRANT SELECT ON TABLE ursitoare.tenant_idp TO ursitoare_app;
