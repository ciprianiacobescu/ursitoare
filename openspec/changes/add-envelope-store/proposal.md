## Why

The interpreter (U33), the effect journal (U34), the runs API (U36) and the test-run endpoint (U35) need one tenant-isolated place for what a run did, and one contract the CLI's in-memory runs and the engine's database runs share. The repository has neither. Batch `m4-runs-timeline` (U30-U37 and U35b; closing unit `add-web-run-timeline`, journey `e2e/test_m4_runs.py`) delivers M4: an author test-runs a validated flow with mocked tools and follows each step on the run timeline; runs survive a kill. This unit's part: every run, step, payload and event is stored per tenant under row-level security.

Observable result: migration `0310_run_data.sql` creates `run`, `step_execution` (daily partitions), `envelope_payload` and `event` (monthly partitions), tenant-leading with forced row-level security. `createRunStore(pool)` and `createMemoryRunStore()` give the same results for the same `RunStore` calls: a run created twice answers the first row; a transition applies only from the states it lists; a step recorded again after recovery updates its one row; a payload is stored once per tenant under the SHA-256 of its canonical JSON, readable only by that tenant; a value that is not plain JSON, or over 1 MiB, is refused with a stable code. `runRepository.list` pages runs newest first with the placeholders U36's list filter expects.

## What Changes

- `src/db/migrations/0310_run_data.sql`: the four tables, DEFAULT partitions, forced RLS, narrow grants.
- `src/runs/store/`: the code of § Interfaces given, with tests beside each file; and one existing test, changed in place (below).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded: the migration and the change to the existing test. No new dependency (`node:crypto` only).
- **Depends on**: `add-tenancy-foundation` (U03): `withTenantTx`, the tenant types, the table `ursitoare.tenant`, `checkTenancyCatalog`, `seedTwoTenants`. `add-db-foundation` (U02), added to the roadmap row (U03): the migration runner, `ensurePartitions` and the comments it reads, `withTestDatabase`. `src/runs` imports only `src/tenancy` and `node:crypto`; `test/arch/modules.ts` needs no change.
- **Changed:** the frozen test `src/db/prepare.test.ts::C-58e0ebf0 prepareDatabase migrates first and then creates the partition window`: its `first.partitions` also lists five `event` and 153 `step_execution` names. The archived `database` scenario "prepareDatabase migrates then partitions" still says `[]`.
- **Migrations:** `0310_run_data.sql`; **tables** `ursitoare.run`, `ursitoare.step_execution`, `ursitoare.envelope_payload`, `ursitoare.event`, none on U03's global allowlist. No endpoint, API error code, e2e part or web feature; `RUN_DATA_INVALID` and `RUN_DATA_TOO_LARGE` are module codes.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

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

**Interfaces taken:**

- From `add-tenancy-foundation`: `TenantContext`, `TenantPool`, `TenantTx`, `withTenantTx`, `checkTenancyCatalog` (`src/tenancy`); `seedTwoTenants` (`test/support/tenants.ts`); the table `ursitoare.tenant`.
- From `add-db-foundation`: `ensurePartitions`, `prepareDatabase`, `DEFAULT_MIGRATIONS_DIR` (`src/db`); `withTestDatabase`, `TestDatabase` (`test/support/pg.ts`).

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e06fdb3, checked line by line).

## Out of scope

The interpreter (U33), the DBOS runtime (U30), `effect_intent` and idempotency keys (U34), HTTP routes, policies and views (U35-U37), `llm_call`, `human_task`, a retention job that drops partitions or expires payloads, a writer of `pinned`, reading events back, and a `list` on `RunStore`.
