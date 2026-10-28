## Why

An auditor or tenant admin cannot yet read what the platform recorded. The audit chain (`add-audit-chain`) and the policy-decision log (`add-pdp-cedar`) exist as tables, and `add-api-pep` records every API decision and audits every refusal, but no endpoint returns any of it or says whether the chain still verifies.

Observable result: a signed-in principal whose policy permits `read_audit` calls `GET /api/v1/audit` and gets their own tenant's events, newest first, a page at a time (`limit`, `cursor`, `next_cursor`), filtered by event type, actor, target, time or sequence, or oldest first for an exporter that follows the log. `GET /api/v1/policy-decisions` lists the recorded decisions the same way, filtered by decision, action, principal, run or decision id (the id a 403 shows). `GET /api/v1/audit/verify` runs the hash-chain check and answers `{ ok, checked, firstBadSeq, reason, anchorsChecked, checkedAt }`; a tampered chain is a 200 with `ok: false` and the first bad sequence number, and concurrent checks of one tenant share one run. Another tenant's rows are never visible, a principal without `read_audit` gets 403 with the decision id, and an edited or foreign cursor is 400 `CURSOR_INVALID`. This is the read side of the trail behind exit test 18 and the data the M2 admin page shows.

## What Changes

- `src/audit`: `listAuditEvents`, `listPolicyDecisions`, `isUtcTime`. `src/api`: the query parsers and `registerAuditRoutes` with the three routes, cursors and the shared verification run.
- Migration `0190_audit_read_indexes.sql` (two read indexes); `src/main.ts` registers the routes; `docs/api/openapi.json` is regenerated.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: the exports of `src/audit/index.ts` and `src/api/index.ts` (each task adds its own), the call in `src/main.ts` (task 9.1) and the regenerated `docs/api/openapi.json`; tests import each symbol from the file that defines it. No new dependency.
- **Depends on** (evidence is the list under Interfaces taken): `add-engine-skeleton`, `add-db-foundation`, `add-tenancy-foundation`, `add-audit-chain`, `add-pdp-cedar`, `add-policy-catalogue`, `add-api-pep`, `add-api-conventions`. The roadmap card lists U08, U11b, U13 and U14; `add-pdp-cedar` (the `policy_decision` table, `recordDecision`) and the M0 units are added because their names are used. `test/arch/modules.ts` needs no change: `api` may import `audit`, which imports only `core`, `db`, `tenancy` and `observability`.
- **Files implemented** (stubs from the scaffold): `src/audit/{query,decisions}.ts`, `src/api/{audit-query,audit-routes}.ts`. **Files created:** `src/db/migrations/0190_audit_read_indexes.sql` and a `*.test.ts` for each task. **Files changed:** `src/audit/index.ts`, `src/api/index.ts`, `src/main.ts`, `docs/api/openapi.json`; no existing test changes.
- **Migrations:** `0190_audit_read_indexes.sql` (indexes `audit_event_type_idx`, `policy_decision_time_idx`; no table, column or grant). **Tables, env, audit events:** none new (the PEP's decision log records each read). **Endpoints:** the three below. **Error codes:** none new; the routes use `VALIDATION_FAILED`, `CURSOR_INVALID`, `UNAUTHENTICATED`, `FORBIDDEN`, `AUTHZ_UNAVAILABLE` and `INTERNAL`, all in the registry of `add-api-conventions`.

**Interfaces given** (declarations omit `export`; the same text as design.md § Interfaces)

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

Also given, all `session` routes under `read_audit` (query names in design.md Decision 3): `GET /api/v1/audit` answers `{ items: AuditEventRecord[], next_cursor: string | null }`; `GET /api/v1/policy-decisions` answers `{ items: PolicyDecisionRecord[], next_cursor }`; `GET /api/v1/audit/verify` answers `AuditVerification`. Lists are newest first unless `order=asc`; `seq` is a decimal string; times are UTC text with microseconds. Indexes `audit_event_type_idx`, `policy_decision_time_idx`.

**Interfaces taken:**

- From `add-engine-skeleton`: `ApiError`, `buildServer`, `Clock`, `fixedClock`, `sequentialIds`, `noopTracer`, `createLogger`, `AppConfig`, `Secret`, `main`, `MainDeps`.
- From `add-db-foundation`: `withTestDatabase`, `TestDatabase`, `ensurePartitions`; the migration ledger `ursitoare.schema_migration`.
- From `add-tenancy-foundation`: `TenantContext`, `TenantPool`, `TenantTx`, `withTenantTx`, `seedTwoTenants`, `checkTenancyCatalog`.
- From `add-audit-chain`: `verifyChain`, `ChainReport`, `KeyMaterial`, `appendAuditCommitted`, `AuditEventInput`, `AuditError`; tables `ursitoare.audit_event`, `ursitoare.audit_head`.
- From `add-pdp-cedar`: `recordDecision`, `Decision`, `PolicyRequest`; table `ursitoare.policy_decision`.
- From `add-policy-catalogue`: `createPolicyEngine`, `ActionName`; the action `read_audit` on resource type `Tenant`.
- From `add-api-pep`: `defineRoute`, `installPep`, `listDefinedRoutes`, `createTestSession`; `request.principal` and `request.tenant`; `MainDeps.inspectServers`; the call `registerMeRoute(server, pep)` in `src/main.ts`, after which the audit routes are registered.
- From `add-api-conventions`: `PAGE_QUERY_SCHEMA`, `readPage`, `startAfter`, `paginate`, `Page`, `CursorBinding`, `deriveCursorKey`, `encodeCursor`, `unregisteredRouteErrors`, `servedOpenApiText`; the 16-code registry (no code added); the rule that a unit adding a route regenerates `docs/api/openapi.json`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e226f8c, checked line by line).

## Out of scope

Roles and the policy that permits `read_audit` (`add-roles-and-memberships`); the admin page and its journey (`add-web-admin`); the `verify-audit` command (`add-admin-cli`); audit events of the management API (`add-admin-api`); the Mintkey sink; a mandatory engine key at start; export formats other than JSON pages; retention; rate limiting.
