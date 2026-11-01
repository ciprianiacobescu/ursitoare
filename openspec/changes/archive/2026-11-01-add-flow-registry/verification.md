# Verification: openspec:add-flow-registry: PASS (round 2)

traceability: 17/17 criteria covered by a discriminating test

- Base: `e2fb71225fad8ff8ccda219381783940b2cc58b2`
- Head: `213f6bc2666fc035427624065aabc5fc2ebc4bd0`
- Implementer profiles: deepseek-free, claude-sonnet, glm
- Judge: nemotron-judge, 2 call(s), judged in 2 parts, prompt sha256 `da805aebd6a9b7244db8242315aeaaed75259d3121f19f03b4ffdcea5822d521`
  - part 1: 22 file(s), 110480 characters, profile nemotron-judge, reply valid
  - part 2: 7 file(s), 104150 characters, profile nemotron-judge, reply valid
- Judge replies of nemotron-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool), glm zhipu (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 1) |
| 1 | integrity | reused | 0.0 | reused (round 1) |
| 2 | build | reused | 0.0 | reused (round 1) |
| 3 | tests | reused | 0.0 | reused (round 1) |
| 4 | traceability | reused | 0.0 | reused (round 1) |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | reused | 0.0 | reused (round 1) |
| 8 | s1 judge | reused | 0.0 | reused (round 1) |
| 9 | judge | reused | 0.0 | reused (round 1) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261101T1844Z-fba4/027-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261101T1844Z-fba4/028-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261101T1844Z-fba4/029-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261101T1844Z-fba4/030-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261101T1844Z-fba4/031-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261101T1844Z-fba4/032-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261101T1844Z-fba4/033-e2e.log |

## Files by part

- part 1: src/db/migrations/0270_flow_registry.sql (2794 characters)
- part 1: src/api/error-codes.test.ts (563 characters)
- part 1: src/api/error-codes.ts (522 characters)
- part 1: src/registry/flows/errors.ts (860 characters)
- part 1: test/support/flow-actors.ts (2701 characters)
- part 1: src/api/flow-audit.test.ts (7668 characters)
- part 1: src/api/flow-common.ts (3071 characters)
- part 1: src/api/flow-errors.test.ts (2722 characters)
- part 1: src/api/flow-errors.ts (1482 characters)
- part 1: src/api/flow-policy.test.ts (7075 characters)
- part 1: src/api/flow-routes.test.ts (10572 characters)
- part 1: src/api/flow-routes.ts (7475 characters)
- part 1: src/api/flow-validate.test.ts (13717 characters)
- part 1: src/api/flow-versions.test.ts (12063 characters)
- part 1: src/api/flow-versions.ts (7116 characters)
- part 1: src/registry/flows/flows.test.ts (12319 characters)
- part 1: src/registry/flows/flows.ts (7817 characters)
- part 1: src/registry/policy/flows.cedar (617 characters)
- part 1: src/api/index.ts (1130 characters)
- part 1: src/registry/index.ts (938 characters)
- part 1: src/main.flows.test.ts (6488 characters)
- part 1: src/main.ts (770 characters)
- part 2: docs/api/openapi.json (45835 characters)
- part 2: src/registry/flows/schema.test.ts (7377 characters)
- part 2: openspec/changes/add-flow-registry/tasks.md (12716 characters)
- part 2: src/registry/flows/validate.test.ts (10073 characters)
- part 2: src/registry/flows/validate.ts (3477 characters)
- part 2: src/registry/flows/versions.test.ts (16113 characters)
- part 2: src/registry/flows/versions.ts (8559 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 10 task(s): red and green compared |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/error-codes.test.ts, src/api/error-codes.ts, src/api/flow-audit.test.ts, src/api/flow-common.ts, src/api/flow-errors.test.ts (+20 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1275 of 1275 base tests pass on the unit's code with its 12 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (named by the task text, plan:m3@2bb26588704634f8)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-96e47324 | api-conventions › Every error code is registered › The registry | covered | src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422 (passed, red_assertion, inadequate) | src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (no proof that it discriminates (no red, audit or generated record)) | - |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | covered | test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan (passed, pass_to_pass) | - | 0.91 |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | covered | test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan (passed, pass_to_pass) | - | 0.85 |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | covered | src.api.error-codes.test.ts::C-541ef4f9 Route errors lists only routes whose declared codes are unregistered (passed, pass_to_pass) | - | 0.87 |
| C-fa599e39 | flow-registry › Flow tables are tenant tables with narrow privileges › Objects, isolation and privileges | covered | src.registry.flows.schema.test.ts::C-fa599e39 migration 0270 isolates flows and narrows privileges (passed, red_assertion) | - | 0.93 |
| C-e41f985e | flow-registry › A flow has an owner team and a tenant-unique name › Create, read, replay, conflict | covered | src.api.flow-routes.test.ts::C-e41f985e flows are created read replayed and refused over HTTP (passed, red_assertion); src.registry.flows.flows.test.ts::C-e41f985e FlowError carries its code, message and text details (passed, red_assertion); src.registry.flows.flows.test.ts::C-e41f985e createFlow re... | - | - |
| C-538382af | flow-registry › A flow has an owner team and a tenant-unique name › Lists show only the caller's teams and page with the cursor contract | covered | src.api.flow-routes.test.ts::C-538382af lists show the callers teams and page with the cursor contract (passed, red_assertion); src.registry.flows.flows.test.ts::C-538382af listFlows filters by team and pages by flow id (passed, red_assertion) | - | 0.94 |
| C-ce591faf | flow-registry › Edit and read are scoped to the owner team › Who may call | covered | src.api.flow-policy.test.ts::C-ce591faf who may call the flow routes is scoped to the owner team (passed, red_assertion) | - | 0.90 |
| C-a41d1eac | flow-registry › Saving text stores an immutable version keyed by its content hash › Save, deduplicate, number, read | covered | src.api.flow-versions.test.ts::C-a41d1eac versions are saved deduplicated numbered and read over HTTP (passed, red_assertion); src.registry.flows.versions.test.ts::C-a41d1eac getVersion returns text, canonical and no result for the right flow only (passed, red_assertion); src.registry.flows.versions... | - | - |
| C-042f1711 | flow-registry › Saving text stores an immutable version keyed by its content hash › Text that is not a flow document is refused | covered | src.api.flow-versions.test.ts::C-042f1711 text that is not a flow document is refused over HTTP (passed, red_assertion); src.registry.flows.versions.test.ts::C-042f1711 saveFlowVersion refuses a text over the size limit (passed, red_assertion); src.registry.flows.versions.test.ts::C-042f1711 saveFlo... | - | 0.92 |
| C-4d1b43b3 | flow-registry › Saving text stores an immutable version keyed by its content hash › Concurrent saves | covered | src.registry.flows.versions.test.ts::C-4d1b43b3 concurrent saves of different texts are numbered gaplessly (passed, red_assertion); src.registry.flows.versions.test.ts::C-4d1b43b3 concurrent saves of the same text store one version (passed, red_assertion) | - | 0.91 |
| C-5cccca9d | flow-registry › Validation is stored with the version as a point in time › Validate and promote | covered | src.api.flow-validate.test.ts::C-5cccca9d validating over HTTP stores the result and promotes only an ok version (passed, red_assertion); src.registry.flows.validate.test.ts::C-5cccca9d C-e8b0edd9 a state outside draft and validated is left alone while the result is stored (passed, red_assertion, in... | - | 0.93 |
| C-e8b0edd9 | flow-registry › Validation is stored with the version as a point in time › A later validation replaces the earlier one | covered | src.api.flow-validate.test.ts::C-e8b0edd9 a later validation over HTTP replaces the earlier one (passed, red_assertion); src.registry.flows.validate.test.ts::C-5cccca9d C-e8b0edd9 a state outside draft and validated is left alone while the result is stored (passed, red_assertion, inadequate); src.re... | - | 0.91 |
| C-920a230a | flow-registry › Validation is stored with the version as a point in time › Validation failures change nothing | covered | src.api.flow-validate.test.ts::C-920a230a validation failures over HTTP change nothing (passed, red_assertion); src.registry.flows.validate.test.ts::C-920a230a validateVersion refuses a malformed hash and an unknown or foreign version (passed, red_assertion) | - | 0.93 |
| C-94dc4b8c | flow-registry › Every change is audited in its own transaction › Events, deduplication and rollback | covered | src.api.flow-audit.test.ts::C-94dc4b8c the flow routes audit each change once and roll back on a failed append (passed, red_assertion); src.registry.flows.validate.test.ts::C-94dc4b8c validateVersion appends one event with the counts and the state (passed, red_assertion); src.registry.flows.versions... | - | 0.91 |
| C-f696603a | flow-registry › The routes are session routes under the flow actions › The route table and the real engine | covered | src.api.flow-validate.test.ts::C-f696603a the flow routes are session routes under the flow actions (passed, red_assertion); src.main.flows.test.ts::C-f696603a the real engine serves and documents the flow routes (passed, red_assertion) | - | 0.92 |
| C-226d18fa | flow-registry › The flow text refusal is a registered code › The mapping | covered | src.api.flow-errors.test.ts::C-226d18fa: FLOW_INVALID, FLOW_NOT_FOUND and FLOW_EXISTS map to registered codes (passed, red_assertion); src.api.flow-errors.test.ts::C-226d18fa: FLOW_TEXT_INVALID maps with its details (passed, red_assertion); src.api.flow-errors.test.ts::C-226d18fa: FLOW_UNKNOWN_TEAM ... | - | 0.93 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-flow-registry/.l4/ledger/r-20261101T1609Z-fccb.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-flow-registry/.l4/ledger/r-20261101T1844Z-fba4.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-flow-registry/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/error-codes.test.ts` |  | relevant | named in the spec |
| `src/api/error-codes.ts` | api | relevant | named in the spec |
| `src/api/flow-audit.test.ts` |  | relevant | new test file |
| `src/api/flow-common.ts` | api | relevant | named in the spec |
| `src/api/flow-errors.test.ts` |  | relevant | new test file |
| `src/api/flow-errors.ts` | api | relevant | named in the spec |
| `src/api/flow-policy.test.ts` |  | relevant | new test file |
| `src/api/flow-routes.test.ts` |  | relevant | new test file |
| `src/api/flow-routes.ts` | api | relevant | named in the spec |
| `src/api/flow-validate.test.ts` |  | relevant | new test file |
| `src/api/flow-versions.test.ts` |  | relevant | new test file |
| `src/api/flow-versions.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/db/migrations/0270_flow_registry.sql` | db | relevant | named in the spec |
| `src/main.flows.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/registry/flows/errors.ts` | registry | relevant | named in the spec |
| `src/registry/flows/flows.test.ts` |  | relevant | new test file |
| `src/registry/flows/flows.ts` | registry | relevant | named in the spec |
| `src/registry/flows/schema.test.ts` |  | relevant | new test file |
| `src/registry/flows/validate.test.ts` |  | relevant | new test file |
| `src/registry/flows/validate.ts` | registry | relevant | named in the spec |
| `src/registry/flows/versions.test.ts` |  | relevant | new test file |
| `src/registry/flows/versions.ts` | registry | relevant | named in the spec |
| `src/registry/index.ts` | registry | relevant | named in the spec |
| `src/registry/policy/flows.cedar` | registry | relevant | named in the spec |
| `test/support/flow-actors.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/error-codes.ts, src/api/flow-common.ts, src/api/flow-errors.ts, src/api/flow-routes.ts, src/api/flow-versions.ts and 8 more

### Tests

1368 of 1368 passed, 0 failed, 0 errored, 0 skipped.
40 of 40 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-96e47324 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-601275f9 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-05ca73a7 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-541ef4f9 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fa599e39 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e41f985e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-538382af | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ce591faf | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a41d1eac | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-042f1711 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4d1b43b3 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5cccca9d | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e8b0edd9 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-920a230a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-94dc4b8c | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f696603a | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-226d18fa | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-001 accept C-96e47324 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. ERROR_CODES in src/api/error-codes.ts holds exactly the 23 entries the scenario lists, each with the exact status and message, FLOW_TEXT_INVALID 422 "Flow text is not a readable flow document" included, and isRegisteredCode is an own-property check, so it is ...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-96e47324 | api-conventions › Every error code is registered › The registry | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. ERROR_CODES in src/api/error-codes.ts holds exactly the 23 entries the scenario lists, each with the exact status and message, FLOW_TEXT_INVALID 422 "Flow text is not a readable flow document" inclu... |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | pass | pass | the judge passed it and a discriminating test passes |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | pass | pass | the judge passed it and a discriminating test passes |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | pass | pass | the judge passed it and a discriminating test passes |
| C-fa599e39 | flow-registry › Flow tables are tenant tables with narrow privileges › Objects, isolation and privileges | pass | pass | the judge passed it and a discriminating test passes |
| C-e41f985e | flow-registry › A flow has an owner team and a tenant-unique name › Create, read, replay, conflict | pass | pass | the judge passed it and a discriminating test passes |
| C-538382af | flow-registry › A flow has an owner team and a tenant-unique name › Lists show only the caller's teams and page with the cursor contract | pass | pass | the judge passed it and a discriminating test passes |
| C-ce591faf | flow-registry › Edit and read are scoped to the owner team › Who may call | pass | pass | the judge passed it and a discriminating test passes |
| C-a41d1eac | flow-registry › Saving text stores an immutable version keyed by its content hash › Save, deduplicate, number, read | pass | pass | the judge passed it and a discriminating test passes |
| C-042f1711 | flow-registry › Saving text stores an immutable version keyed by its content hash › Text that is not a flow document is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-4d1b43b3 | flow-registry › Saving text stores an immutable version keyed by its content hash › Concurrent saves | pass | pass | the judge passed it and a discriminating test passes |
| C-5cccca9d | flow-registry › Validation is stored with the version as a point in time › Validate and promote | pass | pass | the judge passed it and a discriminating test passes |
| C-e8b0edd9 | flow-registry › Validation is stored with the version as a point in time › A later validation replaces the earlier one | pass | pass | the judge passed it and a discriminating test passes |
| C-920a230a | flow-registry › Validation is stored with the version as a point in time › Validation failures change nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-94dc4b8c | flow-registry › Every change is audited in its own transaction › Events, deduplication and rollback | pass | pass | the judge passed it and a discriminating test passes |
| C-f696603a | flow-registry › The routes are session routes under the flow actions › The route table and the real engine | pass | pass | the judge passed it and a discriminating test passes |
| C-226d18fa | flow-registry › The flow text refusal is a registered code › The mapping | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message: no proof that it discriminates (no red, audit or generated record)
- [minor, judge] the judge called a test inadequate (criterion C-96e47324): src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422
- [minor, judge] the judge called a test inadequate (criterion C-5cccca9d): src.registry.flows.validate.test.ts::C-5cccca9d C-e8b0edd9 a state outside draft and validated is left alone while the result is stored
- [minor, judge] the judge called a test inadequate (criterion C-e8b0edd9): src.registry.flows.validate.test.ts::C-5cccca9d C-e8b0edd9 a state outside draft and validated is left alone while the result is stored
- [minor, judge] the judge called a test inadequate (criterion C-226d18fa): src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.flow-audit.test.ts::C-94dc4b8c the flow routes audit each change once and roll back on a failed append` (task 5.3): passed
- `src.api.flow-errors.test.ts::C-226d18fa: FLOW_INVALID, FLOW_NOT_FOUND and FLOW_EXISTS map to registered codes` (task 4.1): passed
- `src.api.flow-errors.test.ts::C-226d18fa: FLOW_TEXT_INVALID maps with its details` (task 4.1): passed
- `src.api.flow-errors.test.ts::C-226d18fa: FLOW_UNKNOWN_TEAM maps to OPERATION_REFUSED with the reason` (task 4.1): passed
- `src.api.flow-errors.test.ts::C-226d18fa: other errors pass through unchanged` (task 4.1): passed
- `src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422` (task 4.1): passed
- `src.api.flow-policy.test.ts::C-ce591faf who may call the flow routes is scoped to the owner team` (task 5.4): passed
- `src.api.flow-routes.test.ts::C-538382af lists show the callers teams and page with the cursor contract` (task 5.1): passed
- `src.api.flow-routes.test.ts::C-e41f985e flows are created read replayed and refused over HTTP` (task 5.1): passed
- `src.api.flow-validate.test.ts::C-5cccca9d validating over HTTP stores the result and promotes only an ok version` (task 5.3): passed
- `src.api.flow-validate.test.ts::C-920a230a validation failures over HTTP change nothing` (task 5.3): passed
- `src.api.flow-validate.test.ts::C-e8b0edd9 a later validation over HTTP replaces the earlier one` (task 5.3): passed
- `src.api.flow-validate.test.ts::C-f696603a the flow routes are session routes under the flow actions` (task 5.3): passed
- `src.api.flow-versions.test.ts::C-042f1711 text that is not a flow document is refused over HTTP` (task 5.2): passed
- `src.api.flow-versions.test.ts::C-a41d1eac versions are saved deduplicated numbered and read over HTTP` (task 5.2): passed
- `src.main.flows.test.ts::C-f696603a the real engine serves and documents the flow routes` (task 6.1): passed
- `src.registry.flows.flows.test.ts::C-538382af listFlows filters by team and pages by flow id` (task 2.1): passed
- `src.registry.flows.flows.test.ts::C-e41f985e FlowError carries its code, message and text details` (task 2.1): passed
- `src.registry.flows.flows.test.ts::C-e41f985e createFlow refuses a bad name, a duplicate and an unknown team` (task 2.1): passed
- `src.registry.flows.flows.test.ts::C-e41f985e createFlow refuses a transaction of another tenant` (task 2.1): passed
- `src.registry.flows.flows.test.ts::C-e41f985e createFlow stores a flow and appends its audit event` (task 2.1): passed
- `src.registry.flows.flows.test.ts::C-e41f985e getFlow and flowOwnerTeam read the tenant's own flows only` (task 2.1): passed
- `src.registry.flows.schema.test.ts::C-fa599e39 migration 0270 isolates flows and narrows privileges` (task 1.1): passed
- `src.registry.flows.validate.test.ts::C-5cccca9d C-e8b0edd9 a state outside draft and validated is left alone while the result is stored` (task 3.2): passed
- `src.registry.flows.validate.test.ts::C-5cccca9d validateVersion keeps a failing version a draft and stores the issues` (task 3.2): passed
- `src.registry.flows.validate.test.ts::C-5cccca9d validateVersion stores an ok result and promotes to validated` (task 3.2): passed
- `src.registry.flows.validate.test.ts::C-920a230a validateVersion refuses a malformed hash and an unknown or foreign version` (task 3.2): passed
- `src.registry.flows.validate.test.ts::C-94dc4b8c validateVersion appends one event with the counts and the state` (task 3.2): passed
- `src.registry.flows.validate.test.ts::C-e8b0edd9 a later validation replaces the earlier result and can demote` (task 3.2): passed
- `src.registry.flows.versions.test.ts::C-042f1711 saveFlowVersion refuses a text over the size limit` (task 3.1): passed
- `src.registry.flows.versions.test.ts::C-042f1711 saveFlowVersion refuses text that is not a flow document` (task 3.1): passed
- `src.registry.flows.versions.test.ts::C-4d1b43b3 concurrent saves of different texts are numbered gaplessly` (task 3.1): passed
- `src.registry.flows.versions.test.ts::C-4d1b43b3 concurrent saves of the same text store one version` (task 3.1): passed
- `src.registry.flows.versions.test.ts::C-94dc4b8c a failed audit append rolls the save back` (task 3.1): passed
- `src.registry.flows.versions.test.ts::C-94dc4b8c saveFlowVersion appends one flow.version_saved event` (task 3.1): passed
- `src.registry.flows.versions.test.ts::C-a41d1eac getVersion returns text, canonical and no result for the right flow only` (task 3.1): passed
- `src.registry.flows.versions.test.ts::C-a41d1eac listVersions pages newest first with next` (task 3.1): passed
- `src.registry.flows.versions.test.ts::C-a41d1eac saveFlowVersion numbers versions and getFlow shows the latest` (task 3.1): passed
- `src.registry.flows.versions.test.ts::C-a41d1eac saveFlowVersion refuses an unknown flow and a bad flow id` (task 3.1): passed
- `src.registry.flows.versions.test.ts::C-a41d1eac saveFlowVersion stores a draft and answers the same content again` (task 3.1): passed

## Guard events

- guard.violation: test/support/flow-actors.ts
