# Questions — add-api-pep

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
| Q-001 | open | 2.1 | technical | src/api/route.test.ts:75: GET /health makes the listDefinedRoutes assertion outdated |
<!-- l4:index:end -->

---

## Q-001: src/api/route.test.ts:75: GET /health makes the listDefinedRoutes assertion outdated

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: names the frozen path src/api/coverage.test.ts of task 2.1; only the clarifier suggestion may unfreeze it
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-10-29T07:31Z by deepseek-free, run r-20261029T0711Z-dbf6, task 2.1

### Context
Task 2.1 and criterion C-c31ceb04 require buildServer to register GET /health via defineRoute (public/health, schema {}, errors []), so listDefinedRoutes on a buildServer server must include the health route before the caller's /ping. The frozen test src/api/route.test.ts:75 asserts deepEqual(listDefinedRoutes(server), [the /ping route]) on a buildServer server, so it fails as soon as health is defined. Task 2.1 names only src/api/coverage.test.ts, and green may not edit route.test.ts because the test-path freeze restores it after the step.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/coverage.test.ts`, `src/api/route.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-api-pep`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/route.test.ts`: insert the health route `{ method: "GET", url: "/health", auth: { kind: "public", reason: "health" }, action: null, errors: [], schema: {}, listener: "public" }` as the first element of the `listDefinedRoutes` deepEqual at line 75, before the existing `/ping` element.
2. Edit `src/api/route.test.ts`: change the assertion at line 75 to `assert.deepEqual(listDefinedRoutes(server).filter((route) => route.url === "/ping"), [ ...the existing /ping object... ])` so the health route registered by buildServer is ignored there while coverage.test.ts keeps asserting it.

### Clarifier suggestion
Edit `src/api/route.test.ts`: insert the health route `{ method: "GET", url: "/health", auth: { kind: "public", reason: "health" }, action: null, errors: [], schema: {}, listener: "public" }` as the first element of the `listDefinedRoutes` deepEqual at line 75, before the existing `/ping` element.

### Answer
<!-- write below this line -->
