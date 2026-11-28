# Verification: openspec:add-oidc-backchannel: PASS (round 1)

traceability: 17/17 criteria covered by a discriminating test

- Base: `21f5898677dad752e90d9788fcf61b2092f2834e`
- Head: `ce1016ed8a9e4742ff837a3b8eb9b3421ed348ca`
- Implementer profiles: beam, claude-sonnet, deepseek-free
- Judge: nemotron-judge, 1 call(s), prompt sha256 `b050ae72e04ebe4ba0850a0b5e69633a0f30e1d31535636df9e3487f180466d7`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), beam reflection (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@21f5898677 contained |
| 1 | integrity | ok | 463.9 | 11 sub-checks; scope: 11 changed file(s) |
| 2 | build | ok | 57.6 |  |
| 3 | tests | ok | 749.4 |  |
| 4 | traceability | ok | 0.4 | 17/17 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/config/oidc.ts, src/identity/index.ts, src/identity/oidc/client.ts, src/identity/oidc/config-shape.ts |
| 8 | s1 judge | ok | 1.0 | 17/17 criteria judged by jev |
| 9 | judge | ok | 130.5 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261128T0419Z-2a41/032-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261128T0419Z-2a41/033-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261128T0419Z-2a41/034-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261128T0419Z-2a41/035-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261128T0419Z-2a41/036-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261128T0419Z-2a41/037-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261128T0419Z-2a41/038-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 4 task(s): red and green compared |
| test path freeze | ok | 4 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/config/oidc-backchannel.test.ts, src/config/oidc.ts, src/identity/index.ts, src/identity/oidc/backchannel-discovery.test.ts, src/identity/oidc/backchannel-exchange.test.ts (+3 more) |
| tdd history | ok | 4 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 3224 of 3224 base tests pass on the unit's code with its 4 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-449f1e02 | identity-authn › OIDC is optional and configured by three variables › No issuer | covered | src.config.oidc.test.ts::C-449f1e02 loadConfig leaves oidc absent without OIDC variables and reads it when all three are set (passed, pass_to_pass); src.identity.oidc.login.test.ts::C-449f1e02 No issuer (passed, pass_to_pass) | - | 0.75 |
| C-111fb00c | identity-authn › OIDC is optional and configured by three variables › Valid settings | covered | src.config.oidc.test.ts::C-111fb00c loadConfig accepts an https issuer and every private http host (passed, pass_to_pass); src.config.oidc.test.ts::C-111fb00c loadConfig reads a custom client id and strips only the secret file trailing newline (passed, pass_to_pass) | - | 0.90 |
| C-9c6f374f | identity-authn › OIDC is optional and configured by three variables › Bad settings | covered | src.config.oidc.test.ts::C-9c6f374f loadConfig refuses every public http credentialed or malformed issuer with its reason (passed, pass_to_pass) | - | 0.90 |
| C-78a80972 | identity-authn › OIDC is optional and configured by three variables › Missing prerequisites | covered | src.config.oidc.test.ts::C-78a80972 loadConfig refuses a bad client id and an issuer without the engine key or database URL (passed, pass_to_pass); src.config.oidc.test.ts::C-78a80972 loadConfig refuses stray OIDC variables and a direct client secret without an issuer (passed, pass_to_pass); src.con... | - | 0.90 |
| C-3e029f2d | identity-authn › OIDC is optional and configured by three variables › A half-wired engine is refused | covered | src.identity.oidc.login.test.ts::C-3e029f2d A half-wired engine is refused (passed, pass_to_pass); src.main.oidc.test.ts::C-3e029f2d main refuses a half wired engine with one fatal line and exit one (passed, pass_to_pass) | - | 0.88 |
| C-07ab704f | identity-authn › OIDC is optional and configured by three variables › A back-channel origin is read as an origin | covered | src.config.oidc-backchannel.test.ts::C-07ab704f an absent or empty value leaves no member and an empty one alone leaves oidc absent (passed, red_assertion); src.config.oidc-backchannel.test.ts::C-07ab704f an origin value is stored as its origin (passed, red_assertion) | - | 0.91 |
| C-41a07522 | identity-authn › OIDC is optional and configured by three variables › A bad or stray back-channel value is refused | covered | src.config.oidc-backchannel.test.ts::C-41a07522 a bad back-channel value beside a valid issuer is refused (passed, red_assertion); src.config.oidc-backchannel.test.ts::C-41a07522 a bad issuer is reported before a bad back-channel and the back-channel before the secret file (passed, red_assertion); s... | - | 0.94 |
| C-ad533226 | identity-authn › The provider client is cached, bounded and confined to the issuer › Cached and refetched once | covered | src.identity.oidc.client.test.ts::C-ad533226 Cached and refetched once (passed, pass_to_pass) | - | 0.89 |
| C-4bf7d6e6 | identity-authn › The provider client is cached, bounded and confined to the issuer › Hostile answers | covered | src.identity.oidc.client.test.ts::C-4bf7d6e6 Hostile answers (passed, pass_to_pass) | - | 0.85 |
| C-5a0077b2 | identity-authn › The provider client is cached, bounded and confined to the issuer › Code exchange | covered | src.identity.oidc.client.test.ts::C-5a0077b2 Code exchange (passed, pass_to_pass) | - | 0.88 |
| C-b6e51fd5 | identity-authn › The provider client is cached, bounded and confined to the issuer › Discovery is requested at the back-channel origin | covered | src.identity.oidc.backchannel-discovery.test.ts::C-b6e51fd5 Discovery is requested at the back-channel origin (passed, red_assertion) | - | 0.83 |
| C-8448dfd1 | identity-authn › The provider client is cached, bounded and confined to the issuer › A discovery failure is not retried on the issuer origin | covered | src.identity.oidc.backchannel-discovery.test.ts::C-8448dfd1 A discovery failure is not retried on the issuer origin (passed, red_assertion) | - | 0.88 |
| C-2f15db84 | identity-authn › The provider client is cached, bounded and confined to the issuer › Without a back-channel nothing changes | covered | src.identity.oidc.backchannel-urls.test.ts::C-2f15db84 Without a back-channel nothing changes (passed, red_assertion) | - | 0.86 |
| C-73bdb95b | identity-authn › The provider client is cached, bounded and confined to the issuer › Token and JWKS endpoints follow the back-channel rule | covered | src.identity.oidc.backchannel-exchange.test.ts::C-73bdb95b Token and JWKS endpoints follow the back-channel rule (passed, red_assertion) | - | 0.91 |
| C-48dfbba1 | identity-authn › A back-channel origin splits the engine's calls from the browser's › Keys and the code exchange use the back-channel origin and iss stays the issuer | covered | src.identity.oidc.backchannel-exchange.test.ts::C-48dfbba1 Keys and the code exchange use the back-channel origin and iss stays the issuer (passed, red_assertion) | - | 0.95 |
| C-d3271182 | identity-authn › A back-channel origin splits the engine's calls from the browser's › The sign-in redirect stays on the issuer origin | covered | src.identity.oidc.backchannel-discovery.test.ts::C-d3271182 The sign-in redirect stays on the issuer origin (passed, red_assertion) | - | 0.89 |
| C-ad6ca6fb | identity-authn › Two functions derive the back-channel URLs › discoveryUrl and serverSideUrl follow the rule | covered | src.identity.oidc.backchannel-urls.test.ts::C-ad6ca6fb discoveryUrl and serverSideUrl follow the rule (passed, red_assertion) | - | 0.93 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-oidc-backchannel/.l4/ledger/r-20261128T0158Z-09bf.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-oidc-backchannel/.l4/ledger/r-20261128T0419Z-2a41.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-oidc-backchannel/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/config/oidc-backchannel.test.ts` |  | relevant | new test file |
| `src/config/oidc.ts` | config | relevant | named in the spec |
| `src/identity/index.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/backchannel-discovery.test.ts` |  | relevant | new test file |
| `src/identity/oidc/backchannel-exchange.test.ts` |  | relevant | new test file |
| `src/identity/oidc/backchannel-urls.test.ts` |  | relevant | new test file |
| `src/identity/oidc/client.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/config-shape.ts` | identity | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/config/oidc.ts, src/identity/index.ts, src/identity/oidc/client.ts, src/identity/oidc/config-shape.ts

### Tests

3387 of 3387 passed, 0 failed, 0 errored, 0 skipped.
12 of 12 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-449f1e02 | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-111fb00c | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9c6f374f | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78a80972 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3e029f2d | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-07ab704f | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-41a07522 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ad533226 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4bf7d6e6 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5a0077b2 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b6e51fd5 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8448dfd1 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2f15db84 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-73bdb95b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-48dfbba1 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d3271182 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ad6ca6fb | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-449f1e02 | identity-authn › OIDC is optional and configured by three variables › No issuer | pass | pass | the judge passed it and a discriminating test passes |
| C-111fb00c | identity-authn › OIDC is optional and configured by three variables › Valid settings | pass | pass | the judge passed it and a discriminating test passes |
| C-9c6f374f | identity-authn › OIDC is optional and configured by three variables › Bad settings | pass | pass | the judge passed it and a discriminating test passes |
| C-78a80972 | identity-authn › OIDC is optional and configured by three variables › Missing prerequisites | pass | pass | the judge passed it and a discriminating test passes |
| C-3e029f2d | identity-authn › OIDC is optional and configured by three variables › A half-wired engine is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-07ab704f | identity-authn › OIDC is optional and configured by three variables › A back-channel origin is read as an origin | pass | pass | the judge passed it and a discriminating test passes |
| C-41a07522 | identity-authn › OIDC is optional and configured by three variables › A bad or stray back-channel value is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-ad533226 | identity-authn › The provider client is cached, bounded and confined to the issuer › Cached and refetched once | pass | pass | the judge passed it and a discriminating test passes |
| C-4bf7d6e6 | identity-authn › The provider client is cached, bounded and confined to the issuer › Hostile answers | pass | pass | the judge passed it and a discriminating test passes |
| C-5a0077b2 | identity-authn › The provider client is cached, bounded and confined to the issuer › Code exchange | pass | pass | the judge passed it and a discriminating test passes |
| C-b6e51fd5 | identity-authn › The provider client is cached, bounded and confined to the issuer › Discovery is requested at the back-channel origin | pass | pass | the judge passed it and a discriminating test passes |
| C-8448dfd1 | identity-authn › The provider client is cached, bounded and confined to the issuer › A discovery failure is not retried on the issuer origin | pass | pass | the judge passed it and a discriminating test passes |
| C-2f15db84 | identity-authn › The provider client is cached, bounded and confined to the issuer › Without a back-channel nothing changes | pass | pass | the judge passed it and a discriminating test passes |
| C-73bdb95b | identity-authn › The provider client is cached, bounded and confined to the issuer › Token and JWKS endpoints follow the back-channel rule | pass | pass | the judge passed it and a discriminating test passes |
| C-48dfbba1 | identity-authn › A back-channel origin splits the engine's calls from the browser's › Keys and the code exchange use the back-channel origin and iss stays the issuer | pass | pass | the judge passed it and a discriminating test passes |
| C-d3271182 | identity-authn › A back-channel origin splits the engine's calls from the browser's › The sign-in redirect stays on the issuer origin | pass | pass | the judge passed it and a discriminating test passes |
| C-ad6ca6fb | identity-authn › Two functions derive the back-channel URLs › discoveryUrl and serverSideUrl follow the rule | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.config.oidc-backchannel.test.ts::C-07ab704f an absent or empty value leaves no member and an empty one alone leaves oidc absent` (task 1.1): passed
- `src.config.oidc-backchannel.test.ts::C-07ab704f an origin value is stored as its origin` (task 1.1): passed
- `src.config.oidc-backchannel.test.ts::C-41a07522 a bad back-channel value beside a valid issuer is refused` (task 1.1): passed
- `src.config.oidc-backchannel.test.ts::C-41a07522 a bad issuer is reported before a bad back-channel and the back-channel before the secret file` (task 1.1): passed
- `src.config.oidc-backchannel.test.ts::C-41a07522 without an issuer the back-channel is stray, after a stray client id and secret file` (task 1.1): passed
- `src.identity.oidc.backchannel-discovery.test.ts::C-8448dfd1 A discovery failure is not retried on the issuer origin` (task 3.1): passed
- `src.identity.oidc.backchannel-discovery.test.ts::C-b6e51fd5 Discovery is requested at the back-channel origin` (task 3.1): passed
- `src.identity.oidc.backchannel-discovery.test.ts::C-d3271182 The sign-in redirect stays on the issuer origin` (task 3.1): passed
- `src.identity.oidc.backchannel-exchange.test.ts::C-48dfbba1 Keys and the code exchange use the back-channel origin and iss stays the issuer` (task 4.1): passed
- `src.identity.oidc.backchannel-exchange.test.ts::C-73bdb95b Token and JWKS endpoints follow the back-channel rule` (task 4.1): passed
- `src.identity.oidc.backchannel-urls.test.ts::C-2f15db84 Without a back-channel nothing changes` (task 2.1): passed
- `src.identity.oidc.backchannel-urls.test.ts::C-ad6ca6fb discoveryUrl and serverSideUrl follow the rule` (task 2.1): passed

## Guard events

- guard.violation: src/identity/index.ts
- guard.violation: src/identity/oidc/client.ts
- guard.violation: src/identity/oidc/client.ts
