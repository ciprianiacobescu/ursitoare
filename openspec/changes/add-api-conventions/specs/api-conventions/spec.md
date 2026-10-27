## Purpose

Shared API conventions: one error-code registry, cursor pagination, idempotent creates through `Idempotency-Key`, a generated OpenAPI document, and a guard that web pages never shadow API paths.

## ADDED Requirements

### Requirement: Every error code is registered
`ERROR_CODES` SHALL hold the status and default message of every error code the API can answer so far, and a test SHALL fail when a non-test `src/**/*.ts` file constructs `new ApiError(` with a literal code not in it or a defined route lists one in `errors`.

#### Scenario: The registry
- **WHEN** `ERROR_CODES` is read
- **THEN** it has exactly these 16 entries, `CODE status "message"`, and `isRegisteredCode` is true for each and false for `cursor_invalid`, `""` and `NOT_A_CODE`: `NOT_FOUND 404 "Route not found"`, `VALIDATION_FAILED 400 "Request validation failed"`, `PAYLOAD_TOO_LARGE 413 "Payload too large"`, `UNSUPPORTED_MEDIA_TYPE 415 "Unsupported media type"`, `BAD_REQUEST 400 "Bad request"`, `INTERNAL 500 "Internal server error"`, `WEB_NOT_BUILT 503 "Web app is not built"`, `UNAUTHENTICATED 401 "Authentication required"`, `FORBIDDEN 403 "Action not permitted"`, `CSRF_INVALID 403 "CSRF token missing or invalid"`, `OIDC_CSRF_INVALID 403 "CSRF token missing or invalid"`, `OIDC_NOT_CONFIGURED 503 "Sign-in is not configured"`, `AUTHZ_UNAVAILABLE 503 "Authorization is unavailable"`, `CURSOR_INVALID 400 "Cursor is invalid"`, `IDEMPOTENCY_KEY_REUSED 422 "Idempotency key was used with a different request"`, `IDEMPOTENCY_IN_PROGRESS 409 "A request with this idempotency key is in progress"`

#### Scenario: An unregistered literal code fails the scan
- **WHEN** `checkApiErrorCodes` runs on a snapshot whose `src/x/a.ts` has `throw new ApiError(409, "FLOW_EXISTS", "x")` on line 3, with the registered list `["NOT_FOUND"]`
- **THEN** it returns one violation with code `ARCH_API_ERROR_CODE`, file `src/x/a.ts`, line 3, and a message that names `FLOW_EXISTS` and `src/api/error-codes.ts`

#### Scenario: Registered, dynamic and test uses pass
- **WHEN** a snapshot holds `new ApiError(404, "NOT_FOUND", "m")`, `new ApiError(500, code, "m")` and a `src/x/a.test.ts` with the literal `"FLOW_EXISTS"`
- **THEN** `checkApiErrorCodes` returns `[]`, and also `[]` over `readSnapshot()` with the default registry

#### Scenario: Route errors
- **WHEN** `unregisteredRouteErrors` gets `GET /a` with errors `["NOT_FOUND", "NOPE"]` and `POST /b` with `[]`
- **THEN** it returns `["GET /a: NOPE"]`, and `[]` for no routes (the real engine's routes are checked in "The real engine" of the OpenAPI requirement)

### Requirement: List queries accept limit and cursor
A list endpoint SHALL accept the query parameters `limit` (an integer from 1 to 200, default 50) and `cursor` (a string of 1 to 1,024 characters), and `readPage` and `PAGE_QUERY_SCHEMA` SHALL answer 400 `VALIDATION_FAILED` for any other value.

#### Scenario: Defaults and bounds
- **WHEN** `readPage` gets `{}`, `{ limit: "25" }`, `{ limit: 1 }` and `{ limit: "200", cursor: "abc" }`
- **THEN** it returns `{ limit: 50, cursor: null }`, `{ limit: 25, cursor: null }`, `{ limit: 1, cursor: null }` and `{ limit: 200, cursor: "abc" }`

#### Scenario: Out-of-range values are refused
- **WHEN** `readPage` gets `limit` `"0"`, `"201"`, `"-1"`, `"1.5"`, `"abc"`, `""`, `["5", "6"]`, or `cursor` `""`, a 1,025-character string, `7`
- **THEN** each call throws `ApiError` 400 `VALIDATION_FAILED` with a `details.fields` entry `querystring/limit` or `querystring/cursor`

#### Scenario: Through the server
- **WHEN** a route with `schema: { querystring: PAGE_QUERY_SCHEMA }` answering `readPage(request.query)` gets `?limit=201`, `?limit=0`, `?limit=abc`, `?limit=20` and no query
- **THEN** the first three answer 400 `VALIDATION_FAILED` with a `querystring/limit` field; the others 200 `{ limit: 20, cursor: null }` and `{ limit: 50, cursor: null }`

### Requirement: Cursors are signed and bound to a tenant and a scope
`encodeCursor` SHALL produce an opaque base64url cursor signed with HMAC-SHA256 under a key that `deriveCursorKey` derives from the engine key, and `decodeCursor` SHALL answer 400 `CURSOR_INVALID` for a cursor that was altered, made under another key, tenant or scope, malformed, or longer than 1,024 characters.

#### Scenario: Round trip and key derivation
- **WHEN** a key from `deriveCursorKey({ reveal: () => "k".repeat(64) })` encodes `{ tenantId: "tenant_a", scope: "flows", position: ["2026-10-25T09:00:00.000Z", "f_1"] }` twice and decodes it with `{ tenantId: "tenant_a", scope: "flows" }`
- **THEN** both cursors are equal, match `^[A-Za-z0-9_-]+$` and decode to the position (also `[7]`); the key's `bytes` equal `hkdfSync("sha256", "k".repeat(64), "", "ursitoare/cursor", 32)` computed in the test

#### Scenario: Refused cursors
- **WHEN** `decodeCursor` gets a valid cursor with its first or last character changed, under `tenant_b`, under scope `runs`, under a key from `"j".repeat(64)`, `""`, `"!!!"`, a 1,025-character string, and a cursor with a correct MAC over a payload that is not JSON (built with `node:crypto`)
- **THEN** every call throws `ApiError` 400 `CURSOR_INVALID` ("Cursor is invalid"), without `details`

#### Scenario: Key material and claims are checked
- **WHEN** `deriveCursorKey` gets `null`, a 31-character text, or a `reveal` that throws; `encodeCursor` gets position `[]`, five entries, `NaN`, a 257-character string, or scope `""`
- **THEN** each call throws `RangeError` and no message contains the key text

### Requirement: Lists answer items and next_cursor
`paginate` SHALL turn the rows a handler fetched with `limit + 1` into `{ items, next_cursor }`, where `next_cursor` is a cursor for the last returned item when more rows exist and `null` otherwise, and `startAfter` SHALL turn a request cursor into the position to continue from.

#### Scenario: More rows than the limit
- **WHEN** `paginate` gets five rows `r1` to `r5` with `limit` 3 and `keyOf: (r) => [r.id]`
- **THEN** `items` is `r1`, `r2`, `r3` and `next_cursor` decodes (same tenant and scope) to `["r3"]`, which `startAfter(binding, next_cursor)` also returns

#### Scenario: A full walk, the last page and an empty list
- **WHEN** seven rows are read three at a time through `startAfter` and `paginate`, and `paginate` gets exactly 3 rows with `limit` 3, and no rows
- **THEN** the pages hold 3, 3 and 1 items with `next_cursor` set, set and `null`, each row once; the other calls answer `next_cursor: null` and `{ items: [], next_cursor: null }`

#### Scenario: Bad limit and foreign cursor
- **WHEN** `paginate` gets `limit` 0, 201 or 1.5; `startAfter` gets `null`, `"junk"`, and a cursor made for tenant B with tenant A's binding
- **THEN** `paginate` throws `RangeError`; `startAfter` returns `null`, throws 400 `CURSOR_INVALID`, and throws 400 `CURSOR_INVALID`

### Requirement: The Idempotency-Key header has one format
`idempotencyKeyOf` SHALL return the `Idempotency-Key` header when it is 1 to 128 visible ASCII characters (`!` to `~`), `null` when it is absent, and otherwise throw 400 `VALIDATION_FAILED`; `IDEMPOTENCY_HEADER_SCHEMA` SHALL make a route schema refuse the same values.

#### Scenario: Valid, absent and invalid keys
- **WHEN** a handler returns `idempotencyKeyOf(request)` for the header `abc-123_X.~`, a 128-character key, no header, `""`, a 129-character key, `has space` and `café`
- **THEN** it returns the key, the key, `null`, and throws 400 `VALIDATION_FAILED` four times with `details.fields` `[{ field: "headers/idempotency-key", message: "must be 1 to 128 visible ASCII characters" }]`

#### Scenario: The header schema
- **WHEN** a route with `schema: { headers: IDEMPOTENCY_HEADER_SCHEMA }` gets the keys `k-1`, `has space` and none
- **THEN** it answers 200, 400 `VALIDATION_FAILED` (field `headers/idempotency-key`) and 200

#### Scenario: The request digest
- **WHEN** `requestDigestOf` gets the same parts with object keys in two orders, and a changed method, route, params, query or body
- **THEN** the first two digests are equal 64-character hex strings, each changed call differs, and omitted `params`, `query` and `body` equal `null`

### Requirement: The idempotency table is tenant-isolated
Migration `0140_idempotency.sql` SHALL create `ursitoare.idempotency_key` with `tenant_id` leading its primary key `(tenant_id, principal_id, key)` and forced row-level security on `app.tenant_id`, so a tenant reads and changes only its own keys.

#### Scenario: Shape
- **WHEN** the migrated test database is inspected after `to_regclass('ursitoare.idempotency_key')` is shown not null
- **THEN** the ledger holds version 140 named `idempotency`, the columns are `tenant_id`, `principal_id`, `key`, `request_digest`, `state`, `response_status`, `response_body`, `created_at` in order, and `checkTenancyCatalog(db.ownerPool)` returns `[]`

#### Scenario: Two tenants
- **WHEN** tenant A inserts a key through `appPool`, then tenant B counts rows, inserts a row with A's `tenant_id`, and updates and deletes A's key
- **THEN** B counts 0, the insert is refused with `{ code: "42501" }`, and the update and delete touch 0 rows

#### Scenario: Bad rows
- **WHEN** a row has key `has space`, digest `xyz`, state `done` without `response_status`, or state `in_progress` with one
- **THEN** each insert is refused with `{ code: "23514" }`

### Requirement: A repeated request replays its stored response
`withIdempotency` SHALL run `fn` once for a tenant, principal and key, store its status and JSON body in the same transaction as `fn`'s writes, and return that stored response with `replayed: true` for the same key and digest; it SHALL throw 422 `IDEMPOTENCY_KEY_REUSED` for the same key with another digest.

#### Scenario: First call and repeat
- **WHEN** `withIdempotency` runs twice for tenant A, principal `u_1`, key `k1` and digest `d1` (64 hex characters), `fn` counting its calls and returning `{ status: 201, body: { id: "f_1" } }`
- **THEN** the results are `{ status: 201, body: { id: "f_1" }, replayed: false }` and the same with `replayed: true`, `fn` ran once, and the row is `done` with `response_status` 201 and `response_body` `{"id":"f_1"}`

#### Scenario: Atomic with the handler's writes
- **WHEN** `fn` inserts a row into a probe table and returns a body holding a `BigInt`, and then a later call with the same key returns a plain body
- **THEN** the first call rejects with `TypeError`, the probe table and `idempotency_key` hold no row, and the later call runs `fn` and stores its response with its probe row

#### Scenario: Another digest, principal or tenant
- **WHEN** key `k1` is used with digest `d2`; with principal `u_2`; and by tenant B with principal `u_1` and digest `d1`
- **THEN** the first rejects with `ApiError` 422 `IDEMPOTENCY_KEY_REUSED` and `fn` does not run; the others run their own `fn` with `replayed: false`, and tenant B's session sees only its own row

#### Scenario: Bad arguments
- **WHEN** `withIdempotency` gets key `has space` or `""`, digest `xyz`, an empty `principal.userId`, a `fn` result with status 99 or body `undefined`, and a pool whose `connect` rejects
- **THEN** the keys reject with 400 `VALIDATION_FAILED` before any query; digest, user id and status 99 with `RangeError`; body `undefined` with `TypeError`, leaving no key row; the pool error is rethrown and `fn` never runs

### Requirement: An unfinished, failed or expired key does not replay
`withIdempotency` SHALL throw 409 `IDEMPOTENCY_IN_PROGRESS` while the first call with the key has not finished, SHALL release the key when `fn` rejects so a retry runs `fn` again, and SHALL ignore a key created 24 hours or more before the injected clock's `now`.

#### Scenario: In progress
- **WHEN** a first call blocks inside `fn` on a promise the test holds, a second call uses the same key and digest, a third another digest, then the test releases the first and a fourth call follows
- **THEN** the second rejects with `ApiError` 409 `IDEMPOTENCY_IN_PROGRESS` and the third with 422, `fn` ran once; the first resolves with `replayed: false`; the fourth replays with `replayed: true`

#### Scenario: A failed attempt releases the key
- **WHEN** `fn` throws `new ApiError(409, "X_TEST", "m")`, then the call is repeated with a `fn` that succeeds
- **THEN** the first call rethrows that error and leaves no row; the second runs and returns `replayed: false`; when the release itself fails (a pool wrapper rejects `DELETE`) the original error is still thrown and the next call is 409

#### Scenario: Keys expire after 24 hours
- **WHEN** a key is stored at `2026-10-25T09:00:00Z` and the injected clock reads `2026-10-26T08:59:59.999Z`, then `2026-10-26T09:00:00Z` with a different digest
- **THEN** the first repeat replays; the second runs `fn` again, returns `replayed: false`, and the row now holds the new digest, a `created_at` of the new time and the new response

### Requirement: An idempotent response marks a replay
`respondIdempotent` SHALL run a handler's write once per `Idempotency-Key` of the authenticated principal, answer a repeat with the stored status and body and the header `Idempotent-Replayed: true`, and behave as a plain write when the header is absent.

#### Scenario: Create twice
- **WHEN** a POST route calls `respondIdempotent` with a `fn` that returns `{ status: 201, body: { id: "f_" + n } }` (n counts calls) and gets one body twice with `Idempotency-Key: k1`, then k1 with another body, then no key twice
- **THEN** the answers are 201 `{ id: "f_1" }`, 201 `{ id: "f_1" }` with `idempotent-replayed: true`, 422 `IDEMPOTENCY_KEY_REUSED`, and two 201 answers with different ids and no header

#### Scenario: Invalid key, in progress and no principal
- **WHEN** the route gets the key `has space`, a second request while the first is blocked, and a request where no hook set a principal
- **THEN** the answers are 400 `VALIDATION_FAILED` (write not run), 409 `IDEMPOTENCY_IN_PROGRESS` and 500 `INTERNAL`

### Requirement: An OpenAPI document is generated from the route definitions
`GET /api/v1/openapi.json` SHALL be a public route that answers an OpenAPI 3.1 document built by `buildOpenApiDocument` from the defined routes of the public listener, and a test SHALL fail when `docs/api/openapi.json` differs from the text `renderOpenApi` makes of the served document.

#### Scenario: Document from definitions
- **WHEN** `buildOpenApiDocument` gets `GET /api/v1/things/:id` (auth `session`, action `read_flow`, errors `["NOT_FOUND", "FORBIDDEN", "NOPE"]`, `params` with `id`, `querystring` `PAGE_QUERY_SCHEMA`, `headers` `IDEMPOTENCY_HEADER_SCHEMA`, `response` `{ 200: { type: "object" } }`), an `internal` route and `GET /*`, with `{ version: "1.2.3" }`
- **THEN** `openapi` is `"3.1.0"`, `info` is `{ title: "Ursitoare API", version: "1.2.3" }` and `paths` has only `/api/v1/things/{id}`, whose `get` has `operationId` `get_api_v1_things_id`, `x-ursitoare-auth` `session`, `x-ursitoare-action` `read_flow`, `x-ursitoare-errors` `["FORBIDDEN", "NOPE", "NOT_FOUND"]`, parameters path `id` (required), query `cursor` and `limit` and header `idempotency-key` (optional), and responses `200` with the schema, `403` (`Error codes: FORBIDDEN`) and `404` (`Error codes: NOT_FOUND`) referencing `#/components/schemas/ErrorEnvelope`; `NOPE` adds no response and throws nothing

#### Scenario: Canonical text
- **WHEN** `renderOpenApi` gets two documents that differ only in object key order
- **THEN** both texts are equal, with keys sorted at every depth, two-space indentation, arrays in order and one final newline

#### Scenario: Served by the engine
- **WHEN** a server with `registerOpenApiRoute(server, { version: "9.9.9" })` and one other defined route gets `GET /api/v1/openapi.json` without credentials
- **THEN** it answers 200 JSON equal to `buildOpenApiDocument(listDefinedRoutes(server), { version: "9.9.9" })`, which lists the route itself

#### Scenario: The real engine
- **WHEN** `main` runs (port 0, no database, no engine key) with an `inspectServers` that keeps both servers, and `servedOpenApiText()` fetches the document from a run of its own
- **THEN** the served document lists `/api/v1/openapi.json`, `/api/v1/me` and `/health` but not `/*`, `unregisteredRouteErrors` of all defined routes is `[]`, and `docs/api/openapi.json` exists and equals the served text (a mismatch says to run `node test/support/openapi-docs.ts`)

### Requirement: Web pages never shadow API paths
A test SHALL fail when a `feature.path` in `web/src/features/NN-<name>.tsx` equals or starts with a reserved root (`/api`, `/auth`, `/.well-known`, `/hooks`, `/callbacks`, `/mcp`, `/health`) or is not a string literal, or when a public-listener route other than `GET /*` lies outside those roots.

#### Scenario: Reserved paths
- **WHEN** `isReservedPath` gets `/api`, `/api/v1/x`, `/API/x`, `/auth/oidc/login`, `/auth/other`, `/.well-known/x`, `/hooks/abc`, `/callbacks/delegate/1`, `/mcp`, `/mcp/x`, `/health`, and then `/`, `/flows`, `/apis`, `/authors`, `/healthy`, `/t/abc`, `/runs/:id`
- **THEN** the first eleven answer `true` and the rest `false`

#### Scenario: Feature paths
- **WHEN** `checkFeaturePaths` runs on `web/src/features/10-home.tsx` (`path: "/"`), `20-a.tsx` (`path: "/api/flows"`, line 4), `30-b.tsx` (`path: "/health"`), `40-c.tsx` (`path: base + "/x"`) and `readme.md` (`path: "/api"`)
- **THEN** it returns `ARCH_WEB_PATH_RESERVED` for `20-a.tsx` line 4 and `30-b.tsx` and `ARCH_WEB_PATH_UNKNOWN` for `40-c.tsx`; over the real `web/src/features` files it returns `[]`, and every `RESERVED_ROOTS` entry of `src/api` is reserved by `isReservedPath`

#### Scenario: API routes
- **WHEN** `routesOutsideReservedRoots` gets `GET /api/v1/me`, `GET /health`, `POST /hooks/:id`, `GET /*`, `GET /flows` and `POST /runs`
- **THEN** it returns `["GET /flows", "POST /runs"]`; for the public server of the real engine it returns `[]`
