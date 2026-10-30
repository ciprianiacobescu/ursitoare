# Verification: openspec:add-web-sign-in: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `9dbc21eb8ded038c8fe75330591aa547d831d160`
- Head: `b35997b1aae2e62ba4c5a5c213153ea4376a8048`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: mimo-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@9dbc21eb8d contained |
| 1 | integrity | ok | 70.3 | 10 sub-checks; scope: 38 changed file(s) |
| 2 | build | ok | 23.3 |  |
| 3 | tests | failed | 168.4 | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m1_sign_in::test_c_4faae006_the_return_path_is_kept[chromium], test_m1_sign_in::test_c_ee431615_the_sign_in_page_shows_the_error_and_is_ac... |
| 4 | traceability | not_run | 0.0 | an earlier step failed |
| 4a | audit sampling | not_run | 0.0 | an earlier step failed |
| 5 | ui test generation | not_run | 0.0 | an earlier step failed |
| 6 | quality | not_run | 0.0 | an earlier step failed |
| 8 | s1 judge | not_run | 0.0 | an earlier step failed |
| 9 | judge | not_run | 0.0 | an earlier step failed |
| 10 | aggregation | ok | 0.0 | FAIL |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261030T0434Z-57e9/063-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261030T0434Z-57e9/064-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261030T0434Z-57e9/065-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261030T0434Z-57e9/066-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261030T0434Z-57e9/067-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261030T0434Z-57e9/068-test.log |
| e2e | fail | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261030T0434Z-57e9/069-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 2 test file(s) compared with the base; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 11 task(s): red and green compared |
| test path freeze | ok | 11 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/support/e2e-stack/control.seed.test.ts, test/support/e2e-stack/control.ts, test/support/e2e-stack/parts/27-tenant-b.ts, test/support/e2e-stack/seed-data.test.ts, test/support/e2e-stack/seed-data.ts (+26 more) |
| tdd history | ok | 11 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 915 of 915 base tests pass on the unit's code with its 14 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- test/support/e2e-stack/stack.db.test.ts kept at head for the run (task 4.2: unfrozen by Q-001)

## Evidence

### Needs attention

- blocker: new tests failed: test_m1_sign_in::test_c_4faae006_the_return_path_is_kept[chromium], test_m1_sign_in::test_c_ee431615_the_sign_in_page_shows_the_error_and_is_accessible[chromium]

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/conftest.py` |  | relevant | named in the spec |
| `e2e/test_m1_sign_in.py` |  | relevant | new test file |
| `openspec/changes/add-web-sign-in/.l4/ledger/r-20261030T0247Z-7d77.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/.l4/ledger/r-20261030T0434Z-57e9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-sign-in/tasks.md` |  | none | exempt: harness, spec or documentation path |
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

982 of 985 passed, 3 failed, 0 errored, 0 skipped.
31 of 33 new tests passed.

## Criteria

None judged.

## Findings

- [blocker, deterministic] e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m1_sign_in::test_c_4faae006_the_return_path_is_kept[chromium], test_m1_sign_in::test_c_ee431615_the_sign_in_page_shows_the_error_and_is_accessible[chromium] Log: `.l4-out/gates/r-20261030T0434Z-57e9/069-e2e.log`.
- [blocker, deterministic] new tests failed: test_m1_sign_in::test_c_4faae006_the_return_path_is_kept[chromium], test_m1_sign_in::test_c_ee431615_the_sign_in_page_shows_the_error_and_is_accessible[chromium]

## Fix unit

Fix unit 1 is created for these tasks:
- F-22a9abae e2e gate failed
- F-7e9a81fb new tests failed

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
