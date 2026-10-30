# Verification: openspec:add-oidc-login: PASS (round 1)

traceability: 33/33 criteria covered by a discriminating test

- Base: `7d42351e900dd490ae80a57dfccb1d7ecef1e710`
- Head: `94b56c44bc3ff61e8ca841d087a6c45c62405dee`
- Implementer profiles: deepseek-free, glm
- Judge: claude-judge (claude-opus-5-5), 3 call(s), judged in 3 parts, prompt sha256 `7436af37cdb47cac7952cee42345148c0c8c13cdf804a6ed1b3dc876dbf5018f`
  - part 1: 19 file(s), 117604 characters, profile claude-judge, reply valid
  - part 2: 15 file(s), 104697 characters, profile claude-judge, reply valid
  - part 3: 1 file(s), 29317 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 3, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek-free deepseek (declared), glm zhipu (declared)
- Cost: $3.5874

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base merged: main@7d42351e90 as 94b56c44bc (2 commits) |
| 1 | integrity | ok | 45.8 | 10 sub-checks (+4 unfrozen by human answers); scope: 42 changed file(s) |
| 2 | build | ok | 16.1 |  |
| 3 | tests | ok | 54.8 |  |
| 4 | traceability | ok | 0.1 | 33/33 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/config/config.ts, src/config/index.ts, src/config/oidc.ts, src/identity/oidc/callback.ts, src/identity/oidc/client.ts and 14 more |
| 8 | s1 judge | ok | 2.4 | 32/33 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 285.6 | 3 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261029T0635Z-75e3/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261029T0635Z-75e3/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261029T0635Z-75e3/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261029T0635Z-75e3/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261029T0635Z-75e3/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261029T0635Z-75e3/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261029T0635Z-75e3/020-e2e.log |

## Files by part

- part 1: src/db/migrations/0120_sessions.sql (1524 characters)
- part 1: test/support/e2e-stack/parts/25-oidc.ts (266 characters)
- part 1: src/identity/oidc/callback.test.ts (17236 characters)
- part 1: src/identity/oidc/callback.ts (7819 characters)
- part 1: src/identity/oidc/client.test.ts (11561 characters)
- part 1: src/identity/oidc/client.ts (9253 characters)
- part 1: src/config/config.ts (1469 characters)
- part 1: src/identity/oidc/cookies.test.ts (4202 characters)
- part 1: src/identity/oidc/cookies.ts (2156 characters)
- part 1: src/identity/oidc/csrf.test.ts (6446 characters)
- part 1: src/identity/oidc/errors.ts (823 characters)
- part 1: src/identity/oidc/id-token.test.ts (7633 characters)
- part 1: src/identity/oidc/id-token.ts (5050 characters)
- part 1: src/config/index.ts (511 characters)
- part 1: src/identity/oidc/login.test.ts (10450 characters)
- part 1: src/identity/oidc/login.ts (3987 characters)
- part 1: src/identity/oidc/logout.test.ts (13987 characters)
- part 1: src/identity/oidc/logout.ts (3751 characters)
- part 1: src/main.oidc.test.ts (9480 characters)
- part 2: src/main.ts (1530 characters)
- part 2: src/config/oidc.test.ts (6901 characters)
- part 2: src/config/oidc.ts (4498 characters)
- part 2: test/support/oidc-login.ts (1661 characters)
- part 2: test/support/e2e-stack/oidc-part.test.ts (9487 characters)
- part 2: test/support/e2e-stack/oidc-part.ts (4192 characters)
- part 2: src/identity/oidc/principal.ts (844 characters)
- part 2: src/identity/oidc/refusals.test.ts (34541 characters)
- part 2: src/identity/oidc/return-to.test.ts (934 characters)
- part 2: src/identity/oidc/return-to.ts (1228 characters)
- part 2: src/identity/oidc/routes.ts (2843 characters)
- part 2: src/identity/oidc/schema.test.ts (4775 characters)
- part 2: src/identity/oidc/seal.ts (2911 characters)
- part 2: src/identity/oidc/sessions.test.ts (18613 characters)
- part 2: src/identity/oidc/sessions.ts (9739 characters)
- part 3: openspec/changes/add-oidc-login/tasks.md (29317 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 12 task(s): red and green compared (+4 unfrozen by a delegate or an agent) |
| test path freeze | ok | 12 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/config/config.ts, src/config/index.ts, src/config/oidc.test.ts, src/config/oidc.ts, src/identity/oidc/callback.test.ts (+28 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 706 of 706 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/identity/oidc/client.test.ts kept at head for the run (task 4.1: unfrozen by Q-001)
- src/identity/oidc/login.test.ts kept at head for the run (task 6.1: unfrozen by Q-002)
- src/main.oidc.test.ts kept at head for the run (task 7.1: unfrozen by Q-004)
- test/support/e2e-stack/oidc-part.test.ts kept at head for the run (task 7.2: unfrozen by Q-005)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/identity/oidc/client.test.ts (task 4.1, unfrozen by Q-001 (agent))
- src/identity/oidc/login.test.ts (task 6.1, unfrozen by Q-002 (delegate_override, claude-fable-5-1))
- src/main.oidc.test.ts (task 7.1, unfrozen by Q-004 (delegate_override, claude-fable-5-1))
- test/support/e2e-stack/oidc-part.test.ts (task 7.2, unfrozen by Q-005 (agent))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-449f1e02 | identity-authn › OIDC is optional and configured by three variables › No issuer | covered | src.config.oidc.test.ts::C-449f1e02 loadConfig leaves oidc absent without OIDC variables and reads it when all three are set (passed, red_assertion); src.identity.oidc.login.test.ts::C-449f1e02 No issuer (passed, red_assertion) | - | 0.67 |
| C-111fb00c | identity-authn › OIDC is optional and configured by three variables › Valid settings | covered | src.config.oidc.test.ts::C-111fb00c loadConfig accepts an https issuer and every private http host (passed, red_assertion); src.config.oidc.test.ts::C-111fb00c loadConfig reads a custom client id and strips only the secret file trailing newline (passed, red_assertion) | - | 0.92 |
| C-9c6f374f | identity-authn › OIDC is optional and configured by three variables › Bad settings | covered | src.config.oidc.test.ts::C-9c6f374f loadConfig refuses every public http credentialed or malformed issuer with its reason (passed, red_assertion) | - | 0.93 |
| C-78a80972 | identity-authn › OIDC is optional and configured by three variables › Missing prerequisites | covered | src.config.oidc.test.ts::C-78a80972 loadConfig refuses a bad client id and an issuer without the engine key or database URL (passed, red_assertion); src.config.oidc.test.ts::C-78a80972 loadConfig refuses stray OIDC variables and a direct client secret without an issuer (passed, red_assertion); src.c... | - | 0.92 |
| C-3e029f2d | identity-authn › OIDC is optional and configured by three variables › A half-wired engine is refused | covered | src.identity.oidc.login.test.ts::C-3e029f2d A half-wired engine is refused (passed, red_assertion); src.main.oidc.test.ts::C-3e029f2d main refuses a half wired engine with one fatal line and exit one (passed, red_assertion) | - | 0.94 |
| C-63967930 | identity-authn › Login starts an authorization-code flow with PKCE › Authorization request | covered | src.identity.oidc.login.test.ts::C-63967930 Authorization request (passed, red_assertion) | - | 0.89 |
| C-7320db36 | identity-authn › Login starts an authorization-code flow with PKCE › Only a relative return_to survives | covered | src.identity.oidc.return-to.test.ts::C-7320db36 Only a relative return_to survives (passed, red_assertion) | - | 0.92 |
| C-6207c094 | identity-authn › Login starts an authorization-code flow with PKCE › Provider down at login | covered | src.identity.oidc.login.test.ts::C-6207c094 Provider down at login (passed, red_assertion) | - | 0.88 |
| C-ad533226 | identity-authn › The provider client is cached, bounded and confined to the issuer › Cached and refetched once | covered | src.identity.oidc.client.test.ts::C-ad533226 Cached and refetched once (passed, red_assertion) | - | 0.90 |
| C-4bf7d6e6 | identity-authn › The provider client is cached, bounded and confined to the issuer › Hostile answers | covered | src.identity.oidc.client.test.ts::C-4bf7d6e6 Hostile answers (passed, red_assertion) | - | 0.91 |
| C-5a0077b2 | identity-authn › The provider client is cached, bounded and confined to the issuer › Code exchange | covered | src.identity.oidc.client.test.ts::C-5a0077b2 Code exchange (passed, red_assertion) | - | 0.91 |
| C-37de8752 | identity-authn › The ID token is verified before it is trusted › A valid token | covered | src.identity.oidc.id-token.test.ts::C-37de8752 A valid token (passed, red_assertion) | - | 0.86 |
| C-d9b14373 | identity-authn › The ID token is verified before it is trusted › Each flaw is refused | covered | src.identity.oidc.id-token.test.ts::C-d9b14373 Each flaw is refused (passed, red_assertion) | - | 0.87 |
| C-4d629d41 | identity-authn › The ID token is verified before it is trusted › Claim edges | covered | src.identity.oidc.id-token.test.ts::C-4d629d41 Claim edges (passed, red_assertion) | - | 0.89 |
| C-6370f2de | identity-authn › The callback signs the user in and starts a session › Sign in | covered | src.identity.oidc.callback.test.ts::C-6370f2de Sign in (passed, red_assertion); src.main.oidc.test.ts::C-6370f2de main signs alice in over real HTTP and stays healthy (passed, red_assertion, inadequate) | - | 0.77 |
| C-fb2efece | identity-authn › The callback signs the user in and starts a session › Repeat sign-in, https | covered | src.identity.oidc.callback.test.ts::C-fb2efece Repeat sign-in, https (passed, red_assertion) | - | 0.89 |
| C-14c6114a | identity-authn › The callback signs the user in and starts a session › Session fixation | covered | src.identity.oidc.callback.test.ts::C-14c6114a Session fixation (passed, red_assertion) | - | 0.86 |
| C-5f76283c | identity-authn › The callback signs the user in and starts a session › Replayed code | covered | src.identity.oidc.refusals.test.ts::C-5f76283c C-9c4e9faf Replayed callback code is refused and logs a reason (passed, pre_satisfied) | - | 0.70 |
| C-9d33c4ce | identity-authn › A refusal is a redirect with a stable code, audited once the tenant is known › Causes and codes | covered | src.identity.oidc.refusals.test.ts::C-9d33c4ce Refuses a disabled user, a padded subject and a failing first connect (passed, red_assertion); src.identity.oidc.refusals.test.ts::C-9d33c4ce Refuses a missing, altered or expired login cookie with OIDC_LOGIN_EXPIRED (passed, red_assertion); src.identit... | - | - |
| C-bab5127d | identity-authn › A refusal is a redirect with a stable code, audited once the tenant is known › Audited when the tenant is known | covered | src.identity.oidc.refusals.test.ts::C-bab5127d Audits refusals once the tenant is known (passed, red_assertion); src.identity.oidc.refusals.test.ts::C-bab5127d Keeps the refusal redirect when the failure is not about the tenant (passed, red_assertion) | - | 0.92 |
| C-9c4e9faf | identity-authn › A refusal is a redirect with a stable code, audited once the tenant is known › No values in logs, a failing audit | covered | src.identity.oidc.refusals.test.ts::C-5f76283c C-9c4e9faf Replayed callback code is refused and logs a reason (passed, red_assertion); src.identity.oidc.refusals.test.ts::C-9c4e9faf A failing refusal audit logs one error line and appends no event (passed, red_assertion); src.identity.oidc.refusals.t... | - | 0.94 |
| C-8fe6b6fa | identity-authn › The session table is tenant-leading and narrowly granted › Objects, catalog and privileges | covered | src.identity.oidc.schema.test.ts::C-8fe6b6fa Session destructive writes are refused (passed, red_assertion); src.identity.oidc.schema.test.ts::C-8fe6b6fa Session select sees only the current tenant (passed, red_assertion); src.identity.oidc.schema.test.ts::C-8fe6b6fa Session table ledger and catalog... | - | 0.91 |
| C-b4562a26 | identity-authn › Sessions are server-side, hashed and found through a route › Create and resolve | covered | src.identity.oidc.sessions.test.ts::C-b4562a26 C-a4347c4a Create and resolve (passed, red_assertion) | - | 0.91 |
| C-a4347c4a | identity-authn › Sessions are server-side, hashed and found through a route › Nothing to look up | covered | src.identity.oidc.sessions.test.ts::C-a4347c4a Nothing to look up (passed, red_assertion); src.identity.oidc.sessions.test.ts::C-b4562a26 C-a4347c4a Create and resolve (passed, red_assertion, inadequate) | - | 0.89 |
| C-95bce1e1 | identity-authn › Sessions are server-side, hashed and found through a route › Idle, absolute, revoked, disabled | covered | src.identity.oidc.sessions.test.ts::C-95bce1e1 Absolute expiry after long use (passed, red_assertion); src.identity.oidc.sessions.test.ts::C-95bce1e1 Disabled user loses the session until re-enabled (passed, red_assertion); src.identity.oidc.sessions.test.ts::C-95bce1e1 Idle timeout revokes and remo... | - | 0.92 |
| C-70cd8356 | identity-authn › Sessions are server-side, hashed and found through a route › last_seen_at slides at most once a minute | covered | src.identity.oidc.sessions.test.ts::C-70cd8356 last_seen_at slides at most once a minute (passed, red_assertion) | - | 0.91 |
| C-3df7fca5 | identity-authn › Sessions are server-side, hashed and found through a route › Reaping and tenants | covered | src.identity.oidc.sessions.test.ts::C-3df7fca5 Reaping revokes twenty and keeps the new session (passed, red_assertion); src.identity.oidc.sessions.test.ts::C-3df7fca5 Session routes keep tenants apart (passed, red_assertion); src.identity.oidc.sessions.test.ts::C-3df7fca5 createSession refuses anot... | - | 0.93 |
| C-00d9c51c | identity-authn › A CSRF token is issued, stored hashed and checked › Issue and verify | covered | src.identity.oidc.csrf.test.ts::C-00d9c51c Issue and verify CSRF tokens (passed, red_assertion) | - | 0.91 |
| C-3b93c8c2 | identity-authn › Logout revokes the session and needs the CSRF token › Logout | covered | src.identity.oidc.logout.test.ts::C-3b93c8c2 Logout revokes the session and returns the provider end-session URL (passed, red_assertion) | - | 0.93 |
| C-92e85da7 | identity-authn › Logout revokes the session and needs the CSRF token › Logout CSRF and no session | covered | src.identity.oidc.logout.test.ts::C-92e85da7 Logout without a valid CSRF token or session is refused (passed, red_assertion) | - | 0.76 |
| C-33a7a137 | identity-authn › Logout revokes the session and needs the CSRF token › Provider down at logout | covered | src.identity.oidc.logout.test.ts::C-33a7a137 A provider-down logout still revokes the session (passed, red_assertion) | - | 0.92 |
| C-f8d77e43 | identity-authn › The e2e stack part signs the default tenant's organization in › Start, seed and close | covered | test.support.e2e-stack.oidc-part.test.ts::C-f8d77e43 the oidc part starts seeds the default tenant and closes (passed, red_assertion) | - | 0.88 |
| C-40f6caea | identity-authn › The e2e stack part signs the default tenant's organization in › Discovered after the database part | covered | test.support.e2e-stack.oidc-part.test.ts::C-40f6caea discovery runs the oidc part after the database part (passed, red_assertion) | - | 0.85 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-oidc-login/.l4/ledger/r-20261028T2116Z-5ed1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-oidc-login/.l4/ledger/r-20261028T2156Z-19b4.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-oidc-login/.l4/ledger/r-20261028T2235Z-216c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-oidc-login/.l4/ledger/r-20261029T0559Z-a74f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-oidc-login/.l4/ledger/r-20261029T0605Z-ba64.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-oidc-login/.l4/ledger/r-20261029T0635Z-75e3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-oidc-login/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-oidc-login/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/config/config.ts` | config | relevant | named in the spec |
| `src/config/index.ts` | config | relevant | named in the spec |
| `src/config/oidc.test.ts` |  | relevant | new test file |
| `src/config/oidc.ts` | config | relevant | named in the spec |
| `src/db/migrations/0120_sessions.sql` | db | relevant | named in the spec |
| `src/identity/oidc/callback.test.ts` |  | relevant | new test file |
| `src/identity/oidc/callback.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/client.test.ts` |  | relevant | new test file |
| `src/identity/oidc/client.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/cookies.test.ts` |  | relevant | new test file |
| `src/identity/oidc/cookies.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/csrf.test.ts` |  | relevant | new test file |
| `src/identity/oidc/errors.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/id-token.test.ts` |  | relevant | new test file |
| `src/identity/oidc/id-token.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/login.test.ts` |  | relevant | new test file |
| `src/identity/oidc/login.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/logout.test.ts` |  | relevant | new test file |
| `src/identity/oidc/logout.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/principal.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/refusals.test.ts` |  | relevant | new test file |
| `src/identity/oidc/return-to.test.ts` |  | relevant | new test file |
| `src/identity/oidc/return-to.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/routes.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/schema.test.ts` |  | relevant | new test file |
| `src/identity/oidc/seal.ts` | identity | relevant | named in the spec |
| `src/identity/oidc/sessions.test.ts` |  | relevant | new test file |
| `src/identity/oidc/sessions.ts` | identity | relevant | named in the spec |
| `src/main.oidc.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `test/support/e2e-stack/oidc-part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/oidc-part.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/parts/25-oidc.ts` | test | relevant | named in the spec |
| `test/support/oidc-login.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/config/config.ts, src/config/index.ts, src/config/oidc.ts, src/identity/oidc/callback.ts, src/identity/oidc/client.ts and 14 more

### Tests

781 of 781 passed, 0 failed, 0 errored, 0 skipped.
60 of 60 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-449f1e02 | ok | 0.670 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-111fb00c | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9c6f374f | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78a80972 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3e029f2d | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-63967930 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7320db36 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6207c094 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ad533226 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4bf7d6e6 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5a0077b2 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-37de8752 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d9b14373 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4d629d41 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6370f2de | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fb2efece | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-14c6114a | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5f76283c | ok | 0.700 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9d33c4ce | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-bab5127d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9c4e9faf | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8fe6b6fa | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b4562a26 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a4347c4a | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-95bce1e1 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-70cd8356 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3df7fca5 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-00d9c51c | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3b93c8c2 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-92e85da7 | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-33a7a137 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f8d77e43 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-40f6caea | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-449f1e02 | identity-authn › OIDC is optional and configured by three variables › No issuer | pass | pass | the judge passed it and a discriminating test passes |
| C-111fb00c | identity-authn › OIDC is optional and configured by three variables › Valid settings | pass | pass | the judge passed it and a discriminating test passes |
| C-9c6f374f | identity-authn › OIDC is optional and configured by three variables › Bad settings | pass | pass | the judge passed it and a discriminating test passes |
| C-78a80972 | identity-authn › OIDC is optional and configured by three variables › Missing prerequisites | pass | pass | the judge passed it and a discriminating test passes |
| C-3e029f2d | identity-authn › OIDC is optional and configured by three variables › A half-wired engine is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-63967930 | identity-authn › Login starts an authorization-code flow with PKCE › Authorization request | pass | pass | the judge passed it and a discriminating test passes |
| C-7320db36 | identity-authn › Login starts an authorization-code flow with PKCE › Only a relative return_to survives | pass | pass | the judge passed it and a discriminating test passes |
| C-6207c094 | identity-authn › Login starts an authorization-code flow with PKCE › Provider down at login | pass | pass | the judge passed it and a discriminating test passes |
| C-ad533226 | identity-authn › The provider client is cached, bounded and confined to the issuer › Cached and refetched once | pass | pass | the judge passed it and a discriminating test passes |
| C-4bf7d6e6 | identity-authn › The provider client is cached, bounded and confined to the issuer › Hostile answers | pass | pass | the judge passed it and a discriminating test passes |
| C-5a0077b2 | identity-authn › The provider client is cached, bounded and confined to the issuer › Code exchange | pass | pass | the judge passed it and a discriminating test passes |
| C-37de8752 | identity-authn › The ID token is verified before it is trusted › A valid token | pass | pass | the judge passed it and a discriminating test passes |
| C-d9b14373 | identity-authn › The ID token is verified before it is trusted › Each flaw is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-4d629d41 | identity-authn › The ID token is verified before it is trusted › Claim edges | pass | pass | the judge passed it and a discriminating test passes |
| C-6370f2de | identity-authn › The callback signs the user in and starts a session › Sign in | pass | pass | the judge passed it and a discriminating test passes |
| C-fb2efece | identity-authn › The callback signs the user in and starts a session › Repeat sign-in, https | pass | pass | the judge passed it and a discriminating test passes |
| C-14c6114a | identity-authn › The callback signs the user in and starts a session › Session fixation | pass | pass | the judge passed it and a discriminating test passes |
| C-5f76283c | identity-authn › The callback signs the user in and starts a session › Replayed code | pass | pass | the judge passed it and a discriminating test passes |
| C-9d33c4ce | identity-authn › A refusal is a redirect with a stable code, audited once the tenant is known › Causes and codes | pass | pass | the judge passed it and a discriminating test passes |
| C-bab5127d | identity-authn › A refusal is a redirect with a stable code, audited once the tenant is known › Audited when the tenant is known | pass | pass | the judge passed it and a discriminating test passes |
| C-9c4e9faf | identity-authn › A refusal is a redirect with a stable code, audited once the tenant is known › No values in logs, a failing audit | pass | pass | the judge passed it and a discriminating test passes |
| C-8fe6b6fa | identity-authn › The session table is tenant-leading and narrowly granted › Objects, catalog and privileges | pass | pass | the judge passed it and a discriminating test passes |
| C-b4562a26 | identity-authn › Sessions are server-side, hashed and found through a route › Create and resolve | pass | pass | the judge passed it and a discriminating test passes |
| C-a4347c4a | identity-authn › Sessions are server-side, hashed and found through a route › Nothing to look up | pass | pass | the judge passed it and a discriminating test passes |
| C-95bce1e1 | identity-authn › Sessions are server-side, hashed and found through a route › Idle, absolute, revoked, disabled | pass | pass | the judge passed it and a discriminating test passes |
| C-70cd8356 | identity-authn › Sessions are server-side, hashed and found through a route › last_seen_at slides at most once a minute | pass | pass | the judge passed it and a discriminating test passes |
| C-3df7fca5 | identity-authn › Sessions are server-side, hashed and found through a route › Reaping and tenants | pass | pass | the judge passed it and a discriminating test passes |
| C-00d9c51c | identity-authn › A CSRF token is issued, stored hashed and checked › Issue and verify | pass | pass | the judge passed it and a discriminating test passes |
| C-3b93c8c2 | identity-authn › Logout revokes the session and needs the CSRF token › Logout | pass | pass | the judge passed it and a discriminating test passes |
| C-92e85da7 | identity-authn › Logout revokes the session and needs the CSRF token › Logout CSRF and no session | pass | pass | the judge passed it and a discriminating test passes |
| C-33a7a137 | identity-authn › Logout revokes the session and needs the CSRF token › Provider down at logout | pass | pass | the judge passed it and a discriminating test passes |
| C-f8d77e43 | identity-authn › The e2e stack part signs the default tenant's organization in › Start, seed and close | pass | pass | the judge passed it and a discriminating test passes |
| C-40f6caea | identity-authn › The e2e stack part signs the default tenant's organization in › Discovered after the database part | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] Callback with error parameter but no state (spec gap) (criterion C-9d33c4ce): The callback validates state before it looks at the error parameter. An authorization error response that has no state is therefore refused as OIDC_BAD_REQUEST, not OIDC_EXCHANGE_FAILED. No scenario pins this down.
- [minor, judge] State longer than 128 characters (spec gap) (criterion C-9d33c4ce): A state parameter of more than 128 characters is refused as OIDC_BAD_REQUEST, not OIDC_STATE_MISMATCH. No scenario covers this case.
- [minor, judge] Token endpoint 5xx maps to provider unavailable (spec gap) (criterion C-5a0077b2): exchangeCode maps a 4xx answer to OIDC_EXCHANGE_FAILED but a 5xx answer to OIDC_PROVIDER_UNAVAILABLE. The Code exchange scenario covers only 4xx refusals.
- [minor, judge] Missing exp or iat claim reasons (spec gap) (criterion C-4d629d41): A token without a numeric exp is refused with reason "expired", and one without a numeric iat with reason "iat". The Claim edges scenario covers only boundary values.
- [minor, judge] return_to is normalised, not returned as given (spec gap) (criterion C-7320db36): sanitizeReturnTo returns the WHATWG-normalised pathname, search and hash. Dot segments are resolved and non-ASCII characters are percent-encoded, so '/flows/../x' becomes '/x'. A raw-string implementation would differ on these inputs, and no scenario pins them down.
- [minor, judge] Idle timeout boundary is inclusive (spec gap) (criterion C-95bce1e1): resolveSession treats a session as idle when now >= last_seen_at + idle_timeout_s, and the reaper uses <=. At exactly 1800 s the session is refused. The design says 'past', and the spec scenarios test only 1799 s and 1801 s.
- [minor, judge] verifyCsrfToken does not check expiry, idle time or user state (spec gap) (criterion C-00d9c51c): verifyCsrfToken checks only revoked_at. A session past expires_at or idle, but not yet revoked, still verifies true, although the requirement says 'live session'. The logout route resolves the session first, so logout is not affected.
- [minor, judge] Issuer with an empty query marker or a trailing slash is accepted (spec gap) (criterion C-9c6f374f): 'https://idp.example/r?' has an empty search, so it passes and is kept as written. Discovery would then be fetched from 'https://idp.example/r?/.well-known/...'. A trailing slash likewise gives a '//' in the discovery path.
- [minor, judge] task 1.1: bad client id rejection is not checked against its reason text (criterion C-78a80972): Task 1.1 asks for each rejection to be checked with its reason text. The 'bad id' case asserts only name, code and variable.
- [minor, judge] the judge called a test inadequate (criterion C-6370f2de): src.main.oidc.test.ts::C-6370f2de main signs alice in over real HTTP and stays healthy
- [minor, judge] the judge called a test inadequate (criterion C-a4347c4a): src.identity.oidc.sessions.test.ts::C-b4562a26 C-a4347c4a Create and resolve

## New tests (red then green, `task.red_ok` in the ledger)

- `src.config.oidc.test.ts::C-111fb00c loadConfig accepts an https issuer and every private http host` (task 1.1): passed
- `src.config.oidc.test.ts::C-111fb00c loadConfig reads a custom client id and strips only the secret file trailing newline` (task 1.1): passed
- `src.config.oidc.test.ts::C-449f1e02 loadConfig leaves oidc absent without OIDC variables and reads it when all three are set` (task 1.1): passed
- `src.config.oidc.test.ts::C-78a80972 loadConfig refuses a bad client id and an issuer without the engine key or database URL` (task 1.1): passed
- `src.config.oidc.test.ts::C-78a80972 loadConfig refuses stray OIDC variables and a direct client secret without an issuer` (task 1.1): passed
- `src.config.oidc.test.ts::C-78a80972 loadConfig requires the OIDC secret file and refuses a missing or empty one` (task 1.1): passed
- `src.config.oidc.test.ts::C-9c6f374f loadConfig refuses every public http credentialed or malformed issuer with its reason` (task 1.1): passed
- `src.identity.oidc.callback.test.ts::C-14c6114a Session fixation` (task 6.2): passed
- `src.identity.oidc.callback.test.ts::C-6370f2de Sign in` (task 6.2): passed
- `src.identity.oidc.callback.test.ts::C-fb2efece Repeat sign-in, https` (task 6.2): passed
- `src.identity.oidc.client.test.ts::C-4bf7d6e6 Hostile answers` (task 4.1): passed
- `src.identity.oidc.client.test.ts::C-5a0077b2 Code exchange` (task 4.1): passed
- `src.identity.oidc.client.test.ts::C-ad533226 Cached and refetched once` (task 4.1): passed
- `src.identity.oidc.cookies.test.ts::OidcError carries a stable name code and details` (task 3.1): passed
- `src.identity.oidc.cookies.test.ts::parseCookies keeps the first value and does not decode` (task 3.1): passed
- `src.identity.oidc.cookies.test.ts::parseCookies leaves Object.prototype untouched` (task 3.1): passed
- `src.identity.oidc.cookies.test.ts::parseCookies rejects a header over 8192 characters` (task 3.1): passed
- `src.identity.oidc.cookies.test.ts::parseCookies skips a pair without an equals sign` (task 3.1): passed
- `src.identity.oidc.cookies.test.ts::serializeCookie refuses an invalid name value or path` (task 3.1): passed
- `src.identity.oidc.cookies.test.ts::serializeCookie writes a clearing cookie exactly` (task 3.1): passed
- `src.identity.oidc.cookies.test.ts::serializeCookie writes the login cookie exactly` (task 3.1): passed
- `src.identity.oidc.cookies.test.ts::serializeCookie writes the session cookie exactly` (task 3.1): passed
- `src.identity.oidc.csrf.test.ts::C-00d9c51c Issue and verify CSRF tokens` (task 6.4): passed
- `src.identity.oidc.id-token.test.ts::C-37de8752 A valid token` (task 4.2): passed
- `src.identity.oidc.id-token.test.ts::C-4d629d41 Claim edges` (task 4.2): passed
- `src.identity.oidc.id-token.test.ts::C-d9b14373 Each flaw is refused` (task 4.2): passed
- `src.identity.oidc.login.test.ts::C-3e029f2d A half-wired engine is refused` (task 6.1): passed
- `src.identity.oidc.login.test.ts::C-449f1e02 No issuer` (task 6.1): passed
- `src.identity.oidc.login.test.ts::C-6207c094 Provider down at login` (task 6.1): passed
- `src.identity.oidc.login.test.ts::C-63967930 Authorization request` (task 6.1): passed
- `src.identity.oidc.logout.test.ts::C-33a7a137 A provider-down logout still revokes the session` (task 6.4): passed
- `src.identity.oidc.logout.test.ts::C-3b93c8c2 Logout revokes the session and returns the provider end-session URL` (task 6.4): passed
- `src.identity.oidc.logout.test.ts::C-92e85da7 Logout without a valid CSRF token or session is refused` (task 6.4): passed
- `src.identity.oidc.refusals.test.ts::C-5f76283c C-9c4e9faf Replayed callback code is refused and logs a reason` (task 6.3): passed
- `src.identity.oidc.refusals.test.ts::C-9c4e9faf A failing refusal audit logs one error line and appends no event` (task 6.3): passed
- `src.identity.oidc.refusals.test.ts::C-9c4e9faf Refusal logs hold code and reason but no code, state, cookie, token or email` (task 6.3): passed
- `src.identity.oidc.refusals.test.ts::C-9d33c4ce Refuses a disabled user, a padded subject and a failing first connect` (task 6.3): passed
- `src.identity.oidc.refusals.test.ts::C-9d33c4ce Refuses a missing, altered or expired login cookie with OIDC_LOGIN_EXPIRED` (task 6.3): passed
- `src.identity.oidc.refusals.test.ts::C-9d33c4ce Refuses a wrong or missing state, a malformed authorization response and an unreachable provider` (task 6.3): passed
- `src.identity.oidc.refusals.test.ts::C-9d33c4ce Refuses hostile ID tokens with OIDC_TOKEN_INVALID and two organizations as OIDC_UNKNOWN_TENANT` (task 6.3): passed
- `src.identity.oidc.refusals.test.ts::C-bab5127d Audits refusals once the tenant is known` (task 6.3): passed
- `src.identity.oidc.refusals.test.ts::C-bab5127d Keeps the refusal redirect when the failure is not about the tenant` (task 6.3): passed
- `src.identity.oidc.return-to.test.ts::C-7320db36 Only a relative return_to survives` (task 3.1): passed
- `src.identity.oidc.schema.test.ts::C-8fe6b6fa Session destructive writes are refused` (task 2.1): passed
- `src.identity.oidc.schema.test.ts::C-8fe6b6fa Session select sees only the current tenant` (task 2.1): passed
- `src.identity.oidc.schema.test.ts::C-8fe6b6fa Session table ledger and catalog` (task 2.1): passed
- `src.identity.oidc.sessions.test.ts::C-3df7fca5 Reaping revokes twenty and keeps the new session` (task 5.1): passed
- `src.identity.oidc.sessions.test.ts::C-3df7fca5 Session routes keep tenants apart` (task 5.1): passed
- `src.identity.oidc.sessions.test.ts::C-3df7fca5 createSession refuses another tenant context` (task 5.1): passed
- `src.identity.oidc.sessions.test.ts::C-70cd8356 last_seen_at slides at most once a minute` (task 5.1): passed
