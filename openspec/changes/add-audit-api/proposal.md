## Why

An auditor or tenant admin cannot yet read what the platform recorded: the audit chain (`add-audit-chain`) and the policy-decision log (`add-pdp-cedar`) are tables, and `add-api-pep` fills them, but no endpoint returns any of it or says whether the chain still verifies.

Observable result: a signed-in principal whose policy permits `read_audit` calls `GET /api/v1/audit` and gets their own tenant's events, newest first (or oldest first for an exporter), a page at a time (`limit`, `cursor`, `next_cursor`), filtered by event type, actor, target, time or sequence. `GET /api/v1/policy-decisions` lists the recorded decisions the same way, filtered by decision, action, principal, run or decision id (the id a 403 shows). `GET /api/v1/audit/verify` runs the hash-chain check and answers `{ ok, checked, firstBadSeq, reason, fromSeq, anchorsChecked, anchorsVerified, checkedAt }`: a tampered chain is a 200 with `ok: false` and the first bad sequence number, and `anchorsChecked` is true only when signed head anchors were found and compared (`anchorsVerified` counts them), because an engine key alone proves nothing. Another tenant's rows are never visible, a principal without `read_audit` gets 403 with the decision id, a foreign cursor is 400 `CURSOR_INVALID`, and a list needing a cursor without an engine key is 503 `ENGINE_KEY_REQUIRED`. This is the read side of the trail behind exit test 18.

## What Changes

- `src/audit`: `listAuditEvents`, `countAnchors`, `isUtcTime`. `src/pdp`: `listPolicyDecisions`. `src/api`: the query parsers, `createWalkQueue` and `registerAuditRoutes` (three routes, cursors, walk queue).
- Migration `0190_audit_read_indexes.sql` (two read indexes); `src/main.ts` registers the routes; `docs/api/openapi.json` is regenerated.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded (they change existing files): the exports of `src/audit/index.ts`, `src/pdp/index.ts` and `src/api/index.ts` (each task adds its own), the call in `src/main.ts` (task 9.1) and the regenerated `docs/api/openapi.json`. No new dependency.
- **Depends on** (evidence is the list under Interfaces taken): `add-engine-skeleton`, `add-db-foundation`, `add-tenancy-foundation`, `add-audit-chain`, `add-pdp-cedar`, `add-policy-catalogue`, `add-api-pep`, `add-api-conventions`, and `add-admin-api` (U18): both units edit `src/main.ts`, `src/api/index.ts` and `docs/api/openapi.json`, so this one runs after it, registers its routes right after `registerAdminRoutes(...)` and takes its code `ENGINE_KEY_REQUIRED`. The roadmap card lists U08, U11b, U13, U14 and U18; `add-pdp-cedar` and the M0 units are added for names used. `test/arch/modules.ts` needs no change: `api` may import `audit` and `pdp`.
- **Files implemented** (stubs): `src/audit/query.ts`, `src/pdp/decisions-query.ts`, `src/api/{audit-query,audit-routes}.ts`. **Created:** the migration and a `*.test.ts` per task. **Changed:** `src/audit/index.ts`, `src/pdp/index.ts`, `src/api/index.ts`, `src/main.ts`, `docs/api/openapi.json`; no existing test.
- **Migrations:** `0190_audit_read_indexes.sql` (indexes `audit_event_type_idx`, `policy_decision_time_idx`; no table, column or grant). **Tables, env, audit events:** none new. **Endpoints:** three. **Error codes:** none added to `ERROR_CODES`; the routes use `VALIDATION_FAILED`, `CURSOR_INVALID`, `UNAUTHENTICATED`, `FORBIDDEN`, `AUTHZ_UNAVAILABLE`, `INTERNAL` and `ENGINE_KEY_REQUIRED`.

**Interfaces given** (declarations omit `export`; the same text as design.md § Interfaces)

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

All three routes are `session` routes under `read_audit`; query names are in design.md Decision 3.

**Interfaces taken:**

- From `add-engine-skeleton`: `ApiError`, `buildServer`, `Clock`, `fixedClock`, `sequentialIds`, `noopTracer`, `createLogger`, `AppConfig`, `Secret`.
- From `add-db-foundation`: `withTestDatabase`, `TestDatabase`, `ensurePartitions`; the migration ledger.
- From `add-tenancy-foundation`: `TenantContext`, `TenantPool`, `TenantTx`, `withTenantTx`, `seedTwoTenants`, `checkTenancyCatalog`.
- From `add-audit-chain`: `verifyChain`, `ChainReport`, `KeyMaterial`, `appendAuditCommitted`, `AuditError`, `anchorHead`, `Anchor`, `formatAt`; tables `ursitoare.audit_event`, `ursitoare.audit_head`, `ursitoare.audit_anchor`.
- From `add-pdp-cedar`: `recordDecision`, `Decision`, `PolicyRequest`, `PdpError`; table `ursitoare.policy_decision`.
- From `add-policy-catalogue`: `createPolicyEngine`, `ActionName`; the action `read_audit` on resource type `Tenant`.
- From `add-api-pep`: `defineRoute`, `installPep`, `listDefinedRoutes`, `createTestSession`; `request.principal` and `request.tenant`; `MainDeps.inspectServers`; the call `registerMeRoute(server, pep)` in `src/main.ts`.
- From `add-api-conventions`: `PAGE_QUERY_SCHEMA`, `readPage`, `startAfter`, `paginate`, `Page`, `CursorBinding`, `deriveCursorKey`, `encodeCursor`, `unregisteredRouteErrors`, `servedOpenApiText`, `ERROR_CODES`; the rule that a unit adding a route regenerates `docs/api/openapi.json`.
- From `add-admin-api`: `registerAdminRoutes`, after whose call in `src/main.ts` the audit routes are registered; the registered code `ENGINE_KEY_REQUIRED` (503, `Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)`); the admin paths in `docs/api/openapi.json`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (merged code, main@e226f8c, checked line by line).

## Out of scope

Roles and the policy that permits `read_audit` (`add-roles-and-memberships`); the admin page (`add-web-admin`); the `verify-audit` command (`add-admin-cli`); audit events of the management API (`add-admin-api`); writing head anchors (no unit does yet, so `anchorsChecked` stays false until one does); the Mintkey sink; a mandatory engine key; other export formats; retention; rate limiting.
