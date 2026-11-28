# Test plan (data): add-keycloak-realm

The two data files, the script checker and its rows. Every value ran (`test-plan.md` header).

## The realm template (`deploy/keycloak/import/ursitoare-realm.json`)

It parses as JSON and, rendered with `ENV` of `test-plan.md`, gives no problem. The test `the committed template is the realm of the test plan` holds this document as a literal and compares it with `JSON.parse(readRealmTemplate())` by deep equality, so key order and indentation are free; every value is fixed. The three flows are the ones a probe on the pinned Keycloak 26.8.1 image created through the admin API (the cards' author, 2026-11-25) and signed in through on one page; every other key is Keycloak's realm representation, not run here (`design.md` § UNVERIFIED). The post-logout value differs from the probed card text by design decision 4.

```json
{
  "realm": "ursitoare",
  "enabled": true,
  "sslRequired": "external",
  "registrationAllowed": false,
  "organizationsEnabled": true,
  "browserFlow": "browser-single-page",
  "authenticationFlows": [
    {
      "alias": "browser-single-page",
      "description": "browser login on one page",
      "providerId": "basic-flow",
      "topLevel": true,
      "builtIn": false,
      "authenticationExecutions": [
        { "authenticator": "auth-cookie", "authenticatorFlow": false, "requirement": "ALTERNATIVE", "priority": 10, "userSetupAllowed": false },
        { "authenticator": "identity-provider-redirector", "authenticatorFlow": false, "requirement": "ALTERNATIVE", "priority": 25, "userSetupAllowed": false },
        { "authenticatorFlow": true, "requirement": "ALTERNATIVE", "priority": 30, "flowAlias": "browser-single-page forms", "userSetupAllowed": false }
      ]
    },
    {
      "alias": "browser-single-page forms",
      "description": "username, password, conditional OTP",
      "providerId": "basic-flow",
      "topLevel": false,
      "builtIn": false,
      "authenticationExecutions": [
        { "authenticator": "auth-username-password-form", "authenticatorFlow": false, "requirement": "REQUIRED", "priority": 10, "userSetupAllowed": false },
        { "authenticatorFlow": true, "requirement": "CONDITIONAL", "priority": 20, "flowAlias": "browser-single-page otp", "userSetupAllowed": false }
      ]
    },
    {
      "alias": "browser-single-page otp",
      "description": "OTP when the user has one",
      "providerId": "basic-flow",
      "topLevel": false,
      "builtIn": false,
      "authenticationExecutions": [
        { "authenticator": "conditional-user-configured", "authenticatorFlow": false, "requirement": "REQUIRED", "priority": 10, "userSetupAllowed": false },
        { "authenticator": "auth-otp-form", "authenticatorFlow": false, "requirement": "REQUIRED", "priority": 20, "userSetupAllowed": false }
      ]
    }
  ],
  "groups": [
    { "name": "ursitoare-admins" },
    { "name": "ursitoare-authors" },
    { "name": "team-default" }
  ],
  "clients": [
    {
      "clientId": "ursitoare-engine",
      "enabled": true,
      "publicClient": false,
      "secret": "${KC_URSITOARE_CLIENT_SECRET}",
      "standardFlowEnabled": true,
      "implicitFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "serviceAccountsEnabled": false,
      "redirectUris": ["${KC_URSITOARE_REDIRECT_URI}"],
      "attributes": {
        "pkce.code.challenge.method": "S256",
        "post.logout.redirect.uris": "${KC_URSITOARE_POST_LOGOUT_URI}##${KC_URSITOARE_REDIRECT_URI}"
      },
      "defaultClientScopes": ["web-origins", "acr", "profile", "roles", "basic", "email"],
      "optionalClientScopes": ["organization"],
      "protocolMappers": [
        {
          "name": "groups",
          "protocol": "openid-connect",
          "protocolMapper": "oidc-group-membership-mapper",
          "config": {
            "claim.name": "groups",
            "full.path": "false",
            "id.token.claim": "true",
            "access.token.claim": "true",
            "userinfo.token.claim": "true"
          }
        }
      ]
    },
    {
      "clientId": "ursitoare-mcp",
      "enabled": true,
      "publicClient": true,
      "standardFlowEnabled": true,
      "implicitFlowEnabled": false,
      "directAccessGrantsEnabled": false,
      "serviceAccountsEnabled": false,
      "redirectUris": ["http://127.0.0.1/*", "http://localhost/*"],
      "attributes": { "pkce.code.challenge.method": "S256" },
      "protocolMappers": [
        {
          "name": "ursitoare-mcp-audience",
          "protocol": "openid-connect",
          "protocolMapper": "oidc-audience-mapper",
          "config": {
            "included.custom.audience": "ursitoare-mcp",
            "access.token.claim": "true"
          }
        }
      ]
    }
  ],
  "users": [
    {
      "username": "${KC_URSITOARE_FIRST_USER}",
      "enabled": true,
      "credentials": [
        { "type": "password", "value": "${KC_URSITOARE_FIRST_PASSWORD}", "temporary": true }
      ],
      "groups": ["/ursitoare-admins", "/ursitoare-authors", "/team-default"]
    }
  ],
  "organizations": [
    {
      "name": "${KC_URSITOARE_ORGANIZATION:home}",
      "alias": "${KC_URSITOARE_ORGANIZATION:home}",
      "enabled": true,
      "domains": [],
      "members": [{ "username": "${KC_URSITOARE_FIRST_USER}" }]
    }
  ]
}
```

## The init script (`deploy/postgres/initdb/10-keycloak.sh`, byte for byte)

```sh
#!/bin/bash
# Runs once, on an empty data directory, as the postgres superuser: creates Keycloak's role and database.
# psql reads the password from the secret file itself, so it is on no command line and in no output.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'
\set kc_password `cat /run/secrets/db_keycloak_password`
CREATE ROLE keycloak LOGIN PASSWORD :'kc_password';
CREATE DATABASE keycloak OWNER keycloak;
SQL
```

**The checker `scriptProblems(text)`** (a function in `initdb-keycloak.test.ts`; reference text, ran on Node 24.22.2):

```ts
const SECRET = "/run/secrets/db_keycloak_password";
function scriptProblems(text: string): string[] {
  const out: string[] = [];
  const lines = text.split("\n");
  const code = lines.filter((l) => l.trim() !== "" && !l.trim().startsWith("#"));
  if (lines[0] !== "#!/bin/bash") out.push("script: first line is not #!/bin/bash");
  const verbs = code.map((l) => l.trim()).filter((l) => /^(create|drop|alter|grant|revoke|insert|update|delete|truncate|copy|do|call)\b/i.test(l));
  const role = /^CREATE ROLE keycloak LOGIN PASSWORD :'([a-z_]+)';$/i.exec(verbs[0] ?? "");
  const db = /^CREATE DATABASE keycloak OWNER keycloak;$/i.test(verbs[1] ?? "");
  if (verbs.length !== 2 || role === null || !db) out.push("script: statements are not exactly CREATE ROLE keycloak LOGIN PASSWORD and CREATE DATABASE keycloak OWNER keycloak");
  const set = code.find((l) => l.trim().startsWith("\\set "));
  const setOk = set !== undefined && role !== null && set.trim() === `\\set ${role[1]} \`cat ${SECRET}\``;
  const secretRefs = code.filter((l) => l.includes("/run/secrets/"));
  if (!setOk || secretRefs.length !== 1) out.push(`script: the password is not read from ${SECRET} by a psql \\set`);
  if (code.some((l) => /PGPASSWORD|POSTGRES_PASSWORD|\becho\b|\bprintf\b|--password|--set\b|\s-W\b|\s-v\s+(?!ON_ERROR_STOP=1\b)/.test(l))) out.push("script: the password could reach a command line, the environment or output");
  if (!code.some((l) => /^psql\b.*\s-v ON_ERROR_STOP=1\b/.test(l.trim()))) out.push("script: psql is not run with -v ON_ERROR_STOP=1");
  if (code.some((l) => /ursitoare/i.test(l))) out.push("script: names a database or role other than keycloak");
  if (code.some((l) => /^\s*(exit\b|set\s+-)/.test(l))) out.push("script: changes shell options or exits");
  return out;
}
```

**Script rows** (scenario "Each deviation of the init script gives its own problem"; each edits the committed text; the unedited text answers `[]`):

| # | Edit | `scriptProblems` answers |
|---|---|---|
| 1 | `:'kc_password'` is replaced by `'abc'` (a literal password) | `script: statements are not exactly CREATE ROLE keycloak LOGIN PASSWORD and CREATE DATABASE keycloak OWNER keycloak`; `script: the password is not read from /run/secrets/db_keycloak_password by a psql \set` |
| 2 | ` -v ON_ERROR_STOP=1` is removed | `script: psql is not run with -v ON_ERROR_STOP=1` |
| 3 | `db_keycloak_password` becomes `db_superuser_password` | `script: the password is not read from /run/secrets/db_keycloak_password by a psql \set` |
| 4 | a line ``\set other `cat /run/secrets/db_app_password` `` is added before `CREATE ROLE` | `script: the password is not read from /run/secrets/db_keycloak_password by a psql \set` |
| 5 | the line `echo "$POSTGRES_PASSWORD"` is added before `psql` | `script: the password could reach a command line, the environment or output` |
| 6 | the line `ALTER ROLE keycloak SUPERUSER;` is added before `CREATE DATABASE` | `script: statements are not exactly CREATE ROLE keycloak LOGIN PASSWORD and CREATE DATABASE keycloak OWNER keycloak` |
| 7 | the line `CREATE DATABASE ursitoare;` is added after the database statement | `script: statements are not exactly CREATE ROLE keycloak LOGIN PASSWORD and CREATE DATABASE keycloak OWNER keycloak`; `script: names a database or role other than keycloak` |
| 8 | the line `exit 0` is appended | `script: changes shell options or exits` |
| 9 | the line `set -u` is added before `psql` | `script: changes shell options or exits` |
| 10 | the first line is removed | `script: first line is not #!/bin/bash` |
| 11 | `psql -v` becomes `psql -v kc_password=x -v` | `script: the password could reach a command line, the environment or output` |

