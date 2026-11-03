# Questions — add-dbos-runtime

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | accepted | 5.2 | technical | test/support/e2e-stack/durable-part.test.ts:379 keeps a template pool open before databasePart.seed |
| Q-002 | accepted | 5.2 | technical | test/support/e2e-stack/durable-part.test.ts:395 queries a nonexistent dbos.workflow_status column |
| Q-003 | answered | none | verdict | Criterion C-25c32649 (durable-runtime › The owner prepares the DBOS schema and the engine never does › Prepare, repeat, refuse): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-da1b0c83 (durable-runtime › The runtime connects with the endpoint it is given and never migrates › A prepared database): accept as satisfied? |
| Q-005 | answered | none | verdict | Criterion C-cb0c606e (durable-runtime › The runs queue is registered after every launch › Launch, lose the rows, launch again): accept as satisfied? |
| Q-006 | answered | none | verdict | Criterion C-57d8e403 (durable-runtime › A launch that cannot succeed fails with a stable code and leaves nothing behind › Refusals): accept as satisfied? |
| Q-007 | answered | none | verdict | Criterion C-5d9b866b (durable-runtime › Workflows are registered before launch under a checked name › Registration rules): accept as satisfied? |
| Q-008 | answered | none | verdict | Criterion C-e0745e1c (durable-runtime › A workflow id runs once, and status and cancel report it › Once per id, status, cancel): accept as satisfied? |
| Q-009 | answered | none | verdict | Criterion C-706487fb (durable-runtime › Steps are observed, retried only on request, and need a workflow › Steps and durable calls): accept as satisfied? |
| Q-010 | answered | none | verdict | Criterion C-c27b0f1a (durable-runtime › Row-level security holds inside durable steps › Two tenants in steps): accept as satisfied? |
| Q-011 | answered | none | verdict | Criterion C-c37d6095 (durable-runtime › main launches the runtime after the routes and closes it before the database › When it launches and the close order): accept as satisfied? |
| Q-012 | answered | none | verdict | Criterion C-073558f4 (durable-runtime › main launches the runtime after the routes and closes it before the database › A failed launch and the unchanged health): accept as satisfied? |
| Q-013 | answered | none | verdict | Criterion C-77ae2063 (durable-runtime › Only src/durable imports DBOS and only src/durable and src/runs name its schema › Rule fixtures and the real tree): accept as satisfied? |
| Q-014 | answered | none | verdict | Criterion C-2c0ae21b (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Hook order and failure): accept as satisfied? |
| Q-015 | answered | none | verdict | Criterion C-769418cc (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Ready, late, failed): accept as satisfied? |
| Q-016 | answered | none | verdict | Criterion C-7732f592 (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Three resets under the live engine, then the close): accept as satisfied? |
| Q-017 | open | none | verdict | Hold H-bfb6e7a2: the judge's reply was discarded (part 1 of 2, timeout: no answer within 600s) |
<!-- l4:index:end -->

---

## Q-001: test/support/e2e-stack/durable-part.test.ts:379 keeps a template pool open before databasePart.seed

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.2
- **Kind:** technical
- **Asked:** 2026-11-03T08:46Z by deepseek-free, run r-20261103T0741Z-7374, task 5.2

### Context
The test opens templatePool against ursitoare_e2e_template at :362, queries it at :366 and :374, then calls databasePart.seed at :379. databasePart.seed runs CREATE DATABASE ... TEMPLATE "ursitoare_e2e_template", which PostgreSQL refuses with SQLSTATE 55006 while another session is connected; the test's own idle pool session is that other session, so it fails with "source database ursitoare_e2e_template is being accessed by other users". test-plan.md orders databasePart.seed before durablePart.start in the null-runtime fixture, and the design only requires durablePart.start to prepare the template and leave no ursitoare-durable session; no part implementation can close a pool the test opens after durablePart.start returns.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/e2e-stack/durable-part.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-dbos-runtime`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/support/e2e-stack/durable-part.test.ts`: after the `sessions.rows[0]?.count` assertion at line 377 and before the `databasePart.seed` call at line 379, insert `await templatePool.end(); templatePool = undefined;`.
2. Edit `test/support/e2e-stack/durable-part.test.ts`: move the `databasePart.seed` call before the `databasePart.start`/`durablePart.start` block and use the template pool check only after that seed.

### Clarifier suggestion
Edit `test/support/e2e-stack/durable-part.test.ts`: after the `sessions.rows[0]?.count` assertion at line 377 and before the `databasePart.seed` call at line 379, insert `await templatePool.end(); templatePool = undefined;`.

### Answer
<!-- write below this line -->

---

## Q-002: test/support/e2e-stack/durable-part.test.ts:395 queries a nonexistent dbos.workflow_status column

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.2
- **Kind:** technical
- **Asked:** 2026-11-03T08:58Z by deepseek-free, run r-20261103T0849Z-634b, task 5.2

### Context
The assertion runs `SELECT count(*) FROM dbos.workflow_status WHERE workflow_name = 'stack.ready'`. DBOS 5.3.0's system schema stores the workflow name in the `name` column (its migration creates workflow_status(workflow_uuid, status, name, ...); the other suites filter by workflow_uuid, application_version and queue_name). The query therefore fails with SQLSTATE 42703 `column "workflow_name" does not exist` before the assertion executes, regardless of the durable part's behaviour; the scenario only requires that the e2e database holds no stack.ready row.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/e2e-stack/durable-part.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-dbos-runtime`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/support/e2e-stack/durable-part.test.ts`: replace `WHERE workflow_name = 'stack.ready'` with `WHERE name = 'stack.ready'` in the query at line 395.
2. Keep the test query unchanged and add a workflow_name alias to dbos.workflow_status during durablePart.start (not recommended; it would write outside DBOS.migrate).

### Clarifier suggestion
Edit `test/support/e2e-stack/durable-part.test.ts`: replace `WHERE workflow_name = 'stack.ready'` with `WHERE name = 'stack.ready'` in the query at line 395.

### Answer
<!-- write below this line -->

---

## Q-003: Criterion C-25c32649 (durable-runtime › The owner prepares the DBOS schema and the engine never does › Prepare, repeat, refuse): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-25c32649 (durable-runtime › The owner prepares the DBOS schema and the engine never does › Prepare, repeat, refuse)

### Context
Criterion C-25c32649 (durable-runtime › The owner prepares the DBOS schema and the engine never does › Prepare, repeat, refuse) is needs human after round 1.

Scenario:
\- **WHEN** `prepareDurable(db.ownerUrl)` runs twice on `withTestDatabase({ migrated: false })`, then with the four bad URLs of test-plan.md, `other.appUrl` of a second such database and an owner URL on a closed port; `withTestDatabase()` clones
\- **THEN** after the first call `dbos` exists, owned by `ursitoare_owner`; `ursitoare_app` has USAGE, not CREATE, and `CREATE TABLE dbos.x (i int)` as it rejects `42501`; the second call resolves, `dbos.dbos_migrations` unchanged; the refusals are `DURABLE_INVALID bad_url` (4 times, no connection), `DURABLE_UNAVAILABLE 42501` and `migrate_failed`, no message containing `postgres://`; the default clone has `dbos.dbos_migrations`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.durable.prepare.test.ts::C-25c32649 prepareDurable creates the dbos schema and repeats as a no-op (passed, red_assertion); src.durable.prepare.test.ts::C-25c32649 prepareDurable refuses bad owner URLs and an unmigrated app role (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The two tracing tests check every clause of the scenario: after the first prepareDurable call the dbos schema exists owned by ursitoare_owner, ursitoare_app has USAGE but not CREATE and its CREATE TABLE dbos.x rejects 42501, the second call resolves with the dbos_migrations ledger unchanged, the four bad URLs of test-plan.md reject DURABLE_INVALID bad_url, other.appUrl of a second unmigrated database rejects DURABLE_UNAVAILABLE 42501, an owner URL on a free port rejects migrate_failed, every refusal's message is checked not to contain postgres://, and the default clone has dbos.dbos_migrations. The implementation parses the URL before any connection and maps a DBOS.migrate failure to the SQLSTATE or migrate_failed with a fixed message. Both tests passed.
---

## Q-004: Criterion C-da1b0c83 (durable-runtime › The runtime connects with the endpoint it is given and never migrates › A prepared database): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-da1b0c83 (durable-runtime › The runtime connects with the endpoint it is given and never migrates › A prepared database)

### Context
Criterion C-da1b0c83 (durable-runtime › The runtime connects with the endpoint it is given and never migrates › A prepared database) is needs human after round 1.

Scenario:
\- **WHEN** `dbosConfig` and `dbosLogger` are called on the fixtures of test-plan.md; `launchDurable({ endpoint: db.appEndpoint, logger })` runs on a prepared clone with a capturing debug logger; the owner reads `pg_stat_activity` and `dbos.application_versions`; the admin connection then runs `pg_terminate_backend` on the `ursitoare-durable` sessions
\- **THEN** `dbosConfig` gives `runMigrations` false, `enableOTLP` false, `name` `ursitoare`, `systemDatabaseSchemaName` `DBOS_SCHEMA`, `applicationVersion` `APPLICATION_VERSION`, the given pool and a URL with no password; `dbosLogger(log)` `info`, `debug`, `warn`, `error` call `log` at that level with `{ component: "dbos" }` and the message (`String(entry)`); `applicationVersion` is `"ursitoare-1"`; the `ursitoare-durable` sessions (at least one) are `ursitoare_app`'s; `dbos.application_versions` has `ursitoare-1`; an `info` line (level 30) has `component` `dbos`, none the password; within 5 s a line has `msg` `durable pool error`, `component` `dbos` and `code` `57P01`, none holding `terminating connection`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.durable.launch.test.ts::C-da1b0c83 prepared database gives the expected config logger sessions and pool warning (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing test asserts every clause: dbosConfig on the test-plan fixtures gives runMigrations false, enableOTLP false, name ursitoare, systemDatabaseSchemaName dbos, applicationVersion ursitoare-1, the given pool and a URL whose parsed password is empty; dbosLogger routes info, debug, warn and error to the logger at that level with { component: "dbos" } and String(entry), including Error: boom; after a real launch on a prepared clone the runtime's applicationVersion is ursitoare-1, at least one ursitoare-durable session exists and all of them belong to ursitoare_app, dbos.application_versions holds ursitoare-1, an info line at level 30 has component dbos, no line holds the app password, and after the admin terminates the sessions a warning with msg durable pool error, component dbos and code 57P01 appears within 5 s with no line holding the driver text. The implementation builds exactly that config, logs the pool error with only its code, and redacts pg error text in DBOS's own log lines so the driver message never reaches the log. The test passed.
---

## Q-005: Criterion C-cb0c606e (durable-runtime › The runs queue is registered after every launch › Launch, lose the rows, launch again): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-cb0c606e (durable-runtime › The runs queue is registered after every launch › Launch, lose the rows, launch again)

### Context
Criterion C-cb0c606e (durable-runtime › The runs queue is registered after every launch › Launch, lose the rows, launch again) is needs human after round 1.

Scenario:
\- **WHEN** a runtime `rt` is launched with `pollingIntervalMs` 20, `concurrency` 3, a capturing `logger`, the test-only `closePool` and the ten steps of test-plan.md § Queue sequence run
\- **THEN** the first read has one row `runs`, `worker_concurrency` 3, `polling_interval_sec` 0.02 (±1e-9); `suspendDurable()` resolves `rt`; the step-3 calls reject `DURABLE_NOT_LAUNCHED suspended`; the step-4 resume rejects `launch_failed`, `rt.status("x")` stays `suspended`; `resumeDurable()` resolves `rt`, then `null`; the row is back, `after-reset` succeeds; both `shutdown()` calls resolve; the step-7 calls reject `DURABLE_NOT_LAUNCHED shut_down`; the capture has exactly two `durable shutdown failed` warnings, no `boom`; after the second launch the row holds the defaults 4 and 0.05 and `resumeDurable()` gives `null`; the concurrent `enqueue` rejects `DURABLE_NOT_LAUNCHED suspended`, the others resolve `rt2`, `rt2`, `undefined`; `rt2.status("x")` rejects `shut_down`; the unawaited `rt3.enqueue` (step 10) resolves and its `d-drain` row exists; within 5 s no `ursitoare-durable` session is left

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.durable.queue.test.ts::C-cb0c606e launch suspend resume and shutdown keep the runs queue (passed, pre_satisfied)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing test runs the ten steps of the queue sequence and asserts each THEN clause: the runs row with worker_concurrency 3 and polling_interval_sec 0.02 within 1e-9, suspendDurable resolving the same handle, the three calls rejecting DURABLE_NOT_LAUNCHED suspended, the resume on an emptied ledger rejecting launch_failed with status still suspended, resumeDurable resolving the handle then null, the row back and after-reset reaching SUCCESS, two concurrent shutdowns resolving, the three calls then rejecting shut_down, exactly two durable shutdown failed warnings and no boom text, the relaunch row with defaults 4 and 0.05 and resumeDurable null, the concurrent enqueue rejecting suspended while suspend, resume and shutdown resolve rt2, rt2 and undefined with no y row, rt2.status rejecting shut_down, the unawaited rt3.enqueue resolving with its d-drain row, and no ursitoare-durable session within 5 s. The implementation serialises lifecycle calls through one chain, makes handle calls wait for pending lifecycle calls, and makes shutdown and suspend settle in-flight calls before closing DBOS and the pool, with each close failure logged once. The test passed; its pre_satisfied marker reflects that the lifecycle code already existed when the test was added, not a gap in the criterion.
---

## Q-006: Criterion C-57d8e403 (durable-runtime › A launch that cannot succeed fails with a stable code and leaves nothing behind › Refusals): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-57d8e403 (durable-runtime › A launch that cannot succeed fails with a stable code and leaves nothing behind › Refusals)

### Context
Criterion C-57d8e403 (durable-runtime › A launch that cannot succeed fails with a stable code and leaves nothing behind › Refusals) is needs human after round 1.

Scenario:
\- **WHEN** `launchDurable` runs the twelve calls of test-plan.md § Refusal sequence, in order
\- **THEN** the rejections are `DURABLE_UNAVAILABLE not_prepared`, `DURABLE_INVALID bad_option` twice (`details.option` `concurrency`, `pollingIntervalMs`), `DURABLE_INVALID` `bad_endpoint` twice, `password_in_url`, then `DURABLE_UNAVAILABLE` `config_failed`, `launch_failed` (closed port), `launch_failed` (ledger emptied), `queue_failed`; after the first, eighth, ninth, tenth no `ursitoare-durable` session is left within 5 s; after the tenth `dbos.workflow_status` is empty and `dbos.queues` has only the foreign row; the eleventh resolves; the twelfth rejects `DURABLE_ALREADY_LAUNCHED running`; its runtime answers `status("none")` `null`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.durable.launch.test.ts::C-57d8e403 launchDurable refuses bad options endpoints and databases (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing test runs the twelve launchDurable calls of the refusal sequence in order and asserts each rejection: not_prepared, bad_option with details.option concurrency then pollingIntervalMs, bad_endpoint for the mysql scheme and the missing database path, password_in_url, config_failed for the foo query parameter, launch_failed on the closed port, launch_failed on the emptied ledger, queue_failed on the foreign runs row; it asserts zero ursitoare-durable sessions within 5 s after the first, eighth, ninth and tenth calls, an empty dbos.workflow_status and only the foreign queue row after the tenth, that the eleventh resolves, that the twelfth rejects DURABLE_ALREADY_LAUNCHED running, and that status("none") is null. The implementation checks options, then state, then the endpoint URL, maps a createPool throw to config_failed, a preflight null to not_prepared, DBOS failures to launch_failed or queue_failed, and ends the pool on every failure; createPool rejects a query parameter other than sslmode. The test passed.
---

## Q-007: Criterion C-5d9b866b (durable-runtime › Workflows are registered before launch under a checked name › Registration rules): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-5d9b866b (durable-runtime › Workflows are registered before launch under a checked name › Registration rules)

### Context
Criterion C-5d9b866b (durable-runtime › Workflows are registered before launch under a checked name › Registration rules) is needs human after round 1.

Scenario:
\- **WHEN** `registerWorkflow("t.count", f)` runs twice, then with `g`, then `("Bad Name", f)`, `("a".repeat(65), f)`; `launchDurable(...)` is called unawaited and `registerWorkflow("t.late2", f)` runs; after it resolves, `registerWorkflow("t.late", f)` and `rt.enqueue("t.unknown", "w-u", null)` run
\- **THEN** the first two return `undefined`; the third throws `DURABLE_INVALID name_taken` and the next two `bad_name`; `t.late2`, `t.late` throw `DURABLE_ALREADY_LAUNCHED running`; the enqueue rejects `DURABLE_WORKFLOW_UNKNOWN not_registered`, leaving no `w-u` row

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.durable.workflows.test.ts::C-5d9b866b registerWorkflow checks names and refuses late registration (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing test asserts every clause: registerWorkflow("t.count", f) twice returns undefined, the same name with another function throws DURABLE_INVALID name_taken, "Bad Name" and a 65-character name throw bad_name, registering t.late2 while launchDurable is pending and t.late after it resolved both throw DURABLE_ALREADY_LAUNCHED running, and enqueue of the unregistered t.unknown rejects DURABLE_WORKFLOW_UNKNOWN not_registered leaving no w-u row in dbos.workflow_status. The registry checks launchBusy, which is true while a launch is queued or a runtime runs, validates the name against the specified pattern, ignores a repeat of the same function and refuses another function under a known name; enqueue checks the registry before any DBOS call. The test passed.
---

## Q-008: Criterion C-e0745e1c (durable-runtime › A workflow id runs once, and status and cancel report it › Once per id, status, cancel): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-e0745e1c (durable-runtime › A workflow id runs once, and status and cancel report it › Once per id, status, cancel)

### Context
Criterion C-e0745e1c (durable-runtime › A workflow id runs once, and status and cancel report it › Once per id, status, cancel) is needs human after round 1.

Scenario:
\- **WHEN** a runtime is launched with `concurrency` 1 and the eight steps of test-plan.md § Once-per-id sequence run
\- **THEN** `status("w-gate")` is `{ workflowId: "w-gate", workflow: "t.gate", state: "PENDING" }`, `status("w-1")` `ENQUEUED`, then `CANCELLED`; `cancel("never")` resolves, `status("never")` `null`; `w-gate`, `w-2` succeed; the counter is 1; the `w-2` row has `application_version` `ursitoare-1`, `queue_name` `runs`; `w-park` is `CANCELLED` before and after its promise opens, `two` never ran; `isDurableCancellation` is true for the error `t.park` caught from `two`, false for `new Error("x")` and `{ name: "DBOSWorkflowCancelledError" }`; bad ids reject `DURABLE_INVALID bad_workflow_id`; the refused inputs of step 7 reject `bad_input`; `d-200`, `d-64`, `d-null` succeed

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.durable.workflows.test.ts::C-e0745e1c a workflow id runs once and status and cancel report it (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing test runs the eight steps of the once-per-id sequence on a runtime launched with concurrency 1 and asserts every clause: status of w-gate is exactly { workflowId: w-gate, workflow: t.gate, state: PENDING }, w-1 is ENQUEUED then CANCELLED after cancel, cancel of never resolves and its status is null, w-gate and w-2 reach SUCCESS with the counter at 1 after two enqueues of w-2, the w-2 row has application_version ursitoare-1 and queue_name runs, w-park is CANCELLED before and after its promise opens with step two never run, isDurableCancellation is true for the caught error and false for new Error and the name-only object, status, cancel and enqueue with a bad id and a 201-character id reject bad_workflow_id, the seven refused inputs reject bad_input, and d-200, d-64 and d-null reach SUCCESS. The implementation checks the registry, the id grammar and the DurableJson depth rule before calling enqueueWorkflowWithOptions with queue runs, the application version and return-existing, maps DBOS status and cancel, and recognises cancellation by instanceof. The test passed by assertion.
---

## Q-009: Criterion C-706487fb (durable-runtime › Steps are observed, retried only on request, and need a workflow › Steps and durable calls): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-706487fb (durable-runtime › Steps are observed, retried only on request, and need a workflow › Steps and durable calls)

### Context
Criterion C-706487fb (durable-runtime › Steps are observed, retried only on request, and need a workflow › Steps and durable calls) is needs human after round 1.

Scenario:
\- **WHEN** a runtime is launched with a recording `stepObserver`; the workflows `t.steps`, `t.retry`, `t.once`, `t.names`, `t.bad` and `t.drop` (test-plan.md) are enqueued in that order and awaited; `runStep`, `durableSleep(1)`, `currentWorkflowId()` run outside a workflow; after `t.drop`, `rt.status`, `rt.cancel`, `rt.enqueue` run
\- **THEN** the observer calls for `t.steps` are exactly `[["before","a",id],["after","a",id],["before","b",id],["after","b",id]]` (`id` the enqueue id and `currentWorkflowId()`), the sleep took 900 to under 5000 ms; `flaky` ran 3 times, returned 7, with one `before` and `after`; `always` ran once, `t.once` caught `e1` itself; in `t.bad`, `bad` is `bad_step_result` with no `after`, the three names `bad_step_name`, the other two `bad_option`; the `t.names` steps ran in order; outside a workflow the three give `DURABLE_NOT_LAUNCHED outside_workflow`; the `t.drop` `runStep`, its `durableSleep` and the three calls reject `DURABLE_UNAVAILABLE dbos_failed`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.durable.steps.test.ts::C-706487fb steps are observed retried only on request and need a workflow (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing test launches with a recording stepObserver, runs t.steps, t.retry, t.once, t.names, t.bad and t.drop in that order and asserts every clause: the observer calls for s-steps are exactly before a, after a, before b, after b with the enqueue id, currentWorkflowId equals the enqueue id, the durable sleep took 900 to under 5000 ms, flaky ran 3 times and returned 7 with one before and one after, always ran once and t.once caught e1 itself, the t.names steps ran in order, in t.bad the bad step is bad_step_result with no after, the three names are bad_step_name and the retries and sleep options are bad_option, runStep, durableSleep and currentWorkflowId outside a workflow give DURABLE_NOT_LAUNCHED outside_workflow, and after the schema drop the runStep, the durableSleep and the status, cancel and enqueue calls reject DURABLE_UNAVAILABLE dbos_failed. The implementation validates the name and retries, requires a workflow, runs the observer before and after inside one DBOS step, retries only while retryable allows, passes the callback's own error and DBOS's cancellation unchanged and maps other SDK failures to dbos_failed. The test passed by assertion.
---

## Q-010: Criterion C-c27b0f1a (durable-runtime › Row-level security holds inside durable steps › Two tenants in steps): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-c27b0f1a (durable-runtime › Row-level security holds inside durable steps › Two tenants in steps)

### Context
Criterion C-c27b0f1a (durable-runtime › Row-level security holds inside durable steps › Two tenants in steps) is needs human after round 1.

Scenario:
\- **WHEN** `seedTwoTenants(db)` runs, the owner creates the probe table (test-plan.md), a runtime is launched on `db.appEndpoint` and `t.read` is enqueued as `r-a`, `r-b`, `r-none` with `tenantId` `tenant_a`, `tenant_b`, null and `userId` `u1`, each awaited to `SUCCESS`
\- **THEN** the map entries `r-a`, `r-b`, `r-none` have `ids` `["tenant_a"]`, `["tenant_b"]` and `[]`, and every `user` is `ursitoare_app`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.durable.rls.test.ts::C-c27b0f1a row level security holds inside durable steps (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing test seeds two tenants, has the owner create the ursitoare.rls_probe table with the two rows, forced row-level security, the tenant policy and the SELECT grant to the app role, launches the runtime on db.appEndpoint, enqueues t.read as r-a, r-b and r-none with tenantId tenant_a, tenant_b and null and userId u1, awaits each to SUCCESS and asserts the map entries are ids [tenant_a], [tenant_b] and [] with user ursitoare_app in every case. The workflow reads inside a runStep through withTenantTx for a tenant and through the plain app pool for null. The test passed by assertion.
---

## Q-011: Criterion C-c37d6095 (durable-runtime › main launches the runtime after the routes and closes it before the database › When it launches and the close order): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-c37d6095 (durable-runtime › main launches the runtime after the routes and closes it before the database › When it launches and the close order)

### Context
Criterion C-c37d6095 (durable-runtime › main launches the runtime after the routes and closes it before the database › When it launches and the close order) is needs human after round 1.

Scenario:
\- **WHEN** `main` runs with the fakes of test-plan.md, for the roles `all`, `worker`, `api`, `sandbox` with `database.app` an endpoint `E`, and for `all` with `database.app` null; then the first server gets `SIGTERM`
\- **THEN** the fake is called once each for `all` and `worker`, with exactly `{ endpoint: E, logger }` (`endpoint === E`), and never for `api`, `sandbox` or the null endpoint; after `SIGTERM` the records are `["durable.shutdown", "database.close"]` and `exit` got `0`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.main.durable.test.ts::C-c37d6095 main launches the runtime only for the all and worker roles and closes it before the database (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing test runs main with the fakes of the test plan for the roles all, worker, api and sandbox with an endpoint E and for all with a null endpoint, then sends SIGTERM. It asserts the fake launch is called exactly once for all and for worker, with options whose keys are exactly endpoint and logger, with endpoint identical to E and a logger, never for api, sandbox or the null endpoint, that the records after SIGTERM are durable.shutdown then database.close, and that exit got 0. In main the launch runs after the routes and the internal server, before closeAll and the listener, only when the database, the app endpoint and the role all or worker are present, and closeAll shuts the runtime down before closing the database. The test passed by assertion.
---

## Q-012: Criterion C-073558f4 (durable-runtime › main launches the runtime after the routes and closes it before the database › A failed launch and the unchanged health): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-073558f4 (durable-runtime › main launches the runtime after the routes and closes it before the database › A failed launch and the unchanged health)

### Context
Criterion C-073558f4 (durable-runtime › main launches the runtime after the routes and closes it before the database › A failed launch and the unchanged health) is needs human after round 1.

Scenario:
\- **WHEN** `main` runs with the real `launchDurable` and a capturing log destination on a clone whose `dbos` schema the owner dropped (`DROP SCHEMA dbos CASCADE`), then on an intact clone where `/health` and the `ursitoare-durable` sessions are read and the test calls `launchDurable` while it runs and after `close()`; and once more on an intact clone with the listener port held by another listener
\- **THEN** the first resolves `null`, `exit` got `1` once, the destination holds exactly one fatal line (`DURABLE_UNAVAILABLE`, `startup failed`, `not_prepared`); for the second `/health` is 200 with `checks` `{ db: "ok" }`, every `ursitoare-durable` session is `ursitoare_app`'s, and the test's launch rejects `DURABLE_ALREADY_LAUNCHED` while `main` runs, resolves after `close()`; for the third `main` resolves `null`, `exit` got `1`, the fatal line has `code` `EADDRINUSE`, within 5 s no `ursitoare-durable` session is left and the test's launch resolves

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.main.durable.test.ts::C-073558f4 main launches as the app role, keeps health unchanged, fails without the schema and closes after a listen failure (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing test runs main with the real launchDurable three times. On a clone whose dbos schema the owner dropped it asserts main resolves null, exit got 1 once and exactly one fatal line holds code DURABLE_UNAVAILABLE, msg startup failed and reason not_prepared, with no URL in any line. On an intact clone it asserts /health answers 200 with checks exactly { db: ok }, that at least one ursitoare-durable session exists and every one belongs to ursitoare_app, that a launch from the test rejects DURABLE_ALREADY_LAUNCHED running while main runs and resolves after close. On an intact clone with the port held by a node:net listener it asserts main resolves null, exit got 1, the fatal line has code EADDRINUSE, no ursitoare-durable session is left within 5 s and the test's launch then resolves. main's launch failure path closes the servers and the database and writes one fatal line, and a listen failure goes through closeAll which shuts the runtime down. The test passed by assertion.
---

## Q-013: Criterion C-77ae2063 (durable-runtime › Only src/durable imports DBOS and only src/durable and src/runs name its schema › Rule fixtures and the real tree): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-77ae2063 (durable-runtime › Only src/durable imports DBOS and only src/durable and src/runs name its schema › Rule fixtures and the real tree)

### Context
Criterion C-77ae2063 (durable-runtime › Only src/durable imports DBOS and only src/durable and src/runs name its schema › Rule fixtures and the real tree) is needs human after round 1.

Scenario:
\- **WHEN** `checkDbosAccess(snapshotOf(files))` runs on the rule fixtures `src/api/a.ts` to `f.ts` and the allowed `g.ts`, `h.ts`, `i.test.ts`, `j.ts` (test-plan.md); then on `readSnapshot()`; `package.json` is read
\- **THEN** the violations are exactly `ARCH_DBOS_ACCESS` at line 1 of `a.ts` to `f.ts` in order, with the SDK message for `a.ts`-`c.ts` and the schema message for `d.ts`-`f.ts` (test-plan.md); the real tree has none; `dependencies["@dbos-inc/dbos-sdk"]` is `"5.3.0"`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: test.arch.dbos-access.test.ts::C-77ae2063: SDK imports and schema names outside the allowed modules are violations (passed, red_assertion); test.arch.dbos-access.test.ts::C-77ae2063: the allowed forms, the real tree and the pinned SDK version pass (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The two tracing tests check every clause of the scenario. The first runs checkDbosAccess on the ten rule fixtures of test-plan.md and asserts the violations are exactly ARCH_DBOS_ACCESS at line 1 of src/api/a.ts to f.ts in that order, with the SDK message for a to c and the schema message for d to f. The second repeats that, asserts that the allowed g.ts, h.ts, i.test.ts and j.ts alone give no violation, that readSnapshot() of the real tree gives none, and that package.json pins @dbos-inc/dbos-sdk at 5.3.0. The rule skips test files, flags any collectImports specifier equal to or under the SDK package outside src/durable, and outside src/durable and src/runs flags string and template parts matching the design's schema regex and the identifier DBOS_SCHEMA, sorted by file and line. In the real tree the SDK is imported only under src/durable and dbos. or DBOS_SCHEMA appear only there; package.json line 33 pins 5.3.0. Both tests passed by assertion.
---

## Q-014: Criterion C-2c0ae21b (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Hook order and failure): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-2c0ae21b (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Hook order and failure)

### Context
Criterion C-2c0ae21b (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Hook order and failure) is needs human after round 1.

Scenario:
\- **WHEN** fake parts `p1`, `p2`, `p3` record `hook:<name>` and `seed:<name>` (`p2` has no hook); `seedAll()` then `reset()` run; `p3`'s hook rejects and `reset()` runs; then it is fixed and `reset()` runs; and a registry registers a part with `beforeReset: "x"`
\- **THEN** the log after `seedAll()` is `seed:p1, seed:p2, seed:p3`; one reset adds `hook:p3, hook:p1, seed:p1, seed:p2, seed:p3`; the failing reset rejects `STACK_RESET_FAILED` (`details.part` `p3`), adding no `hook:p1` or `seed:`; the next passes; registering it throws `STACK_PART_INVALID`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: test.support.e2e-stack.reset.hooks.test.ts::C-2c0ae21b beforeReset hooks run in reverse part order before the seeds and a failed hook rejects STACK_RESET_FAILED naming the part (passed, red_assertion); test.support.e2e-stack.reset.hooks.test.ts::C-2c0ae21b registry refuses a part whose beforeReset is not a function (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing tests cover the whole scenario. The first builds fake parts p1, p2, p3 that record hook:<name> and seed:<name>, with p2 having no hook, and asserts that seedAll logs seed:p1, seed:p2, seed:p3 with no hook, that one reset adds hook:p3, hook:p1, seed:p1, seed:p2, seed:p3, that a reset whose p3 hook rejects fails with STACK_RESET_FAILED and details.part p3 after adding only hook:p3, and that the next reset passes with the full order again. The second asserts that a registry refuses a part whose beforeReset is the string x with STACK_PART_INVALID and leaves it unregistered. The reset runner iterates parts in reverse for the hooks before the seeds and wraps a hook failure as STACK_RESET_FAILED naming the part, and validatePart rejects a defined non-function beforeReset. Both tests passed by assertion.
---

## Q-015: Criterion C-769418cc (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Ready, late, failed): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-769418cc (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Ready, late, failed)

### Context
Criterion C-769418cc (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Ready, late, failed) is needs human after round 1.

Scenario:
\- **WHEN** `checkDurableReady(fake, opts)` runs with a clock that `sleep` advances, `workflowId` `ready-1`, against a fake whose `status` answers `ENQUEUED, ENQUEUED, SUCCESS` (`pollMs` 100); always `ENQUEUED` with `timeoutMs` 5000 and `pollMs` 100, and with neither (defaults 5000, 20); `ERROR`; a fake whose `enqueue` rejects with `err`; the five bad options and the three dependency failures of test-plan.md; and, on a started database part with no engine, `durablePart.start`, `beforeReset`, `seed`, `close` run
\- **THEN** the first resolves after one `enqueue("stack.ready", "ready-1", "ping")`, 3 `status`, 2 `sleep(100)`; the second rejects `STACK_DURABLE_NOT_READY` with `details.state` `ENQUEUED` after 51 `status` and 50 `sleep(100)`, and with the defaults after 251 `status` and 250 `sleep(20)`; the third at once with `ERROR`; the fourth with `err` itself; `err2` after 2 `status` and 1 `sleep`, `err3` and `err4` as themselves; the bad options reject `bad_option` with no `enqueue`; the four part calls resolve and `ursitoare_e2e` holds no `stack.ready` row

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady defaults to a 5000 ms timeout and a 20 ms poll (passed, red_assertion); test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady enqueues the ready workflow and resolves once it succeeds (passed, red_assertion); test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady lets an enqueue rejection propagate unchanged (passed, red_assertion); test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady lets status, sleep and clock failures propagate unchanged (passed, red_assertion); test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady refuses the five bad options before enqueueing (passed, red_assertion); test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady rejects STACK_DURABLE_NOT_READY with the state when the deadline passes (passed, red_assertion); test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady rejects at once with a failed workflow state (passed, red_assertion); test.support.e2e-stack.durable-part.test.ts::C-769418cc discovery lists the durable part after the catalogue (passed, red_assertion); test.support.e2e-stack.durable-part.test.ts::C-769418cc the durable part prepares the template and does nothing without a runtime (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The nine tracing tests cover every clause. With a fake clock advanced by sleep and workflowId ready-1, the success case asserts one enqueue of stack.ready with input ping, 3 status calls and 2 sleeps of 100; the always-ENQUEUED case asserts STACK_DURABLE_NOT_READY with details.state ENQUEUED after 51 status calls and 50 sleeps of 100 with timeoutMs 5000 and pollMs 100, and after 251 status calls and 250 sleeps of 20 with the defaults; ERROR rejects at once with state ERROR after one status and no sleep; an enqueue rejection propagates as err itself with no status; err2 propagates after 2 status calls and one sleep, err3 and err4 as themselves; the five bad options of test-plan.md reject bad_option with no enqueue; and on a started database part with no engine, durablePart.start prepares dbos.dbos_migrations in the template without a durable session, beforeReset, seed and close resolve, and ursitoare_e2e holds no stack.ready row. The implementation validates timeoutMs 1..60000 and pollMs 1..timeoutMs with defaults 5000 and min(20, timeoutMs) before enqueueing, polls status before each deadline check, rejects on the failed states, and lets dependency errors propagate; the part suspends in beforeReset, resumes then checks in seed, and does nothing on a null runtime. All tests passed by assertion.
---

## Q-016: Criterion C-7732f592 (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Three resets under the live engine, then the close): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-7732f592 (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Three resets under the live engine, then the close)

### Context
Criterion C-7732f592 (durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Three resets under the live engine, then the close) is needs human after round 1.

Scenario:
\- **WHEN** `startE2eStack({ port: 0, controlPort: 0, dataDir })` runs with the shipped parts, the owner reads `dbos.workflow_status` before the first reset and, with `dbos.queues` and `/health`, after each of three resets; `close()` runs with the wrapped database part (test-plan.md); a second `startE2eStack` boots, resets once, closes; `docs/testing.md` is read
\- **THEN** before the first reset there are no workflow rows; each reset answers 204 with one row (`stack.ready`, `SUCCESS`, `runs`), `dbos.queues` has `runs`, `ursitoare_e2e_template` has `dbos.dbos_migrations`, and `/health` is 200 with `checks` exactly `{ db: "ok" }`; the wrapped close saw 0 sessions, `resumeDurable()` gives `null`; the second boot starts (no `name_taken`), its reset answers 204 with one `stack.ready` row; `docs/testing.md` contains `A reset discards every durable workflow`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: test.support.e2e-stack.stack.durable.test.ts::C-7732f592 three resets under the live engine then the close (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The tracing test boots the stack with the shipped parts, the database part wrapped so its close records the ursitoare-durable session count polled for up to 5 s, and asserts that dbos.workflow_status is empty before the first reset; that each of three resets answers 204 and leaves exactly one row with name stack.ready, status SUCCESS and queue_name runs, that dbos.queues holds runs, that ursitoare_e2e_template has dbos.dbos_migrations, and that /health is 200 with checks exactly { db: ok }; that after close the wrapped close saw 0 sessions and resumeDurable() gives null; that docs/testing.md contains the reset bullet; and that a second boot in the same process starts, answers 204 to a reset and holds one stack.ready row. The stack starts the parts before main launches the engine in-process, so the module-level registration flag prevents name_taken on the second boot, and parts close in reverse order after the engine. The docs bullet is present. The test passed by assertion.
---

## Q-017: Hold H-bfb6e7a2: the judge's reply was discarded (part 1 of 2, timeout: no answer within 600s)

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The hold records that the judge's reply for part 1 of 2 of the diff was discarded on timeout, so the judge never reviewed that part. The hold names no files, so I cannot identify which part of the diff went unreviewed or read one of its files to cite, which the rules require before accepting such a
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: the judge's reply was discarded (part 1 of 2, timeout: no answer within 600s)

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
