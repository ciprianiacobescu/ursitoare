# Questions — add-hook-runtime

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
| Q-001 | accepted | 1.1 | technical | src/interpreter/hooks/registry.test.ts:33-35 registers codeHookRunner a second time inside assert.doesNotThrow |
| Q-002 | open | 3.1 | technical | Grant write access for the red step |
<!-- l4:index:end -->

---

## Q-001: src/interpreter/hooks/registry.test.ts:33-35 registers codeHookRunner a second time inside assert.doesNotThrow

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-07T20:41Z by claude-sonnet, run r-20261107T2028Z-9089, task 1.1

### Context
The first test (line 20) registers ('code', codeHookRunner). The second test (lines 33-35) registers the same runner again inside assert.doesNotThrow. It then expects a further identical call (lines 36-39) to throw HOOK_RUNNER_DUPLICATE with details.kind 'code'. The spec requires a second registration for a kind to throw HOOK_RUNNER_DUPLICATE. A correct registry throws at lines 33-35 and fails that test. No behaviour I can implement passes both tests without a hack, such as tolerating the first duplicate.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/interpreter/hooks/registry.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-hook-runtime`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/interpreter/hooks/registry.test.ts`: delete the `assert.doesNotThrow(() => { registerHookRunner("code", codeHookRunner); });` block at lines 33-35 of the second test, because the first test already registered the runner.
2. Edit `src/interpreter/hooks/registry.test.ts`: merge the second test into the first, so only the first registration sits in doesNotThrow.

### Clarifier suggestion
Edit `src/interpreter/hooks/registry.test.ts`: delete the `assert.doesNotThrow(() => { registerHookRunner("code", codeHookRunner); });` block at lines 33-35 of the second test, because the first test already registered the runner.

### Answer
<!-- write below this line -->

---

## Q-002: Grant write access for the red step

- **Status:** open
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-07T22:24Z by claude-sonnet, run r-20261107T2044Z-0cf0, task 3.1

### Context
The Write tool was denied in this session, so src/interpreter/hooks/visit-pre.test.ts cannot be created. Please allow Write/Edit on test files, or tell me how to proceed.

### Answer
<!-- write below this line -->
