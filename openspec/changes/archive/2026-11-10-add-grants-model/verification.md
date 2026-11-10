# Verification: openspec:add-grants-model: PASS (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `478ed0111ab89ded3c925a08f26adfe50f7f138e`
- Head: `fd951022a23d3895b54810a85bfca238032b4791`
- Implementer profiles: deepseek-free, claude-sonnet, glm
- Judge: nemotron-judge, 3 call(s), judged in 3 parts, prompt sha256 `af3ab09126038d6b2e3faec9bdec4dde203d1ad9ded3b6e605125404c119aa27`
  - part 1: 9 file(s), 96416 characters, profile nemotron-judge, reply repaired
  - part 2: 10 file(s), 114959 characters, profile nemotron-judge, reply repaired
  - part 3: 3 file(s), 26556 characters, profile nemotron-judge, reply repaired
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 3, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool), glm zhipu (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@478ed0111a contained |
| 1 | integrity | ok | 230.2 | 11 sub-checks (+1 unfrozen by human answers); scope: 26 changed file(s) |
| 2 | build | ok | 30.8 |  |
| 3 | tests | ok | 318.1 |  |
| 4 | traceability | ok | 0.2 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/grant-routes.ts, src/api/index.ts, src/grants/compile.ts, src/grants/fingerprint.ts, src/grants/status.ts and 3 more |
| 8 | s1 judge | ok | 1.2 | 12/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 759.6 | 3 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261110T1030Z-d9fa/017-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261110T1030Z-d9fa/018-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261110T1030Z-d9fa/019-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261110T1030Z-d9fa/020-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261110T1030Z-d9fa/021-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261110T1030Z-d9fa/022-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261110T1030Z-d9fa/023-e2e.log |

## Files by part

- part 1: src/db/migrations/0490_grants.sql (2017 characters)
- part 1: src/grants/chain.test.ts (20143 characters)
- part 1: src/grants/compile.test.ts (14263 characters)
- part 1: src/grants/compile.ts (7045 characters)
- part 1: src/grants/compile-engine.test.ts (10389 characters)
- part 1: src/grants/create.test.ts (21057 characters)
- part 1: src/grants/fingerprint.test.ts (15232 characters)
- part 1: src/grants/fingerprint.ts (4369 characters)
- part 1: src/api/grant-openapi.test.ts (1901 characters)
- part 2: src/api/grant-routes.test.ts (32006 characters)
- part 2: src/api/grant-routes.ts (13278 characters)
- part 2: src/grants/policy/grants.cedar (306 characters)
- part 2: src/api/index.ts (667 characters)
- part 2: src/main.ts (832 characters)
- part 2: docs/api/openapi.json (40368 characters)
- part 2: src/grants/policy.test.ts (3369 characters)
- part 2: src/grants/revoke-confirm.test.ts (15889 characters)
- part 2: src/grants/schema.test.ts (7314 characters)
- part 2: src/grants/status.ts (930 characters)
- part 3: src/grants/store.ts (18613 characters)
- part 3: openspec/changes/add-grants-model/tasks.md (7295 characters)
- part 3: src/grants/types.ts (648 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 8 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/grant-openapi.test.ts, src/api/grant-routes.test.ts, src/api/grant-routes.ts, src/api/index.ts, src/grants/chain.test.ts (+13 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2191 of 2191 base tests pass on the unit's code with its 9 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/api/grant-routes.test.ts kept at head for the run (task 4.2: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/api/grant-routes.test.ts (task 4.2, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-8ca21fe5 | grants › A grant is one tenant row with little mutable state › Objects, ledger and privileges | covered | src.grants.schema.test.ts::C-8ca21fe5 migration 0490 stores grants with little mutable state (passed, red_assertion) | - | 0.83 |
| C-87c5f285 | grants › A node fingerprint hashes what a grant confirms about a node › Fingerprint vectors | covered | src.grants.fingerprint.test.ts::C-87c5f285: F1 and F2 hash every node as the vectors table says (passed, red_assertion); src.grants.fingerprint.test.ts::C-87c5f285: a changed value and a pre hook change only the pay node (passed, red_assertion); src.grants.fingerprint.test.ts::C-87c5f285: a hook rou... | - | - |
| C-a72e1359 | grants › A grant compiles to one static policy that pins the tenant › Compile vectors | covered | src.grants.compile.test.ts::C-a72e1359: compileGrant covers revoked, empty, tenant scoping, g5 and g6 (passed, red_assertion); src.grants.compile.test.ts::C-a72e1359: compileGrants sorts by id and writes the listed policy text (passed, red_assertion) | - | 0.94 |
| C-26e11940 | grants › The compiler refuses what it cannot write safely › Compile refusals | covered | src.grants.compile.test.ts::C-26e11940: identifier refusals name the field and boundaries split (passed, red_assertion); src.grants.compile.test.ts::C-26e11940: mistyped g2 texts compile but the strict validator refuses them (passed, red_assertion); src.grants.compile.test.ts::C-26e11940: value refu... | - | 0.78 |
| C-dd923c21 | grants › Compiled grants decide as the grant says › Compiled grants decide like the grant says | covered | src.grants.compile-engine.test.ts::C-dd923c21: compiled grants decide like the grant says (passed, red_assertion); src.grants.compile-engine.test.ts::C-dd923c21: g5 alone decides its three requests (passed, red_assertion) | - | 0.86 |
| C-593145eb | grants › createGrant stores and audits an active grant › Grants are created and audited | covered | src.grants.create.test.ts::C-593145eb: createGrant stores and audits three active grants (passed, red_assertion) | - | 0.84 |
| C-36fe0266 | grants › createGrant refuses what it cannot store safely › Refusals leave nothing behind | covered | src.grants.create.test.ts::C-36fe0266: createGrant refuses invalid input and leaves no row or event (passed, red_assertion); src.grants.create.test.ts::C-36fe0266: createGrant rolls back failing dependencies and refuses another tenant (passed, red_assertion) | - | 0.88 |
| C-fe6b6186 | grants › Revoking is idempotent and confirming adds one fingerprint › Revoke and confirm | covered | src.grants.revoke-confirm.test.ts::C-fe6b6186: confirmGrant adds the new fingerprint once (passed, red_assertion); src.grants.revoke-confirm.test.ts::C-fe6b6186: confirmGrant refuses in order and checks the version hash (passed, red_assertion); src.grants.revoke-confirm.test.ts::C-fe6b6186: revokeGr... | - | 0.88 |
| C-84574afd | grants › Status is derived on read and a moved step needs re-confirmation › A moved step needs re-confirmation | covered | src.grants.chain.test.ts::C-84574afd: a removed step has no latest fingerprint and a revoked grant decides nothing (passed, red_assertion); src.grants.chain.test.ts::C-84574afd: a validated moved step needs re-confirmation and decides by fingerprint (passed, red_assertion); src.grants.chain.test.ts:... | - | 0.87 |
| C-8028b9c3 | grants › The grant routes require deploy_policy and map the module's errors › The grant routes | covered | src.api.grant-routes.test.ts::C-8028b9c3 the grant routes require deploy_policy and map the module errors (passed, red_assertion) | - | 0.83 |
| C-35c16816 | grants › The routes degrade without a pool or an engine key › Routes without a pool or an engine key | covered | src.api.grant-routes.test.ts::C-35c16816 the grant routes degrade without a pool or an engine key (passed, red_assertion) | - | 0.91 |
| C-cf182e1b | grants › An idempotent create commits the grant with its idempotency record › A replayed create returns the same grant | covered | src.api.grant-routes.test.ts::C-cf182e1b a replayed create returns the same grant and the record commits with it (passed, red_assertion) | - | 0.86 |
| C-2fec7263 | grants › The fragment and the OpenAPI document are in place › Fragment and OpenAPI | covered | src.api.grant-openapi.test.ts::C-2fec7263 the served OpenAPI document lists the five grant routes with deploy_policy (passed, red_assertion); src.grants.policy.test.ts::C-2fec7263 the grants fragment permits the tenant admin to deploy policy in one tenant (passed, red_assertion) | - | 0.79 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-grants-model/.l4/ledger/r-20261110T0608Z-c053.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-grants-model/.l4/ledger/r-20261110T0842Z-90d9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-grants-model/.l4/ledger/r-20261110T1030Z-d9fa.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-grants-model/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-grants-model/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/grant-openapi.test.ts` |  | relevant | new test file |
| `src/api/grant-routes.test.ts` |  | relevant | new test file |
| `src/api/grant-routes.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/db/migrations/0490_grants.sql` | db | relevant | named in the spec |
| `src/grants/chain.test.ts` |  | relevant | new test file |
| `src/grants/compile-engine.test.ts` |  | relevant | new test file |
| `src/grants/compile.test.ts` |  | relevant | new test file |
| `src/grants/compile.ts` | grants | relevant | named in the spec |
| `src/grants/create.test.ts` |  | relevant | new test file |
| `src/grants/fingerprint.test.ts` |  | relevant | new test file |
| `src/grants/fingerprint.ts` | grants | relevant | named in the spec |
| `src/grants/policy.test.ts` |  | relevant | new test file |
| `src/grants/policy/grants.cedar` | grants | relevant | named in the spec |
| `src/grants/revoke-confirm.test.ts` |  | relevant | new test file |
| `src/grants/schema.test.ts` |  | relevant | new test file |
| `src/grants/status.ts` | grants | relevant | named in the spec |
| `src/grants/store.ts` | grants | relevant | named in the spec |
| `src/grants/types.ts` | grants | relevant | named in the spec |
| `src/main.ts` | main | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/grant-routes.ts, src/api/index.ts, src/grants/compile.ts, src/grants/fingerprint.ts, src/grants/status.ts and 3 more

### Tests

2286 of 2286 passed, 0 failed, 0 errored, 0 skipped.
38 of 38 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-8ca21fe5 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-87c5f285 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-a72e1359 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-26e11940 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dd923c21 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-593145eb | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-36fe0266 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fe6b6186 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-84574afd | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8028b9c3 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-35c16816 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cf182e1b | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2fec7263 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-8ca21fe5 | grants › A grant is one tenant row with little mutable state › Objects, ledger and privileges | pass | pass | the judge passed it and a discriminating test passes |
| C-87c5f285 | grants › A node fingerprint hashes what a grant confirms about a node › Fingerprint vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-a72e1359 | grants › A grant compiles to one static policy that pins the tenant › Compile vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-26e11940 | grants › The compiler refuses what it cannot write safely › Compile refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-dd923c21 | grants › Compiled grants decide as the grant says › Compiled grants decide like the grant says | pass | pass | the judge passed it and a discriminating test passes |
| C-593145eb | grants › createGrant stores and audits an active grant › Grants are created and audited | pass | pass | the judge passed it and a discriminating test passes |
| C-36fe0266 | grants › createGrant refuses what it cannot store safely › Refusals leave nothing behind | pass | pass | the judge passed it and a discriminating test passes |
| C-fe6b6186 | grants › Revoking is idempotent and confirming adds one fingerprint › Revoke and confirm | pass | pass | the judge passed it and a discriminating test passes |
| C-84574afd | grants › Status is derived on read and a moved step needs re-confirmation › A moved step needs re-confirmation | pass | pass | the judge passed it and a discriminating test passes |
| C-8028b9c3 | grants › The grant routes require deploy_policy and map the module's errors › The grant routes | pass | pass | the judge passed it and a discriminating test passes |
| C-35c16816 | grants › The routes degrade without a pool or an engine key › Routes without a pool or an engine key | pass | pass | the judge passed it and a discriminating test passes |
| C-cf182e1b | grants › An idempotent create commits the grant with its idempotency record › A replayed create returns the same grant | pass | pass | the judge passed it and a discriminating test passes |
| C-2fec7263 | grants › The fragment and the OpenAPI document are in place › Fragment and OpenAPI | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] confirmGrant refusal order for malformed versionHash vs unknown grant is unpinned (spec gap) (criterion C-fe6b6186): The spec lists the refusal order as NOT_FOUND, not_node_scoped, revoked, version_not_validated, node_unknown, and separately states a malformed versionHash is GRANTS_INVALID { field: "versionHash" }. The committed code validates the versionHash format before lockGrant, so a malformed versionHash on an unknown grant yields GRANTS_INVALID { versionHash } rather than GRANTS_NOT_FOUND. No scenario pins this combination.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.grant-openapi.test.ts::C-2fec7263 the served OpenAPI document lists the five grant routes with deploy_policy` (task 4.2): passed
- `src.api.grant-routes.test.ts::C-35c16816 the grant routes degrade without a pool or an engine key` (task 4.2): passed
- `src.api.grant-routes.test.ts::C-8028b9c3 the grant routes require deploy_policy and map the module errors` (task 4.2): passed
- `src.api.grant-routes.test.ts::C-cf182e1b a replayed create returns the same grant and the record commits with it` (task 4.2): passed
- `src.grants.chain.test.ts::C-84574afd: a removed step has no latest fingerprint and a revoked grant decides nothing` (task 3.3): passed
- `src.grants.chain.test.ts::C-84574afd: a validated moved step needs re-confirmation and decides by fingerprint` (task 3.3): passed
- `src.grants.chain.test.ts::C-84574afd: grantStatus derives revoked, needs_reconfirm and active` (task 3.3): passed
- `src.grants.chain.test.ts::C-84574afd: listGrants and reconfirmationsFor refuse a transaction of another tenant` (task 3.3): passed
- `src.grants.chain.test.ts::C-84574afd: listGrants pages in grant id order and refuses bad paging` (task 3.3): passed
- `src.grants.chain.test.ts::C-84574afd: reconfirmationsFor refuses versions of two flows and bad hashes` (task 3.3): passed
- `src.grants.chain.test.ts::C-84574afd: versioned creates, confirm and revoke move the statuses` (task 3.3): passed
- `src.grants.compile-engine.test.ts::C-dd923c21: compiled grants decide like the grant says` (task 2.2): passed
- `src.grants.compile-engine.test.ts::C-dd923c21: g5 alone decides its three requests` (task 2.2): passed
- `src.grants.compile.test.ts::C-26e11940: identifier refusals name the field and boundaries split` (task 2.2): passed
- `src.grants.compile.test.ts::C-26e11940: mistyped g2 texts compile but the strict validator refuses them` (task 2.2): passed
- `src.grants.compile.test.ts::C-26e11940: value refusals refuse unwritable text, types, ranges and precision` (task 2.2): passed
- `src.grants.compile.test.ts::C-a72e1359: compileGrant covers revoked, empty, tenant scoping, g5 and g6` (task 2.2): passed
- `src.grants.compile.test.ts::C-a72e1359: compileGrants sorts by id and writes the listed policy text` (task 2.2): passed
- `src.grants.create.test.ts::C-36fe0266: createGrant refuses invalid input and leaves no row or event` (task 3.1): passed
- `src.grants.create.test.ts::C-36fe0266: createGrant rolls back failing dependencies and refuses another tenant` (task 3.1): passed
- `src.grants.create.test.ts::C-593145eb: createGrant stores and audits three active grants` (task 3.1): passed
- `src.grants.fingerprint.test.ts::C-87c5f285: F1 and F2 hash every node as the vectors table says` (task 2.1): passed
- `src.grants.fingerprint.test.ts::C-87c5f285: a changed value and a pre hook change only the pay node` (task 2.1): passed
- `src.grants.fingerprint.test.ts::C-87c5f285: a hook route and a flow rule change only the nodes they name` (task 2.1): passed
- `src.grants.fingerprint.test.ts::C-87c5f285: a weaker approver and the cycle change the listed nodes` (task 2.1): passed
- `src.grants.fingerprint.test.ts::C-87c5f285: an unreachable node hashes its own payload and changes done` (task 2.1): passed
- `src.grants.fingerprint.test.ts::C-87c5f285: each block hook member changes the pay fingerprint` (task 2.1): passed
- `src.grants.fingerprint.test.ts::C-87c5f285: each code hook member changes the pay fingerprint` (task 2.1): passed
- `src.grants.fingerprint.test.ts::C-87c5f285: null input never throws and gives null` (task 2.1): passed
- `src.grants.fingerprint.test.ts::C-87c5f285: reversed keys and an unrelated rename change no fingerprint` (task 2.1): passed
- `src.grants.policy.test.ts::C-2fec7263 the grants fragment permits the tenant admin to deploy policy in one tenant` (task 4.1): passed
- `src.grants.revoke-confirm.test.ts::C-fe6b6186: confirmGrant adds the new fingerprint once` (task 3.2): passed
- `src.grants.revoke-confirm.test.ts::C-fe6b6186: confirmGrant refuses in order and checks the version hash` (task 3.2): passed
- `src.grants.revoke-confirm.test.ts::C-fe6b6186: revokeGrant and confirmGrant refuse a transaction of another tenant` (task 3.2): passed
- `src.grants.revoke-confirm.test.ts::C-fe6b6186: revokeGrant and confirmGrant refuse an unknown grant` (task 3.2): passed
- `src.grants.revoke-confirm.test.ts::C-fe6b6186: revokeGrant revokes once and a second call appends nothing` (task 3.2): passed
- `src.grants.revoke-confirm.test.ts::C-fe6b6186: tenant B cannot revoke or confirm a grant of tenant A` (task 3.2): passed
- `src.grants.schema.test.ts::C-8ca21fe5 migration 0490 stores grants with little mutable state` (task 1.1): passed
