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
| Q-002 | answered | 3.1 | technical | Grant write access for the red step |
| Q-003 | accepted | 3.1 | technical | src/interpreter/hooks/visit-pre.test.ts:183: sandboxRuns counts the normalize node's sandbox run, giving 9, not 8 |
| Q-004 | answered | 3.3 | technical | Grant write access for the red step |
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

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The question asks for a change to the implementer session's tool permissions (Write/Edit denied on a new test file). Nothing in the repository settles that: the file src/interpreter/hooks/visit-pre.test.ts does not exist in the unit's head (the hooks directory holds only names, registry, actions, co
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-07T22:24Z by claude-sonnet, run r-20261107T2044Z-0cf0, task 3.1

### Context
The Write tool was denied in this session, so src/interpreter/hooks/visit-pre.test.ts cannot be created. Please allow Write/Edit on test files, or tell me how to proceed.

### Answer
<!-- write below this line -->
Write and Edit are allowed on any path inside the worktree (rule `Edit(./**)`): create `src/interpreter/hooks/visit-pre.test.ts` with that path relative to the worktree root, never under /tmp or outside the worktree; Bash runs only the gate command. Red may not change a production file: attempt 1's edit of `src/interpreter/types.ts` was restored by the red-scope guard, so `InterpreterDeps` has no `hookObserver` until green adds it (proposal.md: "Not scaffolded, because they change existing files"). Make the test typecheck without it, as `runtimes.test.ts` does for `NodeServices.hooks` (`{ ... } as NodeServices`): give the observer typed parameters, `(nodeId: string, entry: HookTraceEntry): void` with `HookTraceEntry` from `./types.ts`, and build the deps as `{ ...deps, hookObserver: observer } as InterpreterDeps`. The new tests then compile, fail by assertion at red, and need no change after green.

---

## Q-003: src/interpreter/hooks/visit-pre.test.ts:183: sandboxRuns counts the normalize node's sandbox run, giving 9, not 8

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-07T22:59Z by claude-sonnet, run r-20261107T2228Z-8bc6, task 3.1

### Context
The test wraps `sandbox.run` in `runFlow` and counts every call. In `onion`, the 8 hook runs use binding `ctx`, and the `normalize` code node also runs in the sandbox with binding `input`. That makes 9 calls. The spec (C-e9060697) says '8 sandbox calls with binding `ctx`', so the test should count only hook runs. The implementation is correct, so the assertion at line 183 cannot pass.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/interpreter/hooks/visit-pre.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-hook-runtime`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/interpreter/hooks/visit-pre.test.ts`: in the `run` wrapper inside `runFlow`, increment `sandboxRuns` only when `opts.binding === "ctx"`, so the count is the hook calls and `assert.equal(scene.sandboxRuns, 8)` holds.

### Clarifier suggestion
Edit `src/interpreter/hooks/visit-pre.test.ts`: in the `run` wrapper inside `runFlow`, increment `sandboxRuns` only when `opts.binding === "ctx"`, so the count is the hook calls and `assert.equal(scene.sandboxRuns, 8)` holds.

### Answer
<!-- write below this line -->

---

## Q-004: Grant write access for the red step

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.3
- **Kind:** technical
- **Asked:** 2026-11-07T23:47Z by claude-sonnet, run r-20261107T2301Z-fa9e, task 3.3

### Context
Edit and Write were denied in this session (don't ask mode). The red step has to add `generation?: number` to `IntentCall` in `src/runs/intents/gate.ts`, create `src/runs/intents/gate-generation.db.test.ts` and create `src/interpreter/hooks/retry.test.ts`. Please grant file-write permission for these paths and re-run.

### Options
1. Grant Edit/Write for src/runs/intents/gate.ts, src/runs/intents/gate-generation.db.test.ts and src/interpreter/hooks/retry.test.ts and re-run the step

### Answer
<!-- write below this line -->
No permission grant is needed and none can be given here; the denial follows from the red step itself. A red step may not change a production file: `src/runs/intents/gate.ts` is production, and tasks.md 3.3 puts `IntentCall.generation?` and the key in the "then" part that green implements after the two tests are written. Leave `gate.ts` untouched at red. Write only the two new test files, with paths relative to the worktree root (`src/runs/intents/gate-generation.db.test.ts` and `src/interpreter/hooks/retry.test.ts`), as the 3.1 and 3.2 red steps did for `visit-pre.test.ts` and `visit-post.test.ts`. Make the gate test typecheck without the field by casting the call, for example `{ ...CALL, generation: 1 } as IntentCall`, the same pattern `runtimes.test.ts` uses with `as NodeServices` and `visit-pre.test.ts` with `as InterpreterDeps` for members green adds later. `createEffectIntents` then keys every call with `idemKey(tenant, lineage, node, effectSeq)` at generation 0, so the generation-1 `before` returns `K0` and the test fails by assertion (expected `K1`), and the invalid generations -1 and 1.5 fail by assertion too (wrap those in `await assert.rejects(p, { code: "INTENT_INVALID" })`); green adds `generation?: number` to `IntentCall`, `call.generation ?? 0` to `keyOf`, and the retry attempts to `pipeline.ts` and `visit.ts`.
