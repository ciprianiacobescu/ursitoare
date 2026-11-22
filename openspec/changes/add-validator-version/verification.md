# Verification: openspec:add-validator-version: PASS (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `f1aa79e4a67f663f2ea1c360d105686834c50ea8`
- Head: `20eeebaa5c63849cc1fffccf4923b9cee210d28b`
- Implementer profiles: claude-sonnet, deepseek-free
- Judge: beam-judge, 1 call(s), prompt sha256 `e49813b4f771e43dec5fef29f1da5cad0747e2b3ff4a2b1ca02e71ce63656253`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@f1aa79e4a6 contained |
| 1 | integrity | ok | 265.0 | 11 sub-checks (+2 unfrozen by human answers); scope: 32 changed file(s) |
| 2 | build | ok | 33.8 |  |
| 3 | tests | ok | 432.5 |  |
| 4 | traceability | ok | 0.2 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/grant-routes.ts, src/api/test-run-routes.ts, src/authoring/format/refs.ts, src/authoring/index.ts, src/authoring/validate/l1.ts and 7 more |
| 8 | s1 judge | ok | 0.6 | 12/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 78.2 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261122T0942Z-883f/055-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261122T0942Z-883f/056-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261122T0942Z-883f/057-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261122T0942Z-883f/058-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261122T0942Z-883f/059-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261122T0942Z-883f/060-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261122T0942Z-883f/061-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 7 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/grant-node-bound.test.ts, src/api/grant-openapi-bound.test.ts, src/api/grant-routes.ts, src/api/stale-failing-validation.test.ts, src/api/stale-round-trip.test.ts (+19 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2711 of 2711 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/interpreter/start-stale.test.ts kept at head for the run (task 5.1: unfrozen by Q-002)
- src/registry/flows/validator-version-schema.test.ts kept at head for the run (task 3.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/registry/flows/validator-version-schema.test.ts (task 3.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))
- src/interpreter/start-stale.test.ts (task 5.1, unfrozen by Q-002 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-fd3baa1e | flow-format › A reference names a node id of at most 128 characters › parseRef accepts 128 characters and refuses 129 | covered | src.authoring.format.refs-node-id.test.ts::C-fd3baa1e parseRef accepts 128 characters and refuses 129 (passed, red_assertion) | - | 0.90 |
| C-62fccf2b | flow-format › The format document states the node-id rule and the optional selector › format.md reads both phrases | covered | src.authoring.format.format-doc-bound.test.ts::C-62fccf2b format.md reads the node-id rule and the optional selector (passed, red_assertion) | - | 0.82 |
| C-49dc5e04 | flow-registry › Migration 0275 adds the validator version with its own column privilege › Ledger, column, check and column privilege | covered | src.registry.flows.validator-version-schema.test.ts::C-49dc5e04 migration 0275 adds the validator version column with its own privilege (passed, red_assertion) | - | 0.90 |
| C-5d4bb443 | flow-registry › A passing validation records the validator that made it › validateVersion stamps a passing validation and keeps the stamp on a failing one | covered | src.registry.flows.validator-stamp.test.ts::C-5d4bb443 validateVersion stamps a passing validation and keeps the stamp on a failing one (passed, red_assertion) | - | 0.81 |
| C-565b53f2 | flow-registry › A non-draft version validated by an older validator is stale › The staleness table | covered | src.registry.flows.validator-version.test.ts::C-565b53f2 isValidationStale answers the staleness table (passed, red_assertion) | - | 0.94 |
| C-02627857 | flow-validation › A node id has at most 128 characters in the L1 schema › 128 characters pass and 129 are refused with a fixed message | covered | src.authoring.validate.node-id-bound.test.ts::C-02627857 a 129-character start gives one L1_PATTERN at start (passed, red_assertion); src.authoring.validate.node-id-bound.test.ts::C-02627857 a reference to a 129-character node gives L1_REF_SYNTAX and 128 parses (passed, red_assertion); src.authoring... | - | - |
| C-eaac02ef | flow-validation › A hook nodes selector can only name an existing node › A hook nodes selector is bounded by the nodes it names | covered | src.authoring.validate.node-id-bound.test.ts::C-eaac02ef a 129-character node named by its rule stops in L1 (passed, red_assertion); src.authoring.validate.node-id-bound.test.ts::C-eaac02ef a 129-character selector entry no node has is H_SCHEMA (passed, red_assertion); src.authoring.validate.node-id... | - | 0.95 |
| C-d9e4f430 | grants › A grant's node id is at most 128 characters at the API › A 128-character node id is granted and a 129-character one is refused | covered | src.api.grant-node-bound.test.ts::C-d9e4f430 a 128 character node id is granted and a 129 character one is refused (passed, red_assertion) | - | 0.85 |
| C-fe644ebe | grants › The OpenAPI document carries the node-id bound › The committed document holds the bound five times | covered | src.api.grant-openapi-bound.test.ts::C-fe644ebe the committed document holds the node id bound five times (passed, red_assertion) | - | 0.87 |
| C-2ebc322b | interpreter › The version loader marks a stale version › The loader marks NULL and older rows, and only those | covered | src.api.test-run-loader-stale.test.ts::C-2ebc322b a failed validator-version read rejects and answers no version (passed, red_assertion); src.api.test-run-loader-stale.test.ts::C-2ebc322b the loader marks NULL and older rows and only those (passed, red_assertion) | - | 0.92 |
| C-ccc4a2fb | interpreter › A stale version is refused at run start › startRun refuses a stale version and starts a current one | covered | src.interpreter.start-stale.test.ts::C-ccc4a2fb S1 and S2: a stale validated or reviewed version is refused (passed, red_assertion); src.interpreter.start-stale.test.ts::C-ccc4a2fb S3: a stale draft reports the draft (passed, red_assertion); src.interpreter.start-stale.test.ts::C-ccc4a2fb S4: a vers... | - | 0.93 |
| C-d9e1c4a3 | interpreter › Validating again makes a stale version runnable › Stale versions are refused by both routes until the author validates again | covered | src.api.stale-round-trip.test.ts::C-d9e1c4a3 stale versions are refused by both routes until the author validates again (passed, red_assertion) | - | 0.94 |
| C-b8043656 | interpreter › A failing validation does not make a stale version runnable › A tested version that fails validation is still refused, and a passing validation releases it | covered | src.api.stale-failing-validation.test.ts::C-b8043656 a tested version that fails validation is still refused and a passing validation releases it (passed, red_assertion) | - | 0.94 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `docs/authoring/format.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-validator-version/.l4/ledger/r-20261122T0644Z-8be4.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-validator-version/.l4/ledger/r-20261122T0806Z-7c8c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-validator-version/.l4/ledger/r-20261122T0942Z-883f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-validator-version/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-validator-version/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/grant-node-bound.test.ts` |  | relevant | new test file |
| `src/api/grant-openapi-bound.test.ts` |  | relevant | new test file |
| `src/api/grant-routes.ts` | api | relevant | named in the spec |
| `src/api/stale-failing-validation.test.ts` |  | relevant | new test file |
| `src/api/stale-round-trip.test.ts` |  | relevant | new test file |
| `src/api/test-run-loader-stale.test.ts` |  | relevant | new test file |
| `src/api/test-run-routes.ts` | api | relevant | named in the spec |
| `src/authoring/format/format-doc-bound.test.ts` |  | relevant | new test file |
| `src/authoring/format/refs-node-id.test.ts` |  | relevant | new test file |
| `src/authoring/format/refs.ts` | authoring | relevant | named in the spec |
| `src/authoring/index.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/l1.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/node-id-bound.test.ts` |  | relevant | new test file |
| `src/authoring/validate/schema.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/version.ts` | authoring | relevant | named in the spec |
| `src/db/migrations/0275_validator_version.sql` | db | relevant | named in the spec |
| `src/interpreter/start-stale.test.ts` |  | relevant | new test file |
| `src/interpreter/start.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/types.ts` | interpreter | relevant | named in the spec |
| `src/registry/flows/validate.ts` | registry | relevant | named in the spec |
| `src/registry/flows/validator-stamp.test.ts` |  | relevant | new test file |
| `src/registry/flows/validator-version-schema.test.ts` |  | relevant | new test file |
| `src/registry/flows/validator-version.test.ts` |  | relevant | new test file |
| `src/registry/flows/validator-version.ts` | registry | relevant | named in the spec |
| `src/registry/index.ts` | registry | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/grant-routes.ts, src/api/test-run-routes.ts, src/authoring/format/refs.ts, src/authoring/index.ts, src/authoring/validate/l1.ts and 7 more

### Tests

2856 of 2856 passed, 0 failed, 0 errored, 0 skipped.
25 of 25 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-fd3baa1e | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-62fccf2b | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-49dc5e04 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d4bb443 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-565b53f2 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-02627857 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-eaac02ef | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d9e4f430 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fe644ebe | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2ebc322b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ccc4a2fb | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d9e1c4a3 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b8043656 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-fd3baa1e | flow-format › A reference names a node id of at most 128 characters › parseRef accepts 128 characters and refuses 129 | pass | pass | the judge passed it and a discriminating test passes |
| C-62fccf2b | flow-format › The format document states the node-id rule and the optional selector › format.md reads both phrases | pass | pass | the judge passed it and a discriminating test passes |
| C-49dc5e04 | flow-registry › Migration 0275 adds the validator version with its own column privilege › Ledger, column, check and column privilege | pass | pass | the judge passed it and a discriminating test passes |
| C-5d4bb443 | flow-registry › A passing validation records the validator that made it › validateVersion stamps a passing validation and keeps the stamp on a failing one | pass | pass | the judge passed it and a discriminating test passes |
| C-565b53f2 | flow-registry › A non-draft version validated by an older validator is stale › The staleness table | pass | pass | the judge passed it and a discriminating test passes |
| C-02627857 | flow-validation › A node id has at most 128 characters in the L1 schema › 128 characters pass and 129 are refused with a fixed message | pass | pass | the judge passed it and a discriminating test passes |
| C-eaac02ef | flow-validation › A hook nodes selector can only name an existing node › A hook nodes selector is bounded by the nodes it names | pass | pass | the judge passed it and a discriminating test passes |
| C-d9e4f430 | grants › A grant's node id is at most 128 characters at the API › A 128-character node id is granted and a 129-character one is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-fe644ebe | grants › The OpenAPI document carries the node-id bound › The committed document holds the bound five times | pass | pass | the judge passed it and a discriminating test passes |
| C-2ebc322b | interpreter › The version loader marks a stale version › The loader marks NULL and older rows, and only those | pass | pass | the judge passed it and a discriminating test passes |
| C-ccc4a2fb | interpreter › A stale version is refused at run start › startRun refuses a stale version and starts a current one | pass | pass | the judge passed it and a discriminating test passes |
| C-d9e1c4a3 | interpreter › Validating again makes a stale version runnable › Stale versions are refused by both routes until the author validates again | pass | pass | the judge passed it and a discriminating test passes |
| C-b8043656 | interpreter › A failing validation does not make a stale version runnable › A tested version that fails validation is still refused, and a passing validation releases it | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.grant-node-bound.test.ts::C-d9e4f430 a 128 character node id is granted and a 129 character one is refused` (task 7.1): passed
- `src.api.grant-openapi-bound.test.ts::C-fe644ebe the committed document holds the node id bound five times` (task 7.1): passed
- `src.api.stale-failing-validation.test.ts::C-b8043656 a tested version that fails validation is still refused and a passing validation releases it` (task 6.1): passed
- `src.api.stale-round-trip.test.ts::C-d9e1c4a3 stale versions are refused by both routes until the author validates again` (task 6.1): passed
- `src.api.test-run-loader-stale.test.ts::C-2ebc322b a failed validator-version read rejects and answers no version` (task 6.1): passed
- `src.api.test-run-loader-stale.test.ts::C-2ebc322b the loader marks NULL and older rows and only those` (task 6.1): passed
- `src.authoring.format.format-doc-bound.test.ts::C-62fccf2b format.md reads the node-id rule and the optional selector` (task 2.1): passed
- `src.authoring.format.refs-node-id.test.ts::C-fd3baa1e parseRef accepts 128 characters and refuses 129` (task 1.1): passed
- `src.authoring.validate.node-id-bound.test.ts::C-02627857 a 129-character start gives one L1_PATTERN at start` (task 1.1): passed
- `src.authoring.validate.node-id-bound.test.ts::C-02627857 a reference to a 129-character node gives L1_REF_SYNTAX and 128 parses` (task 1.1): passed
- `src.authoring.validate.node-id-bound.test.ts::C-02627857 an upper-case 129-character key keeps the old message` (task 1.1): passed
- `src.authoring.validate.node-id-bound.test.ts::C-02627857 lengths 1, 127 and 128 validate` (task 1.1): passed
- `src.authoring.validate.node-id-bound.test.ts::C-02627857 lengths 129 and 200 fail L1 with two L1_PATTERN errors` (task 1.1): passed
- `src.authoring.validate.node-id-bound.test.ts::C-02627857 the constants are 2 and 128 and the codes stay at 47` (task 1.1): passed
- `src.authoring.validate.node-id-bound.test.ts::C-eaac02ef a 129-character node named by its rule stops in L1` (task 1.1): passed
- `src.authoring.validate.node-id-bound.test.ts::C-eaac02ef a 129-character selector entry no node has is H_SCHEMA` (task 1.1): passed
- `src.authoring.validate.node-id-bound.test.ts::C-eaac02ef a selector naming the existing 128-character node passes` (task 1.1): passed
- `src.authoring.validate.node-id-bound.test.ts::C-eaac02ef a selector naming the existing node done passes` (task 1.1): passed
- `src.interpreter.start-stale.test.ts::C-ccc4a2fb S1 and S2: a stale validated or reviewed version is refused` (task 5.1): passed
- `src.interpreter.start-stale.test.ts::C-ccc4a2fb S3: a stale draft reports the draft` (task 5.1): passed
- `src.interpreter.start-stale.test.ts::C-ccc4a2fb S4: a version without stale starts and is enqueued once` (task 5.1): passed
- `src.interpreter.start-stale.test.ts::C-ccc4a2fb S5 and S6: staleness is reported before input and node-kind checks` (task 5.1): passed
- `src.registry.flows.validator-stamp.test.ts::C-5d4bb443 validateVersion stamps a passing validation and keeps the stamp on a failing one` (task 4.1): passed
- `src.registry.flows.validator-version-schema.test.ts::C-49dc5e04 migration 0275 adds the validator version column with its own privilege` (task 3.1): passed
- `src.registry.flows.validator-version.test.ts::C-565b53f2 isValidationStale answers the staleness table` (task 4.1): passed
