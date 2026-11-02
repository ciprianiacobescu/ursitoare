## Context

Runs are DBOS workflows on the `runs` queue (ADR-05). Rulings: D1 the owner prepares the `dbos` schema, the engine connects as `ursitoare_app` with `runMigrations: false`; D2 no `durable` health check; D18 no automatic step retries; D3 (spike `ursitoare-spikes/dbos-reset`) a database reset deletes the `dbos.queues` and `dbos.application_versions` rows and the queue then never dispatches, so the stack shuts the runtime down before a reset and relaunches it after. DBOS is a process-wide singleton; the e2e stack runs the engine in its own process.

## Decisions

1. **One runtime per process, three states:** `idle` (never launched, or after `shutdown()`), `running`, `suspended` (shut down, options kept). `DurableRuntime` handles are views on that state. `suspendDurable()` shuts DBOS down, ends the pool and resolves the handle of a running or suspended runtime (else `null`); `resumeDurable()` relaunches a suspended runtime with the kept options and resolves the same handle (else `null`); `handle.shutdown()` ends everything and forgets the options. `main` keeps one handle for the routes while the stack suspends and resumes underneath.
2. **`launchDurable` order:** options (`pollingIntervalMs` integer 10..60000, default 50; `concurrency` integer 1..64, default 4; else `bad_option` plus `option`); state (`running` refuses); `endpoint.url` (scheme `postgres` or `postgresql`, a database name, no password: `bad_endpoint`, `password_in_url`); `createPool(endpoint, { max: 10, applicationName: "ursitoare-durable", onError })` (a throw: `config_failed`; `onError` logs `{ component: "dbos", code }` at warn); `to_regclass('"dbos"."dbos_migrations"')` through the pool (null: `not_prepared`; a query error: `launch_failed`); `DBOS.setConfig` with `name` `ursitoare`, `systemDatabaseUrl: endpoint.url`, `systemDatabasePool`, `systemDatabaseSchemaName: DBOS_SCHEMA`, `runMigrations: false`, `enableOTLP: false`, `applicationVersion` and the logger adapter; a `DBOS.setConfig` throw is `config_failed`; `DBOS.launch()` (a rejection: `launch_failed`); `DBOS.registerQueue(RUNS_QUEUE, { minPollingIntervalMs, workerConcurrency })` (a rejection: `queue_failed`, after `DBOS.shutdown()`). Every failure after `bad_endpoint` and `password_in_url` is `DURABLE_UNAVAILABLE` with one of these fixed reasons, never a driver or DBOS value; the driver `code` is logged at warn. The state flips to `running` before the first `await`, so a concurrent launch is refused. Any failure after the pool exists ends it. DBOS and `pg` error text is never copied: it can hold a URL.
3. **The pool is ours.** DBOS 5.3.0 does not end a given `systemDatabasePool`, so `shutdown()` and `suspendDurable()` call `DBOS.shutdown()` then `pool.end()`; a failure of either is logged at warn (`{ component: "dbos", code }`) and the call still resolves, and concurrent calls share one shutdown. The LISTEN client comes from that pool, so no password reaches DBOS. The DBOS logger adapter maps `info`, `debug`, `warn` and `error` to `opts.logger` with `{ component: "dbos" }` and `String(entry)`.
4. **`prepareDurable(ownerUrl)`** checks the URL (`bad_url`), runs `DBOS.migrate(ownerUrl, { schemaName: DBOS_SCHEMA, applicationRole: ROLE_APP })` and maps a failure to `DURABLE_UNAVAILABLE` with `reason` the error's SQLSTATE or `migrate_failed`; messages are fixed (`invalid owner URL`, `the DBOS schema could not be prepared`). DBOS's SQL has `CREATE INDEX CONCURRENTLY`, so it cannot be a migration file (`src/db/migrate.ts` wraps each file in a transaction): it is a second owner-run step next to `prepareDatabase`.
5. **The queue is registered after every launch**, in production too. `enqueue` does not re-ensure it: DBOS 5.3.0 rejects `registerQueue` on a running runtime that lost its version row, so a reset goes through suspend and resume. This replaces the card's "enqueue re-ensures the queue row".
6. **Workflows and steps.** `registerWorkflow` keeps a `Map<name, fn>` and calls `DBOS.registerWorkflow(fn, { name })` once per name; it is refused while `running`. `enqueue` checks state, the registry, the id (`^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$`) and the input (JSON only: finite numbers, plain objects and arrays, depth at most 64), then calls `DBOS.enqueueWorkflowWithOptions` with `queueName` `runs`, `appVersion` and `return-existing`; `status` and `cancel` call `DBOS.getWorkflowStatus` and `DBOS.cancelWorkflow`, which cancels a queued workflow and marks a running (`PENDING`) one `CANCELLED`; that one stops with an error at its next `runStep`, before the step's function and observer run. `runStep` rejects a name outside `^[^\u0000-\u001f\u007f]{1,200}$` as `bad_step_name` (it admits `run:load`, `pay`, `pay#done`, `run:finish`) and, outside a workflow (`DBOS.isWithinWorkflow()` false), `outside_workflow`; inside, it makes one `DBOS.runStep` whose callback runs `observer("before")`, then `fn` up to `retries + 1` times (`retries` integer 0..10, default 0; the loop stops when `retryable` returns false), checks the result is JSON (`bad_step_result`), runs `observer("after")` and returns. One DBOS step holds all attempts; a replayed step calls no observer; an observer that throws fails the step. `durableSleep(ms)` (integer 0..86,400,000, else `bad_option`) is `DBOS.sleep`; `currentWorkflowId()` is `DBOS.workflowID`.
7. **`main`:** after the route registration block and before `closeAll` is defined, when `database !== null && config.database.app !== null && (config.role === "all" || config.role === "worker")`, it awaits `(deps.launchDurable ?? launchDurable)({ endpoint: config.database.app, logger })`. A rejection closes the internal server, the server and the database, writes `bootstrap.fatal(fatalFields(error), fatalMessage(error))` (one line `{ code: "DURABLE_UNAVAILABLE", msg: "startup failed", reason }`), calls `exit(1)` and resolves `null`. `closeAll` closes the server, the internal server, `durable?.shutdown()`, then the database. Frozen tests stub `openDatabase` with `database.app` null, hence the `config.database.app` test.
8. **Stack.** `E2eStackPart` gains optional `beforeReset(ctx)`. `reset()` runs `faults.clear()`, every `beforeReset` in reverse part order (a failure is `STACK_RESET_FAILED`, `Reset hook failed for part: <name>`, `details.part`), the seeds, then the engine probe; `validatePart` refuses a `beforeReset` that is not a function. `durablePart`: `start` registers `stack.ready` (one step `ping` echoing its input), through one module-level function, so a second stack boot in one process is a no-op, never `name_taken`, and runs `prepareDurable` on `ursitoare_e2e_template` (the `ownerUrl` of `databaseApi(ctx.handles)` with the path replaced); `beforeReset` is `suspendDurable()`; `seed` is `resumeDurable()` then `checkDurableReady` (a `null` resume, as in the first `seedAll`, does nothing); `close` is `(await suspendDurable())?.shutdown()`. Parts close in reverse order after the engine, so DBOS is down before Postgres stops. `checkDurableReady` enqueues `stack.ready` with input `"ping"` (id `opts.workflowId`, default `ready-<randomUUID>`), polls `status` every `pollMs` (default 20), treats `null` as state `missing`, and takes the clock and sleep as options (the real DBOS has no injected clock). A failed hook leaves the runtime suspended; the next reset resumes it. No check runs at stack start: the first reset of every journey does it.
9. **Guard.** `checkDbosAccess` flags, in non-test `src` files, an `ImportRef.specifier` (from `collectImports`) equal to or under `@dbos-inc/dbos-sdk` outside `src/durable/`, and outside `src/durable/` and `src/runs/` a string or template part matching `/(?<![A-Za-z0-9_])"?dbos"?\.(?=[A-Za-z_"])/` or an identifier `DBOS_SCHEMA`.

## Interfaces

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
interface LaunchOptions { endpoint: EndpointLike; logger: Logger; pollingIntervalMs?: number; concurrency?: number; stepObserver?: StepObserver }
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

The spec uses every name; behaviour per name is in the Decisions and the spec.

## Failure cases

`details.reason` is a value named in the Decisions or the spec, or (prepare only) a SQLSTATE; Postgres down at launch is `DURABLE_UNAVAILABLE` `launch_failed`. A failing `resumeDurable()` rethrows and the state stays `suspended`. A workflow that throws ends `ERROR`.

## Security

1. No endpoint, no PEP action: the module adds no route (U36 owns run routes).
2. No table, no migration. `dbos.*` has no tenant column and no RLS, `DBOS.migrate` grants the app role all privileges on it, and it keeps each workflow's input and step values; so only `src/durable` and `src/runs` may name it (the guard), and a workflow id must be unique across tenants (U33 takes it from `IdSource`); U31's `run` rows (RLS) decide who sees a run. Steps read tenant data through `withTenantTx`, proved with two tenants.
3. Names, ids, options and JSON are validated before DBOS sees them; the interpreter (U33) labels payloads.
4. The app password reaches only `pg`: never a URL string, log field or error; a URL with a password is refused; error text is not copied. Only `prepareDurable` callers (tests, the stack, later the owner job) read the owner URL.
5. Abuse: an app role cannot create `dbos` objects (`42501`, "Prepare, repeat, refuse"); a stray DBOS import or `dbos.` SQL fails the guard; a reset cannot leave a dead queue ("Launch, lose the rows, launch again", the stack scenario).

## Test plan

- RLS fixture (`rls.test.ts`): `t.read` takes the DurableJson input `{ tenantId, userId }` (`tenantId` null for the no-tenant run), runs `withTenantTx(db.appPool, { tenantId, reviewProfile: "solo" }, ...)` (a plain `db.appPool.query` for null) inside one `runStep`, and writes `{ ids, user }` into a module `Map` keyed by workflow id; the test reads the map after `status` reaches `SUCCESS`.
- Database tests use `withTestDatabase()` (the template is prepared), or `{ migrated: false }` plus `prepareDurable(db.ownerUrl)`. Workflow functions are module-level (the registry is process-global) and keep state in module variables. Waits use a local `waitForState(rt, id, states, 20000)` polling `rt.status` every 20 ms; session counts poll `pg_stat_activity` as owner for up to 5 s. No bare `setTimeout`.

## Decisions made while writing

- `suspendDurable` and `resumeDurable` with stable handles: the stack restarts the runtime `main` launched without a second handle; `suspendDurable` returns it so the part can finish a suspended runtime in `close`.
