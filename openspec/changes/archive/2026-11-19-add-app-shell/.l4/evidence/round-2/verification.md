# Verification: openspec:add-app-shell: NEEDS_HUMAN (round 2)

traceability: 7/13 criteria covered by a discriminating test

- Base: `c2129af737f8ba6b447d66d3a592f7e9089b9f2d`
- Head: `92c9bd656ced0298b428766ed3f4976d5fb1f369`
- Implementer profiles: claude-sonnet, deepseek-free
- Judge: nemotron-judge, 1 call(s), prompt sha256 `0dcfa3d45160c9213110840ddad0ee080d177a14f0d5644d65cc38f257127512`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.5 | base main@c2129af737 contained |
| 1 | integrity | ok | 253.8 | 11 sub-checks; scope: 28 changed file(s) |
| 2 | build | ok | 31.3 |  |
| 3 | tests | ok | 362.8 |  |
| 4 | traceability | ok | 0.2 | 7/13 criteria covered |
| 4a | audit sampling | ok | 56.3 | 2 not_testable, 1 skipped; support files at the base: 8 |
| 5 | ui test generation | ok | 2240.7 | 1 accepted, 3 base_error, 3 fails_at_head, 5 not_testable, 1 uncollectable |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/app/App.tsx, web/src/app/Shell.tsx, web/src/app/nav-groups.ts, web/src/auth/AccountMenu.tsx, web/src/auth/SignInPage.tsx |
| 8 | s1 judge | ok | 0.8 | 13/13 criteria judged by jev |
| 9 | judge | ok | 170.9 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261119T1246Z-d8b6/016-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261119T1246Z-d8b6/017-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261119T1246Z-d8b6/018-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261119T1246Z-d8b6/019-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261119T1246Z-d8b6/020-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261119T1246Z-d8b6/021-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261119T1246Z-d8b6/022-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 7 task(s): red and green compared |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/app/App.tsx, web/src/app/Shell.tsx, web/src/app/nav-group-map.test.ts, web/src/app/nav-groups.test.ts, web/src/app/nav-groups.ts (+7 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2543 of 2543 base tests pass on the unit's code with its 7 test and support files at the base (base: not needed) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_m6b_shell.py kept at head for the run (people changed it last (f673224edf, a85749f1cf, 40bb697b5d))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-e722bbf4 | web-shell › Navigation entries are grouped by a fixed map › The map covers every navigation id and nothing else | covered | web.src.app.nav-group-map.test.ts::C-e722bbf4 the group labels are fixed (passed, red_assertion); web.src.app.nav-group-map.test.ts::C-e722bbf4 the map holds exactly the ten navigation ids with their groups (passed, red_assertion) | - | 0.95 | - |
| C-4ef0679b | web-shell › Navigation entries are grouped by a fixed map › Entries are grouped, ordered and passed through | covered | web.src.app.nav-groups.test.ts::C-4ef0679b G1 carol's ten entries form three groups (passed, red_assertion); web.src.app.nav-groups.test.ts::C-4ef0679b G2 and G3 leave out empty groups (passed, red_assertion); web.src.app.nav-groups.test.ts::C-4ef0679b G5 an unknown id goes to more after build (pass... | - | 0.94 | - |
| C-b054e7d6 | web-shell › The layout is a sidebar from 1024 px and collapsed below › The width decides the layout | covered | web.src.app.shell-layout.test.ts::C-b054e7d6 shellLayout is a sidebar from 1024 px and collapsed below (passed, red_assertion) | - | 0.95 | `e2e/test_l4_c_b054e7d6.py`, `test-results/test-l4-c-b054e7d6-py-test-layout-is-sidebar-from-1024px-and-collapsed-below-chromium-0-collapsed/trace.zip`, `test-results/test-l4-c-b054e7d6-py-test-layout-is-sidebar-from-1024px-and-collapsed-below-chromium-1-collapsed/test-failed-1.png`, `test-results/t... |
| C-ffb190b2 | web-shell › The shell holds one banner, one navigation, one main and one footer › The shell source holds the landmark, group and menu markup | covered | web.src.app.shell-sources.test.ts::C-ffb190b2 the shell source holds the landmark, group and menu markup (passed, red_assertion) | - | 0.92 | - |
| C-1577878d | web-shell › The shell holds one banner, one navigation, one main and one footer › Carol's navigation is grouped and the banner is compact | uncovered | - | test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1280-720] (no proof that it discriminates (no red, audit or generated record)); test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1366-860] (no proof that it discriminates (no red,... | 0.17 | `e2e/test_l4_c_1577878d.py`, `.l4-out/e2e/page.html` |
| C-14067443 | web-shell › The shell holds one banner, one navigation, one main and one footer › Alice and a signed-out visitor see fewer groups | uncovered | - | test_m6b_shell::test_alice_and_a_signed_out_visitor_see_fewer_groups[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.10 | `e2e/test_l4_c_14067443.py`, `.l4-out/e2e/page.html` |
| C-2d3f3998 | web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none | uncovered | - | test_m6b_shell::test_key_stops_keep_their_ring_and_script_focus_draws_none[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.11 | `e2e/test_l4_c_2d3f3998.py`, `test-results/test-l4-c-2d3f3998-py-test-key-stops-keep-their-ring-and-script-focus-draws-none-chromium/test-failed-1.png`, `test-results/test-l4-c-2d3f3998-py-test-key-stops-keep-their-ring-and-script-focus-draws-none-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-20b4a37d | web-shell › With nobody signed in the navigation sits in the banner and there is no sidebar › The placement follows the session state | covered | web.src.app.nav-placement.test.ts::C-20b4a37d navPlacement follows the session state (passed, red_assertion); test_l4_c_20b4a37d::test_navigation_sits_in_banner_with_no_sidebar_when_signed_out[chromium] (passed, generated, base fail, head pass) | - | 0.91 | `e2e/test_l4_c_20b4a37d.py`, `.l4-out/e2e/page.html` |
| C-51d4764a | web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner | uncovered | - | test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-900-800] (no proof that it discriminates (no red, audit or generated... | 0.14 | `e2e/test_l4_c_51d4764a.py`, `test-results/test-l4-c-51d4764a-py-test-long-names-truncate-and-never-grow-the-banner-chromium/test-failed-1.png`, `test-results/test-l4-c-51d4764a-py-test-long-names-truncate-and-never-grow-the-banner-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-425a9f46 | web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px | uncovered | - | test_m6b_shell::test_the_menu_folds_below_1024_px[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.12 | `e2e/test_l4_c_425a9f46.py`, `.l4-out/e2e/page.html` |
| C-9eeb9987 | web-shell › Shell and auth stylesheets hold tokens only and a light colour scheme › The stylesheets use tokens and a light scheme | covered | web.src.app.shell-css.test.ts::C-9eeb9987 auth.css is a 24rem card that truncates (passed, red_assertion); web.src.app.shell-css.test.ts::C-9eeb9987 both stylesheets hold no raw colour and only kit tokens (passed, red_assertion); web.src.app.shell-css.test.ts::C-9eeb9987 shell.css holds a light sche... | - | 0.93 | - |
| C-2159a890 | web-shell › The sign-in and not-found pages are cards in the shell › The account, sign-in and not-found sources use the shared Button | covered | web.src.auth.auth-sources.test.ts::C-2159a890 the account, sign-in and not-found sources use the shared Button (passed, red_assertion) | - | 0.93 | - |
| C-88a078f0 | web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards | uncovered | - | test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.11 | `e2e/test_l4_c_88a078f0.py`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6b_shell.py` |  | relevant | new test file |
| `openspec/changes/add-app-shell-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T0832Z-886c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T1103Z-0896.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T1244Z-189b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T1246Z-d8b6.jsonl` |  | none | exempt: harness, spec or documentation path |
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

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/app/App.tsx, web/src/app/Shell.tsx, web/src/app/nav-groups.ts, web/src/auth/AccountMenu.tsx, web/src/auth/SignInPage.tsx

### Tests

2640 of 2640 passed, 0 failed, 0 errored, 0 skipped.
23 of 23 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-e722bbf4 | not_testable | - | - | - | 1 | The criterion asserts internal module constants (NAV_GROUP_OF, NAV_GROUP_LABELS) that are not observable through the browser UI; it is a unit-testing concern, not an end-to-end one. | - |
| C-4ef0679b | not_testable | - | - | - | 1 | navGroups is a pure function; the G1–G9 input matrix and G7's `===` item-identity / frozen-input immutability are not controllable or observable through the page UI, so the criterion cannot be verified via pytest-playwright e2e (it is unit-tested by nav-groups.test.ts). | - |
| C-b054e7d6 | fails_at_head | e2e/test_l4_c_b054e7d6.py | fail | fail | 2 | the test fails at the head: test_l4_c_b054e7d6::test_layout_is_sidebar_from_1024px_and_collapsed_below[chromium--1-collapsed], test_l4_c_b054e7d6::test_layout_is_sidebar_from_1024px_and_collapsed_below[chromium-0-collapsed], test_l4_c_b054e7d6::test_layout_is_sidebar_from_1024px_and_collapsed_below[... | test-results/test-l4-c-b054e7d6-py-test-layout-is-sidebar-from-1024px-and-collapsed-below-chromium-0-collapsed/trace.zip, test-results/test-l4-c-b054e7d6-py-test-layout-is-sidebar-from-1024px-and-collapsed-below-chromium-1-collapsed/test-failed-1.png, test-results/test-l4-c-b054e7d6-py-test-layout-i... |
| C-ffb190b2 | not_testable | - | - | - | 1 | Criterion checks static Shell.tsx source contents (navGroups, useSession, TooltipProvider, lg:hidden), not rendered UI; not observable via the browser page fixture. | - |
| C-1577878d | base_error | e2e/test_l4_c_1577878d.py | error | - | 2 | the test errors at the merge base, which proves nothing: test_l4_c_1577878d::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium] | - |
| C-14067443 | uncollectable | e2e/test_l4_c_14067443.py | - | - | 1 | no test of the new file ran at the merge base (collection error or no test) | - |
| C-2d3f3998 | fails_at_head | e2e/test_l4_c_2d3f3998.py | fail | fail | 2 | the test fails at the head: test_l4_c_2d3f3998::test_key_stops_keep_their_ring_and_script_focus_draws_none[chromium] | test-results/test-l4-c-2d3f3998-py-test-key-stops-keep-their-ring-and-script-focus-draws-none-chromium/test-failed-1.png, test-results/test-l4-c-2d3f3998-py-test-key-stops-keep-their-ring-and-script-focus-draws-none-chromium/trace.zip |
| C-20b4a37d | accepted | e2e/test_l4_c_20b4a37d.py | fail | pass | 2 | - | - |
| C-51d4764a | fails_at_head | e2e/test_l4_c_51d4764a.py | fail | fail | 2 | the test fails at the head: test_l4_c_51d4764a::test_long_names_truncate_and_never_grow_the_banner[chromium] | test-results/test-l4-c-51d4764a-py-test-long-names-truncate-and-never-grow-the-banner-chromium/test-failed-1.png, test-results/test-l4-c-51d4764a-py-test-long-names-truncate-and-never-grow-the-banner-chromium/trace.zip |
| C-425a9f46 | base_error | e2e/test_l4_c_425a9f46.py | error | - | 2 | the test errors at the merge base, which proves nothing: test_l4_c_425a9f46::test_the_menu_folds_below_1024_px[chromium] | - |
| C-9eeb9987 | not_testable | - | - | - | 1 | The criterion inspects local source CSS files (shell.css, auth.css, tokens.css) and invokes TypeScript helpers parseTokens/findRawColours; none of this is observable through the page's public interface or reachable by requesting the origin, so a Playwright E2E test cannot verify it. | - |
| C-2159a890 | not_testable | - | - | - | 1 | The criterion is a static source-code inspection (imports, className, asChild, findInlineStyleUse) of TSX files; nothing a user sees or does in the browser verifies it, and an e2e test may only request the base origin, not read source files. | - |
| C-88a078f0 | base_error | e2e/test_l4_c_88a078f0.py | error | - | 2 | the test errors at the merge base, which proves nothing: test_l4_c_88a078f0::test_sign_in_and_not_found_render_as_centred_cards[chromium] | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-e722bbf4 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4ef0679b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b054e7d6 | ok | 0.950 | jev-1.13.0 | jev | - |
| C-ffb190b2 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1577878d | ok | 0.170 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-14067443 | ok | 0.100 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2d3f3998 | ok | 0.110 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-20b4a37d | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-51d4764a | ok | 0.140 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-425a9f46 | ok | 0.120 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9eeb9987 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2159a890 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-88a078f0 | ok | 0.110 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-e722bbf4 | skipped | - | - | cap |
| C-20b4a37d | not_testable | - | - | The criterion names navPlacement(session) called from the TypeScript test nav-placement.test.ts; no Python module under test is defined in the shown sources, so a self-contained pytest test cannot import a real public interface without guessing a name (forbidden). |
| C-b054e7d6 | not_testable | - | - | shellLayout is a CSS/Tailwind breakpoint threshold (lg at 1024 px) with no runtime caller and no Python module to import; it is verified in a browser. |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-e722bbf4 | web-shell › Navigation entries are grouped by a fixed map › The map covers every navigation id and nothing else | pass | pass | the judge passed it and a discriminating test passes |
| C-4ef0679b | web-shell › Navigation entries are grouped by a fixed map › Entries are grouped, ordered and passed through | pass | pass | the judge passed it and a discriminating test passes |
| C-b054e7d6 | web-shell › The layout is a sidebar from 1024 px and collapsed below › The width decides the layout | pass | pass | the judge passed it and a discriminating test passes |
| C-ffb190b2 | web-shell › The shell holds one banner, one navigation, one main and one footer › The shell source holds the landmark, group and menu markup | pass | pass | the judge passed it and a discriminating test passes |
| C-1577878d | web-shell › The shell holds one banner, one navigation, one main and one footer › Carol's navigation is grouped and the banner is compact | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-14067443 | web-shell › The shell holds one banner, one navigation, one main and one footer › Alice and a signed-out visitor see fewer groups | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-2d3f3998 | web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-20b4a37d | web-shell › With nobody signed in the navigation sits in the banner and there is no sidebar › The placement follows the session state | pass | pass | the judge passed it and a discriminating test passes |
| C-51d4764a | web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-425a9f46 | web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-9eeb9987 | web-shell › Shell and auth stylesheets hold tokens only and a light colour scheme › The stylesheets use tokens and a light scheme | pass | pass | the judge passed it and a discriminating test passes |
| C-2159a890 | web-shell › The sign-in and not-found pages are cards in the shell › The account, sign-in and not-found sources use the shared Button | pass | pass | the judge passed it and a discriminating test passes |
| C-88a078f0 | web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards | pass | needs_human | uncovered: no adequate discriminating test traces it |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-1577878d): test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1280-720]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-1577878d): test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1366-860]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-14067443): test_m6b_shell::test_alice_and_a_signed_out_visitor_see_fewer_groups[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-2d3f3998): test_m6b_shell::test_key_stops_keep_their_ring_and_script_focus_draws_none[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-51d4764a): test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-1366-860]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-51d4764a): test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-900-800]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-425a9f46): test_m6b_shell::test_the_menu_folds_below_1024_px[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-88a078f0): test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e722bbf4): No end-to-end test traces criterion C-e722bbf4 (web-shell › Navigation entries are grouped by a fixed map › The map covers every navigation id and nothing else); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4ef0679b): No end-to-end test traces criterion C-4ef0679b (web-shell › Navigation entries are grouped by a fixed map › Entries are grouped, ordered and passed through); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b054e7d6): No end-to-end test traces criterion C-b054e7d6 (web-shell › The layout is a sidebar from 1024 px and collapsed below › The width decides the layout); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ffb190b2): No end-to-end test traces criterion C-ffb190b2 (web-shell › The shell holds one banner, one navigation, one main and one footer › The shell source holds the landmark, group and menu markup); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1577878d): The end-to-end test test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1280-720], test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1366-860] traces criterion C-1577878d (web-shell › The shell holds one banner, one navigation, one main and one footer › Carol's navigation is grouped and the banner is compact), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-14067443): The end-to-end test test_m6b_shell::test_alice_and_a_signed_out_visitor_see_fewer_groups[chromium] traces criterion C-14067443 (web-shell › The shell holds one banner, one navigation, one main and one footer › Alice and a signed-out visitor see fewer groups), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2d3f3998): The end-to-end test test_m6b_shell::test_key_stops_keep_their_ring_and_script_focus_draws_none[chromium] traces criterion C-2d3f3998 (web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-20b4a37d): No end-to-end test traces criterion C-20b4a37d (web-shell › With nobody signed in the navigation sits in the banner and there is no sidebar › The placement follows the session state); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-51d4764a): The end-to-end test test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-1366-860], test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-900-800] traces criterion C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-425a9f46): The end-to-end test test_m6b_shell::test_the_menu_folds_below_1024_px[chromium] traces criterion C-425a9f46 (web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9eeb9987): No end-to-end test traces criterion C-9eeb9987 (web-shell › Shell and auth stylesheets hold tokens only and a light colour scheme › The stylesheets use tokens and a light scheme); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2159a890): No end-to-end test traces criterion C-2159a890 (web-shell › The sign-in and not-found pages are cards in the shell › The account, sign-in and not-found sources use the shared Button); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-88a078f0): The end-to-end test test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium] traces criterion C-88a078f0 (web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.

## Needs a human

- UI criterion C-e722bbf4 has no end-to-end test; see the generated UI tests table
- UI criterion C-4ef0679b has no end-to-end test; see the generated UI tests table
- UI criterion C-b054e7d6 has no end-to-end test; see the generated UI tests table
- UI criterion C-ffb190b2 has no end-to-end test; see the generated UI tests table
- UI criterion C-1577878d has no end-to-end test; see the generated UI tests table
- UI criterion C-14067443 has no end-to-end test; see the generated UI tests table
- UI criterion C-2d3f3998 has no end-to-end test; see the generated UI tests table
- UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table
- UI criterion C-425a9f46 has no end-to-end test; see the generated UI tests table
- UI criterion C-9eeb9987 has no end-to-end test; see the generated UI tests table
- UI criterion C-2159a890 has no end-to-end test; see the generated UI tests table
- UI criterion C-88a078f0 has no end-to-end test; see the generated UI tests table

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
