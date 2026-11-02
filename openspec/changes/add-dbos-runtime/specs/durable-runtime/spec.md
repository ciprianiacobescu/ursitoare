## Purpose

The engine's durable runtime: DBOS 5.3.0 on the same Postgres under the app role, the `runs` queue, the owner-run schema step, workflow and step primitives, boot wiring, a guard on DBOS access, and the e2e stack hooks that survive a database reset.

## ADDED Requirements

### Requirement: The owner prepares the DBOS schema and the engine never does
`prepareDurable(ownerUrl)` SHALL create or update the schema `dbos` through `DBOS.migrate` for the application role `ursitoare_app`, repeat as a no-op and refuse an unusable URL or role; the test template SHALL carry the schema.

#### Scenario: Prepare, repeat, refuse
- **WHEN** `prepareDurable(db.ownerUrl)` runs twice on `withTestDatabase({ migrated: false })`; then `prepareDurable("not a url")`, `prepareDurable(other.appUrl)` on a second such database and an owner URL on a closed port run; and `withTestDatabase()` clones
- **THEN** after the first call schema `dbos` exists, owned by `ursitoare_owner`, `ursitoare_app` has USAGE and not CREATE on it, and `CREATE TABLE dbos.x (i int)` as `ursitoare_app` rejects `42501`; the second call resolves and `dbos.dbos_migrations` (`count(*)`, `max(version)`) is unchanged; the refusals reject with `code` and `details.reason` `DURABLE_INVALID` `bad_url`, `DURABLE_UNAVAILABLE` `42501` and `DURABLE_UNAVAILABLE` `migrate_failed`, no message containing `postgres://`; the default clone has `dbos.dbos_migrations`

### Requirement: The engine connects DBOS as the app role and never migrates
`launchDurable(opts)` SHALL start DBOS with `name` `ursitoare`, `applicationVersion` `APPLICATION_VERSION`, `runMigrations` false and a pool from `createPool(opts.endpoint)` named `ursitoare-durable`, so every DBOS session uses `ursitoare_app` and no password enters a URL, and send DBOS log lines to `opts.logger`.

#### Scenario: A prepared database
- **WHEN** `launchDurable({ endpoint: db.appEndpoint, logger })` runs on a prepared clone, with `logger` from `createLogger({ level: "debug", destination })`; then `pg_stat_activity` and `dbos.application_versions` are read as owner
- **THEN** the runtime's `applicationVersion` is `"ursitoare-1"`; the sessions named `ursitoare-durable` on that database (at least one) all have `usename` `ursitoare_app`; `dbos.application_versions` holds `version_name` `ursitoare-1`; a captured line has `component` `dbos`; none contains the password

### Requirement: The runs queue is registered after every launch
`launchDurable` SHALL call `DBOS.registerQueue("runs", { minPollingIntervalMs, workerConcurrency })` after every `DBOS.launch`, from `pollingIntervalMs` (default 50) and `concurrency` (default 4); `suspendDurable` and `resumeDurable` SHALL stop and relaunch the same runtime through that path, and `shutdown` SHALL end the DBOS pool and resolve even when DBOS or the pool fails to close (the failure is logged).

#### Scenario: Launch, lose the rows, launch again
- **WHEN** a runtime `rt` is launched with `pollingIntervalMs` 20 and `concurrency` 3 on a prepared clone and `dbos.queues` is read; `suspendDurable()` runs; the owner runs `DELETE FROM dbos.queues` and `DELETE FROM dbos.application_versions`; `resumeDurable()` runs twice; `rt.enqueue("t.echo", "after-reset", "hi")` (`t.echo` returns its input) runs and `rt.status` is polled to a terminal state within 20 s; then `rt.shutdown()` runs twice at once (`Promise.all`), `launchDurable` runs again with no options and `resumeDurable()` runs once more
- **THEN** the first read has one row `name` `runs`, `worker_concurrency` 3 and `polling_interval_sec` within 1e-9 of 0.02; `suspendDurable()` resolves `rt`, after which `rt.status("x")` rejects `DURABLE_NOT_LAUNCHED`; the first `resumeDurable()` resolves `rt` and the second `null`; the row is back with the same values and `after-reset` reaches `SUCCESS`; after the second launch the row holds 4 and 0.05 and the last `resumeDurable()` resolves `null`; both `shutdown()` calls resolve and within 5 s no `ursitoare-durable` session remains

### Requirement: A launch that cannot succeed fails with a stable code and leaves nothing behind
`launchDurable` SHALL reject an option out of range, a password in `endpoint.url`, a second launch while one runs and a database without the `dbos` schema with a `DurableError` (stable `code`, `details.reason`); any other launch failure SHALL be `DURABLE_UNAVAILABLE` with `details.reason` `config_failed`, `launch_failed` or `queue_failed`; a failed launch SHALL create no database object and end its pool.

#### Scenario: Refusals
- **WHEN** `launchDurable` runs on `withTestDatabase({ migrated: false })` (no `dbos`), then with `concurrency` 0, with `pollingIntervalMs` 5, and with endpoints whose `url` is `postgres://ursitoare_app:pw@127.0.0.1:1/x`, `postgres://ursitoare_app@127.0.0.1:1/x?foo=1` and `postgres://ursitoare_app@127.0.0.1:1/x`; and after `prepareDurable` on the first database it runs with a `dbos.queues` row `runs` of `application_name` `other-app` inserted by the owner, again after deleting that row, and once more while that runtime runs
- **THEN** the first rejects `DURABLE_UNAVAILABLE` `not_prepared` (code, `details.reason`) and the owner still sees `to_regnamespace('dbos')` null; the next two reject `DURABLE_INVALID` `bad_option` with `details.option` `concurrency` and `pollingIntervalMs`; then `DURABLE_INVALID` `password_in_url`, `DURABLE_UNAVAILABLE` `config_failed`, `DURABLE_UNAVAILABLE` `launch_failed` (connection refused) and `DURABLE_UNAVAILABLE` `queue_failed`; after the first, sixth and seventh refusals no `ursitoare-durable` session remains within 5 s; the next launch resolves; the last rejects `DURABLE_ALREADY_LAUNCHED` and the resolved runtime still answers `status("none")` with `null`

### Requirement: Workflows are registered before launch under a checked name
`registerWorkflow(name, fn)` SHALL accept a name matching `^[a-z][a-z0-9_.-]{0,63}$` while no runtime runs, treat the same name with the same function as a no-op, and refuse another function under a known name; `enqueue` SHALL refuse a name never registered.

#### Scenario: Registration rules
- **WHEN** `registerWorkflow("t.count", f)` runs twice, then with `g`, then `("Bad Name", f)` and `("a".repeat(65), f)`; and after `launchDurable` resolves, `registerWorkflow("t.late", f)` and `rt.enqueue("t.unknown", "w-u", null)` run
- **THEN** the first two return `undefined`; the third throws `DURABLE_INVALID` `name_taken` and the next two `bad_name` (code, then `details.reason`); `t.late` throws `DURABLE_ALREADY_LAUNCHED`; the enqueue rejects `DURABLE_WORKFLOW_UNKNOWN` and `dbos.workflow_status` has no row `w-u`

### Requirement: A workflow id runs once, and status and cancel report it
`enqueue` SHALL put the workflow on `runs` with `appVersion` `APPLICATION_VERSION` and `workflowIDReusePolicy` `return-existing`, so one id runs once whatever the second input; `status` SHALL map the DBOS state or give `null`; `cancel` SHALL cancel a queued workflow, mark a running (`PENDING`) one `CANCELLED` so that it stops at its next step boundary, and ignore an unknown id.

#### Scenario: Once per id, status, cancel
- **WHEN** a runtime is launched with `concurrency` 1; `t.gate` (waits for a test promise) is enqueued as `w-gate` and awaited to `PENDING`; `t.count` (adds 1 to a counter) is enqueued as `w-1` with input 1; `status("w-1")` is read; `cancel("w-1")`, `cancel("never")` and `status("never")` run; the gate opens; `t.count` is enqueued as `w-2` with input 2 and again with input 3; `t.park` (step `one`, waits for a promise, step `two`) is enqueued as `w-park` and awaited to `PENDING` with `one` done, `cancel("w-park")` runs and the promise opens; `enqueue("t.count", "bad id!", null)` and `enqueue("t.count", "w-3", undefined)` run
- **THEN** `status("w-gate")` is `{ workflowId: "w-gate", workflow: "t.gate", state: "PENDING" }`, `status("w-1")` is `ENQUEUED` and after the cancel `CANCELLED`; `cancel("never")` resolves and `status("never")` is `null`; `w-gate` and `w-2` reach `SUCCESS` within 20 s; the counter is 1 and `dbos.workflow_status` holds one `w-2` row with `application_version` `ursitoare-1` and `queue_name` `runs`; `w-park` is `CANCELLED` after the cancel and after the promise opened, and `two` never ran; the last two reject `DURABLE_INVALID` with `details.reason` `bad_workflow_id` and `bad_input`

### Requirement: Steps are observed, retried only on request, and need a workflow
`runStep(name, fn, opts)` SHALL take a name of 1 to 200 characters without control characters, call the launch's `stepObserver` with `before` ahead of `fn` and `after` once `fn` resolved a `DurableJson`, retry `fn` at most `opts.retries` times (default 0) while `opts.retryable` allows, and, like `durableSleep` and `currentWorkflowId`, be refused outside a workflow.

#### Scenario: Steps and durable calls
- **WHEN** a runtime is launched with a recording `stepObserver`; `t.steps` runs steps `a` then `b`, `currentWorkflowId()` and `durableSleep(1000)` timed with `Date.now()`; `t.retry` runs `runStep("flaky", f, { retries: 2 })` where `f` fails twice then returns 7; `t.once` runs `runStep("always", g, { retries: 3, retryable: () => false })` where `g` always throws `e1`; `t.names` runs steps named `run:load`, `pay`, `pay#done` and `run:finish`; `t.bad` runs, each caught by the workflow, `runStep("bad", async () => undefined as never)`, `runStep("x", f, { retries: -1 })`, `durableSleep(1.5)` and `runStep` named `""`, `"a\nb"` and `"x".repeat(201)`; and `runStep`, `durableSleep(1)` and `currentWorkflowId()` run outside any workflow
- **THEN** the observer calls for `t.steps` are exactly `[["before","a",id],["after","a",id],["before","b",id],["after","b",id]]` with `id` the enqueue id, `currentWorkflowId()` is `id`, the sleep took 900 to under 5000 ms; `flaky` ran 3 times, returned 7, with one `before` and one `after`; `always` ran once and the workflow caught `e1` itself (`===`); `bad` is `DURABLE_INVALID` `bad_step_result` with no `after`; the three bad names are `bad_step_name`; the other two `bad_option`; the four `t.names` steps ran, recorded by the observer in order; outside a workflow the three reject or throw `DURABLE_NOT_LAUNCHED` `outside_workflow`

### Requirement: Row-level security holds inside durable steps
A step that opens `withTenantTx` SHALL see only that tenant's rows, and one that sets no tenant none.

#### Scenario: Two tenants in steps
- **WHEN** `seedTwoTenants(db)` runs, the owner creates `ursitoare.rls_probe (tenant_id text)` with forced RLS, the policy `tenant_id = current_setting('app.tenant_id', true)`, rows `tenant_a`, `tenant_b` and `SELECT` for the app role, a runtime is launched on `db.appEndpoint`, and `t.read` (input `{ tenantId, userId }`; one `runStep` runs `withTenantTx(db.appPool, { tenantId, reviewProfile: "solo" }, ...)`, or a plain `db.appPool.query` when `tenantId` is null, and the workflow stores `{ ids, user }` (the probe's `tenant_id` values and `current_user`) in a module `Map` keyed by workflow id) is enqueued as `r-a`, `r-b` and `r-none` with `tenantId` `tenant_a`, `tenant_b` and null and `userId` `u1`, each awaited to `SUCCESS`
- **THEN** the map entries `r-a`, `r-b` and `r-none` have `ids` `["tenant_a"]`, `["tenant_b"]` and `[]`, and every `user` is `ursitoare_app`

### Requirement: main launches the runtime after the routes and closes it before the database
`main` SHALL call `launchDurable` once, after the route block and before the listener binds, only when `config.database.app` is not null and `config.role` is `all` or `worker`, close the runtime before the database on every exit path, and leave `/health` `checks` as `{ db: "ok" }`.

#### Scenario: When it launches and the close order
- **WHEN** `main` runs with a fake `openDatabase` (a `Database` whose `close` records `database.close`) and a fake `deps.launchDurable` that records its argument and returns a runtime whose `shutdown` records `durable.shutdown`, for the roles `all`, `worker`, `api`, `sandbox` with `database.app` an endpoint `E`, and for `all` with `database.app` null; then the first server gets `SIGTERM`
- **THEN** the fake is called once each for `all` and `worker`, with exactly `{ endpoint: E, logger }` (`endpoint === E`, `logger.info` a function, no `stepObserver`), and never for `api`, `sandbox` or the null endpoint; after `SIGTERM` the records are `["durable.shutdown", "database.close"]` and `exit` got `0`

#### Scenario: A failed launch and the unchanged health
- **WHEN** `main` runs with the real `launchDurable` and a capturing log destination on a `withTestDatabase()` clone whose `dbos` schema the owner dropped (`DROP SCHEMA dbos CASCADE`), then on an intact clone where `/health` is fetched and `launchDurable` is called by the test while it runs and again after `close()`
- **THEN** the first resolves `null`, `exit` got `1` once, the destination holds exactly one fatal line (`code` `DURABLE_UNAVAILABLE`, `msg` `startup failed`, `reason` `not_prepared`) and the engine port refuses connections; for the second `/health` is 200 with `checks` exactly `{ db: "ok" }`, and the test's call rejects `DURABLE_ALREADY_LAUNCHED` while `main` runs and resolves after `close()`

### Requirement: Only src/durable imports DBOS and only src/durable and src/runs name its schema
`checkDbosAccess` SHALL report `ARCH_DBOS_ACCESS` for a non-test `src/**` file outside `src/durable/` that imports `@dbos-inc/dbos-sdk` or a subpath in any form, and for one outside `src/durable/` and `src/runs/` that holds `dbos.` in an SQL string or names `DBOS_SCHEMA`; `package.json` SHALL pin the package at `5.3.0`.

#### Scenario: Rule fixtures and the real tree
- **WHEN** `checkDbosAccess(snapshotOf(files))` runs on files: `src/api/a.ts` (`import { DBOS } from "@dbos-inc/dbos-sdk";`), `src/api/b.ts` (`await import("@dbos-inc/dbos-sdk/dist/src/index.js")`), `src/api/c.ts` (`import type { DLogger } from "@dbos-inc/dbos-sdk";`), `src/api/d.ts` (`"SELECT * FROM dbos.workflow_status"`), `src/api/e.ts` (`` `SELECT 1 FROM "dbos"."queues"` ``), `src/api/f.ts` (`import { DBOS_SCHEMA } from "../durable/index.ts";`), and the allowed `src/durable/g.ts` (SDK import), `src/runs/h.ts` (`dbos.` SQL), `src/api/i.test.ts` (SDK import) and `src/api/j.ts` (`const dbos = {}; dbos.x = 1;` and `// dbos.queues`); then on `readSnapshot()`, and `package.json` is read
- **THEN** the violations are exactly `ARCH_DBOS_ACCESS` at line 1 of `src/api/a.ts`, `b.ts`, `c.ts`, `d.ts`, `e.ts` and `f.ts` in that order, each with the message `@dbos-inc/dbos-sdk is imported only in src/durable` for the first three and `the dbos schema is named only in src/durable and src/runs` for the rest; the real tree has none; `dependencies["@dbos-inc/dbos-sdk"]` is `"5.3.0"`

### Requirement: The e2e stack shuts the runtime down before a reset and checks it after
The stack SHALL run each part's optional `beforeReset` once per reset, in reverse part order, before any seed and never during `seedAll`, failing the reset as `STACK_RESET_FAILED` with the part name (the registry refuses a non-function hook); `checkDurableReady(runtime, opts)` SHALL enqueue `stack.ready` on `runs`, poll `status` (status first, then the deadline) and reject `STACK_DURABLE_NOT_READY` with `details.state` on `ERROR`, `CANCELLED`, `MAX_RECOVERY_ATTEMPTS_EXCEEDED` or once `timeoutMs` (default 5000) has elapsed; and the `durable` part (`parts/40-durable.ts`) SHALL prepare the e2e template with `prepareDurable`, suspend the runtime in `beforeReset`, resume it and run `checkDurableReady` in `seed`, so a reset answers 204 only when a workflow queued on `runs` reached `SUCCESS`, and end the runtime in `close` before the database part closes.

#### Scenario: Hook order and failure
- **WHEN** fake parts `p1`, `p2`, `p3` record `hook:<name>` and `seed:<name>` (`p2` has no hook); `seedAll()` then `reset()` run; `p3`'s hook rejects and `reset()` runs; the hook is fixed and `reset()` runs; and a registry registers a part with `beforeReset: "x"`
- **THEN** the log after `seedAll()` is `seed:p1, seed:p2, seed:p3`; one reset adds `hook:p3, hook:p1, seed:p1, seed:p2, seed:p3`; the failing reset rejects `STACK_RESET_FAILED` with `details.part` `p3` and adds no `hook:p1` or `seed:` entry; the next reset passes; the registration throws `STACK_PART_INVALID`

#### Scenario: Ready, late, failed
- **WHEN** `checkDurableReady(fake, { workflowId: "ready-1", timeoutMs: 5000, pollMs: 100, now, sleep })` runs with an injected clock that `sleep` advances, against a fake whose `status` answers `ENQUEUED, ENQUEUED, SUCCESS`; always `ENQUEUED` (with `timeoutMs` 5000 and with it omitted); `ERROR`; and a fake whose `enqueue` rejects with `err`
- **THEN** the first resolves after one `enqueue("stack.ready", "ready-1", "ping")`, 3 `status` and 2 `sleep(100)` calls; the second rejects `E2eStackError` `STACK_DURABLE_NOT_READY` with `details.state` `ENQUEUED` after 51 `status` calls each; the third at once with `details.state` `ERROR`; the fourth with `err` itself

#### Scenario: Three resets under the live engine, then the close
- **WHEN** `startE2eStack({ port: 0, controlPort: 0, dataDir })` runs with the shipped parts; the owner reads `dbos.workflow_status` before the first reset and, with `dbos.queues` and `GET /health`, after each of three `POST /reset`; `close()` runs with the database part's `close` wrapped to poll (5 s) the count of `ursitoare-durable` sessions before it delegates; and `docs/testing.md` is read
- **THEN** before the first reset there are no workflow rows; each reset answers 204 and leaves one row (`name` `stack.ready`, `status` `SUCCESS`, `queue_name` `runs`, a new id), `dbos.queues` holds `runs`, `ursitoare_e2e_template` has `dbos.dbos_migrations`, and `/health` is 200 with `checks` exactly `{ db: "ok" }`; the wrapped close saw 0 sessions; afterwards `resumeDurable()` resolves `null`; `docs/testing.md` contains `A reset discards every durable workflow`
