# people-directory Specification

## Purpose
A signed-in member reads the display names of users of their own tenant by user id, and their own teams, so the web app shows names instead of ids and suggests an owner team without any admin right.

## Requirements

### Requirement: Names are read for the context's tenant only, after the input is checked
`getPersonNames(tx, ctx, userIds)` SHALL refuse more than 50 entries or an entry outside `^[A-Za-z0-9_-]{1,64}$` with `IdentityError` `IDENTITY_INVALID` before any query, answer `[]` for an empty list without a query, and otherwise make one tenant check and one `SELECT` and return one `{ userId, displayName, kind }` per known id of `ctx`'s tenant, in the order the ids first appear, a repeated id once. An unknown id and an id of another tenant SHALL be left out, a disabled user and a service account included, and no other column read or returned.

#### Scenario: Names come back in first-appearance order, once, with unknown ids left out
- **WHEN** `getPersonNames` runs in a tenant-A transaction on `["svc_ci", "u_dan", "nobody", "u_carol", "svc_ci", "u_erin", "twin"]` and on `["twin", "u_carol"]` over the users of test-plan.md § Users
- **THEN** the first answer is `[svc_ci "CI bot" service, u_dan "Dan Disabled" human, u_carol "Carol Example" human, twin "Alice Twin" human]` (`nobody` is unknown, `u_erin` is tenant B's, `svc_ci` is once, the disabled user and the service account are in); the second is `twin` then `u_carol`; each item has exactly the keys `userId`, `displayName`, `kind`, so `carol@example.test` and `dan@example.test` appear nowhere

#### Scenario: Another tenant's users are never named
- **WHEN** `getPersonNames` runs in a tenant-B transaction on `["u_carol", "u_dan", "svc_ci", "twin", "u_erin"]`, and with a tenant-B transaction and the tenant-A context on `["twin"]`
- **THEN** the first answer is `[twin "Mallory Twin" human, u_erin "Erin Other" human]` (`twin` exists in both tenants and each sees its own); the second rejects with `IdentityError` `IDENTITY_TENANT_MISMATCH`; a bare `SELECT user_id FROM ursitoare."user" WHERE user_id = ANY($1::text[])` for `["u_carol", "u_dan"]` in the tenant-B transaction returns 0 rows, so row-level security alone hides them

#### Scenario: Bad input is refused before any query and a failing database is not hidden
- **WHEN** `getPersonNames` runs on a recording transaction with the 51 ids `n0` to `n50`, `["a b"]`, `[""]`, a 65-character id, `["ok", "a,b"]`, `["é"]`, `["u_carol\n"]`, `["a'b"]` and `[7]`; then `[]`; then the 50 ids `n0` to `n49`; then on a transaction whose `query` throws `Error("db down")`
- **THEN** each refused list rejects with `IdentityError` `IDENTITY_INVALID` and the recorder holds 0 queries; `[]` answers `[]` with 0 queries; the 50 ids answer `[]` with exactly 2 queries (tenant check, one `SELECT`); the failing transaction rejects with `Error("db down")`, not `[]`

### Requirement: GET /api/v1/people answers display names under read_self and nothing else
`GET /api/v1/people?ids=<id>[,<id>…]` SHALL be a session route under the action `read_self`, the resource being the caller's tenant, as `/me`. For a caller whose user row is `active` it SHALL answer 200 `{ "items": [{ "userId", "displayName", "kind" }, …] }` in `getPersonNames` order with `Cache-Control: no-store`, one `read_self` decision row and no audit event, and no other member. A deny decision SHALL answer 403 `FORBIDDEN` with the `decisionId` and read no name.

#### Scenario: A member reads the names of the ids it holds
- **WHEN** alice (tenant A, display name `alice`, email `alice@example.test`) calls `GET /api/v1/people?ids=svc_ci,u_dan,nobody,<alice's id>,svc_ci,u_erin,twin`
- **THEN** the answer is 200 with `items` `[svc_ci "CI bot" service, u_dan "Dan Disabled" human, <alice's id> "alice" human, twin "Alice Twin" human]`, each item with exactly the keys `displayName`, `kind`, `userId`; the body contains neither `@example.test` nor `email`; `cache-control` is `no-store`; tenant A holds exactly 1 `policy_decision` row with action `read_self` and decision `allow`, and the `audit_event` count is unchanged; with an engine that denies, the same call answers 403 `{"error":{"code":"FORBIDDEN","message":"Action not permitted","details":{"decisionId":"decision-deny"}}}`

#### Scenario: A member of tenant B gets nothing for tenant A's ids
- **WHEN** mallory (tenant B) calls `GET /api/v1/people` with `ids` `<alice's id>,u_carol,svc_ci,u_dan,twin,u_erin`; with `<alice's id>,u_carol,svc_ci,u_dan` and the header `x-tenant-id: tenant_a`; with `ghost1,ghost2,ghost3,ghost4`; with `tenant_id=tenant_a&ids=u_carol`; and alice calls `ids=twin`
- **THEN** the first answer is `[twin "Mallory Twin" human, u_erin "Erin Other" human]`; the second body is exactly `{"items":[]}` with status 200 and equals the third, so another tenant's id is indistinguishable from one that exists nowhere and the header changes nothing; the fourth is 400 `VALIDATION_FAILED` for the field `querystring/tenant_id`; alice's is `twin "Alice Twin"`; no body of mallory's contains `Alice Twin`, `Carol Example`, `Dan Disabled` or `tenant_a`

### Requirement: The people route bounds the ids and the size of its answer
`ids` SHALL be required, a string, and match `^[A-Za-z0-9_-]{1,64}(,[A-Za-z0-9_-]{1,64}){0,49}$`, and no other query member SHALL be allowed; any other request SHALL answer 400 `VALIDATION_FAILED` with `details.fields[0].field` naming the member, before any decision or query. At most `PEOPLE_MAX_IDS` (50) ids SHALL be accepted, and the largest answer, 50 items, SHALL be at most 66,000 bytes.

#### Scenario: Refusals, the limit and the largest answer
- **WHEN** alice calls `GET /api/v1/people` with no `ids`, `ids=`, `ids=a%20b`, `ids=a,,b`, `ids=a%0A`, a 65-character id, `PEOPLE_MAX_IDS + 1` ids `n0`…, `ids=a&ids=b` and `ids=a&x=1`; then with `PEOPLE_MAX_IDS` ids `n0`…; then tenant A holds 50 service accounts with 64-character ids and display names of 200 U+0001 and she asks for all 50
- **THEN** the nine refusals each answer 400 `VALIDATION_FAILED` with the field `querystring/ids` (the last `querystring/x`; the repeated `ids` says "must be string") and leave the count of `read_self` decision rows unchanged; the 50-id request answers 200 `{"items":[]}`; the 50 service accounts answer 200 with 50 items in 65,611 bytes, the worst case (each name escapes to 1,200 bytes: 50 × 1,311 + 49 commas + 12), so at most 66,000

### Requirement: Both routes refuse a caller who is not signed in or not active, and exist without a database
`GET /api/v1/people` and `GET /api/v1/me/teams` SHALL answer 401 `UNAUTHENTICATED` "Authentication required" without a session, before any validation, and when the caller's own user row is missing or not `active`, as `/me` does; neither SHALL answer HEAD. `registerPeopleRoutes` SHALL define both routes whether or not the dependencies hold a pool; a request without one SHALL answer 503 `AUTHZ_UNAVAILABLE`.

#### Scenario: Missing session, disabled caller, HEAD and no database
- **WHEN** `GET /api/v1/people?ids=u_carol`, `GET /api/v1/people?ids=a%20b` and `GET /api/v1/me/teams` carry no cookie; bob's user row is set `disabled` and bob calls `GET /api/v1/people?ids=u_carol` and `GET /api/v1/me/teams`; alice sends `HEAD` to both paths; `registerPeopleRoutes` runs with `pool: null` and `engine: null`, then `listDefinedRoutes` is read and the two paths are requested
- **THEN** the five requests without a session or from bob answer 401 `{"error":{"code":"UNAUTHENTICATED","message":"Authentication required"}}` (bob's body names no `Carol`); both HEADs answer 404; `listDefinedRoutes` holds `GET /api/v1/people` with errors `["AUTHZ_UNAVAILABLE","FORBIDDEN","UNAUTHENTICATED","VALIDATION_FAILED"]` and `GET /api/v1/me/teams` with the first three, both `{ kind: "session" }` and `read_self`; the two requests answer 503 `{"error":{"code":"AUTHZ_UNAVAILABLE","message":"Authorization is unavailable"}}`

### Requirement: GET /api/v1/me/teams answers the caller's own teams and /me keeps its shape
`GET /api/v1/me/teams` SHALL be a session route under `read_self` answering 200 `{ "items": [{ "id" }, …], "next_cursor": null }` with the teams of `request.principal`, each once, sorted by code unit, with `Cache-Control: no-store`; it SHALL ignore a `tenant_id` query member and read only the session's tenant. `GET /api/v1/me` SHALL still answer exactly the keys `capabilities`, `csrfToken`, `tenant`, `user`.

#### Scenario: Teams of alice, bob and mallory and the unchanged /me
- **WHEN** alice (tenant A) is a member of `finance` then `audit`, bob (tenant A) of none, mallory (tenant B) of `ops`; alice calls `GET /api/v1/me/teams` and `GET /api/v1/me/teams?tenant_id=tenant_b`, bob and mallory call `GET /api/v1/me/teams`, and alice calls `GET /api/v1/me`
- **THEN** alice's two bodies are `{"items":[{"id":"audit"},{"id":"finance"}],"next_cursor":null}`; bob's is `{"items":[],"next_cursor":null}`; mallory's is `{"items":[{"id":"ops"}],"next_cursor":null}`; `/me` has exactly the four keys and no `teams`

### Requirement: The committed OpenAPI document describes both routes
`docs/api/openapi.json` SHALL list `GET /api/v1/people` with the required query parameter `ids` and the pattern above and `GET /api/v1/me/teams`, both with `x-ursitoare-action` `read_self` and `x-ursitoare-auth` `session`, and `main` SHALL wire `registerPeopleRoutes` right after `registerMeRoute`, so the served document equals the committed one.

#### Scenario: The document lists the two routes
- **WHEN** the test reads `docs/api/openapi.json` and compares `servedOpenApiText()` with its text
- **THEN** `paths` holds 50 entries; `/api/v1/people` `get` has `x-ursitoare-errors` `["AUTHZ_UNAVAILABLE","FORBIDDEN","UNAUTHENTICATED","VALIDATION_FAILED"]`, responses `200`, `400`, `401`, `403`, `503` and the one parameter `{ in: "query", name: "ids", required: true, schema: { pattern: "^[A-Za-z0-9_-]{1,64}(,[A-Za-z0-9_-]{1,64}){0,49}$", type: "string" } }`; `/api/v1/me/teams` `get` has the first three errors and responses `200`, `401`, `403`, `503`; `/api/v1/me` still requires `["user","tenant","capabilities","csrfToken"]`; the served text equals the committed text

### Requirement: Answers are parsed without being stricter than the engine, and a name falls back to the id
`parsePeople` SHALL return the items of a `{ items }` body as `{ userId, displayName, kind }` and `null` for anything else: a `userId` outside `^[A-Za-z0-9_-]{1,64}$`, an empty or non-string `displayName` (a blank one is kept: the engine stores it), a `kind` other than `human` or `service`, or any malformed item. `parseMyTeams` SHALL return the ids of `{ items: [{ id }] }`, each once, each matching `^[a-z][a-z0-9_-]{0,63}$`, else `null`. `personLabel(names, userId)` SHALL return the trimmed name, or `userId` when it is absent, empty or blank. `loadMyTeams(api, signal)` SHALL call `get("/me/teams", opts)` and return `[]` on any failure, a 401 included, except an abort, which it rejects.

#### Scenario: Parsers, labels and the teams loader
- **WHEN** `parsePeople`, `parseMyTeams`, `personLabel` and `loadMyTeams` run on the rows of test-plan.md § Parsers
- **THEN** the valid bodies give the listed arrays (the name `"\u00a0"` kept, a repeated team once, an extra member dropped); the 13 malformed people bodies and 7 malformed team bodies give `null`; `personLabel` gives `Carol Example`, then the id for an unknown, an empty and a blank name; `loadMyTeams` records `["/me/teams", undefined]` or `["/me/teams", { signal }]`, answers `["finance"]` for the valid body and `[]` for a 401 `UNAUTHENTICATED`, a 500, a `TypeError` and a malformed body, and rejects with `AbortError` for an abort

### Requirement: The name cache batches, remembers and shares requests, and a failed lookup never ends the session
`createNameCache(api, maxBatch = 50).resolve(userIds, signal?)` SHALL ask only ids matching `^[A-Za-z0-9_-]{1,64}$` that have not been asked, in batches of at most `maxBatch`, one `get("/people", { query: { ids: "a,b" } })` each (with `signal` in the options only when given), and resolve a map of the known names in request order. It SHALL remember each answer and each id a successful answer left out, ignore an item whose id it did not ask, and treat an id whose request is in flight as asked, waiting for that request. A failed or malformed answer SHALL be forgotten and an abort SHALL reject with its `AbortError`. `nameCache` and `useMyTeams` SHALL use the plain `createApiClient()` and never `browserSession.api`, so a 401 or any failure gives an empty result and ends no session.

#### Scenario: Batches, memory, invalid ids and shared requests
- **WHEN** the cache of test-plan.md § Cache resolves 60 ids and again the same 60; `["a","b","c"]` with `maxBatch` 2 and a signal; the invalid-and-duplicate row; an answer holding the unasked `u_x`; and two resolves at once
- **THEN** the 60 ids make exactly 2 requests (50 and 10 ids), the second resolve none, the map has 60 entries in order and `peek("u7")` is `Name u7`; `maxBatch` 2 gives `a,b` then `c`, each with `{ query, signal }`; the invalid row makes one request for `b,ok,ghost`, the map holds `b` and `ok`, `ghost` is never asked again, `peek("u_x")` is `undefined` and a later resolve of it asks; concurrent `["a","b"]` and `["b","a"]` make 1 request, `["a","b"]` and `["b","c"]` make 2 (`a,b`, `c`)

#### Scenario: Failures are forgotten and aborts reject
- **WHEN** the first request fails with a 500, a 401 `UNAUTHENTICATED`, a `TypeError` or a malformed body and the second succeeds; the second of two batches of 60 ids fails; the signal is aborted before the call and during the request; and, with `window.location` at `/flows?x=1` and a stubbed `fetch`, `nameCache` resolves `["u_carol"]` against a 200, then `["u_bob"]` twice against a 401 `{"error":{"code":"UNAUTHENTICATED","message":"x"}}`, and `loadMyTeams(createApiClient())` meets the same 401
- **THEN** each failed first request resolves an empty map without throwing, and the next resolve asks again and gets `Name a` (2 requests); of the 60 ids the first resolve gives 50 and the second asks only the last 10 and gives 60; the aborted calls reject with `AbortError`, the pre-aborted one sending 0 requests, nothing remembered; `nameCache` sends `GET /api/v1/people?ids=u_carol` and resolves `Carol Example`; each 401 resolves an empty map, `window.location.assign` is called 0 times and the second resolve sends `GET /api/v1/people?ids=u_bob` again; `loadMyTeams` gives `[]` with 0 `assign` calls after one `GET /api/v1/me/teams`; the sources of `people.ts` and `use-names.ts` contain no `browser-session` or `browserSession` and each contains `createApiClient(`
