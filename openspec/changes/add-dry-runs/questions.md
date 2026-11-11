# Questions — add-dry-runs

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
| Q-001 | accepted | 7.2 | technical | src/main.flows.test.ts:30 needs the dry-run route in FLOW_ROUTES |
| Q-002 | open | 7.2 | technical | src/main.runs.test.ts:54 needs the decisions route in RUN_ROUTES |
<!-- l4:index:end -->

---

## Q-001: src/main.flows.test.ts:30 needs the dry-run route in FLOW_ROUTES

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 7.2
- **Kind:** technical
- **Asked:** 2026-11-11T22:53Z by deepseek-free, run r-20261111T2128Z-f396, task 7.2

### Context
Design decision 8 and C-4e5e400f require main to always register POST /api/v1/flows/:flowId/versions/:hash/dry-run, and src/main.dryruns.test.ts passes with it. The frozen test src/main.flows.test.ts counts every /api/v1/flows route and asserts the list has exactly FLOW_ROUTES.length rows, so it now fails 9 !== 8. The test cannot pass unchanged while the required route exists.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/main.dryruns.test.ts`, `src/main.flows.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-dry-runs`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/main.flows.test.ts`: add `{ method: "POST", url: "/api/v1/flows/:flowId/versions/:hash/dry-run", action: "dry_run_flow", errors: ["IDEMPOTENCY_IN_PROGRESS", "IDEMPOTENCY_KEY_REUSED", "OPERATION_REFUSED", "RUNS_UNAVAILABLE", "VALIDATION_FAILED"] }` to `FLOW_ROUTES` after the `/test` row, and add `"/api/v1/flows/{flowId}/versions/{hash}/dry-run"` to `FLOW_OPENAPI_PATHS` after the `/test` path.
2. Keep the route unregistered at startup and let a later unit register it, which contradicts design decision 8 and C-4e5e400f.

### Clarifier suggestion
Edit `src/main.flows.test.ts`: add `{ method: "POST", url: "/api/v1/flows/:flowId/versions/:hash/dry-run", action: "dry_run_flow", errors: ["IDEMPOTENCY_IN_PROGRESS", "IDEMPOTENCY_KEY_REUSED", "OPERATION_REFUSED", "RUNS_UNAVAILABLE", "VALIDATION_FAILED"] }` to `FLOW_ROUTES` after the `/test` row, and add `"/api/v1/flows/{flowId}/versions/{hash}/dry-run"` to `FLOW_OPENAPI_PATHS` after the `/test` path.

### Answer
<!-- write below this line -->
---

## Q-002: src/main.runs.test.ts:54 needs the decisions route in RUN_ROUTES

- **Status:** open
- **Blocking tasks:** 7.2
- **Kind:** technical
- **Asked:** 2026-11-11T22:53Z by deepseek-free, run r-20261111T2128Z-f396, task 7.2

### Context
Design decision 8 and C-4e5e400f require main to always register GET /api/v1/runs/:runId/decisions, and src/main.dryruns.test.ts passes with it. The frozen test src/main.runs.test.ts counts every /api/v1/runs route and asserts the list has exactly RUN_ROUTES.length rows, so it now fails 6 !== 5. The test cannot pass unchanged while the required route exists.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/main.dryruns.test.ts`, `src/main.runs.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-dry-runs`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/main.runs.test.ts`: add `{ method: "GET", url: "/api/v1/runs/:runId/decisions", action: "read_run", errors: ["AUTHZ_UNAVAILABLE", "CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "FORBIDDEN", "NOT_FOUND", "RUNS_UNAVAILABLE", "UNAUTHENTICATED", "VALIDATION_FAILED"] }` to `RUN_ROUTES` after the `/cancel` row, and add `"/api/v1/runs/{runId}/decisions"` to `RUN_OPENAPI_PATHS` after the `/cancel` path.
2. Keep the route unregistered at startup and let a later unit register it, which contradicts design decision 8 and C-4e5e400f.

### Clarifier suggestion
Edit `src/main.runs.test.ts`: add `{ method: "GET", url: "/api/v1/runs/:runId/decisions", action: "read_run", errors: ["AUTHZ_UNAVAILABLE", "CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "FORBIDDEN", "NOT_FOUND", "RUNS_UNAVAILABLE", "UNAUTHENTICATED", "VALIDATION_FAILED"] }` to `RUN_ROUTES` after the `/cancel` row, and add `"/api/v1/runs/{runId}/decisions"` to `RUN_OPENAPI_PATHS` after the `/cancel` path.

### Answer
<!-- write below this line -->
