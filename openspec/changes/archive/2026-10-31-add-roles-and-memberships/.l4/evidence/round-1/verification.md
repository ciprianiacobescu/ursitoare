# Verification: openspec:add-roles-and-memberships: NEEDS_HUMAN (round 1)

traceability: 29/29 criteria covered by a discriminating test

- Base: `93f072a4351c30ae7665a3faf2d03524f8a429f6`
- Head: `c85e4f373d579aa72c52f37031ba2332997e4ff5`
- Implementer profiles: deepseek-free, glm
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `22888bdec60cfa3eb69c7e144d0f211ffa52fdef20c073c8d877ff8f624341ee`
  - part 1: 21 file(s), 111513 characters, profile claude-judge, reply valid
  - part 2: 8 file(s), 65899 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek-free deepseek (declared), glm zhipu (declared)
- Cost: $2.5066

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@93f072a435 contained |
| 1 | integrity | ok | 76.2 | 11 sub-checks (+1 unfrozen by human answers); scope: 32 changed file(s) |
| 2 | build | ok | 25.0 |  |
| 3 | tests | ok | 104.5 |  |
| 4 | traceability | ok | 0.2 | 29/29 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/session-auth.ts, src/identity/index.ts, src/identity/oidc/callback.ts, src/identity/rbac/bootstrap.ts, src/identity/rbac/errors.ts and 9 more |
| 8 | s1 judge | ok | 1.7 | 29/29 criteria judged by jev |
| 9 | judge | ok | 199.9 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261031T0004Z-f337/125-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261031T0004Z-f337/126-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261031T0004Z-f337/127-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261031T0004Z-f337/128-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261031T0004Z-f337/129-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261031T0004Z-f337/130-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261031T0004Z-f337/131-e2e.log |

## Files by part

- part 1: src/db/migrations/0170_rbac.sql (4308 characters)
- part 1: test/support/e2e-stack/parts/30-rbac.ts (266 characters)
- part 1: src/identity/rbac/bootstrap.test.ts (6951 characters)
- part 1: src/identity/rbac/bootstrap.ts (3058 characters)
- part 1: src/identity/oidc/callback.ts (1245 characters)
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
- part 1: test/support/e2e-stack/rbac-part.test.ts (8466 characters)
- part 1: test/support/e2e-stack/rbac-part.ts (3889 characters)
- part 1: src/identity/policy/roles.cedar (742 characters)
- part 1: src/identity/roles-policy.test.ts (5811 characters)
- part 2: src/identity/rbac/schema.test.ts (8421 characters)
- part 2: src/api/session-auth.rbac.test.ts (9824 characters)
- part 2: src/api/session-auth.ts (886 characters)
- part 2: src/identity/rbac/sync.test.ts (12522 characters)
- part 2: src/identity/rbac/sync.ts (6343 characters)
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
| suppressions | skipped | not checked: python only; changed files outside it: src/api/session-auth.rbac.test.ts, src/api/session-auth.ts, src/identity/index.ts, src/identity/oidc/callback.ts, src/identity/oidc/memberships.test.ts (+21 more) |
| tdd history | ok | 11 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 943 of 943 base tests pass on the unit's code with its 11 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/identity/rbac/grants.test.ts kept at head for the run (task 5.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/identity/rbac/grants.test.ts (task 5.1, unfrozen by Q-001 (agent))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-bb91aeca | identity-rbac › Every tenant has the four default roles › Created with the tenant | covered | src.identity.rbac.schema.test.ts::C-bb91aeca Created with the tenant (passed, red_assertion, inadequate) | - | 0.90 |
| C-eb484eda | identity-rbac › Every tenant has the four default roles › Idempotent, setting restored | covered | src.identity.rbac.schema.test.ts::C-eb484eda Idempotent, setting restored (passed, red_assertion) | - | 0.93 |
| C-8a5b7447 | identity-rbac › The rbac tables are tenant-leading and narrowly granted › Objects, catalog, privileges, checks | covered | src.identity.rbac.schema.test.ts::C-8a5b7447 Objects, catalog, privileges, checks (passed, red_assertion) | - | 0.93 |
| C-f0f427e3 | identity-rbac › Roles are listed and teams are managed inside one tenant › Create, list, delete | covered | src.identity.rbac.teams.test.ts::C-f0f427e3 Create, list, delete (passed, red_assertion) | - | 0.94 |
| C-e31534ad | identity-rbac › Roles are listed and teams are managed inside one tenant › Refusals | covered | src.identity.rbac.teams.test.ts::C-e31534ad Refusals (passed, red_assertion) | - | 0.90 |
| C-3ba7ccd7 | identity-rbac › A group mapping links one IdP group to one role or team › Map, replace, list | covered | src.identity.rbac.group-map.test.ts::C-3ba7ccd7 Map, replace, list (passed, red_assertion) | - | 0.94 |
| C-64a88d7a | identity-rbac › A group mapping links one IdP group to one role or team › Refusals and no elevation | covered | src.identity.rbac.group-map.test.ts::C-64a88d7a Refusals and no elevation (passed, red_assertion) | - | 0.91 |
| C-d442505b | identity-rbac › A group mapping links one IdP group to one role or team › No demoting of the admin mapping | covered | src.identity.rbac.group-map.test.ts::C-d442505b No demoting of the admin mapping (passed, red_assertion) | - | 0.92 |
| C-24e66351 | identity-rbac › A group mapping links one IdP group to one role or team › Removing revokes what the mapping granted | covered | src.identity.rbac.group-map.test.ts::C-24e66351 Removing revokes what the mapping granted (passed, red_assertion) | - | 0.93 |
| C-658fd38c | identity-rbac › Token groups become memberships at sign-in › The claim | covered | src.identity.rbac.sync.test.ts::C-658fd38c The claim (passed, red_assertion) | - | 0.90 |
| C-48073cfd | identity-rbac › Token groups become memberships at sign-in › Add, keep, replace, remove | covered | src.identity.rbac.sync.test.ts::C-48073cfd Add, keep, replace, remove (passed, red_assertion) | - | 0.94 |
| C-99e7d850 | identity-rbac › Token groups become memberships at sign-in › Other sources are untouched | covered | src.identity.rbac.sync.test.ts::C-99e7d850 Other sources are untouched (passed, red_assertion) | - | 0.93 |
| C-50042352 | identity-rbac › Token groups become memberships at sign-in › Bad input and tenants | covered | src.identity.rbac.sync.test.ts::C-50042352 Bad input and tenants (passed, red_assertion) | - | 0.88 |
| C-5b09c7d9 | identity-rbac › Token groups become memberships at sign-in › Sign-in applies the mappings | covered | src.identity.oidc.memberships.test.ts::C-5b09c7d9 Sign-in applies the mappings (passed, red_assertion) | - | 0.90 |
| C-e3d072a4 | identity-rbac › Token groups become memberships at sign-in › A failing sync refuses the sign-in | covered | src.identity.oidc.memberships.test.ts::C-e3d072a4 A failing sync refuses the sign-in (passed, red_assertion) | - | 0.89 |
| C-959908eb | identity-rbac › A role is granted directly only to a service account, or by an operator › Grant and revoke on a service account | covered | src.identity.rbac.grants.test.ts::C-959908eb Grant and revoke on a service account (passed, red_assertion) | - | 0.93 |
| C-4cd3fa8b | identity-rbac › A role is granted directly only to a service account, or by an operator › Humans and elevation | covered | src.identity.rbac.grants.test.ts::C-4cd3fa8b Humans and elevation (passed, red_assertion) | - | 0.92 |
| C-f3ce9a1e | identity-rbac › A role is granted directly only to a service account, or by an operator › Missing, invalid, concurrent, disabled | covered | src.identity.rbac.grants.test.ts::C-f3ce9a1e Missing, invalid, concurrent, disabled (passed, red_assertion) | - | 0.92 |
| C-5d833e0c | identity-rbac › The bootstrap admin group is mapped once and audited › Once, also under concurrency | covered | src.identity.rbac.bootstrap.test.ts::C-5d833e0c Once, also under concurrency (passed, red_assertion) | - | 0.84 |
| C-66bbe105 | identity-rbac › The bootstrap admin group is mapped once and audited › Refusals | covered | src.identity.rbac.bootstrap.test.ts::C-66bbe105 Refusals (passed, red_assertion) | - | 0.89 |
| C-df09429c | identity-rbac › The bootstrap admin group is mapped once and audited › The configured name | covered | src.identity.rbac.bootstrap.test.ts::C-df09429c The configured name (passed, red_assertion) | - | 0.87 |
| C-87d71866 | identity-rbac › The principal carries the roles and teams of its memberships › Load | covered | src.identity.rbac.memberships.test.ts::C-87d71866 Load (passed, red_assertion) | - | 0.91 |
| C-659b4982 | identity-rbac › The principal carries the roles and teams of its memberships › Resolve | covered | src.identity.rbac.principal.test.ts::C-659b4982 Resolve (passed, red_assertion) | - | 0.92 |
| C-60e440ae | identity-rbac › The principal carries the roles and teams of its memberships › More than 64 is refused | covered | src.identity.rbac.principal.test.ts::C-60e440ae More than 64 is refused (passed, red_assertion) | - | 0.93 |
| C-d0dff9b1 | identity-rbac › The principal carries the roles and teams of its memberships › Requests carry the memberships | covered | src.api.session-auth.rbac.test.ts::C-d0dff9b1 Requests carry the memberships (passed, red_assertion) | - | 0.82 |
| C-b0ef8ac4 | identity-rbac › Roles are Cedar parents and the admin permits are fixed › Who may do what | covered | src.identity.roles-policy.test.ts::C-b0ef8ac4 who may do what (passed, red_assertion) | - | 0.92 |
| C-a5d01d7a | identity-rbac › Roles are Cedar parents and the admin permits are fixed › Loaded with every module's fragments | covered | src.identity.roles-policy.test.ts::C-a5d01d7a loaded with every module's fragments (passed, red_assertion) | - | 0.91 |
| C-84f68efb | identity-rbac › The e2e stack seeds the group mappings of every tenant › Seed, re-seed, skip | covered | test.support.e2e-stack.rbac-part.test.ts::C-84f68efb Seed, re-seed, skip (passed, red_assertion) | - | 0.94 |
| C-d6306ed0 | identity-rbac › The e2e stack seeds the group mappings of every tenant › Discovered in order | covered | test.support.e2e-stack.rbac-part.test.ts::C-d6306ed0 Discovered in order (passed, red_assertion) | - | 0.88 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-roles-and-memberships/.l4/ledger/r-20261030T2244Z-b219.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/.l4/ledger/r-20261031T0004Z-f337.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-roles-and-memberships/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/session-auth.rbac.test.ts` |  | relevant | new test file |
| `src/api/session-auth.ts` | api | relevant | named in the spec |
| `src/db/migrations/0170_rbac.sql` | db | relevant | named in the spec |
| `src/identity/index.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/callback.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/memberships.test.ts` |  | relevant | new test file |
| `src/identity/policy/roles.cedar` | identity | relevant | named in the spec |
| `src/identity/rbac/bootstrap.test.ts` |  | relevant | new test file |
| `src/identity/rbac/bootstrap.ts` | identity | relevant | named in the spec |
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

1018 of 1018 passed, 0 failed, 0 errored, 0 skipped.
29 of 29 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-bb91aeca | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eb484eda | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8a5b7447 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f0f427e3 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e31534ad | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3ba7ccd7 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-64a88d7a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d442505b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-24e66351 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-658fd38c | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-48073cfd | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-99e7d850 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-50042352 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5b09c7d9 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e3d072a4 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-959908eb | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4cd3fa8b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f3ce9a1e | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d833e0c | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-66bbe105 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-df09429c | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-87d71866 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-659b4982 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-60e440ae | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d0dff9b1 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b0ef8ac4 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a5d01d7a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-84f68efb | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d6306ed0 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-bb91aeca | identity-rbac › Every tenant has the four default roles › Created with the tenant | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
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

## Findings

- [minor, judge] Bootstrap overwrites an existing non-admin mapping of the same group without revoking its memberships (spec gap) (criterion C-5d833e0c): mapBootstrapAdminGroup upserts with ON CONFLICT DO UPDATE. If the bootstrap group already maps to another role or team, that mapping is replaced with tenant_admin, but the idp_claim memberships of the old target are not deleted. setGroupMapping does delete them when it replaces a mapping. No scenario pins this case.
- [minor, judge] Direct grants to a disabled user are accepted (spec gap) (criterion C-f3ce9a1e): requireUser checks only the user's existence and kind, not its state. grantRole therefore writes a local row and an audit event for a disabled service account (or, with an operator actor, a disabled human). The grant takes effect once the user is re-enabled.
- [minor, judge] A repeated mapping by another actor keeps the first reviewer (spec gap) (criterion C-3ba7ccd7): The no-op test compares only the target. A second actor setting the same target gets back the stored row with the original reviewedBy, and no event is appended.
- [major, judge] Schema test does not check the exported DEFAULT_ROLES (criterion C-bb91aeca): C-bb91aeca requires `[...DEFAULT_ROLES].sort()` to equal the role list. src/identity/rbac/schema.test.ts never imports DEFAULT_ROLES and asserts `[...DEFAULT_ROLE_IDS].sort()` against its own literal. The THEN clause about the constant is therefore untested, and the implementer's note confirms it was left this way on purpose.
- [minor, judge] Team refusals test does not check that no audit event is written (criterion C-e31534ad): The scenario says 'nothing is written'. The test checks only the team lists, not that refusals append no identity.team_* event.
- [minor, judge] The 1000-group cap counts kept names, not claim entries (spec gap) (criterion C-658fd38c): groupsFromIdToken skips invalid and duplicate entries and stops only once 1000 names have been kept. A claim with more than 1000 entries, some invalid, can therefore yield names from beyond the 1000th entry. An implementation that slices the first 1000 raw entries would differ.
- [minor, judge] One invalid group name rejects the whole sync (spec gap) (criterion C-50042352): syncMemberships validates each group with requireGroupName and throws RBAC_INVALID instead of dropping the bad entry. It also sets no upper bound on the number of groups.
- [minor, judge] Sync runs for a disabled user (spec gap) (criterion C-50042352): The user check in syncMemberships matches any state. A disabled user's idp_claim memberships are still added, removed and audited, and an implementation that refuses non-active users would differ.
- [minor, judge] the judge called a test inadequate (criterion C-bb91aeca): src.identity.rbac.schema.test.ts::C-bb91aeca Created with the tenant

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.session-auth.rbac.test.ts::C-d0dff9b1 Requests carry the memberships` (task 8.2): passed
- `src.identity.oidc.memberships.test.ts::C-5b09c7d9 Sign-in applies the mappings` (task 9.1): passed
- `src.identity.oidc.memberships.test.ts::C-e3d072a4 A failing sync refuses the sign-in` (task 9.1): passed
- `src.identity.rbac.bootstrap.test.ts::C-5d833e0c Once, also under concurrency` (task 6.1): passed
- `src.identity.rbac.bootstrap.test.ts::C-66bbe105 Refusals` (task 6.1): passed
- `src.identity.rbac.bootstrap.test.ts::C-df09429c The configured name` (task 6.1): passed
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
