## Purpose

The engine's durable runtime on DBOS 5.3.0: schema step, launch, the `runs` queue, workflows and steps, boot wiring, an access guard and the e2e reset hooks. `CODE reason` below means a `DurableError` with that `code` and `details.reason`.

## ADDED Requirements

### Requirement: The owner prepares the DBOS schema and the engine never does
`prepareDurable(ownerUrl)` SHALL create or update the schema `dbos` through `DBOS.migrate` for `ursitoare_app`, repeat as a no-op and refuse an unusable URL or role; the test template SHALL carry it.

#### Scenario: Prepare, repeat, refuse
- **WHEN** `prepareDurable(db.ownerUrl)` runs twice on `withTestDatabase({ migrated: false })`, then with `"not a url"`, `other.appUrl` of a second such database and an owner URL on a closed port; and `withTestDatabase()` clones
- **THEN** after the first call `dbos` exists, owned by `ursitoare_owner`; `ursitoare_app` has USAGE and not CREATE, and `CREATE TABLE dbos.x (i int)` as it rejects `42501`; the second call resolves, `dbos.dbos_migrations` (`count(*)`, `max(version)`) unchanged; the refusals are `DURABLE_INVALID bad_url`, `DURABLE_UNAVAILABLE 42501` and `DURABLE_UNAVAILABLE migrate_failed`, no message containing `postgres://`; the default clone has `dbos.dbos_migrations`

### Requirement: The engine connects DBOS as the app role and never migrates
`launchDurable(opts)` SHALL start DBOS as `ursitoare` at `APPLICATION_VERSION` with `runMigrations` false and a pool from `createPool(opts.endpoint)` named `ursitoare-durable`, so every DBOS session uses `ursitoare_app` and no password enters a URL, and send DBOS logs to `opts.logger`.

#### Scenario: A prepared database
- **WHEN** `launchDurable({ endpoint: db.appEndpoint, logger })` runs on a prepared clone, with a debug-level `createLogger` and a capturing destination; then the owner reads `pg_stat_activity` and `dbos.application_versions`
- **THEN** the runtime's `applicationVersion` is `"ursitoare-1"`; the `ursitoare-durable` sessions (at least one) have `usename` `ursitoare_app`; `dbos.application_versions` holds `version_name` `ursitoare-1`; a line has `component` `dbos`; none holds the password

### Requirement: The runs queue is registered after every launch
`launchDurable` SHALL register the queue `runs` (`pollingIntervalMs` default 50, `concurrency` default 4) after every `DBOS.launch`; `suspendDurable` and `resumeDurable` SHALL stop and relaunch the same runtime through that path; a handle SHALL reject `enqueue`, `cancel` and `status` with `DURABLE_NOT_LAUNCHED` `suspended` while suspended, `shut_down` after `shutdown()`; `shutdown` and `suspendDurable` SHALL end the pool and resolve even when closing fails, logging a warning.

#### Scenario: Launch, lose the rows, launch again
- **WHEN** a runtime `rt` is launched with `pollingIntervalMs` 20, `concurrency` 3, a capturing `logger` and the test-only `closePool` that ends the pool and then throws `boom`, and `dbos.queues` is read; `suspendDurable()` runs; `rt.enqueue("t.echo", "x", "hi")`, `rt.cancel("x")` and `rt.status("x")` (the three calls) run; the owner deletes the rows of `dbos.queues` and `dbos.application_versions`; `resumeDurable()` runs twice; `rt.enqueue("t.echo", "after-reset", "hi")` runs and is polled to a terminal state within 20 s; `rt.shutdown()` runs twice at once (`Promise.all`) and the three calls run again; then `launchDurable` runs with no options and `resumeDurable()` runs
- **THEN** the first read has one row `runs` with `worker_concurrency` 3 and `polling_interval_sec` within 1e-9 of 0.02; `suspendDurable()` resolves `rt` and the three calls reject `DURABLE_NOT_LAUNCHED suspended`; `resumeDurable()` resolves `rt`, then `null`; the row is back and `after-reset` reaches `SUCCESS`; both `shutdown()` calls resolve and the three calls reject `DURABLE_NOT_LAUNCHED shut_down`; the capture holds exactly two warnings `durable shutdown failed` (`component` `dbos`) without `boom`; within 5 s no `ursitoare-durable` session remains; after the second launch the row holds 4 and 0.05 and the last `resumeDurable()` resolves `null`

### Requirement: A launch that cannot succeed fails with a stable code and leaves nothing behind
`launchDurable` SHALL reject an option out of range, a password in `endpoint.url`, a second launch while one runs and a database without the `dbos` schema, each with a stable `code` and `details.reason`; any other launch failure SHALL be `DURABLE_UNAVAILABLE` `config_failed`, `launch_failed` or `queue_failed`; a failed launch SHALL create nothing and end its pool.

#### Scenario: Refusals
- **WHEN** `launchDurable` runs on `withTestDatabase({ migrated: false })` (no `dbos`), then with `concurrency` 0, `pollingIntervalMs` 5 and endpoint URLs `postgres://ursitoare_app:pw@127.0.0.1:1/x`, `postgres://ursitoare_app@127.0.0.1:1/x?foo=1` and `postgres://ursitoare_app@127.0.0.1:1/x`; and after `prepareDurable` on the first database it runs with an owner-inserted `dbos.queues` row `runs` of `application_name` `other-app`, again after deleting that row, and once more while that runtime runs
- **THEN** the rejections are `DURABLE_UNAVAILABLE not_prepared` (`to_regnamespace('dbos')` stays null), `DURABLE_INVALID bad_option` twice (`details.option` `concurrency`, then `pollingIntervalMs`), `DURABLE_INVALID password_in_url`, then `DURABLE_UNAVAILABLE` with `config_failed`, `launch_failed`, `queue_failed`; after the first, sixth and seventh no `ursitoare-durable` session remains within 5 s; the next launch resolves; the last rejects `DURABLE_ALREADY_LAUNCHED` and the resolved runtime still answers `status("none")` `null`

### Requirement: Workflows are registered before launch under a checked name
`registerWorkflow(name, fn)` SHALL accept a name matching `^[a-z][a-z0-9_.-]{0,63}$` while no runtime runs, ignore a repeat of the same function, and refuse another function under a known name; `enqueue` SHALL refuse a name never registered.

#### Scenario: Registration rules
- **WHEN** `registerWorkflow("t.count", f)` runs twice, then with `g`, then `("Bad Name", f)` and `("a".repeat(65), f)`; and after `launchDurable` resolves, `registerWorkflow("t.late", f)` and `rt.enqueue("t.unknown", "w-u", null)` run
- **THEN** the first two return `undefined`; the third throws `DURABLE_INVALID name_taken` and the next two `bad_name`; `t.late` throws `DURABLE_ALREADY_LAUNCHED`; the enqueue rejects `DURABLE_WORKFLOW_UNKNOWN` and `dbos.workflow_status` has no row `w-u`

### Requirement: A workflow id runs once, and status and cancel report it
`enqueue` SHALL put the workflow on `runs` at `APPLICATION_VERSION` with `return-existing`, so one id runs once whatever the second input; `status` SHALL map the DBOS state or give `null`; `cancel` SHALL cancel a queued workflow, mark a running (`PENDING`) one `CANCELLED` so that it stops at its next step boundary, and ignore an unknown id.

#### Scenario: Once per id, status, cancel
- **WHEN** a runtime is launched with `concurrency` 1; `t.gate` (waits for a test promise) is enqueued as `w-gate` and awaited to `PENDING`; `t.count` (adds 1 to a counter) as `w-1`; `status("w-1")` is read; `cancel("w-1")`, `cancel("never")` and `status("never")` run; the gate opens; `t.count` is enqueued as `w-2` with input 2 and again with 3; `t.park` (step `one`, waits for a promise, step `two`) is enqueued as `w-park`, awaited to `PENDING` with `one` done, cancelled, then the promise opens; `enqueue("t.count", "bad id!", null)` and `("t.count", "w-3", undefined)` run
- **THEN** `status("w-gate")` is `{ workflowId: "w-gate", workflow: "t.gate", state: "PENDING" }`, `status("w-1")` `ENQUEUED`, after the cancel `CANCELLED`; `cancel("never")` resolves, `status("never")` is `null`; `w-gate` and `w-2` reach `SUCCESS` within 20 s; the counter is 1 and `dbos.workflow_status` holds one `w-2` row (`application_version` `ursitoare-1`, `queue_name` `runs`); `w-park` is `CANCELLED` after the cancel and after the promise opened; `two` never ran; the last two reject `DURABLE_INVALID bad_workflow_id` and `bad_input`

### Requirement: Steps are observed, retried only on request, and need a workflow
`runStep(name, fn, opts)` SHALL take a name of 1 to 200 characters without control characters, call the launch's `stepObserver` with `before` ahead of `fn` and `after` once `fn` resolved a `DurableJson`, retry `fn` at most `opts.retries` times (default 0) while `opts.retryable` allows, let `fn`'s own error pass unchanged, and, like `durableSleep` and `currentWorkflowId`, be refused outside a workflow; a failure of the SDK or driver around `fn`, or in `enqueue`, `status` or `cancel`, SHALL be `DURABLE_UNAVAILABLE dbos_failed`, the original only logged.

#### Scenario: Steps and durable calls
- **WHEN** a runtime is launched with a recording `stepObserver`; `t.steps` runs steps `a`, `b`, `currentWorkflowId()` and a timed `durableSleep(1000)`; `t.retry` runs `runStep("flaky", f, { retries: 2 })`, `f` failing twice then returning 7; `t.once` runs `runStep("always", g, { retries: 3, retryable: () => false })`, `g` throwing `e1`; `t.names` runs steps named `run:load`, `pay`, `pay#done`, `run:finish`; `t.bad` runs, each caught, `runStep("bad", async () => undefined as never)`, `runStep("x", f, { retries: -1 })`, `durableSleep(1.5)` and steps named `""`, `"a\nb"`, `"x".repeat(201)`; `runStep`, `durableSleep(1)` and `currentWorkflowId()` run outside any workflow; then `t.drop` runs a step in which the owner runs `DROP SCHEMA dbos CASCADE` and catches the `runStep` rejection, then `rt.status`, `rt.cancel` and `rt.enqueue` run
- **THEN** the observer calls for `t.steps` are exactly `[["before","a",id],["after","a",id],["before","b",id],["after","b",id]]` (`id` is the enqueue id and `currentWorkflowId()`), the sleep took 900 to under 5000 ms; `flaky` ran 3 times, returned 7, with one `before` and one `after`; `always` ran once and the workflow caught `e1` itself (`===`); `bad` is `DURABLE_INVALID bad_step_result` with no `after`; the bad names are `bad_step_name`; the other two `bad_option`; the four `t.names` steps ran in order; outside a workflow the three reject or throw `DURABLE_NOT_LAUNCHED outside_workflow`; the `t.drop` `runStep` and the three calls reject `DURABLE_UNAVAILABLE dbos_failed`

### Requirement: Row-level security holds inside durable steps
A step that opens `withTenantTx` SHALL see only that tenant's rows; one that sets no tenant, none.

#### Scenario: Two tenants in steps
- **WHEN** `seedTwoTenants(db)` runs, the owner creates `ursitoare.rls_probe (tenant_id text)` with forced RLS, the policy `tenant_id = current_setting('app.tenant_id', true)`, rows `tenant_a`, `tenant_b` and `SELECT` for the app role, a runtime is launched on `db.appEndpoint`, and `t.read` (input `{ tenantId, userId }`; one `runStep` runs `withTenantTx(db.appPool, { tenantId, reviewProfile: "solo" }, ...)`, or a plain `db.appPool.query` for a null `tenantId`; the workflow stores `{ ids, user }`, the probe's `tenant_id` values and `current_user`, in a module `Map` keyed by workflow id) is enqueued as `r-a`, `r-b`, `r-none` with `tenantId` `tenant_a`, `tenant_b`, null and `userId` `u1`, each awaited to `SUCCESS`
- **THEN** the map entries `r-a`, `r-b`, `r-none` have `ids` `["tenant_a"]`, `["tenant_b"]` and `[]`, and every `user` is `ursitoare_app`

### Requirement: main launches the runtime after the routes and closes it before the database
`main` SHALL call `launchDurable` once, after the routes that need no runtime and before the listener binds (routes that take the runtime register after it), only when `config.database.app` is set and `config.role` is `all` or `worker`, close the runtime before the database on every exit path, and leave `/health` `checks` as `{ db: "ok" }`.

#### Scenario: When it launches and the close order
- **WHEN** `main` runs with a fake `openDatabase` (its `Database.close` records `database.close`) and a fake `deps.launchDurable` that records its argument and returns a runtime whose `shutdown` records `durable.shutdown`, for the roles `all`, `worker`, `api`, `sandbox` with `database.app` an endpoint `E`, and for `all` with `database.app` null; then the first server gets `SIGTERM`
- **THEN** the fake is called once each for `all` and `worker`, with exactly `{ endpoint: E, logger }` (`endpoint === E`, no `stepObserver`), and never for `api`, `sandbox` or the null endpoint; after `SIGTERM` the records are `["durable.shutdown", "database.close"]` and `exit` got `0`

#### Scenario: A failed launch and the unchanged health
- **WHEN** `main` runs with the real `launchDurable` and a capturing log destination on a `withTestDatabase()` clone whose `dbos` schema the owner dropped (`DROP SCHEMA dbos CASCADE`), then on an intact clone where `/health` is fetched and `launchDurable` is called by the test while it runs and after `close()`
- **THEN** the first resolves `null`, `exit` got `1` once, the destination holds exactly one fatal line (`DURABLE_UNAVAILABLE`, `startup failed`, `reason` `not_prepared`) and the port refuses connections; for the second `/health` is 200 with `checks` exactly `{ db: "ok" }`, and the test's launch rejects `DURABLE_ALREADY_LAUNCHED` while `main` runs, resolves after `close()`

### Requirement: Only src/durable imports DBOS and only src/durable and src/runs name its schema
`checkDbosAccess` SHALL report `ARCH_DBOS_ACCESS` for a non-test `src/**` file outside `src/durable/` that imports `@dbos-inc/dbos-sdk` or a subpath in any form, and for one outside `src/durable/` and `src/runs/` that holds `dbos.` in an SQL string or names `DBOS_SCHEMA`; `package.json` SHALL pin the package at `5.3.0`.

#### Scenario: Rule fixtures and the real tree
- **WHEN** `checkDbosAccess(snapshotOf(files))` runs on `src/api/a.ts` (`import { DBOS } from "@dbos-inc/dbos-sdk";`), `b.ts` (`await import("@dbos-inc/dbos-sdk/dist/src/index.js")`), `c.ts` (`import type { DLogger } from "@dbos-inc/dbos-sdk";`), `d.ts` (`"SELECT * FROM dbos.workflow_status"`), `e.ts` (`` `SELECT 1 FROM "dbos"."queues"` ``), `f.ts` (`import { DBOS_SCHEMA } from "../durable/index.ts";`), all in `src/api/`, and the allowed `src/durable/g.ts` (SDK import), `src/runs/h.ts` (`dbos.` SQL), `src/api/i.test.ts` (SDK import) and `src/api/j.ts` (`const dbos = {}; dbos.x = 1;`, `// dbos.queues`); then on `readSnapshot()`; `package.json` is read
- **THEN** the violations are exactly `ARCH_DBOS_ACCESS` at line 1 of `a.ts` to `f.ts` in order, with the message `@dbos-inc/dbos-sdk is imported only in src/durable` for the first three and `the dbos schema is named only in src/durable and src/runs` for the rest; the real tree has none; `dependencies["@dbos-inc/dbos-sdk"]` is `"5.3.0"`

### Requirement: The e2e stack shuts the runtime down before a reset and checks it after
The stack SHALL run each part's optional `beforeReset` once per reset, in reverse part order, before any seed and never in `seedAll`, failing the reset as `STACK_RESET_FAILED` with the part name (the registry refuses a non-function hook); `checkDurableReady(runtime, opts)` SHALL enqueue `stack.ready` on `runs`, poll `status` (before checking the deadline) and reject `STACK_DURABLE_NOT_READY` with `details.state` on `ERROR`, `CANCELLED`, `MAX_RECOVERY_ATTEMPTS_EXCEEDED` or after `timeoutMs` (default 5000); and the `durable` part (`parts/40-durable.ts`) SHALL prepare the e2e template, suspend the runtime in `beforeReset`, resume and check it in `seed`, so a reset answers 204 only after a workflow on `runs` reached `SUCCESS`, and end the runtime in `close` before the database part closes.

#### Scenario: Hook order and failure
- **WHEN** fake parts `p1`, `p2`, `p3` record `hook:<name>` and `seed:<name>` (`p2` has no hook); `seedAll()` then `reset()` run; `p3`'s hook rejects and `reset()` runs; the hook is fixed and `reset()` runs; and a registry registers a part with `beforeReset: "x"`
- **THEN** the log after `seedAll()` is `seed:p1, seed:p2, seed:p3`; one reset adds `hook:p3, hook:p1, seed:p1, seed:p2, seed:p3`; the failing reset rejects `STACK_RESET_FAILED` (`details.part` `p3`) and adds no `hook:p1` or `seed:`; the next reset passes; the registration throws `STACK_PART_INVALID`

#### Scenario: Ready, late, failed
- **WHEN** `checkDurableReady(fake, { workflowId: "ready-1", timeoutMs: 5000, pollMs: 100, now, sleep })` runs with a clock that `sleep` advances, against a fake whose `status` answers `ENQUEUED, ENQUEUED, SUCCESS`; always `ENQUEUED` (with `timeoutMs` 5000 and omitted); `ERROR`; and a fake whose `enqueue` rejects with `err`
- **THEN** the first resolves after one `enqueue("stack.ready", "ready-1", "ping")`, 3 `status` and 2 `sleep(100)` calls; the second rejects `STACK_DURABLE_NOT_READY` with `details.state` `ENQUEUED` after 51 `status` calls each; the third at once with `ERROR`; the fourth with `err` itself

#### Scenario: Three resets under the live engine, then the close
- **WHEN** `startE2eStack({ port: 0, controlPort: 0, dataDir })` runs with the shipped parts, and the owner reads `dbos.workflow_status` before the first reset and, with `dbos.queues` and `GET /health`, after each of three `POST /reset`; `close()` runs with the database part's `close` wrapped to poll (5 s) the count of `ursitoare-durable` sessions before it delegates; a second `startE2eStack` boots in the process, takes one `POST /reset` and closes; and `docs/testing.md` is read
- **THEN** before the first reset there are no workflow rows; each reset answers 204 and leaves one row (`stack.ready`, `SUCCESS`, `runs`, a new id), `dbos.queues` holds `runs`, `ursitoare_e2e_template` has `dbos.dbos_migrations`, and `/health` is 200 with `checks` exactly `{ db: "ok" }`; the wrapped close saw 0 sessions and `resumeDurable()` resolves `null`; the second boot starts (no `name_taken`), its reset answers 204 and leaves one `stack.ready` `SUCCESS` row; `docs/testing.md` contains `A reset discards every durable workflow`
