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
| Q-001 | accepted | 2.1 | technical | src/api/run-hooks.test.ts:383 expects the served OpenAPI properties in declaration order |
| Q-002 | accepted | 3.2 | technical | src/interpreter/hooks/replay.test.ts:228 asserts no hooks on a row that must now carry its hook trace |
<!-- l4:index:end -->

---

## Q-001: src/api/run-hooks.test.ts:383 expects the served OpenAPI properties in declaration order

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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

---

## Q-002: src/interpreter/hooks/replay.test.ts:228 asserts no hooks on a row that must now carry its hook trace

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.2
- **Kind:** technical
- **Asked:** 2026-11-08T05:31Z by deepseek-free, run r-20261108T0414Z-dff2, task 3.2

### Context
The frozen test 'C-c56d71ac C-9272817b a fused no-op hook leaves the pay-once steps and rows as in M4' runs pay-once with a fused post:noop hook and asserts at line 228 `assert.deepEqual(hooked.steps, plain.steps)`. The requirement 'The final row of a node attempt carries that attempt's hook trace' (C-1335c3ed) and design decision 6 require the lookup row to carry `hooks: { inputOriginalRef: null, entries: [the post:noop entry] }` because that attempt produced one HookRun.entry; the new trace tests pass on that behaviour, so the old assertion is superseded. Task 3.2 names only the two trace tests as changed, and green may not edit test-glob files (L4 resets them to base), so this needs the file unfrozen for this task.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/interpreter/hooks/replay.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-hook-trace`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/interpreter/hooks/replay.test.ts`: replace line 228 `assert.deepEqual(hooked.steps, plain.steps);` with `assert.deepEqual(hooked.steps.map((step) => ({ ...step, hooks: undefined })), plain.steps.map((step) => ({ ...step, hooks: undefined })));` and add after it `assert.deepEqual(hooked.steps.find((step) => step.nodeId === "lookup")?.hooks, { inputOriginalRef: null, entries: [{ label: "post:noop", kind: "code", fused: true, attempt: 1, state: "completed", action: "continue", mutated: null, to: null, error: null, tool: null, idemKey: null }] });` so the test still proves the rest of the row is unchanged and now asserts the trace.

### Clarifier suggestion
Edit `src/interpreter/hooks/replay.test.ts`: replace line 228 `assert.deepEqual(hooked.steps, plain.steps);` with `assert.deepEqual(hooked.steps.map((step) => ({ ...step, hooks: undefined })), plain.steps.map((step) => ({ ...step, hooks: undefined })));` and add after it `assert.deepEqual(hooked.steps.find((step) => step.nodeId === "lookup")?.hooks, { inputOriginalRef: null, entries: [{ label: "post:noop", kind: "code", fused: true, attempt: 1, state: "completed", action: "continue", mutated: null, to: null, error: null, tool: null, idemKey: null }] });` so the test still proves the rest of the row is unchanged and now asserts the trace.

### Answer
<!-- write below this line -->
