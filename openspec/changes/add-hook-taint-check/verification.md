# Verification: openspec:add-hook-taint-check: NEEDS_HUMAN (round 1)

traceability: 8/9 criteria covered by a discriminating test

- Base: `ec8ff2b397862e73453811bb2123249a2fad6ceb`
- Head: `95e62771ea5adca711566acc41dfe97de2c97fc9`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: beam-judge, 1 call(s), prompt sha256 `3eca32605026112262639ee9942cb89ca3173c52372579f1270068c1f0c935e1`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.2 | base main@ec8ff2b397 contained |
| 1 | integrity | ok | 535.1 | 11 sub-checks; scope: 10 changed file(s) |
| 2 | build | ok | 25.8 |  |
| 3 | tests | ok | 270.5 |  |
| 4 | traceability | ok | 0.1 | 8/9 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/authoring/taint/analyze.ts, src/authoring/validate/taint-checks.ts |
| 8 | s1 judge | ok | 0.8 | 8/9 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 187.3 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261108T1736Z-164d/051-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261108T1736Z-164d/052-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261108T1736Z-164d/053-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261108T1736Z-164d/054-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261108T1736Z-164d/055-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261108T1736Z-164d/056-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261108T1736Z-164d/057-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 2 task(s): red and green compared |
| test path freeze | ok | 2 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/authoring/taint/analyze.ts, src/authoring/taint/hook-widening.test.ts, src/authoring/validate/hook-taint.test.ts, src/authoring/validate/taint-checks.ts, src/authoring/validate/taint.test.ts (+1 more) |
| tdd history | ok | 3 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1958 of 1958 base tests pass on the unit's code with its 4 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src.authoring.validate.taint.test.ts::C-f97887e5 hook edges are not checked (named by the task text, plan:m6@3c16134bd7942f54)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-44cdb55f | flow-validation › Taint uses the shared algebra › Code no longer launders | covered | src.authoring.validate.taint.test.ts::C-44cdb55f code output keeps the taint of its input (passed, pass_to_pass); src.authoring.validate.taint.test.ts::C-44cdb55f extracted data through code passes (passed, pass_to_pass) | - | 0.91 |
| C-f97887e5 | flow-validation › Taint uses the shared algebra › Trifecta and opaque-call warnings come from U23's results | covered | src.authoring.validate.hook-taint.test.ts::C-f97887e5 an untrusted block hook ends layers at L3 with no warning (passed, red_assertion) | src.authoring.validate.taint.test.ts::C-f97887e5 hook edges are not checked (no proof that it discriminates (no red, audit or generated record)); src.authoring.validate.taint.test.ts::C-f97887e5 trifecta warnings come from the capabilities (no proof that it discriminates (no red, audit or generated ... | 0.83 |
| C-aa58516e | flow-validation › Taint uses the shared algebra › Untrusted data in a block hook is an error | covered | src.authoring.validate.hook-taint.test.ts::C-aa58516e an invalid hook id reads unnamed and no NUL reaches the result (passed, red_assertion); src.authoring.validate.hook-taint.test.ts::C-aa58516e hook input reference names the hooked node as source (passed, red_assertion); src.authoring.validate.hoo... | - | - |
| C-6ea5e31b | flow-validation › Taint uses the shared algebra › A rule hook gives one error per wrapped node | covered | src.authoring.validate.hook-taint.test.ts::C-6ea5e31b a rule hook gives one error per wrapped node (passed, pre_satisfied); src.authoring.validate.hook-taint.test.ts::C-6ea5e31b a rule hook without an id reads rule dot id (passed, pre_satisfied) | - | 0.92 |
| C-4f58ed6e | flow-validation › Taint uses the shared algebra › Hook edges that stay allowed | covered | src.authoring.validate.hook-taint.test.ts::C-4f58ed6e hook edges that stay allowed give no taint error (passed, red_assertion) | - | 0.87 |
| C-4ea2ebb2 | flow-validation › Taint uses the shared algebra › The widening reaches the validator | covered | src.authoring.taint.hook-widening.test.ts::C-4ea2ebb2 The widening reaches the validator (passed, red_assertion) | - | 0.85 |
| C-be8bdbfa | taint › Hooks add taint and never remove it › Hook references, widening and flow rules | uncovered | - | src.authoring.taint.hooks.test.ts::C-be8bdbfa Hook references widening and flow rules (no proof that it discriminates (no red, audit or generated record)) | 0.14 |
| C-9c696999 | taint › Hooks add taint and never remove it › A code hook widens a block node with every produced label | covered | src.authoring.taint.hook-widening.test.ts::C-9c696999 A code hook widens a block node with every produced label (passed, red_assertion) | - | 0.92 |
| C-8f0d2253 | taint › Static taint includes runtime taint on hooked flows › Hooked runs stay inside the static input | covered | src.interpreter.hook-taint-inclusion.test.ts::C-8f0d2253 Hooked runs stay inside the static input (passed, red_assertion) | - | 0.92 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-hook-taint-check/.l4/ledger/r-20261108T1636Z-0d2a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-taint-check/.l4/ledger/r-20261108T1736Z-164d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-taint-check/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-taint-check/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/authoring/taint/analyze.ts` | authoring | relevant | named in the spec |
| `src/authoring/taint/hook-widening.test.ts` |  | relevant | new test file |
| `src/authoring/validate/hook-taint.test.ts` |  | relevant | new test file |
| `src/authoring/validate/taint-checks.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/taint.test.ts` |  | relevant | named in the spec |
| `src/interpreter/hook-taint-inclusion.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/authoring/taint/analyze.ts, src/authoring/validate/taint-checks.ts

### Tests

2029 of 2029 passed, 0 failed, 0 errored, 0 skipped.
11 of 11 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-44cdb55f | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f97887e5 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-aa58516e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-6ea5e31b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4f58ed6e | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4ea2ebb2 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-be8bdbfa | ok | 0.140 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9c696999 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8f0d2253 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-44cdb55f | flow-validation › Taint uses the shared algebra › Code no longer launders | pass | pass | the judge passed it and a discriminating test passes |
| C-f97887e5 | flow-validation › Taint uses the shared algebra › Trifecta and opaque-call warnings come from U23's results | pass | pass | the judge passed it and a discriminating test passes |
| C-aa58516e | flow-validation › Taint uses the shared algebra › Untrusted data in a block hook is an error | pass | pass | the judge passed it and a discriminating test passes |
| C-6ea5e31b | flow-validation › Taint uses the shared algebra › A rule hook gives one error per wrapped node | pass | pass | the judge passed it and a discriminating test passes |
| C-4f58ed6e | flow-validation › Taint uses the shared algebra › Hook edges that stay allowed | pass | pass | the judge passed it and a discriminating test passes |
| C-4ea2ebb2 | flow-validation › Taint uses the shared algebra › The widening reaches the validator | pass | pass | the judge passed it and a discriminating test passes |
| C-be8bdbfa | taint › Hooks add taint and never remove it › Hook references, widening and flow rules | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-9c696999 | taint › Hooks add taint and never remove it › A code hook widens a block node with every produced label | pass | pass | the judge passed it and a discriminating test passes |
| C-8f0d2253 | taint › Static taint includes runtime taint on hooked flows › Hooked runs stay inside the static input | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-f97887e5): src.authoring.validate.taint.test.ts::C-f97887e5 hook edges are not checked: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-f97887e5): src.authoring.validate.taint.test.ts::C-f97887e5 trifecta warnings come from the capabilities: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-f97887e5): src.authoring.validate.taint.test.ts::C-f97887e5 untrusted data into a delegate or subflow is an opaque-call warning: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-be8bdbfa): src.authoring.taint.hooks.test.ts::C-be8bdbfa Hook references widening and flow rules: no proof that it discriminates (no red, audit or generated record)

## New tests (red then green, `task.red_ok` in the ledger)

- `src.authoring.taint.hook-widening.test.ts::C-4ea2ebb2 The widening reaches the validator` (task 1.1): passed
- `src.authoring.taint.hook-widening.test.ts::C-9c696999 A code hook widens a block node with every produced label` (task 1.1): passed
- `src.authoring.validate.hook-taint.test.ts::C-4f58ed6e hook edges that stay allowed give no taint error` (task 2.1): passed
- `src.authoring.validate.hook-taint.test.ts::C-6ea5e31b a rule hook gives one error per wrapped node` (task 2.2): passed
- `src.authoring.validate.hook-taint.test.ts::C-6ea5e31b a rule hook without an id reads rule dot id` (task 2.2): passed
- `src.authoring.validate.hook-taint.test.ts::C-aa58516e an invalid hook id reads unnamed and no NUL reaches the result` (task 2.1): passed
- `src.authoring.validate.hook-taint.test.ts::C-aa58516e hook input reference names the hooked node as source` (task 2.1): passed
- `src.authoring.validate.hook-taint.test.ts::C-aa58516e hook output of a post block hook is an error` (task 2.1): passed
- `src.authoring.validate.hook-taint.test.ts::C-aa58516e untrusted data in a pre block hook of mail is an error` (task 2.1): passed
- `src.authoring.validate.hook-taint.test.ts::C-f97887e5 an untrusted block hook ends layers at L3 with no warning` (task 2.1): passed
- `src.interpreter.hook-taint-inclusion.test.ts::C-8f0d2253 Hooked runs stay inside the static input` (task 1.1): passed
