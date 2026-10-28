## Why

Every outbound call, tool, LLM call and API action must be decided by one policy check that fails closed, and every decision must be recorded. Today the repository has no policy engine, no Cedar, and no decision log, so each later unit would invent its own check and its own record.

Observable result: `createPdp({ schema, policies, clock, ids, logger })` loads a Cedar schema and policy sources, refuses any policy that fails strict validation or warns (naming policy ids, never policy text), refuses a duplicate `@id`, and returns a `Pdp` with a `policySetVersion` (SHA-256 of the schema and the sorted sources). `Pdp.check(req)` answers `allow` or `deny` with a decision id, the sorted ids of the determining policies and the injected clock's time, and denies on any evaluation error (Cedar skips a policy that errors, so a failing `forbid` would otherwise allow), an unknown action, a principal or resource missing from the slice, and more than 24 entities. An allowed request that carries an `egress` gets a `permit`, an exact copy of its method, host, path, body digest, service id and TTL. `recordDecision(tx, ctx, decision, req)` appends the decision to `ursitoare.policy_decision`, a table partitioned by month with forced row-level security, readable and writable only for the transaction's tenant and never updatable. This is the engine half of exit test 6 (deny on an injected evaluation error).

## What Changes

- `src/pdp`: `createPdp`, `Pdp.check`, `PolicyRequest`, `Decision`, `Permit`, `PdpError`, the load-time validation, `policySetVersionOf`, `requestDigest` and `canonicalJson` (`src/pdp/digest.ts`), the value helpers `entityRef`, `toDecimal`, `hostOf`, `formatUid`, and `recordDecision`. It ports `seed/policy-cedar/src` (`cedar.ts`, `engine.ts`, `malformed.ts`) and the seed's limits and validation tests on `@cedar-policy/cedar-wasm` 4.14.0.
- `src/db/migrations/0110_policy_decision.sql`: `policy_decision` (partitioned by month on `decided_at`, DEFAULT partition, primary key `(tenant_id, decision_id, decided_at)`, forced RLS, `SELECT` and `INSERT` for the app role on the parent only).

## Impact

- Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. The scaffold also installs `@cedar-policy/cedar-wasm` 4.14.0 (exact; published 2026-10-19, older than the 3-day `minimumReleaseAge`; Apache-2.0, on the licence allowlist; no install script).
- **Depends on:** `add-engine-skeleton` (U01): `Clock`, `IdSource`, `fixedClock`, `sequentialIds`, `Logger`, `createLogger`. `add-db-foundation` (U02): `ensurePartitions`, `withTestDatabase`, the migration runner and the migrated test template. `add-tenancy-foundation` (U03): `TenantContext`, `TenantTx`, `withTenantTx`, `TENANT_ID_PATTERN`, `checkTenancyCatalog`, `seedTwoTenants`.
- **Files implemented** (stubs from the scaffold, holding the symbols below): `src/pdp/{index,types,errors,values,digest,engine,log}.ts`. **Files created:** `src/pdp/{cedar,load,check,guards,permit}.ts`, the tests `src/pdp/{values,digest,load,malformed,version,check,limits,guards,permit,schema,log,log.tenant,log.partition,log.guard}.test.ts` and `src/db/migrations/0110_policy_decision.sql`. **Files changed:** none; no existing test changes. `test/arch/modules.ts` needs no change (`pdp` may import `core`, `db`, `tenancy`, `observability`; this change imports `core`, `tenancy`, `observability`).
- **Migrations:** `0110_policy_decision.sql` (10 x unit 11). **Tables:** `ursitoare.policy_decision` and its partition `ursitoare.policy_decision_default`. No endpoint, no env var, no e2e part.

**Interfaces given** (exact signatures; the same text as design.md § Interfaces)

```ts
// src/pdp/index.ts (types in src/pdp/types.ts); imports Clock, IdSource (src/core), Logger (src/observability), TenantContext, TenantTx (src/tenancy)
type PolicyLayer = "platform" | "tenant"
interface PolicySource { id: string; text: string; layer: PolicyLayer }
interface EntityUid { type: string; id: string }
interface Entity { uid: EntityUid; attrs: Record<string, unknown>; parents: EntityUid[] }
interface Egress { method: string; host: string; path: string; bodyDigest: string; serviceId: string; ttlSeconds: number }
type Permit = Egress
interface PolicyRequest { principal: EntityUid; action: string; resource: EntityUid; context: Record<string, unknown>; entities: Entity[]; egress?: Egress }
interface Decision { decision: "allow" | "deny"; decisionId: string; decidedAt: string; reasons: string[]; errors: string[]; policySetVersion: string; permit?: Permit }
// actions sorted ascending, policies sorted by id (code-unit order, as Array.prototype.sort)
interface Pdp { readonly policySetVersion: string; readonly actions: readonly string[]; readonly policies: readonly { id: string; layer: PolicyLayer }[]; check(req: PolicyRequest): Promise<Decision> }
function createPdp(opts: { schema: string; policies: PolicySource[]; clock: Clock; ids: IdSource; logger: Logger }): Promise<Pdp>
type PdpErrorCode = "PDP_OPTIONS_INVALID" | "PDP_SCHEMA_INVALID" | "PDP_POLICY_INVALID" | "PDP_DUPLICATE_ID" | "PDP_RECORD_INVALID" | "PDP_RECORD_FAILED"
class PdpError extends Error { readonly code: PdpErrorCode; readonly details: Readonly<Record<string, string | readonly string[]>>; constructor(code: PdpErrorCode, message: string, details?: Record<string, string | readonly string[]>) }
const MAX_SLICE_ENTITIES: number; const MAX_REQUEST_CHARS: number; const MAX_PERMIT_TTL_SECONDS: number
function recordDecision(tx: TenantTx, ctx: TenantContext, decision: Decision, req: PolicyRequest, extra?: { runId?: string; nodeId?: string }): Promise<boolean>
function formatUid(uid: EntityUid): string
function entityRef(type: string, id: string): { __entity: { type: string; id: string } }
function toDecimal(n: number): { __extn: { fn: "decimal"; arg: string } }
function hostOf(url: string): string
// src/pdp/digest.ts (not in index.ts)
function canonicalJson(value: unknown): string
function sha256Hex(text: string): string
function requestDigest(req: PolicyRequest): string
function policySetVersionOf(schema: string, sources: readonly PolicySource[]): string
```

Also given: table `ursitoare.policy_decision` (columns in design.md § Data model) and file `src/db/migrations/0110_policy_decision.sql`; `Decision.errors` codes `PDP_REQUEST_INVALID`, `PDP_REQUEST_TOO_LARGE`, `PDP_SLICE_TOO_LARGE`, `PDP_UNKNOWN_ACTION`, `PDP_ENTITY_MISSING`, `PDP_INTERNAL`, `PDP_EVALUATION_ERROR:<policyId>`; log lines `pdp loaded` and `pdp deny on error`.

`recordDecision` checks, in this order and before any query, and refuses the first failing field as `PDP_RECORD_INVALID` with `details.reason`: `tenant_id` (`^[A-Za-z0-9_-]{1,64}$`), `decision` (`allow` or `deny`), `decision_id` (1 to 128 characters), `decided_at` (round-trips through `new Date(x).toISOString()`), `policy_set_version` (64 lower-case hex digits), `reasons` and `errors` (arrays of strings), `run_id` and `node_id` (when given, 1 to 128 characters), `permit` (only on `allow`). So no column CHECK is reached, and `PDP_RECORD_FAILED` means the query itself failed.

**Interfaces taken**

- From `add-engine-skeleton`: `Clock`, `IdSource`, `fixedClock`, `sequentialIds` (`src/core`); `Logger`, `LogDestination`, `createLogger` (`src/observability`).
- From `add-db-foundation`: `ensurePartitions` (`src/db`); `withTestDatabase`, `TestDatabase` (`test/support/pg.ts`).
- From `add-tenancy-foundation`: `TenantContext`, `TenantTx`, `withTenantTx`, `TENANT_ID_PATTERN`, `checkTenancyCatalog` (`src/tenancy`); `seedTwoTenants` (`test/support/tenants.ts`).
- From the scaffold: the package `@cedar-policy/cedar-wasm` 4.14.0.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@fb48c96, checked line by line).

## Out of scope

The action catalogue, the platform and tenant policy layers, per-module policy fragments, `Pdp.allowedActions` and the typed context of each action (`add-policy-catalogue`); request building, the directory, derived context such as `url_host` and `approvers_by_role`, and `unconstrained_args`; reading decisions over the API (`add-audit-api`); the call-site lint (C2); grants, policy templates and policy deploy (`add-grants-model`); the outbound gateway that consumes a `Permit` (`add-gateway-client`); dropping or archiving partitions (`add-retention-partitioning`); a latency bound (the seed measured p99 under 1 ms).
