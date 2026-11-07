# Verification: openspec:add-taint-runtime: PASS (round 3)

traceability: 11/11 criteria covered by a discriminating test

- Base: `8194d01fc71f96c40351d8ebe86bbfb90cd8684f`
- Head: `4278abbd3b2abd8824fdd1c450a05c9eb979d4a1`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: beam-judge, 1 call(s), prompt sha256 `cb30d9ab89b5446af01c039cfde675b346aab88602d4c0134ed3a838ee16ed9c`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 2) |
| 1 | integrity | reused | 0.0 | reused (round 2) |
| 2 | build | reused | 0.0 | reused (round 2) |
| 3 | tests | reused | 0.0 | reused (round 2) |
| 4 | traceability | reused | 0.0 | reused (round 2) |
| 4a | audit sampling | reused | 0.0 | reused (round 2) |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | reused | 0.0 | reused (round 2) |
| 8 | s1 judge | reused | 0.0 | reused (round 2) |
| 9 | judge | reused | 0.0 | reused (round 2) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261107T1437Z-57b6/005-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261107T1437Z-57b6/006-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261107T1437Z-57b6/007-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261107T1437Z-57b6/008-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261107T1437Z-57b6/009-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261107T1437Z-57b6/010-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261107T1437Z-57b6/011-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base (+1 by humans, listed) |
| red-green freeze | ok | 6 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/authoring/taint/analyze.ts, src/authoring/taint/inclusion.test.ts, src/authoring/taint/index.ts, src/authoring/taint/runtime-references.test.ts, src/authoring/taint/runtime.test.ts (+10 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 1725 of 1725 base tests pass on the unit's code with its 5 test and support files at the base (base: evidence) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_l4_c_23a4ce1e.py::test_sign_in_search_parsing changed by f342c41cf4
- e2e/test_l4_c_23a4ce1e.py kept at head for the run (only people's commits changed it (f342c41cf4))

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/authoring/taint/runtime-references.test.ts kept at head for the run (task 1.2: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/authoring/taint/runtime-references.test.ts (task 1.2, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-94aebf73 | taint › Produced taint follows one per-kind rule for the validator and the runtime › Produced taint per node kind | covered | src.authoring.taint.runtime.test.ts::C-94aebf73 Produced taint per node kind (passed, red_assertion) | - | - |
| C-5d24d025 | taint › Produced taint follows one per-kind rule for the validator and the runtime › analyzeTaint and the shared rules agree on RF-1 | covered | src.authoring.taint.runtime-references.test.ts::C-5d24d025 analyzeTaint and the shared rules agree on RF-1 inputs and edges (passed, red_assertion); src.authoring.taint.runtime.test.ts::C-5d24d025 analyzeTaint and the shared rules agree on the RF-1 nodes (passed, red_assertion) | - | 0.93 |
| C-88707743 | taint › Produced taint follows one per-kind rule for the validator and the runtime › Static results equal the shared rule over the corpus | covered | src.authoring.taint.runtime.test.ts::C-88707743 Static results equal the shared rule over the corpus (passed, red_assertion) | - | - |
| C-9dec3a38 | taint › Produced taint follows one per-kind rule for the validator and the runtime › The frozen taint tests stay green unchanged | covered | src.authoring.taint.runtime.test.ts::C-9dec3a38 the frozen taint tests are present and unchanged (passed, red_assertion, inadequate) | - | 0.69 |
| C-d826722f | taint › References and values are tainted by their producers › referenceTaint and valueTaint | covered | src.authoring.taint.runtime-references.test.ts::C-d826722f referenceTaint and valueTaint (passed, red_assertion) | - | - |
| C-39ab4de6 | taint › References and values are tainted by their producers › nodeInputTaint | covered | src.authoring.taint.runtime-references.test.ts::C-39ab4de6 nodeInputTaint (passed, red_assertion) | - | 0.93 |
| C-53a36cae | taint › A run records the produced taint of each node it visits › blocksCatalogue and createRunTaints | covered | src.interpreter.taint.test.ts::C-53a36cae blocksCatalogue and createRunTaints (passed, red_assertion) | - | - |
| C-bb09f0c8 | taint › Step rows carry the effective input taint › Rows of untrusted-code and trusted-code | covered | src.interpreter.taint-rows.test.ts::C-bb09f0c8 rows of untrusted-code and trusted-code carry the effective input taint (passed, red_assertion); test.support.taint-runs.taint-runs.test.ts::C-bb09f0c8 Untrusted code and trusted code fixtures validate cleanly (passed, red_assertion) | - | - |
| C-2b621663 | taint › Step rows carry the effective input taint › A failed node keeps its input taint | covered | src.interpreter.taint-rows.test.ts::C-2b621663 a failed node keeps its input taint (passed, red_assertion) | - | 0.80 |
| C-5cd5bf46 | taint › Step rows carry the effective input taint › A replay recomputes the taint of recorded nodes | covered | src.interpreter.taint-rows.test.ts::C-5cd5bf46 a replay recomputes the taint of recorded nodes (passed, red_assertion) | - | 0.92 |
| C-43a9daa4 | taint › Static taint includes runtime taint › Static taint includes runtime taint | covered | src.authoring.taint.inclusion.test.ts::C-43a9daa4 a stub producer that is all untrusted is reported as a violation (passed, red_assertion); src.authoring.taint.inclusion.test.ts::C-43a9daa4 checked lists every node id of the RF-1 flows (passed, red_assertion); src.authoring.taint.inclusion.test.ts::... | - | 0.90 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_l4_c_23a4ce1e.py` |  | none | changed by human commit f342c41cf4 |
| `openspec/changes/add-taint-runtime-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime-fix-1/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/.l4/ledger/r-20261107T0904Z-91c1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/.l4/ledger/r-20261107T1029Z-c307.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/.l4/ledger/r-20261107T1050Z-9cf7.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/.l4/ledger/r-20261107T1326Z-f477.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/authoring/taint/analyze.ts` | authoring | relevant | named in the spec |
| `src/authoring/taint/inclusion.test.ts` |  | relevant | new test file |
| `src/authoring/taint/index.ts` | authoring | relevant | named in the spec |
| `src/authoring/taint/runtime-references.test.ts` |  | relevant | new test file |
| `src/authoring/taint/runtime.test.ts` |  | relevant | new test file |
| `src/authoring/taint/runtime.ts` | authoring | relevant | named in the spec |
| `src/interpreter/execute.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/index.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/taint-rows.test.ts` |  | relevant | new test file |
| `src/interpreter/taint.test.ts` |  | relevant | new test file |
| `src/interpreter/taint.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/visit.ts` | interpreter | relevant | named in the spec |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/taint-runs/flows/trusted-code.yaml` | test | relevant | named in the spec |
| `test/support/taint-runs/flows/untrusted-code.yaml` | test | relevant | named in the spec |
| `test/support/taint-runs/inclusion.ts` | test | relevant | named in the spec |
| `test/support/taint-runs/index.ts` | test | relevant | named in the spec |
| `test/support/taint-runs/taint-runs.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/authoring/taint/analyze.ts, src/authoring/taint/index.ts, src/authoring/taint/runtime.ts, src/interpreter/execute.ts, src/interpreter/index.ts and 4 more

### Tests

1796 of 1796 passed, 0 failed, 0 errored, 0 skipped.
16 of 16 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-94aebf73 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-5d24d025 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-88707743 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-9dec3a38 | ok | 0.690 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d826722f | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-39ab4de6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-53a36cae | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-bb09f0c8 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-2b621663 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5cd5bf46 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-43a9daa4 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-9dec3a38 | skipped | - | - | cap |
| C-d826722f | skipped | - | - | cap |
| C-bb09f0c8 | invalid | - | - | `inspect` is not allowed: import the public names you test; never locate code by reflection |
| C-88707743 | rejected | e2e/test_l4_audit_c_88707743_r2.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_88707743_r2.py |

## Rejected audit tests

- C-88707743: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_88707743_r2.py

## Answers to verdict questions

- Q-002 accept C-9dec3a38 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The seven frozen files under src/authoring/taint/ hold exactly the 16 tests that test-plan.md lists, each at its original title, and all 16 are recorded as passed in the latest test report of the unit. The frozen files import only analyzeTaint, the labels, ca...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-94aebf73 | taint › Produced taint follows one per-kind rule for the validator and the runtime › Produced taint per node kind | pass | pass | the judge passed it and a discriminating test passes |
| C-5d24d025 | taint › Produced taint follows one per-kind rule for the validator and the runtime › analyzeTaint and the shared rules agree on RF-1 | pass | pass | the judge passed it and a discriminating test passes |
| C-88707743 | taint › Produced taint follows one per-kind rule for the validator and the runtime › Static results equal the shared rule over the corpus | pass | pass | the judge passed it and a discriminating test passes |
| C-9dec3a38 | taint › Produced taint follows one per-kind rule for the validator and the runtime › The frozen taint tests stay green unchanged | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The seven frozen files under src/authoring/taint/ hold exactly the 16 tests that test-plan.md lists, each at its original title, and all 16 are recorded as passed in the latest test report of the un... |
| C-d826722f | taint › References and values are tainted by their producers › referenceTaint and valueTaint | pass | pass | the judge passed it and a discriminating test passes |
| C-39ab4de6 | taint › References and values are tainted by their producers › nodeInputTaint | pass | pass | the judge passed it and a discriminating test passes |
| C-53a36cae | taint › A run records the produced taint of each node it visits › blocksCatalogue and createRunTaints | pass | pass | the judge passed it and a discriminating test passes |
| C-bb09f0c8 | taint › Step rows carry the effective input taint › Rows of untrusted-code and trusted-code | pass | pass | the judge passed it and a discriminating test passes |
| C-2b621663 | taint › Step rows carry the effective input taint › A failed node keeps its input taint | pass | pass | the judge passed it and a discriminating test passes |
| C-5cd5bf46 | taint › Step rows carry the effective input taint › A replay recomputes the taint of recorded nodes | pass | pass | the judge passed it and a discriminating test passes |
| C-43a9daa4 | taint › Static taint includes runtime taint › Static taint includes runtime taint | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a pre-existing test is flaky on the unit's code: test.support.e2e-stack.tenant-b-part.test.ts::C-c1ed19d8 seed users come from the fake
- [minor, deterministic] an audit test could not be written (criterion C-bb09f0c8): invalid: `inspect` is not allowed: import the public names you test; never locate code by reflection
- [minor, deterministic] an audit test was rejected (criterion C-88707743): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_88707743_r2.py
- [minor, judge] producedTaint behaviour is unspecified for string or boolean nodes (spec gap) (criterion C-94aebf73): The scenario pins number, null, array and object nodes, but not string or boolean nodes; runtime.ts's default branch returns (U, {}, U) for them.
- [minor, judge] referenceTaint behaviour is unspecified for unknown reference roots (spec gap) (criterion C-d826722f): No scenario exercises a Ref whose root is neither inputs, item, node nor hook; runtime.ts returns untrusted for such a root.
- [minor, judge] nodeInputTaint behaviour is unspecified for string or boolean nodes (spec gap) (criterion C-39ab4de6): The scenario covers number and null nodes, but not string or boolean nodes; runtime.ts returns no taint for them.
- [minor, judge] the judge called a test inadequate (criterion C-9dec3a38): src.authoring.taint.runtime.test.ts::C-9dec3a38 the frozen taint tests are present and unchanged

## New tests (red then green, `task.red_ok` in the ledger)

- `src.authoring.taint.inclusion.test.ts::C-43a9daa4 a stub producer that is all untrusted is reported as a violation` (task 3.1): passed
- `src.authoring.taint.inclusion.test.ts::C-43a9daa4 checked lists every node id of the RF-1 flows` (task 3.1): passed
- `src.authoring.taint.inclusion.test.ts::C-43a9daa4 every report has no violations and the foreach cut is exact` (task 3.1): passed
- `src.authoring.taint.runtime-references.test.ts::C-39ab4de6 nodeInputTaint` (task 1.2): passed
- `src.authoring.taint.runtime-references.test.ts::C-5d24d025 analyzeTaint and the shared rules agree on RF-1 inputs and edges` (task 1.2): passed
- `src.authoring.taint.runtime-references.test.ts::C-d826722f referenceTaint and valueTaint` (task 1.2): passed
- `src.authoring.taint.runtime.test.ts::C-5d24d025 analyzeTaint and the shared rules agree on the RF-1 nodes` (task 1.1): passed
- `src.authoring.taint.runtime.test.ts::C-88707743 Static results equal the shared rule over the corpus` (task 1.1): passed
- `src.authoring.taint.runtime.test.ts::C-94aebf73 Produced taint per node kind` (task 1.1): passed
- `src.authoring.taint.runtime.test.ts::C-9dec3a38 the frozen taint tests are present and unchanged` (task 1.1): passed
- `src.interpreter.taint-rows.test.ts::C-2b621663 a failed node keeps its input taint` (task 2.3): passed
- `src.interpreter.taint-rows.test.ts::C-5cd5bf46 a replay recomputes the taint of recorded nodes` (task 2.3): passed
- `src.interpreter.taint-rows.test.ts::C-bb09f0c8 rows of untrusted-code and trusted-code carry the effective input taint` (task 2.3): passed
- `src.interpreter.taint.test.ts::C-53a36cae blocksCatalogue and createRunTaints` (task 2.1): passed
- `test.support.taint-runs.taint-runs.test.ts::C-bb09f0c8 Untrusted code and trusted code fixtures validate cleanly` (task 2.2): passed
- `test.support.taint-runs.taint-runs.test.ts::Taint run fixtures are listed loaded and described` (task 2.2): passed

## Guard events

- guard.test_tamper: e2e/test_l4_c_23a4ce1e.py
