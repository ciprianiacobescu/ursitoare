# Verification: openspec:add-web-sign-in-followup-1: NEEDS_HUMAN (round 1)

traceability: 30/30 criteria covered by a discriminating test

- Base: `573790765e5cfba65969dee050afd165db21018b`
- Head: `2a8275e7b0003913d332e360a1cb3f529e92306c`
- Implementer profiles: deepseek-free
- Judge: nemotron-judge, 1 call(s), prompt sha256 `bb1581ff7074d24f6195b73fdf4b8e8877d58dc609ad939c3589d6402f62860b`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared)
- Cost: $0.9378

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base merged: main@573790765e as 2a8275e7b0 (4 commits) |
| 1 | integrity | ok | 297.5 | 11 sub-checks; scope: 11 changed file(s) |
| 2 | build | ok | 36.5 |  |
| 3 | tests | ok | 505.6 |  |
| 4 | traceability | ok | 0.3 | 30/30 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | ok | 262.3 | 1 accepted, 1 fails_at_head, 17 not_testable; e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/auth/session-client.ts, web/src/auth/session-fetch.ts |
| 8 | s1 judge | ok | 1.5 | 30/30 criteria judged by jev |
| 9 | judge | ok | 95.1 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261127T1318Z-a186/023-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261127T1318Z-a186/024-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261127T1318Z-a186/025-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261127T1318Z-a186/026-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261127T1318Z-a186/027-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261127T1318Z-a186/028-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261127T1318Z-a186/029-e2e.log |

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
| suppressions | skipped | not checked: python only; changed files outside it: web/src/auth/session-client.ts, web/src/auth/session-fetch-retry.test.ts, web/src/auth/session-fetch.ts |
| tdd history | ok | 1 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 3160 of 3160 base tests pass on the unit's code with its 1 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-bfbec1c2 | web-auth › A write fails in one tab after the same session loads a page in another tab — feedback FB-001 › A write fails in one tab after the same session loads a page in another tab | covered | web.src.auth.session-fetch-retry.test.ts::C-bfbec1c2 a CSRF refusal on sign out repeats the logout once (passed, red_assertion); web.src.auth.session-fetch-retry.test.ts::C-bfbec1c2 a CSRF refusal reloads the session and repeats the write once (passed, red_assertion); web.src.auth.session-fetch-retr... | - | 0.95 | `e2e/test_l4_c_bfbec1c2.py`, `test-results/test-l4-c-bfbec1c2-py-test-write-in-stale-tab-succeeds-after-other-tab-loads-chromium/test-failed-1.png`, `test-results/test-l4-c-bfbec1c2-py-test-write-in-stale-tab-succeeds-after-other-tab-loads-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-01e427f8 | web-auth › Every sign-in error code has one text › Every code has a text | covered | web.src.auth.messages.test.ts::C-01e427f8 every code has a text (passed, pass_to_pass) | - | 0.68 | - |
| C-e78811f4 | web-auth › Every sign-in error code has one text › The texts | covered | web.src.auth.messages.test.ts::C-e78811f4 the texts (passed, pass_to_pass) | - | 0.85 | - |
| C-cef4634b | web-auth › The return path survives the sign-in round trip › Login and sign-in URLs | covered | web.src.auth.return-to.test.ts::C-cef4634b login and sign-in URLs (passed, pass_to_pass) | - | 0.83 | - |
| C-23a4ce1e | web-auth › The return path survives the sign-in round trip › Search parsing | covered | web.src.auth.return-to.test.ts::C-23a4ce1e search parsing (passed, pass_to_pass); test_l4_c_23a4ce1e::test_sign_in_search_parsing[chromium] (passed, pass_to_pass) | - | 0.88 | - |
| C-22c98964 | web-auth › The sign-in page offers one Sign in button and shows why a sign-in failed › The sign-in page decides its state | covered | web.src.auth.sign-in-page.test.ts::C-22c98964 the sign-in page decides its state (passed, pass_to_pass) | - | 0.70 | - |
| C-023c2efe | web-auth › The CSRF header is added only to same-origin state-changing requests › The CSRF header is added only to same-origin state-changing requests | covered | web.src.auth.session-fetch.test.ts::C-023c2efe the CSRF header is added only to same-origin state-changing requests (passed, pass_to_pass) | - | 0.92 | - |
| C-5368eb23 | web-auth › The CSRF header is added only to same-origin state-changing requests › The session client sends the token and leaves on a dead session | covered | web.src.auth.session-client.test.ts::C-5368eb23 the session client sends the token and leaves on a dead session (passed, pass_to_pass) | - | 0.89 | - |
| C-3809dcd7 | web-auth › A dead session sends the user to sign in › A 401 envelope ends the session once | covered | web.src.auth.session-fetch.test.ts::C-3809dcd7 a 401 envelope ends the session once (passed, pass_to_pass) | - | 0.81 | - |
| C-b4adf358 | web-auth › A dead session sends the user to sign in › A dead session sends the user to sign in | covered | web.src.auth.return-to.test.ts::C-b4adf358 a dead session sends the user to sign in (passed, pass_to_pass) | - | 0.71 | - |
| C-eb130cb7 | web-auth › Sign out ends the session and follows the provider's redirect › Sign out follows only a safe redirect | covered | web.src.auth.sign-out.test.ts::C-eb130cb7 sign out follows only a safe redirect (passed, pass_to_pass) | - | 0.59 | - |
| C-4b09fc8c | web-auth › Sign out ends the session and follows the provider's redirect › Sign out refreshes a stale token once | covered | web.src.auth.sign-out.test.ts::C-4b09fc8c sign out refreshes a stale token once (passed, pass_to_pass) | - | 0.42 | - |
| C-77971a2d | web-auth › Sign out ends the session and follows the provider's redirect › Sign out reports what failed | covered | web.src.auth.sign-out.test.ts::C-77971a2d sign out reports what failed (passed, pass_to_pass) | - | 0.75 | - |
| C-e3de8f9e | web-auth › The header shows the user and tenant and offers Sign out › The header shows the user and tenant and offers Sign out | covered | web.src.auth.account.test.ts::C-e3de8f9e header shows the user and tenant and offers sign out (passed, pass_to_pass); test_l4_c_e3de8f9e::test_header_shows_user_tenant_and_sign_out[chromium] (passed, pass_to_pass) | - | 0.80 | - |
| C-53df20c1 | web-auth › The header shows the user and tenant and offers Sign out › The stylesheet follows the kit rules | covered | web.src.auth.auth-css.test.ts::C-53df20c1 stylesheet follows the kit rules (passed, pass_to_pass) | - | 0.87 | - |
| C-96e3a4f2 | web-auth › The header shows the user and tenant and offers Sign out › The earlier journeys still pass | covered | test_l4_c_96e3a4f2::test_earlier_skeleton_and_kit_journeys_still_pass[chromium] (passed, pass_to_pass) | - | 0.89 | - |
| C-c79d9365 | web-auth › The e2e stack seeds tenant B and the browser users › Seed data is merged from the parts that offer it | covered | test.support.e2e-stack.seed-data.test.ts::C-c79d9365 seed data merges only the parts that offer seedData into a new object (passed, pass_to_pass); test.support.e2e-stack.seed-data.test.ts::C-c79d9365 seed data rejects a seedData result that is not a plain object (passed, pass_to_pass); test.support.... | - | 0.90 | - |
| C-812ae263 | web-auth › The e2e stack seeds tenant B and the browser users › Tenant B is created and its organisation provisioned | covered | test.support.e2e-stack.tenant-b-part.test.ts::C-812ae263 tenant B is created and its organisation provisioned (passed, pass_to_pass) | - | 0.70 | - |
| C-c1ed19d8 | web-auth › The e2e stack seeds tenant B and the browser users › Seed users come from the fake | covered | test.support.e2e-stack.tenant-b-part.test.ts::C-c1ed19d8 seed users come from the fake (passed, pass_to_pass) | - | 0.80 | - |
| C-39471a6a | web-auth › The e2e stack seeds tenant B and the browser users › The tenant-b part is discovered after the oidc part | covered | test.support.e2e-stack.tenant-b-part.test.ts::C-39471a6a the tenant-b part is discovered after the oidc part (passed, pass_to_pass) | - | 0.67 | - |
| C-bf32f3ba | web-auth › The e2e stack seeds tenant B and the browser users › The control listener serves seed data to the test process only | covered | test.support.e2e-stack.control.seed.test.ts::C-bf32f3ba a missing seedData answers 404 and a throwing seedData answers 500 without the secret (passed, pass_to_pass); test.support.e2e-stack.control.seed.test.ts::C-bf32f3ba the seed route answers the JSON of seedData on the loopback control listener (... | - | 0.83 | - |
| C-79192192 | web-auth › The e2e stack seeds tenant B and the browser users › Alice and mallory see their own tenant through the real engine | covered | test.support.e2e-stack.stack.seed.test.ts::C-79192192: alice and mallory see their own tenant through the real engine (passed, pass_to_pass); test_l4_c_79192192::test_alice_and_mallory_see_their_own_tenant[chromium] (passed, generated, base fail, head pass) | - | 0.83 | `e2e/test_l4_c_79192192.py`, `.l4-out/e2e/page.html` |
| C-ee431615 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in page shows the error and is accessible | covered | test_l4_c_ee431615::test_sign_in_page_shows_disabled_error_and_is_accessible[chromium] (passed, pass_to_pass); test_m1_sign_in::test_c_ee431615_the_sign_in_page_shows_the_error_and_is_accessible[chromium] (passed, pass_to_pass) | - | 0.92 | - |
| C-d115a25a | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Alice signs in and the header shows user and tenant | covered | test_m1_sign_in::test_c_d115a25a_alice_signs_in_and_the_header_shows_user_and_tenant[chromium] (passed, pass_to_pass) | - | 0.83 | - |
| C-a699ddc9 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Two tenants stay apart | covered | test_m1_sign_in::test_c_a699ddc9_two_tenants_stay_apart[chromium] (passed, pass_to_pass) | - | 0.90 | - |
| C-c3f18eb0 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A request without a session is unauthenticated | covered | test_m1_sign_in::test_c_c3f18eb0_a_request_without_a_session_is_unauthenticated (passed, pass_to_pass) | - | 0.94 | - |
| C-67c1baa1 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Sign out ends the session | covered | test_m1_sign_in::test_c_67c1baa1_sign_out_ends_the_session[chromium] (passed, pass_to_pass) | - | 0.91 | - |
| C-6e84f9b2 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A post without the CSRF header is refused | covered | test_m1_sign_in::test_c_6e84f9b2_a_post_without_the_csrf_header_is_refused[chromium] (passed, pass_to_pass) | - | 0.87 | - |
| C-4faae006 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The return path is kept | covered | test_m1_sign_in::test_c_4faae006_the_return_path_is_kept[chromium] (passed, pass_to_pass) | - | 0.85 | - |
| C-a76b8eac | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in and sign-out buttons are keyboard reachable | covered | test_m1_sign_in::test_c_a76b8eac_the_sign_in_and_sign_out_buttons_are_keyboard_reachable[chromium] (passed, pass_to_pass) | - | 0.93 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/auth/session-client.ts, web/src/auth/session-fetch.ts

### Tests

3307 of 3307 passed, 0 failed, 0 errored, 0 skipped.
3 of 3 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-bfbec1c2 | fails_at_head | e2e/test_l4_c_bfbec1c2.py | fail | fail | 2 | the test fails at the head: test_l4_c_bfbec1c2::test_write_in_stale_tab_succeeds_after_other_tab_loads[chromium] | test-results/test-l4-c-bfbec1c2-py-test-write-in-stale-tab-succeeds-after-other-tab-loads-chromium/test-failed-1.png, test-results/test-l4-c-bfbec1c2-py-test-write-in-stale-tab-succeeds-after-other-tab-loads-chromium/trace.zip |
| C-01e427f8 | not_testable | - | - | - | 1 | Criterion is about module-level functions (registerSignInMessages, messageFor, SIGN_IN_MESSAGES) with no browser-visible surface; it is a unit-level check, not an e2e one. | - |
| C-e78811f4 | not_testable | - | - | - | 1 | SIGN_IN_MESSAGES is an internal constant in the web bundle with no browser-visible surface to read it; the page is an SPA shell and the e2e flow cannot trigger all twelve codes. | - |
| C-cef4634b | not_testable | - | - | - | 1 | Criterion specifies return values of the pure functions loginUrl and signInUrl, which aren't reachable from the browser UI; it belongs in a unit test, not e2e. | - |
| C-22c98964 | not_testable | - | - | - | 1 | The criterion specifies the pure function signInView and its return values. A browser test can't call it, and the exact messages and link targets aren't observable through the UI. | - |
| C-023c2efe | not_testable | - | - | - | 1 | Specifies unit-level behavior of withCsrfHeader and isStateChanging with recording fetches and injected token sources; the built page does not expose these functions, so a browser test cannot check it. | - |
| C-5368eb23 | not_testable | - | - | - | 1 | Criterion is about the createBrowserSession module with injected fake fetch, loader and location; it has no browser-observable surface, so it is a unit test, not an e2e test. | - |
| C-3809dcd7 | not_testable | - | - | - | 1 | Criterion targets the withSessionEnd function with fake fetches and throwing callbacks; it is a unit-level behavior with no user-visible browser flow to drive. | - |
| C-b4adf358 | not_testable | - | - | - | 1 | The criterion is a unit contract of the redirectToSignIn function (return values and a recording assign for four injected locations); a browser cannot inject those inputs or observe those return values. | - |
| C-eb130cb7 | not_testable | - | - | - | 1 | Criterion is about unit-level functions safeRedirect and signOut with mocked post/loader; not reachable through the browser UI. | - |
| C-4b09fc8c | not_testable | - | - | - | 1 | Criterion is about the signOut function's injected post/reset/load mocks and return values; it has no browser-observable behaviour (a unit-level test). | - |
| C-77971a2d | not_testable | - | - | - | 1 | Criterion specifies results of the signOut function with a mocked `post` and counted `reset` calls; it is a unit-level contract, not observable through the browser UI. | - |
| C-53df20c1 | not_testable | - | - | - | 1 | Criterion scans source files (auth.css, .tsx) with static helpers; it is not observable through the browser UI. | - |
| C-c79d9365 | not_testable | - | - | - | 1 | Criterion concerns the collectSeedData function of the e2e stack support code (unit-level behaviour), not anything a user sees in the browser. | - |
| C-812ae263 | not_testable | - | - | - | 1 | Criterion concerns server-side test-stack seeding (database, tenant resolution, STACK_PART_MISSING) via TypeScript functions; no browser-observable behaviour. | - |
| C-c1ed19d8 | not_testable | - | - | - | 1 | Concerns internal e2e-stack seeding functions (seedUsersOf, tenantBPart.start, handle.env); not observable through the browser UI. | - |
| C-39471a6a | not_testable | - | - | - | 1 | Concerns the e2e stack's build-time part discovery and a source file's contents, not browser-observable behaviour. | - |
| C-bf32f3ba | not_testable | - | - | - | 1 | The criterion constructs startControlServer with port 0 and custom seedData variants (absent, throwing). A browser test against the running stack can't create those servers. | - |
| C-79192192 | accepted | e2e/test_l4_c_79192192.py | fail | pass | 1 | - | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-bfbec1c2 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-01e427f8 | ok | 0.680 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e78811f4 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cef4634b | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23a4ce1e | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-22c98964 | ok | 0.700 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-023c2efe | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5368eb23 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3809dcd7 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b4adf358 | ok | 0.710 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eb130cb7 | ok | 0.590 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4b09fc8c | ok | 0.420 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-77971a2d | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e3de8f9e | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-53df20c1 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-96e3a4f2 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c79d9365 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-812ae263 | ok | 0.700 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c1ed19d8 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-39471a6a | ok | 0.670 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bf32f3ba | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-79192192 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ee431615 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d115a25a | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a699ddc9 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3f18eb0 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-67c1baa1 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6e84f9b2 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4faae006 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a76b8eac | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-bfbec1c2 | web-auth › A write fails in one tab after the same session loads a page in another tab — feedback FB-001 › A write fails in one tab after the same session loads a page in another tab | pass | pass | the judge passed it and a discriminating test passes |
| C-01e427f8 | web-auth › Every sign-in error code has one text › Every code has a text | pass | pass | the judge passed it and a discriminating test passes |
| C-e78811f4 | web-auth › Every sign-in error code has one text › The texts | pass | pass | the judge passed it and a discriminating test passes |
| C-cef4634b | web-auth › The return path survives the sign-in round trip › Login and sign-in URLs | pass | pass | the judge passed it and a discriminating test passes |
| C-23a4ce1e | web-auth › The return path survives the sign-in round trip › Search parsing | pass | pass | the judge passed it and a discriminating test passes |
| C-22c98964 | web-auth › The sign-in page offers one Sign in button and shows why a sign-in failed › The sign-in page decides its state | pass | pass | the judge passed it and a discriminating test passes |
| C-023c2efe | web-auth › The CSRF header is added only to same-origin state-changing requests › The CSRF header is added only to same-origin state-changing requests | pass | pass | the judge passed it and a discriminating test passes |
| C-5368eb23 | web-auth › The CSRF header is added only to same-origin state-changing requests › The session client sends the token and leaves on a dead session | pass | pass | the judge passed it and a discriminating test passes |
| C-3809dcd7 | web-auth › A dead session sends the user to sign in › A 401 envelope ends the session once | pass | pass | the judge passed it and a discriminating test passes |
| C-b4adf358 | web-auth › A dead session sends the user to sign in › A dead session sends the user to sign in | pass | pass | the judge passed it and a discriminating test passes |
| C-eb130cb7 | web-auth › Sign out ends the session and follows the provider's redirect › Sign out follows only a safe redirect | pass | pass | the judge passed it and a discriminating test passes |
| C-4b09fc8c | web-auth › Sign out ends the session and follows the provider's redirect › Sign out refreshes a stale token once | pass | pass | the judge passed it and a discriminating test passes |
| C-77971a2d | web-auth › Sign out ends the session and follows the provider's redirect › Sign out reports what failed | pass | pass | the judge passed it and a discriminating test passes |
| C-e3de8f9e | web-auth › The header shows the user and tenant and offers Sign out › The header shows the user and tenant and offers Sign out | pass | pass | the judge passed it and a discriminating test passes |
| C-53df20c1 | web-auth › The header shows the user and tenant and offers Sign out › The stylesheet follows the kit rules | pass | pass | the judge passed it and a discriminating test passes |
| C-96e3a4f2 | web-auth › The header shows the user and tenant and offers Sign out › The earlier journeys still pass | pass | pass | the judge passed it and a discriminating test passes |
| C-c79d9365 | web-auth › The e2e stack seeds tenant B and the browser users › Seed data is merged from the parts that offer it | pass | pass | the judge passed it and a discriminating test passes |
| C-812ae263 | web-auth › The e2e stack seeds tenant B and the browser users › Tenant B is created and its organisation provisioned | pass | pass | the judge passed it and a discriminating test passes |
| C-c1ed19d8 | web-auth › The e2e stack seeds tenant B and the browser users › Seed users come from the fake | pass | pass | the judge passed it and a discriminating test passes |
| C-39471a6a | web-auth › The e2e stack seeds tenant B and the browser users › The tenant-b part is discovered after the oidc part | pass | pass | the judge passed it and a discriminating test passes |
| C-bf32f3ba | web-auth › The e2e stack seeds tenant B and the browser users › The control listener serves seed data to the test process only | pass | pass | the judge passed it and a discriminating test passes |
| C-79192192 | web-auth › The e2e stack seeds tenant B and the browser users › Alice and mallory see their own tenant through the real engine | pass | pass | the judge passed it and a discriminating test passes |
| C-ee431615 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in page shows the error and is accessible | pass | pass | the judge passed it and a discriminating test passes |
| C-d115a25a | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Alice signs in and the header shows user and tenant | pass | pass | the judge passed it and a discriminating test passes |
| C-a699ddc9 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Two tenants stay apart | pass | pass | the judge passed it and a discriminating test passes |
| C-c3f18eb0 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A request without a session is unauthenticated | pass | pass | the judge passed it and a discriminating test passes |
| C-67c1baa1 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Sign out ends the session | pass | pass | the judge passed it and a discriminating test passes |
| C-6e84f9b2 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A post without the CSRF header is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-4faae006 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The return path is kept | pass | pass | the judge passed it and a discriminating test passes |
| C-a76b8eac | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in and sign-out buttons are keyboard reachable | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] UI criterion without an end-to-end test (criterion C-bfbec1c2): No end-to-end test traces criterion C-bfbec1c2 (web-auth › A write fails in one tab after the same session loads a page in another tab — feedback FB-001 › A write fails in one tab after the same session loads a page in another tab); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-01e427f8): No end-to-end test traces criterion C-01e427f8 (web-auth › Every sign-in error code has one text › Every code has a text); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e78811f4): No end-to-end test traces criterion C-e78811f4 (web-auth › Every sign-in error code has one text › The texts); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-cef4634b): No end-to-end test traces criterion C-cef4634b (web-auth › The return path survives the sign-in round trip › Login and sign-in URLs); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-22c98964): No end-to-end test traces criterion C-22c98964 (web-auth › The sign-in page offers one Sign in button and shows why a sign-in failed › The sign-in page decides its state); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-023c2efe): No end-to-end test traces criterion C-023c2efe (web-auth › The CSRF header is added only to same-origin state-changing requests › The CSRF header is added only to same-origin state-changing requests); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5368eb23): No end-to-end test traces criterion C-5368eb23 (web-auth › The CSRF header is added only to same-origin state-changing requests › The session client sends the token and leaves on a dead session); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3809dcd7): No end-to-end test traces criterion C-3809dcd7 (web-auth › A dead session sends the user to sign in › A 401 envelope ends the session once); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b4adf358): No end-to-end test traces criterion C-b4adf358 (web-auth › A dead session sends the user to sign in › A dead session sends the user to sign in); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-eb130cb7): No end-to-end test traces criterion C-eb130cb7 (web-auth › Sign out ends the session and follows the provider's redirect › Sign out follows only a safe redirect); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4b09fc8c): No end-to-end test traces criterion C-4b09fc8c (web-auth › Sign out ends the session and follows the provider's redirect › Sign out refreshes a stale token once); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-77971a2d): No end-to-end test traces criterion C-77971a2d (web-auth › Sign out ends the session and follows the provider's redirect › Sign out reports what failed); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-53df20c1): No end-to-end test traces criterion C-53df20c1 (web-auth › The header shows the user and tenant and offers Sign out › The stylesheet follows the kit rules); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c79d9365): No end-to-end test traces criterion C-c79d9365 (web-auth › The e2e stack seeds tenant B and the browser users › Seed data is merged from the parts that offer it); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-812ae263): No end-to-end test traces criterion C-812ae263 (web-auth › The e2e stack seeds tenant B and the browser users › Tenant B is created and its organisation provisioned); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c1ed19d8): No end-to-end test traces criterion C-c1ed19d8 (web-auth › The e2e stack seeds tenant B and the browser users › Seed users come from the fake); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-39471a6a): No end-to-end test traces criterion C-39471a6a (web-auth › The e2e stack seeds tenant B and the browser users › The tenant-b part is discovered after the oidc part); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-bf32f3ba): No end-to-end test traces criterion C-bf32f3ba (web-auth › The e2e stack seeds tenant B and the browser users › The control listener serves seed data to the test process only); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-79192192): No end-to-end test traces criterion C-79192192 (web-auth › The e2e stack seeds tenant B and the browser users › Alice and mallory see their own tenant through the real engine); step 5 generates one.
- [minor, judge] session reload failure during a CSRF retry is unpinned (spec gap) (criterion C-bfbec1c2): No scenario pins what happens when refresh() (loader.reset() then loader.load() issuing GET /api/v1/me) itself fails; withCsrfRetry propagates the loader's rejection without repeating the request or showing the out-of-date page. Two reasonable implementations differ here (surface an error vs. give up silently).

## Feedback

- FB-001: judged addressed, pending a PASS round: web/src/auth/session-fetch.ts adds withCsrfRetry, which reloads GET /api/v1/me once and repeats the state-changing request once with the new token on a 403 CSRF_INVALID/OIDC_CSRF_INVALID; web/src/auth/session-client.ts wires it into the api and logout clients; web.src.auth.session-fetch-retry.tes...

## Needs a human

- UI criterion C-bfbec1c2 has no end-to-end test; see the generated UI tests table
- UI criterion C-01e427f8 has no end-to-end test; see the generated UI tests table
- UI criterion C-e78811f4 has no end-to-end test; see the generated UI tests table
- UI criterion C-cef4634b has no end-to-end test; see the generated UI tests table
- UI criterion C-22c98964 has no end-to-end test; see the generated UI tests table
- UI criterion C-023c2efe has no end-to-end test; see the generated UI tests table
- UI criterion C-5368eb23 has no end-to-end test; see the generated UI tests table
- UI criterion C-3809dcd7 has no end-to-end test; see the generated UI tests table
- UI criterion C-b4adf358 has no end-to-end test; see the generated UI tests table
- UI criterion C-eb130cb7 has no end-to-end test; see the generated UI tests table
- UI criterion C-4b09fc8c has no end-to-end test; see the generated UI tests table
- UI criterion C-77971a2d has no end-to-end test; see the generated UI tests table
- UI criterion C-53df20c1 has no end-to-end test; see the generated UI tests table
- UI criterion C-c79d9365 has no end-to-end test; see the generated UI tests table
- UI criterion C-812ae263 has no end-to-end test; see the generated UI tests table
- UI criterion C-c1ed19d8 has no end-to-end test; see the generated UI tests table
- UI criterion C-39471a6a has no end-to-end test; see the generated UI tests table
- UI criterion C-bf32f3ba has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.auth.session-fetch-retry.test.ts::C-bfbec1c2 a CSRF refusal on sign out repeats the logout once` (task 1.1): passed
- `web.src.auth.session-fetch-retry.test.ts::C-bfbec1c2 a CSRF refusal reloads the session and repeats the write once` (task 1.1): passed
- `web.src.auth.session-fetch-retry.test.ts::C-bfbec1c2 only a second CSRF refusal shows the out-of-date message` (task 1.1): passed
