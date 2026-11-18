## Why

Alice (an `author`) sees `started by usr_01a1ed2a-…` on the run page and a free-text "Owner team" box: `GET /api/v1/users` needs `manage_users_roles`, and `/me` lists no teams. Names inside `RunView` or the version records would break frozen deep-equal tests, and `teams` in `/me` its four-key pin. So: two read routes any signed-in member may call, and a web cache that turns ids into names.

Observable result: `GET /api/v1/people?ids=svc_ci,u_dan,nobody,u_carol` answers `{ "items": [...] }` with the three ids that exist in the caller's tenant, each as `{ userId, displayName, kind }` in the order the ids appear and nothing else (no email, no state); a user of another tenant asking for the same ids gets `{"items":[]}`, byte for byte the answer for ids that exist nowhere. `GET /api/v1/me/teams` answers `{"items":[{"id":"audit"},{"id":"finance"}],"next_cursor":null}` for a member of those two teams. In the web app `nameCache.resolve(["u_carol"])` resolves `"Carol Example"` with one request, and asking again sends none.

## What Changes

- New capability `people-directory`, ADDED requirements only. No frozen test is edited; `/me`, `RunView` and the version records are untouched.
- `src/identity/users.ts`: `getPersonNames` and `PersonName` (one tenant check and one `SELECT` for any list).
- New `src/api/people-routes.ts`: `PEOPLE_MAX_IDS` and `registerPeopleRoutes`, which defines `GET /api/v1/people` and `GET /api/v1/me/teams` under `read_self`, the action of `/me`, with `/me`'s 401 rule for a caller not `active`. Both exist even without a database, as `/me` does, because the OpenAPI document is built without one.
- New `web/src/people/people.ts` (parsers, `personLabel`, `createNameCache`, `nameCache`, `loadMyTeams`) and `use-names.ts` (two hooks). No page changes and nothing renders; U21b, U07c, U28b and U37c take the hooks.
- `docs/api/openapi.json` regenerated (48 paths become 50).
- No migration, error code, policy action or fragment, e2e part, feature file, dependency or audit event.

## Impact

- **Scaffold:** signature stubs for the interfaces below are on the base branch (scaffold, `docs/decisions/0002`) in the files each header names; this change implements them. Not scaffolded: the export lines of `src/identity/index.ts` (`PersonName`, `getPersonNames`) and `src/api/index.ts` (`PEOPLE_MAX_IDS`, `registerPeopleRoutes`); the wiring line in `src/main.ts`; `docs/api/openapi.json`; the tests. The scaffold stubs `nameCache` as an object whose methods throw `not implemented`.
- **Depends on (all merged):** `add-tenancy-foundation`, `add-identity-model`, `add-pdp-cedar`, `add-policy-catalogue` (the platform `read_self` permit), `add-api-pep`, `add-api-conventions`, `add-roles-and-memberships` (`principal.teams`), `add-web-shell`, `add-web-admin`. No in-plan prerequisite: this is wave 1 of `m6b-ui`.
- **Deviations from the card:** none of a name or signature; design decisions 9 and 10 complete the card's text, and ruling R5 of `m6b-decisions.md` fixes the client: `nameCache` and the team lookup use the plain `createApiClient()`, never `browserSession.api`.

**Interfaces given** (the block of `design.md` § Interfaces). The headers name the files each name lives in.

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

**Interfaces taken:** From `add-tenancy-foundation`: `withTenantTx`, `TenantTx`, `TenantContext`. From `add-identity-model`: `getUser`, `UserKind`, `IdentityError`. From `add-api-pep`: `defineRoute`, `PepDeps`. From `add-web-admin`: `Api`. From `add-web-shell`: `createApiClient`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

## Out of scope

Any page or style change and any visible name (U21b, U07c, U28b, U37c); a `read_people` action or fragment; names inside `RunView` or the version records; an email or state in the answer; team names or member lists; searching users by name; rate limiting (the engine has none); a Node journey (D16); a browser test (nothing renders). Spec: `specs/people-directory/spec.md`; fixtures and recorded call shapes: `test-plan.md`; decisions, security and the frozen pins checked: `design.md`. Each task is one red-green cycle run with `pnpm run test <path>`.

Batch `m6b-ui` (U15c, U18b, U15d, U07b, U21b, U07c, U28b, U37b, U37c, U52c in plan order; closing unit `add-visual-review`, journey `e2e/test_m6b_ui.py`) delivers M6b: the web app is restyled on Tailwind CSS v4 and Radix primitives with a grouped sidebar, a home page of recent work, a flow workspace, run inputs built from the flow's input schema, a readable run view and people's names instead of ids, with zero CSP violations. This unit's part: the two read routes and the web name cache that give the later units names and the caller's teams without touching `/me`, `RunView` or any frozen shape. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.
