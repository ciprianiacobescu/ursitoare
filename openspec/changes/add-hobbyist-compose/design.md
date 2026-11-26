## Context

This unit writes what `docker compose up` runs, using names fixed by U57, U58, U58b, U59a and U60. No gate runs Docker: every rule is a function over a file's text (`yaml` 2.9.1), also run on mutated copies; `test-plan.md` § STACK-ONLY names the delegate's step for each runtime behaviour.

## Decisions

1. **One image, from source.** `src` ships with its migrations and `*.cedar` fragments, read at run time (`src/db/migrate.ts:9`, `src/pdp/fragments.ts:72-74`), and `web/dist` sits beside it (`src/api/web.ts:28`); Node strips the types (`src/main.ts:519`). `src/interpreter/fakes.ts` (`flow test`'s fakes) is product code and ships; `test/`, `seed/`, `e2e/` and `*.test.ts` do not.
2. **Ignore file.** The root `.dockerignore` cuts `Dockerfile`'s context; a Dockerfile with its own `<name>.dockerignore` (U61's runner) is cut by that file instead. `buildContext` models names, `dir/`, `*`, `**/` and `!` only.
3. **Map-form `environment`**, so overlays merge key by key. `owner-job` repeats the engine's `build` and `image`, so `up --build` makes the image whichever service comes first.
4. **The network layer.** `app` and `mintkey` are internal: `postgres`, the broker, the vault and the owner job have no route off the host; `mintkey-proxy` is the only container on `egress` and shares no network with `postgres`. `ursitoare` and `keycloak` sit on `front` to publish a port and `front` is not internal, so with the proxy they can open outbound connections; the engine's code sends only through the gateway (`test/arch/rules.ts:281-300`). An unpublished port is reachable from every container on a shared network: the engine listens on `0.0.0.0`, port 8090 included (`src/main.ts:482-486`), so `front`, `app` and `mintkey` reach it (its routes need a service token).
5. **Owner credentials stay in the owner job.** The engine has no owner, admin or sink-token variable or secret (D34). The owner job sets `URSITOARE_DATABASE_URL` beside its password file (`src/config/config.ts:196`, D40) and names its tenant in every step (`OWNER_JOB_TENANT_NAME`, default `Home`); the tenant id comes from the `tenant-create` line by shell expansion.
6. **Required Keycloak values.** `KC_URSITOARE_CLIENT_SECRET`, `KC_URSITOARE_FIRST_USER` and `KC_URSITOARE_FIRST_PASSWORD` are passed as `${NAME:?run init-secrets first}`, so Compose refuses to start with one unset or empty (U58's failure case); the test rejects any other reference without `:?`.
7. **Hostname and back-channel (D45).** The issuer is browser-facing, `http://localhost:${KEYCLOAK_HTTP_PORT:-8180}/realms/ursitoare`; the engine reaches Keycloak at `http://keycloak:8080` (`URSITOARE_OIDC_BACKCHANNEL_URL`, U58b) with `KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true`. The public base URL is `http://127.0.0.1:${URSITOARE_HTTP_PORT:-8080}` and the realm's redirect and post-logout URIs use the same port (`src/identity/oidc/logout.ts:12`).
8. **Ports and LAN.** Both ports bind `127.0.0.1` and move only through the two variables. LAN or TLS is a host reverse proxy plus a user-written overlay of the URL keys (`docs/deploy.md`); there is no `tls` profile.
9. **`idp-external`** removes `keycloak` with `!reset null`. `yaml` reads that tag as the string `"null"` and warns (probed), so `readCompose` registers `!reset` and `!override`.
10. **Evidence for the pins.** The Mintkey (`sha-8766937`) and Keycloak (`26.8.1`) digests come from the cards' author, who re-derived them; this unit did not. Postgres and Node were read on 2026-11-25 from Docker Hub's public repository API (`https://hub.docker.com/v2/repositories/library/postgres/tags/18` and `.../library/node/tags/24-bookworm-slim`) by web fetch, not a registry client or a pull: both OCI indexes (`postgres:18` pushed 2026-11-24T13:08:58Z, `node:24-bookworm-slim` 2026-11-24T11:39:26Z; amd64 and arm64 listed). One source each; the first `up --build` checks them.

## Interfaces

Given, equal to `proposal.md`. Taken: `delivered-shapes.md`, `proposal.md`.

```ts
// test/deploy/compose.ts (ordinary code under test/; U61 and U61c import it)
export const COMPOSE_PATH: string;   // "deploy/compose.yaml", relative to the repository root
export const STACK_SERVICES: readonly string[];   // ["ursitoare", "postgres", "keycloak", "mintkey-broker", "mintkey-proxy", "mintkey-vault"]
export const ONE_SHOT_SERVICES: readonly string[];   // ["owner-job"]
export const STACK_LIMITS: Readonly<Record<string, string>>;   // { ursitoare: "512m", postgres: "512m", keycloak: "768m", "mintkey-broker": "128m", "mintkey-proxy": "128m", "mintkey-vault": "320m" }
export const MINTKEY_DIGESTS: Readonly<Record<string, string>>;   // "mintkey-broker", "mintkey-proxy", "mintkey-vault" and "keycloak" → their pinned "sha256:<64 hex>" digest (test-plan-data.md)
export const OWNER_JOB_STEPS: readonly string[];   // ["db-roles", "db-prepare", "tenant-create", "tenant-idp", "tenant-sink", "admin bootstrap-admin"]
export function readCompose(path?: string): unknown;   // yaml 2.9.1 parse of a repository-relative file (default COMPOSE_PATH); a !reset or !override tag reads as { "!reset": value } or { "!override": value }
export function composeProblems(doc: unknown, opts: { realmPlaceholders: readonly string[]; secretFiles: readonly string[] }): string[];   // [] or one text per broken rule (test-plan-rows.md); never throws
export function ownerJobProblems(script: string): string[];   // OWNER_JOB_STEPS in order, each tenant step by name, bootstrap-admin with --tenant and --issuer, set -eu, exit 0
export function idpExternalProblems(base: unknown, overlay: unknown): string[];   // keycloak reset; the engine's and the owner job's issuer and organization from EXTERNAL_OIDC_*; no back-channel
export function dockerfileProblems(dockerfile: string, dockerignore: string): string[];   // three digest-pinned stages, frozen lockfile, --prod in deps, a runtime of only the allowed COPYs as user node, the ignore lines of the requirement
export function buildContext(dockerignore: string, paths: readonly string[]): string[];   // the paths a build sends: last matching line wins, a matched directory removes its contents, "!" re-includes
// Not scaffolded: Dockerfile, .dockerignore, deploy/compose.yaml, deploy/compose.idp-external.yaml, deploy/owner-job.sh, docs/deploy.md, docs/operations.md (tasks 1.1 to 4.2)
```

Red tests import these from `test/deploy/compose.ts`; `SECRET_FILES`, `ENV_KEYS` from `src/cli/init-secrets.ts`, `realmPlaceholders`, `readRealmTemplate` from `test/deploy/realm.ts`, `loadAdminDatabase` from `src/config/admin.ts`, `loadConfig` from `src/config/index.ts`, `createDefaultRegistry` from `src/cli/builtin.ts`.

## Failure cases

| Case | Result |
|---|---|
| a data file is missing | the test's `existsSync` assertion fails first (never `ENOENT`) |
| `composeProblems` gets `null`, a string, an array or no `services` | `services: missing <name>` for each service and `name: project name is not ursitoare`; no throw |
| `.env` missing or a required value empty | Compose stops on the three `:?` values (not a gate) |
| a second `up` | each owner step answers `present`, `0 applied`, `unchanged` or `exists` |

Renaming a service, network or volume breaks the overlays of U61 to U61c.

## UNVERIFIED (no gate runs these; each is a STACK-ONLY row or a stated limit)

- The image build: `pnpm install --frozen-lockfile --prod` in the two-package workspace under `corepack`, the web build, type stripping at `node src/main.ts`.
- Compose: `${NAME:?message}` stopping every command that loads the project (`build` too); `up -d --wait` returning 0 with a one-shot (probed by the cards' author on v5.7.0, not on this file); a second `up` running the finished owner job again (the docs also give `run --rm owner-job`); two services building one tag.
- Mintkey: variable names, ports 8083, 8086 and 8084, the `/wget` and `/grpc_health_probe` healthchecks, `MINTKEY_ADMIN_API_URL` as the sink base, write access to a fresh `/var/lib/mintkey` volume (read from source by the cards' research agents).
- Keycloak: health on port 9000 over plain HTTP (the `bash` check ran only against a local stand-in), `start --import-realm`, `KC_HOSTNAME_BACKCHANNEL_DYNAMIC`.
- Postgres 18 init scripts and volume path; Linux ownership of 0600 secrets; the LAN and TLS overlay, restore and rotation steps (written from the files, not run).

