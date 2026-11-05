# Verification: openspec:add-mock-test-runs: PASS (round 1)

traceability: 16/16 criteria covered by a discriminating test

- Base: `7ebad186ab30588aee7f96f914c66bff3b562d78`
- Head: `f353ba269c3d26db2dcc0f38262ebb130c33b5a1`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: kiro-judge, 1 call(s), prompt sha256 `4e3c97f86856dd5518413a44d3a334fccd8e42efa6e4e4d31a2172f046ac5e0d`
- Judge replies of kiro-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): kiro-judge openai (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@7ebad186ab contained |
| 1 | integrity | ok | 521.5 | 11 sub-checks (+2 unfrozen by human answers); scope: 26 changed file(s) |
| 2 | build | ok | 31.5 |  |
| 3 | tests | ok | 257.3 |  |
| 4 | traceability | ok | 0.2 | 16/16 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/error-codes.ts, src/api/index.ts, src/api/test-run-routes.ts, src/interpreter/index.ts, src/interpreter/mocks.ts and 2 more |
| 8 | s1 judge | ok | 1.1 | 10/16 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 92.8 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261105T1102Z-1bd0/018-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261105T1102Z-1bd0/019-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261105T1102Z-1bd0/020-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261105T1102Z-1bd0/021-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261105T1102Z-1bd0/022-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261105T1102Z-1bd0/023-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261105T1102Z-1bd0/024-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 2 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 8 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/error-codes.test.ts, src/api/error-codes.ts, src/api/index.ts, src/api/test-run-codes.test.ts, src/api/test-run-loader.test.ts (+12 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1565 of 1565 base tests pass on the unit's code with its 8 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/api/test-run-routes.test.ts kept at head for the run (task 4.1: unfrozen by Q-002)
- src/main.mockruns.test.ts kept at head for the run (task 5.1: unfrozen by Q-003)
- src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (named by the task text, plan:m4@d59d8522bcdc790a)
- src.main.flows.test.ts::C-f696603a the real engine serves and documents the flow routes (named by the task text, plan:m4@d59d8522bcdc790a)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/api/test-run-routes.test.ts (task 4.1, unfrozen by Q-002 (delegate_override, claude-fable-5-1))
- src/main.mockruns.test.ts (task 5.1, unfrozen by Q-003 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-96e47324 | api-conventions › Every error code is registered › The registry | covered | src.api.test-run-codes.test.ts::C-96e47324 registers TEST_MOCK_INVALID with its status and message (passed, red_assertion); src.api.test-run-codes.test.ts::C-96e47324 registers TEST_MOCK_MISSING with its status and message (passed, red_assertion) | src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (no proof that it discriminates (no red, audit or generated record)); src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422 (no proof that ... | - |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | covered | test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan (passed, pass_to_pass) | - | 0.86 |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | covered | test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan (passed, pass_to_pass) | - | 0.80 |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | covered | src.api.error-codes.test.ts::C-541ef4f9 Route errors lists only routes whose declared codes are unregistered (passed, pass_to_pass) | - | 0.82 |
| C-f696603a | flow-registry › The routes are session routes under the flow actions › The route table and the real engine | covered | src.main.mockruns.test.ts::C-f696603a C-28603f65 main defines the test route and documents it (passed, red_assertion) | src.api.flow-validate.test.ts::C-f696603a the flow routes are session routes under the flow actions (no proof that it discriminates (no red, audit or generated record)); src.main.flows.test.ts::C-f696603a the real engine serves and documents the flow routes (no proof that it discriminates (no red, a... | - |
| C-3e0e5412 | flow-testing › Mocks are checked against the flow before a run exists › Valid mocks pass and are copied | covered | src.interpreter.mocks.test.ts::C-3e0e5412: a block the catalogue lacks is not schema checked (passed, red_assertion); src.interpreter.mocks.test.ts::C-3e0e5412: an error entry is a well formed mock (passed, red_assertion); src.interpreter.mocks.test.ts::C-3e0e5412: an unreachable block node needs no... | - | 0.93 |
| C-3fb317e4 | flow-testing › Mocks are checked against the flow before a run exists › Each problem reason, ordering and the cap | covered | src.interpreter.mocks.test.ts::C-3fb317e4: a non object mocks value is one shape problem (passed, red_assertion); src.interpreter.mocks.test.ts::C-3fb317e4: absent and empty mock lists are missing problems (passed, red_assertion); src.interpreter.mocks.test.ts::C-3fb317e4: outputs that are not JSON ... | - | - |
| C-e19890aa | flow-testing › The mock invoker answers from the mocks and nothing else › Entries by attempt, errors and no egress | covered | src.interpreter.mock-invoker.test.ts::C-e19890aa: error entries, missing nodes and exhausted lists fail (passed, red_assertion); src.interpreter.mock-invoker.test.ts::C-e19890aa: the mock invoker answers the entry at the attempt index (passed, red_assertion); src.interpreter.mock-invoker.test.ts::C-... | - | 0.94 |
| C-2e79b082 | flow-testing › The mock invoker answers from the mocks and nothing else › Mocks come from the stored run, in mock mode only | covered | src.interpreter.mock-invoker.test.ts::C-2e79b082: other modes and unavailable mocks are refused (passed, red_assertion); src.interpreter.mock-invoker.test.ts::C-2e79b082: the invoker answers from the mocks stored with the run (passed, red_assertion) | - | 0.95 |
| C-771f9778 | flow-testing › A stored version is loaded for a test run › Validated, draft and absent versions | covered | src.api.test-run-loader.test.ts::C-771f9778 the loader answers a validated and a draft version and refuses the rest (passed, red_assertion); src.api.test-run-loader.test.ts::C-771f9778 the loader answers the versions seedMockRunFlows stored (passed, red_assertion) | - | 0.93 |
| C-2a251ee8 | flow-testing › The test endpoint starts a mock run as the requesting user › A mock run from request to completion | covered | src.api.test-run-routes.test.ts::C-2a251ee8 a mock run is stored, enqueued and answers 202 then completes (passed, red_assertion) | - | - |
| C-7c2a7a3d | flow-testing › The test endpoint starts a mock run as the requesting user › Idempotency-Key replays the same run | covered | src.api.test-run-routes.test.ts::C-7c2a7a3d an Idempotency-Key replays the same run (passed, red_assertion) | - | 0.92 |
| C-de412456 | flow-testing › The test endpoint refuses what it cannot run › Who may test which flow | covered | src.api.test-run-routes.test.ts::C-de412456 who may test which flow, and what is refused before a run (passed, red_assertion) | - | 0.92 |
| C-7d9b0050 | flow-testing › The test endpoint refuses what it cannot run › Versions, bodies, mocks and a runtime that is down | covered | src.api.test-run-refusals.test.ts::C-7d9b0050 a failing enqueue and a missing runtime answer 503 (passed, red_assertion); src.api.test-run-refusals.test.ts::C-7d9b0050 versions, bodies and mocks are refused before a run exists (passed, red_assertion) | - | - |
| C-4a0822e8 | flow-testing › test_flow is granted to authors of the owner team › The policy table | covered | src.interpreter.flow-testing-policy.test.ts::C-4a0822e8 test_flow is granted to authors of the owner team (passed, red_assertion) | - | 0.71 |
| C-28603f65 | flow-testing › The engine binds the interpreter before it launches the runtime › Bind order, the route table and a run on DBOS | covered | src.main.mockruns.test.ts::C-28603f65 main binds the interpreter before launching and completes a mock run (passed, red_assertion); src.main.mockruns.test.ts::C-f696603a C-28603f65 main defines the test route and documents it (passed, red_assertion) | - | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mock-test-runs/.l4/ledger/r-20261105T0732Z-bd14.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mock-test-runs/.l4/ledger/r-20261105T0735Z-7e59.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mock-test-runs/.l4/ledger/r-20261105T0935Z-8037.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mock-test-runs/.l4/ledger/r-20261105T1102Z-1bd0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mock-test-runs/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-mock-test-runs/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/error-codes.test.ts` |  | relevant | named in the spec |
| `src/api/error-codes.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/test-run-codes.test.ts` |  | relevant | new test file |
| `src/api/test-run-loader.test.ts` |  | relevant | new test file |
| `src/api/test-run-refusals.test.ts` |  | relevant | new test file |
| `src/api/test-run-routes.test.ts` |  | relevant | new test file |
| `src/api/test-run-routes.ts` | api | relevant | named in the spec |
| `src/interpreter/flow-testing-policy.test.ts` |  | relevant | new test file |
| `src/interpreter/index.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/mock-invoker.test.ts` |  | relevant | new test file |
| `src/interpreter/mocks.test.ts` |  | relevant | new test file |
| `src/interpreter/mocks.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/policy/flow-testing.cedar` | interpreter | relevant | named in the spec |
| `src/main.flows.test.ts` |  | relevant | named in the spec |
| `src/main.mockruns.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/mock-run-seed.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/error-codes.ts, src/api/index.ts, src/api/test-run-routes.ts, src/interpreter/index.ts, src/interpreter/mocks.ts and 2 more

### Tests

1648 of 1648 passed, 0 failed, 0 errored, 0 skipped.
27 of 27 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-96e47324 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-601275f9 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-05ca73a7 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-541ef4f9 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f696603a | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-3e0e5412 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3fb317e4 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-e19890aa | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2e79b082 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-771f9778 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2a251ee8 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-7c2a7a3d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-de412456 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7d9b0050 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-4a0822e8 | ok | 0.710 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-28603f65 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-96e47324 | api-conventions › Every error code is registered › The registry | pass | pass | the judge passed it and a discriminating test passes |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | pass | pass | the judge passed it and a discriminating test passes |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | pass | pass | the judge passed it and a discriminating test passes |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | pass | pass | the judge passed it and a discriminating test passes |
| C-f696603a | flow-registry › The routes are session routes under the flow actions › The route table and the real engine | pass | pass | the judge passed it and a discriminating test passes |
| C-3e0e5412 | flow-testing › Mocks are checked against the flow before a run exists › Valid mocks pass and are copied | pass | pass | the judge passed it and a discriminating test passes |
| C-3fb317e4 | flow-testing › Mocks are checked against the flow before a run exists › Each problem reason, ordering and the cap | pass | pass | the judge passed it and a discriminating test passes |
| C-e19890aa | flow-testing › The mock invoker answers from the mocks and nothing else › Entries by attempt, errors and no egress | pass | pass | the judge passed it and a discriminating test passes |
| C-2e79b082 | flow-testing › The mock invoker answers from the mocks and nothing else › Mocks come from the stored run, in mock mode only | pass | pass | the judge passed it and a discriminating test passes |
| C-771f9778 | flow-testing › A stored version is loaded for a test run › Validated, draft and absent versions | pass | pass | the judge passed it and a discriminating test passes |
| C-2a251ee8 | flow-testing › The test endpoint starts a mock run as the requesting user › A mock run from request to completion | pass | pass | the judge passed it and a discriminating test passes |
| C-7c2a7a3d | flow-testing › The test endpoint starts a mock run as the requesting user › Idempotency-Key replays the same run | pass | pass | the judge passed it and a discriminating test passes |
| C-de412456 | flow-testing › The test endpoint refuses what it cannot run › Who may test which flow | pass | pass | the judge passed it and a discriminating test passes |
| C-7d9b0050 | flow-testing › The test endpoint refuses what it cannot run › Versions, bodies, mocks and a runtime that is down | pass | pass | the judge passed it and a discriminating test passes |
| C-4a0822e8 | flow-testing › test_flow is granted to authors of the owner team › The policy table | pass | pass | the judge passed it and a discriminating test passes |
| C-28603f65 | flow-testing › The engine binds the interpreter before it launches the runtime › Bind order, the route table and a run on DBOS | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.run-list.test.ts::C-96e47324 the runs failure code is registered with status and message: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-f696603a): src.api.flow-validate.test.ts::C-f696603a the flow routes are session routes under the flow actions: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-f696603a): src.main.flows.test.ts::C-f696603a the real engine serves and documents the flow routes: no proof that it discriminates (no red, audit or generated record)
- [minor, judge] Null-prototype plain-object treatment is unspecified (spec gap) (criterion C-3fb317e4): The scenarios do not specify whether objects created with a null prototype count as plain objects, while checkMocks deliberately accepts them for both the mocks container and JSON output values.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.test-run-codes.test.ts::C-96e47324 registers TEST_MOCK_INVALID with its status and message` (task 3.1): passed
- `src.api.test-run-codes.test.ts::C-96e47324 registers TEST_MOCK_MISSING with its status and message` (task 3.1): passed
- `src.api.test-run-loader.test.ts::C-771f9778 the loader answers a validated and a draft version and refuses the rest` (task 2.1): passed
- `src.api.test-run-loader.test.ts::C-771f9778 the loader answers the versions seedMockRunFlows stored` (task 2.1): passed
- `src.api.test-run-refusals.test.ts::C-7d9b0050 a failing enqueue and a missing runtime answer 503` (task 4.2): passed
- `src.api.test-run-refusals.test.ts::C-7d9b0050 versions, bodies and mocks are refused before a run exists` (task 4.2): passed
- `src.api.test-run-routes.test.ts::C-2a251ee8 a mock run is stored, enqueued and answers 202 then completes` (task 4.1): passed
- `src.api.test-run-routes.test.ts::C-7c2a7a3d an Idempotency-Key replays the same run` (task 4.1): passed
- `src.api.test-run-routes.test.ts::C-de412456 who may test which flow, and what is refused before a run` (task 4.1): passed
- `src.interpreter.flow-testing-policy.test.ts::C-4a0822e8 test_flow is granted to authors of the owner team` (task 2.2): passed
- `src.interpreter.mock-invoker.test.ts::C-2e79b082: other modes and unavailable mocks are refused` (task 1.2): passed
- `src.interpreter.mock-invoker.test.ts::C-2e79b082: the invoker answers from the mocks stored with the run` (task 1.2): passed
- `src.interpreter.mock-invoker.test.ts::C-e19890aa: error entries, missing nodes and exhausted lists fail` (task 1.2): passed
- `src.interpreter.mock-invoker.test.ts::C-e19890aa: the mock invoker answers the entry at the attempt index` (task 1.2): passed
- `src.interpreter.mock-invoker.test.ts::C-e19890aa: the mock invoker makes no outbound call` (task 1.2): passed
- `src.interpreter.mocks.test.ts::C-3e0e5412: a block the catalogue lacks is not schema checked` (task 1.1): passed
- `src.interpreter.mocks.test.ts::C-3e0e5412: an error entry is a well formed mock` (task 1.1): passed
- `src.interpreter.mocks.test.ts::C-3e0e5412: an unreachable block node needs no mock` (task 1.1): passed
- `src.interpreter.mocks.test.ts::C-3e0e5412: valid mocks pass and are copied` (task 1.1): passed
- `src.interpreter.mocks.test.ts::C-3fb317e4: a non object mocks value is one shape problem` (task 1.1): passed
- `src.interpreter.mocks.test.ts::C-3fb317e4: absent and empty mock lists are missing problems` (task 1.1): passed
- `src.interpreter.mocks.test.ts::C-3fb317e4: outputs that are not JSON are shape problems` (task 1.1): passed
- `src.interpreter.mocks.test.ts::C-3fb317e4: schema and entry shape problems` (task 1.1): passed
- `src.interpreter.mocks.test.ts::C-3fb317e4: the problem list is capped at fifty` (task 1.1): passed
- `src.interpreter.mocks.test.ts::C-3fb317e4: unknown nodes and non block nodes are problems` (task 1.1): passed
- `src.main.mockruns.test.ts::C-28603f65 main binds the interpreter before launching and completes a mock run` (task 5.1): passed
- `src.main.mockruns.test.ts::C-f696603a C-28603f65 main defines the test route and documents it` (task 5.1): passed

## Guard events

- guard.violation: test/support/README.md
- guard.violation: test/support/mock-run-seed.ts
