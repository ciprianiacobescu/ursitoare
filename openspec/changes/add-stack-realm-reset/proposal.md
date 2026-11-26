## Why

U61 gives the e2e project, its state files, the step framework and the runner, but Keycloak's `ursitoare` realm (U58) holds only the first user, and nothing gives a test a clean engine database. Without the journey users and groups, the second organization and the two exit-19 caller clients, U61b has nobody to sign in; without a reset from a template that follows the code's migrations, every journey inherits the previous one's data or an old schema.

Observable result: `scripts/stack-e2e.d/10-overlay.sh` applies the overlay through Keycloak's admin API and prints one line, `overlay: applied 14` on a realm that holds only U58's import, `overlay: applied 0` when run again. `scripts/stack-e2e.d/20-reset.sh` brings the template `ursitoare_template` up to the code's migrations (`template: created; migrations applied: 22`, then `template: present; migrations applied: 0`), drops and recreates the engine database `ursitoare` from it, waits for the engine's `/health` and prints `reset: engine database recreated; the engine stayed up` (or `restarted`). Neither step touches Keycloak's database, the vault or a volume, prints a secret or re-imports the realm. The delegate's stack run proves the real behaviour (`test-plan.md` § STACK-ONLY).

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: the test realm overlay applied through the admin API and the engine-database reset from a template, each with its stack-run step. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

New: `test/support/stack/{keycloak-overlay,reset,fake-admin}.ts`, eight test files (`test-plan.md`), `scripts/stack-e2e.d/10-overlay.sh` and `20-reset.sh` (texts in `test-plan-data.md`). Edited by name: `test/support/README.md` (one row). Capability `stack-overlay` (created by `add-stack-overlay`; this unit ADDS requirements to it). No migration, route, error code, policy action, dependency, module edge, e2e part, web change, `docs/` edit, `.gitignore` edit or frozen-test edit; `scripts/stack-e2e.sh` stays U61's.

## Impact

- **Scaffold:** signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`) in the three files their headers name: constants empty or `""`, every function throwing `Error("not implemented")`, `ResetError` a class whose constructor sets `step` and `reason` and whose message is `""`. Not scaffolded: the two main guards (each file runs its `main` only as the entry script, as `src/main.ts` does), the two step files and the README row.
- **Depends on:** `add-db-foundation` (U02: `prepareDatabase`, `createPool`, `ensureRoles`) and `add-dbos-runtime` (U30: `prepareDurable`), merged and archived, restated in `delivered-shapes.md`. In this plan: `add-stack-overlay` (U61: `OverlayUser`, `readUsers`, `readClients`, the step framework and rules), `add-init-secrets` (U57: the secret file names and the admin user), `add-keycloak-realm` (U58: the realm and its three groups), `add-hobbyist-compose` (U59: service and database names) and `add-tenant-bootstrap` (U59a: `db-roles` recreates a missing engine database, the recovery this reset relies on).
- **Changed:** nothing in place.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).

**What later units take (fixed here).** U61b: `resetEngineDatabase(stackResetDeps(dir))` as its control server's reset (a `ResetError` carries `step` for the control answer's `details`), `ResetDeps`, `ENGINE_DATABASE`. U61c: the clients `e2e-mcp-caller` (an `oidc-audience-mapper` for `ursitoare-mcp`) and `e2e-plain-caller`, with the secrets of `clients.json`. After `20-reset.sh` the engine database holds the code's schema (migrations and the `dbos` schema) and no tenant, user, route or run; "E2E tenant" comes back from the next owner job or U61b's seeding. Keycloak holds the four journey users with their groups, the organizations `org-a` and `org-b` and both callers.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// test/support/stack/keycloak-overlay.ts
export const MAX_OVERLAY_ROUNDS: number;   // 3
export interface RealmOverlay { groups: readonly string[]; organizations: readonly string[]; users: readonly OverlayUser[]; clients: readonly { clientId: string; secret: string; mcpAudience: boolean }[] }
export function stackOverlay(users: Readonly<Record<string, OverlayUser>>, clientSecrets: Readonly<Record<"e2e-mcp-caller" | "e2e-plain-caller", string>>): RealmOverlay;
export interface AdminState { groups: { id: string; name: string }[]; organizations: { id: string; alias: string; members: string[] }[]; users: { id: string; username: string; groups: string[] }[]; clients: string[] }   // members are usernames; groups are top-level group names
export type OverlayRequest = { method: "POST" | "PUT"; path: string; body: unknown }   // body null: none is sent
export function planOverlay(state: AdminState, overlay: RealmOverlay): OverlayRequest[];
export function overlayGaps(state: AdminState, overlay: RealmOverlay): string[];
export interface AdminDeps { adminBaseUrl: string; adminUser: string; adminPassword: string; fetch?: typeof fetch; requestTimeoutMs?: number }   // timeout default 30000
export function readAdminState(deps: AdminDeps): Promise<AdminState>;
export function applyRealmOverlay(deps: AdminDeps, overlay: RealmOverlay): Promise<{ applied: number }>;
export function stackAdminDeps(dir: string): AdminDeps;   // reads <dir>/secrets/keycloak_admin_password
export function overlayMain(argv: readonly string[], io: { stdout(text: string): void; stderr(text: string): void }, opts?: { dir?: string; adminBaseUrl?: string; fetch?: typeof fetch }): Promise<number>;   // dir default env STACK_DIR, else /run/stack-e2e
// test/support/stack/reset.ts
export const ENGINE_DATABASE: string;   // "ursitoare"
export const TEMPLATE_DATABASE: string;   // "ursitoare_template"
export interface ResetDeps { adminUrl: string; adminPassword: string; ownerUrl: string; ownerPassword: string; engineOrigin: string; clock?: Clock; healthTimeoutMs?: number; healthPollMs?: number }   // timeout default 180000, poll default 1000
export class ResetError extends Error { readonly step: "template" | "drop" | "create" | "health"; readonly reason: string; constructor(step: ResetError["step"], reason: string) }   // message: reset failed at step <step> (<reason>)
export function prepareTemplate(deps: ResetDeps): Promise<{ created: boolean; applied: number }>;
export function resetEngineDatabase(deps: ResetDeps): Promise<{ engineRestarted: boolean }>;
export function waitForEngine(deps: ResetDeps): Promise<{ sawFailure: boolean }>;   // only engineOrigin, healthTimeoutMs and healthPollMs are read
export function stackResetDeps(dir: string): ResetDeps;   // reads <dir>/secrets/db_superuser_password and db_owner_password
export function resetMain(argv: readonly string[], io: { stdout(text: string): void; stderr(text: string): void }, opts?: { dir?: string; deps?: Partial<ResetDeps> }): Promise<number>;   // dir default env STACK_DIR, else /run/stack-e2e
// test/support/stack/fake-admin.ts
export interface RecordedRequest { method: string; path: string; authorization: string | null; contentType: string | null; body: string }
export interface FakeAdminOptions { adminUser?: string; adminPassword: string; groups?: readonly string[]; organizations?: readonly { alias: string; members?: readonly string[] }[]; users?: readonly { username: string; groups?: readonly string[] }[]; clients?: readonly string[]; missingRealm?: boolean; failOn?: { method: string; path: string; status: number }; hang?: boolean }
export interface FakeAdminSnapshot { groups: string[]; organizations: { alias: string; members: string[] }[]; users: { username: string; groups: string[]; password: string | null; email: string | null; firstName: string | null; lastName: string | null }[]; clients: { clientId: string; secret: string | null; serviceAccounts: boolean; standardFlow: boolean; audiences: string[] }[] }
export interface FakeAdmin { url: string; token: string; requests: readonly RecordedRequest[]; snapshot(): FakeAdminSnapshot; close(): Promise<void> }
export function startFakeAdmin(opts: FakeAdminOptions): Promise<FakeAdmin>;
```

**Interfaces taken:** From `add-stack-overlay`: `OverlayUser`, `readUsers`, `readClients`, `scriptProblems`. From `add-init-secrets`: `SECRET_FILES`. From `add-keycloak-realm`: `REALM_GROUPS`. From `add-hobbyist-compose`: `readCompose`, `STACK_SERVICES`. From `add-tenant-bootstrap`: `dbRolesCommand`, `dbPrepareCommand`.

The merged names (`prepareDatabase`, `createPool`, `ensureRoles`, `prepareDurable`, `Clock`, `fixedClock`, `runCli`, `createDefaultRegistry`, `startCluster`) are in `delivered-shapes.md`.

## Out of scope

Seeding, the stack control server and `fake_only` (U61b); contracts, snapshots and the exit-19 token checks (U61c); `scripts/stack-e2e.sh` and its other steps (U61, U61b, U61c); changing U58's realm or its browser flow; removing a user, group or client; rotating a caller secret on an existing client; the vault and Keycloak's database; a CI workflow; any run of Docker, Keycloak or the real engine (the delegate's). The orchestrator edits the `roadmap.md` rows.
