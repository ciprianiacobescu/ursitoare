# Verification: openspec:add-envelope-store: PASS (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `fc0d8c2586c4cf71241c3eaf20edd9a48674fd2d`
- Head: `d2938f2f65460903190630594294c9606946e2b1`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: kiro-judge, 3 call(s), judged in 2 parts and 1 follow-up, prompt sha256 `241bc3710c679bce34d8844f21be939ff5c6c236f84f077639fe328ec6139736`
  - part 1: 18 file(s), 114962 characters, profile kiro-judge, reply valid
  - part 2: 5 file(s), 32069 characters, profile kiro-judge, reply valid
  - follow-up 1: C-3f57e610; files of parts 1 and 2: 3 file(s), 17257 characters, profile kiro-judge, reply valid
- Judge replies of kiro-judge (this unit, all rounds): valid 3, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): kiro-judge openai (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@fc0d8c2586 contained |
| 1 | integrity | ok | 299.0 | 11 sub-checks (+1 unfrozen by human answers); scope: 26 changed file(s) |
| 2 | build | ok | 21.3 |  |
| 3 | tests | ok | 178.4 |  |
| 4 | traceability | ok | 0.1 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/runs/store/canonical.ts, src/runs/store/envelope-store.ts, src/runs/store/errors.ts, src/runs/store/events.ts, src/runs/store/memory-store.ts and 5 more |
| 8 | s1 judge | ok | 0.7 | 9/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 299.7 | 3 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261103T2047Z-7671/085-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261103T2047Z-7671/086-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261103T2047Z-7671/087-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261103T2047Z-7671/088-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261103T2047Z-7671/089-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261103T2047Z-7671/090-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261103T2047Z-7671/091-e2e.log |

## Files by part

- part 1: src/db/migrations/0310_run_data.sql (5098 characters)
- part 1: src/runs/store/canonical.test.ts (3106 characters)
- part 1: src/runs/store/canonical.ts (1700 characters)
- part 1: src/runs/store/envelope-store.test.ts (7036 characters)
- part 1: src/runs/store/envelope-store.ts (3732 characters)
- part 1: src/runs/store/errors.ts (686 characters)
- part 1: src/runs/store/events.test.ts (4921 characters)
- part 1: src/runs/store/events.ts (1856 characters)
- part 1: src/runs/store/failure.test.ts (6407 characters)
- part 1: src/runs/store/isolation.test.ts (9639 characters)
- part 1: src/runs/store/memory-store.ts (7644 characters)
- part 1: src/db/prepare.test.ts (2570 characters)
- part 1: src/runs/store/run-list.test.ts (7607 characters)
- part 1: src/runs/store/run-repository.test.ts (15717 characters)
- part 1: src/runs/store/run-repository.ts (9836 characters)
- part 1: src/runs/store/run-store.ts (1704 characters)
- part 1: src/runs/store/schema.test.ts (11717 characters)
- part 1: src/runs/store/step-repository.test.ts (13986 characters)
- part 2: src/runs/store/step-repository.ts (5778 characters)
- part 2: src/runs/store/store-contract.test.ts (7909 characters)
- part 2: openspec/changes/add-envelope-store/tasks.md (9200 characters)
- part 2: src/runs/store/tenant.ts (831 characters)
- part 2: src/runs/store/validate.ts (8351 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 9 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/db/prepare.test.ts, src/runs/store/canonical.test.ts, src/runs/store/canonical.ts, src/runs/store/envelope-store.test.ts, src/runs/store/envelope-store.ts (+16 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1425 of 1425 base tests pass on the unit's code with its 10 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/runs/store/step-repository.test.ts kept at head for the run (task 4.1: unfrozen by Q-001)
- src.db.prepare.test.ts::C-58e0ebf0 prepareDatabase migrates first and then creates the partition window (named by the task text, plan:m4@efd19d970eba21b1)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/runs/store/step-repository.test.ts (task 4.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-d540ef0d | run-data › Run tables are tenant tables with narrow privileges › Objects, isolation and privileges | covered | src.runs.store.schema.test.ts::C-d540ef0d run tables are tenant leading with forced row security and narrow privileges (passed, red_assertion) | - | 0.94 |
| C-9c1a9ff9 | run-data › Run tables are tenant tables with narrow privileges › Rows land in the daily and monthly partitions | covered | src.runs.store.schema.test.ts::C-9c1a9ff9 rows land in the daily and monthly partitions (passed, red_assertion) | - | 0.87 |
| C-193e184c | run-data › Payloads are content-addressed by their canonical JSON › Canonical JSON and the digest | covered | src.runs.store.canonical.test.ts::C-193e184c canonical JSON sorts keys by code unit and hashes the UTF-8 text (passed, red_assertion); src.runs.store.canonical.test.ts::C-193e184c payloadDigest refuses values that are not plain JSON (passed, red_assertion) | - | 0.94 |
| C-1a8df1d4 | run-data › Payloads are content-addressed by their canonical JSON › The envelope store keeps each value once per tenant | covered | src.runs.store.envelope-store.test.ts::C-1a8df1d4 a payload is stored once per tenant and stays invisible to the other (passed, red_assertion); src.runs.store.envelope-store.test.ts::C-1a8df1d4 put enforces the canonical byte limit and refuses non JSON (passed, red_assertion); src.runs.store.envelop... | - | - |
| C-ad92c640 | run-data › A run is created once and moves only along the states a transition allows › Create is idempotent and validated | covered | src.runs.store.run-repository.test.ts::C-ad92c640 concurrent create stores one run and returns the same record (passed, red_assertion); src.runs.store.run-repository.test.ts::C-ad92c640 create refuses invalid runs and unknown tenants (passed, red_assertion); src.runs.store.run-repository.test.ts::C-... | - | - |
| C-544dbbea | run-data › A run is created once and moves only along the states a transition allows › A transition applies only from the listed states | covered | src.runs.store.run-repository.test.ts::C-544dbbea a transition race leaves one state and invalid changes are refused (passed, red_assertion); src.runs.store.run-repository.test.ts::C-544dbbea transition applies only from the listed states (passed, red_assertion) | - | - |
| C-3e38f9ae | run-data › A run is created once and moves only along the states a transition allows › List pages newest first and applies the filter | covered | src.runs.store.run-list.test.ts::C-3e38f9ae list pages newest first and applies the filter (passed, red_assertion); src.runs.store.run-list.test.ts::C-3e38f9ae list refuses invalid queries (passed, red_assertion) | - | 0.95 |
| C-f48b0c8c | run-data › A step is one row per attempt key › A step is recorded once per key, in its run's day | covered | src.runs.store.step-repository.test.ts::C-f48b0c8c step upsert records one row per attempt key (passed, red_assertion); src.runs.store.step-repository.test.ts::C-f48b0c8c step upsert refuses invalid steps and duplicate seq (passed, red_assertion) | - | - |
| C-101276df | run-data › A step is one row per attempt key › Steps page by seq and a payload belongs to the runs that reference it | covered | src.runs.store.step-repository.test.ts::C-101276df referencedBy reports only the run own payloads (passed, red_assertion); src.runs.store.step-repository.test.ts::C-101276df steps page by seq with an exclusive cursor (passed, red_assertion) | - | 0.91 |
| C-6e531903 | run-data › An event is appended once and never changed › Events are appended and a replay is ignored | covered | src.runs.store.events.test.ts::C-6e531903 events are appended once and a replay is ignored (passed, red_assertion); src.runs.store.events.test.ts::C-6e531903 events refuse invalid values and oversized data (passed, red_assertion) | - | 0.92 |
| C-9bff3a45 | run-data › Every repository call checks its transaction's tenant › Two tenants never see each other's run data | covered | src.runs.store.isolation.test.ts::C-9bff3a45 two tenants never see each other run data (passed, red_assertion) | - | 0.95 |
| C-00b13bed | run-data › A failing query rolls back the call's writes and surfaces unchanged › A failing database | covered | src.runs.store.failure.test.ts::C-00b13bed a failing database rejects with the same error and rolls back (passed, red_assertion) | - | 0.95 |
| C-3f57e610 | run-data › The in-memory store obeys the database store's contract › One operation sequence gives equal results in both stores | covered | src.runs.store.store-contract.test.ts::C-3f57e610 one operation sequence gives equal results in both stores (passed, red_assertion) | - | 0.95 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-envelope-store/.l4/ledger/r-20261103T1925Z-0eec.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-envelope-store/.l4/ledger/r-20261103T2047Z-7671.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-envelope-store/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-envelope-store/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/db/migrations/0310_run_data.sql` | db | relevant | named in the spec |
| `src/db/prepare.test.ts` |  | relevant | named in the spec |
| `src/runs/store/canonical.test.ts` |  | relevant | new test file |
| `src/runs/store/canonical.ts` | runs | relevant | named in the spec |
| `src/runs/store/envelope-store.test.ts` |  | relevant | new test file |
| `src/runs/store/envelope-store.ts` | runs | relevant | named in the spec |
| `src/runs/store/errors.ts` | runs | relevant | named in the spec |
| `src/runs/store/events.test.ts` |  | relevant | new test file |
| `src/runs/store/events.ts` | runs | relevant | named in the spec |
| `src/runs/store/failure.test.ts` |  | relevant | new test file |
| `src/runs/store/isolation.test.ts` |  | relevant | new test file |
| `src/runs/store/memory-store.ts` | runs | relevant | named in the spec |
| `src/runs/store/run-list.test.ts` |  | relevant | new test file |
| `src/runs/store/run-repository.test.ts` |  | relevant | new test file |
| `src/runs/store/run-repository.ts` | runs | relevant | named in the spec |
| `src/runs/store/run-store.ts` | runs | relevant | named in the spec |
| `src/runs/store/schema.test.ts` |  | relevant | new test file |
| `src/runs/store/step-repository.test.ts` |  | relevant | new test file |
| `src/runs/store/step-repository.ts` | runs | relevant | named in the spec |
| `src/runs/store/store-contract.test.ts` |  | relevant | new test file |
| `src/runs/store/tenant.ts` | runs | relevant | named in the spec |
| `src/runs/store/validate.ts` | runs | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/runs/store/canonical.ts, src/runs/store/envelope-store.ts, src/runs/store/errors.ts, src/runs/store/events.ts, src/runs/store/memory-store.ts and 5 more

### Tests

1504 of 1504 passed, 0 failed, 0 errored, 0 skipped.
23 of 23 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-d540ef0d | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9c1a9ff9 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-193e184c | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1a8df1d4 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-ad92c640 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-544dbbea | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-3e38f9ae | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f48b0c8c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-101276df | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6e531903 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9bff3a45 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-00b13bed | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3f57e610 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-d540ef0d | run-data › Run tables are tenant tables with narrow privileges › Objects, isolation and privileges | pass | pass | the judge passed it and a discriminating test passes |
| C-9c1a9ff9 | run-data › Run tables are tenant tables with narrow privileges › Rows land in the daily and monthly partitions | pass | pass | the judge passed it and a discriminating test passes |
| C-193e184c | run-data › Payloads are content-addressed by their canonical JSON › Canonical JSON and the digest | pass | pass | the judge passed it and a discriminating test passes |
| C-1a8df1d4 | run-data › Payloads are content-addressed by their canonical JSON › The envelope store keeps each value once per tenant | pass | pass | the judge passed it and a discriminating test passes |
| C-ad92c640 | run-data › A run is created once and moves only along the states a transition allows › Create is idempotent and validated | pass | pass | the judge passed it and a discriminating test passes |
| C-544dbbea | run-data › A run is created once and moves only along the states a transition allows › A transition applies only from the listed states | pass | pass | the judge passed it and a discriminating test passes |
| C-3e38f9ae | run-data › A run is created once and moves only along the states a transition allows › List pages newest first and applies the filter | pass | pass | the judge passed it and a discriminating test passes |
| C-f48b0c8c | run-data › A step is one row per attempt key › A step is recorded once per key, in its run's day | pass | pass | the judge passed it and a discriminating test passes |
| C-101276df | run-data › A step is one row per attempt key › Steps page by seq and a payload belongs to the runs that reference it | pass | pass | the judge passed it and a discriminating test passes |
| C-6e531903 | run-data › An event is appended once and never changed › Events are appended and a replay is ignored | pass | pass | the judge passed it and a discriminating test passes |
| C-9bff3a45 | run-data › Every repository call checks its transaction's tenant › Two tenants never see each other's run data | pass | pass | the judge passed it and a discriminating test passes |
| C-00b13bed | run-data › A failing query rolls back the call's writes and surfaces unchanged › A failing database | pass | pass | the judge passed it and a discriminating test passes |
| C-3f57e610 | run-data › The in-memory store obeys the database store's contract › One operation sequence gives equal results in both stores | pass | pass | the judge passed it and a discriminating test passes; its evidence was split over parts 1 and 2 of the diff: follow-up call 1 judged its 3 files of those parts together and answered pass |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.runs.store.canonical.test.ts::C-193e184c canonical JSON sorts keys by code unit and hashes the UTF-8 text` (task 2.1): passed
- `src.runs.store.canonical.test.ts::C-193e184c payloadDigest refuses values that are not plain JSON` (task 2.1): passed
- `src.runs.store.envelope-store.test.ts::C-1a8df1d4 a payload is stored once per tenant and stays invisible to the other` (task 2.2): passed
- `src.runs.store.envelope-store.test.ts::C-1a8df1d4 put enforces the canonical byte limit and refuses non JSON` (task 2.2): passed
- `src.runs.store.envelope-store.test.ts::C-1a8df1d4 put stores each canonical value once and get returns it` (task 2.2): passed
- `src.runs.store.events.test.ts::C-6e531903 events are appended once and a replay is ignored` (task 4.2): passed
- `src.runs.store.events.test.ts::C-6e531903 events refuse invalid values and oversized data` (task 4.2): passed
- `src.runs.store.failure.test.ts::C-00b13bed a failing database rejects with the same error and rolls back` (task 5.1): passed
- `src.runs.store.isolation.test.ts::C-9bff3a45 two tenants never see each other run data` (task 5.1): passed
- `src.runs.store.run-list.test.ts::C-3e38f9ae list pages newest first and applies the filter` (task 3.2): passed
- `src.runs.store.run-list.test.ts::C-3e38f9ae list refuses invalid queries` (task 3.2): passed
- `src.runs.store.run-repository.test.ts::C-544dbbea a transition race leaves one state and invalid changes are refused` (task 3.1): passed
- `src.runs.store.run-repository.test.ts::C-544dbbea transition applies only from the listed states` (task 3.1): passed
- `src.runs.store.run-repository.test.ts::C-ad92c640 concurrent create stores one run and returns the same record` (task 3.1): passed
- `src.runs.store.run-repository.test.ts::C-ad92c640 create refuses invalid runs and unknown tenants` (task 3.1): passed
- `src.runs.store.run-repository.test.ts::C-ad92c640 create stores a queued run once with content addressed payloads` (task 3.1): passed
- `src.runs.store.schema.test.ts::C-9c1a9ff9 rows land in the daily and monthly partitions` (task 1.1): passed
- `src.runs.store.schema.test.ts::C-d540ef0d run tables are tenant leading with forced row security and narrow privileges` (task 1.1): passed
- `src.runs.store.step-repository.test.ts::C-101276df referencedBy reports only the run own payloads` (task 4.1): passed
- `src.runs.store.step-repository.test.ts::C-101276df steps page by seq with an exclusive cursor` (task 4.1): passed
- `src.runs.store.step-repository.test.ts::C-f48b0c8c step upsert records one row per attempt key` (task 4.1): passed
- `src.runs.store.step-repository.test.ts::C-f48b0c8c step upsert refuses invalid steps and duplicate seq` (task 4.1): passed
- `src.runs.store.store-contract.test.ts::C-3f57e610 one operation sequence gives equal results in both stores` (task 5.2): passed
