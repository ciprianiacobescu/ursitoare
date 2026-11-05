# Questions — add-mock-test-runs

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
| Q-001 | answered | 1.1, 1.2, 2.1, 2.2, 3.1, 4.1, 4.2, 5.1 | ambiguous | Scenarios "Bind order, the route table and a run on DBOS" and "The route table, the document and the wiring" conflict |
| Q-002 | accepted | 4.1 | technical | src/api/test-run-routes.test.ts:160 runCount cannot see run rows under forced RLS |
| Q-003 | open | 5.1 | technical | src/main.mockruns.test.ts:197 session created with fixedClock but main uses systemClock |
<!-- l4:index:end -->

---

## Q-001: Scenarios "Bind order, the route table and a run on DBOS" and "The route table, the document and the wiring" conflict

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1, 1.2, 2.1, 2.2, 3.1, 4.1, 4.2, 5.1
- **Kind:** ambiguous
- **Asked:** intake lint (L4-ODD-004)
- **Criteria:** C-28603f65 (flow-testing › The engine binds the interpreter before it launches the runtime › Bind order, the route table and a run on DBOS), C-6b84132d (runs-api › The routes are session routes under the run actions and are wired into the engine › The route table, the document and the wiring)

### Context
These two scenarios have the same GIVEN and WHEN and different THEN, so the implementer cannot satisfy both.
- flow-testing › The engine binds the interpreter before it launches the runtime › Bind order, the route table and a run on DBOS (specs/flow-testing/spec.md:68)
  WHEN `main` starts with no database and `inspectServers`, and `docs/api/openapi.json` is parsed;
  THEN starts with `openDatabase` returning `{ appPool: db.appPool, close }`, `database.app` `db.appEndpoint`, role `all`, wrappers around `registerRunWorkflow`, `bindInterpreter` and the real `launchDurable` that append their names to `order` (the last also keeps the runtime it returns), and alice posts the validated version with `MOCKS` and `PAY_ONCE_INPUT` and `waitForRun` resolves the first server defines `POST /api/v1/flows/:flowId/versions/:hash/test` with action `test_flow`, auth `session` and `errors` containing `RUNS_UNAVAILABLE`, `TEST_MOCK_INVALID`, `TEST_MOCK_MISSING`, `OPERATION_REFUSED`, `IDEMPOTENCY_KEY_REUSED`, `IDEMPOTENCY_IN_PROGRESS`, `NOT_FOUND` and `VALIDATION_FAILED`; `unregisteredRouteErrors` over its routes is `[]`; the document holds the path `/api/v1/flows/{flowId}/versions/{hash}/test`; in the second run `order` is exactly `["registerRunWorkflow", "bindInterpreter", "launchDurable"]`, the deps given to `bindInterpreter` have `durable` `null`, the answer is 202, the run becomes `completed` with `terminalNode` `done` and its `pay` intent is `done` with mode `mock`, the kept runtime's `status(workflowIdOf("tenant_a", <id>))` is `SUCCESS` (the endpoint answered at once after `main` resolved, with the launched runtime); `invokerFor("live", run)` and `invokerFor("stub", run)` of the deps given to `bindInterpreter` reject `INTERPRETER_NO_INVOKER`
- runs-api › The routes are session routes under the run actions and are wired into the engine › The route table, the document and the wiring (openspec/specs/runs-api/spec.md:84)
  WHEN `main` starts with no database and `inspectServers`, and `docs/api/openapi.json` is parsed;
  THEN `main` starts again with `openDatabase` returning `{ appPool: db.appPool, close }` of a seeded test database, `database.app` set to `db.appEndpoint`, `launchDurable` a fake recording its calls and returning a runtime with a recording `cancel`, and alice (a `systemClock` session) posts a cancel of `run-1` to the public server with `inject` the public server of the first run defines exactly `GET /api/v1/runs read_run`, `GET /api/v1/runs/:runId read_run`, `GET /api/v1/runs/:runId/steps read_run`, `GET /api/v1/runs/:runId/payloads/:sha256 read_run`, `POST /api/v1/runs/:runId/cancel debug_run`, each with auth `session` and the `errors` of design.md § Interfaces, and no `POST /api/v1/runs`; `unregisteredRouteErrors` over the routes is `[]`; the document holds the five paths with `{runId}` and `{sha256}`; in the second run the answer is 202, the fake runtime's `cancel` got exactly `["tenant_a:run-1"]`, and the stored run is `cancelled`
Which behaviour is wanted? Answer below and set Status to answered. If one scenario is wrong, delete it from the spec on this unit branch in the same commit; a change on the base branch does not reach this unit.

### Answer
<!-- write below this line -->
There is no conflict: both scenarios are wanted and neither is deleted. They share only the opening setup (main with no database and inspectServers, and the parsed OpenAPI document); their WHENs then diverge (the flow-testing one starts main a second time with the recording wrappers and the real launchDurable, the runs-api one with a fake launchDurable and a cancel) and their THENs concern disjoint route families. The runs-api "defines exactly" the five run routes is scoped to the routes under /api/v1/runs, as the existing test src/main.runs.test.ts applies it: it filters the public routes to /api/v1/runs and /api/v1/runs/ before counting five, and the test route POST /api/v1/flows/:flowId/versions/:hash/test is not among them. The flow-testing THEN concerns that test route under /api/v1/flows, and this unit's modified flow-registry requirement already states that main's public server defines the seven flow routes and one more, the test route. So one route table of the first main run satisfies both: the five run routes, the eight flow routes (seven plus test), no POST /api/v1/runs, unregisteredRouteErrors [], and a document holding all paths. Implement design.md Decision 7 as written: the bind block before U30's launchDurable call, registerTestRunRoutes directly after registerRunRoutes (which src/main.ts already registers after the launch and before the listener binds), in every case, with interpreter null when no runtime was launched. Both scenarios then pass against the same code; the runs-api scenario keeps passing through its existing test.

---

## Q-002: src/api/test-run-routes.test.ts:160 runCount cannot see run rows under forced RLS

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-05T09:31Z by claude-sonnet, run r-20261105T0735Z-7e59, task 4.1

### Context
The test helper counts rows with `db.ownerPool.query('SELECT count(*)::int AS n FROM ursitoare.run')`. Migration 0310 sets FORCE ROW LEVEL SECURITY on `ursitoare.run` with policy `tenant_id = current_setting('app.tenant_id', true)`, so a pool with no tenant setting always counts 0. C-7c2a7a3d asserts 2 at line 270, which cannot pass whatever the implementation does. The spec says 'the owner pool counts two run rows'.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/test-run-routes.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mock-test-runs`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/test-run-routes.test.ts`: change `runCount` to count inside a transaction on `h.db.ownerPool` that first runs `SELECT set_config('app.tenant_id', 'tenant_a', true)`, or to use `withTenantTx(h.db.ownerPool, h.a, ...)`
2. Edit `src/api/test-run-routes.test.ts`: change `runCount` to count with `h.deps.store` or `runRepository.list` for tenant A

### Clarifier suggestion
Edit `src/api/test-run-routes.test.ts`: change `runCount` to count inside a transaction on `h.db.ownerPool` that first runs `SELECT set_config('app.tenant_id', 'tenant_a', true)`, or to use `withTenantTx(h.db.ownerPool, h.a, ...)`

### Answer
<!-- write below this line -->

---

## Q-003: src/main.mockruns.test.ts:197 session created with fixedClock but main uses systemClock

- **Status:** open
- **Blocking tasks:** 5.1
- **Kind:** technical
- **Asked:** 2026-11-05T10:59Z by claude-sonnet, run r-20261105T0935Z-8037, task 5.1

### Context
The test creates alice's session with `fixedClock(NOW)` (2026-11-02T10:00:00Z) and then posts to a `main` whose PEP uses `systemClock`. The session idle timeout is 1800 s, so the session is expired relative to the real clock and the POST answers 401 UNAUTHENTICATED instead of 202. `src/main.runs.test.ts` avoids this by using `systemClock` for `createTestSession`. `main` takes no clock dependency, so green cannot fix this.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/main.mockruns.test.ts`, `src/main.runs.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mock-test-runs`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/main.mockruns.test.ts`: create the session and seed with `systemClock` (as `src/main.runs.test.ts` does) instead of `fixedClock(NOW)` in the second test (line 197 `const clock = fixedClock(NOW);`)

### Clarifier suggestion
Edit `src/main.mockruns.test.ts`: create the session and seed with `systemClock` (as `src/main.runs.test.ts` does) instead of `fixedClock(NOW)` in the second test (line 197 `const clock = fixedClock(NOW);`)

### Answer
<!-- write below this line -->
