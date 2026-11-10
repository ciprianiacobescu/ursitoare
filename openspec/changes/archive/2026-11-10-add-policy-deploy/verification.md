# Verification: openspec:add-policy-deploy: PASS (round 1)

traceability: 15/15 criteria covered by a discriminating test

- Base: `7442294aa0de1c4ffa76284d5342b7c92177e075`
- Head: `f9da4182101d05f2fdb5dfb9123bd2eb2a79b9f0`
- Implementer profiles: deepseek-free, claude-sonnet, glm
- Judge: nemotron-judge, 2 call(s), judged in 2 parts, prompt sha256 `e0e5a9694dab9c94afc7060b9d5cf2d237d404555fc4946919039a70e4f2575c`
  - part 1: 20 file(s), 116673 characters, profile nemotron-judge, reply valid
  - part 2: 7 file(s), 70422 characters, profile nemotron-judge, reply valid
- Judge replies of nemotron-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool), glm zhipu (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@7442294aa0 contained |
| 1 | integrity | ok | 244.9 | 11 sub-checks (+2 unfrozen by human answers); scope: 33 changed file(s) |
| 2 | build | ok | 32.3 |  |
| 3 | tests | ok | 377.7 |  |
| 4 | traceability | ok | 0.2 | 15/15 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/index.ts, src/api/policy-routes.ts, src/grants/args.ts, src/grants/index.ts, src/grants/policy-runtime.ts and 8 more |
| 8 | s1 judge | ok | 1.5 | 15/15 criteria judged by jev |
| 9 | judge | ok | 501.4 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261110T1737Z-37f3/023-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261110T1737Z-37f3/024-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261110T1737Z-37f3/025-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261110T1737Z-37f3/026-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261110T1737Z-37f3/027-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261110T1737Z-37f3/028-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261110T1737Z-37f3/029-e2e.log |

## Files by part

- part 1: src/db/migrations/0495_policy_sets.sql (1409 characters)
- part 1: src/grants/args.test.ts (11175 characters)
- part 1: src/grants/args.ts (5855 characters)
- part 1: src/pdp/engine.ts (962 characters)
- part 1: src/pdp/engine-instance.test.ts (4326 characters)
- part 1: src/pdp/errors.ts (628 characters)
- part 1: src/api/index.ts (651 characters)
- part 1: src/grants/index.ts (651 characters)
- part 1: src/pdp/index.ts (632 characters)
- part 1: src/pdp/load.ts (2535 characters)
- part 1: src/pdp/load-diagnostic.test.ts (4025 characters)
- part 1: src/main.policy.test.ts (8699 characters)
- part 1: src/main.ts (2249 characters)
- part 1: docs/api/openapi.json (12330 characters)
- part 1: src/grants/policy-deploy.test.ts (22718 characters)
- part 1: src/grants/policy-deploy-stays.test.ts (8274 characters)
- part 1: src/pdp/policy-engine.ts (650 characters)
- part 1: src/pdp/policy-ids.ts (742 characters)
- part 1: src/grants/policy-memory.test.ts (4541 characters)
- part 1: src/api/policy-routes.test.ts (23621 characters)
- part 2: src/api/policy-routes.ts (5676 characters)
- part 2: src/grants/policy-runtime.test.ts (15287 characters)
- part 2: src/grants/policy-runtime.ts (8356 characters)
- part 2: src/grants/policy-schema.test.ts (7123 characters)
- part 2: src/grants/policy-sets.ts (11688 characters)
- part 2: src/grants/policy-validate.test.ts (14523 characters)
- part 2: openspec/changes/add-policy-deploy/tasks.md (7769 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 8 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/index.ts, src/api/policy-routes.test.ts, src/api/policy-routes.ts, src/grants/args.test.ts, src/grants/args.ts (+19 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2236 of 2236 base tests pass on the unit's code with its 9 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/grants/policy-deploy.test.ts kept at head for the run (task 3.4: unfrozen by Q-002)
- src/grants/policy-schema.test.ts kept at head for the run (task 1.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/grants/policy-schema.test.ts (task 1.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))
- src/grants/policy-deploy.test.ts (task 3.4, unfrozen by Q-003 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-f3066a28 | policy-deploy › A policy set is one tenant row of which only the current flag changes › Objects, ledger and privileges | covered | src.grants.policy-schema.test.ts::C-f3066a28 migration 0495 keeps one current policy set per tenant (passed, red_assertion) | - | 0.91 |
| C-95d926c4 | policy-deploy › toolArgTypes derives the Cedar types of the tenant's block arguments › toolArgTypes vectors | covered | src.grants.args.test.ts::C-95d926c4 toolArgTypes derives the listed vectors (passed, red_assertion) | - | 0.91 |
| C-48db6043 | policy-deploy › toCedarArgs converts a tool call's arguments or names the first that cannot be › toCedarArgs vectors | covered | src.grants.args.test.ts::C-48db6043 toCedarArgs converts the typed arguments (passed, red_assertion); src.grants.args.test.ts::C-48db6043 toCedarArgs feeds the engine loaded with SRC_ARGS (passed, red_assertion); src.grants.args.test.ts::C-48db6043 toCedarArgs names the first argument it cannot conv... | - | 0.85 |
| C-9e64966c | policy-deploy › validatePolicySet reports the problems of the first failing step and writes nothing › Validation reports problems by stage | covered | src.grants.policy-validate.test.ts::C-9e64966c validation answers a healthy source with a version per source (passed, red_assertion); src.grants.policy-validate.test.ts::C-9e64966c validation limits active grants to 500 (passed, red_assertion); src.grants.policy-validate.test.ts::C-9e64966c validati... | - | 0.78 |
| C-69aa2085 | policy-deploy › deployPolicySet stores the set, audits it and swaps the tenant's engine › A deploy stores, audits and swaps the tenant's engine | covered | src.grants.policy-deploy.test.ts::C-69aa2085: a deploy stores, audits and swaps the tenant's engine (passed, red_assertion) | - | 0.87 |
| C-29fb3606 | policy-deploy › A refused, repeated or failing deploy leaves the store as it was › Refused, repeated and failing deploys | covered | src.grants.policy-deploy.test.ts::C-29fb3606: A, B, A at one instant give deploy_seq 1, 2, 3 with A current (passed, red_assertion); src.grants.policy-deploy.test.ts::C-29fb3606: a block that adds an argument type is a new version (passed, red_assertion); src.grants.policy-deploy.test.ts::C-29fb3606... | - | 0.88 |
| C-1731ec46 | policy-deploy › A load failure carries the Cedar diagnostic apart from details › A load failure carries the diagnostic outside details | covered | src.pdp.load-diagnostic.test.ts::C-1731ec46 a parse and a validate failure carry the raw diagnostic outside details (passed, red_assertion); src.pdp.load-diagnostic.test.ts::C-1731ec46 only parse and validate carry a diagnostic and a fourth argument is stored (passed, red_assertion) | - | 0.91 |
| C-5c1171f6 | policy-deploy › An engine built under an instance id replaces the preparsed set of that id › An instance id replaces the preparsed set | covered | src.pdp.engine-instance.test.ts::C-5c1171f6 an instance id replaces the preparsed set of that id (passed, red_assertion) | - | 0.86 |
| C-5fed171a | policy-deploy › Validation and deploy keep a bounded amount of memory › Repeated validations and deploys leave memory flat | covered | src.grants.policy-memory.test.ts::C-5fed171a: repeated validations and deploys leave memory flat (passed, red_assertion) | - | 0.91 |
| C-19bf37d2 | policy-deploy › A tenant's layer never decides another tenant's request › A tenant's layer never decides another tenant's request | covered | src.grants.policy-runtime.test.ts::C-19bf37d2: a tenant's layer never decides another tenant's request (passed, red_assertion) | - | 0.80 |
| C-606aa711 | policy-deploy › A tenant's layer never decides another tenant's request › A tenant's set can neither take deploying away nor give it away | covered | src.grants.policy-deploy-stays.test.ts::C-606aa711: a tenant's set can neither take deploying away nor give it away (passed, red_assertion) | - | 0.87 |
| C-c43f4f58 | policy-deploy › A tenant's set loads lazily and a failed load denies with an error without being cached › Load failures deny with an error and are not cached | covered | src.grants.policy-runtime.test.ts::C-c43f4f58: load failures deny with an error and are not cached (passed, red_assertion) | - | 0.49 |
| C-e98c4e07 | policy-deploy › A revoked grant is denied at the next check after a deploy › A revoked grant is denied at the next check after a deploy | covered | src.grants.policy-deploy.test.ts::C-e98c4e07: a revoked grant is denied at the next check after a deploy (passed, red_assertion) | - | 0.84 |
| C-7d079efc | policy-deploy › The policy routes require deploy_policy and answer with the module's results › The policy routes | covered | src.api.policy-routes.test.ts::C-7d079efc: a failing reload, store or grant read answers INTERNAL and the retry deploys (passed, red_assertion); src.api.policy-routes.test.ts::C-7d079efc: a null pool or runtime answers AUTHZ_UNAVAILABLE (passed, red_assertion); src.api.policy-routes.test.ts::C-7d079... | - | 0.88 |
| C-c0e93562 | policy-deploy › main serves the runtime and the OpenAPI document lists the routes › Main serves the runtime and documents the routes | covered | src.main.policy.test.ts::C-c0e93562 main deploys a tenant policy set and alice gains manage_tenant (passed, red_assertion); src.main.policy.test.ts::C-c0e93562 main without a database defines the policy routes and refuses them with AUTHZ_UNAVAILABLE (passed, red_assertion); src.main.policy.test.ts::... | - | 0.79 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-policy-deploy/.l4/ledger/r-20261110T1146Z-9857.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-policy-deploy/.l4/ledger/r-20261110T1207Z-d463.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-policy-deploy/.l4/ledger/r-20261110T1444Z-ede1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-policy-deploy/.l4/ledger/r-20261110T1508Z-5ee0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-policy-deploy/.l4/ledger/r-20261110T1737Z-37f3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-policy-deploy/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-policy-deploy/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/policy-routes.test.ts` |  | relevant | new test file |
| `src/api/policy-routes.ts` | api | relevant | named in the spec |
| `src/db/migrations/0495_policy_sets.sql` | db | relevant | named in the spec |
| `src/grants/args.test.ts` |  | relevant | new test file |
| `src/grants/args.ts` | grants | relevant | named in the spec |
| `src/grants/index.ts` | grants | relevant | named in the spec |
| `src/grants/policy-deploy-stays.test.ts` |  | relevant | new test file |
| `src/grants/policy-deploy.test.ts` |  | relevant | new test file |
| `src/grants/policy-memory.test.ts` |  | relevant | new test file |
| `src/grants/policy-runtime.test.ts` |  | relevant | new test file |
| `src/grants/policy-runtime.ts` | grants | relevant | named in the spec |
| `src/grants/policy-schema.test.ts` |  | relevant | new test file |
| `src/grants/policy-sets.ts` | grants | relevant | named in the spec |
| `src/grants/policy-validate.test.ts` |  | relevant | new test file |
| `src/main.policy.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/pdp/engine-instance.test.ts` |  | relevant | new test file |
| `src/pdp/engine.ts` | pdp | relevant | named in the spec |
| `src/pdp/errors.ts` | pdp | relevant | named in the spec |
| `src/pdp/index.ts` | pdp | relevant | named in the spec |
| `src/pdp/load-diagnostic.test.ts` |  | relevant | new test file |
| `src/pdp/load.ts` | pdp | relevant | named in the spec |
| `src/pdp/policy-engine.ts` | pdp | relevant | named in the spec |
| `src/pdp/policy-ids.ts` | pdp | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/index.ts, src/api/policy-routes.ts, src/grants/args.ts, src/grants/index.ts, src/grants/policy-runtime.ts and 8 more

### Tests

2320 of 2320 passed, 0 failed, 0 errored, 0 skipped.
34 of 34 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-f3066a28 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-95d926c4 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-48db6043 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9e64966c | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69aa2085 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-29fb3606 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1731ec46 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5c1171f6 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5fed171a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-19bf37d2 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-606aa711 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c43f4f58 | ok | 0.490 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e98c4e07 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7d079efc | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c0e93562 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-f3066a28 | policy-deploy › A policy set is one tenant row of which only the current flag changes › Objects, ledger and privileges | pass | pass | the judge passed it and a discriminating test passes |
| C-95d926c4 | policy-deploy › toolArgTypes derives the Cedar types of the tenant's block arguments › toolArgTypes vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-48db6043 | policy-deploy › toCedarArgs converts a tool call's arguments or names the first that cannot be › toCedarArgs vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-9e64966c | policy-deploy › validatePolicySet reports the problems of the first failing step and writes nothing › Validation reports problems by stage | pass | pass | the judge passed it and a discriminating test passes |
| C-69aa2085 | policy-deploy › deployPolicySet stores the set, audits it and swaps the tenant's engine › A deploy stores, audits and swaps the tenant's engine | pass | pass | the judge passed it and a discriminating test passes |
| C-29fb3606 | policy-deploy › A refused, repeated or failing deploy leaves the store as it was › Refused, repeated and failing deploys | pass | pass | the judge passed it and a discriminating test passes |
| C-1731ec46 | policy-deploy › A load failure carries the Cedar diagnostic apart from details › A load failure carries the diagnostic outside details | pass | pass | the judge passed it and a discriminating test passes |
| C-5c1171f6 | policy-deploy › An engine built under an instance id replaces the preparsed set of that id › An instance id replaces the preparsed set | pass | pass | the judge passed it and a discriminating test passes |
| C-5fed171a | policy-deploy › Validation and deploy keep a bounded amount of memory › Repeated validations and deploys leave memory flat | pass | pass | the judge passed it and a discriminating test passes |
| C-19bf37d2 | policy-deploy › A tenant's layer never decides another tenant's request › A tenant's layer never decides another tenant's request | pass | pass | the judge passed it and a discriminating test passes |
| C-606aa711 | policy-deploy › A tenant's layer never decides another tenant's request › A tenant's set can neither take deploying away nor give it away | pass | pass | the judge passed it and a discriminating test passes |
| C-c43f4f58 | policy-deploy › A tenant's set loads lazily and a failed load denies with an error without being cached › Load failures deny with an error and are not cached | pass | pass | the judge passed it and a discriminating test passes |
| C-e98c4e07 | policy-deploy › A revoked grant is denied at the next check after a deploy › A revoked grant is denied at the next check after a deploy | pass | pass | the judge passed it and a discriminating test passes |
| C-7d079efc | policy-deploy › The policy routes require deploy_policy and answer with the module's results › The policy routes | pass | pass | the judge passed it and a discriminating test passes |
| C-c0e93562 | policy-deploy › main serves the runtime and the OpenAPI document lists the routes › Main serves the runtime and documents the routes | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.policy-routes.test.ts::C-7d079efc: a failing reload, store or grant read answers INTERNAL and the retry deploys` (task 4.1): passed
- `src.api.policy-routes.test.ts::C-7d079efc: a null pool or runtime answers AUTHZ_UNAVAILABLE` (task 4.1): passed
- `src.api.policy-routes.test.ts::C-7d079efc: the policy routes require deploy_policy and store an idempotent deploy` (task 4.1): passed
- `src.api.policy-routes.test.ts::C-7d079efc: the policy routes validate bodies and scope each tenant's list` (task 4.1): passed
- `src.grants.args.test.ts::C-48db6043 toCedarArgs converts the typed arguments` (task 2.1): passed
- `src.grants.args.test.ts::C-48db6043 toCedarArgs feeds the engine loaded with SRC_ARGS` (task 2.1): passed
- `src.grants.args.test.ts::C-48db6043 toCedarArgs names the first argument it cannot convert` (task 2.1): passed
- `src.grants.args.test.ts::C-95d926c4 toolArgTypes derives the listed vectors` (task 2.1): passed
- `src.grants.policy-deploy-stays.test.ts::C-606aa711: a tenant's set can neither take deploying away nor give it away` (task 3.4): passed
- `src.grants.policy-deploy.test.ts::C-29fb3606: A, B, A at one instant give deploy_seq 1, 2, 3 with A current` (task 3.4): passed
- `src.grants.policy-deploy.test.ts::C-29fb3606: a block that adds an argument type is a new version` (task 3.4): passed
- `src.grants.policy-deploy.test.ts::C-29fb3606: a failing reload rejects, keeps the row and the next check allows` (task 3.4): passed
- `src.grants.policy-deploy.test.ts::C-29fb3606: a repeat on a runtime holding an older engine reloads it` (task 3.4): passed
- `src.grants.policy-deploy.test.ts::C-29fb3606: a repeat, an invalid source and a failing store leave the store as it was` (task 3.4): passed
- `src.grants.policy-deploy.test.ts::C-29fb3606: an older version and the same version again insert new rows` (task 3.4): passed
- `src.grants.policy-deploy.test.ts::C-29fb3606: two concurrent deploys leave one current row, the highest` (task 3.4): passed
- `src.grants.policy-deploy.test.ts::C-69aa2085: a deploy stores, audits and swaps the tenant's engine` (task 3.4): passed
- `src.grants.policy-deploy.test.ts::C-e98c4e07: a revoked grant is denied at the next check after a deploy` (task 3.4): passed
- `src.grants.policy-memory.test.ts::C-5fed171a: repeated validations and deploys leave memory flat` (task 3.4): passed
- `src.grants.policy-runtime.test.ts::C-19bf37d2: a tenant's layer never decides another tenant's request` (task 3.2): passed
- `src.grants.policy-runtime.test.ts::C-c43f4f58: load failures deny with an error and are not cached` (task 3.2): passed
- `src.grants.policy-schema.test.ts::C-f3066a28 migration 0495 keeps one current policy set per tenant` (task 1.1): passed
- `src.grants.policy-validate.test.ts::C-9e64966c validation answers a healthy source with a version per source` (task 3.3): passed
- `src.grants.policy-validate.test.ts::C-9e64966c validation limits active grants to 500` (task 3.3): passed
- `src.grants.policy-validate.test.ts::C-9e64966c validation names an impossible grant and stops at compile` (task 3.3): passed
- `src.grants.policy-validate.test.ts::C-9e64966c validation names parse, template, id, policy and reserved problems` (task 3.3): passed
- `src.grants.policy-validate.test.ts::C-9e64966c validation reduces validate messages and logs no diagnostic` (task 3.3): passed
- `src.grants.policy-validate.test.ts::C-9e64966c validation rejects a runtime not made by createPolicyRuntime` (task 3.3): passed
- `src.main.policy.test.ts::C-c0e93562 main deploys a tenant policy set and alice gains manage_tenant` (task 4.2): passed
- `src.main.policy.test.ts::C-c0e93562 main without a database defines the policy routes and refuses them with AUTHZ_UNAVAILABLE` (task 4.2): passed
- `src.main.policy.test.ts::C-c0e93562 the committed OpenAPI document lists the policy operations` (task 4.2): passed
- `src.pdp.engine-instance.test.ts::C-5c1171f6 an instance id replaces the preparsed set of that id` (task 3.1): passed
- `src.pdp.load-diagnostic.test.ts::C-1731ec46 a parse and a validate failure carry the raw diagnostic outside details` (task 3.1): passed
- `src.pdp.load-diagnostic.test.ts::C-1731ec46 only parse and validate carry a diagnostic and a fourth argument is stored` (task 3.1): passed
