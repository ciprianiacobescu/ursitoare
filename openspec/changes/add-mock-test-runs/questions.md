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
| Q-001 | open | 1.1, 1.2, 2.1, 2.2, 3.1, 4.1, 4.2, 5.1 | ambiguous | Scenarios "Bind order, the route table and a run on DBOS" and "The route table, the document and the wiring" conflict |
<!-- l4:index:end -->

---

## Q-001: Scenarios "Bind order, the route table and a run on DBOS" and "The route table, the document and the wiring" conflict

- **Status:** open
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
