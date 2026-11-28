# Verification: openspec:add-tenant-bootstrap: PASS (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `d258cd2d6b5c91776fd5bd8b8493fd573478d544`
- Head: `f2df0c40be15437eb6f9ea46dec3e2130be52b82`
- Implementer profiles: claude-sonnet
- Judge: nemotron-judge, 1 call(s), prompt sha256 `87056897c04d5de73a6b386da5774e4ef4c11c1fd8274d0ea1b328bf21825f6f`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@d258cd2d6b contained |
| 1 | integrity | ok | 873.9 | 11 sub-checks; scope: 32 changed file(s) |
| 2 | build | ok | 35.5 |  |
| 3 | tests | ok | 508.0 |  |
| 4 | traceability | ok | 0.2 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/cli/builtin.ts, src/cli/errors.ts, src/cli/setup/db-prepare.ts, src/cli/setup/db-roles.ts, src/cli/setup/errors.ts and 10 more |
| 8 | s1 judge | ok | 0.4 | 6/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 98.0 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261128T0008Z-0633/050-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261128T0008Z-0633/051-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261128T0008Z-0633/052-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261128T0008Z-0633/053-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261128T0008Z-0633/054-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261128T0008Z-0633/055-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261128T0008Z-0633/056-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 3 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 9 task(s): red and green compared |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/cli/builtin.ts, src/cli/errors.ts, src/cli/flow/test-registry.test.ts, src/cli/init-secrets-registry.test.ts, src/cli/main.test.ts (+24 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 3212 of 3212 base tests pass on the unit's code with its 14 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src.cli.flow.test-registry.test.ts::C-2687097e cliMain help lists the seven default commands in order (named by the task text, plan:m8@0816248919542615)
- src.cli.flow.test-registry.test.ts::C-2687097e fresh registries list the admin flow and default commands (named by the task text, plan:m8@0816248919542615)
- src.cli.init-secrets-registry.test.ts::C-2687097e the default registry lists init-secrets and runs it (named by the task text, plan:m8@0816248919542615)
- src.cli.main.test.ts::C-2687097e registerAdminCommands and createDefaultRegistry list the five admin commands (named by the task text, plan:m8@0816248919542615)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-4433906a | ops-cli › The admin database endpoint is read from a variable and a file › Valid and refused admin settings | covered | src.config.admin.test.ts::C-4433906a loadAdminDatabase reads and refuses (passed, red_assertion) | - | - |
| C-21ae96cc | ops-cli › db-roles creates the engine database and both roles › A fresh cluster, a repeat and a dropped database | covered | src.cli.setup.db-roles.test.ts::C-21ae96cc db-roles fresh, repeat and dropped database (passed, red_assertion) | - | 0.95 |
| C-f4a01e13 | ops-cli › db-roles creates the engine database and both roles › Missing settings and an unreachable server | covered | src.cli.setup.db-roles.test.ts::C-f4a01e13 db-roles refusals (passed, red_assertion) | - | - |
| C-c61c6116 | ops-cli › db-prepare applies the schema and the durable schema › Apply, repeat and a failing step | covered | src.cli.setup.db-prepare.test.ts::C-c61c6116 db-prepare apply, repeat and failure (passed, red_assertion) | - | 0.95 |
| C-da899ae8 | ops-cli › tenant-create creates a tenant by name › Create, repeat, conflict and bad input | covered | src.cli.setup.tenant-create.test.ts::C-da899ae8 tenant-create once by name (passed, red_assertion) | - | 0.70 |
| C-0f153418 | ops-cli › A setup command names its tenant › By id, by name and ambiguous | covered | src.cli.setup.tenant-option.test.ts::C-0f153418 resolveSetupTenant id, name, ambiguous (passed, red_assertion) | - | 0.94 |
| C-1fc4a1df | ops-cli › tenant-idp registers an identity provider by tenant name › Register, repeat and taken | covered | src.cli.setup.tenant-idp.test.ts::C-1fc4a1df tenant-idp register, repeat, taken (passed, red_assertion) | - | - |
| C-602138c7 | ops-cli › tenant-sink binds the sink tokens by tenant name › Bind, repeat, taken and refused tokens | covered | src.cli.setup.tenant-sink.test.ts::C-602138c7 tenant-sink bind, repeat, taken (passed, red_assertion) | - | 0.92 |
| C-d5ac552b | ops-cli › The setup commands bootstrap a fresh stack in five steps › Five steps twice with two other tenants present | covered | src.cli.setup.bootstrap-chain.test.ts::C-d5ac552b five steps twice on a fresh cluster (passed, red_assertion) | - | - |
| C-2687097e | ops-cli › The entry point runs the default registry › The default registry through cliMain | covered | src.cli.flow.test-registry.test.ts::C-2687097e cliMain help lists the seven default commands in order (passed, red_assertion); src.cli.flow.test-registry.test.ts::C-2687097e fresh registries list the admin flow and default commands (passed, red_assertion); src.cli.init-secrets-registry.test.ts::C-26... | src.cli.main.test.ts::C-2687097e cliMain prints help for the default registry (no proof that it discriminates (no red, audit or generated record)); src.cli.main.test.ts::C-2687097e cliMain refuses a command that needs the owner configuration (no proof that it discriminates (no red, audit or generate... | - |
| C-54587b81 | ops-cli › The entry point runs the default registry › The process environment | covered | src.config.environment.test.ts::C-54587b81 readProcessEnv returns a copy of the process environment (passed, pass_to_pass) | - | 0.93 |
| C-6dcf07eb | tenancy › A tenant is created by name with its review profile › Create, repeat, conflict, bad input and race | covered | src.tenancy.ensure-tenant.test.ts::C-6dcf07eb ensureTenant by name (passed, red_assertion) | - | - |
| C-238cef58 | tenancy › The sink tokens bind as two hash-only routes › Bind, repeat, resolve and roll back | covered | src.tenancy.sink-binding.test.ts::C-238cef58 bindSinkTokens two hash-only routes (passed, red_assertion) | - | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-tenant-bootstrap/.l4/ledger/r-20261127T2139Z-9210.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tenant-bootstrap/.l4/ledger/r-20261128T0008Z-0633.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tenant-bootstrap/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/cli/builtin.ts` | cli | relevant | named in the spec |
| `src/cli/errors.ts` | cli | relevant | named in the spec |
| `src/cli/flow/test-registry.test.ts` |  | relevant | named in the spec |
| `src/cli/init-secrets-registry.test.ts` |  | relevant | named in the spec |
| `src/cli/main.test.ts` |  | relevant | named in the spec |
| `src/cli/setup/bootstrap-chain.test.ts` |  | relevant | new test file |
| `src/cli/setup/db-prepare.test.ts` |  | relevant | new test file |
| `src/cli/setup/db-prepare.ts` | cli | relevant | named in the spec |
| `src/cli/setup/db-roles.test.ts` |  | relevant | new test file |
| `src/cli/setup/db-roles.ts` | cli | relevant | named in the spec |
| `src/cli/setup/errors.ts` | cli | relevant | named in the spec |
| `src/cli/setup/registry.test.ts` |  | relevant | new test file |
| `src/cli/setup/tenant-create.test.ts` |  | relevant | new test file |
| `src/cli/setup/tenant-create.ts` | cli | relevant | named in the spec |
| `src/cli/setup/tenant-idp.test.ts` |  | relevant | new test file |
| `src/cli/setup/tenant-idp.ts` | cli | relevant | named in the spec |
| `src/cli/setup/tenant-option.test.ts` |  | relevant | new test file |
| `src/cli/setup/tenant-option.ts` | cli | relevant | named in the spec |
| `src/cli/setup/tenant-sink.test.ts` |  | relevant | new test file |
| `src/cli/setup/tenant-sink.ts` | cli | relevant | named in the spec |
| `src/config/admin.test.ts` |  | relevant | new test file |
| `src/config/admin.ts` | config | relevant | named in the spec |
| `src/config/index.ts` | config | relevant | named in the spec |
| `src/tenancy/bootstrap.ts` | tenancy | relevant | named in the spec |
| `src/tenancy/ensure-tenant.test.ts` |  | relevant | new test file |
| `src/tenancy/errors.ts` | tenancy | relevant | named in the spec |
| `src/tenancy/index.ts` | tenancy | relevant | named in the spec |
| `src/tenancy/sink-binding.test.ts` |  | relevant | new test file |
| `src/tenancy/sink-binding.ts` | tenancy | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/cli/builtin.ts, src/cli/errors.ts, src/cli/setup/db-prepare.ts, src/cli/setup/db-roles.ts, src/cli/setup/errors.ts and 10 more

### Tests

3375 of 3375 passed, 0 failed, 0 errored, 0 skipped.
12 of 12 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-4433906a | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-21ae96cc | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f4a01e13 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-c61c6116 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-da899ae8 | ok | 0.700 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0f153418 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1fc4a1df | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-602138c7 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d5ac552b | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-2687097e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-54587b81 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6dcf07eb | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-238cef58 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-4433906a | ops-cli › The admin database endpoint is read from a variable and a file › Valid and refused admin settings | pass | pass | the judge passed it and a discriminating test passes |
| C-21ae96cc | ops-cli › db-roles creates the engine database and both roles › A fresh cluster, a repeat and a dropped database | pass | pass | the judge passed it and a discriminating test passes |
| C-f4a01e13 | ops-cli › db-roles creates the engine database and both roles › Missing settings and an unreachable server | pass | pass | the judge passed it and a discriminating test passes |
| C-c61c6116 | ops-cli › db-prepare applies the schema and the durable schema › Apply, repeat and a failing step | pass | pass | the judge passed it and a discriminating test passes |
| C-da899ae8 | ops-cli › tenant-create creates a tenant by name › Create, repeat, conflict and bad input | pass | pass | the judge passed it and a discriminating test passes |
| C-0f153418 | ops-cli › A setup command names its tenant › By id, by name and ambiguous | pass | pass | the judge passed it and a discriminating test passes |
| C-1fc4a1df | ops-cli › tenant-idp registers an identity provider by tenant name › Register, repeat and taken | pass | pass | the judge passed it and a discriminating test passes |
| C-602138c7 | ops-cli › tenant-sink binds the sink tokens by tenant name › Bind, repeat, taken and refused tokens | pass | pass | the judge passed it and a discriminating test passes |
| C-d5ac552b | ops-cli › The setup commands bootstrap a fresh stack in five steps › Five steps twice with two other tenants present | pass | pass | the judge passed it and a discriminating test passes |
| C-2687097e | ops-cli › The entry point runs the default registry › The default registry through cliMain | pass | pass | the judge passed it and a discriminating test passes |
| C-54587b81 | ops-cli › The entry point runs the default registry › The process environment | pass | pass | the judge passed it and a discriminating test passes |
| C-6dcf07eb | tenancy › A tenant is created by name with its review profile › Create, repeat, conflict, bad input and race | pass | pass | the judge passed it and a discriminating test passes |
| C-238cef58 | tenancy › The sink tokens bind as two hash-only routes › Bind, repeat, resolve and roll back | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-2687097e): src.cli.main.test.ts::C-2687097e cliMain prints help for the default registry: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-2687097e): src.cli.main.test.ts::C-2687097e cliMain refuses a command that needs the owner configuration: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-2687097e): src.cli.main.test.ts::C-2687097e cliMain refuses an unknown command: no proof that it discriminates (no red, audit or generated record)

## New tests (red then green, `task.red_ok` in the ledger)

- `src.cli.setup.bootstrap-chain.test.ts::C-d5ac552b five steps twice on a fresh cluster` (task 4.1): passed
- `src.cli.setup.db-prepare.test.ts::C-c61c6116 db-prepare apply, repeat and failure` (task 3.4): passed
- `src.cli.setup.db-roles.test.ts::C-21ae96cc db-roles fresh, repeat and dropped database` (task 3.5): passed
- `src.cli.setup.db-roles.test.ts::C-f4a01e13 db-roles refusals` (task 3.5): passed
- `src.cli.setup.registry.test.ts::C-2687097e the default registry lists thirteen commands` (task 4.1): passed
- `src.cli.setup.tenant-create.test.ts::C-da899ae8 tenant-create once by name` (task 3.1): passed
- `src.cli.setup.tenant-idp.test.ts::C-1fc4a1df tenant-idp register, repeat, taken` (task 3.2): passed
- `src.cli.setup.tenant-option.test.ts::C-0f153418 resolveSetupTenant id, name, ambiguous` (task 3.1): passed
- `src.cli.setup.tenant-sink.test.ts::C-602138c7 tenant-sink bind, repeat, taken` (task 3.3): passed
- `src.config.admin.test.ts::C-4433906a loadAdminDatabase reads and refuses` (task 1.1): passed
- `src.tenancy.ensure-tenant.test.ts::C-6dcf07eb ensureTenant by name` (task 2.1): passed
- `src.tenancy.sink-binding.test.ts::C-238cef58 bindSinkTokens two hash-only routes` (task 2.2): passed
