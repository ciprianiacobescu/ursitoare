## Why

Batch `m4-runs-timeline` (U30-U37 and U35b; closing unit `add-web-run-timeline`, journey `e2e/test_m4_runs.py`) delivers M4: an author test-runs a validated flow with mocked tools and follows each step on the run timeline; runs survive a kill. This unit's part: the durable runtime that runs and recovers each run, and the stack that resets it safely.

Every run is a DBOS workflow. U31-U37 need one module that owns DBOS: it starts on the same Postgres under the app role, queues work on `runs`, and survives the e2e stack's database reset, which silently kills a DBOS queue (spike `ursitoare-spikes/dbos-reset`, decision D3).

Observable result: with the `dbos` schema prepared by the owner, `main` launches the runtime as `ursitoare_app` (never as owner, never migrating); a workflow enqueued under one id runs once; steps report to an observer; `/health` still answers `{ db: "ok" }`. Without the schema the engine writes one fatal line `DURABLE_UNAVAILABLE` and exits 1. The e2e stack shuts the runtime down before each reset and relaunches it after, and a reset answers 204 only when a workflow queued on `runs` has succeeded. A guard fails the build if anything but `src/durable` imports DBOS.

## What Changes

- `src/durable/` and the call in `src/main.ts` (the scaffold already pins `@dbos-inc/dbos-sdk` `5.3.0` in `package.json`).
- `test/support/global-setup.ts` prepares the test template; `test/support/e2e-stack/{part,reset}.ts` gain `beforeReset`; new `durable-part.ts` and `parts/40-durable.ts`; a bullet in `docs/testing.md`; the rule `test/arch/dbos-access.ts`.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. The scaffold installs `@dbos-inc/dbos-sdk` `5.3.0` (MIT; no install script, so the workspace configuration needs no change); implementers do not touch lockfiles. Not scaffolded, because they change existing files: `beforeReset` in `part.ts` and `reset.ts`, the call in `src/main.ts`, `global-setup.ts`, `docs/testing.md`, and `parts/40-durable.ts` (discovered at once).
- **Depends on:** `add-db-foundation` (U02), `add-tenancy-foundation` (U03), `add-supply-chain-gate` (U04: the new dependency passes its licence policy), `add-e2e-stack` (U06), as the roadmap says; beyond the row `add-engine-skeleton` (U01: `src/main.ts` and `MainDeps`, `Logger`, `AppConfig.database.app`) and `add-architecture-fitness` (U05: `Snapshot`, `collectImports` for the rule). `test/arch/modules.ts` needs no change (`durable` may import `core`, `config`, `db`, `observability`).
- **Changed:** `src/main.ts`, `test/support/global-setup.ts`, `test/support/e2e-stack/{part,reset}.ts`, `docs/testing.md`. No archived scenario is modified: the frozen tests that touch these files (`C-fb007fe9`, `C-f55456d0`, `C-20bba381`, `C-ea25f674`, `C-6d93e8d5`) stay true, because the launch is skipped when `config.database.app` is null, `/health` is unchanged (D2), `beforeReset` is optional and the template only gains a schema (`C-fb007fe9` and `C-6370f2de` set it and launch on a clone that carries `dbos`). U36 and U35 edit `src/main.ts` after this change.
- **Migrations:** none (DBOS's SQL contains `CREATE INDEX CONCURRENTLY`, which the transaction of `src/db/migrate.ts` cannot run; D1 makes `prepareDurable` the second owner-run step). **Tables:** none of ours; DBOS creates `dbos.*`. **Endpoints, env vars, audit events:** none. **Error codes:** `DURABLE_*` are library codes; `STACK_DURABLE_NOT_READY` is a stack code; neither is in `ERROR_CODES`.
- **Seam deviations from the card** (forced by D3; nothing renamed): (1) new exports `suspendDurable` and `resumeDurable`, because the stack must stop and restart the runtime `main` launched (handles stay valid across them); (2) the member `E2eStackPart.beforeReset`, the stack hook around the reset; (3) `checkDurableReady`, `ReadyOptions`, `DURABLE_READY_WORKFLOW` and the stack code `STACK_DURABLE_NOT_READY`, the readiness check; (4) the optional, test-only `LaunchOptions.closePool` (default `pool.end()`), the seam that lets a test make closing fail; (5) `enqueue` does not re-ensure the queue row (DBOS 5.3.0 rejects that on a running runtime); the queue is registered after every launch instead.

**Interfaces given** (declarations omit `export`; the block of `design.md` § Interfaces)

```ts
// src/durable/index.ts
type DurableJson = null | boolean | number | string | DurableJson[] | { [key: string]: DurableJson }
const APPLICATION_VERSION = "ursitoare-1"
const DBOS_SCHEMA = "dbos"
const RUNS_QUEUE = "runs"
type DurableErrorCode = "DURABLE_UNAVAILABLE" | "DURABLE_INVALID" | "DURABLE_NOT_LAUNCHED" | "DURABLE_ALREADY_LAUNCHED" | "DURABLE_WORKFLOW_UNKNOWN"
class DurableError extends Error { readonly code: DurableErrorCode; readonly details: Readonly<Record<string, string>>; constructor(code: DurableErrorCode, message: string, details?: Record<string, string>) }
type StepPhase = "before" | "after"
type StepObserver = (phase: StepPhase, step: string, workflowId: string) => void
interface StepOptions { retries?: number; retryable?: (error: unknown) => boolean }
type WorkflowState = "ENQUEUED" | "PENDING" | "SUCCESS" | "ERROR" | "CANCELLED" | "MAX_RECOVERY_ATTEMPTS_EXCEEDED" | "DELAYED"
interface WorkflowInfo { workflowId: string; workflow: string; state: WorkflowState }
interface DurableRuntime { readonly applicationVersion: string; enqueue(workflow: string, workflowId: string, input: DurableJson): Promise<void>; status(workflowId: string): Promise<WorkflowInfo | null>; cancel(workflowId: string): Promise<void>; shutdown(): Promise<void> }
interface LaunchOptions { endpoint: EndpointLike; logger: Logger; pollingIntervalMs?: number; concurrency?: number; stepObserver?: StepObserver; closePool?: (pool: pg.Pool) => Promise<void> }   // closePool: test only, default pool.end() (D3 addition)
function registerWorkflow<I extends DurableJson, O extends DurableJson>(name: string, fn: (input: I) => Promise<O>): void
function runStep<T extends DurableJson>(name: string, fn: () => Promise<T>, opts?: StepOptions): Promise<T>
function durableSleep(ms: number): Promise<void>
function currentWorkflowId(): string
function launchDurable(opts: LaunchOptions): Promise<DurableRuntime>
function prepareDurable(ownerUrl: string): Promise<void>
function suspendDurable(): Promise<DurableRuntime | null>   // D3
function resumeDurable(): Promise<DurableRuntime | null>    // D3
// src/main.ts: MainDeps gains launchDurable?: typeof launchDurable
// test/support/e2e-stack/part.ts: E2eStackPart gains beforeReset?(ctx: PartContext): Promise<void>   // D3
// test/support/e2e-stack/durable-part.ts (parts/40-durable.ts is its one-line re-export)
const durablePart: E2eStackPart   // name "durable", env {}
const DURABLE_READY_WORKFLOW = "stack.ready"   // D3
interface ReadyOptions { timeoutMs?: number; pollMs?: number; now?: () => number; sleep?: (ms: number) => Promise<void>; workflowId?: string }   // D3
function checkDurableReady(runtime: DurableRuntime, opts?: ReadyOptions): Promise<void>   // D3; rejects E2eStackError STACK_DURABLE_NOT_READY
// test/arch/dbos-access.ts
function checkDbosAccess(s: Snapshot): Violation[]   // code ARCH_DBOS_ACCESS
```

**Interfaces taken:**

- from `add-db-foundation` (U02): `createPool`, `EndpointLike`, `PoolOptions`, `ROLE_APP`, `ROLE_OWNER`, `withTestDatabase`, `TestDatabase`, `freePort`, `globalSetup`.
- from `add-engine-skeleton` (U01): `Logger`, `createLogger`, `AppConfig`, `main`, `MainDeps`.
- from `add-tenancy-foundation` (U03): `TenantContext`, `withTenantTx`, `seedTwoTenants`.
- from `add-e2e-stack` (U06): `E2eStackPart`, `PartContext`, `PartHandle`, `E2eStackError`, `createPartRegistry`, `createResetRunner`, `databaseApi`, `E2E_TEMPLATE`, `startE2eStack`, `discoverParts`.
- from `add-architecture-fitness` (U05): `Snapshot`, `Violation`, `collectImports`, `snapshotOf`, `readSnapshot`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e06fdb3, checked line by line).

## Out of scope

Run tables (U31); the crash harness and fault points (U32; `stepObserver` is its hook); the interpreter and `registerRunWorkflow` (U33); effect intents (U34); run routes (U36); a `durable` health check (D2, M8); automatic retries beyond the caller's `retries` (D18); a DBOS client for the `api` role; the deployment job that runs `prepareDurable` (M8).
