# Verification: openspec:add-roles-and-memberships: PASS (round 3)

traceability: 31/31 criteria covered by a discriminating test

- Base: `93f072a4351c30ae7665a3faf2d03524f8a429f6`
- Head: `82d862bbdd0510f6e394466a0e9cd672cde8a733`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: mimo-judge, 3 call(s), judged in 2 parts, prompt sha256 `c383fe8a2880fb62b1b5e05b667d927a948834dd613f1b9bbda1dc28f0f0e4d7`
  - part 1: 23 file(s), 112208 characters, profile mimo-judge, reply retried
  - part 2: 11 file(s), 73302 characters, profile mimo-judge, reply valid
- Judge replies of mimo-judge (this unit, all rounds): valid 1, repaired 0, retried 1, discarded 0; this round: retried
- independence: declared (unverified): mimo-judge xiaomi (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.8 | base main@93f072a435 contained |
| 1 | integrity | ok | 72.5 | 11 sub-checks (+1 unfrozen by human answers); scope: 48 changed file(s) |
| 2 | build | ok | 23.7 |  |
| 3 | tests | ok | 100.2 |  |
| 4 | traceability | ok | 0.2 | 31/31 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/session-auth.ts, src/identity/index.ts, src/identity/oidc/callback.ts, src/identity/rbac/bootstrap.ts, src/identity/rbac/errors.ts and 9 more |
| 8 | s1 judge | ok | 3.9 | 31/31 criteria judged by jev |
| 9 | judge | ok | 1158.3 | 3 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261031T0212Z-d0bf/015-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261031T0212Z-d0bf/016-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261031T0212Z-d0bf/017-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261031T0212Z-d0bf/018-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261031T0212Z-d0bf/019-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261031T0212Z-d0bf/020-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261031T0212Z-d0bf/021-e2e.log |

## Files by part

- part 1: openspec/changes/add-roles-and-memberships-fix-1/.openspec.yaml (329 characters)
- part 1: src/db/migrations/0170_rbac.sql (4308 characters)
- part 1: test/support/e2e-stack/parts/30-rbac.ts (266 characters)
- part 1: src/identity/rbac/bootstrap.test.ts (6951 characters)
- part 1: src/identity/rbac/bootstrap.ts (3058 characters)
- part 1: src/identity/oidc/callback.ts (1245 characters)
- part 1: src/identity/rbac/default-roles.test.ts (3370 characters)
- part 1: src/identity/rbac/errors.ts (1412 characters)
- part 1: src/identity/rbac/grants.test.ts (12412 characters)
- part 1: src/identity/rbac/grants.ts (4757 characters)
- part 1: src/identity/rbac/group-map.test.ts (14540 characters)
- part 1: src/identity/rbac/group-map.ts (8448 characters)
- part 1: src/identity/index.ts (1341 characters)
- part 1: src/identity/oidc/memberships.test.ts (14176 characters)
- part 1: src/identity/rbac/memberships.test.ts (4789 characters)
- part 1: src/identity/rbac/memberships.ts (1504 characters)
- part 1: src/identity/rbac/names.ts (4057 characters)
- part 1: src/identity/rbac/principal.test.ts (7908 characters)
- part 1: src/identity/rbac/principal.ts (1433 characters)
- part 1: openspec/changes/add-roles-and-memberships-fix-1/proposal.md (2807 characters)
- part 1: test/support/e2e-stack/rbac-part.test.ts (8466 characters)
- part 1: test/support/e2e-stack/rbac-part.ts (3889 characters)
- part 1: src/identity/policy/roles.cedar (742 characters)
- part 2: src/identity/roles-policy.test.ts (5811 characters)
- part 2: src/identity/rbac/schema.test.ts (8421 characters)
- part 2: src/api/session-auth.rbac.test.ts (9824 characters)
- part 2: src/api/session-auth.ts (886 characters)
- part 2: openspec/changes/add-roles-and-memberships-fix-1/specs/identity-rbac/spec.md (1185 characters)
- part 2: src/identity/rbac/sync.test.ts (12522 characters)
- part 2: src/identity/rbac/sync.ts (6343 characters)
- part 2: openspec/changes/add-roles-and-memberships-fix-1/tasks.md (407 characters)
- part 2: openspec/changes/add-roles-and-memberships/tasks.md (16975 characters)
- part 2: src/identity/rbac/teams.test.ts (6632 characters)
- part 2: src/identity/rbac/teams.ts (4296 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 11 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 11 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/session-auth.rbac.test.ts, src/api/session-auth.ts, src/identity/index.ts, src/identity/oidc/callback.ts, src/identity/oidc/memberships.test.ts (+22 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 943 of 943 base tests pass on the unit's code with its 12 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/identity/rbac/grants.test.ts kept at head for the run (task 5.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/identity/rbac/grants.test.ts (task 5.1, unfrozen by Q-001 (agent))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-bb91aeca | identity-rbac › Every tenant has the four default roles › Created with the tenant | covered | src.identity.rbac.default-roles.test.ts::C-bb91aeca Created with the tenant ties exported DEFAULT_ROLES to the seeded roles (passed, pre_satisfied); src.identity.rbac.schema.test.ts::C-bb91aeca Created with the tenant (passed, red_assertion) | - | 0.91 |
| C-eb484eda | identity-rbac › Every tenant has the four default roles › Idempotent, setting restored | covered | src.identity.rbac.schema.test.ts::C-eb484eda Idempotent, setting restored (passed, red_assertion) | - | 0.93 |
| C-8a5b7447 | identity-rbac › The rbac tables are tenant-leading and narrowly granted › Objects, catalog, privileges, checks | covered | src.identity.rbac.schema.test.ts::C-8a5b7447 Objects, catalog, privileges, checks (passed, red_assertion) | - | 0.93 |
| C-f0f427e3 | identity-rbac › Roles are listed and teams are managed inside one tenant › Create, list, delete | covered | src.identity.rbac.teams.test.ts::C-f0f427e3 Create, list, delete (passed, red_assertion) | - | 0.93 |
| C-e31534ad | identity-rbac › Roles are listed and teams are managed inside one tenant › Refusals | covered | src.identity.rbac.teams.test.ts::C-e31534ad Refusals (passed, red_assertion) | - | 0.89 |
| C-3ba7ccd7 | identity-rbac › A group mapping links one IdP group to one role or team › Map, replace, list | covered | src.identity.rbac.group-map.test.ts::C-3ba7ccd7 Map, replace, list (passed, red_assertion) | - | 0.94 |
| C-64a88d7a | identity-rbac › A group mapping links one IdP group to one role or team › Refusals and no elevation | covered | src.identity.rbac.group-map.test.ts::C-64a88d7a Refusals and no elevation (passed, red_assertion) | - | 0.91 |
| C-d442505b | identity-rbac › A group mapping links one IdP group to one role or team › No demoting of the admin mapping | covered | src.identity.rbac.group-map.test.ts::C-d442505b No demoting of the admin mapping (passed, red_assertion) | - | 0.91 |
| C-24e66351 | identity-rbac › A group mapping links one IdP group to one role or team › Removing revokes what the mapping granted | covered | src.identity.rbac.group-map.test.ts::C-24e66351 Removing revokes what the mapping granted (passed, red_assertion) | - | 0.94 |
| C-658fd38c | identity-rbac › Token groups become memberships at sign-in › The claim | covered | src.identity.rbac.sync.test.ts::C-658fd38c The claim (passed, red_assertion) | - | 0.91 |
| C-48073cfd | identity-rbac › Token groups become memberships at sign-in › Add, keep, replace, remove | covered | src.identity.rbac.sync.test.ts::C-48073cfd Add, keep, replace, remove (passed, red_assertion) | - | 0.94 |
| C-99e7d850 | identity-rbac › Token groups become memberships at sign-in › Other sources are untouched | covered | src.identity.rbac.sync.test.ts::C-99e7d850 Other sources are untouched (passed, red_assertion) | - | 0.93 |
| C-50042352 | identity-rbac › Token groups become memberships at sign-in › Bad input and tenants | covered | src.identity.rbac.sync.test.ts::C-50042352 Bad input and tenants (passed, red_assertion) | - | 0.86 |
| C-5b09c7d9 | identity-rbac › Token groups become memberships at sign-in › Sign-in applies the mappings | covered | src.identity.oidc.memberships.test.ts::C-5b09c7d9 Sign-in applies the mappings (passed, red_assertion) | - | 0.91 |
| C-e3d072a4 | identity-rbac › Token groups become memberships at sign-in › A failing sync refuses the sign-in | covered | src.identity.oidc.memberships.test.ts::C-e3d072a4 A failing sync refuses the sign-in (passed, red_assertion) | - | 0.90 |
| C-959908eb | identity-rbac › A role is granted directly only to a service account, or by an operator › Grant and revoke on a service account | covered | src.identity.rbac.grants.test.ts::C-959908eb Grant and revoke on a service account (passed, red_assertion) | - | 0.93 |
| C-4cd3fa8b | identity-rbac › A role is granted directly only to a service account, or by an operator › Humans and elevation | covered | src.identity.rbac.grants.test.ts::C-4cd3fa8b Humans and elevation (passed, red_assertion) | - | 0.92 |
| C-f3ce9a1e | identity-rbac › A role is granted directly only to a service account, or by an operator › Missing, invalid, concurrent, disabled | covered | src.identity.rbac.grants.test.ts::C-f3ce9a1e Missing, invalid, concurrent, disabled (passed, red_assertion) | - | 0.93 |
| C-5d833e0c | identity-rbac › The bootstrap admin group is mapped once and audited › Once, also under concurrency | covered | src.identity.rbac.bootstrap.test.ts::C-5d833e0c Once, also under concurrency (passed, red_assertion) | - | 0.85 |
| C-66bbe105 | identity-rbac › The bootstrap admin group is mapped once and audited › Refusals | covered | src.identity.rbac.bootstrap.test.ts::C-66bbe105 Refusals (passed, red_assertion) | - | 0.90 |
| C-df09429c | identity-rbac › The bootstrap admin group is mapped once and audited › The configured name | covered | src.identity.rbac.bootstrap.test.ts::C-df09429c The configured name (passed, red_assertion) | - | 0.88 |
| C-87d71866 | identity-rbac › The principal carries the roles and teams of its memberships › Load | covered | src.identity.rbac.memberships.test.ts::C-87d71866 Load (passed, red_assertion) | - | 0.90 |
| C-659b4982 | identity-rbac › The principal carries the roles and teams of its memberships › Resolve | covered | src.identity.rbac.principal.test.ts::C-659b4982 Resolve (passed, red_assertion) | - | 0.90 |
| C-60e440ae | identity-rbac › The principal carries the roles and teams of its memberships › More than 64 is refused | covered | src.identity.rbac.principal.test.ts::C-60e440ae More than 64 is refused (passed, red_assertion) | - | 0.92 |
| C-d0dff9b1 | identity-rbac › The principal carries the roles and teams of its memberships › Requests carry the memberships | covered | src.api.session-auth.rbac.test.ts::C-d0dff9b1 Requests carry the memberships (passed, red_assertion) | - | 0.81 |
| C-b0ef8ac4 | identity-rbac › Roles are Cedar parents and the admin permits are fixed › Who may do what | covered | src.identity.roles-policy.test.ts::C-b0ef8ac4 who may do what (passed, red_assertion) | - | 0.93 |
| C-a5d01d7a | identity-rbac › Roles are Cedar parents and the admin permits are fixed › Loaded with every module's fragments | covered | src.identity.roles-policy.test.ts::C-a5d01d7a loaded with every module's fragments (passed, red_assertion) | - | 0.91 |
| C-84f68efb | identity-rbac › The e2e stack seeds the group mappings of every tenant › Seed, re-seed, skip | covered | test.support.e2e-stack.rbac-part.test.ts::C-84f68efb Seed, re-seed, skip (passed, red_assertion) | - | 0.94 |
| C-d6306ed0 | identity-rbac › The e2e stack seeds the group mappings of every tenant › Discovered in order | covered | test.support.e2e-stack.rbac-part.test.ts::C-d6306ed0 Discovered in order (passed, red_assertion) | - | 0.88 |
| C-24fd43c4 | identity-rbac › Every tenant has the four default roles — regression 1 › Schema test does not check the exported DEFAULT_ROLES | covered | src.identity.rbac.default-roles.test.ts::C-24fd43c4 Schema test checks exported DEFAULT_ROLES against every tenant (passed, pre_satisfied) | - | 0.75 |
| C-e5f925ef | identity-rbac › Every tenant has the four default roles — regression 1 › Schema test does not check the exported DEFAULT_ROLES (2) | covered | src.identity.rbac.default-roles.test.ts::C-e5f925ef Regression check sorts exported DEFAULT_ROLES against the seeded list (passed, pre_satisfied) | - | 0.88 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-roles-and-memberships-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships-fix-1/specs/identity-rbac/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/ledger/r-20261030T2244Z-b219.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/ledger/r-20261031T0004Z-f337.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/ledger/r-20261031T0117Z-a389.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/ledger/r-20261031T0210Z-2e8f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/ledger/r-20261031T0212Z-d0bf.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/session-auth.rbac.test.ts` |  | relevant | new test file |
| `src/api/session-auth.ts` | api | relevant | named in the spec |
| `src/db/migrations/0170_rbac.sql` | db | relevant | named in the spec |
| `src/identity/index.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/callback.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/memberships.test.ts` |  | relevant | new test file |
| `src/identity/policy/roles.cedar` | identity | relevant | named in the spec |
| `src/identity/rbac/bootstrap.test.ts` |  | relevant | new test file |
| `src/identity/rbac/bootstrap.ts` | identity | relevant | named in the spec |
| `src/identity/rbac/default-roles.test.ts` |  | relevant | new test file |
| `src/identity/rbac/errors.ts` | identity | relevant | named in the spec |
| `src/identity/rbac/grants.test.ts` |  | relevant | new test file |
| `src/identity/rbac/grants.ts` | identity | relevant | named in the spec |
| `src/identity/rbac/group-map.test.ts` |  | relevant | new test file |
| `src/identity/rbac/group-map.ts` | identity | relevant | named in the spec |
| `src/identity/rbac/memberships.test.ts` |  | relevant | new test file |
| `src/identity/rbac/memberships.ts` | identity | relevant | named in the spec |
| `src/identity/rbac/names.ts` | identity | relevant | named in the spec |
| `src/identity/rbac/principal.test.ts` |  | relevant | new test file |
| `src/identity/rbac/principal.ts` | identity | relevant | named in the spec |
| `src/identity/rbac/schema.test.ts` |  | relevant | new test file |
| `src/identity/rbac/sync.test.ts` |  | relevant | new test file |
| `src/identity/rbac/sync.ts` | identity | relevant | named in the spec |
| `src/identity/rbac/teams.test.ts` |  | relevant | new test file |
| `src/identity/rbac/teams.ts` | identity | relevant | named in the spec |
| `src/identity/roles-policy.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/parts/30-rbac.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/rbac-part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/rbac-part.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/session-auth.ts, src/identity/index.ts, src/identity/oidc/callback.ts, src/identity/rbac/bootstrap.ts, src/identity/rbac/errors.ts and 9 more

### Tests

1021 of 1021 passed, 0 failed, 0 errored, 0 skipped.
32 of 32 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-bb91aeca | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eb484eda | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8a5b7447 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f0f427e3 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e31534ad | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3ba7ccd7 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-64a88d7a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d442505b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-24e66351 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-658fd38c | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-48073cfd | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-99e7d850 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-50042352 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5b09c7d9 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e3d072a4 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-959908eb | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4cd3fa8b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f3ce9a1e | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d833e0c | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-66bbe105 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-df09429c | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-87d71866 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-659b4982 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-60e440ae | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d0dff9b1 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b0ef8ac4 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a5d01d7a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-84f68efb | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d6306ed0 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-24fd43c4 | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e5f925ef | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-bb91aeca | identity-rbac › Every tenant has the four default roles › Created with the tenant | pass | pass | the judge passed it and a discriminating test passes |
| C-eb484eda | identity-rbac › Every tenant has the four default roles › Idempotent, setting restored | pass | pass | the judge passed it and a discriminating test passes |
| C-8a5b7447 | identity-rbac › The rbac tables are tenant-leading and narrowly granted › Objects, catalog, privileges, checks | pass | pass | the judge passed it and a discriminating test passes |
| C-f0f427e3 | identity-rbac › Roles are listed and teams are managed inside one tenant › Create, list, delete | pass | pass | the judge passed it and a discriminating test passes |
| C-e31534ad | identity-rbac › Roles are listed and teams are managed inside one tenant › Refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-3ba7ccd7 | identity-rbac › A group mapping links one IdP group to one role or team › Map, replace, list | pass | pass | the judge passed it and a discriminating test passes |
| C-64a88d7a | identity-rbac › A group mapping links one IdP group to one role or team › Refusals and no elevation | pass | pass | the judge passed it and a discriminating test passes |
| C-d442505b | identity-rbac › A group mapping links one IdP group to one role or team › No demoting of the admin mapping | pass | pass | the judge passed it and a discriminating test passes |
| C-24e66351 | identity-rbac › A group mapping links one IdP group to one role or team › Removing revokes what the mapping granted | pass | pass | the judge passed it and a discriminating test passes |
| C-658fd38c | identity-rbac › Token groups become memberships at sign-in › The claim | pass | pass | the judge passed it and a discriminating test passes |
| C-48073cfd | identity-rbac › Token groups become memberships at sign-in › Add, keep, replace, remove | pass | pass | the judge passed it and a discriminating test passes |
| C-99e7d850 | identity-rbac › Token groups become memberships at sign-in › Other sources are untouched | pass | pass | the judge passed it and a discriminating test passes |
| C-50042352 | identity-rbac › Token groups become memberships at sign-in › Bad input and tenants | pass | pass | the judge passed it and a discriminating test passes |
| C-5b09c7d9 | identity-rbac › Token groups become memberships at sign-in › Sign-in applies the mappings | pass | pass | the judge passed it and a discriminating test passes |
| C-e3d072a4 | identity-rbac › Token groups become memberships at sign-in › A failing sync refuses the sign-in | pass | pass | the judge passed it and a discriminating test passes |
| C-959908eb | identity-rbac › A role is granted directly only to a service account, or by an operator › Grant and revoke on a service account | pass | pass | the judge passed it and a discriminating test passes |
| C-4cd3fa8b | identity-rbac › A role is granted directly only to a service account, or by an operator › Humans and elevation | pass | pass | the judge passed it and a discriminating test passes |
| C-f3ce9a1e | identity-rbac › A role is granted directly only to a service account, or by an operator › Missing, invalid, concurrent, disabled | pass | pass | the judge passed it and a discriminating test passes |
| C-5d833e0c | identity-rbac › The bootstrap admin group is mapped once and audited › Once, also under concurrency | pass | pass | the judge passed it and a discriminating test passes |
| C-66bbe105 | identity-rbac › The bootstrap admin group is mapped once and audited › Refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-df09429c | identity-rbac › The bootstrap admin group is mapped once and audited › The configured name | pass | pass | the judge passed it and a discriminating test passes |
| C-87d71866 | identity-rbac › The principal carries the roles and teams of its memberships › Load | pass | pass | the judge passed it and a discriminating test passes |
| C-659b4982 | identity-rbac › The principal carries the roles and teams of its memberships › Resolve | pass | pass | the judge passed it and a discriminating test passes |
| C-60e440ae | identity-rbac › The principal carries the roles and teams of its memberships › More than 64 is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-d0dff9b1 | identity-rbac › The principal carries the roles and teams of its memberships › Requests carry the memberships | pass | pass | the judge passed it and a discriminating test passes |
| C-b0ef8ac4 | identity-rbac › Roles are Cedar parents and the admin permits are fixed › Who may do what | pass | pass | the judge passed it and a discriminating test passes |
| C-a5d01d7a | identity-rbac › Roles are Cedar parents and the admin permits are fixed › Loaded with every module's fragments | pass | pass | the judge passed it and a discriminating test passes |
| C-84f68efb | identity-rbac › The e2e stack seeds the group mappings of every tenant › Seed, re-seed, skip | pass | pass | the judge passed it and a discriminating test passes |
| C-d6306ed0 | identity-rbac › The e2e stack seeds the group mappings of every tenant › Discovered in order | pass | pass | the judge passed it and a discriminating test passes |
| C-24fd43c4 | identity-rbac › Every tenant has the four default roles — regression 1 › Schema test does not check the exported DEFAULT_ROLES | pass | pass | the judge passed it and a discriminating test passes |
| C-e5f925ef | identity-rbac › Every tenant has the four default roles — regression 1 › Schema test does not check the exported DEFAULT_ROLES (2) | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.session-auth.rbac.test.ts::C-d0dff9b1 Requests carry the memberships` (task 8.2): passed
- `src.identity.oidc.memberships.test.ts::C-5b09c7d9 Sign-in applies the mappings` (task 9.1): passed
- `src.identity.oidc.memberships.test.ts::C-e3d072a4 A failing sync refuses the sign-in` (task 9.1): passed
- `src.identity.rbac.bootstrap.test.ts::C-5d833e0c Once, also under concurrency` (task 6.1): passed
- `src.identity.rbac.bootstrap.test.ts::C-66bbe105 Refusals` (task 6.1): passed
- `src.identity.rbac.bootstrap.test.ts::C-df09429c The configured name` (task 6.1): passed
- `src.identity.rbac.default-roles.test.ts::C-24fd43c4 Schema test checks exported DEFAULT_ROLES against every tenant` (task 1.1): passed
- `src.identity.rbac.default-roles.test.ts::C-bb91aeca Created with the tenant ties exported DEFAULT_ROLES to the seeded roles` (task 1.1): passed
- `src.identity.rbac.default-roles.test.ts::C-e5f925ef Regression check sorts exported DEFAULT_ROLES against the seeded list` (task 1.1): passed
- `src.identity.rbac.grants.test.ts::C-4cd3fa8b Humans and elevation` (task 5.1): passed
- `src.identity.rbac.grants.test.ts::C-959908eb Grant and revoke on a service account` (task 5.1): passed
- `src.identity.rbac.grants.test.ts::C-f3ce9a1e Missing, invalid, concurrent, disabled` (task 5.1): passed
- `src.identity.rbac.group-map.test.ts::C-24e66351 Removing revokes what the mapping granted` (task 3.1): passed
- `src.identity.rbac.group-map.test.ts::C-3ba7ccd7 Map, replace, list` (task 3.1): passed
- `src.identity.rbac.group-map.test.ts::C-64a88d7a Refusals and no elevation` (task 3.1): passed
- `src.identity.rbac.group-map.test.ts::C-d442505b No demoting of the admin mapping` (task 3.1): passed
- `src.identity.rbac.memberships.test.ts::C-87d71866 Load` (task 4.1): passed
- `src.identity.rbac.principal.test.ts::C-60e440ae More than 64 is refused` (task 8.1): passed
- `src.identity.rbac.principal.test.ts::C-659b4982 Resolve` (task 8.1): passed
- `src.identity.rbac.schema.test.ts::C-8a5b7447 Objects, catalog, privileges, checks` (task 1.1): passed
- `src.identity.rbac.schema.test.ts::C-bb91aeca Created with the tenant` (task 1.1): passed
- `src.identity.rbac.schema.test.ts::C-eb484eda Idempotent, setting restored` (task 1.1): passed
- `src.identity.rbac.sync.test.ts::C-48073cfd Add, keep, replace, remove` (task 4.1): passed
- `src.identity.rbac.sync.test.ts::C-50042352 Bad input and tenants` (task 4.1): passed
- `src.identity.rbac.sync.test.ts::C-658fd38c The claim` (task 4.1): passed
- `src.identity.rbac.sync.test.ts::C-99e7d850 Other sources are untouched` (task 4.1): passed
- `src.identity.rbac.teams.test.ts::C-e31534ad Refusals` (task 2.1): passed
- `src.identity.rbac.teams.test.ts::C-f0f427e3 Create, list, delete` (task 2.1): passed
- `src.identity.roles-policy.test.ts::C-a5d01d7a loaded with every module's fragments` (task 7.1): passed
- `src.identity.roles-policy.test.ts::C-b0ef8ac4 who may do what` (task 7.1): passed
- `test.support.e2e-stack.rbac-part.test.ts::C-84f68efb Seed, re-seed, skip` (task 10.1): passed
- `test.support.e2e-stack.rbac-part.test.ts::C-d6306ed0 Discovered in order` (task 10.1): passed
