# Verification: openspec:restyle-admin-pages-followup-1: FAIL (round 1)

traceability: 10/10 criteria covered by a discriminating test

- Base: `f5fc93e50171eed1c16dee5477b840e356b41f11`
- Head: `8dd68353a9f576e08071b029e69a6758f7b9d08b`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: beam-judge, 1 call(s), prompt sha256 `f4f18367c28444b14b52ba83daeb742334a9a5a95c0af4cb3776812628cdfc0e`
- Judge replies of beam-judge (this unit, all rounds): valid 0, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): beam-judge reflection (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@f5fc93e501 as 8dd68353a9 (5 commits) |
| 1 | integrity | ok | 380.1 | 11 sub-checks; scope: 11 changed file(s) |
| 2 | build | ok | 47.6 |  |
| 3 | tests | ok | 572.1 |  |
| 4 | traceability | ok | 0.2 | 10/10 criteria covered |
| 4a | audit sampling | ok | 0.0 | no covered new criterion to audit |
| 5 | ui test generation | ok | 310.2 | 1 fails_at_head, 2 not_testable; e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | 100.0% of the changed executable lines ran |
| 8 | s1 judge | ok | 0.7 | 8/10 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 64.9 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | FAIL |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261121T1349Z-a93b/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261121T1349Z-a93b/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261121T1349Z-a93b/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261121T1349Z-a93b/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261121T1349Z-a93b/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261121T1349Z-a93b/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261121T1349Z-a93b/020-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | skipped | no task with a red and a green commit |
| test path freeze | ok | 1 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | skipped | no production file changed |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/tools/section-layout-browser-test.test.ts |
| tdd history | skipped | no task has a TDD history to check |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2668 of 2668 base tests pass on the unit's code with its 2 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-b824c627 | web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins | covered | web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the admin sources use the layout parts and keep their pins (passed, pass_to_pass); web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the checker fails three altered Users sources (passed, pass_to_pass) | - | 0.91 | - |
| C-e4e27fab | web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden | covered | web.src.admin.captions-by-page.test.ts::C-e4e27fab exactly four captions are hidden (passed, pass_to_pass) | - | 0.84 | `e2e/test_l4_c_e4e27fab.py`, `test-results/test-l4-c-e4e27fab-py-test-table-caption-repeating-page-heading-is-hidden-chromium/test-failed-1.png`, `test-results/test-l4-c-e4e27fab-py-test-table-caption-repeating-page-heading-is-hidden-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-1baa1083 | web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name | covered | web.src.admin.admin-pages-restyle.test.ts::C-1baa1083 the Users page shows a toned state badge, the id and a red confirm (passed, pass_to_pass, inadequate); test_m6b_admin::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium] (passed, pass_to_pass) | - | 0.94 | - |
| C-23f3a934 | web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100 | covered | test_m6b_admin::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium] (passed, pass_to_pass) | - | 0.92 | - |
| C-5d8c406e | web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure | covered | web.src.admin.admin-pages-restyle.test.ts::C-5d8c406e the Mappings page shows reviewer names through useDisplayNames (passed, pass_to_pass, inadequate); test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium] (passed, pass_to_pass) | - | - | - |
| C-effeb70f | web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line | covered | test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium] (passed, pass_to_pass) | - | 0.91 | - |
| C-e553aba2 | web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins | covered | web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the checker fails three altered Servers sources (passed, pass_to_pass); web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the tool sources use the layout parts and keep their pins (passed, pass_to_pass) | - | 0.84 | - |
| C-68a6b8c2 | web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged | covered | web.src.tools.tools-pages-restyle.test.ts::C-68a6b8c2 the Servers page names who registered the server and badges the state (passed, pass_to_pass, inadequate); test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium] (passed, pass_to_pass) | - | 0.94 | - |
| C-3c7c4fbe | web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows | covered | web.src.tools.grants-section-layout.test.ts::C-3c7c4fbe the Grants subject field keeps its hint beside the status badges (passed, pass_to_pass, inadequate); web.src.tools.tools-pages-restyle.test.ts::C-3c7c4fbe the Grants page badges the status and keeps subject ids (passed, pass_to_pass, inadequate... | - | - | - |
| C-403c66db | web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy | covered | web.src.tools.tools-pages-restyle.test.ts::C-403c66db the Policies page puts its status in the header and bounds one editor (passed, pass_to_pass, inadequate); test_m6b_admin::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium] (passed, pass_to_pass) | - | 0.94 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

100.0% of the changed executable lines ran.

| Function | Status | Lines run | Tests |
|---|---|---|---|

### Tests

2793 of 2793 passed, 0 failed, 0 errored, 0 skipped.
6 of 6 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-b824c627 | not_testable | - | - | - | 1 | The criterion is a static source-code check (reading TS/CSS sources and asserting string occurrences such as `<PageHeader` once), not an observable user outcome reachable through the browser's public interface; nothing in the rendered page exposes these source strings. | - |
| C-e4e27fab | fails_at_head | e2e/test_l4_c_e4e27fab.py | fail | fail | 2 | the test fails at the head: test_l4_c_e4e27fab::test_table_caption_repeating_page_heading_is_hidden[chromium] | test-results/test-l4-c-e4e27fab-py-test-table-caption-repeating-page-heading-is-hidden-chromium/test-failed-1.png, test-results/test-l4-c-e4e27fab-py-test-table-caption-repeating-page-heading-is-hidden-chromium/trace.zip |
| C-e553aba2 | not_testable | - | - | - | 1 | The criterion is a static source check (`tools/tools-pages-restyle.test.ts`) that reads the three page sources plus `tools.css`/`tokens.css` on disk and runs custom helpers (`findRawColours`, `findInlineStyleUse`, `findCssImports`) and mutation cases. An e2e test limited to `L4_E2E_BASE_URL` can onl... | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-b824c627 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e4e27fab | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1baa1083 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23f3a934 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d8c406e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-effeb70f | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e553aba2 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-68a6b8c2 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3c7c4fbe | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-403c66db | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-b824c627 | web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins | pass | pass | the judge passed it and a discriminating test passes |
| C-e4e27fab | web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden | pass | pass | the judge passed it and a discriminating test passes |
| C-1baa1083 | web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name | pass | pass | the judge passed it and a discriminating test passes |
| C-23f3a934 | web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100 | pass | pass | the judge passed it and a discriminating test passes |
| C-5d8c406e | web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure | pass | pass | the judge passed it and a discriminating test passes |
| C-effeb70f | web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line | pass | pass | the judge passed it and a discriminating test passes |
| C-e553aba2 | web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins | pass | pass | the judge passed it and a discriminating test passes |
| C-68a6b8c2 | web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged | pass | pass | the judge passed it and a discriminating test passes |
| C-3c7c4fbe | web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows | pass | pass | the judge passed it and a discriminating test passes |
| C-403c66db | web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b824c627): No end-to-end test traces criterion C-b824c627 (web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e4e27fab): No end-to-end test traces criterion C-e4e27fab (web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e553aba2): No end-to-end test traces criterion C-e553aba2 (web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins); step 5 generates one.
- [major, judge] New section-layout browser test does not call watch_csp: Feedback FB-001 asks the browser test to call watch_csp before the first goto and assert it empty at the end, but e2e/test_m6b_section_layout.py neither imports nor calls watch_csp.
- [minor, judge] Section layout assertion requires at least one sibling (spec gap): assert_section_layout requires found['others'] to be truthy before checking each sibling's position, so a region with only a heading fails.
- [minor, judge] the judge called a test inadequate (criterion C-1baa1083): web.src.admin.admin-pages-restyle.test.ts::C-1baa1083 the Users page shows a toned state badge, the id and a red confirm
- [minor, judge] the judge called a test inadequate (criterion C-5d8c406e): web.src.admin.admin-pages-restyle.test.ts::C-5d8c406e the Mappings page shows reviewer names through useDisplayNames
- [minor, judge] the judge called a test inadequate (criterion C-68a6b8c2): web.src.tools.tools-pages-restyle.test.ts::C-68a6b8c2 the Servers page names who registered the server and badges the state
- [minor, judge] the judge called a test inadequate (criterion C-3c7c4fbe): web.src.tools.grants-section-layout.test.ts::C-3c7c4fbe the Grants subject field keeps its hint beside the status badges
- [minor, judge] the judge called a test inadequate (criterion C-3c7c4fbe): web.src.tools.tools-pages-restyle.test.ts::C-3c7c4fbe the Grants page badges the status and keeps subject ids
- [minor, judge] the judge called a test inadequate (criterion C-403c66db): web.src.tools.tools-pages-restyle.test.ts::C-403c66db the Policies page puts its status in the header and bounds one editor
- [major, feedback] FB-001 not addressed: e2e/test_m6b_section_layout.py adds six tagged region measurements, but it does not import or call...: Judged not addressed: e2e/test_m6b_section_layout.py adds six tagged region measurements, but it does not import or call watch_csp as requested. The Section layout of criterion C-3802bfd0 (restyle-admin-pages-fix-2, web-tools spec) is checked only by a Node test that reads theme.css (web/src/tools/grants-section-layout.test.ts C-3802bfd0). No browser test measures it, and assert_layout checks only the banner height and sideways scroll, so a heading beside its body passes every e2e test: before fix-2 the headings were 88 to 638 px tall and the Surface body sat 350 px to the right of its heading...

## Fix unit

Fix unit 1 is created for these tasks:
- F-6267b553 FB-001 not addressed: e2e/test_m6b_section_layout.py adds six tagged region measurements, but it...

## Feedback

- FB-001: not addressed: e2e/test_m6b_section_layout.py adds six tagged region measurements, but it does not import or call watch_csp as requested.

## Needs a human

- UI criterion C-b824c627 has no end-to-end test; see the generated UI tests table
- UI criterion C-e4e27fab has no end-to-end test; see the generated UI tests table
- UI criterion C-e553aba2 has no end-to-end test; see the generated UI tests table
