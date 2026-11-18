## Context

Four later units (U21b, U07c, U28b, U37c) need names and the caller's teams for every signed-in role. `GET /api/v1/users` needs `manage_users_roles`, `RunView` has exactly 15 keys and `GET /runs/:id` deep-equals `toRunView(record)`, and `/me` has exactly four keys. So: two read routes and a web cache, no page.

## Decisions

1. **Authorisation.** Both routes are `auth { kind: "session" }` under `read_self` with the default resource (the caller's tenant), exactly as `GET /api/v1/me`. The platform layer permits `read_self` to every principal, so every signed-in member may call them; the decision is the PEP's, as for `/me`. No new action, fragment, error code or migration. The decision is recorded; a read writes no audit event.
2. **What is disclosed.** The caller supplies ids it already holds (run principals, version authors, mappings) and gets the display name of each that exists in its tenant: a member can read a name for any user id of its own tenant, nothing more.
3. **Unknown ids are omitted, not marked, not an error.** Another tenant's id, one that never existed and a typo give the same answer, so the route is no oracle for another tenant (scenario 5 compares the bodies). Disabled users and service accounts are included, since run history names them. Only `userId`, `displayName` and `kind` are selected and returned, never `email`, `state` or `ownerUserId`.
4. **Bounds.** One query member, one pattern: 1 to 50 ids of `^[A-Za-z0-9_-]{1,64}$` joined by commas. A bad list is a 400 from validation before the decision and the database, so it leaves no `policy_decision` row (authentication runs first: no cookie and a bad list is a 401). `getPersonNames` repeats the checks, counting repeats, before any query. One tenant check and one `SELECT … WHERE tenant_id = $1 AND user_id = ANY($2::text[])` serve any list. The largest answer is 50 items of 11 + 64 (id) + 17 + at most 1,200 (200 control characters, each escaped to 6 bytes; the `user` checks allow them) + 19 (`service`) bytes, plus 49 commas and 12: 65,611 bytes, measured with 50 service accounts named 200 U+0001. The tested limit is 66,000; 200 four-byte characters measure 45,511.
5. **Tenancy in three layers.** The statement filters on the context's tenant, `assertTenantMatches` refuses a transaction opened for another tenant, and the forced row-level policy of `user` hides other tenants even without the filter (scenario 2). The tenant comes from the session, never the request: a `tenant_id` member is a 400 on `/people` and ignored on `/me/teams`, an `x-tenant-id` header is ignored.
6. **Not active means 401, as `/me`.** A session can outlive a disabled user. Each handler reads the caller's row in its transaction (`getUser`) and answers 401 `UNAUTHENTICATED` when it is missing or not `active`, before any name; `/me/teams` needs it too, since `loadMemberships` gives a disabled user no teams and `[]` would hide the state.
7. **Teams have their own route** because `/me` is pinned to `capabilities, csrfToken, tenant, user`. `GET /api/v1/me/teams` answers the page shape `{ items: [{ id }], next_cursor: null }` from `request.principal.teams` (active memberships, at most 64), deduplicated and sorted by code unit. A team is only an id.
8. **Registered without a database.** The OpenAPI document is built with no database and `registerMeRoute` defines `/me` then, so `registerPeopleRoutes` defines both routes whatever `deps.pool` is; with none, a request is the PEP's 503 `AUTHZ_UNAVAILABLE`.
9. **Cache semantics.** `createNameCache` keeps names, misses (ids a successful answer left out) and requests in flight; `resolve` asks the valid, unseen, not-in-flight ids in batches of `maxBatch`, concurrently, and stores an answer only for the ids a batch asked. A failed or malformed batch is forgotten and nothing retries by itself (a failing server is asked once per `resolve`). A `resolve` for an id in flight waits for that request (two components mounting together send one) and gets no name if it failed. The cache is unbounded for the page's life (a tenant's people are few). This completes the card's text; no name changes.
10. **Enrichment reads use the plain client (ruling R5).** `nameCache` is `createNameCache(createApiClient())` and `useMyTeams` calls `loadMyTeams(createApiClient(), signal)`; neither touches `browserSession.api`. `browserSession.api` wraps `withSessionEnd` (`web/src/auth/session-fetch.ts:47-70`), which redirects to sign-in on any 401 `UNAUTHENTICATED`; a page's mocked browser test has no session, so a names or teams call a later unit adds reaches the real stack unauthenticated and ends it (seen: U15d's flows-form test fails once U28b's Flows page calls `/me/teams`). The plain client has no such handler: a 401, like any failure, gives an empty map or `[]`, names fall back to ids, no team is suggested, and the session is never ended by these reads (a page's own primary reads keep the session client and still detect a real session end). Checked: `createApiClient()` reads nothing from `window` (it uses `globalThis.fetch` at call time, `client.ts:148`), so `people.ts` imports it statically and runs under Node; the earlier lazy `import()` of `browser-session.ts` (which reads `window.location` at import) is not needed. GETs need no CSRF header. A composed build with this change (main, U15c, U15d, U07b, U28b, U37b) fails U15d's `test_flows_form_is_bounded_and_keeps_its_focus_ring` with the session client (redirect to `/sign-in?error=SESSION_ENDED&return_to=%2Fflows`) and passes with the plain one, together with the 15 tests of `test_m6b_kit.py`, `test_m6b_workspace.py` and `test_m6b_run_inputs.py`.
11. **Parsing is never stricter than the engine.** One bad item would hide a whole batch, so `parsePeople` accepts any non-empty name (`btrim` trims spaces only, so `"\u00a0"` is stored) and `personLabel` trims and falls back to the id. `parseMyTeams` uses the team pattern of the table, as the owner team of `web/src/flows/flows.ts`.
12. **Hooks are glue.** `useDisplayNames(ids)` keys its effect on `JSON.stringify(ids)`, calls `nameCache.resolve` with an `AbortController` aborted on cleanup and keeps the map in state; `useMyTeams()` does the same with `loadMyTeams(createApiClient(), signal)`; both ignore failures and neither imports `../auth/browser-session.ts`. A Node test cannot run them and nothing renders them here, so they have no requirement: the browser tests of U21b, U28b and U37c (which mock `/people` and `/me/teams`) prove them; the typecheck, lint and build gates check their form.
13. **Display names are untrusted text** (an identity-provider claim, at most 200 characters, control characters allowed): returned JSON-escaped, rendered by consumers as React text, never HTML, a URL or a class.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Merged shapes: `delivered-shapes.md`.

```ts
// src/identity/users.ts (exported from src/identity/index.ts)
export interface PersonName { userId: string; displayName: string; kind: UserKind }
export async function getPersonNames(tx: TenantTx, ctx: TenantContext, userIds: readonly string[]): Promise<PersonName[]>;
  // 0-50 ids, each ^[A-Za-z0-9_-]{1,64}$, else IdentityError IDENTITY_INVALID before any query;
  // rows of ctx's tenant only (assertTenantMatches as getUser does), in the order of first appearance, duplicates once,
  // unknown ids left out, disabled users and service accounts included; 0 ids answers [] without a query

// src/api/people-routes.ts (exported from src/api/index.ts; registered in src/main.ts right after registerMeRoute)
export const PEOPLE_MAX_IDS = 50;
export function registerPeopleRoutes(server: FastifyInstance, deps: PepDeps): void;
//   GET /api/v1/people?ids=<id>[,<id>…]   auth { kind: "session" }, action "read_self"
//     querystring { ids: string, pattern ^[A-Za-z0-9_-]{1,64}(,[A-Za-z0-9_-]{1,64}){0,49}$ }, additionalProperties false
//     200 { items: { userId: string; displayName: string; kind: "human" | "service" }[] }   (getPersonNames order)
//     400 VALIDATION_FAILED for a missing, empty, malformed or 51-id list; 401 without a session
//     401 UNAUTHENTICATED when the caller's own user row is missing or not "active", exactly as /me does (src/api/me.ts:72-78)
//   GET /api/v1/me/teams   auth { kind: "session" }, action "read_self"
//     200 { items: { id: string }[]; next_cursor: null }   request.principal.teams, each once, sorted by code unit
//     the same 401 rule for a non-active caller
//   both: Cache-Control no-store, as /me; no audit event (reads)

// web/src/people/people.ts
export interface PersonName { userId: string; displayName: string; kind: "human" | "service" }
export function parsePeople(raw: unknown): PersonName[] | null;   // the 200 body; null on any malformed item
export function parseMyTeams(raw: unknown): string[] | null;      // the 200 body of /me/teams
export function personLabel(names: ReadonlyMap<string, string>, userId: string): string; // trimmed name, else userId
export interface NameCache {
  resolve(userIds: readonly string[], signal?: AbortSignal): Promise<ReadonlyMap<string, string>>;
  peek(userId: string): string | undefined;
}
export function createNameCache(api: Api<"get">, maxBatch?: number): NameCache;
  // maxBatch default 50; asks only valid, not yet asked ids, in batches, as query { ids: "a,b" } on "/people";
  // remembers answers and misses for the page's lifetime; a failed batch resolves without those names (and may be
  // asked again by a later resolve); rejects only with an AbortError when the signal aborts
export const nameCache: NameCache;                                // over createApiClient(), the plain client: a 401 ends no session
export function loadMyTeams(api: Api<"get">, signal?: AbortSignal): Promise<string[]>; // [] on any failure but abort
// web/src/people/use-names.ts
export function useDisplayNames(userIds: readonly string[]): ReadonlyMap<string, string>; // empty until resolved; never throws; renders nothing
export function useMyTeams(): readonly string[] | null;          // null while loading, then the teams ([] on failure)
```

## Security

1. **Authentication and the PEP.** Session cookie only; action `read_self` for both routes, as `/me` on main (session auth, `read_self`, no resource loader), so the 25 actions and nine fragments are unchanged.
2. **Tenant isolation.** No new table; the new statement is parameterised and tenant-leading (decision 5). Two-tenant tests: scenario 2 (function), 5 (route: mallory in tenant B asks for tenant A's ids and gets `{"items":[]}`, the body of ids that exist nowhere; `twin` exists in both tenants and each caller reads its own name) and 8 (teams).
3. **Input validation.** The pattern of decision 4, `additionalProperties: false`, the same checks in `getPersonNames`, a parameterised `= ANY($2::text[])`; an id such as `a'b` fails the pattern.
4. **Secrets.** None read, written or logged.
5. **Abuse cases.**

| Attempt | Outcome | Scenario |
|---|---|---|
| Read another tenant's names by guessing ids | nothing, the body of a never-existing id | 2, 5 |
| Pick a tenant with `tenant_id` or `x-tenant-id` | 400 on `/people`; ignored on `/me/teams` and for the header | 5, 8 |
| Learn e-mail, state or owner | not selected, not in the schema | 1, 4 |
| Send many ids, a long id, a comma or newline in an id | 400 before any decision or query | 6 |
| Enlarge the answer | at most 50 items, 66,000 bytes | 6 |
| Keep reading with a disabled user's session | 401 | 7 |
| Skip the PEP | `read_self` decides; a deny is 403, no name read | 4 |
| Poison the web cache with extra items | ignored: only asked ids are stored | 11 |

Residual risk, stated not closed: a member can confirm which of up to 50 guessed ids exist in its own tenant, at any request rate, as the engine has no rate limiter (none in `src` or `docs`). User ids are time-ordered UUIDs with about 60 random bits (inferred from `src/core/ids.ts`), so blind guessing is infeasible, and a member who holds an id learns only a display name. Architecture §11 says every call passes the PEP, reads included (`read_self` does); its Identity row lists no people or teams lookup, which the orchestrator adds. A `read_people` action and fragment would add policy surface and no protection against the above.

## Failure cases

| Case | Result |
|---|---|
| no session (a bad list too); caller's row missing or not active | 401 `UNAUTHENTICATED`, no name read |
| missing, empty, malformed, 51-id or extra-member list | 400 `VALIDATION_FAILED`, no decision row |
| unknown or other-tenant id | omitted, 200 |
| policy denies, errors or is down; no pool | 403 `FORBIDDEN`; 503 `AUTHZ_UNAVAILABLE` (the PEP) |
| the database throws | the framework's 500; `getPersonNames` never answers `[]` for it (scenario 3) |
| `HEAD` | 404, as `/me` |
| web: failed, malformed or 401 answer | no names for the batch, asked again by a later resolve; a 401 is an empty result and never a redirect (R5) |
| web: abort; invalid id | `AbortError` (the hooks ignore it); the id is never sent and `personLabel` shows it |

## Frozen pins checked

Read on main@3daa5c35 and run in the scratch copy (test-plan.md § Provenance):
- `src/api/me.test.ts` (C-0f1f124b, C-07420469, C-c3bb1913): `me.ts` is untouched; scenario 8 asserts the four keys again. `run-read.test.ts:353-379`, `run-views.test.ts:145`, `:184`: no `RunView` change.
- `src/api/admin-policy.test.ts` C-8a23d872 (19 admin routes), now verified (the card said UNVERIFIED): `adminRoutesOf` keeps routes whose action is `manage_users_roles` or `manage_tenant`, and its `registerOn` installs only the PEP and `registerAdminRoutes`; `src/main.admin.test.ts` filters the same way and the other `src/main.*.test.ts` by URL prefix. A `read_self` route is never counted.
- `src/main.conventions.test.ts` C-d150bfa4: unedited; the document is regenerated in task 4.1.
- 27 error codes and 25 actions: none added. Module graph (`test/arch/modules.test.ts` C-90199ce0, C-851f3c7c): `api` already imports `identity`. Egress inventory: no gateway import. `test/arch/web-routes.test.ts` C-b5956c2d and `web/src/kit/contrast.test.ts` C-d365d748: no feature file, no `.tsx`. Licences: no dependency. `test/arch/repo.test.ts`: the new files pass.

## Verification

Only `pnpm run test <path>` per task. Route tests use embedded Postgres and the real PEP (the `me.test.ts` pattern); cache tests a recording fake client and, for the plain-client 401 case, a stubbed `window` and `fetch`. This change touches `web/**`, so L4 counts every criterion as UI-facing and its browser step finds no test for a pure function or an API route: expect holds that need a waiver, as every M6 web unit had. A browser test would test nothing built here: no page shows a name until U21b, U07c, U28b and U37c.

## Decisions made while writing

- 12 scenarios against the card's 10 to 11 (the brief allows 13): the route and the function refuse on different layers.
- `add-policy-catalogue` (the platform `read_self` permit; the card named `add-pdp-cedar`) and `add-web-shell` and `add-web-admin` (the web shapes restated) are listed as merged dependencies.
- R5 (2026-11-18) replaced the lazy session binding of the first draft by the plain client.
- With no signal `loadMyTeams` passes `undefined`, not `{ signal: undefined }`, which `exactOptionalPropertyTypes` forbids.
