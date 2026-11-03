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
