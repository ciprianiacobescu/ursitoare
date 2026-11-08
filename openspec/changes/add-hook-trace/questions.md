# Questions — add-hook-trace

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
| Q-001 | open | 2.1 | technical | src/api/run-hooks.test.ts:383 expects the served OpenAPI properties in declaration order |
<!-- l4:index:end -->

---

## Q-001: src/api/run-hooks.test.ts:383 expects the served OpenAPI properties in declaration order

- **Status:** open
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-11-08T04:11Z by claude-sonnet, run r-20261108T0223Z-25d1, task 2.1

### Context
The test parses the text returned by `servedOpenApiText()`, which passes through `renderOpenApi` in `src/api/openapi.ts`. That function sorts every object's keys alphabetically, and the committed `docs/api/openapi.json` is sorted the same way (the test's own equality assertion on line 349 confirms it). So `Object.keys(stepProperties)` is alphabetical and can never equal `[...STEP_VIEW_KEYS, "hooks"]`. Changing `renderOpenApi` would reorder the whole document and break the committed file and other tests. The `required` array check on line 376 is fine, because arrays keep their order.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/run-hooks.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-hook-trace`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/run-hooks.test.ts`: at lines 383-387, compare `[...Object.keys(stepProperties)].sort()` with `[...STEP_VIEW_KEYS, "hooks"].sort()`, since the served document sorts keys alphabetically.

### Clarifier suggestion
Edit `src/api/run-hooks.test.ts`: at lines 383-387, compare `[...Object.keys(stepProperties)].sort()` with `[...STEP_VIEW_KEYS, "hooks"].sort()`, since the served document sorts keys alphabetically.

### Answer
<!-- write below this line -->
