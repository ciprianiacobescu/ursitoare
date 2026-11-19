# Verification: openspec:add-app-shell: NEEDS_HUMAN (round 4)

traceability: 10/15 criteria covered by a discriminating test

- Base: `c2129af737f8ba6b447d66d3a592f7e9089b9f2d`
- Head: `cc0bd3b5cd1f40867044ae7860ec31e2829c5c71`
- Implementer profiles: claude-sonnet, deepseek-free
- Judge: beam-judge, 1 call(s), prompt sha256 `5539427cc54e93d22e938a97086a7417773e64ae66f491e077f6dd8dde792f08`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.8 | base main@c2129af737 contained |
| 1 | integrity | ok | 258.4 | 11 sub-checks; scope: 45 changed file(s) |
| 2 | build | ok | 32.5 |  |
| 3 | tests | ok | 380.2 |  |
| 4 | traceability | ok | 0.2 | 10/15 criteria covered |
| 4a | audit sampling | ok | 32.3 | 2 not_testable, 1 skipped; support files at the base: 11 |
| 5 | ui test generation | ok | 585.2 | 2 fails_at_head, 1 writer_failed |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/app/App.tsx, web/src/app/Shell.tsx, web/src/app/nav-groups.ts, web/src/auth/AccountMenu.tsx, web/src/auth/SignInPage.tsx |
| 8 | s1 judge | ok | 1.1 | 15/15 criteria judged by jev |
| 9 | judge | ok | 86.9 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261119T1747Z-5c39/034-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261119T1747Z-5c39/035-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261119T1747Z-5c39/036-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261119T1747Z-5c39/037-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261119T1747Z-5c39/038-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261119T1747Z-5c39/039-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261119T1747Z-5c39/040-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 3 test file(s) compared with the base |
| red-green freeze | ok | 8 task(s): red and green compared |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/app/App.tsx, web/src/app/Shell.tsx, web/src/app/nav-group-map.test.ts, web/src/app/nav-groups.test.ts, web/src/app/nav-groups.ts (+8 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | ok | 3 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2543 of 2543 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_m6b_shell.py kept at head for the run (people changed it last (f673224edf, a85749f1cf, 40bb697b5d))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-e722bbf4 | web-shell › Navigation entries are grouped by a fixed map › The map covers every navigation id and nothing else | covered | web.src.app.nav-group-map.test.ts::C-e722bbf4 the group labels are fixed (passed, red_assertion); web.src.app.nav-group-map.test.ts::C-e722bbf4 the map holds exactly the ten navigation ids with their groups (passed, red_assertion) | - | 0.95 | - |
| C-4ef0679b | web-shell › Navigation entries are grouped by a fixed map › Entries are grouped, ordered and passed through | covered | web.src.app.nav-groups.test.ts::C-4ef0679b G1 carol's ten entries form three groups (passed, red_assertion); web.src.app.nav-groups.test.ts::C-4ef0679b G2 and G3 leave out empty groups (passed, red_assertion); web.src.app.nav-groups.test.ts::C-4ef0679b G5 an unknown id goes to more after build (pass... | - | 0.94 | - |
| C-b054e7d6 | web-shell › The layout is a sidebar from 1024 px and collapsed below › The width decides the layout | covered | web.src.app.shell-layout.test.ts::C-b054e7d6 shellLayout is a sidebar from 1024 px and collapsed below (passed, red_assertion) | - | 0.95 | - |
| C-ffb190b2 | web-shell › The shell holds one banner, one navigation, one main and one footer › The shell source holds the landmark, group and menu markup | covered | web.src.app.shell-sources.test.ts::C-ffb190b2 the shell source holds the landmark, group and menu markup (passed, red_assertion) | - | 0.92 | - |
| C-1577878d | web-shell › The shell holds one banner, one navigation, one main and one footer › Carol's navigation is grouped and the banner is compact | uncovered | - | test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1280-720] (no proof that it discriminates (no red, audit or generated record)); test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1366-860] (no proof that it discriminates (no red,... | 0.15 | - |
| C-14067443 | web-shell › The shell holds one banner, one navigation, one main and one footer › Alice and a signed-out visitor see fewer groups | uncovered | - | test_m6b_shell::test_alice_and_a_signed_out_visitor_see_fewer_groups[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.10 | - |
| C-2d3f3998 | web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none | uncovered | - | test_m6b_shell::test_key_stops_keep_their_ring_and_script_focus_draws_none[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.10 | - |
| C-20b4a37d | web-shell › With nobody signed in the navigation sits in the banner and there is no sidebar › The placement follows the session state | covered | web.src.app.nav-placement.test.ts::C-20b4a37d navPlacement follows the session state (passed, red_assertion); test_l4_c_20b4a37d::test_navigation_sits_in_banner_with_no_sidebar_when_signed_out[chromium] (passed, generated) | - | 0.91 | - |
| C-51d4764a | web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner | covered | web.src.auth.long-names-banner.test.ts::C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names (passed, red_assertion, inadequate) | test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800] (no proof tha... | 0.91 | - |
| C-425a9f46 | web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px | uncovered | - | test_m6b_shell::test_the_menu_folds_below_1024_px[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.14 | - |
| C-9eeb9987 | web-shell › Shell and auth stylesheets hold tokens only and a light colour scheme › The stylesheets use tokens and a light scheme | covered | web.src.app.shell-css.test.ts::C-9eeb9987 auth.css is a 24rem card that truncates (passed, red_assertion); web.src.app.shell-css.test.ts::C-9eeb9987 both stylesheets hold no raw colour and only kit tokens (passed, red_assertion); web.src.app.shell-css.test.ts::C-9eeb9987 shell.css holds a light sche... | - | 0.92 | - |
| C-2159a890 | web-shell › The sign-in and not-found pages are cards in the shell › The account, sign-in and not-found sources use the shared Button | covered | web.src.auth.auth-sources.test.ts::C-2159a890 the account, sign-in and not-found sources use the shared Button (passed, red_assertion) | - | 0.93 | - |
| C-88a078f0 | web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards | uncovered | - | test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.12 | - |
| C-c6a08479 | web-shell › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table — finding H-829dbc6c › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table | covered | web.src.auth.long-names-banner.test.ts::C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names (passed, red_assertion, inadequate) | test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800] (no proof tha... | 0.80 | `e2e/test_l4_c_c6a08479.py`, `test-results/test-l4-c-c6a08479-py-test-rejected-hold-banner-sign-out-ellipsis-chromium-1366-860/test-failed-1.png`, `test-results/test-l4-c-c6a08479-py-test-rejected-hold-banner-sign-out-ellipsis-chromium-1366-860/trace.zip`, `test-results/test-l4-c-c6a08479-py-test-re... |
| C-0cbfa992 | web-shell › The banner stays at most 72 px tall — regression 2 › the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60... | covered | web.src.auth.long-names-banner.test.ts::C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names (passed, red_assertion, inadequate) | test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800] (no proof tha... | 0.87 | `e2e/test_l4_c_0cbfa992.py`, `test-results/test-l4-c-0cbfa992-py-test-banner-stays-at-most-72px-tall-chromium-viewport0/test-failed-1.png`, `test-results/test-l4-c-0cbfa992-py-test-banner-stays-at-most-72px-tall-chromium-viewport0/trace.zip`, `test-results/test-l4-c-0cbfa992-py-test-banner-stays-at-... |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_l4_c_20b4a37d.py` |  | relevant | new test file |
| `e2e/test_long_names_banner.py` |  | relevant | new test file |
| `e2e/test_m6b_shell.py` |  | relevant | new test file |
| `openspec/changes/add-app-shell-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-2/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-2/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-2/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-2/specs/web-shell/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-2/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-3/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-3/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-3/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T0832Z-886c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T1103Z-0896.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T1244Z-189b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T1246Z-d8b6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T1403Z-ccf1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T1747Z-5c39.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/verification.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/app/App.tsx` | web | relevant | named in the spec |
| `web/src/app/Shell.tsx` | web | relevant | named in the spec |
| `web/src/app/nav-group-map.test.ts` |  | relevant | new test file |
| `web/src/app/nav-groups.test.ts` |  | relevant | new test file |
| `web/src/app/nav-groups.ts` | web | relevant | named in the spec |
| `web/src/app/nav-placement.test.ts` |  | relevant | new test file |
| `web/src/app/shell-css.test.ts` |  | relevant | new test file |
| `web/src/app/shell-layout.test.ts` |  | relevant | new test file |
| `web/src/app/shell-sources.test.ts` |  | relevant | new test file |
| `web/src/app/shell.css` | web | relevant | named in the spec |
| `web/src/auth/AccountMenu.tsx` | web | relevant | named in the spec |
| `web/src/auth/SignInPage.tsx` | web | relevant | named in the spec |
| `web/src/auth/auth-sources.test.ts` |  | relevant | new test file |
| `web/src/auth/auth.css` | web | relevant | named in the spec |
| `web/src/auth/long-names-banner.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/app/App.tsx, web/src/app/Shell.tsx, web/src/app/nav-groups.ts, web/src/auth/AccountMenu.tsx, web/src/auth/SignInPage.tsx

### Tests

2644 of 2644 passed, 0 failed, 0 errored, 0 skipped.
27 of 27 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-e722bbf4 | waived | - | - | - | 0 | waived by Q-007 | - |
| C-4ef0679b | waived | - | - | - | 0 | waived by Q-008 | - |
| C-b054e7d6 | waived | - | - | - | 0 | waived by Q-009 | - |
| C-ffb190b2 | waived | - | - | - | 0 | waived by Q-010 | - |
| C-1577878d | waived | - | - | - | 0 | waived by Q-011 | - |
| C-14067443 | waived | - | - | - | 0 | waived by Q-012 | - |
| C-2d3f3998 | waived | - | - | - | 0 | waived by Q-013 | - |
| C-425a9f46 | waived | - | - | - | 0 | waived by Q-015 | - |
| C-9eeb9987 | waived | - | - | - | 0 | waived by Q-016 | - |
| C-2159a890 | waived | - | - | - | 0 | waived by Q-017 | - |
| C-88a078f0 | waived | - | - | - | 0 | waived by Q-018 | - |
| C-51d4764a | writer_failed | - | - | - | 1 | opencode's permission rules rejected a tool call (bash) | - |
| C-c6a08479 | fails_at_head | e2e/test_l4_c_c6a08479.py | fail | fail | 2 | the test fails at the head: test_l4_c_c6a08479::test_rejected_hold_banner_sign_out_ellipsis[chromium-1366-860], test_l4_c_c6a08479::test_rejected_hold_banner_sign_out_ellipsis[chromium-900-800] | test-results/test-l4-c-c6a08479-py-test-rejected-hold-banner-sign-out-ellipsis-chromium-1366-860/test-failed-1.png, test-results/test-l4-c-c6a08479-py-test-rejected-hold-banner-sign-out-ellipsis-chromium-1366-860/trace.zip, test-results/test-l4-c-c6a08479-py-test-rejected-hold-banner-sign-out-ellips... |
| C-0cbfa992 | fails_at_head | e2e/test_l4_c_0cbfa992.py | fail | fail | 2 | the test fails at the head: test_l4_c_0cbfa992::test_banner_stays_at_most_72px_tall[chromium-viewport0], test_l4_c_0cbfa992::test_banner_stays_at_most_72px_tall[chromium-viewport1] | test-results/test-l4-c-0cbfa992-py-test-banner-stays-at-most-72px-tall-chromium-viewport0/test-failed-1.png, test-results/test-l4-c-0cbfa992-py-test-banner-stays-at-most-72px-tall-chromium-viewport0/trace.zip, test-results/test-l4-c-0cbfa992-py-test-banner-stays-at-most-72px-tall-chromium-viewport1/... |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-e722bbf4 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4ef0679b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b054e7d6 | ok | 0.950 | jev-1.13.0 | jev | - |
| C-ffb190b2 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1577878d | ok | 0.150 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-14067443 | ok | 0.100 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2d3f3998 | ok | 0.100 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-20b4a37d | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-51d4764a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-425a9f46 | ok | 0.140 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9eeb9987 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2159a890 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-88a078f0 | ok | 0.120 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c6a08479 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0cbfa992 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-0cbfa992 | skipped | - | - | cap |
| C-c6a08479 | not_testable | - | - | Measures computed pixel geometry (56 px banner, 38 px one-line button, text-overflow ellipsis cut, button right edge vs viewport) across two browser viewports; requires a real browser layout engine such as Playwright, not pytest/jsdom, and no Python module under test exists to import. |
| C-51d4764a | not_testable | - | - | The criterion measures browser/CSS layout of the React Shell banner (assert_layout banner height, scrollWidth/clientWidth, text-overflow: ellipsis, Sign out right edge) at two viewports using a Playwright page; no Python module under test or browser test header/fixtures are provided, so it cannot be |

## Answers to verdict questions

- Q-001 accept C-1577878d by the delegate (claude-fable-5-1 via claude-code): The shell as built renders carol's ten links in the asserted order and grouping, and the geometry the scenario measures follows from the tokens. The sidebar grid column is var(--ui-sidebar-width), which tokens.css sets to 15rem, so the nav is 240 px wide and main, placed in column 2, starts at x 240...
- Q-002 accept C-14067443 by the delegate (claude-fable-5-1 via claude-code): For alice the registry yields Home, Flows and Runs, navGroups leaves empty groups out, so only the Build label is rendered and no Admin or More label exists. With a 401 the capability state is signed_out, navPlacement answers inline, and Shell.tsx then renders the single nav inside the header after ...
- Q-003 accept C-2d3f3998 by agent (CLAUDECODE): verified by the owner's delegate. test_m6b_shell::test_key_stops_keep_their_ring_and_script_focus_draws_none implements every clause of the scenario (four Tab stops with an outline of at least 2 px; main after the skip link, the script-focused status and main after Dismiss with outline none; CSP lis...
- Q-005 accept C-425a9f46 by agent (CLAUDECODE): verified by the owner's delegate. test_the_menu_folds_below_1024_px implements every clause of the scenario: at 1023 Menu is visible with aria-expanded false and there are 0 navigations; at 1024 it is hidden and there is 1, with id main-nav; at 900 it opens and closes, assert_layout and assert_acces...
- Q-006 accept C-88a078f0 by agent (CLAUDECODE): verified by the owner's delegate. test_sign_in_and_not_found_render_as_centred_cards asserts every clause of the scenario. Delegate commit 40bb697b made only the heading locator exact; no assertion was loosened. It passes at head 46b3bf4a locally and in the round-2 CI e2e gate, and it fails at base ...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-e722bbf4 | web-shell › Navigation entries are grouped by a fixed map › The map covers every navigation id and nothing else | pass | pass | the judge passed it and a discriminating test passes |
| C-4ef0679b | web-shell › Navigation entries are grouped by a fixed map › Entries are grouped, ordered and passed through | pass | pass | the judge passed it and a discriminating test passes |
| C-b054e7d6 | web-shell › The layout is a sidebar from 1024 px and collapsed below › The width decides the layout | pass | pass | the judge passed it and a discriminating test passes |
| C-ffb190b2 | web-shell › The shell holds one banner, one navigation, one main and one footer › The shell source holds the landmark, group and menu markup | pass | pass | the judge passed it and a discriminating test passes |
| C-1577878d | web-shell › The shell holds one banner, one navigation, one main and one footer › Carol's navigation is grouped and the banner is compact | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The shell as built renders carol's ten links in the asserted order and grouping, and the geometry the scenario measures follows from the tokens. The sidebar grid column is var(--ui-sidebar-width), which tokens.css sets to 15rem, so the nav... |
| C-14067443 | web-shell › The shell holds one banner, one navigation, one main and one footer › Alice and a signed-out visitor see fewer groups | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): For alice the registry yields Home, Flows and Runs, navGroups leaves empty groups out, so only the Build label is rendered and no Admin or More label exists. With a 401 the capability state is signed_out, navPlacement answers inline, and S... |
| C-2d3f3998 | web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none | pass | pass | accepted by agent (CLAUDECODE): verified by the owner's delegate. test_m6b_shell::test_key_stops_keep_their_ring_and_script_focus_draws_none implements every clause of the scenario (four Tab stops with an outline of at least 2 px; main after the skip link, the script-focused status and main after Di... |
| C-20b4a37d | web-shell › With nobody signed in the navigation sits in the banner and there is no sidebar › The placement follows the session state | pass | pass | the judge passed it and a discriminating test passes |
| C-51d4764a | web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-425a9f46 | web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px | pass | pass | accepted by agent (CLAUDECODE): verified by the owner's delegate. test_the_menu_folds_below_1024_px implements every clause of the scenario: at 1023 Menu is visible with aria-expanded false and there are 0 navigations; at 1024 it is hidden and there is 1, with id main-nav; at 900 it opens and closes... |
| C-9eeb9987 | web-shell › Shell and auth stylesheets hold tokens only and a light colour scheme › The stylesheets use tokens and a light scheme | pass | pass | the judge passed it and a discriminating test passes |
| C-2159a890 | web-shell › The sign-in and not-found pages are cards in the shell › The account, sign-in and not-found sources use the shared Button | pass | pass | the judge passed it and a discriminating test passes |
| C-88a078f0 | web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards | pass | pass | accepted by agent (CLAUDECODE): verified by the owner's delegate. test_sign_in_and_not_found_render_as_centred_cards asserts every clause of the scenario. Delegate commit 40bb697b made only the heading locator exact; no assertion was loosened. It passes at head 46b3bf4a locally and in the round-2 CI... |
| C-c6a08479 | web-shell › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table — finding H-829dbc6c › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-0cbfa992 | web-shell › The banner stays at most 72 px tall — regression 2 › the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60... | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-1577878d): test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1280-720]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-1577878d): test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1366-860]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-14067443): test_m6b_shell::test_alice_and_a_signed_out_visitor_see_fewer_groups[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-2d3f3998): test_m6b_shell::test_key_stops_keep_their_ring_and_script_focus_draws_none[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-51d4764a): test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-51d4764a): test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-51d4764a): test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-1366-860]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-51d4764a): test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-900-800]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-425a9f46): test_m6b_shell::test_the_menu_folds_below_1024_px[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-88a078f0): test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c6a08479): test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c6a08479): test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-0cbfa992): test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-0cbfa992): test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e722bbf4): No end-to-end test traces criterion C-e722bbf4 (web-shell › Navigation entries are grouped by a fixed map › The map covers every navigation id and nothing else); waived by Q-007, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4ef0679b): No end-to-end test traces criterion C-4ef0679b (web-shell › Navigation entries are grouped by a fixed map › Entries are grouped, ordered and passed through); waived by Q-008, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b054e7d6): No end-to-end test traces criterion C-b054e7d6 (web-shell › The layout is a sidebar from 1024 px and collapsed below › The width decides the layout); waived by Q-009, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ffb190b2): No end-to-end test traces criterion C-ffb190b2 (web-shell › The shell holds one banner, one navigation, one main and one footer › The shell source holds the landmark, group and menu markup); waived by Q-010, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1577878d): The end-to-end test test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1280-720], test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1366-860] traces criterion C-1577878d (web-shell › The shell holds one banner, one navigation, one main and one footer › Carol's navigation is grouped and the banner is compact), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-011, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-14067443): The end-to-end test test_m6b_shell::test_alice_and_a_signed_out_visitor_see_fewer_groups[chromium] traces criterion C-14067443 (web-shell › The shell holds one banner, one navigation, one main and one footer › Alice and a signed-out visitor see fewer groups), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-012, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2d3f3998): The end-to-end test test_m6b_shell::test_key_stops_keep_their_ring_and_script_focus_draws_none[chromium] traces criterion C-2d3f3998 (web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-013, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-51d4764a): The end-to-end test test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860], test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800], test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-1366-860] (+1 more) traces criterion C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generate...
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-425a9f46): The end-to-end test test_m6b_shell::test_the_menu_folds_below_1024_px[chromium] traces criterion C-425a9f46 (web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-015, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9eeb9987): No end-to-end test traces criterion C-9eeb9987 (web-shell › Shell and auth stylesheets hold tokens only and a light colour scheme › The stylesheets use tokens and a light scheme); waived by Q-016, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2159a890): No end-to-end test traces criterion C-2159a890 (web-shell › The sign-in and not-found pages are cards in the shell › The account, sign-in and not-found sources use the shared Button); waived by Q-017, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-88a078f0): The end-to-end test test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium] traces criterion C-88a078f0 (web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-018, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c6a08479): The end-to-end test test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860], test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800] traces criterion C-c6a08479 (web-shell › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table — finding H-829dbc6c › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table), but it was never proved to fail without the change (no red, audit or generated record), so it is not evi...
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0cbfa992): The end-to-end test test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860], test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800] traces criterion C-0cbfa992 (web-shell › The banner stays at most 72 px tall — regression 2 › the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60...), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] navPlacement leaves unspecified statuses as sidebar (spec gap) (criterion C-20b4a37d): The function only special-cases signed_out and failed; any other status, including an unexpected loading state object, resolves to sidebar, and no scenario pins that input.
- [minor, judge] shellLayout coerces non-number widths (spec gap) (criterion C-b054e7d6): The comparison uses >=, so a string such as "1024" becomes sidebar and null becomes collapsed; the scenarios only pin numbers.
- [minor, judge] navGroups does not guard malformed items (spec gap) (criterion C-4ef0679b): A null item throws while reading item.id, and an item with an undefined id is pushed into more; the scenarios only pin NavItem objects.
- [minor, judge] the judge called a test inadequate (criterion C-51d4764a): web.src.auth.long-names-banner.test.ts::C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names
- [minor, judge] the judge called a test inadequate (criterion C-c6a08479): web.src.auth.long-names-banner.test.ts::C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names
- [minor, judge] the judge called a test inadequate (criterion C-0cbfa992): web.src.auth.long-names-banner.test.ts::C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names

## Needs a human

- UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table
- UI criterion C-c6a08479 has no end-to-end test; see the generated UI tests table
- UI criterion C-0cbfa992 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.app.nav-group-map.test.ts::C-e722bbf4 the group labels are fixed` (task 1.1): passed
- `web.src.app.nav-group-map.test.ts::C-e722bbf4 the map holds exactly the ten navigation ids with their groups` (task 1.1): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G1 carol's ten entries form three groups` (task 1.2): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G2 and G3 leave out empty groups` (task 1.2): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G5 an unknown id goes to more after build` (task 1.2): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G6 prototype-style ids go to more` (task 1.2): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G7 frozen input passes through unchanged` (task 1.2): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G8 and G9 keep input order inside a group` (task 1.2): passed
- `web.src.app.nav-placement.test.ts::C-20b4a37d navPlacement follows the session state` (task 1.4): passed
- `web.src.app.shell-css.test.ts::C-9eeb9987 auth.css is a 24rem card that truncates` (task 2.1): passed
- `web.src.app.shell-css.test.ts::C-9eeb9987 both stylesheets hold no raw colour and only kit tokens` (task 2.1): passed
- `web.src.app.shell-css.test.ts::C-9eeb9987 shell.css holds a light scheme and script focus draws no frame` (task 2.1): passed
- `web.src.app.shell-layout.test.ts::C-b054e7d6 shellLayout is a sidebar from 1024 px and collapsed below` (task 1.3): passed
- `web.src.app.shell-sources.test.ts::C-ffb190b2 the shell source holds the landmark, group and menu markup` (task 4.1): passed
- `web.src.auth.auth-sources.test.ts::C-2159a890 the account, sign-in and not-found sources use the shared Button` (task 3.1): passed
- `web.src.auth.long-names-banner.test.ts::C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names` (task 1.1): passed
