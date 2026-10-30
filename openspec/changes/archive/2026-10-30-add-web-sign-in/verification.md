# Verification: openspec:add-web-sign-in: PASS (round 4)

traceability: 22/29 criteria covered by a discriminating test

- Base: `9dbc21eb8ded038c8fe75330591aa547d831d160`
- Head: `601ca1fba934ca4e5e46ce1a8b0807bc39f204eb`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: mimo-judge, 2 call(s), judged in 2 parts, prompt sha256 `bbd7b59f258404817f56572548525d9e0899cd1f72ceaaf77a3b30175492487f`
  - part 1: 37 file(s), 98022 characters, profile mimo-judge, reply repaired
  - part 2: 4 file(s), 45457 characters, profile mimo-judge, reply valid
- Judge replies of mimo-judge (this unit, all rounds): valid 1, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): mimo-judge xiaomi (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 3) |
| 1 | integrity | reused | 0.0 | reused (round 3) |
| 2 | build | reused | 0.0 | reused (round 3) |
| 3 | tests | reused | 0.0 | reused (round 3) |
| 4 | traceability | reused | 0.0 | reused (round 3) |
| 4a | audit sampling | reused | 0.0 | reused (round 3) |
| 5 | ui test generation | reused | 0.0 | reused (round 3) |
| 6 | quality | reused | 0.0 | reused (round 3) |
| 8 | s1 judge | reused | 0.0 | reused (round 3) |
| 9 | judge | reused | 0.0 | reused (round 3) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261030T1921Z-1d9a/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261030T1921Z-1d9a/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261030T1921Z-1d9a/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261030T1921Z-1d9a/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261030T1921Z-1d9a/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261030T1921Z-1d9a/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261030T1921Z-1d9a/020-e2e.log |

## Files by part

- part 1: openspec/changes/add-web-sign-in-fix-1/.openspec.yaml (317 characters)
- part 1: openspec/changes/add-web-sign-in-fix-2/.openspec.yaml (317 characters)
- part 1: web/src/features/15-sign-in.tsx (506 characters)
- part 1: test/support/e2e-stack/parts/27-tenant-b.ts (285 characters)
- part 1: web/src/auth/account.test.ts (2579 characters)
- part 1: web/src/auth/account.ts (1493 characters)
- part 1: web/src/auth/AccountMenu.tsx (1989 characters)
- part 1: web/src/auth/auth.css (515 characters)
- part 1: web/src/auth/auth-css.test.ts (2117 characters)
- part 1: web/src/auth/browser-session.ts (1431 characters)
- part 1: e2e/conftest.py (2104 characters)
- part 1: e2e/test_m1_sign_in.py (5727 characters)
- part 1: test/support/e2e-stack/control.seed.test.ts (6374 characters)
- part 1: test/support/e2e-stack/control.ts (1527 characters)
- part 1: web/src/auth/messages.test.ts (3962 characters)
- part 1: web/src/auth/messages.ts (2069 characters)
- part 1: openspec/changes/add-web-sign-in-fix-1/proposal.md (1114 characters)
- part 1: openspec/changes/add-web-sign-in-fix-2/proposal.md (924 characters)
- part 1: web/src/auth/return-to.test.ts (5239 characters)
- part 1: web/src/auth/return-to.ts (3941 characters)
- part 1: test/support/e2e-stack/seed-data.test.ts (2974 characters)
- part 1: test/support/e2e-stack/seed-data.ts (2294 characters)
- part 1: web/src/auth/session-client.test.ts (7527 characters)
- part 1: web/src/auth/session-client.ts (2044 characters)
- part 1: web/src/auth/session-fetch.test.ts (9022 characters)
- part 1: web/src/auth/session-fetch.ts (2865 characters)
- part 1: web/src/app/Shell.tsx (585 characters)
- part 1: web/src/auth/sign-in-page.test.ts (2733 characters)
- part 1: web/src/auth/sign-in-page.ts (1238 characters)
- part 1: web/src/auth/sign-out.test.ts (7552 characters)
- part 1: web/src/auth/sign-out.ts (3162 characters)
- part 1: web/src/auth/SignInPage.tsx (2005 characters)
- part 1: test/support/e2e-stack/stack.db.test.ts (3176 characters)
- part 1: test/support/e2e-stack/stack.seed.test.ts (4786 characters)
- part 1: test/support/e2e-stack/stack.ts (841 characters)
- part 1: openspec/changes/add-web-sign-in-fix-1/tasks.md (344 characters)
- part 1: openspec/changes/add-web-sign-in-fix-2/tasks.md (344 characters)
- part 2: openspec/changes/add-web-sign-in/tasks.md (30347 characters)
- part 2: test/support/e2e-stack/tenant-b-part.test.ts (9629 characters)
- part 2: test/support/e2e-stack/tenant-b-part.ts (4175 characters)
- part 2: web/src/auth/use-session.ts (1306 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 2 test file(s) compared with the base; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 11 task(s): red and green compared |
| test path freeze | ok | 15 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/support/e2e-stack/control.seed.test.ts, test/support/e2e-stack/control.ts, test/support/e2e-stack/parts/27-tenant-b.ts, test/support/e2e-stack/seed-data.test.ts, test/support/e2e-stack/seed-data.ts (+26 more) |
| tdd history | ok | 11 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 915 of 915 base tests pass on the unit's code with its 13 test and support files at the base (base: not needed) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_m1_sign_in.py kept at head for the run (people changed it last (f0a417732d, 3c23ff5a55))

## Pre-existing tests changed with an allowance (L4-VER-031)

- test/support/e2e-stack/stack.db.test.ts kept at head for the run (task 4.2: unfrozen by Q-001)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-01e427f8 | web-auth › Every sign-in error code has one text › Every code has a text | covered | web.src.auth.messages.test.ts::C-01e427f8 every code has a text (passed, red_assertion) | - | 0.82 | - |
| C-e78811f4 | web-auth › Every sign-in error code has one text › The texts | covered | web.src.auth.messages.test.ts::C-e78811f4 the texts (passed, red_assertion) | - | 0.92 | - |
| C-cef4634b | web-auth › The return path survives the sign-in round trip › Login and sign-in URLs | covered | web.src.auth.return-to.test.ts::C-cef4634b login and sign-in URLs (passed, red_assertion) | - | 0.95 | - |
| C-23a4ce1e | web-auth › The return path survives the sign-in round trip › Search parsing | covered | web.src.auth.return-to.test.ts::C-23a4ce1e search parsing (passed, red_assertion); test_l4_c_23a4ce1e::test_sign_in_search_parsing[chromium] (passed, generated, base fail, head pass) | - | 0.94 | `e2e/test_l4_c_23a4ce1e.py`, `.l4-out/e2e/page.html` |
| C-22c98964 | web-auth › The sign-in page offers one Sign in button and shows why a sign-in failed › The sign-in page decides its state | covered | web.src.auth.sign-in-page.test.ts::C-22c98964 the sign-in page decides its state (passed, red_assertion) | - | 0.90 | `e2e/test_l4_c_22c98964.py`, `test-results/test-l4-c-22c98964-py-test-external-return-to-is-refused-chromium/test-failed-1.png`, `test-results/test-l4-c-22c98964-py-test-external-return-to-is-refused-chromium/trace.zip`, `test-results/test-l4-c-22c98964-py-test-failed-session-offers-sign-in-to-root-... |
| C-023c2efe | web-auth › The CSRF header is added only to same-origin state-changing requests › The CSRF header is added only to same-origin state-changing requests | covered | web.src.auth.session-fetch.test.ts::C-023c2efe the CSRF header is added only to same-origin state-changing requests (passed, red_assertion) | - | 0.92 | - |
| C-5368eb23 | web-auth › The CSRF header is added only to same-origin state-changing requests › The session client sends the token and leaves on a dead session | covered | web.src.auth.session-client.test.ts::C-5368eb23 the session client sends the token and leaves on a dead session (passed, red_assertion) | - | 0.93 | - |
| C-3809dcd7 | web-auth › A dead session sends the user to sign in › A 401 envelope ends the session once | covered | web.src.auth.session-fetch.test.ts::C-3809dcd7 a 401 envelope ends the session once (passed, red_assertion) | - | 0.86 | - |
| C-b4adf358 | web-auth › A dead session sends the user to sign in › A dead session sends the user to sign in | covered | web.src.auth.return-to.test.ts::C-b4adf358 a dead session sends the user to sign in (passed, red_assertion) | - | 0.91 | - |
| C-eb130cb7 | web-auth › Sign out ends the session and follows the provider's redirect › Sign out follows only a safe redirect | covered | web.src.auth.sign-out.test.ts::C-eb130cb7 sign out follows only a safe redirect (passed, red_assertion) | - | 0.85 | - |
| C-4b09fc8c | web-auth › Sign out ends the session and follows the provider's redirect › Sign out refreshes a stale token once | covered | web.src.auth.sign-out.test.ts::C-4b09fc8c sign out refreshes a stale token once (passed, red_assertion) | - | 0.47 | - |
| C-77971a2d | web-auth › Sign out ends the session and follows the provider's redirect › Sign out reports what failed | covered | web.src.auth.sign-out.test.ts::C-77971a2d sign out reports what failed (passed, red_assertion) | - | 0.87 | - |
| C-e3de8f9e | web-auth › The header shows the user and tenant and offers Sign out › The header shows the user and tenant and offers Sign out | covered | web.src.auth.account.test.ts::C-e3de8f9e header shows the user and tenant and offers sign out (passed, red_assertion); test_l4_c_e3de8f9e::test_header_shows_user_tenant_and_sign_out[chromium] (passed, generated, base fail, head pass) | - | 0.84 | `e2e/test_l4_c_e3de8f9e.py`, `.l4-out/e2e/page.html` |
| C-53df20c1 | web-auth › The header shows the user and tenant and offers Sign out › The stylesheet follows the kit rules | covered | web.src.auth.auth-css.test.ts::C-53df20c1 stylesheet follows the kit rules (passed, red_assertion) | - | 0.89 | - |
| C-96e3a4f2 | web-auth › The header shows the user and tenant and offers Sign out › The earlier journeys still pass | covered | test_l4_c_96e3a4f2::test_earlier_skeleton_and_kit_journeys_still_pass[chromium] (passed, generated, base fail, head pass) | - | 0.85 | `e2e/test_l4_c_96e3a4f2.py`, `.l4-out/e2e/page.html` |
| C-c79d9365 | web-auth › The e2e stack seeds tenant B and the browser users › Seed data is merged from the parts that offer it | covered | test.support.e2e-stack.seed-data.test.ts::C-c79d9365 seed data merges only the parts that offer seedData into a new object (passed, red_assertion); test.support.e2e-stack.seed-data.test.ts::C-c79d9365 seed data rejects a seedData result that is not a plain object (passed, red_assertion); test.suppor... | - | 0.92 | - |
| C-812ae263 | web-auth › The e2e stack seeds tenant B and the browser users › Tenant B is created and its organisation provisioned | covered | test.support.e2e-stack.tenant-b-part.test.ts::C-812ae263 tenant B is created and its organisation provisioned (passed, red_assertion) | - | 0.87 | - |
| C-c1ed19d8 | web-auth › The e2e stack seeds tenant B and the browser users › Seed users come from the fake | covered | test.support.e2e-stack.tenant-b-part.test.ts::C-c1ed19d8 seed users come from the fake (passed, red_assertion) | - | 0.90 | - |
| C-39471a6a | web-auth › The e2e stack seeds tenant B and the browser users › The tenant-b part is discovered after the oidc part | covered | test.support.e2e-stack.tenant-b-part.test.ts::C-39471a6a the tenant-b part is discovered after the oidc part (passed, red_assertion) | - | 0.83 | - |
| C-bf32f3ba | web-auth › The e2e stack seeds tenant B and the browser users › The control listener serves seed data to the test process only | covered | test.support.e2e-stack.control.seed.test.ts::C-bf32f3ba a missing seedData answers 404 and a throwing seedData answers 500 without the secret (passed, red_assertion); test.support.e2e-stack.control.seed.test.ts::C-bf32f3ba the seed route answers the JSON of seedData on the loopback control listener ... | - | 0.90 | `e2e/test_l4_c_bf32f3ba.py`, `.l4-out/e2e/page.html` |
| C-79192192 | web-auth › The e2e stack seeds tenant B and the browser users › Alice and mallory see their own tenant through the real engine | covered | test.support.e2e-stack.stack.seed.test.ts::C-79192192: alice and mallory see their own tenant through the real engine (passed, red_assertion) | - | 0.84 | - |
| C-ee431615 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in page shows the error and is accessible | covered | test_l4_c_ee431615::test_sign_in_page_shows_disabled_error_and_is_accessible[chromium] (passed, generated, base fail, head pass) | test_m1_sign_in::test_c_ee431615_the_sign_in_page_shows_the_error_and_is_accessible[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.91 | `e2e/test_l4_c_ee431615.py`, `.l4-out/e2e/page.html` |
| C-d115a25a | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Alice signs in and the header shows user and tenant | uncovered | - | test_m1_sign_in::test_c_d115a25a_alice_signs_in_and_the_header_shows_user_and_tenant[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.04 | - |
| C-a699ddc9 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Two tenants stay apart | uncovered | - | test_m1_sign_in::test_c_a699ddc9_two_tenants_stay_apart[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.03 | `e2e/test_l4_c_a699ddc9.py`, `test-results/test-l4-c-a699ddc9-py-test-two-tenants-stay-apart-chromium/test-failed-1.png`, `test-results/test-l4-c-a699ddc9-py-test-two-tenants-stay-apart-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-c3f18eb0 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A request without a session is unauthenticated | uncovered | - | test_m1_sign_in::test_c_c3f18eb0_a_request_without_a_session_is_unauthenticated (no proof that it discriminates (no red, audit or generated record)) | 0.04 | `e2e/test_l4_c_c3f18eb0.py`, `.l4-out/e2e/page.html` |
| C-67c1baa1 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Sign out ends the session | uncovered | - | test_m1_sign_in::test_c_67c1baa1_sign_out_ends_the_session[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.03 | `e2e/test_l4_c_67c1baa1.py`, `.l4-out/e2e/page.html` |
| C-6e84f9b2 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A post without the CSRF header is refused | uncovered | - | test_m1_sign_in::test_c_6e84f9b2_a_post_without_the_csrf_header_is_refused[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.05 | `e2e/test_l4_c_6e84f9b2.py`, `test-results/test-l4-c-6e84f9b2-py-test-logout-without-csrf-header-is-refused-chromium/test-failed-1.png`, `test-results/test-l4-c-6e84f9b2-py-test-logout-without-csrf-header-is-refused-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-4faae006 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The return path is kept | uncovered | - | test_m1_sign_in::test_c_4faae006_the_return_path_is_kept[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.04 | `e2e/test_l4_c_4faae006.py`, `test-results/test-l4-c-4faae006-py-test-return-path-is-kept-chromium/test-failed-1.png`, `test-results/test-l4-c-4faae006-py-test-return-path-is-kept-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-a76b8eac | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in and sign-out buttons are keyboard reachable | uncovered | - | test_m1_sign_in::test_c_a76b8eac_the_sign_in_and_sign_out_buttons_are_keyboard_reachable[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.03 | `e2e/test_l4_c_a76b8eac.py`, `test-results/test-l4-c-a76b8eac-py-test-sign-in-and-sign-out-buttons-are-keyboard-reachable-chromium/test-failed-1.png`, `test-results/test-l4-c-a76b8eac-py-test-sign-in-and-sign-out-buttons-are-keyboard-reachable-chromium/trace.zip`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/conftest.py` |  | relevant | named in the spec |
| `e2e/test_m1_sign_in.py` |  | relevant | new test file |
| `openspec/changes/add-web-sign-in-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in-fix-2/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in-fix-2/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in-fix-2/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in-fix-2/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in-fix-2/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/.l4/ledger/r-20261030T0247Z-7d77.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/.l4/ledger/r-20261030T0434Z-57e9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/.l4/ledger/r-20261030T1921Z-1d9a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/verification.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/e2e-stack/control.seed.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/control.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/parts/27-tenant-b.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/seed-data.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/seed-data.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/stack.db.test.ts` |  | relevant | named in the spec |
| `test/support/e2e-stack/stack.seed.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/stack.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/tenant-b-part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/tenant-b-part.ts` | test | relevant | named in the spec |
| `web/src/app/Shell.tsx` | web | relevant | named in the spec |
| `web/src/auth/AccountMenu.tsx` | web | relevant | named in the spec |
| `web/src/auth/SignInPage.tsx` | web | relevant | named in the spec |
| `web/src/auth/account.test.ts` |  | relevant | new test file |
| `web/src/auth/account.ts` | web | relevant | named in the spec |
| `web/src/auth/auth-css.test.ts` |  | relevant | new test file |
| `web/src/auth/auth.css` | web | relevant | named in the spec |
| `web/src/auth/browser-session.ts` | web | relevant | named in the spec |
| `web/src/auth/messages.test.ts` |  | relevant | new test file |
| `web/src/auth/messages.ts` | web | relevant | named in the spec |
| `web/src/auth/return-to.test.ts` |  | relevant | new test file |
| `web/src/auth/return-to.ts` | web | relevant | named in the spec |
| `web/src/auth/session-client.test.ts` |  | relevant | new test file |
| `web/src/auth/session-client.ts` | web | relevant | named in the spec |
| `web/src/auth/session-fetch.test.ts` |  | relevant | new test file |
| `web/src/auth/session-fetch.ts` | web | relevant | named in the spec |
| `web/src/auth/sign-in-page.test.ts` |  | relevant | new test file |
| `web/src/auth/sign-in-page.ts` | web | relevant | named in the spec |
| `web/src/auth/sign-out.test.ts` |  | relevant | new test file |
| `web/src/auth/sign-out.ts` | web | relevant | named in the spec |
| `web/src/auth/use-session.ts` | web | relevant | named in the spec |
| `web/src/features/15-sign-in.tsx` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/support/e2e-stack/control.ts, test/support/e2e-stack/parts/27-tenant-b.ts, test/support/e2e-stack/seed-data.ts, test/support/e2e-stack/stack.ts, test/support/e2e-stack/tenant-b-part.ts and 13 more

### Tests

985 of 985 passed, 0 failed, 0 errored, 0 skipped.
33 of 33 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-01e427f8 | not_testable | - | - | - | 1 | The criterion checks internal module functions (registerSignInMessages, messageFor, catalogue order and lengths) that are not exposed to the browser UI; only partial message text is user-visible on the sign-in page, so the full criterion cannot be asserted through the web interface. | - |
| C-e78811f4 | not_testable | - | - | - | 1 | The criterion asserts the exact contents of the internal SIGN_IN_MESSAGES export; via the browser only 10 of the 12 texts can surface (OIDC_CSRF_INVALID and OIDC_NOT_CONFIGURED are not accepted by the sign-in page and fall back), so the full twelve-entry catalogue is not observable through the UI. | - |
| C-cef4634b | not_testable | - | - | - | 1 | The criterion asserts exact outputs of pure helper functions (loginUrl/signInUrl) for arbitrary hostile inputs; these values are not observable through the browser UI, which only exposes a single sign-in link/href. | - |
| C-23a4ce1e | accepted | e2e/test_l4_c_23a4ce1e.py | fail | pass | 1 | support: base | - |
| C-22c98964 | fails_at_head | e2e/test_l4_c_22c98964.py | fail | fail | 2 | the test fails at the head: test_l4_c_22c98964::test_external_return_to_is_refused[chromium], test_l4_c_22c98964::test_failed_session_offers_sign_in_to_root[chromium], test_l4_c_22c98964::test_html_error_code_shows_unknown_error[chromium]; support: base | test-results/test-l4-c-22c98964-py-test-external-return-to-is-refused-chromium/test-failed-1.png, test-results/test-l4-c-22c98964-py-test-external-return-to-is-refused-chromium/trace.zip, test-results/test-l4-c-22c98964-py-test-failed-session-offers-sign-in-to-root-chromium/test-failed-1.png, test-r... |
| C-023c2efe | not_testable | - | - | - | 1 | This criterion tests internal JavaScript function behavior (withCsrfHeader wrapping a recording fetch, isStateChanging) at the unit level; it is not observable through the browser UI that an e2e Playwright test can assert. | - |
| C-5368eb23 | not_testable | - | - | - | 1 | The scenario checks injected fakes (fake fetch records, recording location.assign counts, csrfTokenFrom returns) of internal session-client functions, none of which are observable through the app UI at L4_E2E_BASE_URL. | - |
| C-3809dcd7 | not_testable | - | - | - | 1 | The criterion covers internal withSessionEnd wrapper semantics against fakes (onEnded counting, response codes), which is not observable through the browser UI that a Playwright e2e test can drive. | - |
| C-b4adf358 | not_testable | - | - | - | 1 | The criterion checks an internal pure function (redirectToSignIn) with a mocked recording location.assign across four synthetic location objects; this behavior is not exposed on window nor observable through the browser UI in an e2e test. | - |
| C-eb130cb7 | not_testable | - | - | - | 1 | The criterion asserts pure-function results for a fixed safeRedirect input list and an exact loader.reset() call count behind a mocked loader; these are internal unit behaviors with no browser-observable surface for a playwright e2e test to drive. | - |
| C-4b09fc8c | not_testable | - | - | - | 1 | The criterion asserts internal call counts and ordering (post twice, reset before load) and the exact return value of signOut, which are unit-level behaviors not observable through the browser UI or network alone. | - |
| C-77971a2d | not_testable | - | - | - | 1 | The criterion checks the internal return-value shapes of browserSession.signOut() and loader reset call counts, which are not observable through the browser UI; a Playwright e2e test can only see toasts or navigation, not those result objects. | - |
| C-e3de8f9e | accepted | e2e/test_l4_c_e3de8f9e.py | fail | pass | 1 | support: base | - |
| C-53df20c1 | not_testable | - | - | - | 1 | The criterion is a static source-scan check (raw colours, kit tokens, inline styles in auth.css and .tsx files) with no user-observable browser outcome to assert via the public interface. | - |
| C-96e3a4f2 | accepted | e2e/test_l4_c_96e3a4f2.py | fail | pass | 1 | support: base | - |
| C-c79d9365 | not_testable | - | - | - | 1 | The criterion covers Node-side collectSeedData merging/error behavior, which is not observable through the browser page the e2e test must drive. | - |
| C-812ae263 | not_testable | - | - | - | 1 | The criterion describes server-side seeding and tenant-resolution functions (oidcPart.seed, tenantBPart.seed, ensureDefaultTenant, resolveTenantForToken) run against withTestDatabase, which are not observable through a browser UI via playwright; it cannot be checked as a browser e2e test. | - |
| C-c1ed19d8 | not_testable | - | - | - | 1 | The criterion asserts server-side seed data (stored passwords equal to fake.passwordOf, handle.env == {}, no password in any env) that is not observable through the browser UI; display name and tenant could only surface after a sign-in whose fake-IdP flow is not specified here. | - |
| C-39471a6a | not_testable | - | - | - | 1 | The criterion concerns discoverParts() ordering and a parts/27-tenant-b.ts file export, which are build/harness file-system details not observable through the browser UI. | - |
| C-bf32f3ba | not_testable | e2e/test_l4_c_bf32f3ba.py | - | - | 2 | The control listener binds its own ephemeral port outside the L4_E2E_BASE_URL origin, and a browser page/request cannot forge the Host header or Origin, so these cases cannot be reached through the public e2e interface. | - |
| C-79192192 | writer_failed | - | - | - | 1 | the stream ended without a final stop (last reason: length) | - |
| C-ee431615 | accepted | e2e/test_l4_c_ee431615.py | fail | pass | 1 | support: base | - |
| C-d115a25a | writer_failed | - | - | - | 1 | no answer within 600s | - |
| C-a699ddc9 | fails_at_head | e2e/test_l4_c_a699ddc9.py | fail | fail | 2 | the test fails at the head: test_l4_c_a699ddc9::test_two_tenants_stay_apart[chromium]; support: base | test-results/test-l4-c-a699ddc9-py-test-two-tenants-stay-apart-chromium/test-failed-1.png, test-results/test-l4-c-a699ddc9-py-test-two-tenants-stay-apart-chromium/trace.zip |
| C-c3f18eb0 | uncollectable | e2e/test_l4_c_c3f18eb0.py | fail | - | 2 | the app does not start without the unit's test and support files (reverted: e2e/conftest.py) | - |
| C-67c1baa1 | writer_failed | e2e/test_l4_c_67c1baa1.py | - | - | 2 | opencode's permission rules rejected a tool call (bash) | - |
| C-6e84f9b2 | fails_at_head | e2e/test_l4_c_6e84f9b2.py | fail | fail | 2 | the test fails at the head: test_l4_c_6e84f9b2::test_logout_without_csrf_header_is_refused[chromium]; support: base | test-results/test-l4-c-6e84f9b2-py-test-logout-without-csrf-header-is-refused-chromium/test-failed-1.png, test-results/test-l4-c-6e84f9b2-py-test-logout-without-csrf-header-is-refused-chromium/trace.zip |
| C-4faae006 | fails_at_head | e2e/test_l4_c_4faae006.py | fail | fail | 2 | the test fails at the head: test_l4_c_4faae006::test_return_path_is_kept[chromium]; support: base | test-results/test-l4-c-4faae006-py-test-return-path-is-kept-chromium/test-failed-1.png, test-results/test-l4-c-4faae006-py-test-return-path-is-kept-chromium/trace.zip |
| C-a76b8eac | fails_at_head | e2e/test_l4_c_a76b8eac.py | fail | fail | 2 | the test fails at the head: test_l4_c_a76b8eac::test_sign_in_and_sign_out_buttons_are_keyboard_reachable[chromium]; support: base | test-results/test-l4-c-a76b8eac-py-test-sign-in-and-sign-out-buttons-are-keyboard-reachable-chromium/test-failed-1.png, test-results/test-l4-c-a76b8eac-py-test-sign-in-and-sign-out-buttons-are-keyboard-reachable-chromium/trace.zip |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-01e427f8 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e78811f4 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cef4634b | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23a4ce1e | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-22c98964 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-023c2efe | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5368eb23 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3809dcd7 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b4adf358 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eb130cb7 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4b09fc8c | ok | 0.470 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-77971a2d | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e3de8f9e | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-53df20c1 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-96e3a4f2 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c79d9365 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-812ae263 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c1ed19d8 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-39471a6a | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bf32f3ba | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-79192192 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ee431615 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d115a25a | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a699ddc9 | ok | 0.030 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3f18eb0 | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-67c1baa1 | ok | 0.030 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6e84f9b2 | ok | 0.050 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4faae006 | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a76b8eac | ok | 0.030 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-c79d9365 | skipped | - | - | cap |
| C-53df20c1 | skipped | - | - | cap |
| C-023c2efe | skipped | - | - | cap |
| C-77971a2d | skipped | - | - | cap |
| C-23a4ce1e | rejected | e2e/test_l4_audit_c_23a4ce1e_r3.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_23a4ce1e_r3.py |
| C-e78811f4 | rejected | e2e/test_l4_audit_c_e78811f4_r3.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_e78811f4_r3.py |

## Rejected audit tests

- C-23a4ce1e: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_23a4ce1e_r3.py
- C-e78811f4: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_e78811f4_r3.py

## Answers to verdict questions

- Q-002 accept C-d115a25a by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-d115a25a runs login(page, users["alice"]) inside page.expect_response for the 200 answer of /api/v1/me, asserts that the answer's capabilities contain read_self, that the banner contains "Signed in as Alice Example" and "Tenant: E2E ten...
- Q-003 accept C-a699ddc9 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-a699ddc9 signs alice in on the fixture page, opens a second browser.new_context with the same base URL, signs mallory in on a page of that context, and asserts that mallory's banner contains users["mallory"]["displayName"] and "Tenant B...
- Q-004 accept C-c3f18eb0 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-c3f18eb0 opens a playwright.request.new_context on the base URL, sends GET /api/v1/me with no cookie, and asserts that the status is 401 and that the body's error.code is UNAUTHENTICATED: every clause of the scenario, word for word. The...
- Q-005 accept C-67c1baa1 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-67c1baa1 signs alice in, clicks the "Sign out" button inside the banner, then asserts that the button "Sign in" (exact name) is visible, that the path of the page URL is /sign-in, and that page.request.get("/api/v1/me") answers 401: eve...
- Q-006 accept C-6e84f9b2 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-6e84f9b2 signs alice in, sends page.request.post("/auth/oidc/logout") with no header, asserts that the status is 403 and that the body's error.code is OIDC_CSRF_INVALID, then reloads the page and asserts that the banner still contains "...
- Q-007 accept C-4faae006 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-4faae006 calls login(page, users["alice"], "/sign-in?error=SESSION_ENDED&return_to=%2Fflows"), waits until the page URL's path is /flows, and asserts that the banner contains "Alice Example": every clause of the scenario, word for word....
- Q-008 accept C-a76b8eac by agent (CLAUDECODE): Checked against the scenario step by step: e2e/test_m1_sign_in.py::test_c_a76b8eac_the_sign_in_and_sign_out_buttons_are_keyboard_reachable (marked @pytest.mark.l4("C-a76b8eac")) on /sign-in signed out, presses Tab up to 15 times until "Sign in" (exact) is focused and asserts outlineStyle not none an...
- Q-009 accept H-545ec45b by the delegate (claude-fable-5-1 via claude-code): The hold may be waived: criterion C-01e427f8 is not a browser criterion. Its scenario calls registerSignInMessages twice and messageFor for each code of SIGN_IN_ERROR_CODES, checks the order of the ten codes, the pairwise distinct texts of 1 to 200 characters, that each answer equals its SIGN_IN_MES...
- Q-010 accept H-e3f87d2a by agent (CLAUDECODE): C-e78811f4's scenario checks the exact twelve entries of SIGN_IN_MESSAGES, two of which the sign-in page never shows; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/messages.test.ts C-e78811f4 traces it with a red-assertion proof and passes at h...
- Q-011 accept H-2023e80e by agent (CLAUDECODE): C-cef4634b's scenario checks the return values of loginUrl and signInUrl for hostile inputs; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/return-to.test.ts C-cef4634b traces it with a red-assertion proof and passes at head. The e2e and unit ga...
- Q-012 accept H-d7fe3aa5 by agent (CLAUDECODE): C-22c98964's scenario checks the six return values of the pure function signInView; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/sign-in-page.test.ts C-22c98964 traces it with a red-assertion proof and passes at head. The e2e and unit gates pa...
- Q-013 accept H-2135a2da by agent (CLAUDECODE): C-023c2efe's scenario checks withCsrfHeader around a recording fetch and isStateChanging; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/session-fetch.test.ts C-023c2efe traces it with a red-assertion proof and passes at head. The e2e and unit g...
- Q-014 accept H-8928b203 by agent (CLAUDECODE): C-5368eb23's scenario checks createBrowserSession against a fake fetch, a fake loader and a recording location; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/session-client.test.ts C-5368eb23 traces it with a red-assertion proof and passes at h...
- Q-015 accept H-f279e66d by agent (CLAUDECODE): C-3809dcd7's scenario checks withSessionEnd around a fake fetch and the number of onEnded calls; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/session-fetch.test.ts C-3809dcd7 traces it with a red-assertion proof and passes at head. The e2e and...
- Q-016 accept H-aa40376f by agent (CLAUDECODE): C-b4adf358's scenario checks redirectToSignIn over four synthetic locations with a recording assign; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/return-to.test.ts C-b4adf358 traces it with a red-assertion proof and passes at head. The e2e and...
- Q-017 accept H-bede43a4 by agent (CLAUDECODE): C-eb130cb7's scenario checks safeRedirect over a fixed input list and the loader.reset count of signOut; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/sign-out.test.ts C-eb130cb7 traces it with a red-assertion proof and passes at head. The e2e ...
- Q-018 accept H-499b792b by agent (CLAUDECODE): C-4b09fc8c's scenario checks the post count, the reset-before-load order and the result of signOut against a fake post; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/sign-out.test.ts C-4b09fc8c traces it with a red-assertion proof and passes at...
- Q-019 accept H-9f7f3848 by agent (CLAUDECODE): C-77971a2d's scenario checks the result objects of signOut for four rejections and the reset count; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/sign-out.test.ts C-77971a2d traces it with a red-assertion proof and passes at head. The e2e and u...
- Q-020 accept H-ad0fc545 by agent (CLAUDECODE): C-53df20c1's scenario checks a static scan of auth.css and the .tsx files for raw colours, kit tokens and inline styles; that is a unit-level check with no browser-observable form as written, and its unit test web/src/auth/auth-css.test.ts C-53df20c1 traces it with a red-assertion proof and passes a...
- Q-021 accept H-74d8aa3c by agent (CLAUDECODE): C-c79d9365's scenario checks collectSeedData over fake part handles in Node; that is a unit-level check with no browser-observable form as written, and its unit test test/support/e2e-stack/seed-data.test.ts C-c79d9365 (two tests) traces it with a red-assertion proof and passes at head. The e2e and u...
- Q-022 accept H-a83fac20 by agent (CLAUDECODE): C-812ae263's scenario checks the seeds of the oidc and tenant-b parts, ensureDefaultTenant and resolveTenantForToken on withTestDatabase; that is a unit-level check with no browser-observable form as written, and its unit test test/support/e2e-stack/tenant-b-part.test.ts C-812ae263 traces it with a ...
- Q-023 accept H-39317e01 by agent (CLAUDECODE): C-c1ed19d8's scenario checks seedUsersOf against the fake, handle.env and the absence of passwords in env; that is a unit-level check with no browser-observable form as written, and its unit test test/support/e2e-stack/tenant-b-part.test.ts C-c1ed19d8 traces it with a red-assertion proof and passes ...
- Q-024 accept H-b94b73e6 by agent (CLAUDECODE): C-39471a6a's scenario checks the order of discoverParts() and the text of parts/27-tenant-b.ts; that is a unit-level check with no browser-observable form as written, and its unit test test/support/e2e-stack/tenant-b-part.test.ts C-39471a6a traces it with a red-assertion proof and passes at head. Th...
- Q-025 accept H-10718ca8 by agent (CLAUDECODE): C-bf32f3ba's scenario checks the control listener's answers to a forged Host, an Origin header and wrong methods, which a page on the app's origin cannot send; that is a unit-level check with no browser-observable form as written, and its unit test test/support/e2e-stack/control.seed.test.ts C-bf32f...
- Q-026 accept H-82663866 by agent (CLAUDECODE): C-79192192's scenario checks the real stack's sign-in route, completeFakeLogin and API answers driven from Node; that is a unit-level check with no browser-observable form as written, and its unit test test/support/e2e-stack/stack.seed.test.ts C-79192192 traces it with a red-assertion proof and pass...
- Q-027 accept H-836c11cc by agent (CLAUDECODE): C-d115a25a has an end-to-end test that passes at head: e2e/test_m1_sign_in.py traces it by its l4 marker and does what the scenario says (see the verdict question of C-d115a25a). Step 5's writer gave no answer within 600s, so no generated test exists. The e2e and unit gates passed at head 601ca1f (9...
- Q-028 accept H-8f91a4e8 by agent (CLAUDECODE): C-a699ddc9 has an end-to-end test that passes at head: e2e/test_m1_sign_in.py traces it by its l4 marker and does what the scenario says (see the verdict question of C-a699ddc9). The generated test of step 5 fails for its own reason: after clicking "Sign in" it never fills the fake provider's "Usern...
- Q-029 accept H-f0134794 by agent (CLAUDECODE): C-c3f18eb0 has an end-to-end test that passes at head: e2e/test_m1_sign_in.py traces it by its l4 marker and does what the scenario says (see the verdict question of C-c3f18eb0). Step 5's test was uncollectable without this unit's e2e/conftest.py. The e2e and unit gates passed at head 601ca1f (985 o...
- Q-030 accept H-6e0d90dd by agent (CLAUDECODE): C-67c1baa1 has an end-to-end test that passes at head: e2e/test_m1_sign_in.py traces it by its l4 marker and does what the scenario says (see the verdict question of C-67c1baa1). Step 5's writer was stopped by opencode's permission rules, so no generated test exists. The e2e and unit gates passed at...
- Q-031 accept H-37f34a81 by agent (CLAUDECODE): C-6e84f9b2 has an end-to-end test that passes at head: e2e/test_m1_sign_in.py traces it by its l4 marker and does what the scenario says (see the verdict question of C-6e84f9b2). The generated test of step 5 fails for its own reason: after clicking "Sign in" it never fills the fake provider's "Usern...
- Q-032 accept H-7cb33059 by agent (CLAUDECODE): C-4faae006 has an end-to-end test that passes at head: e2e/test_m1_sign_in.py traces it by its l4 marker and does what the scenario says (see the verdict question of C-4faae006). The generated test of step 5 fails for its own reason: after clicking "Sign in" it never fills the fake provider's "Usern...
- Q-033 accept H-7c2702b1 by agent (CLAUDECODE): C-a76b8eac has an end-to-end test that passes at head: e2e/test_m1_sign_in.py traces it by its l4 marker and does what the scenario says (see the verdict question of C-a76b8eac). The generated test of step 5 fails for its own reason: after clicking "Sign in" it never fills the fake provider's "Usern...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
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
| C-d115a25a | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Alice signs in and the header shows user and tenant | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-d115a25a runs login(page, users["alice"]) inside page.expect_response for the 200 answer of /api/v1/me, asserts that the answer's capabilities contain read_self, that the bann... |
| C-a699ddc9 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Two tenants stay apart | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-a699ddc9 signs alice in on the fixture page, opens a second browser.new_context with the same base URL, signs mallory in on a page of that context, and asserts that mallory's ... |
| C-c3f18eb0 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A request without a session is unauthenticated | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-c3f18eb0 opens a playwright.request.new_context on the base URL, sends GET /api/v1/me with no cookie, and asserts that the status is 401 and that the body's error.code is UNAU... |
| C-67c1baa1 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Sign out ends the session | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-67c1baa1 signs alice in, clicks the "Sign out" button inside the banner, then asserts that the button "Sign in" (exact name) is visible, that the path of the page URL is /sign... |
| C-6e84f9b2 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A post without the CSRF header is refused | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-6e84f9b2 signs alice in, sends page.request.post("/auth/oidc/logout") with no header, asserts that the status is 403 and that the body's error.code is OIDC_CSRF_INVALID, then ... |
| C-4faae006 | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The return path is kept | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for C-4faae006 calls login(page, users["alice"], "/sign-in?error=SESSION_ENDED&return_to=%2Fflows"), waits until the page URL's path is /flows, and asserts that the banner contains ... |
| C-a76b8eac | web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in and sign-out buttons are keyboard reachable | pass | pass | accepted by agent (CLAUDECODE): Checked against the scenario step by step: e2e/test_m1_sign_in.py::test_c_a76b8eac_the_sign_in_and_sign_out_buttons_are_keyboard_reachable (marked @pytest.mark.l4("C-a76b8eac")) on /sign-in signed out, presses Tab up to 15 times until "Sign in" (exact) is focused and ... |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-ee431615): test_m1_sign_in::test_c_ee431615_the_sign_in_page_shows_the_error_and_is_accessible[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-d115a25a): test_m1_sign_in::test_c_d115a25a_alice_signs_in_and_the_header_shows_user_and_tenant[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-a699ddc9): test_m1_sign_in::test_c_a699ddc9_two_tenants_stay_apart[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c3f18eb0): test_m1_sign_in::test_c_c3f18eb0_a_request_without_a_session_is_unauthenticated: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-67c1baa1): test_m1_sign_in::test_c_67c1baa1_sign_out_ends_the_session[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-6e84f9b2): test_m1_sign_in::test_c_6e84f9b2_a_post_without_the_csrf_header_is_refused[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-4faae006): test_m1_sign_in::test_c_4faae006_the_return_path_is_kept[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-a76b8eac): test_m1_sign_in::test_c_a76b8eac_the_sign_in_and_sign_out_buttons_are_keyboard_reachable[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] an audit test was rejected (criterion C-23a4ce1e): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_23a4ce1e_r3.py
- [minor, deterministic] an audit test was rejected (criterion C-e78811f4): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_e78811f4_r3.py
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-01e427f8): No end-to-end test traces criterion C-01e427f8 (web-auth › Every sign-in error code has one text › Every code has a text); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e78811f4): No end-to-end test traces criterion C-e78811f4 (web-auth › Every sign-in error code has one text › The texts); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-cef4634b): No end-to-end test traces criterion C-cef4634b (web-auth › The return path survives the sign-in round trip › Login and sign-in URLs); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-23a4ce1e): No end-to-end test traces criterion C-23a4ce1e (web-auth › The return path survives the sign-in round trip › Search parsing); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-22c98964): No end-to-end test traces criterion C-22c98964 (web-auth › The sign-in page offers one Sign in button and shows why a sign-in failed › The sign-in page decides its state); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-023c2efe): No end-to-end test traces criterion C-023c2efe (web-auth › The CSRF header is added only to same-origin state-changing requests › The CSRF header is added only to same-origin state-changing requests); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5368eb23): No end-to-end test traces criterion C-5368eb23 (web-auth › The CSRF header is added only to same-origin state-changing requests › The session client sends the token and leaves on a dead session); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3809dcd7): No end-to-end test traces criterion C-3809dcd7 (web-auth › A dead session sends the user to sign in › A 401 envelope ends the session once); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b4adf358): No end-to-end test traces criterion C-b4adf358 (web-auth › A dead session sends the user to sign in › A dead session sends the user to sign in); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-eb130cb7): No end-to-end test traces criterion C-eb130cb7 (web-auth › Sign out ends the session and follows the provider's redirect › Sign out follows only a safe redirect); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4b09fc8c): No end-to-end test traces criterion C-4b09fc8c (web-auth › Sign out ends the session and follows the provider's redirect › Sign out refreshes a stale token once); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-77971a2d): No end-to-end test traces criterion C-77971a2d (web-auth › Sign out ends the session and follows the provider's redirect › Sign out reports what failed); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e3de8f9e): No end-to-end test traces criterion C-e3de8f9e (web-auth › The header shows the user and tenant and offers Sign out › The header shows the user and tenant and offers Sign out); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-53df20c1): No end-to-end test traces criterion C-53df20c1 (web-auth › The header shows the user and tenant and offers Sign out › The stylesheet follows the kit rules); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-96e3a4f2): No end-to-end test traces criterion C-96e3a4f2 (web-auth › The header shows the user and tenant and offers Sign out › The earlier journeys still pass); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c79d9365): No end-to-end test traces criterion C-c79d9365 (web-auth › The e2e stack seeds tenant B and the browser users › Seed data is merged from the parts that offer it); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-812ae263): No end-to-end test traces criterion C-812ae263 (web-auth › The e2e stack seeds tenant B and the browser users › Tenant B is created and its organisation provisioned); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c1ed19d8): No end-to-end test traces criterion C-c1ed19d8 (web-auth › The e2e stack seeds tenant B and the browser users › Seed users come from the fake); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-39471a6a): No end-to-end test traces criterion C-39471a6a (web-auth › The e2e stack seeds tenant B and the browser users › The tenant-b part is discovered after the oidc part); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-bf32f3ba): No end-to-end test traces criterion C-bf32f3ba (web-auth › The e2e stack seeds tenant B and the browser users › The control listener serves seed data to the test process only); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-79192192): No end-to-end test traces criterion C-79192192 (web-auth › The e2e stack seeds tenant B and the browser users › Alice and mallory see their own tenant through the real engine); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ee431615): The end-to-end test test_m1_sign_in::test_c_ee431615_the_sign_in_page_shows_the_error_and_is_accessible[chromium] traces criterion C-ee431615 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in page shows the error and is accessible), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d115a25a): The end-to-end test test_m1_sign_in::test_c_d115a25a_alice_signs_in_and_the_header_shows_user_and_tenant[chromium] traces criterion C-d115a25a (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Alice signs in and the header shows user and tenant), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a699ddc9): The end-to-end test test_m1_sign_in::test_c_a699ddc9_two_tenants_stay_apart[chromium] traces criterion C-a699ddc9 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Two tenants stay apart), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c3f18eb0): The end-to-end test test_m1_sign_in::test_c_c3f18eb0_a_request_without_a_session_is_unauthenticated traces criterion C-c3f18eb0 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A request without a session is unauthenticated), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-67c1baa1): The end-to-end test test_m1_sign_in::test_c_67c1baa1_sign_out_ends_the_session[chromium] traces criterion C-67c1baa1 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Sign out ends the session), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-6e84f9b2): The end-to-end test test_m1_sign_in::test_c_6e84f9b2_a_post_without_the_csrf_header_is_refused[chromium] traces criterion C-6e84f9b2 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A post without the CSRF header is refused), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4faae006): The end-to-end test test_m1_sign_in::test_c_4faae006_the_return_path_is_kept[chromium] traces criterion C-4faae006 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The return path is kept), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a76b8eac): The end-to-end test test_m1_sign_in::test_c_a76b8eac_the_sign_in_and_sign_out_buttons_are_keyboard_reachable[chromium] traces criterion C-a76b8eac (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in and sign-out buttons are keyboard reachable), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] Harness UI tests still fail at head (criterion C-22c98964): The gate report lists the generated UI tests for C-22c98964, C-a699ddc9, C-6e84f9b2, C-4faae006 and C-a76b8eac as fails_at_head while the e2e gate and the M1 journey tests pass. The committed code and the M1 tests satisfy the criteria; the discrepancy is in the generated tests, not the implementation.
- [minor, judge] accountView lacks the accountView contract test for the signed_in continue path in the UI: The accountView node test covers the pure view but the generated browser test for C-e3de8f9e is the only UI proof; the AccountMenu markup is only covered through the M1 journey. This is an observation, not a defect.
- [minor, judge] seedUsersOf also rejects an empty-string name claim (spec gap) (criterion C-c1ed19d8): The task and criterion specify STACK_PART_INVALID only when the minted id token's name claim is missing or not a string. displayNameOf additionally throws when the claim is the empty string (name.length === 0), which two reasonable implementations could treat either as a valid (if odd) display name or as invalid; the scenario does not pin this input down.

## New tests (red then green, `task.red_ok` in the ledger)

- `test.support.e2e-stack.control.seed.test.ts::C-bf32f3ba a missing seedData answers 404 and a throwing seedData answers 500 without the secret` (task 4.3): passed
- `test.support.e2e-stack.control.seed.test.ts::C-bf32f3ba the seed route answers the JSON of seedData on the loopback control listener` (task 4.3): passed
- `test.support.e2e-stack.control.seed.test.ts::C-bf32f3ba the seed route is guarded like reset for Host Origin method and unknown routes` (task 4.3): passed
- `test.support.e2e-stack.seed-data.test.ts::C-c79d9365 seed data merges only the parts that offer seedData into a new object` (task 4.1): passed
- `test.support.e2e-stack.seed-data.test.ts::C-c79d9365 seed data rejects a seedData result that is not a plain object` (task 4.1): passed
- `test.support.e2e-stack.seed-data.test.ts::C-c79d9365 seed data rejects a top-level key offered twice` (task 4.1): passed
- `test.support.e2e-stack.seed-data.test.ts::C-c79d9365 seed data wraps a throwing seedData in a part failure` (task 4.1): passed
- `test.support.e2e-stack.stack.seed.test.ts::C-79192192: alice and mallory see their own tenant through the real engine` (task 4.4): passed
- `test.support.e2e-stack.tenant-b-part.test.ts::C-39471a6a the tenant-b part is discovered after the oidc part` (task 4.2): passed
- `test.support.e2e-stack.tenant-b-part.test.ts::C-812ae263 tenant B is created and its organisation provisioned` (task 4.2): passed
- `test.support.e2e-stack.tenant-b-part.test.ts::C-c1ed19d8 seed users come from the fake` (task 4.2): passed
- `web.src.auth.account.test.ts::C-e3de8f9e header shows the user and tenant and offers sign out` (task 3.1): passed
- `web.src.auth.auth-css.test.ts::C-53df20c1 stylesheet follows the kit rules` (task 3.1): passed
- `web.src.auth.messages.test.ts::C-01e427f8 every code has a text` (task 1.1): passed
- `web.src.auth.messages.test.ts::C-e78811f4 the texts` (task 1.1): passed
- `web.src.auth.return-to.test.ts::C-23a4ce1e search parsing` (task 1.2): passed
- `web.src.auth.return-to.test.ts::C-b4adf358 a dead session sends the user to sign in` (task 1.2): passed
- `web.src.auth.return-to.test.ts::C-cef4634b login and sign-in URLs` (task 1.2): passed
- `web.src.auth.session-client.test.ts::C-5368eb23 the session client sends the token and leaves on a dead session` (task 2.3): passed
- `web.src.auth.session-fetch.test.ts::C-023c2efe the CSRF header is added only to same-origin state-changing requests` (task 2.1): passed
- `web.src.auth.session-fetch.test.ts::C-3809dcd7 a 401 envelope ends the session once` (task 2.1): passed
- `web.src.auth.sign-in-page.test.ts::C-22c98964 the sign-in page decides its state` (task 3.2): passed
- `web.src.auth.sign-out.test.ts::C-4b09fc8c sign out refreshes a stale token once` (task 2.2): passed
- `web.src.auth.sign-out.test.ts::C-77971a2d sign out reports what failed` (task 2.2): passed
- `web.src.auth.sign-out.test.ts::C-eb130cb7 sign out follows only a safe redirect` (task 2.2): passed

## Guard events

- guard.test_tamper: e2e/test_m1_sign_in.py
- guard.test_tamper: e2e/test_m1_sign_in.py
- guard.test_tamper: e2e/test_m1_sign_in.py
