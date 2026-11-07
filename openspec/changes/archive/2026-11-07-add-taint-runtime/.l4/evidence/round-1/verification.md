# Verification: openspec:add-taint-runtime: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `8194d01fc71f96c40351d8ebe86bbfb90cd8684f`
- Head: `aeb46844b91a6c1bb53bcf5db7c55d6f50bb57c5`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemolow-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@8194d01fc7 as aeb46844b9 (2 commits) |
| 1 | integrity | ok | 218.2 | 11 sub-checks (+1 unfrozen by human answers); scope: 23 changed file(s) |
| 2 | build | ok | 33.5 |  |
| 3 | tests | failed | 307.6 | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_l4_c_23a4ce1e::test_sign_in_search_parsing[chromium] |
| 4 | traceability | not_run | 0.0 | an earlier step failed |
| 4a | audit sampling | not_run | 0.0 | an earlier step failed |
| 5 | ui test generation | not_run | 0.0 | an earlier step failed |
| 6 | quality | not_run | 0.0 | an earlier step failed |
| 8 | s1 judge | not_run | 0.0 | an earlier step failed |
| 9 | judge | not_run | 0.0 | an earlier step failed |
| 10 | aggregation | ok | 0.0 | FAIL |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261107T1050Z-9cf7/093-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261107T1050Z-9cf7/094-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261107T1050Z-9cf7/095-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261107T1050Z-9cf7/096-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261107T1050Z-9cf7/097-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261107T1050Z-9cf7/098-test.log |
| e2e | fail | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261107T1050Z-9cf7/099-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 6 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 6 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/authoring/taint/analyze.ts, src/authoring/taint/inclusion.test.ts, src/authoring/taint/index.ts, src/authoring/taint/runtime-references.test.ts, src/authoring/taint/runtime.test.ts (+10 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1725 of 1725 base tests pass on the unit's code with its 5 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/authoring/taint/runtime-references.test.ts kept at head for the run (task 1.2: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/authoring/taint/runtime-references.test.ts (task 1.2, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Evidence

### Needs attention

- tests are not all green (a failed or errored test, or a new test that did not pass)

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-taint-runtime/.l4/ledger/r-20261107T0904Z-91c1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/.l4/ledger/r-20261107T1029Z-c307.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/.l4/ledger/r-20261107T1050Z-9cf7.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-runtime/tasks.md` |  | none | exempt: harness, spec or documentation path |
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

1795 of 1796 passed, 1 failed, 0 errored, 0 skipped.
16 of 16 new tests passed.

## Criteria

None judged.

## Findings

- [blocker, deterministic] e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_l4_c_23a4ce1e::test_sign_in_search_parsing[chromium] Log: `.l4-out/gates/r-20261107T1050Z-9cf7/099-e2e.log`.

## Fix unit

Fix unit 1 is created for these tasks:
- F-22a9abae e2e gate failed

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
