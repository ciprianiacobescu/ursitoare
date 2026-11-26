## Context

U61 fixed the project, the state directory and the step framework. This unit adds the two steps that prepare the stack for the journeys: the realm overlay (`--import-realm` never re-applies U58's import) and the engine-database reset. No gate runs Docker, Keycloak or the real engine: every rule is a function over an in-process fake admin server or embedded Postgres, and `test-plan.md` § STACK-ONLY names the delegate's step for each runtime fact. 

## Decisions

1. **A plan, then rounds.** `planOverlay` is pure and lists only what the read state lacks. A request can name an id that does not exist yet (an organization member needs the user's id), so `applyRealmOverlay` runs up to `MAX_OVERLAY_ROUNDS` (3) rounds of token, read, plan, send. A fresh realm needs two: round 1 creates groups, organizations, clients and users (a user's group paths ride in its create body), round 2 adds the members; a third read finds nothing missing. Each round takes a new admin token (the master realm's lives about a minute).
2. **The run ends with a check, not a count.** `applyRealmOverlay` answers only when a read shows no gap (`overlayGaps`); if gaps remain after the last round, or the plan is empty while gaps remain, it throws `overlay: the realm still lacks <items>`. So `10-overlay.sh` cannot print `overlay: applied <n>` over an incomplete realm, whatever the real admin API does with a body the fake accepts. A 409 on a POST counts as present; if the lists never show the object, the check fails instead of looping.
3. **Additive only.** The overlay creates and adds; it never deletes or edits. An existing user keeps its password and profile; an existing client keeps its secret (the state holds client ids only; U61 never regenerates `clients.json`). Every path is one of four collections under `/admin/realms/ursitoare/`, so the realm and its flows are never addressed.
4. **Payloads** (`test-plan-data.md`). A user has a complete profile and a non-temporary password, so no required action stops a sign-in, and its `name` claim reads `Alice Example` as `OVERLAY_USERS` says. An organization is `{ name: alias, alias, enabled: true, domains: [] }`, the form U58 imports. A caller client is confidential with a service account and no browser flow; only `e2e-mcp-caller` has the audience mapper.
5. **State shape (a card deviation).** `AdminState.groups` holds `{ id, name }`: adding an existing user to a group is `PUT /users/<id>/groups/<group id>`. `members` are usernames. No later unit reads `AdminState`.
6. **Settings from files.** Inside the runner `STACK_DIR` (default `/run/stack-e2e`, read-only) holds `secrets/` and the two JSON files. `stackAdminDeps` fixes `http://keycloak:8080` (the engine's back-channel origin in the compose file) and the user `admin` (U57's `.env`); `stackResetDeps` fixes the compose file's database URLs and `http://ursitoare:8080`; a test compares each with the committed compose file. No printed line or error text holds a password or response body.
7. **Entry functions.** `overlayMain` and `resetMain` take `argv` and an io pair and return the exit code; the main guards only pass the process arguments and streams.
8. **The template.** `ursitoare_template` (owner `ursitoare_owner`) is created when absent and, on every call, brought up with the two functions `db-prepare` runs (`prepareDatabase`, `prepareDurable`) as the owner: a template prepared once would carry an old milestone's schema into later runs. `prepareDurable` writes DBOS progress to the console, so it runs with the console methods silenced (as `test/support/e2e-stack/durable-part.ts:105` does for itself) and the step's stdout holds only its own lines. Afterwards the function ends sessions left on the template, since `CREATE DATABASE ... TEMPLATE` refuses a source in use.
9. **The reset.** As the superuser on the maintenance database: `DROP DATABASE IF EXISTS "ursitoare" WITH (FORCE)`, then `CREATE DATABASE "ursitoare" OWNER "ursitoare_owner" TEMPLATE "ursitoare_template"` (one retry after SQLSTATE `55006`). `reset.ts` holds no word `keycloak`, `vault` or `docker`, so Keycloak's database and every volume are out of reach. A template copy does not carry the database-level grants, and `PUBLIC` keeps `CONNECT`, so both roles connect at once; the next `db-roles` re-grants.
10. **Waiting for the engine.** Recovered means `GET <engineOrigin>/health` answers 200 with `checks.db` `"ok"`. The poll runs every `healthPollMs` (1000), each request times out at 5000 ms, and the wait gives up when a failed poll ends at or after `healthTimeoutMs` (180000): at most the timeout plus one interval plus 5000 ms, 186 s with the defaults. `engineRestarted` is true when a poll failed before the first success. A first poll that already succeeds is accepted: the engine's pool replaces connections the drop ended, and a request on a dead one fails the check, which counts as a failure.
11. **The step recovers a silent engine once.** The runner has no Docker, so `20-reset.sh` runs `reset.ts --prepare`; on exit 3 (health timeout) it runs `$COMPOSE restart ursitoare` and `reset.ts --wait`, failing with that code if the engine is still silent. The bound is two waits plus one restart (about 6.5 minutes plus Docker's stop time), not a measurement; the delegate records the real times. Other failures exit 1, usage errors 64.
12. **An interrupted reset recovers.** A kill between the two statements leaves no `ursitoare`: U59a's `db-roles` creates it from the maintenance database, `db-prepare` migrates it, and the next `20-reset.sh` rebuilds the template and replaces it. The owner job names "E2E tenant" explicitly, so a tenant-less database never stops an `up`.
13. **The fake admin server** (`fake-admin.ts`) serves the routes of `test-plan-data.md`, keeps its realm in memory and records every request in full; options force a missing realm, one failing write, or silence.
14. **Embedded Postgres.** The reset tests start their own cluster (the database names are fixed and `ensureRoles` rewrites role passwords, so never the shared one) and remove its `dataDir`. They capture stdout and stderr around every `prepareTemplate` call, failing `prepareDurable` included, and expect nothing.

## Interfaces

Given, equal to `proposal.md`. Taken: `delivered-shapes.md` and `proposal.md` § Interfaces taken.

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

Red tests import these names from the file their header names; `OverlayUser`, `readUsers`, `readClients`, `scriptProblems` from `test/support/stack/project.ts` (U61), `REALM_GROUPS` from `test/deploy/realm.ts`, `readCompose`, `STACK_SERVICES` from `test/deploy/compose.ts`, `SECRET_FILES` from `src/cli/init-secrets.ts`, `createDefaultRegistry` from `src/cli/builtin.ts` and `runCli` from `src/cli/run.ts` (U59a's `dbRolesCommand` and `dbPrepareCommand` run through them). Stubs: constants empty or `""`, functions throw `Error("not implemented")`, so each red test fails by assertion.

## Failure cases

| Case | Result |
|---|---|
| a step or the README is missing | the test's `existsSync` assertion fails first, never `ENOENT` |
| any admin failure (rows E1 to E8) | `overlay: <step> <what>`, exit 1 from `overlayMain`; nothing printed holds a secret |
| owner role missing, a wrong password, a failing `prepareDurable` | `ResetError` at `template` (`42704`, `DB_UNAVAILABLE`, `28P01`, `DURABLE_UNAVAILABLE`) |
| template absent at reset; the engine never answers | `ResetError` at `create` (`3D000`), recovery by decision 12; at `health` (`timeout`), exit 3 |

## UNVERIFIED (no gate runs Keycloak, the real engine or `postgres:18`; each is a STACK-ONLY row or a stated limit)

Every Keycloak admin call: the token at `http://keycloak:8080` while the realm's hostname is fixed; `domains: []`; the member POST body as a JSON string; user create with `groups` paths and a credential; the `max=1000` list parameters; the client body. The official Postgres 18 image accepting `WITH (FORCE)` and the template copy (embedded Postgres 18 does); the real engine and its durable runtime after a forced drop; the Postgres healthcheck staying green while `ursitoare` is absent; the seconds any step takes; `$COMPOSE run --rm runner` without `-T` in a non-interactive shell (U61's step form).

## Deviations from the card

Added: `MAX_OVERLAY_ROUNDS`, `overlayGaps`, `stackAdminDeps`, `overlayMain`, `AdminDeps.requestTimeoutMs`, `ResetError`, `waitForEngine`, `stackResetDeps`, `resetMain`, `ResetDeps.healthPollMs`, `fake-admin.ts`. Changed (D54): `AdminState.groups` holds ids; `stackOverlay` derives its groups and organizations from the users, sorted; the template is schema-only.
