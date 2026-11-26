# Delivered shapes taken by add-hobbyist-compose

Declarations from main@31968a29 (`file:line`; `…` elides unused members), each read in the file named. U01, U02, U12, U20, U30 and U46 are merged and archived; in-plan names are in those folders' Interfaces given.

```ts
// src/config (U01, U46, U12)
config/config.ts:15      export type Env = Readonly<Record<string, string | undefined>>
config/config.ts:134-147 refuseSecretShapedVariables: URSITOARE_<…PASSWORD|SECRET|TOKEN|KEY> not ending _FILE throws CONFIG_INVALID `<name>: secrets are read only from files; set <name>_FILE`
config/config.ts:188-210 readDatabaseEndpoint: a password file without its URL variable throws `<file variable>: set only together with <url variable>` (:196); a URL is postgres(ql): with a host, no password, sslmode disable or verify-full only
config/config.ts:212     export function loadConfig(env: Env, readSecret?: SecretReader): AppConfig
config/secret.ts:5,40    type SecretReader = (path: string) => string; readSecretValue strips one trailing newline, empty or unreadable throws CONFIG_SECRET_EMPTY
config/egress.ts:18-24   URSITOARE_EGRESS_BROKER_URL, _PROXY_URL, _BROKER_TOKEN_FILE, _VAULT_URL (an origin), _VAULT_IDENTITY, _VAULT_TOKEN_FILE (the vault three together)
config/oidc.ts:17-19,60  URSITOARE_OIDC_ISSUER, _CLIENT_ID, _CLIENT_SECRET_FILE; isIssuer: https, or http for localhost, a private address or a dotless host
config/internal.ts:4-24  parseInternalPort: URSITOARE_INTERNAL_PORT (default 8090)
// src/cli (U20)
cli/registry.ts:8-12,29-41  CliOption { type; summary; required? }, CliCommand { summary; details?; options; database: boolean; run(call) }, CommandRegistry { registerCommand; find(words): { name; command; rest } | null; list() }
cli/builtin.ts:6-11      export function createDefaultRegistry(): CommandRegistry
cli/run.ts:143-170       database true: loads the configuration, needs the owner endpoint (else CLI_OWNER_REQUIRED); database false: runs with owner null
cli/admin/bootstrap-admin.ts:14,47  reads --issuer; cli/admin/define.ts:39-46 adds tenant, operator, json to every admin command
// image layout (U01, U02, U13)
api/web.ts:28 DEFAULT_WEB_DIST = ../../web/dist from src/api/web.ts      main.ts:226 web dist = config.webDist ?? DEFAULT_WEB_DIST
db/migrate.ts:9 DEFAULT_MIGRATIONS_DIR = ./migrations      pdp/fragments.ts:72-74 defaultSrcDir() (the *.cedar fragments)
main.ts:482-486 the internal listener binds config.host and the internal port, only when it has a route; main.ts:519 main() runs when src/main.ts is the entry script
test/arch/secrets.ts:14-23 SECRET_PATTERNS: key-shaped text in any file fails ARCH_SECRET
```
