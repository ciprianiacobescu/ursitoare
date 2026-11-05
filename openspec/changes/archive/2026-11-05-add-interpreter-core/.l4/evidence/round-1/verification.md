# Verification: openspec:add-interpreter-core: NEEDS_HUMAN (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `20d9db95f03b06b9b6c798b7b2dd11bd9c225ece`
- Head: `044b64c6fce5a99ba52354d5f882b002a92c755b`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: kiro-judge, 3 call(s), judged in 2 parts and 1 follow-up, prompt sha256 `c1d3f94bb15fa2885c4a92df46038f923f3f122b7a0d976eff68386c567daa48`
  - part 1: 22 file(s), 106033 characters, profile kiro-judge, reply valid
  - part 2: 9 file(s), 51713 characters, profile kiro-judge, reply valid
  - follow-up 1: C-7961e8d0; files of parts 1 and 2: 7 file(s), 20448 characters, profile kiro-judge, reply valid
- Judge replies of kiro-judge (this unit, all rounds): valid 3, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): kiro-judge openai (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.2 | base main@20d9db95f0 contained |
| 1 | integrity | ok | 126.5 | 11 sub-checks; scope: 35 changed file(s) |
| 2 | build | ok | 21.7 |  |
| 3 | tests | ok | 196.8 |  |
| 4 | traceability | ok | 0.1 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/interpreter/errors.ts, src/interpreter/execute.ts, src/interpreter/gate.ts, src/interpreter/index.ts, src/interpreter/ops.ts and 12 more |
| 8 | s1 judge | ok | 1.2 | 7/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 312.8 | 3 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261104T2245Z-acec/094-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261104T2245Z-acec/095-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261104T2245Z-acec/096-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261104T2245Z-acec/097-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261104T2245Z-acec/098-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261104T2245Z-acec/099-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261104T2245Z-acec/100-e2e.log |

## Files by part

- part 1: src/interpreter/runtimes/block.test.ts (5658 characters)
- part 1: src/interpreter/runtimes/block.ts (5436 characters)
- part 1: src/interpreter/runtimes/block-effect.test.ts (9374 characters)
- part 1: src/interpreter/runtimes/control.test.ts (5274 characters)
- part 1: src/interpreter/runtimes/end.ts (887 characters)
- part 1: src/interpreter/errors.ts (998 characters)
- part 1: src/interpreter/execute.test.ts (12359 characters)
- part 1: src/interpreter/execute.ts (10522 characters)
- part 1: src/interpreter/execute-failures.test.ts (21247 characters)
- part 1: src/interpreter/gate.ts (574 characters)
- part 1: src/interpreter/index.ts (769 characters)
- part 1: test/support/node-conformance.test.ts (4409 characters)
- part 1: test/support/node-conformance.ts (4085 characters)
- part 1: src/interpreter/ops.test.ts (4629 characters)
- part 1: src/interpreter/ops.ts (1470 characters)
- part 1: src/interpreter/refs.test.ts (4269 characters)
- part 1: src/interpreter/refs.ts (5313 characters)
- part 1: src/interpreter/registry.test.ts (2420 characters)
- part 1: src/interpreter/registry.ts (1631 characters)
- part 1: test/support/run-wait.test.ts (2451 characters)
- part 1: test/support/run-wait.ts (1306 characters)
- part 1: src/interpreter/schema.ts (952 characters)
- part 2: src/interpreter/start.test.ts (14038 characters)
- part 2: src/interpreter/start.ts (4680 characters)
- part 2: src/interpreter/runtimes/switch.ts (1259 characters)
- part 2: openspec/changes/add-interpreter-core/tasks.md (7520 characters)
- part 2: src/interpreter/visit.ts (7451 characters)
- part 2: src/interpreter/runtimes/wait.test.ts (5728 characters)
- part 2: src/interpreter/runtimes/wait.ts (1218 characters)
- part 2: src/interpreter/workflow.db.test.ts (6880 characters)
- part 2: src/interpreter/workflow.ts (2939 characters)

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
| suppressions | skipped | not checked: python only; changed files outside it: src/interpreter/errors.ts, src/interpreter/execute-failures.test.ts, src/interpreter/execute.test.ts, src/interpreter/execute.ts, src/interpreter/gate.ts (+25 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1466 of 1466 base tests pass on the unit's code with its 13 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-f3de9ac6 | interpreter › Node runtimes are registered once per kind › Built-in kinds and registration rules | covered | src.interpreter.registry.test.ts::C-f3de9ac6 built-in kinds are registered and the rest are not (passed, red_assertion); src.interpreter.registry.test.ts::C-f3de9ac6 registration refuses duplicates and invalid runtimes (passed, red_assertion) | - | 0.94 |
| C-18f9cf20 | interpreter › Values resolve over recorded outputs › References, templates and unresolved paths | covered | src.interpreter.refs.test.ts::C-18f9cf20 own proto keys are copied without changing the prototype (passed, red_assertion); src.interpreter.refs.test.ts::C-18f9cf20 single references keep their type and templates stringify (passed, red_assertion); src.interpreter.refs.test.ts::C-18f9cf20 unresolved r... | - | 0.92 |
| C-7961e8d0 | interpreter › Switch and end nodes finish without a tool › Switch cases and end outputs through the conformance kit | covered | src.interpreter.runtimes.control.test.ts::C-7961e8d0 end returns its status and its resolved output (passed, red_assertion); src.interpreter.runtimes.control.test.ts::C-7961e8d0 switch routes own keys and falls back to the default (passed, red_assertion) | - | 0.92 |
| C-99fa375d | interpreter › A block calls its tool through the invoker › A read block, with schema and tool failures | covered | src.interpreter.runtimes.block.test.ts::C-99fa375d a block missing from the services is not runnable (passed, red_assertion); src.interpreter.runtimes.block.test.ts::C-99fa375d a read block calls the invoker once and returns its output (passed, red_assertion); src.interpreter.runtimes.block.test.ts:... | - | - |
| C-9d40929b | interpreter › An effectful block runs inside the effect gate in every mode › Gate order, decisions and failures | covered | src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a rejecting after maps to TOOL_FAILED without the message (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive); src.interpreter.runtimes.block-effect.test.ts::C-9d40929... | - | - |
| C-6b747ab8 | interpreter › A wait sleeps in live mode and is skipped in mock mode › Sleeping, skipping and parsing durations | covered | src.interpreter.runtimes.wait.test.ts::C-6b747ab8 durationMs converts every supported component (passed, red_assertion); src.interpreter.runtimes.wait.test.ts::C-6b747ab8 durationMs refuses malformed and oversized durations (passed, red_assertion); src.interpreter.runtimes.wait.test.ts::C-6b747ab8 w... | - | - |
| C-c56d71ac | interpreter › A run records one numbered row per node visit › A run walks block, switch, block and end | covered | src.interpreter.execute.test.ts::C-c56d71ac a run walks block switch block and end recording numbered rows (passed, red_assertion) | - | 0.92 |
| C-9272817b | interpreter › A run records one numbered row per node visit › Replay reuses the numbers and the recorded results | covered | src.interpreter.execute.test.ts::C-9272817b replay reuses the recorded numbers and results (passed, red_assertion); src.interpreter.ops.test.ts::C-9272817b later steps run once and are listed in execution order (passed, red_assertion); src.interpreter.ops.test.ts::C-9272817b recorded steps replay by... | - | 0.93 |
| C-acbe41c3 | interpreter › A failing run ends failed with a RunError and leaks nothing › Node failures | covered | src.interpreter.execute-failures.test.ts::C-acbe41c3 a failed end node fails the run at that node (passed, pre_satisfied); src.interpreter.execute-failures.test.ts::C-acbe41c3 a rejecting invoker fails the run without leaking its message (passed, pre_satisfied); src.interpreter.execute-failures.test... | - | - |
| C-e3cb0a11 | interpreter › A failing run ends failed with a RunError and leaks nothing › Run-level failures and nothing to do | covered | src.interpreter.execute-failures.test.ts::C-e3cb0a11 a cancelled workflow rejection propagates unchanged (passed, pre_satisfied); src.interpreter.execute-failures.test.ts::C-e3cb0a11 a looping flow fails at the revisited node (passed, pre_satisfied); src.interpreter.execute-failures.test.ts::C-e3cb0... | - | - |
| C-d807f118 | interpreter › A run starts only by registry id and hash › Refusals, enqueue and idempotence | covered | src.interpreter.start.test.ts::C-d807f118 a rejected enqueue fails the run and reports it as unbound (passed, red_assertion); src.interpreter.start.test.ts::C-d807f118 startRun answers the stored run and keeps tenants apart (passed, red_assertion); src.interpreter.start.test.ts::C-d807f118 startRun ... | - | - |
| C-b56c7793 | interpreter › The run workflow is durable › A run on DBOS | covered | src.interpreter.workflow.db.test.ts::C-b56c7793 a started run completes on DBOS and bad workflow input ends in ERROR (passed, red_assertion) | - | 0.92 |
| C-b758e565 | interpreter › The conformance kit and waitForRun support the tests › Kit verdicts and a bounded wait | covered | test.support.node-conformance.test.ts::C-b758e565 kit reports a foreign runtime error as unexpected (passed, red_assertion); test.support.node-conformance.test.ts::C-b758e565 kit reports each outcome and error verdict in case order (passed, red_assertion); test.support.run-wait.test.ts::C-b758e565 w... | - | 0.93 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-interpreter-core/.l4/ledger/r-20261104T2014Z-19d3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-interpreter-core/.l4/ledger/r-20261104T2240Z-52a0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-interpreter-core/.l4/ledger/r-20261104T2245Z-acec.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-interpreter-core/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-interpreter-core/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/interpreter/errors.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/execute-failures.test.ts` |  | relevant | new test file |
| `src/interpreter/execute.test.ts` |  | relevant | new test file |
| `src/interpreter/execute.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/gate.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/index.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/ops.test.ts` |  | relevant | new test file |
| `src/interpreter/ops.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/refs.test.ts` |  | relevant | new test file |
| `src/interpreter/refs.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/registry.test.ts` |  | relevant | new test file |
| `src/interpreter/registry.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/runtimes/block-effect.test.ts` |  | relevant | new test file |
| `src/interpreter/runtimes/block.test.ts` |  | relevant | new test file |
| `src/interpreter/runtimes/block.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/runtimes/control.test.ts` |  | relevant | new test file |
| `src/interpreter/runtimes/end.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/runtimes/switch.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/runtimes/wait.test.ts` |  | relevant | new test file |
| `src/interpreter/runtimes/wait.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/schema.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/start.test.ts` |  | relevant | new test file |
| `src/interpreter/start.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/visit.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/workflow.db.test.ts` |  | relevant | new test file |
| `src/interpreter/workflow.ts` | interpreter | relevant | named in the spec |
| `test/support/node-conformance.test.ts` |  | relevant | new test file |
| `test/support/node-conformance.ts` | test | relevant | named in the spec |
| `test/support/run-wait.test.ts` |  | relevant | new test file |
| `test/support/run-wait.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/interpreter/errors.ts, src/interpreter/execute.ts, src/interpreter/gate.ts, src/interpreter/index.ts, src/interpreter/ops.ts and 12 more

### Tests

1579 of 1579 passed, 0 failed, 0 errored, 0 skipped.
57 of 57 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-f3de9ac6 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-18f9cf20 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7961e8d0 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-99fa375d | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-9d40929b | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-6b747ab8 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-c56d71ac | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9272817b | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-acbe41c3 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-e3cb0a11 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-d807f118 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-b56c7793 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b758e565 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-f3de9ac6 | interpreter › Node runtimes are registered once per kind › Built-in kinds and registration rules | pass | pass | the judge passed it and a discriminating test passes |
| C-18f9cf20 | interpreter › Values resolve over recorded outputs › References, templates and unresolved paths | pass | pass | the judge passed it and a discriminating test passes |
| C-7961e8d0 | interpreter › Switch and end nodes finish without a tool › Switch cases and end outputs through the conformance kit | pass | pass | the judge passed it and a discriminating test passes; its evidence was split over parts 1 and 2 of the diff: follow-up call 1 judged its 7 files of those parts together and answered pass |
| C-99fa375d | interpreter › A block calls its tool through the invoker › A read block, with schema and tool failures | pass | pass | the judge passed it and a discriminating test passes |
| C-9d40929b | interpreter › An effectful block runs inside the effect gate in every mode › Gate order, decisions and failures | pass | pass | the judge passed it and a discriminating test passes |
| C-6b747ab8 | interpreter › A wait sleeps in live mode and is skipped in mock mode › Sleeping, skipping and parsing durations | pass | pass | the judge passed it and a discriminating test passes |
| C-c56d71ac | interpreter › A run records one numbered row per node visit › A run walks block, switch, block and end | pass | pass | the judge passed it and a discriminating test passes |
| C-9272817b | interpreter › A run records one numbered row per node visit › Replay reuses the numbers and the recorded results | pass | pass | the judge passed it and a discriminating test passes |
| C-acbe41c3 | interpreter › A failing run ends failed with a RunError and leaks nothing › Node failures | pass | pass | the judge passed it and a discriminating test passes |
| C-e3cb0a11 | interpreter › A failing run ends failed with a RunError and leaks nothing › Run-level failures and nothing to do | pass | pass | the judge passed it and a discriminating test passes |
| C-d807f118 | interpreter › A run starts only by registry id and hash › Refusals, enqueue and idempotence | pass | pass | the judge passed it and a discriminating test passes |
| C-b56c7793 | interpreter › The run workflow is durable › A run on DBOS | pass | pass | the judge passed it and a discriminating test passes |
| C-b758e565 | interpreter › The conformance kit and waitForRun support the tests › Kit verdicts and a bounded wait | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [major, judge] task 2.3: gate-step test does not observe the active durable step (criterion C-9d40929b): The test named "each gate call runs in the step named after the node" sets current to the running step in its WorkflowOps wrapper, but the logging gate never reads current. It therefore cannot distinguish before and after running in the required node and node#done steps from any other steps with the same execution list.
- [minor, judge] resolveValue has unspecified behavior for non-JSON undefined input (spec gap) (criterion C-18f9cf20): resolveValue accepts unknown input but falls through to return undefined cast as JsonValue. The scenarios cover JSON values only, leaving callers with no specified contract for undefined despite the JsonValue return type.
- [major, judge] Copied interpreter errors are remapped as tool failures (criterion C-e3cb0a11): The durable-error rule says code-bearing interpreter errors must be recognized without instanceof because durable replay can rethrow a copied error. src/interpreter/visit.ts instead requires both a recognized code and error instanceof Error. A copied InterpreterError-like value therefore reaches the fallback and becomes INTERPRETER_TOOL_FAILED, losing its original code.
- [minor, judge] Start validation precedence for simultaneously invalid requests is unspecified (spec gap) (criterion C-d807f118): startRun loads the requested version before validating a supplied runId. The scenarios test these errors separately, so they do not specify which error wins when both the flow reference and run id are invalid.
- [minor, judge] Workflow handling of additional input fields is unspecified (spec gap) (criterion C-b56c7793): The workflow validator checks only tenantId, runId, and reviewProfile, then returns a new object containing only those fields. The scenarios cover malformed required fields but do not state whether otherwise valid workflow input may carry additional fields.
- [minor, judge] the judge called a test inadequate (criterion C-9d40929b): src.interpreter.runtimes.block-effect.test.ts::C-9d40929b each gate call runs in the step named after the node
- [major, judge] task 3.3 is ticked as already satisfied, but its text is not done: not in this part: src/interpreter/visit.ts is required by task 3.3 and is listed in part 2.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.interpreter.execute-failures.test.ts::C-acbe41c3 a failed end node fails the run at that node` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-acbe41c3 a rejecting invoker fails the run without leaking its message` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-acbe41c3 a run fails when a later node has an unresolved reference` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-acbe41c3 an unknown effect decision fails the run and keeps its idem key` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-e3cb0a11 a cancelled workflow rejection propagates unchanged` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-e3cb0a11 a looping flow fails at the revisited node` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-e3cb0a11 a missing invoker fails the run with no rows` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-e3cb0a11 a node without a successor fails the run` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-e3cb0a11 a store rejection propagates and leaves the run as stored` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-e3cb0a11 a terminal run is returned without running or invoking` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-e3cb0a11 an unloadable version fails the run and names the stage` (task 3.3): passed
- `src.interpreter.execute-failures.test.ts::C-e3cb0a11 another tenant sees no run and the owner keeps its completed run` (task 3.3): passed
- `src.interpreter.execute.test.ts::C-9272817b replay reuses the recorded numbers and results` (task 3.2): passed
- `src.interpreter.execute.test.ts::C-c56d71ac a run walks block switch block and end recording numbered rows` (task 3.2): passed
- `src.interpreter.ops.test.ts::C-9272817b later steps run once and are listed in execution order` (task 1.2): passed
- `src.interpreter.ops.test.ts::C-9272817b recorded steps replay by position without calling their callbacks` (task 1.2): passed
- `src.interpreter.ops.test.ts::C-9272817b sleep records milliseconds and consumes no recorded step` (task 1.2): passed
- `src.interpreter.ops.test.ts::NO_EFFECT_GATE invokes without a key and accepts an after result` (task 1.2): passed
- `src.interpreter.refs.test.ts::C-18f9cf20 own proto keys are copied without changing the prototype` (task 1.1): passed
- `src.interpreter.refs.test.ts::C-18f9cf20 single references keep their type and templates stringify` (task 1.1): passed
- `src.interpreter.refs.test.ts::C-18f9cf20 unresolved references throw with the reference and never a value` (task 1.1): passed
- `src.interpreter.registry.test.ts::C-f3de9ac6 built-in kinds are registered and the rest are not` (task 2.2): passed
- `src.interpreter.registry.test.ts::C-f3de9ac6 registration refuses duplicates and invalid runtimes` (task 2.2): passed
- `src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a rejecting after maps to TOOL_FAILED without the message` (task 2.3): passed
- `src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a rejecting before maps to TOOL_FAILED without invoking` (task 2.3): passed
- `src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a rejecting invoker maps to TOOL_FAILED and skips after` (task 2.3): passed
- `src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a reuse decision skips the invoker and still calls after` (task 2.3): passed
- `src.interpreter.runtimes.block-effect.test.ts::C-9d40929b an invalid output still logs after and then is refused` (task 2.3): passed
- `src.interpreter.runtimes.block-effect.test.ts::C-9d40929b an invoke decision runs before, invoke and after in order` (task 2.3): passed
- `src.interpreter.runtimes.block-effect.test.ts::C-9d40929b an unknown decision fails the node after before only` (task 2.3): passed
- `src.interpreter.runtimes.block-effect.test.ts::C-9d40929b each gate call runs in the step named after the node` (task 2.3): passed
- `src.interpreter.runtimes.block-effect.test.ts::C-9d40929b the no-effect gate invokes with a null idemKey` (task 2.3): passed
- `src.interpreter.runtimes.block.test.ts::C-99fa375d a block missing from the services is not runnable` (task 2.2): passed
- `src.interpreter.runtimes.block.test.ts::C-99fa375d a read block calls the invoker once and returns its output` (task 2.2): passed
- `src.interpreter.runtimes.block.test.ts::C-99fa375d a rejecting invoker becomes TOOL_FAILED without its message` (task 2.2): passed
- `src.interpreter.runtimes.block.test.ts::C-99fa375d an ill-typed input is refused before any invoker call` (task 2.2): passed
- `src.interpreter.runtimes.block.test.ts::C-99fa375d an output that breaks the schema is refused` (task 2.2): passed
- `src.interpreter.runtimes.control.test.ts::C-7961e8d0 end returns its status and its resolved output` (task 2.1): passed
- `src.interpreter.runtimes.control.test.ts::C-7961e8d0 switch routes own keys and falls back to the default` (task 2.1): passed
- `src.interpreter.runtimes.wait.test.ts::C-6b747ab8 durationMs converts every supported component` (task 2.1): passed
- `src.interpreter.runtimes.wait.test.ts::C-6b747ab8 durationMs refuses malformed and oversized durations` (task 2.1): passed
- `src.interpreter.runtimes.wait.test.ts::C-6b747ab8 wait of zero sleeps nothing and still wakes` (task 2.1): passed
- `src.interpreter.runtimes.wait.test.ts::C-6b747ab8 wait rejects an unsupported duration after recording its step` (task 2.1): passed
- `src.interpreter.runtimes.wait.test.ts::C-6b747ab8 wait skips in mock mode and sleeps in stub mode` (task 2.1): passed
- `src.interpreter.runtimes.wait.test.ts::C-6b747ab8 wait sleeps in chunks and continues in live mode` (task 2.1): passed
- `src.interpreter.start.test.ts::C-d807f118 a rejected enqueue fails the run and reports it as unbound` (task 3.1): passed
- `src.interpreter.start.test.ts::C-d807f118 startRun answers the stored run and keeps tenants apart` (task 3.1): passed
- `src.interpreter.start.test.ts::C-d807f118 startRun derives an id skips enqueue and names the workflow` (task 3.1): passed
- `src.interpreter.start.test.ts::C-d807f118 startRun propagates loader and catalogue rejections unchanged` (task 3.1): passed
- `src.interpreter.start.test.ts::C-d807f118 startRun refuses ill-typed input and an invalid run id` (task 3.1): passed

## Guard events

- guard.violation: src/interpreter/runtimes/block.ts
