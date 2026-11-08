# Verification: openspec:add-hook-runtime: PASS (round 1)

traceability: 14/14 criteria covered by a discriminating test

- Base: `da0f08b018ff197f40a9dbd28e71f17b500c85a6`
- Head: `50870a3d7e0f2f1310e33114e0e9d9ab4b6a7ff5`
- Implementer profiles: claude-sonnet, deepseek-free
- Judge: nemotron-judge, 6 call(s), judged in 2 parts, prompt sha256 `e9b9f8b217011167eb3287811a1e04fa9aab92c5064f61c0f5905bbca37b567a`
  - part 1: 28 file(s), 114165 characters, profile nemotron-judge, reply repaired
  - part 2: 13 file(s), 65734 characters, profile nemotron-judge, reply valid
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 3, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@da0f08b018 as 50870a3d7e (3 commits) |
| 1 | integrity | ok | 230.3 | 11 sub-checks (+2 unfrozen by human answers); scope: 49 changed file(s) |
| 2 | build | ok | 36.0 |  |
| 3 | tests | ok | 324.3 |  |
| 4 | traceability | ok | 0.2 | 14/14 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/interpreter/errors.ts, src/interpreter/execute.ts, src/interpreter/hooks/actions.ts, src/interpreter/hooks/code-runner.ts, src/interpreter/hooks/names.ts and 12 more |
| 8 | s1 judge | ok | 0.5 | 6/14 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 1215.7 | 6 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261108T0123Z-e2fd/015-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261108T0123Z-e2fd/016-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261108T0123Z-e2fd/017-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261108T0123Z-e2fd/018-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261108T0123Z-e2fd/019-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261108T0123Z-e2fd/020-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261108T0123Z-e2fd/021-e2e.log |

## Files by part

- part 1: src/interpreter/hooks/actions.test.ts (8411 characters)
- part 1: src/interpreter/hooks/actions.ts (5516 characters)
- part 1: src/interpreter/runtimes/block.ts (5478 characters)
- part 1: src/interpreter/runtimes/code.ts (2687 characters)
- part 1: src/interpreter/hooks/code-runner.test.ts (4130 characters)
- part 1: src/interpreter/hooks/code-runner.ts (4224 characters)
- part 1: src/interpreter/runtimes/end.ts (1226 characters)
- part 1: test/support/hook-runs/flows/end-pre.yaml (1355 characters)
- part 1: src/interpreter/errors.ts (1050 characters)
- part 1: src/interpreter/execute.ts (1958 characters)
- part 1: test/support/hook-runs/flows/fail.yaml (1348 characters)
- part 1: src/interpreter/hooks/faults.test.ts (10777 characters)
- part 1: src/runs/intents/gate.ts (684 characters)
- part 1: src/runs/intents/gate-generation.db.test.ts (5048 characters)
- part 1: test/support/hook-runs/hook-runs.test.ts (4367 characters)
- part 1: src/interpreter/index.ts (1862 characters)
- part 1: test/support/hook-runs/index.ts (2410 characters)
- part 1: test/support/hook-runs/flows/mutate.yaml (1517 characters)
- part 1: src/interpreter/hooks/names.test.ts (6157 characters)
- part 1: src/interpreter/hooks/names.ts (2466 characters)
- part 1: test/support/hook-runs/flows/onion.yaml (1583 characters)
- part 1: src/interpreter/hooks/pipeline.ts (15960 characters)
- part 1: test/support/README.md (1388 characters)
- part 1: test/support/hook-runs/flows/redirect.yaml (1712 characters)
- part 1: src/interpreter/hooks/registry.test.ts (2509 characters)
- part 1: src/interpreter/hooks/registry.ts (1459 characters)
- part 1: src/interpreter/hooks/replay.test.ts (9232 characters)
- part 1: src/interpreter/hooks/retry.test.ts (7651 characters)
- part 2: src/interpreter/hooks/runtimes.test.ts (13658 characters)
- part 2: test/support/hook-runs/flows/skip-pay.yaml (1350 characters)
- part 2: test/support/hook-runs/flows/skip-read.yaml (1356 characters)
- part 2: src/interpreter/runtimes/switch.ts (2635 characters)
- part 2: src/interpreter/hooks/taint.test.ts (4728 characters)
- part 2: test/support/hook-runs/flows/taint-hook.yaml (1107 characters)
- part 2: openspec/changes/add-hook-runtime/tasks.md (8231 characters)
- part 2: src/interpreter/types.ts (1175 characters)
- part 2: test/support/hook-runs/flows/undeclared.yaml (1660 characters)
- part 2: src/interpreter/visit.ts (7946 characters)
- part 2: src/interpreter/hooks/visit-post.test.ts (8749 characters)
- part 2: src/interpreter/hooks/visit-pre.test.ts (10890 characters)
- part 2: src/interpreter/runtimes/wait.ts (2249 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 8 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/interpreter/errors.ts, src/interpreter/execute.ts, src/interpreter/hooks/actions.test.ts, src/interpreter/hooks/actions.ts, src/interpreter/hooks/code-runner.test.ts (+25 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1816 of 1816 base tests pass on the unit's code with its 11 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/interpreter/hooks/registry.test.ts kept at head for the run (task 1.1: unfrozen by Q-001)
- src/interpreter/hooks/visit-pre.test.ts kept at head for the run (task 3.1: unfrozen by Q-002)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/interpreter/hooks/registry.test.ts (task 1.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))
- src/interpreter/hooks/visit-pre.test.ts (task 3.1, unfrozen by Q-003 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-c59f8602 | hooks-runtime › Hook runners are registered once per kind › Registry rules and replayed errors | covered | src.interpreter.hooks.registry.test.ts::C-c59f8602 a registered hook runner is answered by its kind (passed, red_assertion); src.interpreter.hooks.registry.test.ts::C-c59f8602 a second or invalid registration is refused with the kind (passed, red_assertion); src.interpreter.hooks.registry.test.ts::C... | - | 0.92 |
| C-01455379 | hooks-runtime › Step names, fusion, normalisation and the action matrix are pure and fixed › Vectors of the pure functions | covered | src.interpreter.hooks.actions.test.ts::C-01455379 checkHookAction allows an effect retry only with the flag and never on pay (passed, red_assertion); src.interpreter.hooks.actions.test.ts::C-01455379 checkHookAction in a post-hook limits output, input and skip (passed, red_assertion); src.interprete... | - | - |
| C-2b34404c | hooks-runtime › Built-in runtimes hand their input and output to the hooks › The protocol of each runtime | covered | src.interpreter.hooks.runtimes.test.ts::C-2b34404c a block call carries generation attempt minus one above attempt 1 (passed, red_assertion); src.interpreter.hooks.runtimes.test.ts::C-2b34404c a code node runs the sandbox on the pre-hook input (passed, red_assertion); src.interpreter.hooks.runtimes.... | - | - |
| C-e9060697 | hooks-runtime › Hooks run in onion order, fused at the edges of each chain › The onion flow, all fused, and with one own step | covered | src.interpreter.hooks.visit-pre.test.ts::C-e9060697 a throwing observer changes nothing in the run (passed, red_assertion); src.interpreter.hooks.visit-pre.test.ts::C-e9060697 onion runs its eight hooks fused in onion order (passed, red_assertion); src.interpreter.hooks.visit-pre.test.ts::C-e9060697... | - | - |
| C-290267b9 | hooks-runtime › A pre-hook changes the input or skips the node, and the row shows the effective input › Mutate, skip and end | covered | src.interpreter.hooks.visit-pre.test.ts::C-290267b9 bad-upper fails the output check at normalize (passed, red_assertion); src.interpreter.hooks.visit-pre.test.ts::C-290267b9 end-pre makes the changed input the run output (passed, red_assertion); src.interpreter.hooks.visit-pre.test.ts::C-290267b9 m... | - | - |
| C-3fd59bc9 | hooks-runtime › Hooks see the context, redirect within their routes and fail the node › Context, when, redirect, undeclared route and fail | covered | src.interpreter.hooks.visit-post.test.ts::C-3fd59bc9 a fail action completes when quiet and fails the node when blocked (passed, red_assertion); src.interpreter.hooks.visit-post.test.ts::C-3fd59bc9 a redirect changes the successor and each hook sees its context (passed, red_assertion); src.interpret... | - | - |
| C-01ad1003 | hooks-runtime › A post-hook retries a node under its limit, with a new effect key per attempt › Retries, keys and no retry after an unknown effect | covered | src.interpreter.hooks.retry.test.ts::C-01ad1003 a post-hook retry re-runs the node as attempt 2 with the new input (passed, red_assertion); src.interpreter.hooks.retry.test.ts::C-01ad1003 a retry beyond max_retries fails HOOK_RETRY_EXHAUSTED (passed, red_assertion); src.interpreter.hooks.retry.test.... | - | - |
| C-30f1d456 | hooks-runtime › Hooks never remove a taint label › Taint rows through hooks | covered | src.interpreter.hooks.taint.test.ts::C-30f1d456 a post-hook without input cannot launder the labels of fetch (passed, red_assertion); src.interpreter.hooks.taint.test.ts::C-30f1d456 hooks that read untrusted text taint the rows that follow (passed, red_assertion) | - | 0.94 |
| C-8243f499 | hooks-runtime › A hook fault fails the node and never leaves a run running › Faults | covered | src.interpreter.hooks.faults.test.ts::C-8243f499 a code hook with no sandbox fails before the first step (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-005: the check was inconclusive); src.interpreter.hooks.faults.test.ts::C-8243f499 a hook of a kind w... | - | - |
| C-916f559f | hooks-runtime › Hook code obeys the sandbox suite › The escape suite on hook code | covered | src.interpreter.hooks.code-runner.test.ts::C-916f559f: HOOK_LIMITS equals the default sandbox limits and is frozen (passed, red_assertion); src.interpreter.hooks.code-runner.test.ts::C-916f559f: every escape case passes through runCodeHook on a real pool (passed, red_assertion); src.interpreter.hook... | - | 0.90 |
| C-14990344 | hooks-runtime › A replay runs no recorded hook and reaches the same rows › Replay of onion-own | covered | src.interpreter.hooks.replay.test.ts::C-14990344 a replay of onion-own runs only the later steps and keeps the rows (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-006: the check was inconclusive) | - | 0.92 |
| C-c9e5aea1 | idempotency › An effect retry is keyed by generation › Keys per generation | covered | src.runs.intents.gate-generation.db.test.ts::C-c9e5aea1 a negative or fractional generation is refused (passed, red_assertion); src.runs.intents.gate-generation.db.test.ts::C-c9e5aea1 each generation of an effect call has its own intent row and key (passed, red_assertion) | - | - |
| C-c56d71ac | interpreter › A run records one numbered row per node visit › A run walks block, switch, block and end | covered | src.interpreter.execute.test.ts::C-c56d71ac a run walks block switch block and end recording numbered rows (passed, pass_to_pass); src.interpreter.hooks.replay.test.ts::C-c56d71ac C-9272817b a fused no-op hook leaves the pay-once steps and rows as in M4 (passed, pre_satisfied, inadequate) | - | 0.92 |
| C-9272817b | interpreter › A run records one numbered row per node visit › Replay reuses the numbers and the recorded results | covered | src.interpreter.execute.test.ts::C-9272817b replay reuses the recorded numbers and results (passed, pass_to_pass); src.interpreter.hooks.replay.test.ts::C-c56d71ac C-9272817b a fused no-op hook leaves the pay-once steps and rows as in M4 (passed, pre_satisfied); src.interpreter.ops.test.ts::C-927281... | - | 0.91 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-hook-runtime/.l4/ledger/r-20261107T2028Z-9089.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-runtime/.l4/ledger/r-20261107T2044Z-0cf0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-runtime/.l4/ledger/r-20261107T2228Z-8bc6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-runtime/.l4/ledger/r-20261107T2301Z-fa9e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-runtime/.l4/ledger/r-20261107T2350Z-4917.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-runtime/.l4/ledger/r-20261108T0033Z-999a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-runtime/.l4/ledger/r-20261108T0123Z-e2fd.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-runtime/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-runtime/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/interpreter/errors.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/execute.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/actions.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/actions.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/code-runner.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/code-runner.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/faults.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/names.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/names.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/pipeline.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/registry.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/registry.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/replay.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/retry.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/runtimes.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/taint.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/visit-post.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/visit-pre.test.ts` |  | relevant | new test file |
| `src/interpreter/index.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/runtimes/block.ts` | interpreter | relevant | module `interpreter` is named in the spec |
| `src/interpreter/runtimes/code.ts` | interpreter | relevant | module `interpreter` is named in the spec |
| `src/interpreter/runtimes/end.ts` | interpreter | relevant | module `interpreter` is named in the spec |
| `src/interpreter/runtimes/switch.ts` | interpreter | relevant | module `interpreter` is named in the spec |
| `src/interpreter/runtimes/wait.ts` | interpreter | relevant | module `interpreter` is named in the spec |
| `src/interpreter/types.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/visit.ts` | interpreter | relevant | named in the spec |
| `src/runs/intents/gate-generation.db.test.ts` |  | relevant | new test file |
| `src/runs/intents/gate.ts` | runs | relevant | named in the spec |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/hook-runs/flows/end-pre.yaml` | test | relevant | named in the spec |
| `test/support/hook-runs/flows/fail.yaml` | test | relevant | named in the spec |
| `test/support/hook-runs/flows/mutate.yaml` | test | relevant | named in the spec |
| `test/support/hook-runs/flows/onion.yaml` | test | relevant | named in the spec |
| `test/support/hook-runs/flows/redirect.yaml` | test | relevant | named in the spec |
| `test/support/hook-runs/flows/skip-pay.yaml` | test | relevant | named in the spec |
| `test/support/hook-runs/flows/skip-read.yaml` | test | relevant | named in the spec |
| `test/support/hook-runs/flows/taint-hook.yaml` | test | relevant | named in the spec |
| `test/support/hook-runs/flows/undeclared.yaml` | test | relevant | named in the spec |
| `test/support/hook-runs/hook-runs.test.ts` |  | relevant | new test file |
| `test/support/hook-runs/index.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/interpreter/errors.ts, src/interpreter/execute.ts, src/interpreter/hooks/actions.ts, src/interpreter/hooks/code-runner.ts, src/interpreter/hooks/names.ts and 12 more

### Tests

1946 of 1946 passed, 0 failed, 0 errored, 0 skipped.
83 of 83 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-c59f8602 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-01455379 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-2b34404c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-e9060697 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-290267b9 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-3fd59bc9 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-01ad1003 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-30f1d456 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8243f499 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-916f559f | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-14990344 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c9e5aea1 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-c56d71ac | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9272817b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |

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

- [minor, judge] skip on an effect block/end omits hook from error details (spec gap): block.ts and end.ts throw HOOK_ACTION_FORBIDDEN with details { action: "skip" } (no hook key) when a fused pre-hook skips an effect block or end, while the pipeline's checkHookAction includes hook: hookStepName(...). No criterion pins a fused skip on an effect/end node (skip-pay passes via an own hook), so this input is unconstrained by the criteria.
- [minor, judge] registry duplicate-registration test depends on a previous test's registration: src/interpreter/hooks/registry.test.ts's second test asserts HOOK_RUNNER_DUPLICATE by calling registerHookRunner("code", codeHookRunner) without registering the runner itself; it passes only because the preceding test already registered it (the Q-001 answer asked for that call's deletion, which is not in the diff). A filtered run of the second test alone would not observe a duplicate.
- [minor, judge] the judge called a test inadequate (criterion C-c56d71ac): src.interpreter.hooks.replay.test.ts::C-c56d71ac C-9272817b a fused no-op hook leaves the pay-once steps and rows as in M4

## New tests (red then green, `task.red_ok` in the ledger)

- `src.interpreter.hooks.actions.test.ts::C-01455379 checkHookAction allows an effect retry only with the flag and never on pay` (task 1.1): passed
- `src.interpreter.hooks.actions.test.ts::C-01455379 checkHookAction in a post-hook limits output, input and skip` (task 1.1): passed
- `src.interpreter.hooks.actions.test.ts::C-01455379 checkHookAction in a post-hook redirects within routes only` (task 1.1): passed
- `src.interpreter.hooks.actions.test.ts::C-01455379 checkHookAction in a post-hook retries only where it is safe` (task 1.1): passed
- `src.interpreter.hooks.actions.test.ts::C-01455379 checkHookAction in a pre-hook allows continue and refuses output` (task 1.1): passed
- `src.interpreter.hooks.actions.test.ts::C-01455379 checkHookAction in a pre-hook allows skip on read blocks and code only` (task 1.1): passed
- `src.interpreter.hooks.actions.test.ts::C-01455379 normalizeHookReturn keeps a valid action as given` (task 1.1): passed
- `src.interpreter.hooks.actions.test.ts::C-01455379 normalizeHookReturn refuses a bad skip, redirect or fail` (task 1.1): passed
- `src.interpreter.hooks.actions.test.ts::C-01455379 normalizeHookReturn refuses a non-object and an unknown action` (task 1.1): passed
- `src.interpreter.hooks.actions.test.ts::C-01455379 normalizeHookReturn refuses a payload that cannot be stored` (task 1.1): passed
- `src.interpreter.hooks.actions.test.ts::C-01455379 normalizeHookReturn turns null and an empty object into continue` (task 1.1): passed
- `src.interpreter.hooks.code-runner.test.ts::C-916f559f: HOOK_LIMITS equals the default sandbox limits and is frozen` (task 1.3): passed
- `src.interpreter.hooks.code-runner.test.ts::C-916f559f: every escape case passes through runCodeHook on a real pool` (task 1.3): passed
- `src.interpreter.hooks.code-runner.test.ts::C-916f559f: runCodeHook passes the hook limits, seed, clock and binding to the sandbox` (task 1.3): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 a code hook with no sandbox fails before the first step` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 a hook of a kind with no runner fails HOOK_UNSUPPORTED with no row` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 a mutated post output that is not a payload fails inside its own step` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 a rejecting sandbox run fails the node sandbox_unavailable` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 a return outside the grammar fails the node` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 a skip output outside the schema fails INTERPRETER_OUTPUT_INVALID` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 a throwing hook fails HOOK_ERROR with runtime_error and leaks nothing` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 an input that is not a storable payload fails HOOK_ACTION_INVALID` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 an unresolved input reference fails before any hook runs` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault input_invalid fails the node HOOK_ERROR` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault memory_limit fails the node HOOK_ERROR` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault never_settled fails the node HOOK_ERROR` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault output_invalid fails the node HOOK_ERROR` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault output_too_large fails the node HOOK_ERROR` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault runtime_error fails the node HOOK_ERROR` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault sandbox_crash fails the node HOOK_ERROR` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault stack_overflow fails the node HOOK_ERROR` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault syntax_error fails the node HOOK_ERROR` (task 3.4): passed
- `src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault timeout fails the node HOOK_ERROR` (task 3.4): passed
- `src.interpreter.hooks.names.test.ts::C-01455379 attemptStepName appends the attempt after the first` (task 1.1): passed
- `src.interpreter.hooks.names.test.ts::C-01455379 hook step names are valid fault points` (task 1.1): passed
- `src.interpreter.hooks.names.test.ts::C-01455379 hookSlot is the 1-based position in pre then post` (task 1.1): passed
- `src.interpreter.hooks.names.test.ts::C-01455379 hookSlot of a placement of another node throws HOOK_ERROR` (task 1.1): passed
- `src.interpreter.hooks.names.test.ts::C-01455379 hookStepName joins node, phase and label` (task 1.1): passed
- `src.interpreter.hooks.names.test.ts::C-01455379 isFusable holds for a plain code hook only` (task 1.1): passed
- `src.interpreter.hooks.names.test.ts::C-01455379 splitFused of empty lists gives four empty arrays` (task 1.1): passed
- `src.interpreter.hooks.names.test.ts::C-01455379 splitFused takes the fusable prefix of post` (task 1.1): passed
- `src.interpreter.hooks.names.test.ts::C-01455379 splitFused takes the fusable suffix of pre and prefix of post` (task 1.1): passed
- `src.interpreter.hooks.registry.test.ts::C-c59f8602 a registered hook runner is answered by its kind` (task 1.1): passed
- `src.interpreter.hooks.registry.test.ts::C-c59f8602 a second or invalid registration is refused with the kind` (task 1.1): passed
- `src.interpreter.hooks.registry.test.ts::C-c59f8602 each hook code converts to an InterpreterError of its own code` (task 1.1): passed
- `src.interpreter.hooks.replay.test.ts::C-14990344 a replay of onion-own runs only the later steps and keeps the rows` (task 3.5): passed
- `src.interpreter.hooks.replay.test.ts::C-c56d71ac C-9272817b a fused no-op hook leaves the pay-once steps and rows as in M4` (task 3.5): passed
- `src.interpreter.hooks.retry.test.ts::C-01ad1003 a post-hook retry re-runs the node as attempt 2 with the new input` (task 3.3): passed
- `src.interpreter.hooks.retry.test.ts::C-01ad1003 a retry beyond max_retries fails HOOK_RETRY_EXHAUSTED` (task 3.3): passed
- `src.interpreter.hooks.retry.test.ts::C-01ad1003 an effect retry is keyed by generation and gets its own rows` (task 3.3): passed

## Guard events

- guard.violation: src/interpreter/types.ts
- guard.violation: src/interpreter/types.ts
