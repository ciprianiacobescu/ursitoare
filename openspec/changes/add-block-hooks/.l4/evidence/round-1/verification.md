# Verification: openspec:add-block-hooks: PASS (round 1)

traceability: 14/14 criteria covered by a discriminating test

- Base: `c2a2344d87ff8f9eedaec0aff1a2564dd7e6a842`
- Head: `1ca45d17786277da94eedcb0903bc52d8d17f4be`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: nemotron-judge, 1 call(s), prompt sha256 `e977a21a644efff7e7730791b9645d182a6ca754f1f0cff4ade7dff6e5504a81`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@c2a2344d87 contained |
| 1 | integrity | ok | 188.6 | 11 sub-checks; scope: 21 changed file(s) |
| 2 | build | ok | 27.3 |  |
| 3 | tests | ok | 274.0 |  |
| 4 | traceability | ok | 0.2 | 14/14 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/interpreter/execute.ts, src/interpreter/hooks/block-runner.ts, src/interpreter/index.ts, src/interpreter/mocks.ts, src/interpreter/types.ts and 3 more |
| 8 | s1 judge | ok | 0.8 | 8/14 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 251.6 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261108T0900Z-b2ed/041-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261108T0900Z-b2ed/042-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261108T0900Z-b2ed/043-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261108T0900Z-b2ed/044-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261108T0900Z-b2ed/045-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261108T0900Z-b2ed/046-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261108T0900Z-b2ed/047-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 7 task(s): red and green compared |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/authoring/format/running-code-section.test.ts, src/interpreter/execute.ts, src/interpreter/hooks/block-runner.test.ts, src/interpreter/hooks/block-runner.ts, src/interpreter/hooks/block-values.test.ts (+10 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1904 of 1904 base tests pass on the unit's code with its 7 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-3e0e5412 | flow-testing › Mocks are checked against the flow before a run exists › Valid mocks pass and are copied | covered | src.interpreter.mocks.test.ts::C-3e0e5412: a block the catalogue lacks is not schema checked (passed, pass_to_pass); src.interpreter.mocks.test.ts::C-3e0e5412: an error entry is a well formed mock (passed, pass_to_pass); src.interpreter.mocks.test.ts::C-3e0e5412: an unreachable block node needs no m... | - | 0.89 |
| C-3fb317e4 | flow-testing › Mocks are checked against the flow before a run exists › Each problem reason, ordering and the cap | covered | src.interpreter.mocks.test.ts::C-3fb317e4: a non object mocks value is one shape problem (passed, pass_to_pass); src.interpreter.mocks.test.ts::C-3fb317e4: absent and empty mock lists are missing problems (passed, pass_to_pass); src.interpreter.mocks.test.ts::C-3fb317e4: outputs that are not JSON ar... | - | - |
| C-81ab0867 | flow-testing › Mocks are checked against the flow before a run exists › Block hooks need mocks under their hook key | covered | src.interpreter.mocks-hooks.test.ts::C-81ab0867: a full set of hook mocks passes and is copied (passed, red_assertion); src.interpreter.mocks-hooks.test.ts::C-81ab0867: a hook mock is checked against the hook block (passed, red_assertion); src.interpreter.mocks-hooks.test.ts::C-81ab0867: a missing h... | - | - |
| C-e19890aa | flow-testing › The mock invoker answers from the mocks and nothing else › Entries by attempt, errors and no egress | covered | src.interpreter.mock-invoker.test.ts::C-e19890aa: error entries, missing nodes and exhausted lists fail (passed, pass_to_pass); src.interpreter.mock-invoker.test.ts::C-e19890aa: the mock invoker answers the entry at the attempt index (passed, pass_to_pass); src.interpreter.mock-invoker.test.ts::C-e1... | - | 0.91 |
| C-2e79b082 | flow-testing › The mock invoker answers from the mocks and nothing else › Mocks come from the stored run, in mock mode only | covered | src.interpreter.mock-invoker.test.ts::C-2e79b082: other modes and unavailable mocks are refused (passed, pass_to_pass); src.interpreter.mock-invoker.test.ts::C-2e79b082: the invoker answers from the mocks stored with the run (passed, pass_to_pass) | - | 0.89 |
| C-7d6b8ba9 | flow-testing › The mock invoker answers from the mocks and nothing else › A hook call is answered under its hook key | covered | src.interpreter.mocks-hooks.test.ts::C-7d6b8ba9: a hook call is answered under its hook key (passed, red_assertion) | - | 0.88 |
| C-7f69652d | hooks-block › Mock keys, block refs and hook values are pure and fixed › Vectors of the pure parts | covered | src.interpreter.hooks.block-values.test.ts::C-7f69652d hookBlockRefs lists sorted unique block hook uses and skips malformed entries (passed, red_assertion); src.interpreter.hooks.block-values.test.ts::C-7f69652d hookMockKey equals the hook step name and both keys arm as fault points (passed, red_as... | - | - |
| C-81b2711b | hooks-block › A block hook is its own step and calls its tool as a hook › A read hook and an effectful hook, step by step | covered | src.interpreter.hooks.block-runner.test.ts::C-81b2711b a read hook runs one step and calls the invoker once at attempt 1 (passed, red_assertion); src.interpreter.hooks.block-runner.test.ts::C-81b2711b a read hook runs one step and calls the invoker once at attempt 2 (passed, red_assertion); src.inte... | - | - |
| C-d27a7d78 | hooks-block › A failing block hook fails the node, or with on_error continue is recorded and skipped › Fail, continue and what continue never swallows | covered | src.interpreter.hooks.block-runner.test.ts::C-d27a7d78 a failing block hook throws HOOK_ERROR with its reason and no tool text (passed, red_assertion); src.interpreter.hooks.block-runner.test.ts::C-d27a7d78 a failing read hook throws tool_failed (passed, red_assertion); src.interpreter.hooks.block-r... | - | - |
| C-6b84d5e8 | hooks-block › A hooked version runs in a mock test run with its own keys › A hooked version through the test endpoint | covered | src.interpreter.hooks.hooked-run.db.test.ts::C-6b84d5e8 a failing hook fails the run with its payment recorded (passed, red_assertion); src.interpreter.hooks.hooked-run.db.test.ts::C-6b84d5e8 a hooked version completes in a mock run with two intents (passed, red_assertion); src.interpreter.hooks.hoo... | - | - |
| C-765cb9f0 | hooks-block › A kill at a hook step leaves one effect per key › C1 a kill at the payment of a hooked node | covered | src.interpreter.hooks.crash.test.ts::C-765cb9f0 a kill at the payment of a hooked node leaves one effect per key (passed, red_assertion) | - | 0.86 |
| C-33cd45c5 | hooks-block › A kill at a hook step leaves one effect per key › C2 a kill at a post block hook | covered | src.interpreter.hooks.crash.test.ts::C-33cd45c5 a kill at a post block hook leaves one effect per key (passed, red_assertion) | - | 0.93 |
| C-6dc836af | hooks-block › A kill at a hook step leaves one effect per key › C6 a kill at the retried attempt of an effect node | covered | src.interpreter.hooks.crash.test.ts::C-6dc836af a kill at the retried attempt of an effect node leaves one effect per key (passed, red_assertion) | - | 0.90 |
| C-258fa594 | hooks-block › The format document teaches a solo author to run code and hooks › The format document has the section for running code and hooks | covered | src.authoring.format.running-code-section.test.ts::C-258fa594 the running code and hooks section exists with its terms (passed, red_assertion) | - | 0.90 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/authoring/format.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-block-hooks/.l4/ledger/r-20261108T0627Z-49e1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-block-hooks/.l4/ledger/r-20261108T0900Z-b2ed.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-block-hooks/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/authoring/format/running-code-section.test.ts` |  | relevant | new test file |
| `src/interpreter/execute.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/block-runner.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/block-runner.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/block-values.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/crash.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/hooked-run.db.test.ts` |  | relevant | new test file |
| `src/interpreter/index.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/mocks-hooks.test.ts` |  | relevant | new test file |
| `src/interpreter/mocks.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/types.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/visit.ts` | interpreter | relevant | module `interpreter` is named in the spec |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/crash/hooks-scenario.ts` | test | relevant | named in the spec |
| `test/support/hook-runs/notify-pay.test.ts` |  | relevant | new test file |
| `test/support/hook-runs/notify-pay.ts` | test | relevant | module `test` is named in the spec |
| `test/support/hook-runs/notify-pay.yaml` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/interpreter/execute.ts, src/interpreter/hooks/block-runner.ts, src/interpreter/index.ts, src/interpreter/mocks.ts, src/interpreter/types.ts and 3 more

### Tests

1999 of 1999 passed, 0 failed, 0 errored, 0 skipped.
37 of 37 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-3e0e5412 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3fb317e4 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-81ab0867 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-e19890aa | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2e79b082 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7d6b8ba9 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7f69652d | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-81b2711b | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-d27a7d78 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-6b84d5e8 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-765cb9f0 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-33cd45c5 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6dc836af | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-258fa594 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-3e0e5412 | flow-testing › Mocks are checked against the flow before a run exists › Valid mocks pass and are copied | pass | pass | the judge passed it and a discriminating test passes |
| C-3fb317e4 | flow-testing › Mocks are checked against the flow before a run exists › Each problem reason, ordering and the cap | pass | pass | the judge passed it and a discriminating test passes |
| C-81ab0867 | flow-testing › Mocks are checked against the flow before a run exists › Block hooks need mocks under their hook key | pass | pass | the judge passed it and a discriminating test passes |
| C-e19890aa | flow-testing › The mock invoker answers from the mocks and nothing else › Entries by attempt, errors and no egress | pass | pass | the judge passed it and a discriminating test passes |
| C-2e79b082 | flow-testing › The mock invoker answers from the mocks and nothing else › Mocks come from the stored run, in mock mode only | pass | pass | the judge passed it and a discriminating test passes |
| C-7d6b8ba9 | flow-testing › The mock invoker answers from the mocks and nothing else › A hook call is answered under its hook key | pass | pass | the judge passed it and a discriminating test passes |
| C-7f69652d | hooks-block › Mock keys, block refs and hook values are pure and fixed › Vectors of the pure parts | pass | pass | the judge passed it and a discriminating test passes |
| C-81b2711b | hooks-block › A block hook is its own step and calls its tool as a hook › A read hook and an effectful hook, step by step | pass | pass | the judge passed it and a discriminating test passes |
| C-d27a7d78 | hooks-block › A failing block hook fails the node, or with on_error continue is recorded and skipped › Fail, continue and what continue never swallows | pass | pass | the judge passed it and a discriminating test passes |
| C-6b84d5e8 | hooks-block › A hooked version runs in a mock test run with its own keys › A hooked version through the test endpoint | pass | pass | the judge passed it and a discriminating test passes |
| C-765cb9f0 | hooks-block › A kill at a hook step leaves one effect per key › C1 a kill at the payment of a hooked node | pass | pass | the judge passed it and a discriminating test passes |
| C-33cd45c5 | hooks-block › A kill at a hook step leaves one effect per key › C2 a kill at a post block hook | pass | pass | the judge passed it and a discriminating test passes |
| C-6dc836af | hooks-block › A kill at a hook step leaves one effect per key › C6 a kill at the retried attempt of an effect node | pass | pass | the judge passed it and a discriminating test passes |
| C-258fa594 | hooks-block › The format document teaches a solo author to run code and hooks › The format document has the section for running code and hooks | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] createMockInvoker hook-key lookup unspecified when only one of phase/hookId is present (spec gap) (criterion C-7d6b8ba9): The criterion pins down only calls carrying both phase and hookId. createMockInvoker falls back to the node id whenever either is absent, so a call carrying hookId but no phase is answered under the node id without details.hook; two reasonable implementations differ (treat as node call vs treat as hook key and mock_missing).

## New tests (red then green, `task.red_ok` in the ledger)

- `src.authoring.format.running-code-section.test.ts::C-258fa594 the running code and hooks section exists with its terms` (task 5.1): passed
- `src.interpreter.hooks.block-runner.test.ts::C-81b2711b a read hook runs one step and calls the invoker once at attempt 1` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-81b2711b a read hook runs one step and calls the invoker once at attempt 2` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-81b2711b a replay over the recorded steps calls neither invoker nor gate` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-81b2711b a reuse decision skips the invoker and hands the reused output to after` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-81b2711b an effectful hook records before invoke and after in two steps at attempt 1` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-81b2711b an effectful hook records before invoke and after in two steps at attempt 2` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-d27a7d78 a failing block hook throws HOOK_ERROR with its reason and no tool text` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-d27a7d78 a failing read hook throws tool_failed` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-d27a7d78 a pay hook still runs at attempt 1` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-d27a7d78 block_missing effect_unknown and effect_retry throw before any call` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-d27a7d78 with on_error continue a failed read hook is a failed entry` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-d27a7d78 with on_error continue a swallowed failure is a failed entry and the step completes` (task 1.2): passed
- `src.interpreter.hooks.block-runner.test.ts::C-d27a7d78 with on_error continue the three fail-closed reasons still throw` (task 1.2): passed
- `src.interpreter.hooks.block-values.test.ts::C-7f69652d hookBlockRefs lists sorted unique block hook uses and skips malformed entries` (task 1.1): passed
- `src.interpreter.hooks.block-values.test.ts::C-7f69652d hookMockKey equals the hook step name and both keys arm as fault points` (task 1.1): passed
- `src.interpreter.hooks.block-values.test.ts::C-7f69652d resolveHookValue copies the meta tags it returns` (task 1.1): passed
- `src.interpreter.hooks.block-values.test.ts::C-7f69652d resolveHookValue fails unresolved hook refs with the ref` (task 1.1): passed
- `src.interpreter.hooks.block-values.test.ts::C-7f69652d resolveHookValue resolves every hook root` (task 1.1): passed
- `src.interpreter.hooks.block-values.test.ts::C-7f69652d resolveHookValue resolves hook refs inside a nested value` (task 1.1): passed
- `src.interpreter.hooks.crash.test.ts::C-33cd45c5 a kill at a post block hook leaves one effect per key` (task 4.1): passed
- `src.interpreter.hooks.crash.test.ts::C-6dc836af a kill at the retried attempt of an effect node leaves one effect per key` (task 4.1): passed
- `src.interpreter.hooks.crash.test.ts::C-765cb9f0 a kill at the payment of a hooked node leaves one effect per key` (task 4.1): passed
- `src.interpreter.hooks.hooked-run.db.test.ts::C-6b84d5e8 a failing hook fails the run with its payment recorded` (task 3.2): passed
- `src.interpreter.hooks.hooked-run.db.test.ts::C-6b84d5e8 a hooked version completes in a mock run with two intents` (task 3.2): passed
- `src.interpreter.hooks.hooked-run.db.test.ts::C-6b84d5e8 a soft hook failure completes the run with a failed entry` (task 3.2): passed
- `src.interpreter.mocks-hooks.test.ts::C-7d6b8ba9: a hook call is answered under its hook key` (task 2.1): passed
- `src.interpreter.mocks-hooks.test.ts::C-81ab0867: a full set of hook mocks passes and is copied` (task 2.1): passed
- `src.interpreter.mocks-hooks.test.ts::C-81ab0867: a hook mock is checked against the hook block` (task 2.1): passed
- `src.interpreter.mocks-hooks.test.ts::C-81ab0867: a missing hook mock is reported by key` (task 2.1): passed
- `src.interpreter.mocks-hooks.test.ts::C-81ab0867: a node reached only by a hook route needs a mock` (task 2.1): passed
- `src.interpreter.mocks-hooks.test.ts::C-81ab0867: an unreachable node's hook needs no mock but a bad one is reported` (task 2.1): passed
- `src.interpreter.mocks-hooks.test.ts::C-81ab0867: code hooks and ghost hooks have no mock key` (task 2.1): passed
- `test.support.hook-runs.notify-pay.test.ts::C-6b84d5e8 notify-pay validates cleanly through all four layers` (task 3.1): passed
- `test.support.hook-runs.notify-pay.test.ts::C-6b84d5e8 notifyPayVersion carries the fixed fields` (task 3.1): passed
- `test.support.hook-runs.notify-pay.test.ts::C-6b84d5e8 seedNotifyPay returns two distinct validated hashes` (task 3.1): passed
- `test.support.hook-runs.notify-pay.test.ts::C-6b84d5e8 the soft variant validates cleanly and continues on error` (task 3.1): passed
