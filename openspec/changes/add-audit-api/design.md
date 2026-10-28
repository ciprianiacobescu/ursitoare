## Context

Dependencies as their folders define them (only what is used).

- `add-audit-chain` (merged): `ursitoare.audit_event` (monthly partitions on `at`, forced RLS, app role `SELECT` and `INSERT`), `verifyChain(pool, ctx, opts?: { fromSeq?, engineKey?, batchSize? }): Promise<ChainReport>` (anchors are read only with a key), `appendAuditCommitted`, `KeyMaterial { reveal(): string }`.
- `add-pdp-cedar` (merged): `ursitoare.policy_decision` (monthly partitions on `decided_at`, forced RLS, app role `SELECT` and `INSERT`), `recordDecision`. `add-api-pep` records every decision of a non-public route, so a call to these routes adds its own `read_audit` row before the handler runs.
- `add-policy-catalogue`: `read_audit` is an `ActionName` on resource type `Tenant`, empty context. No policy permits it until `add-roles-and-memberships`, so before that these routes answer 403 for everyone.
- `add-api-pep`: `defineRoute(server, def)` with `auth: { kind: "session" }`, `action`, `schema`, `errors`, `handler`; with no `resource` the resource is the principal's tenant; `request.principal` and `request.tenant` (`TenantContext`) are set before a handler; a route whose `PepDeps.pool` or `engine` is null answers 503 `AUTHZ_UNAVAILABLE`; replies carry `cache-control: no-store`; `createTestSession(db, ctx, subject, clock)` returns `{ cookie, userId, csrfToken }`, `cookie` being the `Cookie` header value.
- `add-api-conventions`: `PAGE_QUERY_SCHEMA` (`properties.limit`, `properties.cursor`, no `additionalProperties`), `readPage`, `deriveCursorKey(engineKey)` (`RangeError` for `null`, a throwing `reveal` or text under 32 characters), `startAfter(binding, cursor)` (a bad cursor is 400 `CURSOR_INVALID`), `paginate(rows, { limit, keyOf, cursor })` over `limit + 1` rows, `CursorBinding { key, tenantId, scope }` (`scope` matches `^[a-z][a-z0-9_.:-]{0,63}$`); the registry holds exactly 16 codes. A unit that adds a route regenerates `docs/api/openapi.json` (`node test/support/openapi-docs.ts`) and names it in its task.
- M0 names: `delivered-shapes.md`.

## Decisions

1. **Files.** `src/audit/query.ts` (`listAuditEvents`, `isUtcTime`) and `src/audit/decisions.ts` (`listPolicyDecisions`), re-exported by `src/audit/index.ts`; `src/api/audit-query.ts` (query parsing) and `src/api/audit-routes.ts` (the routes), re-exported by `src/api/index.ts`; `src/db/migrations/0190_audit_read_indexes.sql` (two indexes, § Data model). `audit` may not import `api`, so it returns rows and cursors stay in `api`; `test/arch/modules.ts` needs no change.
2. **Routes.** All three are `defineRoute(server, { method: "GET", url, auth: { kind: "session" }, action: "read_audit", schema, errors, handler })` with no `resource` (the principal's tenant) and no `listFilter` (the action covers the whole log). `GET /api/v1/audit` and `GET /api/v1/policy-decisions` declare `errors: ["CURSOR_INVALID", "VALIDATION_FAILED"]`; `GET /api/v1/audit/verify` declares `["VALIDATION_FAILED"]`. `schema.querystring` is `{ type: "object", additionalProperties: false, properties }` (the properties of `PAGE_QUERY_SCHEMA` plus those of Decision 3), so an unknown name is 400 `VALIDATION_FAILED` with field `querystring/<name>`; `schema.response[200]` describes the body. A response schema drops undeclared properties, so `payload` and `permit` are declared `{ type: "object", additionalProperties: true }` and a test compares a nested payload. No route emits an audit event: the PEP's `policy_decision` row records every read.
3. **Query parameters.** `parseAuditQuery`, `parseDecisionQuery` and `parseVerifyQuery` re-validate for any caller and throw `ApiError(400, "VALIDATION_FAILED", "Request validation failed", { fields: [{ field: "querystring/<name>", message }] })` for the first failure, checking in this order: unknown names (`is not allowed`), `limit`, `cursor` (through `readPage`), `order`, the filters as listed, then `to` against `from` (`must be after from`, field `querystring/to`). A value that breaks its rule, or an array or object, has the message `is invalid`. The rules:
   - `order`: `asc` or `desc`, default `desc`. `event_type`, `target_kind`: `^[a-z][a-z0-9_.]{0,63}$`. `actor_id`, `target_id`: 1 to 200 characters. `after_seq`: `^(0|[1-9][0-9]{0,18})$` and at most 9223372036854775807.
   - `decision`: `allow` or `deny`. `action`: 1 to 128 characters. `principal`: 1 to 512. `run_id`, `decision_id`: 1 to 128.
   - `from`, `to`: `isUtcTime`; `to` must be later than `from` when both are given.
   - `from_seq` (verify only): `^[1-9][0-9]{0,18}$` and at most 9223372036854775807, default `1`.

   `isUtcTime(text)` is true when `text` matches `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$` and `new Date(text).toISOString()` equals `text` (`.000` added when it has no fraction), so `2026-02-30T00:00:00Z` and `2026-10-25T24:00:00Z` are refused. `from` is inclusive, `to` exclusive; filters are exact matches combined with AND. Fastify's schema check uses the same patterns.
4. **Lists and cursors.** Events are ordered by `seq`, decisions by `(decided_at, decision_id)`, newest first unless `order=asc` (for an exporter that follows the log forward). The binding is `{ key, tenantId: request.tenant.tenantId, scope }` with `scope` `audit.<order>` or `decisions.<order>`, so a cursor of the other list or order, of another tenant or edited is 400 `CURSOR_INVALID`; `key` is `null` when `deps.engineKey` is `null`, else `deriveCursorKey(deps.engineKey)`, computed once in `registerAuditRoutes`. Positions: `[seq]` (decimal string) and `[decidedAt, decisionId]` (microsecond text); a signed position of another shape is the same 400. The handler fetches `limit + 1` rows after the position and returns `paginate(rows, { limit, keyOf, cursor })`. With a `null` key a list request answers 500 `INTERNAL` after parsing (the handler logs `{ code: "AUDIT_API_NO_ENGINE_KEY" }` and throws a plain `Error`), while `verify` still works.
5. **Event query** (`listAuditEvents`, one `withTenantTx`). From `ursitoare.audit_event` where `tenant_id = $1` it selects the columns of `AuditEventRecord` (`seq::text`; `at` as `to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`; hashes as `encode(hash, 'hex')`) and adds only the conditions given: `event_type = x`, `actor ->> 'id' = x`, `target ->> 'kind' = x`, `target ->> 'id' = x`, `seq > afterSeq`, `at >= from`, `at < to`, and the position (`seq < p` for `desc`, `seq > p` for `asc`); `ORDER BY seq <dir>, at <dir> LIMIT n`. Direction and operator come from a fixed table; every value is a bound parameter. `mk` is `null` unless `origin` is `mintkey`.
6. **Decision query** (`listPolicyDecisions`): the same method over `ursitoare.policy_decision` with `decided_at` as the same microsecond text, `= x` conditions on `decision`, `action`, `principal` (the stored text, for example `User::"tenant_a/u_1"`), `run_id`, `decision_id`, the time range, and `(decided_at, decision_id) < (p.decidedAt::timestamptz, p.decisionId)` (`>` for `asc`); `ORDER BY decided_at <dir>, decision_id <dir>`. Both readers check before any query `limit` (an integer from 1 to 500), `order`, the filters as in Decision 3 and the positions (decimal text; `decidedAt` microsecond text whose first 19 characters plus `Z` pass `isUtcTime`, with a 1 to 128 character id), and throw `AuditError("AUDIT_OPTIONS_INVALID", "audit options are invalid", { reason })`, `reason` being `bad_limit`, `bad_order`, `bad_filter` or `bad_position`, so no driver error escapes.
7. **Verification** (`GET /api/v1/audit/verify`, optional `from_seq`). The handler calls `(deps.verify ?? verifyChain)(pool, request.tenant, opts)` with `opts = { fromSeq }` plus `engineKey: deps.engineKey` when not null, and answers 200 `AuditVerification`: `firstBadSeq` and `fromSeq` are decimal strings, `reason` and `firstBadSeq` are `null` when absent, `anchorsChecked` is `deps.engineKey !== null`, `checkedAt` is `deps.clock.now().toISOString()` when the run ends. A broken chain is `ok: false` with status 200, a finding and not a failed request. An error from `verify` is the root handler's 500 `INTERNAL`.
8. **One run per tenant and start.** `registerAuditRoutes` keeps a `Map<string, Promise<AuditVerification>>` keyed `<tenantId>|<fromSeq>`. A request finding an entry awaits it and answers the same body; otherwise it starts the run and removes the entry when the run settles. A walk is linear in the chain; a loop of requests starts at most one per tenant and start.
9. **Wiring.** `src/main.ts` calls `registerAuditRoutes(server, { pool: pep.pool, clock: pep.clock, engineKey: config.engineKey })` right after `registerMeRoute(server, pep)` (after `installPep`, so the PEP hooks cover the routes), also when `pep.pool` is null, so the OpenAPI document lists the routes without a database.

## Interfaces

Same text as proposal.md § Interfaces given, which also lists the three endpoints and their bodies.

```ts
// src/audit/query.ts and src/audit/decisions.ts (exported by src/audit/index.ts)
interface AuditEventFilter { eventType?: string; actorId?: string; targetKind?: string; targetId?: string; afterSeq?: string; from?: string; to?: string }
interface AuditEventRecord { seq: string; at: string; eventType: string; actor: { kind: "user" | "service" | "system"; id: string }; target: { kind: string; id: string } | null; payload: Record<string, unknown>; origin: "ursitoare" | "mintkey"; mk: { traceId: string | null; requestId: string | null; jti: string | null } | null; prevHash: string; hash: string }
function isUtcTime(text: string): boolean
function listAuditEvents(pool: TenantPool, ctx: TenantContext, q: { filter?: AuditEventFilter; continueAfter?: string; order: "asc" | "desc"; limit: number }): Promise<AuditEventRecord[]>
interface PolicyDecisionFilter { decision?: "allow" | "deny"; action?: string; principal?: string; runId?: string; decisionId?: string; from?: string; to?: string }
interface PolicyDecisionRecord { decisionId: string; decidedAt: string; runId: string | null; nodeId: string | null; action: string; principal: string; resource: string; decision: "allow" | "deny"; reasons: string[]; errors: string[]; policySetVersion: string; requestDigest: string; permit: Record<string, unknown> | null }
function listPolicyDecisions(pool: TenantPool, ctx: TenantContext, q: { filter?: PolicyDecisionFilter; continueAfter?: { decidedAt: string; decisionId: string }; order: "asc" | "desc"; limit: number }): Promise<PolicyDecisionRecord[]>
// src/api/audit-query.ts and src/api/audit-routes.ts (exported by src/api/index.ts)
interface ListQuery<F> { page: { limit: number; cursor: string | null }; order: "asc" | "desc"; filter: F }
function parseAuditQuery(query: unknown): ListQuery<AuditEventFilter>
function parseDecisionQuery(query: unknown): ListQuery<PolicyDecisionFilter>
function parseVerifyQuery(query: unknown): { fromSeq: bigint }
interface AuditVerification { ok: boolean; checked: number; firstBadSeq: string | null; reason: "hash" | "gap" | "anchor" | null; fromSeq: string; anchorsChecked: boolean; checkedAt: string }
interface AuditApiDeps { pool: TenantPool | null; clock: Clock; engineKey: KeyMaterial | null; verify?: typeof verifyChain }
function registerAuditRoutes(server: FastifyInstance, deps: AuditApiDeps): void
```

## Data model

`src/db/migrations/0190_audit_read_indexes.sql`, verbatim (the runner supplies the transaction):

```sql
CREATE INDEX audit_event_type_idx ON ursitoare.audit_event (tenant_id, event_type, seq DESC);
CREATE INDEX policy_decision_time_idx ON ursitoare.policy_decision (tenant_id, decided_at DESC, decision_id DESC);
```

Both tables are partitioned, so every partition, the DEFAULT one and later ones, carries the index. Both lead with `tenant_id`; none is unique.

## Failure cases

| Situation | Behaviour |
|---|---|
| No or expired session; no `read_audit` | 401 `UNAUTHENTICATED`; 403 `FORBIDDEN` with `details.decisionId` and an `authz.denied` event (PEP) |
| No database or engine | 503 `AUTHZ_UNAVAILABLE` (PEP); the routes stay in the OpenAPI document |
| Unknown query name, bad value, `to` not after `from` | 400 `VALIDATION_FAILED`, one field; nothing read |
| Edited, foreign, other-list or other-order cursor; signed position of another shape | 400 `CURSOR_INVALID` |
| List request and no engine key | 500 `INTERNAL`, log `AUDIT_API_NO_ENGINE_KEY`, nothing read |
| `registerAuditRoutes` with a key under 32 characters | `RangeError` at registration, no key text |
| Empty log, or a filter matching nothing | 200 `{ items: [], next_cursor: null }` |
| Two verifications of one tenant and start at once | one run, both answered with its body |
| Chain empty, or `from_seq` above the tip | 200 `ok: true`, `checked: 0`; tampered chain: 200 `ok: false` with `firstBadSeq`, `reason` |
| `verify` or a list query rejects (database error, bad key) | 500 `INTERNAL`, no driver text; for `verify` every waiter gets it and the entry is removed |

## Security

1. **Authentication and action.** All three are `session` routes under `read_audit`; the PEP authenticates before the query is parsed. None is public.
2. **Tenant isolation.** No new table. Every query runs in `withTenantTx` (RLS) and names `tenant_id = $1` from `request.tenant`, which comes from the session; no tenant is read from a query or header (an unknown query name is 400). Cursors are bound to the tenant. Two-tenant scenarios: each list returns only the caller's rows, B's cursor under A is `CURSOR_INVALID`, `verify` walks only the caller's chain, and the shared-run key includes the tenant.
3. **Input validation.** Every query value has a pattern or length bound and is a bound SQL parameter; positions are checked before use. Payloads were screened for secret-like keys when written (`add-audit-chain`); they and the policy log's text are returned as stored data with `cache-control: no-store`; a client must escape them.
4. **Secrets.** The engine key reaches only `deriveCursorKey` and `verifyChain` and is in no response, log line or error.
5. **Abuse cases** (each a scenario): no session; no `read_audit`; another tenant by query, header or cursor; an edited cursor; `event_type=x' OR '1'='1` (fails the pattern); `2026-02-30`; `limit=0`; a loop of `verify` requests; an unknown parameter.

## Test plan

Node test runner, `*.test.ts` beside each file, loopback only, no sleeps (the shared-run case blocks `verify` on a promise). Each file starts with `assert.equal(typeof <function it tests>, "function")`; a call that reaches a stub is wrapped in `assert.doesNotThrow` or `await assert.doesNotReject` and the result asserted afterwards. Database tests use `withTestDatabase()` and `seedTwoTenants(db)`; events come from `appendAuditCommitted(db.appPool, ctx, event, { clock: fixedClock(...) })` and decisions from `recordDecision(tx, ctx, decision, req)` in `withTenantTx` (`policySetVersion` 64 hex characters, `decidedAt` an ISO string, `PolicyRequest { principal: { type: "User", id: "tenant_a/u_1" }, action, resource: { type: "Tenant", id: "tenant_a" }, context: {}, entities: [] }`). Tamper tests use the owner pool with `app.tenant_id` set and `ALTER TABLE ursitoare.audit_event DISABLE TRIGGER audit_event_append_only`, as `src/audit/verify.test.ts` does.

Server tests build the same fixture inline in each file: `buildServer` with `sequentialIds()`, a silent `createLogger` and `noopTracer`; a mutable `Clock` from `2026-10-25T09:00:00Z`; `createPolicyEngine({ srcDir: <empty temp dir>, tenantPolicies, clock, ids, logger })`; `installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: "http://127.0.0.1" })`; `registerAuditRoutes(server, { pool: db.appPool, clock, engineKey: { reveal: () => "k".repeat(64) } })`; sessions from `createTestSession(db, a, "alice", clock)`, sent as `headers: { cookie }`. A server that must deny uses `sequentialIds(1000)` for its engine, so its decision ids do not repeat another engine's (`recordDecision` ignores a repeated key). A refusal appends an `authz.denied` event, so each file runs its 403 and append scenarios after every scenario that counts or pages, or on a second `withTestDatabase()`. `tenantPolicies` is `[{ id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' }]` for permitted calls and `[{ id: "t-flow", layer: "tenant", text: '@id("t-flow") permit (principal, action == Action::"read_flow", resource);' }]` for 403 cases. `src/main.audit.test.ts` runs `main` as `src/main.api.test.ts` does (port-0 `AppConfig` with `database` `{ app: null, owner: null }`, `inspectServers`).

## Decisions made while writing

- **Newest first by default; `order=asc` and `after_seq` for a forward reader:** architecture §11 calls these routes an export for a SIEM.
- **Reads are not audited:** the PEP's `policy_decision` row is the access record; a read event would make each view append to the chain it shows.
- **No new error code; no refusal to start without an engine key:** the registry test fixes 16 codes, and `src/main.db.test.ts` boots `main` with a database and no key, so a missing key makes the list routes 500 and leaves `verify` working without anchors.
- **Decision reader in `audit`; exact-match filters; `principal` as stored text; UTC `Z` times to the millisecond:** the smallest contract a test can decide.
- **Migration 0190 is used** for two read indexes (the card reserved the number).
- **Events page by `seq` alone:** only a tampered chain has two rows with one `seq`.
- **Dependencies beyond the card:** `add-pdp-cedar` (the table) and the M0 units of `delivered-shapes.md`.
