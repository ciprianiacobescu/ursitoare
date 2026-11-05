# Verification: openspec:add-runs-api: NEEDS_HUMAN (round 1)

traceability: 16/16 criteria covered by a discriminating test

- Base: `c21be3f53200103f0f7be20b91380ecef3565038`
- Head: `8a9ecf051fcd2c4350f08e55a191fdb3f6a97531`
- Implementer profiles: deepseek-free
- Judge: kiro-judge, 2 call(s), judged in 2 parts, prompt sha256 `215f3dd94a9d84c130e61051b3dafffbc35fba42b1d051b793ea5834b77605fb`
  - part 1: 10 file(s), 108504 characters, profile kiro-judge, reply valid
  - part 2: 6 file(s), 45740 characters, profile kiro-judge, reply valid
- Judge replies of kiro-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): kiro-judge openai (declared), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@c21be3f532 contained |
| 1 | integrity | ok | 389.2 | 11 sub-checks (+1 unfrozen by human answers); scope: 19 changed file(s) |
| 2 | build | ok | 21.0 |  |
| 3 | tests | ok | 204.9 |  |
| 4 | traceability | ok | 0.1 | 16/16 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/error-codes.ts, src/api/index.ts, src/api/run-routes.ts, src/api/run-views.ts, src/main.ts |
| 8 | s1 judge | ok | 1.5 | 14/16 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 203.3 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261105T0546Z-1861/090-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261105T0546Z-1861/091-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261105T0546Z-1861/092-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261105T0546Z-1861/093-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261105T0546Z-1861/094-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261105T0546Z-1861/095-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261105T0546Z-1861/096-e2e.log |

## Files by part

- part 1: src/api/error-codes.test.ts (616 characters)
- part 1: src/api/error-codes.ts (575 characters)
- part 1: src/api/index.ts (855 characters)
- part 1: src/main.runs.test.ts (11169 characters)
- part 1: src/main.ts (1429 characters)
- part 1: docs/api/openapi.json (36765 characters)
- part 1: src/runs/policy.test.ts (4845 characters)
- part 1: src/api/run-cancel.test.ts (17901 characters)
- part 1: src/api/run-list.test.ts (15696 characters)
- part 1: src/api/run-read.test.ts (18653 characters)
- part 2: src/api/run-routes.ts (12004 characters)
- part 2: src/api/run-tenants.test.ts (12979 characters)
- part 2: src/api/run-views.test.ts (6362 characters)
- part 2: src/api/run-views.ts (5133 characters)
- part 2: src/runs/policy/runs.cedar (717 characters)
- part 2: openspec/changes/add-runs-api/tasks.md (8545 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 6 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 6 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/error-codes.test.ts, src/api/error-codes.ts, src/api/index.ts, src/api/run-cancel.test.ts, src/api/run-list.test.ts (+8 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1546 of 1546 base tests pass on the unit's code with its 7 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/runs/policy.test.ts kept at head for the run (task 2.1: unfrozen by Q-001)
- src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (named by the task text, plan:m4@880c525cfda2ad8d)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/runs/policy.test.ts (task 2.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-96e47324 | api-conventions › Every error code is registered › The registry | covered | src.api.run-list.test.ts::C-96e47324 the runs failure code is registered with status and message (passed, red_assertion) | src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (no proof that it discriminates (no red, audit or generated record)); src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422 (no proof that ... | - |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | covered | test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan (passed, pass_to_pass) | - | 0.89 |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | covered | test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan (passed, pass_to_pass) | - | 0.85 |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | covered | src.api.error-codes.test.ts::C-541ef4f9 Route errors lists only routes whose declared codes are unregistered (passed, pass_to_pass) | - | 0.87 |
| C-8e399d8e | runs-api › Run and step views expose the stored rows › Views, schemas and the policy resource | covered | src.api.run-views.test.ts::C-8e399d8e the policy resource names the run, its tenant, owner team and initiator (passed, red_assertion); src.api.run-views.test.ts::C-8e399d8e the run view copies the stored row and leaves out internal columns (passed, red_assertion); src.api.run-views.test.ts::C-8e399d... | - | - |
| C-55135a13 | runs-api › The run list shows the owner team's runs and the caller's own › Who sees which runs | covered | src.api.run-list.test.ts::C-55135a13 the run list shows a callers teams and their own runs newest first (passed, red_assertion) | - | 0.89 |
| C-4a2fee15 | runs-api › The run list shows the owner team's runs and the caller's own › Filters and paging | covered | src.api.run-list.test.ts::C-4a2fee15 the run list filters pages and refuses bad queries (passed, red_assertion) | - | 0.95 |
| C-30c3a628 | runs-api › A run is read by its owner team and its initiator › Reading one run | covered | src.api.run-read.test.ts::C-30c3a628 a run is read by its owner team and its initiator (passed, red_assertion) | - | 0.90 |
| C-1be56c70 | runs-api › Steps are listed in seq order › Steps in order and paged | covered | src.api.run-read.test.ts::C-1be56c70 steps are listed in seq order and paged (passed, red_assertion) | - | 0.92 |
| C-931a72ff | runs-api › A payload is served only through a run that references it › Referenced, unreferenced, malformed and expired | covered | src.api.run-read.test.ts::C-931a72ff a payload is served only through a run that references it (passed, red_assertion) | - | 0.88 |
| C-f05105e2 | runs-api › Cancel stops an active run once › Cancelling an active run | covered | src.api.run-cancel.test.ts::C-f05105e2 cancelling an active run stops it once and records the event (passed, red_assertion) | - | 0.94 |
| C-c4e29aa6 | runs-api › Cancel stops an active run once › Cancel refusals leave the run alone | covered | src.api.run-cancel.test.ts::C-c4e29aa6 cancel refusals leave the run alone (passed, red_assertion) | - | 0.94 |
| C-42e9e9e8 | runs-api › A missing store or runtime answers RUNS_UNAVAILABLE › No pool and no runtime | covered | src.api.run-cancel.test.ts::C-42e9e9e8 no pool and no runtime answer RUNS_UNAVAILABLE (passed, red_assertion); src.api.run-list.test.ts::C-42e9e9e8 a list without a pool answers RUNS_UNAVAILABLE (passed, red_assertion) | - | 0.52 |
| C-489dbbf9 | runs-api › One policy fragment permits the read and debug actions › The policy table | covered | src.runs.policy.test.ts::C-489dbbf9 read and debug on a run follow the owner team and initiator (passed, red_assertion); src.runs.policy.test.ts::C-489dbbf9 the tenant list is readable and debug is denied for everyone (passed, red_assertion) | - | 0.84 |
| C-e2575718 | runs-api › Tenants never see each other's runs › Tenant B reaches nothing of tenant A | covered | src.api.run-tenants.test.ts::C-e2575718 tenant B reaches nothing of tenant A (passed, red_assertion) | - | 0.92 |
| C-6b84132d | runs-api › The routes are session routes under the run actions and are wired into the engine › The route table, the document and the wiring | covered | src.main.runs.test.ts::C-6b84132d main defines the run routes and documents them (passed, red_assertion); src.main.runs.test.ts::C-6b84132d main wires the launched runtime into the cancel route (passed, red_assertion) | - | 0.94 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-runs-api/.l4/ledger/r-20261105T0521Z-fb85.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-runs-api/.l4/ledger/r-20261105T0546Z-1861.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-runs-api/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-runs-api/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/error-codes.test.ts` |  | relevant | named in the spec |
| `src/api/error-codes.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/run-cancel.test.ts` |  | relevant | new test file |
| `src/api/run-list.test.ts` |  | relevant | new test file |
| `src/api/run-read.test.ts` |  | relevant | new test file |
| `src/api/run-routes.ts` | api | relevant | named in the spec |
| `src/api/run-tenants.test.ts` |  | relevant | new test file |
| `src/api/run-views.test.ts` |  | relevant | new test file |
| `src/api/run-views.ts` | api | relevant | named in the spec |
| `src/main.runs.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/runs/policy.test.ts` |  | relevant | new test file |
| `src/runs/policy/runs.cedar` | runs | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/error-codes.ts, src/api/index.ts, src/api/run-routes.ts, src/api/run-views.ts, src/main.ts

### Tests

1621 of 1621 passed, 0 failed, 0 errored, 0 skipped.
19 of 19 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-96e47324 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-601275f9 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-05ca73a7 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-541ef4f9 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8e399d8e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-55135a13 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4a2fee15 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-30c3a628 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1be56c70 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-931a72ff | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f05105e2 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c4e29aa6 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-42e9e9e8 | ok | 0.520 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-489dbbf9 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e2575718 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6b84132d | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-96e47324 | api-conventions › Every error code is registered › The registry | pass | pass | the judge passed it and a discriminating test passes |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | insufficient_evidence | needs_human | the judge answered insufficient_evidence |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | insufficient_evidence | needs_human | the judge answered insufficient_evidence |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | pass | pass | the judge passed it and a discriminating test passes |
| C-8e399d8e | runs-api › Run and step views expose the stored rows › Views, schemas and the policy resource | pass | pass | the judge passed it and a discriminating test passes |
| C-55135a13 | runs-api › The run list shows the owner team's runs and the caller's own › Who sees which runs | pass | pass | the judge passed it and a discriminating test passes |
| C-4a2fee15 | runs-api › The run list shows the owner team's runs and the caller's own › Filters and paging | pass | pass | the judge passed it and a discriminating test passes |
| C-30c3a628 | runs-api › A run is read by its owner team and its initiator › Reading one run | pass | pass | the judge passed it and a discriminating test passes |
| C-1be56c70 | runs-api › Steps are listed in seq order › Steps in order and paged | pass | pass | the judge passed it and a discriminating test passes |
| C-931a72ff | runs-api › A payload is served only through a run that references it › Referenced, unreferenced, malformed and expired | pass | pass | the judge passed it and a discriminating test passes |
| C-f05105e2 | runs-api › Cancel stops an active run once › Cancelling an active run | pass | pass | the judge passed it and a discriminating test passes |
| C-c4e29aa6 | runs-api › Cancel stops an active run once › Cancel refusals leave the run alone | pass | pass | the judge passed it and a discriminating test passes |
| C-42e9e9e8 | runs-api › A missing store or runtime answers RUNS_UNAVAILABLE › No pool and no runtime | pass | pass | the judge passed it and a discriminating test passes |
| C-489dbbf9 | runs-api › One policy fragment permits the read and debug actions › The policy table | pass | pass | the judge passed it and a discriminating test passes |
| C-e2575718 | runs-api › Tenants never see each other's runs › Tenant B reaches nothing of tenant A | pass | pass | the judge passed it and a discriminating test passes |
| C-6b84132d | runs-api › The routes are session routes under the run actions and are wired into the engine › The route table, the document and the wiring | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422: no proof that it discriminates (no red, audit or generated record)

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.run-cancel.test.ts::C-42e9e9e8 no pool and no runtime answer RUNS_UNAVAILABLE` (task 5.1): passed
- `src.api.run-cancel.test.ts::C-c4e29aa6 cancel refusals leave the run alone` (task 5.1): passed
- `src.api.run-cancel.test.ts::C-f05105e2 cancelling an active run stops it once and records the event` (task 5.1): passed
- `src.api.run-list.test.ts::C-42e9e9e8 a list without a pool answers RUNS_UNAVAILABLE` (task 3.1): passed
- `src.api.run-list.test.ts::C-4a2fee15 the run list filters pages and refuses bad queries` (task 3.1): passed
- `src.api.run-list.test.ts::C-55135a13 the run list shows a callers teams and their own runs newest first` (task 3.1): passed
- `src.api.run-list.test.ts::C-96e47324 the runs failure code is registered with status and message` (task 3.1): passed
- `src.api.run-read.test.ts::C-1be56c70 steps are listed in seq order and paged` (task 4.1): passed
- `src.api.run-read.test.ts::C-30c3a628 a run is read by its owner team and its initiator` (task 4.1): passed
- `src.api.run-read.test.ts::C-931a72ff a payload is served only through a run that references it` (task 4.1): passed
- `src.api.run-tenants.test.ts::C-e2575718 tenant B reaches nothing of tenant A` (task 5.1): passed
- `src.api.run-views.test.ts::C-8e399d8e the policy resource names the run, its tenant, owner team and initiator` (task 1.1): passed
- `src.api.run-views.test.ts::C-8e399d8e the run view copies the stored row and leaves out internal columns` (task 1.1): passed
- `src.api.run-views.test.ts::C-8e399d8e the step view copies the stored row and leaves out internal columns` (task 1.1): passed
- `src.api.run-views.test.ts::C-8e399d8e the view schemas list exactly the view fields` (task 1.1): passed
- `src.main.runs.test.ts::C-6b84132d main defines the run routes and documents them` (task 6.1): passed
- `src.main.runs.test.ts::C-6b84132d main wires the launched runtime into the cancel route` (task 6.1): passed
- `src.runs.policy.test.ts::C-489dbbf9 read and debug on a run follow the owner team and initiator` (task 2.1): passed
- `src.runs.policy.test.ts::C-489dbbf9 the tenant list is readable and debug is denied for everyone` (task 2.1): passed
