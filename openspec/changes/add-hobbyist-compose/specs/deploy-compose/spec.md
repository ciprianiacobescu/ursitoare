## Purpose

`docker compose -f deploy/compose.yaml up -d --build --wait` runs the hobbyist stack: six long-running containers and a one-shot owner job. It covers the compose file, its overlay, the owner job, the engine image and two documents, each read by a static check.

## ADDED Requirements

### Requirement: The engine image runs from source and its build context holds no test support
`Dockerfile` SHALL build one image for every `URSITOARE_ROLE` in three stages named `build`, `deps` and `runtime`, each `FROM node:24-bookworm-slim` pinned by `@sha256:` digest. `deps` SHALL run `pnpm install --frozen-lockfile --prod`; `runtime` SHALL copy only `package.json`, `src`, `deploy/owner-job.sh`, `deps`' `node_modules` and `build`'s `web/dist`, run as user `node` and start `node src/main.ts`. `.dockerignore` SHALL hold, as exact lines, `.l4`, `.stack-e2e`, `.stack-out`, `node_modules`, `e2e`, `test`, `seed`, `tools`, `openspec`, `docs`, `deploy/secrets`, `deploy/.env`, `.env` and `**/*.test.ts`, and no `!` line. `dockerfileProblems(dockerfile, dockerignore)` SHALL answer one text per broken rule. `buildContext(dockerignore, paths)` SHALL answer, in input order, the paths a build sends (root-anchored patterns, `**/`, last matching line wins, `!` re-includes).

#### Scenario: The committed Dockerfile and ignore file
- **WHEN** `dockerfileProblems` runs on the committed pair (`test-plan-data.md`), then on the ten edited pairs of rows D1 to D10 (`test-plan-rows.md`)
- **THEN** the first answers `[]` and the three `FROM` lines are `node:24-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530` as `build`, `deps` and `runtime`; each edited pair answers its row's problems

#### Scenario: The build context holds the engine sources and nothing else
- **WHEN** `buildContext` runs with the committed `.dockerignore` and every file under `src`, `web`, `test`, `e2e`, `seed`, `tools`, `docs`, `deploy` and `openspec` plus `package.json`, `pnpm-lock.yaml`, `.env`, `deploy/.env`, `deploy/secrets/kek`, `.stack-e2e/.env`; and on the fixtures `("a\n!a/b\n", ["a/c", "a/b", "d"])` and `("**/*.test.ts\n/x/\n", ["a/b.test.ts", "b.test.ts", "x/y", "a/x/y"])`
- **THEN** the paths kept include none under `test/`, `e2e/`, `seed/`, `tools/`, `docs/`, `openspec/`, `deploy/secrets/` or `.stack-`, none ending `.test.ts(x)`, neither `.env` nor `deploy/.env`; they include `src/main.ts`, `src/cli/main.ts`, `src/db/migrations/0001_base.sql`, `web/package.json`, `web/src/main.tsx`, `deploy/owner-job.sh`, `package.json`, `pnpm-lock.yaml` and one `.cedar` file under `src`; the fixtures answer `["a/b", "d"]` and `["a/x/y"]`. (`src/interpreter/fakes.ts`, the `flow test` fakes, ships)

### Requirement: The compose file has six containers at their limits, pinned by digest, and one owner job
`deploy/compose.yaml` SHALL be named `ursitoare` and hold exactly the services below, each long-running one with `restart: unless-stopped`, a healthcheck, its limit as `mem_limit` and no `container_name`; every `environment` SHALL be a map. Postgres 18, Keycloak 26.8.1 and the three Mintkey images (tag `sha-8766937`) SHALL be pinned by `@sha256:` digest (`test-plan-data.md`); the engine and the owner job SHALL be `ursitoare/ursitoare:local`, built from `context: ..`, `dockerfile: Dockerfile`. The three Mintkey services SHALL set `MINTKEY_ENV=production`, and `GOMEMLIMIT` `100MiB` (broker, proxy) or `256MiB` (vault).

| Service | Networks | Publishes | Limit | Volumes (besides secrets) |
|---|---|---|---|---|
| `ursitoare` | `front`, `app`, `mintkey` | `127.0.0.1:${URSITOARE_HTTP_PORT:-8080}:8080` | `512m` | none |
| `postgres` | `app` | none | `512m` | `pgdata:/var/lib/postgresql`, `./postgres/initdb:/docker-entrypoint-initdb.d:ro` |
| `keycloak` | `front`, `app` | `127.0.0.1:${KEYCLOAK_HTTP_PORT:-8180}:8080` | `768m` | `./keycloak/import:/opt/keycloak/data/import:ro` |
| `mintkey-broker` | `mintkey` | none | `128m` | `broker-wal:/var/lib/mintkey` |
| `mintkey-proxy` | `mintkey`, `egress` | none | `128m` | `proxy-wal:/var/lib/mintkey` |
| `mintkey-vault` | `mintkey` | none | `320m` | `vault-data:/var/lib/mintkey` |
| `owner-job` | `app` | none | none | none (`restart: "no"`, no healthcheck) |

The engine SHALL wait for `owner-job` (`service_completed_successfully`) and for the broker, proxy and vault; the owner job and Keycloak for `postgres`; the proxy for the broker and the vault (all `service_healthy`). Top-level volumes SHALL be exactly `pgdata`, `vault-data`, `broker-wal` and `proxy-wal`; the Postgres healthcheck SHALL pass `-h 127.0.0.1`; `keycloak` SHALL set every name `realmPlaceholders` gives, and `KC_URSITOARE_CLIENT_SECRET`, `KC_URSITOARE_FIRST_USER` and `KC_URSITOARE_FIRST_PASSWORD` as `${<NAME>:?message}`, no other reference to them lacking `:?`, so an unset or empty `.env` value stops `up`. `composeProblems(doc, { realmPlaceholders, secretFiles })` SHALL answer one text per broken rule. `readCompose(path?)` SHALL parse a repository-relative file with `yaml` 2.9.1 and read a `!reset` or `!override` tag as `{ "!reset": value }` or `{ "!override": value }`.

#### Scenario: The committed file and one mutation per rule
- **WHEN** `composeProblems` runs on `readCompose()` with `realmPlaceholders` of U58's template and the 15 names of `SECRET_FILES`; on twenty-four copies edited as rows C1 to C24 (§ Compose rules); and on `null`, `"x"`, `[]`, `{ services: "x" }`
- **THEN** the committed file answers `[]`; its sorted service names are the seven of the table; its six limits deep-equal `STACK_LIMITS` (the table's); `MINTKEY_DIGESTS` deep-equals the broker, proxy, vault and Keycloak image digests of `test-plan-data.md`, and the Postgres image is `postgres:18@sha256:c699303802144847d238196173655dbbecf7a96aeca1565f2b02eb671a1f0b6b`; each edited copy's list contains the text of its row; a non-record input answers a list holding `services: missing ursitoare` and `name: project name is not ursitoare`

### Requirement: Only the proxy is on the egress network, and the network layer is stated as it is
`app` and `mintkey` SHALL be internal networks; `front` and `egress` ordinary bridges. `mintkey-proxy` SHALL be on exactly `mintkey` and `egress`, no other service on `egress`, and the proxy SHALL have no variable whose name contains `DATABASE`. Each service's `ports` SHALL equal its table cell (loopback binds only, no other port, none 8090). The test pins that only `ursitoare`, `keycloak` and `mintkey-proxy` sit on a non-internal network, so only they can open outbound connections at the network layer.

#### Scenario: Egress membership, published ports and ten rule rows
- **WHEN** the test reads the committed file's `egress` members, services on a network that is not internal and published ports, then applies rows N1 to N10 (`test-plan-rows.md`)
- **THEN** `egress` holds `["mintkey-proxy"]`; the services able to leave the host are exactly `["ursitoare", "keycloak", "mintkey-proxy"]`; the networks deep-equal `{ front: {}, egress: {}, app: { internal: true }, mintkey: { internal: true } }`; the published ports are the two of the table and no `8090`, while `URSITOARE_INTERNAL_PORT` is `"8090"`; the proxy's JSON holds no `DATABASE`; each row answers exactly its listed problems

### Requirement: The engine holds no owner credential and no sink token
`ursitoare` SHALL set `URSITOARE_HOST=0.0.0.0` and `URSITOARE_AUDIT_SINK=enabled`, no variable starting `URSITOARE_DATABASE_OWNER_` or `URSITOARE_DATABASE_ADMIN_` and none starting `URSITOARE_AUDIT_SINK_` and ending `_FILE`, and SHALL mount exactly `db_app_password`, `engine_key`, `oidc_client_secret`, `mk_issue_token` and `mk_vault_writer_token`. `owner-job` SHALL mount exactly `db_superuser_password`, `db_owner_password`, `db_app_password`, `mk_broker_token` and `mk_proxy_token`; `postgres` exactly `db_superuser_password` and `db_keycloak_password`.

#### Scenario: Credentials by container
- **WHEN** the test reads the committed file's engine, owner job and Postgres entries, then applies rows S1 to S7 (`test-plan-rows.md`)
- **THEN** the engine's variables matching `OWNER`, `ADMIN` or `SINK_` are `[]` and `URSITOARE_AUDIT_SINK` is `"enabled"`; the three sorted secret lists and the owner job's networks `["app"]` are the requirement's; the owner job's variables matching `OWNER_URL`, `ADMIN_URL` or `SINK_` are `URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE`, `URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE`, `URSITOARE_DATABASE_ADMIN_URL`, `URSITOARE_DATABASE_OWNER_URL`; each row answers exactly its problems

### Requirement: Every secret is a SECRET_FILES name and every file variable reads its own file
`deploy/compose.yaml` SHALL declare one top-level secret per name of U57's `SECRET_FILES` as `file: ./secrets/<name>`. Every environment value `/run/secrets/<name>` SHALL belong to a variable ending `_FILE` that is among the `readers` of `<name>`, and its service SHALL mount `<name>`; every reader of `SECRET_FILES` SHALL be set by some service; `keycloak` SHALL set each key of `ENV_KEYS` to `${<KEY>}` (`${<KEY>:?message}` for the three above).

#### Scenario: Readers match the secret table
- **WHEN** the test walks every environment value, then runs `composeProblems` on the copy described under `test-plan-rows.md` § Credential rules (engine key variable reading `/run/secrets/kek`, `extra_secret` added, `kek` pointing at `./secrets/other`, `engine_key` deleted)
- **THEN** the declared names equal the 15 of `SECRET_FILES` in order; each `/run/secrets/<name>` is on a `_FILE` variable in that name's `readers` and its service mounts it; the readers no service sets are `[]`; the names with no reader are `db_keycloak_password`, `keycloak_admin_password`, `first_user_password`, the last two mounted by no service; each `ENV_KEYS` name is `${<KEY>}` on `keycloak`, with `:?run init-secrets first` for the three; the copy answers its five listed problems

### Requirement: The engine's own loaders accept the environment of the engine and of the owner job
The `ursitoare` environment, each `${NAME:-default}` read from `.env` or its default, SHALL load through `loadConfig`; the `owner-job` environment through `loadConfig` and `loadAdminDatabase`, with the app URL beside its password file. The URLs built from the two port variables (public base URL, issuer, `KC_HOSTNAME`, redirect and post-logout URIs) SHALL follow them.

#### Scenario: The engine environment, by default and with moved ports
- **WHEN** `loadConfig` runs on the interpolated `ursitoare` environment with the reader of `test-plan.md` § Fixtures; then with `URSITOARE_HTTP_PORT` `18080` and `KEYCLOAK_HTTP_PORT` `18180`
- **THEN** the first config's view is the JSON of `test-plan.md` § Engine view (host `0.0.0.0`, internal port 8090, `auditSink` `{ enabled: true }`); the second differs only in `publicBaseUrl` `http://127.0.0.1:18080` and `issuer` `http://localhost:18180/realms/ursitoare`; `KC_HOSTNAME`, the redirect and post-logout URIs and `OWNER_JOB_ISSUER` are the values listed there

#### Scenario: The owner job environment, with and without the app URL
- **WHEN** `loadConfig` and `loadAdminDatabase` run on the interpolated `owner-job` environment; then `loadConfig` with `URSITOARE_DATABASE_URL` removed, and with `URSITOARE_DATABASE_OWNER_PASSWORD` set to `x`
- **THEN** the endpoints, tenant name and organization are those of `test-plan.md` § Owner job view, with `oidc` and `egress` absent; the second call throws `URSITOARE_DATABASE_PASSWORD_FILE: set only together with URSITOARE_DATABASE_URL`, the third `URSITOARE_DATABASE_OWNER_PASSWORD: secrets are read only from files; set URSITOARE_DATABASE_OWNER_PASSWORD_FILE`

### Requirement: The owner job runs five steps in order and names its tenant
`deploy/owner-job.sh` SHALL start `#!/bin/sh`, run `set -eu`, call `node src/cli/main.ts` for `db-roles`, `db-prepare`, `tenant-create`, `tenant-idp`, `tenant-sink` and `admin bootstrap-admin` in that order and end `exit 0`. `tenant-create` SHALL pass `--name "$OWNER_JOB_TENANT_NAME"`; `tenant-idp` and `tenant-sink` `--tenant-name "$OWNER_JOB_TENANT_NAME"`; `tenant-idp` also `--issuer "$OWNER_JOB_ISSUER"` and `--organization "$OWNER_JOB_ORGANIZATION"`; `admin bootstrap-admin` `--tenant "$tenant_id"` (the second word of the `tenant-create` line), `--issuer "$OWNER_JOB_ISSUER"` and `--operator owner-job`. It SHALL ignore no failure and read no secret file. `ownerJobProblems(script)` SHALL answer one text per broken rule.

#### Scenario: The committed script and nine edits
- **WHEN** `ownerJobProblems` runs on the committed script (`test-plan-data.md`) and on nine copies edited as rows O1 to O9 (`test-plan-rows.md`)
- **THEN** the committed script answers `[]`, starts `#!/bin/sh`, holds the six calls in the order of `OWNER_JOB_STEPS` and no `/run/secrets`; each copy answers exactly its row's problems

#### Scenario: The script uses registered commands, their options and variables the compose file sets
- **WHEN** the test finds each of the six calls in `createDefaultRegistry()`, reads its `--option` names, and lists the script's `OWNER_JOB_*` variables against the `owner-job` environment
- **THEN** every call names a registered command, uses only options it declares and passes each it marks `required`; the variables used are `["OWNER_JOB_ISSUER", "OWNER_JOB_ORGANIZATION", "OWNER_JOB_TENANT_NAME"]`, all set by the compose file; `db-roles` has `database` false, `db-prepare` true

### Requirement: idp-external drops Keycloak and points the stack at the external issuer
`deploy/compose.idp-external.yaml` SHALL set `keycloak: !reset null` and change only `ursitoare.environment` (`URSITOARE_OIDC_ISSUER` `${EXTERNAL_OIDC_ISSUER}`, `URSITOARE_OIDC_BACKCHANNEL_URL` empty, `URSITOARE_OIDC_CLIENT_ID` `${EXTERNAL_OIDC_CLIENT_ID:-ursitoare-engine}`) and `owner-job.environment` (`OWNER_JOB_ISSUER` `${EXTERNAL_OIDC_ISSUER}`, `OWNER_JOB_ORGANIZATION` `${EXTERNAL_OIDC_ORGANIZATION}`); no base service depends on `keycloak`. `idpExternalProblems(base, overlay)` SHALL answer one text per broken rule.

#### Scenario: The overlay and six edits
- **WHEN** `idpExternalProblems` runs on `readCompose()` and `readCompose("deploy/compose.idp-external.yaml")`, then on rows I1 to I6 (`test-plan-rows.md`)
- **THEN** the pair answers `[]`; the overlay's `keycloak` is `{ "!reset": null }`, its services are `["keycloak", "ursitoare", "owner-job"]` with the maps above; each row answers exactly its problems

### Requirement: docs/deploy.md is the first-run guide
`docs/deploy.md` SHALL hold these `## ` headings in order: `Generate the secrets` (the first command a reader runs, `docker build -t ursitoare/ursitoare:local .` then `docker run --rm -v "$PWD/deploy:/out" ursitoare/ursitoare:local node src/cli/main.ts init-secrets --dir /out`, before any `docker compose` command), `Start the stack`, `First sign-in`, `Ports`, `Networks and egress`, `LAN and TLS`, `Bring your own identity provider`. It SHALL contain the five sentences of `test-plan.md` § Docs (the fifth: the provider claims and client secret); "Networks and egress" SHALL also name the stronger claim's two ways: a host firewall rule, or a reverse proxy that publishes while the engine and Keycloak stay off `front`. Every `docker compose` command SHALL carry `-f deploy/compose.yaml`; "LAN and TLS" SHALL show a YAML overlay whose keys exist in the compose environments except `KC_PROXY_HEADERS`; the last section SHALL give the `deploy/compose.idp-external.yaml` command and name the three `EXTERNAL_OIDC_*` variables of the overlay.

#### Scenario: The deploy guide
- **WHEN** the test reads `docs/deploy.md`, `deploy/compose.yaml` and `deploy/compose.idp-external.yaml` and parses the first yaml block under `## LAN and TLS`
- **THEN** the headings are the seven above; the five sentences are present; the two secret-generation commands precede every `docker compose` mention; every `docker compose` command holds `-f deploy/compose.yaml`; the text names `URSITOARE_HTTP_PORT`, `KEYCLOAK_HTTP_PORT` and `URSITOARE_TENANT_NAME`, each set by the compose file, and `docker compose -f deploy/compose.yaml -f deploy/compose.idp-external.yaml up -d --build --wait`; the block's services are `["ursitoare", "keycloak", "owner-job"]`, its keys missing from the compose environments `["keycloak.KC_PROXY_HEADERS"]`; no 64-hex string occurs

### Requirement: docs/operations.md covers backup, restore, upgrade and rotation
`docs/operations.md` SHALL hold these `## ` headings in order: `Back up`, `Restore`, `Upgrade`, `Change a live realm`, `Rotate a credential`. It SHALL name `kek`, `signing_seed`, `engine_key`, `deploy/.env`, the volume `ursitoare_vault-data` and the databases `ursitoare` and `keycloak` as what a backup holds, show `pg_dump` and `pg_restore`, and contain the sentences of `test-plan.md` § Docs (no restore test; never run init-secrets against an existing vault volume with new files; the owner job re-applies role passwords; the realm file imports only when the realm does not exist; no rotation for `kek`, `signing_seed`, `engine_key`). Every `docker compose` command carries `-f deploy/compose.yaml`, every `ursitoare_<volume>` named is a volume of the compose file, and no 64-hex string appears.

#### Scenario: The operations guide
- **WHEN** the test reads `docs/operations.md` and `deploy/compose.yaml`
- **THEN** the headings are the five above; the named items and sentences are present; every `docker compose` command holds `-f deploy/compose.yaml`; `ursitoare_vault-data`, `ursitoare_broker-wal` and `ursitoare_proxy-wal` are in the text and `vault-data`, `broker-wal` and `proxy-wal` are volumes of the compose file; no 64-hex string occurs
