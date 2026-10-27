## Context

Dependencies as their folders define them:
- `add-engine-skeleton`: `ApiError(status, code, message, details?)` (status 400 to 599) answers `{ error: { code, message, details? } }`; a schema fault is 400 `VALIDATION_FAILED` with `details: { fields: [{ field, message }] }`, `field` = validation context + instance path (`querystring/limit`). `buildServer(deps: ServerDeps)`; `Clock { now(): Date }`, `sequentialIds(seed?)`, `noopTracer`, `createLogger({ level })`; `AppConfig`; `main(deps?: Partial<MainDeps>): Promise<RunningServer | null>`, `RunningServer { url; close() }`, `MainDeps { loadConfig; destination; signals; exit }`, `VERSION`.
- `add-db-foundation`: `withTestDatabase(): Promise<TestDatabase>` (`ownerPool`, `appPool`); migrations `src/db/migrations/NNNN_<name>.sql` run by the owner; ledger `ursitoare.schema_migration (version, name, ...)`.
- `add-tenancy-foundation`: `TenantContext { tenantId; reviewProfile }`, `TenantPool = Pick<pg.Pool, "connect">`, `TenantTx = Pick<pg.PoolClient, "query">`, `withTenantTx(pool, ctx, fn)`, `seedTwoTenants(db): Promise<{ a; b }>`, `checkTenancyCatalog(db: Pick<pg.Pool, "query">): Promise<CatalogViolation[]>`; tables are tenant-leading with forced RLS on `current_setting('app.tenant_id', true)`.
- `add-api-pep`: `DefinedRoute { method; url; auth; action; errors; schema; listener: "public" | "internal" }`, `listDefinedRoutes(server)`, `defineRoute`, `request.principal` (with `userId`) and `request.tenant` before a non-public handler, `MainDeps.inspectServers`; its test `src/main.api.test.ts::The real engine` checks that its own routes are included, not an exact list.
- `add-web-shell`: `RESERVED_ROOTS` from `src/api/index.ts` (`["api"]`, `["health"]`, `["auth","oidc"]`, `[".well-known"]`, `["hooks"]`, `["callbacks"]`, `["mcp"]`); features are `web/src/features/NN-<name>.tsx` exporting `feature: FeatureSpec`.
- `add-oidc-login`: the envelope codes `OIDC_NOT_CONFIGURED` (503) and `OIDC_CSRF_INVALID` (403); its folder constructs no `ApiError`.
- `add-architecture-fitness`: `Snapshot { files: SourceFile[]; srcDirs: string[] }`, `SourceFile { path; text }`, `Violation { code; file; line; message }` (`ARCH_*`), `isTestFile(path)`, `readSnapshot(root?)`, `snapshotOf(files)`; `typescript` 6.0.3 is a root dev dependency.

## Decisions

1. **Registry.** `ERROR_CODES` is the 16-entry table of the spec, written as an `as const` object and exported with the declared type. The message is a default (a handler may be more specific; `BAD_REQUEST` keeps the framework's 4xx); the scan checks codes only. `checkApiErrorCodes` parses non-test `src/**/*.ts` with `ts.createSourceFile` and reports `ARCH_API_ERROR_CODE` for each `new ApiError(` whose second argument is a string literal absent from the registry (a non-literal is skipped). `unregisteredRouteErrors` returns `"<METHOD> <url>: <CODE>"` per entry, sorted.
2. **Page query.** `PAGE_QUERY_SCHEMA` has no `additionalProperties`, so an endpoint adds its filters to `properties`. `readPage` re-validates for any handler and throws `ApiError(400, "VALIDATION_FAILED", "Request validation failed", { fields: [{ field: "querystring/limit" | "querystring/cursor", message }] })`.
3. **Cursor.** `deriveCursorKey`: `null`, a throwing `reveal` or a text under 32 characters is a `RangeError`; else `HKDF-SHA256(ikm = utf8(text), salt = empty, info = "ursitoare/cursor", 32 bytes)`, the derivation of `add-audit-chain`'s anchors with another `info`. Wire form: `payload = utf8(JSON.stringify({ v: 1, t: tenantId, s: scope, p: position }))`, `cursor = base64url(payload ‖ HMAC-SHA256(key, payload))` without padding, at most 1,024 characters (more is a `RangeError`). `position` has 1 to 4 entries, each a finite number or a string of at most 256 characters; `scope` matches `^[a-z][a-z0-9_.:-]{0,63}$`; `tenantId` has 1 to 64 characters. `decodeCursor` checks length, alphabet, canonical base64url, at least 33 bytes, the MAC (`timingSafeEqual`), the JSON shape, and `t` and `s` against `expect`; every failure is the same `ApiError(400, "CURSOR_INVALID", "Cursor is invalid")` without details. A cursor carries a position, not authority: every page re-applies RLS and the list filter.
4. **Paging.** The handler fetches `limit + 1` rows after `startAfter(binding, cursor)`, ordered by the key `keyOf` returns. `paginate` returns `rows.slice(0, limit)` and, when `rows.length > limit`, the cursor of the last returned item; `limit` outside 1..200 is a `RangeError`. An item filter (`add-api-pep`) can shorten a page, so clients follow `next_cursor`, not the item count.
5. **Idempotency.** `withIdempotency` reads `clock.now()` once (`now`; `cutoff = now - 86,400,000 ms`) and validates before any query: the key (400 `VALIDATION_FAILED`, `fields: [{ field: "headers/idempotency-key", message: "must be 1 to 128 visible ASCII characters" }]`), the digest (`^[0-9a-f]{64}$`), `principal.userId` (1 to 200 characters), else `RangeError`. **Claim**, in its own transaction committed before `fn` runs so that a concurrent request can see it (up to three rounds): an `INSERT ... ON CONFLICT (tenant_id, principal_id, key) DO UPDATE ... WHERE created_at <= $cutoff RETURNING 1` (task 3.3) that sets `in_progress`, the digest and `created_at = now` and clears the response. A row means claimed (fresh, or replacing an expired key). No row: select the key's digest, state and response; absent (released meanwhile) starts another round, three misses are 409; another digest is 422 `IDEMPOTENCY_KEY_REUSED` (also while in progress); `done` replays; `in_progress` is 409 `IDEMPOTENCY_IN_PROGRESS`. **Complete**, in a second transaction that runs `fn(tx)`: the result needs an integer `status` 100..599 (`RangeError`) and a `body` whose `JSON.stringify` is a string (`TypeError`); then an `UPDATE` to `done` with the status and body, matching the claim (`state = 'in_progress'`, `created_at = $now`, same digest), must change one row (else `Error("idempotency claim lost")`). The effect and the stored response commit together; the first call returns `{ status, body: JSON.parse(text), replayed: false }`, so an answer and its replay are the same value. **Failure:** if the second transaction errors, a third `DELETE`s the claim (its own failure is swallowed) and the original error is rethrown. A process that dies in between leaves the key `in_progress` until it expires (409 on retry; no effect committed).
6. **`respondIdempotent`.** Uses `request.principal` and `request.tenant` (missing is a plain `Error`, 500). No key: `fn` in `withTenantTx`, then `reply.code(status).send(body)`. With a key: `withIdempotency` with `requestDigestOf({ method, route: request.routeOptions.url, params, query, body })`, header `Idempotent-Replayed: true` on a replay. Only status and JSON body are stored. `requestDigestOf` is SHA-256 hex of the JSON of `{ method (upper case), route, params, query, body }`, `undefined` as `null`, keys sorted at every depth.
7. **OpenAPI.** `buildOpenApiDocument` is pure and ignores odd schemas; it keeps public-listener routes except `GET /*` and adds `x-ursitoare-*` annotations (rules in task 5.1). `renderOpenApi` is canonical text: keys sorted, two-space indent, one final newline. `registerOpenApiRoute` uses `defineRoute` with `auth: { kind: "public", reason: "static" }`, `schema: {}`, `errors: []` and builds the document per request from `listDefinedRoutes(server)`; it is public because the document describes the public repository's API.
8. **Regeneration.** `servedOpenApiText()` in `test/support/openapi-docs.ts` runs the real `main` on port 0 without a database or engine key (task 5.2), fetches the document, closes the server and returns its `renderOpenApi` text. As a script it writes `OPENAPI_FILE`: the regeneration runs as `node test/support/openapi-docs.ts`, so no package script is needed.
9. **Roots.** `isReservedPath` lower-cases, drops a query or fragment, and is true for `/api`, `/auth`, `/.well-known`, `/hooks`, `/callbacks`, `/mcp`, `/health` and anything under them. `checkFeaturePaths` reads the `s.files` named `web/src/features/NN-<name>.tsx` (task 4.1): a reserved path is `ARCH_WEB_PATH_RESERVED`, a missing `feature` or non-literal `path` is `ARCH_WEB_PATH_UNKNOWN`.

## Interfaces

Same text as proposal.md § Interfaces given.

```ts
// src/api/error-codes.ts
const ERROR_CODES: Readonly<Record<string, { readonly status: number; readonly message: string }>>
function isRegisteredCode(code: string): boolean
function unregisteredRouteErrors(routes: readonly { method: string; url: string; errors: readonly string[] }[]): string[]
// src/api/cursor.ts
type CursorPosition = readonly (string | number)[]
interface KeyMaterial { reveal(): string }
interface CursorKey { readonly bytes: Uint8Array }
interface CursorScope { tenantId: string; scope: string }
function deriveCursorKey(engineKey: KeyMaterial | null): CursorKey
function encodeCursor(key: CursorKey, claims: CursorScope & { position: CursorPosition }): string
function decodeCursor(key: CursorKey, cursor: string, expect: CursorScope): CursorPosition
// src/api/pagination.ts
const PAGE_QUERY_SCHEMA: Readonly<Record<string, unknown>>
interface Page<T> { items: T[]; next_cursor: string | null }
interface CursorBinding extends CursorScope { key: CursorKey }
function readPage(query: unknown): { limit: number; cursor: string | null }
function startAfter(binding: CursorBinding, cursor: string | null): CursorPosition | null
function paginate<T>(rows: readonly T[], opts: { limit: number; keyOf: (row: T) => CursorPosition; cursor: CursorBinding }): Page<T>
// src/api/idempotency.ts
const IDEMPOTENCY_HEADER_SCHEMA: Readonly<Record<string, unknown>>
interface IdempotentResponse { status: number; body: unknown }
function idempotencyKeyOf(req: FastifyRequest): string | null
function requestDigestOf(parts: { method: string; route: string; params?: unknown; query?: unknown; body?: unknown }): string
function withIdempotency(ctx: { pool: TenantPool; tenant: TenantContext; clock: Clock }, principal: { userId: string }, key: string, requestDigest: string, fn: (tx: TenantTx) => Promise<IdempotentResponse>): Promise<IdempotentResponse & { replayed: boolean }>
function respondIdempotent(deps: { pool: TenantPool; clock: Clock }, req: FastifyRequest, reply: FastifyReply, fn: (tx: TenantTx) => Promise<IdempotentResponse>): Promise<FastifyReply>
// src/api/openapi.ts
function buildOpenApiDocument(routes: readonly DefinedRoute[], info: { version: string }): Record<string, unknown>
function renderOpenApi(doc: unknown): string
function registerOpenApiRoute(server: FastifyInstance, opts: { version: string }): void
// test/arch/error-codes.ts
function checkApiErrorCodes(s: Snapshot, registered?: readonly string[]): Violation[]
// test/arch/web-routes.ts
function isReservedPath(path: string): boolean
function routesOutsideReservedRoots(routes: readonly { method: string; url: string }[]): string[]
function checkFeaturePaths(s: Snapshot): Violation[]
// test/support/openapi-docs.ts
const OPENAPI_FILE: string
function servedOpenApiText(): Promise<string>
```

Also given: `GET /api/v1/openapi.json`; table `idempotency_key` (`0140_idempotency.sql`); headers `Idempotency-Key`, `Idempotent-Replayed`; file `docs/api/openapi.json`. Stubs: the schema constants are `{}`, `OPENAPI_FILE` is `""`, functions throw `new Error("not implemented")`. Error codes `CURSOR_INVALID` 400, `IDEMPOTENCY_IN_PROGRESS` 409, `IDEMPOTENCY_KEY_REUSED` 422; rule codes `ARCH_API_ERROR_CODE`, `ARCH_WEB_PATH_RESERVED`, `ARCH_WEB_PATH_UNKNOWN`.

## Data model

`src/db/migrations/0140_idempotency.sql`, verbatim (the runner supplies the transaction):

```sql
CREATE TABLE ursitoare.idempotency_key (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id) ON DELETE CASCADE,
  principal_id text NOT NULL CHECK (char_length(principal_id) BETWEEN 1 AND 200),
  key text NOT NULL CHECK (key ~ '^[!-~]{1,128}$'),
  request_digest text NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  state text NOT NULL CHECK (state IN ('in_progress', 'done')),
  response_status integer CHECK (response_status BETWEEN 100 AND 599),
  response_body jsonb,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, principal_id, key),
  CONSTRAINT idempotency_key_state_shape CHECK (
    (state = 'in_progress' AND response_status IS NULL AND response_body IS NULL)
    OR (state = 'done' AND response_status IS NOT NULL AND response_body IS NOT NULL)));
CREATE INDEX idempotency_key_created_idx ON ursitoare.idempotency_key (tenant_id, created_at);
ALTER TABLE ursitoare.idempotency_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.idempotency_key FORCE ROW LEVEL SECURITY;
CREATE POLICY idempotency_key_isolation ON ursitoare.idempotency_key
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ursitoare.idempotency_key TO ursitoare_app;
```

Not partitioned: rows live about 24 hours; a later retention unit deletes old ones. `created_at` has no default (the injected clock supplies it).

## Failure cases

| Situation | Behaviour |
|---|---|
| `limit`, `cursor` or `Idempotency-Key` invalid | 400 `VALIDATION_FAILED` with the field; `fn` not run |
| Cursor tampered, foreign (key, tenant, scope), malformed, too long | 400 `CURSOR_INVALID`, always the same answer |
| No engine key for `deriveCursorKey` | `RangeError`: the unit that wires a list route refuses to start |
| Same key, other digest (also while in progress) | 422 `IDEMPOTENCY_KEY_REUSED` |
| Same key and digest, first call unfinished | 409 `IDEMPOTENCY_IN_PROGRESS`; the first call is unaffected |
| `fn` throws or its result cannot be stored | writes roll back, key released, error rethrown |
| Release fails, or the process dies mid-call | key stays `in_progress` until it expires; no effect committed |
| Database down | the driver error propagates; `fn` does not run |
| Concurrent first calls | one claims; the other is 409, or a replay after the first finished |
| Key 24 hours old or more | ignored, replaced by the next call |
| Unregistered code in `src` or a route's `errors` | the architecture or engine test fails |

## Security

1. **Authentication.** `GET /api/v1/openapi.json` is `public(static)`: it lists the public repository's routes, auth kinds, actions, schemas and error codes, nothing of any tenant, config or secret. `respondIdempotent` runs in a route the PEP already authenticated and authorised.
2. **Tenant isolation.** `idempotency_key` is tenant-leading with forced RLS, every statement runs in `withTenantTx` and names `tenant_id`, and keys are scoped to the principal. A cursor carries its tenant. Two-tenant tests: the table, `withIdempotency` (tenant B runs its own `fn`) and `startAfter` (B's cursor under A's binding).
3. **Input validation.** `limit` and `cursor` are bounded and a cursor is length- and alphabet-checked before decoding; the key is visible ASCII and only a bound parameter; digest and principal id are checked. Key and cursor never reach a policy or a prompt: no taint label.
4. **Secrets.** The engine key reaches only `deriveCursorKey` and is never logged, stored or put in an error; no message or `details` holds key, cursor or body text.
5. **Abuse cases** (each a scenario): forged, oversized or cross-tenant cursor; `limit=0` and 100000; a key reused with a changed request; another user or tenant replaying a key; header injection through the key; concurrent flooding of one key; a stale key resurrecting an old response; a web route shadowing `/api`; an unregistered error code.

## Test plan

Node test runner, `*.test.ts` beside each file, loopback only, no sleeps (the in-progress case blocks `fn` on a promise the test resolves). Each file starts with `assert.equal(typeof <function it tests>, "function")`. Pure tests use `snapshotOf` and keys from `{ reveal: () => "k".repeat(64) }`. Server tests use `buildServer` with `sequentialIds()`, `noopTracer` and a silent logger, raw routes, and an `onRequest` hook that sets `request.principal` and `request.tenant` through a cast. Database tests use `withTestDatabase()`, `seedTwoTenants(db)`, `db.appPool`, a mutable `Clock` from `2026-10-25T09:00:00Z` and a probe table `ursitoare.idem_probe (tenant_id, id)` created by the test as owner with forced RLS. The schema test first asserts with `assert.ok` that `to_regclass('ursitoare.idempotency_key')` is not null; expected SQL failures use `await assert.rejects(p, { code })`; a failing release is a pool wrapper whose client rejects `DELETE`. The drift test first asserts that `docs/api/openapi.json` exists.

## Decisions made while writing

- **Sixteen codes, not fourteen:** `AUTHZ_UNAVAILABLE` (api-pep) and `OIDC_CSRF_INVALID` (oidc-login) name this unit as registrar. **Exactly 16, no more:** the spec lists which unit constructs each, read from every M1 folder and the merged M0 code (`delivered-shapes.md`); none uses a code outside the 16, so the registry test and the real-tree scan pass together, and this unit adds no seventeenth code to satisfy the scan.
- **`fn` receives the transaction;** the claim commits first so a concurrent request can see 409.
- **`paginate` takes a `cursor` binding** (key, tenant, scope) beside the card's `{ limit, keyOf }`, because the signature needs all three. **The web-path rule reads only the string-literal `path` of `web/src/features/NN-<name>.tsx`;** web-shell's `FEATURE_PATH_RESERVED` already refuses reserved paths from any other caller at registration.
- **A bad key is `VALIDATION_FAILED`**, no new code. **`principal` is `{ userId }`**, so `src/api` need not import `src/identity`. **`deriveCursorKey(null)` throws:** the first unit with a list route decides what a missing engine key means at start.
- **Reserved roots:** the card's coarser `/auth` applies to web pages; the static host keeps web-shell's `["auth","oidc"]`, and a test pins that each of its entries is reserved here.
- **New dependencies** absent from the card's list: `add-architecture-fitness` (for `Snapshot`, `Violation`, `isTestFile`, `readSnapshot`) and `add-oidc-login` (two of the 16 codes).
- **No frozen test changes:** `add-api-pep`'s "The real engine" checks that its own routes are included, not an exact list, so `GET /api/v1/openapi.json` leaves it passing; `checkRouteCoverage` still covers the new route.
- **Shared files:** a later unit that adds a code or a route edits `src/api/error-codes.ts` and `docs/api/openapi.json` and names them in its task.
