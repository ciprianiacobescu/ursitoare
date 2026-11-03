## Purpose

The durable runtime on DBOS 5.3.0: schema step, launch, `runs` queue, workflows, steps, boot wiring, access guard, e2e reset hooks. `CODE reason` means a `DurableError` with that `code` and `details.reason`.

## ADDED Requirements

### Requirement: The owner prepares the DBOS schema and the engine never does
`prepareDurable(ownerUrl)` SHALL create or update the schema `dbos` through `DBOS.migrate` for `ursitoare_app`, repeat as a no-op and refuse an unusable URL or role; the test template carries it.

#### Scenario: Prepare, repeat, refuse
- **WHEN** `prepareDurable(db.ownerUrl)` runs twice on `withTestDatabase({ migrated: false })`, then with `"not a url"`, `other.appUrl` of a second such database and an owner URL on a closed port; `withTestDatabase()` clones
- **THEN** after the first call `dbos` exists, owned by `ursitoare_owner`; `ursitoare_app` has USAGE and not CREATE, and `CREATE TABLE dbos.x (i int)` as it rejects `42501`; the second call resolves, `dbos.dbos_migrations` unchanged; the refusals are `DURABLE_INVALID bad_url`, `DURABLE_UNAVAILABLE 42501` and `DURABLE_UNAVAILABLE migrate_failed`, no message containing `postgres://`; the default clone has `dbos.dbos_migrations`

### Requirement: The runtime connects with the endpoint it is given and never migrates
`launchDurable(opts)` SHALL pass `DBOS.setConfig` exactly `dbosConfig(opts, pool)` (fields asserted below; its pool is `createPool(opts.endpoint)` named `ursitoare-durable`), so DBOS sessions use the endpoint's user (no role-name check), send DBOS logs to `opts.logger` through `dbosLogger`, and log a pool error as a warning with its `code` only.

#### Scenario: A prepared database
- **WHEN** `dbosConfig` and `dbosLogger` are called on the fixtures of test-plan.md; `launchDurable({ endpoint: db.appEndpoint, logger })` runs on a prepared clone with a capturing debug logger; the owner reads `pg_stat_activity` and `dbos.application_versions`; then the admin connection runs `pg_terminate_backend` on the `ursitoare-durable` sessions
- **THEN** `dbosConfig` gives `runMigrations` false, `enableOTLP` false, `name` `ursitoare`, `systemDatabaseSchemaName` `DBOS_SCHEMA`, `applicationVersion` `APPLICATION_VERSION`, the given pool and a URL with no password; `dbosLogger(log).info("x")` calls `log.info({ component: "dbos" }, "x")`; `applicationVersion` is `"ursitoare-1"`; the `ursitoare-durable` sessions (at least one) are `ursitoare_app`'s; `dbos.application_versions` holds `ursitoare-1`; an `info` line (level 30) has `component` `dbos`, none holds the password; within 5 s a line has `msg` `durable pool error`, `component` `dbos` and `code` `57P01`, none holding `terminating connection`

### Requirement: The runs queue is registered after every launch
`launchDurable` SHALL register the queue `runs` after each `DBOS.launch`; `suspendDurable` and `resumeDurable` SHALL stop and relaunch the same runtime through that path (a failed resume rethrows and leaves it suspended); a handle SHALL reject `enqueue`, `cancel` and `status` with `DURABLE_NOT_LAUNCHED` `suspended` while suspended and `shut_down` after `shutdown()`; `shutdown` and `suspendDurable`, once started, SHALL wait for every `enqueue`, `status` and `cancel` already past its state check (made synchronously before its first await) to settle, each keeping its outcome, then end DBOS and the pool, resolving even when closing fails (a warning is logged); `launchDurable`, `suspendDurable`, `resumeDurable` and `shutdown` SHALL run in call order, and `enqueue`, `status` and `cancel` called meanwhile SHALL wait for the earlier ones, then apply these rules.

#### Scenario: Launch, lose the rows, launch again
- **WHEN** a runtime `rt` is launched with `pollingIntervalMs` 20, `concurrency` 3, a capturing `logger`, the test-only `closePool` and the ten steps of test-plan.md § Queue sequence run
- **THEN** the first read has one row `runs`, `worker_concurrency` 3, `polling_interval_sec` 0.02 (within 1e-9); `suspendDurable()` resolves `rt`; the step-3 calls reject `DURABLE_NOT_LAUNCHED suspended`; the step-4 resume rejects `launch_failed`, `rt.status("x")` still `suspended`; `resumeDurable()` resolves `rt`, then `null`; the row is back, `after-reset` succeeds; both `shutdown()` calls resolve; the step-7 calls reject `DURABLE_NOT_LAUNCHED shut_down`; the capture has exactly two `durable shutdown failed` warnings, no `boom`; after the second launch the row holds the defaults 4 and 0.05 and `resumeDurable()` gives `null`; the concurrent `enqueue` rejects `DURABLE_NOT_LAUNCHED suspended`, the others resolve `rt2`, `rt2`, `undefined`; `rt2.status("x")` rejects `shut_down`; the unawaited `rt3.enqueue` (step 10) resolves and its `d-drain` row exists after `rt3.shutdown()`; within 5 s no `ursitoare-durable` session is left

### Requirement: A launch that cannot succeed fails with a stable code and leaves nothing behind
`launchDurable` SHALL reject an option out of range, an `endpoint.url` with a scheme other than `postgres`/`postgresql`, without a database name or with a password, a second launch while one runs (`running`) and a database without the `dbos` schema, each with a stable `code` and `details.reason`; any other launch failure SHALL be `DURABLE_UNAVAILABLE` `config_failed`, `launch_failed` or `queue_failed` (design decision 2); a failed launch SHALL end its pool and leave no session, workflow row or queue row of its own (an `application_versions` row may remain).

#### Scenario: Refusals
- **WHEN** `launchDurable` runs the twelve calls of test-plan.md § Refusal sequence, in order
- **THEN** the rejections are `DURABLE_UNAVAILABLE not_prepared`, `DURABLE_INVALID bad_option` twice (`details.option`: `concurrency`, `pollingIntervalMs`), `DURABLE_INVALID` `bad_endpoint` twice, `password_in_url`, then `DURABLE_UNAVAILABLE` `config_failed`, `launch_failed` (closed port), `launch_failed` (ledger emptied), `queue_failed`; after the first, eighth, ninth, tenth no `ursitoare-durable` session is left within 5 s; after the tenth `dbos.workflow_status` is empty and `dbos.queues` has only the foreign row; the eleventh resolves; the twelfth rejects `DURABLE_ALREADY_LAUNCHED running`; its runtime answers `status("none")` `null`

### Requirement: Workflows are registered before launch under a checked name
`registerWorkflow(name, fn)` SHALL accept a name matching `^[a-z][a-z0-9_.-]{0,63}$` while no runtime runs, ignore a repeat of the same function, refuse another under a known name; `enqueue` SHALL refuse an unregistered name.

#### Scenario: Registration rules
- **WHEN** `registerWorkflow("t.count", f)` runs twice, then with `g`, then `("Bad Name", f)` and `("a".repeat(65), f)`; `launchDurable(...)` is called unawaited and `registerWorkflow("t.late2", f)` runs; after it resolves, `registerWorkflow("t.late", f)` and `rt.enqueue("t.unknown", "w-u", null)` run
- **THEN** the first two return `undefined`; the third throws `DURABLE_INVALID name_taken` and the next two `bad_name`; `t.late2`, `t.late` throw `DURABLE_ALREADY_LAUNCHED running`; the enqueue rejects `DURABLE_WORKFLOW_UNKNOWN not_registered`, leaving no `w-u` row

### Requirement: A workflow id runs once, and status and cancel report it
`enqueue` SHALL accept only a `DurableJson` input (design decision 6: no cycle, depth at most 64), else `bad_input`, put the workflow on `runs` at `APPLICATION_VERSION` with `return-existing`, so one id runs once whatever the second input; `status` SHALL map the DBOS state, or `null`; both refuse a bad id like `enqueue` (`^[A-Za-z0-9_-][A-Za-z0-9_.:-]{0,199}$`); `cancel` SHALL cancel a queued workflow, mark a running (`PENDING`) one `CANCELLED` so that it stops at its next step, and ignore an unknown id.

#### Scenario: Once per id, status, cancel
- **WHEN** a runtime is launched with `concurrency` 1 and the eight steps of test-plan.md § Once-per-id sequence run
- **THEN** `status("w-gate")` is `{ workflowId: "w-gate", workflow: "t.gate", state: "PENDING" }`, `status("w-1")` `ENQUEUED`, then `CANCELLED`; `cancel("never")` resolves, `status("never")` `null`; `w-gate` and `w-2` succeed; the counter is 1; the `w-2` row has `application_version` `ursitoare-1`, `queue_name` `runs`; `w-park` is `CANCELLED` before and after its promise opens, `two` never ran; `isDurableCancellation` is true for the error `t.park` caught from `two`, false for `new Error("x")` and `{ name: "DBOSWorkflowCancelledError" }`; bad ids reject `DURABLE_INVALID bad_workflow_id`; the refused inputs of step 7 reject `bad_input`; `d-200`, `d-64` and `d-null` succeed

### Requirement: Steps are observed, retried only on request, and need a workflow
`runStep(name, fn, opts)` SHALL take a name of 1 to 200 characters without control characters, call the launch's `stepObserver` with `before` ahead of `fn` and `after` once `fn` resolved a `DurableJson` and before DBOS records its result, retry `fn` at most `opts.retries` times (default 0) while `opts.retryable` allows, let `fn`'s own error pass unchanged, and, like `durableSleep` and `currentWorkflowId`, be refused outside a workflow; an SDK or driver failure around `fn` or in `durableSleep`, `enqueue`, `status` or `cancel` SHALL be `DURABLE_UNAVAILABLE dbos_failed`, but DBOS's cancellation error (`isDurableCancellation`) passes unchanged.

#### Scenario: Steps and durable calls
- **WHEN** a runtime is launched with a recording `stepObserver`; the workflows `t.steps`, `t.retry`, `t.once`, `t.names`, `t.bad` and `t.drop` (test-plan.md) are enqueued in that order and awaited; `runStep`, `durableSleep(1)`, `currentWorkflowId()` run outside any workflow; after `t.drop`, `rt.status`, `rt.cancel`, `rt.enqueue` run
- **THEN** the observer calls for `t.steps` are exactly `[["before","a",id],["after","a",id],["before","b",id],["after","b",id]]` (`id` the enqueue id and `currentWorkflowId()`), the sleep took 900 to under 5000 ms; `flaky` ran 3 times, returned 7, with one `before` and `after`; `always` ran once, `t.once` caught `e1` itself; in `t.bad`, `bad` is `bad_step_result` with no `after`, the three names `bad_step_name`, the other two `bad_option`; the `t.names` steps ran in order; outside a workflow the three give `DURABLE_NOT_LAUNCHED outside_workflow`; the `t.drop` `runStep`, its `durableSleep` and the three calls reject `DURABLE_UNAVAILABLE dbos_failed`

### Requirement: Row-level security holds inside durable steps
A step that opens `withTenantTx` SHALL see only that tenant's rows; one with no tenant, none.

#### Scenario: Two tenants in steps
- **WHEN** `seedTwoTenants(db)` runs, the owner creates the probe table (test-plan.md), a runtime is launched on `db.appEndpoint` and `t.read` is enqueued as `r-a`, `r-b`, `r-none` with `tenantId` `tenant_a`, `tenant_b`, null and `userId` `u1`, each awaited to `SUCCESS`
- **THEN** the map entries `r-a`, `r-b`, `r-none` have `ids` `["tenant_a"]`, `["tenant_b"]` and `[]`, and every `user` is `ursitoare_app`

### Requirement: main launches the runtime after the routes and closes it before the database
`main` SHALL call `launchDurable` once with `config.database.app`, the app role (so DBOS sessions use `ursitoare_app`), after the routes that need no runtime and before the listener binds (routes that take the runtime register after it), only when that endpoint is set and `config.role` is `all` or `worker`, close the runtime before the database on every exit path (a later failure, such as a taken port, takes the launch-failure path: fatal line, both closed, exit 1), and leave `/health` `checks` as `{ db: "ok" }`.

#### Scenario: When it launches and the close order
- **WHEN** `main` runs with the fakes of test-plan.md, for the roles `all`, `worker`, `api`, `sandbox` with `database.app` an endpoint `E`, and for `all` with `database.app` null; then the first server gets `SIGTERM`
- **THEN** the fake is called once each for `all` and `worker`, with exactly `{ endpoint: E, logger }` (`endpoint === E`), and never for `api`, `sandbox` or the null endpoint; after `SIGTERM` the records are `["durable.shutdown", "database.close"]` and `exit` got `0`

#### Scenario: A failed launch and the unchanged health
- **WHEN** `main` runs with the real `launchDurable` and a capturing log destination on a clone whose `dbos` schema the owner dropped (`DROP SCHEMA dbos CASCADE`), then on an intact clone where `/health` and the `ursitoare-durable` sessions are read and the test calls `launchDurable` while it runs and after `close()`; and once more on an intact clone with the listener port held by another listener
- **THEN** the first resolves `null`, `exit` got `1` once, the destination holds exactly one fatal line (`DURABLE_UNAVAILABLE`, `startup failed`, `not_prepared`); for the second `/health` is 200 with `checks` `{ db: "ok" }`, every `ursitoare-durable` session is `ursitoare_app`'s, and the test's launch rejects `DURABLE_ALREADY_LAUNCHED` while `main` runs, resolves after `close()`; for the third `main` resolves `null`, `exit` got `1`, the fatal line has `code` `EADDRINUSE`, within 5 s no `ursitoare-durable` session is left and the test's launch resolves

### Requirement: Only src/durable imports DBOS and only src/durable and src/runs name its schema
`checkDbosAccess` SHALL report `ARCH_DBOS_ACCESS` for a non-test `src/**` file outside `src/durable/` that imports `@dbos-inc/dbos-sdk` or a subpath in any form, and for one outside `src/durable/` and `src/runs/` that holds `dbos.` in an SQL string or names `DBOS_SCHEMA`; `package.json` SHALL pin the package at `5.3.0`.

#### Scenario: Rule fixtures and the real tree
- **WHEN** `checkDbosAccess(snapshotOf(files))` runs on the rule fixtures `src/api/a.ts` to `f.ts` and the allowed `g.ts`, `h.ts`, `i.test.ts`, `j.ts` (test-plan.md); then on `readSnapshot()`; `package.json` is read
- **THEN** the violations are exactly `ARCH_DBOS_ACCESS` at line 1 of `a.ts` to `f.ts` in order, with the SDK message for `a.ts`-`c.ts` and the schema message for `d.ts`-`f.ts` (test-plan.md); the real tree has none; `dependencies["@dbos-inc/dbos-sdk"]` is `"5.3.0"`

### Requirement: The e2e stack shuts the runtime down before a reset and checks it after
The stack SHALL run each part's optional `beforeReset` once per reset, in reverse part order, before any seed and never in `seedAll`; a failing hook SHALL fail the reset as `STACK_RESET_FAILED` with the part name; the registry SHALL refuse a non-function hook. `checkDurableReady(runtime, opts)` SHALL check `timeoutMs` and `pollMs` (design decision 8: integer ranges, defaults 5000 and 20), enqueue `stack.ready` on `runs`, poll `status` before each deadline check, reject `STACK_DURABLE_NOT_READY` with `details.state` on `ERROR`, `CANCELLED`, `MAX_RECOVERY_ATTEMPTS_EXCEEDED` or after `timeoutMs`, or `details.reason` `bad_option` before enqueueing, and let a throw of `enqueue`, `status`, `sleep` or `now` propagate unchanged, with no further poll. The `durable` part (`parts/40-durable.ts`) SHALL prepare the e2e template, suspend the runtime in `beforeReset`, resume and check it in `seed` (a reset answers 204 only after a workflow on `runs` reached `SUCCESS`), and end it in `close` before the database part closes; where no runtime was launched in the process (`suspendDurable()` and `resumeDurable()` give `null`), `beforeReset`, `seed` and `close` SHALL do nothing and run no check.

#### Scenario: Hook order and failure
- **WHEN** fake parts `p1`, `p2`, `p3` record `hook:<name>` and `seed:<name>` (`p2` has no hook); `seedAll()` then `reset()` run; `p3`'s hook rejects and `reset()` runs; then it is fixed and `reset()` runs; and a registry registers a part with `beforeReset: "x"`
- **THEN** the log after `seedAll()` is `seed:p1, seed:p2, seed:p3`; one reset adds `hook:p3, hook:p1, seed:p1, seed:p2, seed:p3`; the failing reset rejects `STACK_RESET_FAILED` (`details.part` `p3`), adding no `hook:p1` or `seed:`; the next passes; the registration throws `STACK_PART_INVALID`

#### Scenario: Ready, late, failed
- **WHEN** `checkDurableReady(fake, opts)` runs with a clock that `sleep` advances and `workflowId` `ready-1`, against a fake whose `status` answers `ENQUEUED, ENQUEUED, SUCCESS` (`pollMs` 100); always `ENQUEUED` with `timeoutMs` 5000 and `pollMs` 100, and with neither (defaults 5000, 20); `ERROR`; a fake whose `enqueue` rejects with `err`; the five bad options and the three dependency failures of test-plan.md; and, on a started database part with no engine, `durablePart.start`, `beforeReset`, `seed`, `close` run
- **THEN** the first resolves after one `enqueue("stack.ready", "ready-1", "ping")`, 3 `status`, 2 `sleep(100)`; the second rejects `STACK_DURABLE_NOT_READY` with `details.state` `ENQUEUED` after 51 `status` and 50 `sleep(100)`, and with the defaults after 251 `status` and 250 `sleep(20)`; the third at once with `ERROR`; the fourth with `err` itself; `err2` after 2 `status` and 1 `sleep`, `err3` and `err4` as themselves; the bad options reject `bad_option` with no `enqueue`; the four part calls resolve and `ursitoare_e2e` holds no `stack.ready` row

#### Scenario: Three resets under the live engine, then the close
- **WHEN** `startE2eStack({ port: 0, controlPort: 0, dataDir })` runs with the shipped parts, the owner reads `dbos.workflow_status` before the first reset and, with `dbos.queues` and `/health`, after each of three resets; `close()` runs with the wrapped database part (test-plan.md); a second `startE2eStack` boots, resets once, closes; `docs/testing.md` is read
- **THEN** before the first reset there are no workflow rows; each reset answers 204 with one row (`stack.ready`, `SUCCESS`, `runs`), `dbos.queues` has `runs`, `ursitoare_e2e_template` has `dbos.dbos_migrations`, and `/health` is 200 with `checks` exactly `{ db: "ok" }`; the wrapped close saw 0 sessions, `resumeDurable()` gives `null`; the second boot starts (no `name_taken`), its reset answers 204 with one `stack.ready` `SUCCESS` row; `docs/testing.md` contains `A reset discards every durable workflow`
