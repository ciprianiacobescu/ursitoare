## Why

U61d leaves a schema-only engine database and a Keycloak with the four journey users, but nothing signs in, seeds tenants and rights, or runs the pytest journeys. Without a control server `fresh_state` and `users` have nothing to call; without a seed no sign-in is accepted; without a sign-in helper the seed cannot act as an administrator.

Observable result: `scripts/stack-e2e.d/50-journeys.sh` runs `pytest e2e -m "not fake_only and not stack"` with `E2E_PROFILE=stack` inside the runner, which serves a stack control server on `127.0.0.1:39181` (`POST /reset`, `GET /seed`; `/faults` 404). A reset recreates the engine database (U61d), then seeds it: the tenants `E2E tenant` and `Tenant B` with their identity provider and the sink routes through U59a's commands, the 20-block test catalogue through `importCatalogue`, Tenant B's author mapping through the owner pool, and as `carol`, after a sign-in, the team, the group maps, the tool server `acme` (left pending) and its credential through the API. `users` answers the four journey users with their capabilities, `login` fails naming any capability a user lacks, and the tests that need the fake's control listener carry the marker `fake_only`.

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: the stack control server, the sign-in helper, the seed, and the conftest edits and run step that run the pytest journeys on the stack profile. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

New: `test/support/stack/{control,keycloak-login,seed}.ts`, `scripts/stack-e2e.d/50-journeys.sh`, `e2e/test_stack_seeding.py`, seven Node test files (`test-plan.md`). Edited by name: `e2e/conftest.py`, `test/support/stack/runner-main.ts` (an optional control server), `test/support/README.md` (a row). Capability `e2e-stack-seeding` (new); `e2e-stack` MODIFIED once (`fresh_state`). No migration, route, error code, policy action, dependency, module edge, e2e part, web change, `docs/` edit or frozen-test edit: `e2e/test_e2e_stack.py` stays byte-equal.

## Impact

- **Scaffold:** signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`) in `test/support/stack/{control,keycloak-login,seed}.ts`: constants empty or `""` (`STACK_SEED` with empty lists), every function throwing `Error("not implemented")`, and the two error classes setting their fields with message `""`. Not scaffolded: the optional member `control` of `runnerMain`'s `opts` and the entry guard (`test/support/stack/runner-main.ts`, `add-stack-overlay`'s file), the names of `e2e/conftest.py`, `e2e/test_stack_seeding.py`, `scripts/stack-e2e.d/50-journeys.sh` and the README row.
- **Depends on:** merged, restated in `delivered-shapes.md`: `add-web-sign-in` (U16: `fresh_state`, `users`, `login`), `add-admin-api` (U18: the teams and group-map routes), `add-audit-api` (U19: no name taken), `add-tool-registry` (U47) and `add-credentials` (U48: the tool-server and credential routes), `add-web-tool-journeys` (U56c: the M7 journey that must pass on the stack), and the units whose code is called: `add-admin-cli`, `add-block-registry`, `add-roles-and-memberships`, `add-e2e-stack`, `add-test-catalogue`, `add-fake-tools`, `add-oidc-login`. In this plan: `add-stack-overlay` (U61: `OverlayUser`, `readUsers`, `STACK_CONTROL_PORT`, `runnerMain`, `scriptProblems`), `add-stack-realm-reset` (U61d: `resetEngineDatabase`, `stackResetDeps`), `add-tenant-bootstrap` (U59a: the five commands, `findTenantByName`), `add-hobbyist-compose` (U59: the owner job's variables, read by a test) and `add-init-secrets` (U57: `SECRET_FILES`).
- **Changed:** `e2e/conftest.py` and `runner-main.ts` (named edits, tasks 6 and 7); the frozen `test_e2e_stack.py` and its pins stay unedited.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).

**What later units take (fixed here).** U61c: after a reset the engine holds `E2E tenant` (sink routes, `ursitoare-admins` mapped to `tenant_admin`, 20 blocks, the team `finance`, three group maps, the pending server `acme` with a credential) and `Tenant B` (one map); `signInThroughKeycloak`, `StackSession` and `STACK_ISSUER` for its own sign-ins.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// test/support/stack/control.ts
export interface StackControlOptions { port?: number; reset: () => Promise<void>; users: () => Readonly<Record<string, OverlayUser>> }
export function startStackControl(opts: StackControlOptions): Promise<{ url: string; close(): Promise<void> }>;   // 127.0.0.1; POST /reset, GET /seed; the rest 404
// test/support/stack/keycloak-login.ts
export class StackLoginError extends Error { readonly code: "STACK_LOGIN_TWO_STEP" | "STACK_LOGIN_FAILED"; constructor(code: StackLoginError["code"], message: string) }
export interface StackSession { cookie: string; csrfToken: string; capabilities: readonly string[]; request(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown, headers?: Record<string, string>): Promise<{ status: number; body: unknown }> }
export function signInThroughKeycloak(opts: { engineOrigin: string; username: string; password: string; fetch?: typeof fetch }): Promise<StackSession>;   // a form without a password input: STACK_LOGIN_TWO_STEP
// test/support/stack/seed.ts
export interface StackSeed { tenants: readonly { name: string; organization: string; sink: boolean; bootstrapAdmin: boolean }[]; catalogue: string; team: string; groupMaps: readonly { group: string; roleId: string | null; teamId: string | null }[]; tenantMaps: readonly { tenant: string; group: string; roleId: string }[]; toolServer: { id: "acme"; origin: "https://tools.fake.test" } }
export const STACK_SEED: StackSeed;
export const STACK_ISSUER: string;   // "http://localhost:8180/realms/ursitoare"
export type SeedArg = string | { tenantIdOf: string };
export type SeedStep = { kind: "cli"; argv: readonly SeedArg[] } | { kind: "catalogue"; tenant: string } | { kind: "groupmap"; tenant: string; group: string; roleId: string } | { kind: "api"; as: "carol"; method: string; path: string; body: unknown };
export function seedPlan(seed: StackSeed, issuer: string): SeedStep[];   // pure; 14 steps for STACK_SEED
export class SeedError extends Error { readonly step: string; readonly reason: string; constructor(step: string, reason: string) }   // message: seed failed at step <step> (<reason>)
export interface SeedDeps { ownerEnv: Readonly<Record<string, string>>; engineOrigin: string; issuer: string; users: Readonly<Record<string, OverlayUser>>; fetch?: typeof fetch }
export function seedStack(deps: SeedDeps): Promise<{ steps: number }>;
export function stackSeedDeps(dir: string): SeedDeps;   // the owner job's six variables over <dir>/secrets, the engine origin, STACK_ISSUER, readUsers(dir)
export function stackControlOptions(dir: string, hooks?: { reset?: (deps: ResetDeps) => Promise<unknown>; seed?: (deps: SeedDeps) => Promise<unknown> }): StackControlOptions;   // resetEngineDatabase then seedStack; settings read per call
// test/support/stack/runner-main.ts (add-stack-overlay's file; not scaffolded)
// runnerMain's opts gain the optional member: control?: StackControlOptions
// e2e/conftest.py (Python; named edits, not scaffolded)
// def reset_state() -> None
// def seed_users(e2e_profile: str) -> dict[str, dict[str, str]]
// STACK_RESET_TIMEOUT_S = 300
// FAKE_ONLY_TESTS: tuple[tuple[str, str], ...]
// def is_fake_only(file_name: str, test_name: str) -> bool
// def pytest_configure(config) -> None
// def pytest_collection_modifyitems(config, items) -> None
// def is_me_response(response) -> bool
// def check_capabilities(user: dict, granted: list[str]) -> None
```

**Interfaces taken:** From `add-stack-overlay`: `OverlayUser`, `OVERLAY_USERS`, `readUsers`, `readOverlay`, `STACK_CONTROL_PORT`, `runnerMain`, `scriptProblems`. From `add-stack-realm-reset`: `ResetDeps`, `ResetError`, `resetEngineDatabase`, `stackResetDeps`. From `add-tenant-bootstrap`: `findTenantByName`, `MINTKEY_SINK_ROUTE_KINDS`. From `add-hobbyist-compose`: `readCompose`. From `add-init-secrets`: `SECRET_FILES`.

The merged names (`runCli`, `importCatalogue`, `setGroupMapping`, `startE2eStack`, `oidcApi`, `fixtureSurface` and the rest) are in `delivered-shapes.md`.

## Out of scope

The realm overlay and the reset (U61d); contracts and snapshots (U61c); a reset of the fakes' recorded state; splitting the `/faults` step out of the M4 Alice journey; the fake-only Node journeys; a CI workflow; any Docker, Keycloak or Mintkey run. The orchestrator edits the `roadmap.md` rows.
