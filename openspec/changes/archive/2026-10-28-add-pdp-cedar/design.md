## Context

This change adds `src/pdp` (module `pdp` may import `core`, `db`, `tenancy`, `observability`; `test/arch/modules.ts` needs no change) and migration `0110_policy_decision.sql`. It ports the Cedar engine of `seed/policy-cedar/src` (`cedar.ts`, `engine.ts`, `malformed.ts`) and its limits and validation tests. The scaffold installs `@cedar-policy/cedar-wasm` 4.14.0 (published 2026-10-19; Apache-2.0; no install script). Dependencies, restated exactly:

- `add-engine-skeleton`: `interface Clock { now(): Date }`, `fixedClock(iso: string): Clock`, `interface IdSource { next(prefix: string): string }`, `sequentialIds(seed?: number): IdSource` (ids `${prefix}_00000000-0000-7000-8000-<counter, 12 hex>` from 0), `type Logger = import("pino").Logger`, `interface LogDestination { write(line: string): void }`, `createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger`.
- `add-db-foundation`: `ensurePartitions(ownerPool: pg.Pool, clock: { now(): Date }, opts?: { monthsBack?: number; monthsAhead?: number }): Promise<{ created: string[]; skipped: string[] }>` (partitions `<table>_pYYYYMM`); `withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster }): Promise<TestDatabase>` with `ownerPool` and `appPool`.
- `add-tenancy-foundation`: `interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile }`, `type TenantTx = Pick<pg.PoolClient, "query">`, `withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>` (`TenantPool = Pick<pg.Pool, "connect">`), `TENANT_ID_PATTERN` (`/^[A-Za-z0-9_-]{1,64}$/`), `checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string }): Promise<CatalogViolation[]>`, `seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>`.

## Decisions

1. **Immutable engine.** `src/pdp/cedar.ts` alone does `import * as cedar from "@cedar-policy/cedar-wasm/nodejs"` (the CommonJS build, as the seed). `createPdp` preparses the set and schema under names from a module-level counter (Cedar replaces a set that reuses a name, and an injected `IdSource` is not unique across instances) and returns a `Pdp` that never changes; a new policy set is a new `createPdp`. A set lives for the process (no free call in the wasm API).
2. **Load order**, each stage reporting all its ids: options; duplicate source ids (`PDP_DUPLICATE_ID`, `stage` `source`); schema (`checkParseSchema`; `schemaToJson` must hold only the empty namespace, else `PDP_SCHEMA_INVALID`, `reason` `namespace`); per source `policySetTextToParts` (`stage` `parse`, source ids); templates (`stage` `template`, source ids); `@id` from `policyToJson(text).json.annotations.id`, matching `^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$` (`stage` `id`, source ids); duplicate `@id` over all sources (`stage` `policy`); strict `validate` over the map `@id` to text, where any `validationErrors`, `validationWarnings` or `otherWarnings` is `PDP_POLICY_INVALID` (`stage` `validate`, ids from `policyId`, else all ids). A message is `<code>: <stage> <ids joined by ", ">`, at most 20 ids.
3. **Option reasons** (`PDP_OPTIONS_INVALID`, `details.reason`): `schema` (not a string), `policies` (not an array), `source_id` (not `^[A-Za-z0-9][A-Za-z0-9_./-]{0,127}$`), `layer`, `text` (not a string). Empty `text` or `policies` is valid.
4. **Layers** are metadata (version, `Pdp.policies`); a platform `forbid` beats a tenant `permit` (Cedar: forbid overrides permit).
5. **Check order** (first failure wins, one code in `errors`): `decisionId = ids.next("dec")` and `decidedAt = clock.now().toISOString()` outside the guard, so a failing dependency rejects; then request shape (`PDP_REQUEST_INVALID`: not an object, `entities` not an array, `action` not a string, a malformed uid or entity, `context` not a plain object); `entities.length > 24` (`PDP_SLICE_TOO_LARGE`, array length, duplicates counted); `JSON.stringify({ context, entities }).length > 262144` (`PDP_REQUEST_TOO_LARGE`; a throw is `PDP_REQUEST_INVALID`); action not in `Pdp.actions` (`PDP_UNKNOWN_ACTION`); principal or resource uid not in `entities` (`PDP_ENTITY_MISSING`); a repeated uid or an invalid `egress` (`PDP_REQUEST_INVALID`); then `statefulIsAuthorized({ principal, action: { type: "Action", id }, resource, context, entities: [{ uid, attrs, parents }], preparsedPolicySetId, preparsedSchemaName, validateRequest: true })`. A `failure` answer is `PDP_REQUEST_INVALID`, its Cedar message dropped because it can echo request values. Any other exception is `PDP_INTERNAL`, logged as `{ err }`.
6. **Interpretation:** `errors` are `PDP_EVALUATION_ERROR:<policyId>` per `diagnostics.errors` entry, sorted and unique; `reasons` are `diagnostics.reason` sorted. Any error means `deny`: Cedar skips a policy that errors, so a failing `forbid` would otherwise become an allow. No determining policy is a default `deny`. A deny with an entry in `errors` logs `logger.warn({ decisionId, errors }, "pdp deny on error")`; `createPdp` logs `logger.info({ policySetVersion, policies: <count> }, "pdp loaded")`.
7. **Permit** (`src/pdp/permit.ts`): on `allow` with `egress`, `Object.freeze({ method, host, path, bodyDigest, serviceId, ttlSeconds })` built field by field. Valid egress: `method` `^[A-Z]{3,10}$`; `host` `^[a-z0-9.-]{1,253}(:[0-9]{1,5})?$`; `path` `^/[\x21-\x7e]{0,2047}$`; `bodyDigest` `^[0-9a-f]{64}$`; `serviceId` `^[A-Za-z0-9._:-]{1,128}$`; `ttlSeconds` an integer from 1 to 3600. Egress is not in the Cedar context; callers put what policy needs (such as `url_host`) there.
8. **Digests** (`src/pdp/digest.ts`). `canonicalJson`: `null`, booleans, strings and finite numbers as `JSON.stringify`; arrays in order; plain objects (prototype `Object.prototype` or `null`) with keys sorted by UTF-16 code unit and `undefined` properties omitted; anything else (`NaN`, `Infinity`, `bigint`, `symbol`, function, `Date`, class instance, `undefined` in an array, depth over 64, cycle) is `TypeError`. `requestDigest(req)` is `sha256Hex(canonicalJson({ principal, action, resource, context, entities, egress }))` over exactly these fields (`egress` omitted when absent); when reading the request or `canonicalJson` throws anything (`req` null, a throwing getter, a `TypeError`) it is the fixed `sha256Hex("(invalid request)")`, `2f600a98a05b66eadd93b11605e6f82102236a634f91a7fa74df0dea6da97caf`, read from nothing in the request. `policySetVersionOf` is `sha256Hex(canonicalJson({ schema, sources }))` with `sources` sorted by id, each `{ id, layer, text }`.
9. **`recordDecision`** validates, then inserts with `ON CONFLICT (tenant_id, decision_id, decided_at) DO NOTHING` and returns `rowCount === 1`; `decided_at` is `decision.decidedAt`, so a retried step adds no row. `action`, `principal` (`formatUid`) and `resource` are limited to 128, 512 and 512 characters: NUL becomes U+FFFD, and a longer text becomes its first (limit - 17) characters, `#` and the first 16 hex digits of its SHA-256, so a hostile id cannot block the log of its denial. It records every `Decision` `check` returned, also for a request that is not a request (`req` null, or a getter that throws anything): `req` and each of its `action`, `principal`, `resource` are read inside a `try`, and one that is unreadable gives `action` `""` (also for a non-string), `(invalid)` for a uid and the fixed digest. `PDP_RECORD_INVALID` `details.reason` is the first failing field, in the order proposal.md lists under Interfaces given.
10. **Value helpers** (`src/pdp/values.ts`): the seed's `ent` (`entityRef`), `toDecimal` (`RangeError` unless `n.toFixed(4)` equals `n`) and `hostOf` (`new URL(url).hostname.toLowerCase()`), plus `formatUid` (`` `${type}::${JSON.stringify(id)}` ``, or `(invalid)` for a non-`EntityUid`).

## Interfaces

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

Values: `MAX_SLICE_ENTITIES` 24, `MAX_REQUEST_CHARS` 262144, `MAX_PERMIT_TTL_SECONDS` 3600 (the scaffold stubs them as `0`). `Decision.decidedAt` is `toISOString()` of the injected clock; `Pdp.actions` is sorted ascending and `Pdp.policies` by id. `Decision.errors` entries: `PDP_REQUEST_INVALID`, `PDP_REQUEST_TOO_LARGE`, `PDP_SLICE_TOO_LARGE`, `PDP_UNKNOWN_ACTION`, `PDP_ENTITY_MISSING`, `PDP_INTERNAL`, `PDP_EVALUATION_ERROR:<policyId>`. `PdpError.details` keys: `stage`, `ids`, `reason`, `sqlstate`. `attrs` and `context` values are Cedar JSON (`entityRef`, `toDecimal`).

## Data model

`src/db/migrations/0110_policy_decision.sql`, verbatim (the runner supplies the transaction):

```sql
CREATE TABLE ursitoare.policy_decision (
  tenant_id text NOT NULL CHECK (char_length(tenant_id) BETWEEN 1 AND 64),
  decided_at timestamptz NOT NULL,
  decision_id text NOT NULL CHECK (char_length(decision_id) BETWEEN 1 AND 128),
  run_id text CHECK (char_length(run_id) BETWEEN 1 AND 128),
  node_id text CHECK (char_length(node_id) BETWEEN 1 AND 128),
  action text NOT NULL CHECK (char_length(action) <= 128),
  principal text NOT NULL CHECK (char_length(principal) <= 512),
  resource text NOT NULL CHECK (char_length(resource) <= 512),
  decision text NOT NULL CHECK (decision IN ('allow', 'deny')),
  reasons text[] NOT NULL DEFAULT '{}',
  errors text[] NOT NULL DEFAULT '{}',
  policy_set_version text NOT NULL CHECK (policy_set_version ~ '^[0-9a-f]{64}$'),
  request_digest text NOT NULL CHECK (request_digest ~ '^[0-9a-f]{64}$'),
  permit jsonb CHECK (permit IS NULL OR decision = 'allow'),
  PRIMARY KEY (tenant_id, decision_id, decided_at)
) PARTITION BY RANGE (decided_at);
COMMENT ON TABLE ursitoare.policy_decision IS 'partition: month';
CREATE TABLE ursitoare.policy_decision_default PARTITION OF ursitoare.policy_decision DEFAULT;
ALTER TABLE ursitoare.policy_decision ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.policy_decision FORCE ROW LEVEL SECURITY;
CREATE POLICY policy_decision_isolation ON ursitoare.policy_decision
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.policy_decision TO ursitoare_app;
```

The app role has no `UPDATE` or `DELETE` (an append-only log) and no privilege on a leaf partition; retention drops partitions as the owner. There is no foreign key to `runs` (later) or `tenant` (the log outlives a tenant row). Probed on embedded Postgres 18.4: the app role inserts through the parent into DEFAULT and a leaf; a mismatched tenant setting fails with `42501`.

## Failure cases

- A bad schema, policy, id or option: `createPdp` rejects, nothing half-loaded. Any request fault, evaluation error or limit is a `deny` with a fixed code; only a throwing `IdSource` or `Clock` makes `check` reject. Of two writers of one decision the second inserts nothing and gets `false`.
- `recordDecision`: an invalid decision, id or tenant is `PDP_RECORD_INVALID` before any query; a query failure (RLS `42501`, a down database, a non-pg error) is `PDP_RECORD_FAILED` with `details.sqlstate` the error's string `code` or `unknown`, the driver message dropped; the caller's transaction is then aborted. A date with no partition lands in DEFAULT.

## Security

1. No endpoint is added, so no authentication or PEP action: the API PEP and the interpreter call the module; a client never does.
2. `policy_decision` is tenant-leading with forced RLS on `app.tenant_id`; `recordDecision` runs in the caller's `withTenantTx`. Two-tenant tests use only `appPool`. The engine holds no tenant data between calls.
3. Context and entities are data, never code: Cedar gets JSON under request validation (closed records, so an undeclared attribute denies), within 24 entities and 262,144 characters. The engine computes no taint; callers put labels in `context`.
4. No secret enters the module. Egress holds a `serviceId` and a body digest, never a credential; errors and logs hold codes, ids and counts, never policy text, Cedar messages, context or entities. A stored permit `path` must never hold a credential.
5. Abuses, each a scenario: a `forbid` made to error; a missing entity; an oversized slice; an unknown action; a reused platform id; a widened permit; policy text in errors; a hostile id; cross-tenant log access; `UPDATE` or `DELETE` of the log.

## Test plan

No sleeps or network. A test asserts a whole value (`deepEqual`) before it reads a nested property, so a missing one fails an assertion, not with a `TypeError`. `Pdp` tests use `fixedClock("2026-10-25T09:00:00Z")`, `sequentialIds()` and a silent `createLogger`; every ported test calls `createPdp` or another function of this change, so it fails at red on the stub's `not implemented`. Database tests use `withTestDatabase()` and `seedTwoTenants(db)`; `schema.test.ts` first asserts with `assert.ok` that the table, the DEFAULT partition and ledger version 110 exist, and expects SQL failures with `await assert.rejects(p, { code })`.

Data is inline in each test file. **The test set:** source `platform.cedar` (layer `platform`) with `@id("p-forbid-locked") forbid (principal, action, resource) when { resource.locked };`; source `tenant.cedar` (layer `tenant`) with `t-read-own` (`permit (principal, action == Action::"read", resource) when { resource.owner == principal };`), `t-write-admin` (`permit (principal in Role::"admin", action == Action::"write", resource);`), `t-send-tool` (`permit (principal, action == Action::"send", resource) when { context.tool.effect == "send" };`) and `t-forbid-big` (`forbid (principal, action == Action::"write", resource) when { context.n * 9223372036854775807 > 100 };`), each with its `@id`, over the schema:

```
entity Role;
entity User in [Role];
entity Tool { effect: String };
entity Doc { owner: User, locked: Bool };
action read, write, send appliesTo {
  principal: User, resource: Doc, context: { n: Long, tool: Tool, amount?: decimal } };
```

**The base request:** `read` by `User::"alice"` on `Doc::"d1"`, context `{ n: 0, tool: entityRef("Tool","mail") }`, entities `User::"alice"` (parents `[Role::"admin"]`), `Doc::"d1"` (`owner` alice, `locked` false), `Tool::"mail"` (`effect` `send`). Probed on cedar-wasm 4.14.0: `write` allows at `n` 0, denies with `t-forbid-big` at 1, and at 2 the `forbid` overflows while raw Cedar answers `allow`. **Malformed policies** (each `@id("bad")`, `action == Action::"read"` unless noted): M1 `permit (principal, action == Action::"read", resource) when { context.n > 1 ` (unterminated); then `forbid (principal, action == Action::"read", resource) when { ... };` with M2 `context.n == "x"`; M3 `principal.roless.contains(Role::"admin")`; M4 `context.amount.greaterThan(decimal("1.0000"))` (no `has`); M5 `context has amount && context.amount > 10000` (decimal against Long); M6 `context.nope == 1`; and M7 `permit (principal, action == Action::"read", resource == User::"alice");` (warnings only); M8 `permit (principal, action == Action::"reed", resource);`.

## Decisions made while writing

1. **`Decision.decidedAt`** (ISO string) is added to the roadmap's Decision: `recordDecision` has no clock, `decided_at` must be injectable (the card asks for inserts at `fixedClock` dates) and a retried step must reuse its key.
2. **Digest helpers live in `src/pdp/digest.ts`, not `src/core`:** `core`'s index belongs to `add-engine-skeleton`, and `add-audit-chain` will own a `canonicalize`; moving later is a refactor.
3. **Extra columns** `run_id`, `node_id` (from `extra`) and `permit jsonb` (exit test 13 compares method, host, path and body digest with the `policy_decision`); the app role is append-only.
4. **`Decision.errors` are codes**, not Cedar messages, which echo request values into the log and later 403 bodies.
5. **Principal and resource must be in the slice** (ADR-03 item 1; Cedar alone allows when no policy reads them); duplicate uids deny; Role entities may stay out.
6. **Templates and a policy without `@id` are refused** (`add-grants-model` may extend this); the schema has the empty namespace, as the seed; egress shapes and the 3600 s TTL cap are decided here because the permit is created here.
7. **A hostile request is recorded, with a fixed digest:** `check` denies it, the log must hold every decision, and a constant digest and `""`/`(invalid)` placeholders cannot throw.
