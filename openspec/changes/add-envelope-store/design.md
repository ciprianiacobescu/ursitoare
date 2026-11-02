## Context

`src/runs` may import only `core`, `db`, `tenancy` and `durable`; this unit imports only `src/tenancy` and `node:crypto`, so it formats timestamps and canonicalises JSON itself (no `audit`, no `authoring`).

## Decisions

1. **Files** in `src/runs/store/`, exported by `src/runs/index.ts`: `errors.ts`, `types.ts`, `canonical.ts`, `envelope-store.ts`, `run-repository.ts` (with `RUN_LIST_FILTER_FIRST`), `step-repository.ts`, `events.ts`, `run-store.ts`, `memory-store.ts`, and the module-internal `validate.ts` and `tenant.ts`.
2. **Time strings.** Every string timestamp (`createdAt`, `startedAt`, `endedAt`, step times, `RunCursor.createdAt`) is `date.toISOString().slice(0, -1) + "000Z"`, such as `2026-10-25T09:00:00.123000Z`; `runDay` is `date.toISOString().slice(0, 10)` (select `run_day::text`: `pg` parses a `date` into a local `Date`). An invalid `Date`, a year outside 1970-9999, or a cursor `createdAt` that does not round-trip through `new Date(...)` is `RUN_DATA_INVALID`.
3. **Canonical JSON.** A `PayloadValue` is `null`, a boolean, a finite number, a string, an array or a plain object (prototype `Object.prototype` or `null`) of such values, nested at most 64 containers deep (a cycle exceeds it). Each string and key must be well-formed UTF-16 and hold no U+0000, because `jsonb` refuses U+0000 (22P05). Anything else is `RUN_DATA_INVALID` with a fixed message that never holds a value. The canonical text is `JSON.stringify` with object keys sorted by UTF-16 code units (the default `sort`) and `-0` as `0`; `payloadDigest` is the lowercase hex SHA-256 of its UTF-8 bytes.
4. **`put`**: canonicalise; `size = Buffer.byteLength(text)`, over 1,048,576 is `RUN_DATA_TOO_LARGE`; else `INSERT ... ON CONFLICT (tenant_id, sha256) DO NOTHING` with `data = $::jsonb` bound to the canonical text, answering `{ sha256, size }`. `data` comes back from `jsonb`, so key order is lost but `payloadDigest(data) === sha256`. `get` of a malformed `sha256` is `RUN_DATA_INVALID`; of an absent one, `null`.
5. **`create`**: validate, check the tenant, `SELECT` the row and answer it unchanged if found. Else `put` `input` (and `mocks` unless null), `INSERT ... ON CONFLICT (tenant_id, run_id) DO NOTHING RETURNING`, and on no row (a concurrent create won) `SELECT` and answer that. The new row is `queued`; `run_day` and `created_at` come from `at`.
6. **`transition`**: validate, check the tenant, `SELECT ... FOR UPDATE`; answer `null`, storing nothing, when the row is absent or its state is not in `from`. Else `put` `output` when given and `UPDATE` the state, `started_at = COALESCE(started_at, at)` for `running`, `ended_at = at` for `completed`, `failed`, `cancelled`, and `output_ref`, `error`, `terminal_node` only when given. `from` is the only guard.
7. **`list`**: `SELECT ... FROM ursitoare.run r WHERE r.tenant_id = $1`, plus `(r.created_at, r.run_id) < ($3::timestamptz, $4::text)` when `$3` is not null, `r.flow_id = $5` when `$5` is not null, `r.state = $6` when `$6` is not null, and `AND (<filter.sql>)`, `ORDER BY r.created_at DESC, r.run_id DESC LIMIT $2`, with `run_id` compared and ordered `COLLATE "C"`. `$2` is `limit + 1`; `filter.values` start at `$7` (`RUN_LIST_FILTER_FIRST`). `next` is the cursor of the last returned row when another row exists. `filter.sql` comes from trusted code (U36's `listPredicate`).
8. **`upsert`**: validate, check the tenant, `put` input and output when not null, then an `INSERT ... SELECT` from `run` (which supplies `run_day`) with `ON CONFLICT` on the primary key `DO UPDATE` of every column except the key, `seq` and `started_at`. No row from the `SELECT` (absent run) and SQLSTATE `23505` on the `seq` index are `RUN_DATA_INVALID`. `list` orders by `seq`, `afterSeq` is exclusive, `next` is the last `seq` when another row exists, an absent run gives `{ steps: [], next: null }`.
9. **`referencedBy`**: true when the run exists in the tenant and `sha256` is its `input_ref`, `mocks_ref` or `output_ref`, or a step's `input_ref` or `output_ref`.
10. **`appendEvent`**: validate, check the tenant, `INSERT ... ON CONFLICT (tenant_id, event_id, time) DO NOTHING`; `data` follows Decisions 3 and 4.
11. **Tenant check.** Each repository function first reads `current_setting('app.tenant_id', true)` and throws `RUN_DATA_INVALID` when it differs from `ctx.tenantId`; queries also bind `ctx.tenantId`.
12. **No foreign key to a payload:** the architecture expires payloads before envelopes, so a `*_ref` is plain `text` and a reader treats a missing payload as expired. Nothing references `flow_version`.
13. **Stores.** `createRunStore(pool)` runs each method in its own `withTenantTx(pool, ctx, ...)` over the repositories. `createMemoryRunStore()` keeps `Map`s keyed by tenant and shares `validate.ts` and `canonical.ts`, so the codes agree.
14. **Validation** (`RUN_DATA_INVALID`; null only where the types say): ids `runId`, `lineageId`, `parentRunId`, event `runId` `^[A-Za-z0-9_-]{1,128}$`; `flowId` `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` (at most 64); `flowHash` `^sha256:[0-9a-f]{64}$`; `ownerTeam` `^[a-z][a-z0-9_-]{0,63}$`; `mode`, `trigger`, states as typed; `principal.userId` 1-128 characters; `actorChain` at most 32 entries of 1-128; `nodeId`, `terminalNode`, `RunError.node` `^[a-z][a-z0-9_]{0,127}$`; `RunError.code` `^[A-Za-z][A-Za-z0-9_.-]{0,63}$`, `message` at most 4,000 characters; `kind`, event `type` `^[a-z][a-z0-9_.]{0,63}$`; `outcome` 1-128; `effectSeq`, `turn`, `generation`, `seq` integers 0 to 2,147,483,647, `attempt` from 1; `taint` at most 32 labels of 1-64; ids and keys 1-256; `limit` 1 to 1000; `eventId`, `correlationId` `^[A-Za-z0-9_.:-]{1,128}$`.

## Interfaces

Same as proposal.md § Interfaces given.

```ts
export type { TenantContext, TenantTx, TenantPool } from "../tenancy/index.ts"; // type re-exports for interpreter/api
export type PayloadValue = null | boolean | number | string | PayloadValue[] | { [key: string]: PayloadValue };
export type RunMode = "live" | "mock" | "stub";
export type RunState = "queued" | "running" | "completed" | "failed" | "cancelled";
export type StepState = "started" | "completed" | "failed" | "skipped";
export interface RunError { code: string; message: string; node: string | null }
export interface RunPrincipalRecord { userId: string; kind: "human" | "service" }
export interface PayloadRef { sha256: string; size: number }
export interface StoredPayload { sha256: string; mediaType: string; size: number; data: PayloadValue; pinned: boolean }
export interface NewRun {
  runId: string; lineageId: string; parentRunId: string | null; flowId: string; flowHash: string; ownerTeam: string;
  mode: RunMode; trigger: "test"; principal: RunPrincipalRecord; actorChain: readonly string[];
  input: PayloadValue; mocks: PayloadValue | null;
}
export interface RunRecord {
  runId: string; lineageId: string; parentRunId: string | null; flowId: string; flowHash: string; ownerTeam: string;
  mode: RunMode; trigger: "test"; state: RunState; principal: RunPrincipalRecord; actorChain: string[];
  inputRef: string | null; mocksRef: string | null; outputRef: string | null; error: RunError | null;
  terminalNode: string | null; runDay: string; createdAt: string; startedAt: string | null; endedAt: string | null;
}
export interface RunTransition {
  state: RunState; from: readonly RunState[]; at: Date;
  output?: PayloadValue; error?: RunError; terminalNode?: string;
}
export interface RunCursor { createdAt: string; runId: string }
export interface RunListQuery {
  limit: number; after?: RunCursor; flowId?: string; state?: RunState; filter: { sql: string; values: unknown[] };
}
export interface StepWrite {
  runId: string; nodeId: string; effectSeq: number; turn: number; attempt: number; generation: number; seq: number;
  kind: string; state: StepState; input: PayloadValue | null; output: PayloadValue | null; outcome: string | null;
  error: RunError | null; taint: readonly string[]; policyDecisionId: string | null; idemKey: string | null;
  startedAt: Date; endedAt: Date | null;
}
export interface StepRecord {
  runId: string; nodeId: string; effectSeq: number; turn: number; attempt: number; generation: number; seq: number;
  kind: string; state: StepState; inputRef: string | null; outputRef: string | null; outcome: string | null;
  error: RunError | null; taint: string[]; policyDecisionId: string | null; idemKey: string | null;
  startedAt: string; endedAt: string | null;
}
export interface RunRepository {
  create(tx: TenantTx, ctx: TenantContext, run: NewRun, at: Date): Promise<RunRecord>;
  get(tx: TenantTx, ctx: TenantContext, runId: string): Promise<RunRecord | null>;
  list(tx: TenantTx, ctx: TenantContext, q: RunListQuery): Promise<{ runs: RunRecord[]; next: RunCursor | null }>;
  transition(tx: TenantTx, ctx: TenantContext, runId: string, change: RunTransition): Promise<RunRecord | null>;
}
export interface StepRepository {
  upsert(tx: TenantTx, ctx: TenantContext, step: StepWrite): Promise<StepRecord>;
  list(tx: TenantTx, ctx: TenantContext, runId: string, q: { limit: number; afterSeq?: number }):
    Promise<{ steps: StepRecord[]; next: number | null }>;
}
export interface EnvelopeStore {
  put(tx: TenantTx, ctx: TenantContext, value: PayloadValue): Promise<PayloadRef>;
  get(tx: TenantTx, ctx: TenantContext, sha256: string): Promise<StoredPayload | null>;
  referencedBy(tx: TenantTx, ctx: TenantContext, runId: string, sha256: string): Promise<boolean>;
}
export interface EventWrite {
  eventId: string; runId: string | null; correlationId: string | null; type: string; data: PayloadValue; time: Date;
}
export const runRepository: RunRepository;
export const stepRepository: StepRepository;
export const envelopeStore: EnvelopeStore;
export function appendEvent(tx: TenantTx, ctx: TenantContext, event: EventWrite): Promise<void>;
export function payloadDigest(value: PayloadValue): string;   // 64 lowercase hex, SHA-256 of canonical JSON
export const RUN_LIST_FILTER_FIRST = 7;   // first placeholder index of RunListQuery.filter.sql (U36: listPredicate(request, 7))
export interface RunStore {
  createRun(ctx: TenantContext, run: NewRun, at: Date): Promise<RunRecord>;
  getRun(ctx: TenantContext, runId: string): Promise<RunRecord | null>;
  transition(ctx: TenantContext, runId: string, change: RunTransition): Promise<RunRecord | null>;
  recordStep(ctx: TenantContext, step: StepWrite): Promise<StepRecord>;
  listSteps(ctx: TenantContext, runId: string, q: { limit: number; afterSeq?: number }):
    Promise<{ steps: StepRecord[]; next: number | null }>;
  getPayload(ctx: TenantContext, sha256: string): Promise<StoredPayload | null>;
}
export function createRunStore(pool: TenantPool): RunStore;    // each call in its own withTenantTx
export function createMemoryRunStore(): RunStore;               // same contract, no database
export type RunDataErrorCode = "RUN_DATA_INVALID" | "RUN_DATA_TOO_LARGE";
export class RunDataError extends Error { readonly code: RunDataErrorCode; constructor(code: RunDataErrorCode, message: string) }
```

## Data model

Migration `src/db/migrations/0310_run_data.sql`. Every table has `tenant_id text NOT NULL` first, forced RLS (`ENABLE` and `FORCE ROW LEVEL SECURITY`) and one policy `<table>_isolation` with `USING` and `WITH CHECK` of `tenant_id = current_setting('app.tenant_id', true)`. Columns are `text` unless noted; `run`'s names are fixed (U36's list filter uses them).

- `envelope_payload`: `sha256` (64 hex), `media_type` (default `application/json`), `size integer` (1 to 1048576), `data jsonb`, `pinned boolean` (default false); key `(tenant_id, sha256)`; `tenant_id` references `tenant`.
- `run`: `run_id`, `lineage_id`, `parent_run_id` (null), `flow_id`, `flow_hash`, `owner_team`, `mode` (`live`, `mock`, `stub`), `trigger` (`test`), `state` (the five states), `principal_user_id`, `principal_kind` (`human`, `service`), `actor_chain text[]` (default empty), `input_ref`, `mocks_ref`, `output_ref` (null or 64 hex), `error jsonb`, `terminal_node`, `run_day date`, `created_at`, `started_at`, `ended_at` (`timestamptz`, the last two null); key `(tenant_id, run_id)`; `tenant_id` references `tenant`; index `run_created_idx (tenant_id, created_at DESC, run_id COLLATE "C" DESC)`.
- `step_execution` (`PARTITION BY RANGE (run_day)`, comment `partition: day`, a DEFAULT partition `step_execution_default`): `run_day date`, `run_id`, `node_id`, `effect_seq`, `turn`, `attempt` (at least 1), `generation`, `seq` (all `integer`, none negative), `kind`, `state` (the four states), `input_ref`, `output_ref` (null or 64 hex), `outcome`, `error jsonb`, `taint text[]`, `policy_decision_id`, `idem_key`, `started_at`, `ended_at`; key `(tenant_id, run_day, run_id, node_id, effect_seq, turn, attempt, generation)`; foreign key `(tenant_id, run_id)` to `run`; `UNIQUE (tenant_id, run_day, run_id, seq)`.
- `event` (`PARTITION BY RANGE ("time")`, comment `partition: month`, DEFAULT partition `event_default`): `event_id`, `"time" timestamptz`, `run_id`, `correlation_id`, `type`, `data jsonb`; key `(tenant_id, event_id, "time")`.
- Grants to `ursitoare_app`: `SELECT, INSERT` on all four; `UPDATE (state, output_ref, error, terminal_node, started_at, ended_at)` on `run`; `UPDATE (kind, state, input_ref, output_ref, outcome, error, taint, policy_decision_id, idem_key, ended_at)` on `step_execution`.

## Failure cases

- Input outside Decision 14, not plain JSON, or a transaction of another tenant: `RUN_DATA_INVALID`; over 1,048,576 canonical bytes: `RUN_DATA_TOO_LARGE`; nothing is written.
- `create` of an existing id (also concurrently): the stored row, no new payload. `transition` of an absent run, outside `from`, or the loser of a race: `null`, nothing stored. `upsert` for an absent run or a repeated `seq`: `RUN_DATA_INVALID`. An event replay: ignored.
- A lost connection or other database error rejects as is and `withTenantTx` rolls back. An absent or foreign row gives `null`, an empty page or `false`.

## Security

1. No endpoint and no authentication here: callers decide first (U36 behind the PEP with `read_run` and `debug_run`). Nothing calls out.
2. All four tables are tenant-leading with forced RLS; every query runs in `withTenantTx` and binds the tenant; `envelope_payload` is keyed `(tenant_id, sha256)`, so no tenant can read or detect another's payload by digest (scenarios "Objects, isolation and privileges", "Two tenants never see each other's run data").
3. Inputs are checked at every function boundary (Decision 14). Payloads are untrusted data, stored as `jsonb`, never interpreted or logged; `taint` labels are stored as given. Only `filter.sql` is SQL text, from trusted code; all else is bound.
4. No secret is read, stored or logged; error messages are fixed texts, because payloads may hold customer data.
5. Abuse cases, each a scenario: another tenant's run or payload, U+0000 in a payload, 1 MiB + 1 byte, a cycle, another run's payload, rewriting or deleting history (`42501`), a replayed event.

## Test plan

Node tests beside the code, on `withTestDatabase()` and `seedTwoTenants(db)`, one `withTenantTx(db.appPool, ctx, ...)` per statement, refusals by `await assert.rejects(p, { code })`. Fixtures: `AT = new Date("2026-10-25T09:00:00.000Z")`; `NEW_RUN(runId, over?)` is `{ runId, lineageId: runId, parentRunId: null, flowId: "rf-1-core", flowHash: "sha256:" + "a".repeat(64), ownerTeam: "finance", mode: "mock", trigger: "test", principal: { userId: "u_alice", kind: "human" }, actorChain: ["u_alice"], input: { invoice: { id: "inv-1", total: 120 } }, mocks: null, ...over }`; `STEP(runId, nodeId, seq, over?)` is `{ runId, nodeId, effectSeq: 0, turn: 0, attempt: 1, generation: 0, seq, kind: "block", state: "started", input: null, output: null, outcome: null, error: null, taint: [], policyDecisionId: null, idemKey: null, startedAt: AT, endedAt: null, ...over }`. Tests import from `src/runs/index.ts`.

## Decisions made while writing

- **Column-level `UPDATE` grants**, not the card's plain `UPDATE`: no rewrite of a run's identity or a step's key, `seq` or `startedAt`.
- **`run_created_idx` descends on both keys** (the card has `run_id` ascending): a keyset cursor needs one direction.
- **`UNIQUE (tenant_id, run_day, run_id, seq)`** (not in the card) so the `afterSeq` cursor cannot skip a row. Only two keys sharing a `seq` reach it; U33 numbers `seq` in visit order, so replay repeats it.
- **Tenant mismatch is `RUN_DATA_INVALID`** (the seam fixes two codes); **`appendEvent` ignores an exact replay**, so a recovered step may re-append its event.
- **`src/db/prepare.test.ts::C-58e0ebf0 ...` changes** in task 1.1 (not in the card): with clock `2026-10-15T12:00:00Z` its `partitions` list gains five `event` and 153 `step_execution` names. The new tables add about 160 partitions to each migrated template database.
