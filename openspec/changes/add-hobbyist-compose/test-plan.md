# Test plan: add-hobbyist-compose

Every value was produced by running the nine test files against `test-plan-data.md` in a scratch copy of main@31968a29 (Node 24.22.2; `eslint` and `tsc` clean) with prototypes of the in-plan names. With the scaffold stubs and no data file all 13 tests failed by `AssertionError`. Also run: `deploy/owner-job.sh` under `sh` with an echoing `node` (exit 0) and both healthchecks under `bash` (Keycloak's against a local server on port 9000, exit 0; the engine's against none, exit 1). Nothing ran in Docker, Keycloak or Mintkey.

## Test files and ids

| File | Test (name starts with the id and four words) |
|---|---|
| `test/deploy/dockerfile.test.ts` | `C-c9d7cf88 the committed Dockerfile and` |
| same | `C-e52bd0c8 the build context holds` |
| `test/deploy/compose.test.ts` | `C-171447eb the committed compose file` |
| `test/deploy/compose-network.test.ts` | `C-6caa0f20 only the proxy is` |
| `test/deploy/compose-secrets.test.ts` | `C-876e5004 the engine holds no` |
| same | `C-d74009de every secret is a` |
| `test/deploy/compose-env.test.ts` | `C-7cc5a8ba the engine environment is` |
| same | `C-8bffa5f9 the owner job environment` |
| `test/deploy/owner-job.test.ts` | `C-60c735b0 the committed owner job` |
| same | `C-4dad21c6 the script uses only` |
| `test/deploy/idp-external.test.ts` | `C-efbac7f0 the overlay removes Keycloak` |
| `test/deploy/docs-deploy.test.ts` | `C-131949b4 docs deploy names its` |
| `test/deploy/docs-operations.test.ts` | `C-a6706721 docs operations names back` |

Tests are in the order of the spec's scenarios; no frozen test changes. Each begins with a `typeof` assertion and an `existsSync` assertion per data file, inside its body, and wraps each call under test in `attempt` (the value, or `{ thrown }`). Names hold no `.`, `[` or `::`.

## Fixtures

`OPTS` is `{ realmPlaceholders: realmPlaceholders(readRealmTemplate()), secretFiles: SECRET_FILES.map((f) => f.name) }`; U58's template gives the six `KC_URSITOARE_*` names.

**Interpolation.** `interpolate(value, vars)` is local to `compose-env.test.ts` (`compose.ts` does not export it) and replaces `${NAME}`, `${NAME:-default}` and `${NAME:?message}` with `vars[NAME]` when it is an own property, else the default, else `""`; `:?` throws `NAME: message` when the value is unset or empty. The secret reader answers, for `/run/secrets/<name>`, 64 copies of one character and a newline, and throws for any other path: `engine_key` `a`, `db_app_password` `b`, `db_owner_password` `c`, `db_superuser_password` `d`, `oidc_client_secret` `e`, `mk_issue_token` `f`, `mk_vault_writer_token` `1`, `mk_broker_token` `2`, `mk_proxy_token` `3`.

**Engine view** of `loadConfig` on the default `ursitoare` environment (`ownerUrl` is absent):

```json
{ "role": "all", "host": "0.0.0.0", "port": 8080, "internalPort": 8090, "publicBaseUrl": "http://127.0.0.1:8080",
  "appUrl": "postgres://ursitoare_app@postgres:5432/ursitoare?sslmode=disable",
  "issuer": "http://localhost:8180/realms/ursitoare", "clientId": "ursitoare-engine",
  "broker": "http://mintkey-broker:8083", "proxy": "http://mintkey-proxy:8086", "vault": "http://mintkey-vault:8084",
  "identity": "svcid_ursitoare", "engineKey": 64, "auditSink": { "enabled": true } }
```

(`engineKey` is the key's length.) With `URSITOARE_HTTP_PORT` `18080`, `KEYCLOAK_HTTP_PORT` `18180` and `KC_URSITOARE_ORGANIZATION` empty: `KC_HOSTNAME` `http://localhost:18180`, `KC_URSITOARE_REDIRECT_URI` `http://127.0.0.1:18080/auth/oidc/callback`, `KC_URSITOARE_POST_LOGOUT_URI` `http://127.0.0.1:18080/sign-in`, `OWNER_JOB_ISSUER` `http://localhost:18180/realms/ursitoare`; by default `URSITOARE_OIDC_BACKCHANNEL_URL` is `http://keycloak:8080`.

**Owner job view** (interpolated `owner-job` environment): `loadConfig` owner endpoint `postgres://ursitoare_owner@postgres:5432/ursitoare?sslmode=disable` and app endpoint `postgres://ursitoare_app@postgres:5432/ursitoare?sslmode=disable`, both with 64-character passwords, `oidc` and `egress` absent; `loadAdminDatabase` `postgres://postgres@postgres:5432/ursitoare?sslmode=disable` with a 64-character password; `OWNER_JOB_TENANT_NAME` `Home`, `OWNER_JOB_ORGANIZATION` `home`.

## Docs

Substrings the document tests need (spans use double backticks where the sentence holds backticks). Deploy: (1) ``Changing a port after the first start needs the client's redirect URIs updated in the Keycloak admin console; the old identity-provider row stays.`` ("Ports"); (2) ``The engine container runs as uid 1000 (`node`).`` and (4) ``` `docker inspect` on the keycloak container shows them``` ("Generate the secrets"); (3) ``so at the network layer they can open outbound connections`` ("Networks and egress"); (5) ``The engine routes a sign-in by issuer and the `organization` claim, so your provider must put a one-entry `organization` alias array and a `groups` claim of plain names in the ID token; put its client secret in `deploy/secrets/oidc_client_secret`.`` ("Bring your own identity provider"). "Generate the secrets" also holds, in this order and before any `docker compose` text, `docker build -t ursitoare/ursitoare:local .` and ``docker run --rm -v "$PWD/deploy:/out" ursitoare/ursitoare:local node src/cli/main.ts init-secrets --dir /out``. Operations: (6) ``No automated test exercises a restore`` and ``Never run init-secrets against an existing vault volume with new files`` ("Restore"); (7) ``The owner job sets both role passwords from the files at every start, so a file edited without the database changes the database password.``, ``only when realm `ursitoare` does not exist`` and ``have no rotation procedure in this release`` ("Rotate a credential", "Change a live realm"); it also names `kek`, `signing_seed`, `engine_key`, `deploy/.env`, `pg_dump` and `pg_restore`. The LAN block is the first yaml block after `## LAN and TLS`; it sets `URSITOARE_PUBLIC_BASE_URL` and `URSITOARE_OIDC_ISSUER` on `ursitoare`, `KC_HOSTNAME`, `KC_URSITOARE_REDIRECT_URI`, `KC_URSITOARE_POST_LOGOUT_URI` and `KC_PROXY_HEADERS` on `keycloak`, `OWNER_JOB_ISSUER` on `owner-job`.

## STACK-ONLY

Proved only by the delegate's stack runs; in no scenario and no task's `criteria_ids`:

| Criterion | Step | Asserts |
|---|---|---|
| Six containers run once each within their limits | `05-snapshot.sh`, `60-conformance.sh` | `test_exit_10_six_containers_within_their_limits`: `exit10Problems` is `[]` |
| `up -d --wait` returns 0: six healthchecks pass, the owner job exits 0 | step 6 of `scripts/stack-e2e.sh` (U61) | the command exits 0 |
| The owner job exits 0 again after a database reset | `20-reset.sh` (U61d), then step 6 | exit 0, "E2E tenant" present |
| No restart or OOM kill during the run | `90-checks.sh` | `restartProblems` and OOM checks are `[]` |
| Mintkey in production mode with its key files | `60-conformance.sh` | `test_exit_12_path_b_in_production_mode`: `exit12EnvProblems` is `[]` |
| The engine reaches proxy, broker and vault with these variables | `30-proxy-smoke.sh` (U61), `40-contracts.sh` | `proxySmoke` is `ok`; the `egress` rows are `ok` |
| The engine reaches Keycloak at `http://keycloak:8080`, browsers `http://localhost:<port>` | `40-contracts.sh`, `50-journeys.sh` | the `oidc` rows are `ok`; `signInThroughKeycloak` signs in |
| Mintkey's events reach the sink through `MINTKEY_ADMIN_API_URL` | `60-conformance.sh` | `test_mintkey_events_reach_the_sink` |

Not a step: the first user signs in at `http://127.0.0.1:<port>` and lands as tenant admin of `Home`, with the ports overridden where 8080 and 8180 are taken. The delegate checks it at this unit's head (D45) by browser, with screenshots in the run directory: one-page sign-in, forced password change and profile, arrival as `tenant_admin`.
