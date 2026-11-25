# Verification: openspec:add-oidc-login-followup-1: PASS (round 1)

traceability: 34/34 criteria covered by a discriminating test

- Base: `eefc582758dc820b20384b3ea8aaa1b509db1476`
- Head: `cf12a12c4d003f4ecadfd753e0e69df065bc0484`
- Implementer profiles: claude-sonnet
- Judge: nemotron-judge, 1 call(s), prompt sha256 `70c972412e773a9ad70bb1ed8704a9fdcf84600c6469490aa283167de483ba85`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@eefc582758 contained |
| 1 | integrity | ok | 286.4 | 11 sub-checks; scope: 14 changed file(s) |
| 2 | build | ok | 34.1 |  |
| 3 | tests | ok | 452.9 |  |
| 4 | traceability | ok | 0.3 | 34/34 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/server.ts, src/identity/oidc/callback.ts, src/identity/oidc/login.ts, src/identity/oidc/logout.ts, src/identity/oidc/routes.ts |
| 8 | s1 judge | ok | 2.1 | 33/34 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 262.6 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261125T0022Z-3a8b/023-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261125T0022Z-3a8b/024-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261125T0022Z-3a8b/025-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261125T0022Z-3a8b/026-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261125T0022Z-3a8b/027-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261125T0022Z-3a8b/028-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261125T0022Z-3a8b/029-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 1 task(s): red and green compared |
| test path freeze | ok | 1 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/server.ts, src/identity/oidc/callback.ts, src/identity/oidc/login.ts, src/identity/oidc/logout.ts, src/identity/oidc/routes.ts (+1 more) |
| tdd history | ok | 1 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 3008 of 3008 base tests pass on the unit's code with its 1 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-e6c11022 | identity-authn › OIDC handlers send a reply and resolve undefined, so Fastify sends twice and logs a 500 — feedback FB-001 › OIDC handlers send a reply and resolve undefined, so Fastify sends twice and logs a 500 | covered | src.identity.oidc.single-send.test.ts::C-e6c11022 login redirect sends once and logs the status sent (passed, red_assertion); src.identity.oidc.single-send.test.ts::C-e6c11022 not-configured routes send once and log the status sent (passed, red_assertion) | - | 0.86 |
| C-449f1e02 | identity-authn › OIDC is optional and configured by three variables › No issuer | covered | src.config.oidc.test.ts::C-449f1e02 loadConfig leaves oidc absent without OIDC variables and reads it when all three are set (passed, pass_to_pass); src.identity.oidc.login.test.ts::C-449f1e02 No issuer (passed, pass_to_pass) | - | 0.74 |
| C-111fb00c | identity-authn › OIDC is optional and configured by three variables › Valid settings | covered | src.config.oidc.test.ts::C-111fb00c loadConfig accepts an https issuer and every private http host (passed, pass_to_pass); src.config.oidc.test.ts::C-111fb00c loadConfig reads a custom client id and strips only the secret file trailing newline (passed, pass_to_pass) | - | 0.81 |
| C-9c6f374f | identity-authn › OIDC is optional and configured by three variables › Bad settings | covered | src.config.oidc.test.ts::C-9c6f374f loadConfig refuses every public http credentialed or malformed issuer with its reason (passed, pass_to_pass) | - | 0.92 |
| C-78a80972 | identity-authn › OIDC is optional and configured by three variables › Missing prerequisites | covered | src.config.oidc.test.ts::C-78a80972 loadConfig refuses a bad client id and an issuer without the engine key or database URL (passed, pass_to_pass); src.config.oidc.test.ts::C-78a80972 loadConfig refuses stray OIDC variables and a direct client secret without an issuer (passed, pass_to_pass); src.con... | - | 0.93 |
| C-3e029f2d | identity-authn › OIDC is optional and configured by three variables › A half-wired engine is refused | covered | src.identity.oidc.login.test.ts::C-3e029f2d A half-wired engine is refused (passed, pass_to_pass); src.main.oidc.test.ts::C-3e029f2d main refuses a half wired engine with one fatal line and exit one (passed, pass_to_pass) | - | 0.93 |
| C-63967930 | identity-authn › Login starts an authorization-code flow with PKCE › Authorization request | covered | src.identity.oidc.login.test.ts::C-63967930 Authorization request (passed, pass_to_pass) | - | 0.90 |
| C-7320db36 | identity-authn › Login starts an authorization-code flow with PKCE › Only a relative return_to survives | covered | src.identity.oidc.return-to.test.ts::C-7320db36 Only a relative return_to survives (passed, pass_to_pass) | - | 0.91 |
| C-6207c094 | identity-authn › Login starts an authorization-code flow with PKCE › Provider down at login | covered | src.identity.oidc.login.test.ts::C-6207c094 Provider down at login (passed, pass_to_pass) | - | 0.88 |
| C-ad533226 | identity-authn › The provider client is cached, bounded and confined to the issuer › Cached and refetched once | covered | src.identity.oidc.client.test.ts::C-ad533226 Cached and refetched once (passed, pass_to_pass) | - | 0.90 |
| C-4bf7d6e6 | identity-authn › The provider client is cached, bounded and confined to the issuer › Hostile answers | covered | src.identity.oidc.client.test.ts::C-4bf7d6e6 Hostile answers (passed, pass_to_pass) | - | 0.91 |
| C-5a0077b2 | identity-authn › The provider client is cached, bounded and confined to the issuer › Code exchange | covered | src.identity.oidc.client.test.ts::C-5a0077b2 Code exchange (passed, pass_to_pass) | - | 0.91 |
| C-37de8752 | identity-authn › The ID token is verified before it is trusted › A valid token | covered | src.identity.oidc.id-token.test.ts::C-37de8752 A valid token (passed, pass_to_pass) | - | 0.79 |
| C-d9b14373 | identity-authn › The ID token is verified before it is trusted › Each flaw is refused | covered | src.identity.oidc.id-token.test.ts::C-d9b14373 Each flaw is refused (passed, pass_to_pass) | - | 0.81 |
| C-4d629d41 | identity-authn › The ID token is verified before it is trusted › Claim edges | covered | src.identity.oidc.id-token.test.ts::C-4d629d41 Claim edges (passed, pass_to_pass) | - | 0.89 |
| C-6370f2de | identity-authn › The callback signs the user in and starts a session › Sign in | covered | src.identity.oidc.callback.test.ts::C-6370f2de Sign in (passed, pass_to_pass); src.main.oidc.test.ts::C-6370f2de main signs alice in over real HTTP and stays healthy (passed, pass_to_pass) | - | 0.79 |
| C-fb2efece | identity-authn › The callback signs the user in and starts a session › Repeat sign-in, https | covered | src.identity.oidc.callback.test.ts::C-fb2efece Repeat sign-in, https (passed, pass_to_pass) | - | 0.83 |
| C-14c6114a | identity-authn › The callback signs the user in and starts a session › Session fixation | covered | src.identity.oidc.callback.test.ts::C-14c6114a Session fixation (passed, pass_to_pass) | - | 0.83 |
| C-5f76283c | identity-authn › The callback signs the user in and starts a session › Replayed code | covered | src.identity.oidc.refusals.test.ts::C-5f76283c C-9c4e9faf Replayed callback code is refused and logs a reason (passed, pass_to_pass) | - | 0.76 |
| C-9d33c4ce | identity-authn › A refusal is a redirect with a stable code, audited once the tenant is known › Causes and codes | covered | src.identity.oidc.refusals.test.ts::C-9d33c4ce Refuses a disabled user, a padded subject and a failing first connect (passed, pass_to_pass); src.identity.oidc.refusals.test.ts::C-9d33c4ce Refuses a missing, altered or expired login cookie with OIDC_LOGIN_EXPIRED (passed, pass_to_pass); src.identity.... | - | - |
| C-bab5127d | identity-authn › A refusal is a redirect with a stable code, audited once the tenant is known › Audited when the tenant is known | covered | src.identity.oidc.refusals.test.ts::C-bab5127d Audits refusals once the tenant is known (passed, pass_to_pass); src.identity.oidc.refusals.test.ts::C-bab5127d Keeps the refusal redirect when the failure is not about the tenant (passed, pass_to_pass) | - | 0.92 |
| C-9c4e9faf | identity-authn › A refusal is a redirect with a stable code, audited once the tenant is known › No values in logs, a failing audit | covered | src.identity.oidc.refusals.test.ts::C-5f76283c C-9c4e9faf Replayed callback code is refused and logs a reason (passed, pass_to_pass); src.identity.oidc.refusals.test.ts::C-9c4e9faf A failing refusal audit logs one error line and appends no event (passed, pass_to_pass); src.identity.oidc.refusals.tes... | - | 0.94 |
| C-8fe6b6fa | identity-authn › The session table is tenant-leading and narrowly granted › Objects, catalog and privileges | covered | src.identity.oidc.schema.test.ts::C-8fe6b6fa Session destructive writes are refused (passed, pass_to_pass); src.identity.oidc.schema.test.ts::C-8fe6b6fa Session select sees only the current tenant (passed, pass_to_pass); src.identity.oidc.schema.test.ts::C-8fe6b6fa Session table ledger and catalog (... | - | 0.91 |
| C-b4562a26 | identity-authn › Sessions are server-side, hashed and found through a route › Create and resolve | covered | src.identity.oidc.sessions.test.ts::C-b4562a26 C-a4347c4a Create and resolve (passed, pass_to_pass) | - | 0.90 |
| C-a4347c4a | identity-authn › Sessions are server-side, hashed and found through a route › Nothing to look up | covered | src.identity.oidc.sessions.test.ts::C-a4347c4a Nothing to look up (passed, pass_to_pass); src.identity.oidc.sessions.test.ts::C-b4562a26 C-a4347c4a Create and resolve (passed, pass_to_pass) | - | 0.91 |
| C-95bce1e1 | identity-authn › Sessions are server-side, hashed and found through a route › Idle, absolute, revoked, disabled | covered | src.identity.oidc.sessions.test.ts::C-95bce1e1 Absolute expiry after long use (passed, pass_to_pass); src.identity.oidc.sessions.test.ts::C-95bce1e1 Disabled user loses the session until re-enabled (passed, pass_to_pass); src.identity.oidc.sessions.test.ts::C-95bce1e1 Idle timeout revokes and remove... | - | 0.92 |
| C-70cd8356 | identity-authn › Sessions are server-side, hashed and found through a route › last_seen_at slides at most once a minute | covered | src.identity.oidc.sessions.test.ts::C-70cd8356 last_seen_at slides at most once a minute (passed, pass_to_pass) | - | 0.91 |
| C-3df7fca5 | identity-authn › Sessions are server-side, hashed and found through a route › Reaping and tenants | covered | src.identity.oidc.sessions.test.ts::C-3df7fca5 Reaping revokes twenty and keeps the new session (passed, pass_to_pass); src.identity.oidc.sessions.test.ts::C-3df7fca5 Session routes keep tenants apart (passed, pass_to_pass); src.identity.oidc.sessions.test.ts::C-3df7fca5 createSession refuses anothe... | - | 0.94 |
| C-00d9c51c | identity-authn › A CSRF token is issued, stored hashed and checked › Issue and verify | covered | src.identity.oidc.csrf.test.ts::C-00d9c51c Issue and verify CSRF tokens (passed, pass_to_pass) | - | 0.93 |
| C-3b93c8c2 | identity-authn › Logout revokes the session and needs the CSRF token › Logout | covered | src.identity.oidc.logout.test.ts::C-3b93c8c2 Logout revokes the session and returns the provider end-session URL (passed, pass_to_pass) | - | 0.93 |
| C-92e85da7 | identity-authn › Logout revokes the session and needs the CSRF token › Logout CSRF and no session | covered | src.identity.oidc.logout.test.ts::C-92e85da7 Logout without a valid CSRF token or session is refused (passed, pass_to_pass) | - | 0.82 |
| C-33a7a137 | identity-authn › Logout revokes the session and needs the CSRF token › Provider down at logout | covered | src.identity.oidc.logout.test.ts::C-33a7a137 A provider-down logout still revokes the session (passed, pass_to_pass) | - | 0.92 |
| C-f8d77e43 | identity-authn › The e2e stack part signs the default tenant's organization in › Start, seed and close | covered | test.support.e2e-stack.oidc-part.test.ts::C-f8d77e43 the oidc part starts seeds the default tenant and closes (passed, pass_to_pass) | - | 0.88 |
| C-40f6caea | identity-authn › The e2e stack part signs the default tenant's organization in › Discovered after the database part | covered | test.support.e2e-stack.oidc-part.test.ts::C-40f6caea discovery runs the oidc part after the database part (passed, pass_to_pass) | - | 0.80 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/server.ts, src/identity/oidc/callback.ts, src/identity/oidc/login.ts, src/identity/oidc/logout.ts, src/identity/oidc/routes.ts

### Tests

3135 of 3135 passed, 0 failed, 0 errored, 0 skipped.
2 of 2 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-e6c11022 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-449f1e02 | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-111fb00c | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9c6f374f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78a80972 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3e029f2d | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-63967930 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7320db36 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6207c094 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ad533226 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4bf7d6e6 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5a0077b2 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-37de8752 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d9b14373 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4d629d41 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6370f2de | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fb2efece | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-14c6114a | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5f76283c | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9d33c4ce | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-bab5127d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9c4e9faf | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8fe6b6fa | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b4562a26 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a4347c4a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-95bce1e1 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-70cd8356 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3df7fca5 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-00d9c51c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3b93c8c2 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-92e85da7 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-33a7a137 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f8d77e43 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-40f6caea | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-e6c11022 | identity-authn › OIDC handlers send a reply and resolve undefined, so Fastify sends twice and logs a 500 — feedback FB-001 › OIDC handlers send a reply and resolve undefined, so Fastify sends twice and logs a 500 | pass | pass | the judge passed it and a discriminating test passes |
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

- [minor, judge] Single-send tests do not directly cover callback and logout routes (criterion C-e6c11022): The criterion requires login, callback, logout and not-configured routes to all send exactly one response on the real hook stack, but src/identity/oidc/single-send.test.ts only tests the not-configured route (503) and login redirect (302). Callback (200/302) and logout (200/401/403) single-send behavior is not directly tested; the implementer notes they need DB session and CSRF setup. The code fix is applied uniformly to all handlers, so the behavior is covered by code, but not by test evidence for callback/logout.

## Feedback

- FB-001: addressed at cf12a12c4d: src/identity/oidc/login.ts returns reply after send; src/identity/oidc/callback.ts returns reply after send; src/identity/oidc/logout.ts returns reply after send; src/identity/oidc/routes.ts returns reply after send; src/api/server.ts error handler returns reply when reply.sent; src/identity/oidc...

## New tests (red then green, `task.red_ok` in the ledger)

- `src.identity.oidc.single-send.test.ts::C-e6c11022 login redirect sends once and logs the status sent` (task 1.1): passed
- `src.identity.oidc.single-send.test.ts::C-e6c11022 not-configured routes send once and log the status sent` (task 1.1): passed
