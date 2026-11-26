## Why

The stack's parts exist one by one (U57, U59a, U58b, U58, U60). Nothing starts them together, builds the engine image, or tells a hobbyist what to run, back up and rotate; U61 and U61c have no compose file to extend, and nothing guards the rule that the engine never holds the database owner's or the sink's credentials.

Observable result: `docker compose -f deploy/compose.yaml up -d --build --wait` runs six containers at 512m, 512m, 768m, 128m, 128m and 320m, after a one-shot `owner-job` that runs `db-roles`, `db-prepare`, `tenant-create`, `tenant-idp`, `tenant-sink` and `admin bootstrap-admin` and exits 0, again with no change on a second run. The engine is published at `127.0.0.1:8080`, Keycloak at `127.0.0.1:8180` (movable through `deploy/.env`); the vault, broker, proxy and port 8090 are not published; only the proxy is on `egress`.

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: the engine image, the compose file with its owner job and identity-provider overlay, and the two operator documents. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

New: `test/deploy/compose.ts`, nine test files in `test/deploy/` and seven data files: `Dockerfile`, `.dockerignore`, `deploy/compose.yaml`, `deploy/compose.idp-external.yaml`, `deploy/owner-job.sh` (text in `test-plan-data.md`), `docs/deploy.md` and `docs/operations.md` (fixed by the spec). Capability `deploy-compose` (new, ADDED only). No migration, route, error code, policy action, dependency, module edge, e2e part, web change, frozen-test edit or `.gitignore` edit.

U61 to U61c take the service, network, volume and secret names, the two port variables, `OWNER_JOB_*`, the image `ursitoare/ursitoare:local`, `STACK_SERVICES`, `STACK_LIMITS` and `readCompose`, all fixed in the spec.

## Impact

- **Scaffold:** signature stubs are on the base branch (`docs/decisions/0002`) in `test/deploy/compose.ts`: `COMPOSE_PATH` is `""`, other constants empty, every function throws `Error("not implemented")`. Not scaffolded: the seven data files (tasks 1.1, 2.1, 2.2, 3.1, 4.1, 4.2).
- **Depends on:** U02 `add-db-foundation`, U30 `add-dbos-runtime` (migrations and durable schema) and U46 `add-gateway-client` (the egress variables): merged and archived, restated in `delivered-shapes.md`. In this plan: `add-init-secrets` (the 15 secrets, their readers, the six `.env` keys), `add-tenant-bootstrap` (five commands, `loadAdminDatabase`, the line `tenant <id> "<name>" created|unchanged`), `add-oidc-backchannel` (`URSITOARE_OIDC_BACKCHANNEL_URL`, an origin), `add-keycloak-realm` (template, six placeholders, init script) and `add-audit-sink` (`URSITOARE_AUDIT_SINK`, `loadConfig`'s `auditSink`).
- **Changed:** nothing in place.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).

**Interfaces given** (exact shapes in `design.md` § Interfaces)

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

**Interfaces taken:** From `add-init-secrets`: `SECRET_FILES`, `ENV_KEYS`. From `add-keycloak-realm`: `realmPlaceholders`, `readRealmTemplate`, `KC_REALM_ENV`. From `add-tenant-bootstrap`: `loadAdminDatabase`. The merged names of `delivered-shapes.md`.

## Out of scope

The e2e overlay, fakes, runner and `scripts/stack-e2e.sh` (U61), the realm overlay and engine-database reset (U61d), seeding and journeys (U61b), conformance (U61c); a `tls` profile or a seventh container; rotation of `kek`, `signing_seed` and `engine_key`; removing an old sink route or identity-provider row; any run of Docker (the delegate's). The orchestrator edits the `roadmap.md` rows.
