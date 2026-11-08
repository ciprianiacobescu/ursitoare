# Verification: openspec:add-hook-runtime-followup-1: PASS (round 1)

traceability: 14/14 criteria covered by a discriminating test

- Base: `2ed7fe02f7a2f9bc348e590376ca91faf8b271c1`
- Head: `090d021fdd9b18b02b30f59593200f975296e820`
- Implementer profiles: deepseek-free
- Judge: nemotron-judge, 1 call(s), prompt sha256 `19dc7a9f4dcc87983f77a3dde898e95c5d2a2acee384b5d31ced01db3d107eff`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@2ed7fe02f7 as 090d021fdd (9 commits) |
| 1 | integrity | ok | 251.5 | 11 sub-checks; scope: 8 changed file(s) |
| 2 | build | ok | 37.3 |  |
| 3 | tests | ok | 350.0 |  |
| 4 | traceability | ok | 0.2 | 14/14 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | 100.0% of the changed executable lines ran |
| 8 | s1 judge | ok | 0.4 | 6/14 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 219.6 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261108T1459Z-4c1d/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261108T1459Z-4c1d/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261108T1459Z-4c1d/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261108T1459Z-4c1d/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261108T1459Z-4c1d/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261108T1459Z-4c1d/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261108T1459Z-4c1d/020-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | skipped | no task with a red and a green commit |
| test path freeze | ok | 1 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | skipped | no production file changed |
| suppressions | skipped | not checked: python only; changed files outside it: src/interpreter/hooks/replay-fused-pre.test.ts |
| tdd history | skipped | no task has a TDD history to check |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1957 of 1957 base tests pass on the unit's code with its 1 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-c59f8602 | hooks-runtime › Hook runners are registered once per kind › Registry rules and replayed errors | covered | src.interpreter.hooks.registry.test.ts::C-c59f8602 a registered hook runner is answered by its kind (passed, pass_to_pass); src.interpreter.hooks.registry.test.ts::C-c59f8602 a second or invalid registration is refused with the kind (passed, pass_to_pass); src.interpreter.hooks.registry.test.ts::C-c... | - | 0.90 |
| C-01455379 | hooks-runtime › Step names, fusion, normalisation and the action matrix are pure and fixed › Vectors of the pure functions | covered | src.interpreter.hooks.actions.test.ts::C-01455379 checkHookAction allows an effect retry only with the flag and never on pay (passed, pass_to_pass); src.interpreter.hooks.actions.test.ts::C-01455379 checkHookAction in a post-hook limits output, input and skip (passed, pass_to_pass); src.interpreter.... | - | - |
| C-2b34404c | hooks-runtime › Built-in runtimes hand their input and output to the hooks › The protocol of each runtime | covered | src.interpreter.hooks.runtimes.test.ts::C-2b34404c a block call carries generation attempt minus one above attempt 1 (passed, pass_to_pass); src.interpreter.hooks.runtimes.test.ts::C-2b34404c a code node runs the sandbox on the pre-hook input (passed, pass_to_pass); src.interpreter.hooks.runtimes.te... | - | - |
| C-e9060697 | hooks-runtime › Hooks run in onion order, fused at the edges of each chain › The onion flow, all fused, and with one own step | covered | src.interpreter.hooks.visit-pre.test.ts::C-e9060697 a throwing observer changes nothing in the run (passed, pass_to_pass); src.interpreter.hooks.visit-pre.test.ts::C-e9060697 onion runs its eight hooks fused in onion order (passed, pass_to_pass); src.interpreter.hooks.visit-pre.test.ts::C-e9060697 o... | - | - |
| C-290267b9 | hooks-runtime › A pre-hook changes the input or skips the node, and the row shows the effective input › Mutate, skip and end | covered | src.interpreter.hooks.visit-pre.test.ts::C-290267b9 bad-upper fails the output check at normalize (passed, pass_to_pass); src.interpreter.hooks.visit-pre.test.ts::C-290267b9 end-pre makes the changed input the run output (passed, pass_to_pass); src.interpreter.hooks.visit-pre.test.ts::C-290267b9 mut... | - | - |
| C-3fd59bc9 | hooks-runtime › Hooks see the context, redirect within their routes and fail the node › Context, when, redirect, undeclared route and fail | covered | src.interpreter.hooks.visit-post.test.ts::C-3fd59bc9 a fail action completes when quiet and fails the node when blocked (passed, pass_to_pass); src.interpreter.hooks.visit-post.test.ts::C-3fd59bc9 a redirect changes the successor and each hook sees its context (passed, pass_to_pass); src.interpreter... | - | - |
| C-01ad1003 | hooks-runtime › A post-hook retries a node under its limit, with a new effect key per attempt › Retries, keys and no retry after an unknown effect | covered | src.interpreter.hooks.retry.test.ts::C-01ad1003 a post-hook retry re-runs the node as attempt 2 with the new input (passed, pass_to_pass); src.interpreter.hooks.retry.test.ts::C-01ad1003 a retry beyond max_retries fails HOOK_RETRY_EXHAUSTED (passed, pass_to_pass); src.interpreter.hooks.retry.test.ts... | - | - |
| C-30f1d456 | hooks-runtime › Hooks never remove a taint label › Taint rows through hooks | covered | src.interpreter.hooks.taint.test.ts::C-30f1d456 a post-hook without input cannot launder the labels of fetch (passed, pass_to_pass); src.interpreter.hooks.taint.test.ts::C-30f1d456 hooks that read untrusted text taint the rows that follow (passed, pass_to_pass) | - | 0.93 |
| C-8243f499 | hooks-runtime › A hook fault fails the node and never leaves a run running › Faults | covered | src.interpreter.hooks.faults.test.ts::C-8243f499 a code hook with no sandbox fails before the first step (passed, pass_to_pass); src.interpreter.hooks.faults.test.ts::C-8243f499 a hook of a kind with no runner fails HOOK_UNSUPPORTED with no row (passed, pass_to_pass); src.interpreter.hooks.faults.te... | - | - |
| C-916f559f | hooks-runtime › Hook code obeys the sandbox suite › The escape suite on hook code | covered | src.interpreter.hooks.code-runner.test.ts::C-916f559f: HOOK_LIMITS equals the default sandbox limits and is frozen (passed, pass_to_pass); src.interpreter.hooks.code-runner.test.ts::C-916f559f: every escape case passes through runCodeHook on a real pool (passed, pass_to_pass); src.interpreter.hooks.... | - | 0.86 |
| C-14990344 | hooks-runtime › A replay runs no recorded hook and reaches the same rows › Replay of onion-own | covered | src.interpreter.hooks.replay.test.ts::C-14990344 a replay of onion-own runs only the later steps and keeps the rows (passed, pass_to_pass) | - | 0.89 |
| C-c9e5aea1 | idempotency › An effect retry is keyed by generation › Keys per generation | covered | src.runs.intents.gate-generation.db.test.ts::C-c9e5aea1 a negative or fractional generation is refused (passed, pass_to_pass); src.runs.intents.gate-generation.db.test.ts::C-c9e5aea1 each generation of an effect call has its own intent row and key (passed, pass_to_pass) | - | - |
| C-c56d71ac | interpreter › A run records one numbered row per node visit › A run walks block, switch, block and end | covered | src.interpreter.execute.test.ts::C-c56d71ac a run walks block switch block and end recording numbered rows (passed, pass_to_pass); src.interpreter.hooks.replay.test.ts::C-c56d71ac C-9272817b a fused no-op hook leaves the pay-once steps and rows as in M4 (passed, pass_to_pass) | - | 0.91 |
| C-9272817b | interpreter › A run records one numbered row per node visit › Replay reuses the numbers and the recorded results | covered | src.interpreter.execute.test.ts::C-9272817b replay reuses the recorded numbers and results (passed, pass_to_pass); src.interpreter.hooks.replay.test.ts::C-c56d71ac C-9272817b a fused no-op hook leaves the pay-once steps and rows as in M4 (passed, pass_to_pass); src.interpreter.ops.test.ts::C-9272817... | - | 0.92 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

100.0% of the changed executable lines ran.

| Function | Status | Lines run | Tests |
|---|---|---|---|

### Tests

2018 of 2018 passed, 0 failed, 0 errored, 0 skipped.
0 of 0 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-c59f8602 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-01455379 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-2b34404c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-e9060697 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-290267b9 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-3fd59bc9 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-01ad1003 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-30f1d456 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8243f499 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-916f559f | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-14990344 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c9e5aea1 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-c56d71ac | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9272817b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-c59f8602 | hooks-runtime › Hook runners are registered once per kind › Registry rules and replayed errors | pass | pass | the judge passed it and a discriminating test passes |
| C-01455379 | hooks-runtime › Step names, fusion, normalisation and the action matrix are pure and fixed › Vectors of the pure functions | pass | pass | the judge passed it and a discriminating test passes |
| C-2b34404c | hooks-runtime › Built-in runtimes hand their input and output to the hooks › The protocol of each runtime | pass | pass | the judge passed it and a discriminating test passes |
| C-e9060697 | hooks-runtime › Hooks run in onion order, fused at the edges of each chain › The onion flow, all fused, and with one own step | pass | pass | the judge passed it and a discriminating test passes |
| C-290267b9 | hooks-runtime › A pre-hook changes the input or skips the node, and the row shows the effective input › Mutate, skip and end | pass | pass | the judge passed it and a discriminating test passes |
| C-3fd59bc9 | hooks-runtime › Hooks see the context, redirect within their routes and fail the node › Context, when, redirect, undeclared route and fail | pass | pass | the judge passed it and a discriminating test passes |
| C-01ad1003 | hooks-runtime › A post-hook retries a node under its limit, with a new effect key per attempt › Retries, keys and no retry after an unknown effect | pass | pass | the judge passed it and a discriminating test passes |
| C-30f1d456 | hooks-runtime › Hooks never remove a taint label › Taint rows through hooks | pass | pass | the judge passed it and a discriminating test passes |
| C-8243f499 | hooks-runtime › A hook fault fails the node and never leaves a run running › Faults | pass | pass | the judge passed it and a discriminating test passes |
| C-916f559f | hooks-runtime › Hook code obeys the sandbox suite › The escape suite on hook code | pass | pass | the judge passed it and a discriminating test passes |
| C-14990344 | hooks-runtime › A replay runs no recorded hook and reaches the same rows › Replay of onion-own | pass | pass | the judge passed it and a discriminating test passes |
| C-c9e5aea1 | idempotency › An effect retry is keyed by generation › Keys per generation | pass | pass | the judge passed it and a discriminating test passes |
| C-c56d71ac | interpreter › A run records one numbered row per node visit › A run walks block, switch, block and end | pass | pass | the judge passed it and a discriminating test passes |
| C-9272817b | interpreter › A run records one numbered row per node visit › Replay reuses the numbers and the recorded results | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## Feedback

- FB-001: addressed at 090d021fdd: src/interpreter/hooks/replay-fused-pre.test.ts adds the requested replay test: run the mutate variant once, replay over the prefix ending after lookup's fused step, assert the own post hook sees the trimmed ctx.input, that obs and listSteps equal the first run, and that lookup is not reinvoked; t...
