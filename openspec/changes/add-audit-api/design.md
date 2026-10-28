## Context

Dependencies as their folders define them (merged shapes in `delivered-shapes.md`).

- `add-pdp-cedar` (merged): `policy_decision`, `recordDecision`, `PdpError`. `add-policy-catalogue`: `read_audit` is an `ActionName` on `Tenant`; no policy permits it until `add-roles-and-memberships`, so before that these routes answer 403. `add-api-pep` records every decision of a non-public route, so a call to these routes adds its own `read_audit` row before the handler runs.
- `add-api-pep`: `defineRoute` (no `resource` means the principal's tenant), `request.tenant`, 503 `AUTHZ_UNAVAILABLE` for a null pool or engine, `cache-control: no-store`, `createTestSession(db, ctx, subject, clock)` returning `{ cookie, userId, csrfToken }`.
- `add-api-conventions`: `readPage` (limit 1 to 200), `deriveCursorKey` (`RangeError` for `null` or a key under 32 characters), `startAfter` (a bad cursor is 400 `CURSOR_INVALID`), `paginate`; a unit that adds a route regenerates `docs/api/openapi.json` (`node test/support/openapi-docs.ts`).
- `add-admin-api` (runs first): registers `ENGINE_KEY_REQUIRED`, calls `registerAdminRoutes(...)`; its `docs/api/openapi.json` is this unit's base.

## Decisions

1. **Files.** `src/audit/query.ts` (`listAuditEvents`, `countAnchors`, `isUtcTime`) and `src/pdp/decisions-query.ts` (`listPolicyDecisions`; `pdp` owns the table), each re-exported by its `index.ts`; `src/api/audit-query.ts` (parsing) and `src/api/audit-routes.ts` (routes, queue), re-exported by `src/api/index.ts`; the migration of § Data model. `audit` and `pdp` may not import each other or `api` (`test/arch/modules.ts`): readers return rows, cursors stay in `api`, `pdp` keeps a private copy of the time rule.
2. **Routes.** All three are `defineRoute(server, { method: "GET", url, auth: { kind: "session" }, action: "read_audit", schema, errors, handler })`, no `resource`, no `listFilter`. The lists declare `errors: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"]`, verify `["VALIDATION_FAILED"]`. `schema.querystring` is `{ type: "object", additionalProperties: false, properties }` (`PAGE_QUERY_SCHEMA`'s plus those of Decision 3 with their patterns, except `from` and `to`, plain strings, so the parser's message reaches the client): an unknown name is 400 `VALIDATION_FAILED`, field `querystring/<name>`. A response schema drops undeclared properties, so `payload` and `permit` are `{ type: "object", additionalProperties: true }`.
3. **Query parameters.** `parseAuditQuery`, `parseDecisionQuery` and `parseVerifyQuery` re-validate for any caller and throw `ApiError(400, "VALIDATION_FAILED", "Request validation failed", { fields: [{ field: "querystring/<name>", message }] })` for the first failure, checking in this order: unknown names (`is not allowed`), `limit`, `cursor` (through `readPage`), `order`, the filters as listed, then `to` against `from` (`must be after from`). A value that breaks its rule, or an array or object, has the message `is invalid` (for `from` and `to`: `must be a UTC time such as 2026-10-25T09:00:00Z`). Rules:
   - `order`: `asc` or `desc`, default `desc`. `event_type`, `target_kind`: `^[a-z][a-z0-9_.]{0,63}$`. `actor_id`, `target_id`: 1 to 200 characters. `after_seq`: `^(0|[1-9][0-9]{0,18})$`, at most 9223372036854775807.
   - `decision`: `allow` or `deny`. `action`: 1 to 128 characters. `principal`: 1 to 512. `run_id`, `decision_id`: 1 to 128.
   - `from` (inclusive), `to` (exclusive): `isUtcTime`; `to` later than `from`, compared as text after padding the fraction to six digits. Filters are exact matches combined with AND.
   - `from_seq` (verify only): `^[1-9][0-9]{0,18}$`, at most 9223372036854775807, default `1`.

   `isUtcTime(text)` is true when `text` matches `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3}|\.[0-9]{6})?Z$` and `new Date(text.slice(0, 19) + "Z").toISOString().slice(0, 19)` equals `text.slice(0, 19)`, so `2026-02-30T00:00:00Z`, `2026-10-25T24:00:00Z` and `.1Z` are refused. Items carry six fraction digits, so an item's `at` can be passed back as `from`; the readers give the original text to SQL as `$n::timestamptz`, which keeps microseconds exact.
4. **Lists and cursors.** Events are ordered by `seq`, decisions by `(decided_at, decision_id)`, newest first unless `order=asc`. The binding is `{ key, tenantId: request.tenant.tenantId, scope }` with `scope` `audit.<order>` or `decisions.<order>`, so a cursor of the other list or order, of another tenant or edited is 400 `CURSOR_INVALID`; `key` is `deriveCursorKey(deps.engineKey)`, computed once in `registerAuditRoutes`. Positions: `[seq]` (decimal string) and `[decidedAt, decisionId]` (microsecond text); a signed position of another shape is the same 400. The handler fetches `limit + 1` rows after the position and returns `paginate(rows, { limit, keyOf, cursor })`. **With a `null` engine key** it calls neither `startAfter` nor `paginate`: a request with `cursor` throws `ApiError(503, "ENGINE_KEY_REQUIRED", "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)")` before any read; otherwise it reads `limit + 1` rows, throws the same error when there is a `limit + 1`-th row, else answers `{ items, next_cursor: null }`. `verify` works without a key.
5. **Readers** (each in one `withTenantTx`, `tenant_id = $1`, only the conditions given, every value a bound parameter, direction and operator from a fixed table). `listAuditEvents` selects the columns of `AuditEventRecord` from `ursitoare.audit_event` (`seq::text`; `at` as `to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`; hashes `encode(hash, 'hex')`; `mk` is `null` unless `origin` is `mintkey`) with `event_type = x`, `actor ->> 'id' = x`, `target ->> 'kind' = x`, `target ->> 'id' = x`, `seq > afterSeq`, `at >= $n::timestamptz`, `at < $n::timestamptz`, the position (`seq < p` for `desc`, `seq > p` for `asc`) and `ORDER BY seq <dir>, at <dir> LIMIT n`. `listPolicyDecisions` does the same over `ursitoare.policy_decision` (`decided_at` as the same microsecond text) with `= x` on `decision`, `action`, `principal` (the stored text, for example `User::"tenant_a/u_1"`), `run_id`, `decision_id`, the time range, the position `(decided_at, decision_id) < ($p::timestamptz, $id)` (`>` for `asc`) and `ORDER BY decided_at <dir>, decision_id <dir>`.
6. **Reader options.** Both readers check before any query `limit` (an integer from 1 to 200, the bound of `readPage`), `order`, the filters as in Decision 3 and the positions (decimal text; `decidedAt` six-digit UTC text passing the time rule, with a 1 to 128 character id), and throw `AuditError("AUDIT_OPTIONS_INVALID", "audit options are invalid", { reason })` or `PdpError("PDP_OPTIONS_INVALID", "pdp options are invalid", { reason })`, `reason` being `bad_limit`, `bad_order`, `bad_filter` or `bad_position`: no driver error escapes.
7. **Anchors and verification.** `countAnchors` runs `SELECT count(*)::int FROM ursitoare.audit_anchor WHERE tenant_id = $1 AND seq >= $2::bigint` in `withTenantTx`; `fromSeq` below 1n or not a bigint is `AuditError("AUDIT_OPTIONS_INVALID", …, { reason: "bad_from_seq" })`. `GET /api/v1/audit/verify` runs, through the queue of Decision 8, a walk that first reads `anchorsVerified` (0 without an engine key, else `countAnchors(pool, request.tenant, fromSeq)`: before the check, anchors being insert-only, so it never counts one the check did not read), then calls `(deps.verify ?? verifyChain)(pool, request.tenant, opts)` with `opts = { fromSeq }` plus `engineKey` when not null. It answers 200 `AuditVerification`: `firstBadSeq` and `fromSeq` decimal strings, `reason` and `firstBadSeq` `null` when absent, `anchorsChecked` is `deps.engineKey !== null && anchorsVerified > 0`, `checkedAt` is `formatAt(deps.clock.now())` at the end of the run. `anchorsVerified` counts rows in range and is read with `ok: true`. A broken chain is a 200 with `ok: false`; an error from `countAnchors` or `verify` is the root handler's 500 `INTERNAL`.
8. **Walk queue.** `createWalkQueue(maxConcurrent)` throws `RangeError` unless `maxConcurrent` is an integer of at least 1. `run` is not `async`; an entry is identified by (tenant, `fromSeq`) from arrival until its promise settles. A call equal to a running or waiting entry returns that entry's promise and never calls its own `start`. A new entry starts, by calling `start()` (a `start` that throws is a rejected walk), when no walk of its tenant runs and fewer than `maxConcurrent` walks run, else it waits. When a walk settles, resolved or rejected, its entry is removed and the waiting entries are scanned in arrival order, each eligible one starting, all before the promise the callers hold settles: a tenant's walks run one at a time, a blocked entry does not hold back another tenant's, and a failed walk is never shared with a later request. `registerAuditRoutes` uses `deps.walks ?? createWalkQueue(2)`. Waiting requests hold no connection; two walks hold at most two of the pool's ten (`src/db/pool.ts:19`).
9. **Wiring.** `src/main.ts` calls `registerAuditRoutes(server, { pool: pep.pool, clock: pep.clock, engineKey: config.engineKey })` right after `registerAdminRoutes(...)` (after `installPep`, so the PEP hooks cover the routes), also when `pep.pool` is null, so the OpenAPI document lists the routes. `docs/api/openapi.json` is regenerated on top of `add-admin-api`'s, so it holds both units' paths.

## Interfaces

Same text as proposal.md § Interfaces given.

```ts
// src/audit/query.ts (exported by src/audit/index.ts)
interface AuditEventFilter { eventType?: string; actorId?: string; targetKind?: string; targetId?: string; afterSeq?: string; from?: string; to?: string }
interface AuditEventRecord { seq: string; at: string; eventType: string; actor: { kind: "user" | "service" | "system"; id: string }; target: { kind: string; id: string } | null; payload: Record<string, unknown>; origin: "ursitoare" | "mintkey"; mk: { traceId: string | null; requestId: string | null; jti: string | null } | null; prevHash: string; hash: string }
function isUtcTime(text: string): boolean
function listAuditEvents(pool: TenantPool, ctx: TenantContext, q: { filter?: AuditEventFilter; continueAfter?: string; order: "asc" | "desc"; limit: number }): Promise<AuditEventRecord[]>
function countAnchors(pool: TenantPool, ctx: TenantContext, fromSeq: bigint): Promise<number>
// src/pdp/decisions-query.ts (exported by src/pdp/index.ts)
interface PolicyDecisionFilter { decision?: "allow" | "deny"; action?: string; principal?: string; runId?: string; decisionId?: string; from?: string; to?: string }
interface PolicyDecisionRecord { decisionId: string; decidedAt: string; runId: string | null; nodeId: string | null; action: string; principal: string; resource: string; decision: "allow" | "deny"; reasons: string[]; errors: string[]; policySetVersion: string; requestDigest: string; permit: Record<string, unknown> | null }
function listPolicyDecisions(pool: TenantPool, ctx: TenantContext, q: { filter?: PolicyDecisionFilter; continueAfter?: { decidedAt: string; decisionId: string }; order: "asc" | "desc"; limit: number }): Promise<PolicyDecisionRecord[]>
// src/api/audit-query.ts and src/api/audit-routes.ts (exported by src/api/index.ts)
interface ListQuery<F> { page: { limit: number; cursor: string | null }; order: "asc" | "desc"; filter: F }
function parseAuditQuery(query: unknown): ListQuery<AuditEventFilter>
function parseDecisionQuery(query: unknown): ListQuery<PolicyDecisionFilter>
function parseVerifyQuery(query: unknown): { fromSeq: bigint }
interface AuditVerification { ok: boolean; checked: number; firstBadSeq: string | null; reason: "hash" | "gap" | "anchor" | null; fromSeq: string; anchorsChecked: boolean; anchorsVerified: number; checkedAt: string }
interface WalkQueue { run<T>(tenantId: string, fromSeq: bigint, start: () => Promise<T>): Promise<T> }
function createWalkQueue(maxConcurrent: number): WalkQueue
interface AuditApiDeps { pool: TenantPool | null; clock: Clock; engineKey: KeyMaterial | null; verify?: typeof verifyChain; walks?: WalkQueue }
function registerAuditRoutes(server: FastifyInstance, deps: AuditApiDeps): void
```

## Data model

`src/db/migrations/0190_audit_read_indexes.sql`, verbatim (the runner supplies the transaction):

```sql
CREATE INDEX audit_event_type_idx ON ursitoare.audit_event (tenant_id, event_type, seq DESC);
CREATE INDEX policy_decision_time_idx ON ursitoare.policy_decision (tenant_id, decided_at DESC, decision_id DESC);
```

Both tables are partitioned, so every partition, the DEFAULT one and later ones, carries the index.

## Failure cases

| Situation | Behaviour |
|---|---|
| No session; no `read_audit`; no database or engine | 401 `UNAUTHENTICATED`; 403 `FORBIDDEN` with `details.decisionId` and an `authz.denied` event; 503 `AUTHZ_UNAVAILABLE` (PEP) |
| Unknown name, bad value, `to` not after `from` | 400 `VALIDATION_FAILED`, one field; nothing read |
| Edited, foreign, other-list or other-order cursor; position of another shape | 400 `CURSOR_INVALID` |
| No engine key and a `cursor`, or a second page needed | 503 `ENGINE_KEY_REQUIRED`; one page is served |
| `registerAuditRoutes` with a key under 32 characters | `RangeError`, no key text |
| Empty log, or no match | 200 `{ items: [], next_cursor: null }` |
| Chain empty or `from_seq` above the tip; tampered; key set but no anchor row | 200 `ok: true`, `checked: 0`; 200 `ok: false` with `firstBadSeq`, `reason`; 200 `anchorsChecked: false`, `anchorsVerified: 0` |
| `verify`, `countAnchors` or a list query rejects | 500 `INTERNAL`, no driver text; every sharer of that walk gets it |

## Security

1. **Authentication and action.** All three are `session` routes under `read_audit`; the PEP authenticates before the query is parsed.
2. **Tenant isolation.** No new table. Every query runs in `withTenantTx` (RLS) and names `tenant_id = $1` from `request.tenant`; no tenant is read from a query or header. Cursors are bound to the tenant and walks are keyed by it. Two-tenant scenarios: each list returns only the caller's rows, B's cursor under A is `CURSOR_INVALID`, `verify` walks only the caller's chain.
3. **Input validation.** Every query value has a pattern or length bound and is a bound SQL parameter; positions are checked before use. Payloads were screened for secret-like keys when written (`add-audit-chain`) and are returned with `cache-control: no-store`.
4. **Secrets.** The engine key reaches only `deriveCursorKey` and `verifyChain` (and `anchorHead` in tests), and is in no response, log line or error.
5. **Abuse cases** (each a scenario): no session; no `read_audit`; another tenant by query, header or cursor; an edited cursor; `event_type=x' OR '1'='1`; `2026-02-30`; `limit=0`; an unknown parameter; a loop of `verify` requests with distinct `from_seq` (the queue holds at most two pool connections).

## Test plan

Node test runner, `*.test.ts` beside each file, loopback only, no sleeps. Each file starts with `assert.equal(typeof <function it tests>, "function")`; a call that reaches a stub is wrapped in `assert.doesNotThrow` or `await assert.doesNotReject` and the result asserted afterwards (`const r = await p.then((v) => v, (e: unknown) => e)`; a thrown value is caught and checked with `instanceof`), as `add-policy-catalogue` task 1.2. Database tests use `withTestDatabase()` and `seedTwoTenants(db)`; fixtures are in `scenario-data.md`: events from `appendAuditCommitted(db.appPool, ctx, event, { clock: fixedClock(...) })`, decisions from `recordDecision(tx, ctx, decision, req)` in `withTenantTx` (`policySetVersion` 64 hex characters, `decidedAt` an ISO string, a `PolicyRequest` of principal `User` `tenant_a/u_1`, resource `Tenant` `tenant_a`, `context: {}`, `entities: []`). Tamper tests follow `src/audit/verify.test.ts` (owner pool, `app.tenant_id` set, `ALTER TABLE ursitoare.audit_event DISABLE TRIGGER audit_event_append_only`). The key is `{ reveal: () => "k".repeat(64) }`.

Server tests build the fixture inline: `buildServer` with `sequentialIds()`, a silent `createLogger`, `noopTracer`; a mutable `Clock` from `2026-10-25T09:00:00Z`; `createPolicyEngine({ srcDir: <empty temp dir>, tenantPolicies, clock, ids, logger })`; `installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: "http://127.0.0.1" })`; `registerAuditRoutes(server, { pool: db.appPool, clock, engineKey: <the key> })`; sessions from `createTestSession`, sent as `headers: { cookie }`. A denying server uses `sequentialIds(1000)` for its engine (`recordDecision` ignores a repeated key). A refusal appends an `authz.denied` event, so 403 scenarios run after every scenario that counts or pages, or on a second `withTestDatabase()`. `tenantPolicies` is `[{ id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' }]`, for 403 cases `[{ id: "t-flow", layer: "tenant", text: '@id("t-flow") permit (principal, action == Action::"read_flow", resource);' }]`. `src/main.audit.test.ts` runs `main` as `src/main.api.test.ts` does (port-0 `AppConfig`, `database` `{ app: null, owner: null }`, `inspectServers`).

## Decisions made while writing

- **Newest first; `order=asc` and `after_seq`:** architecture §11 calls these routes a SIEM export. **Reads are not audited:** the PEP's decision row is the record; a read event would append to the chain it shows.
- **Anchors are counted (roadmap scope line "verify"):** `anchorsChecked` would be true whenever a key is set, although `anchorHead` has no caller outside tests; the answer gains `anchorsVerified`. The roadmap lists the open item that no unit writes anchors.
- **A list without an engine key:** 503 `ENGINE_KEY_REQUIRED` for a cursor or a second page, one page served, as `add-admin-api` does; this unit adds no code. **Runs after `add-admin-api` (roadmap Depends on gains U18):** both edit `src/main.ts`, `src/api/index.ts` and `docs/api/openapi.json`.
- **Decision reader in `pdp` (roadmap Module gains `pdp`):** the table is `pdp`'s and `audit` may not import `pdp`; the private time rule is held equal by the same bad inputs in its test. A shared helper in `core` is the alternative.
- **Walk queue, optional `walks` dep:** one walk per tenant and two in all, so a `read_audit` holder cannot hold the pool; `walks` lets a test see, without timing, that requests pass through it.
- **Times and limits:** `from` and `to` accept the six-digit form items carry, `checkedAt` has six digits (every M2 timestamp does), limit is 1 to 200 like `readPage`. **Two capabilities,** `audit-api` and `audit-verification`, keep each spec file under the size limit.
