# Verification: openspec:restyle-admin-pages-followup-1: PASS (round 3)

traceability: 10/10 criteria covered by a discriminating test

- Base: `f35274616b2be11659419bbce217db3c4f93d6d9`
- Head: `316c8edec695ad2a8d9a93f4ecc0d45f2f7a4485`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: beam-judge, 1 call(s), prompt sha256 `b08610786ea8143a1bd4fd7ce0b844ca4b05b54c155b908b83ba2af82db67f64`
- Judge replies of beam-judge (this unit, all rounds): valid 2, repaired 1, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 1.3 | base main@f35274616b contained |
| 1 | integrity | ok | 405.5 | 11 sub-checks; scope: 27 changed file(s) |
| 2 | build | ok | 50.0 |  |
| 3 | tests | ok | 610.6 |  |
| 4 | traceability | ok | 0.3 | 10/10 criteria covered |
| 4a | audit sampling | ok | 0.0 | no covered new criterion to audit |
| 5 | ui test generation | ok | 0.0 | 3 UI criteria waived by an accepted answer (L4-VER-067) |
| 6 | quality | ok | 0.0 | 100.0% of the changed executable lines ran |
| 8 | s1 judge | ok | 0.6 | 8/10 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 44.2 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261121T1650Z-3be9/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261121T1650Z-3be9/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261121T1650Z-3be9/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261121T1650Z-3be9/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261121T1650Z-3be9/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261121T1650Z-3be9/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261121T1650Z-3be9/010-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | skipped | no task with a red and a green commit |
| test path freeze | ok | 2 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | skipped | no production file changed |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/tools/section-layout-browser-test.test.ts |
| tdd history | skipped | no task has a TDD history to check |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2669 of 2669 base tests pass on the unit's code with its 1 test and support files at the base (base: not needed) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_m6b_section_layout.py kept at head for the run (people changed it last (c27c727316, aa29f35938))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-b824c627 | web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins | covered | web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the admin sources use the layout parts and keep their pins (passed, pass_to_pass); web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the checker fails three altered Users sources (passed, pass_to_pass) | - | 0.90 | - |
| C-e4e27fab | web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden | covered | web.src.admin.captions-by-page.test.ts::C-e4e27fab exactly four captions are hidden (passed, pass_to_pass) | - | 0.80 | - |
| C-1baa1083 | web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name | covered | web.src.admin.admin-pages-restyle.test.ts::C-1baa1083 the Users page shows a toned state badge, the id and a red confirm (passed, pass_to_pass); test_m6b_admin::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium] (passed, pass_to_pass) | - | 0.93 | - |
| C-23f3a934 | web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100 | covered | test_m6b_admin::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium] (passed, pass_to_pass) | - | 0.93 | - |
| C-5d8c406e | web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure | covered | web.src.admin.admin-pages-restyle.test.ts::C-5d8c406e the Mappings page shows reviewer names through useDisplayNames (passed, pass_to_pass); test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium] (passed, pass_to_pass) | - | - | - |
| C-effeb70f | web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line | covered | test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium] (passed, pass_to_pass) | - | 0.92 | - |
| C-e553aba2 | web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins | covered | web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the checker fails three altered Servers sources (passed, pass_to_pass); web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the tool sources use the layout parts and keep their pins (passed, pass_to_pass) | - | 0.86 | - |
| C-68a6b8c2 | web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged | covered | web.src.tools.tools-pages-restyle.test.ts::C-68a6b8c2 the Servers page names who registered the server and badges the state (passed, pass_to_pass); test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium] (passed, pass_to_pass) | - | 0.94 | - |
| C-3c7c4fbe | web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows | covered | web.src.tools.grants-section-layout.test.ts::C-3c7c4fbe the Grants subject field keeps its hint beside the status badges (passed, pass_to_pass); web.src.tools.tools-pages-restyle.test.ts::C-3c7c4fbe the Grants page badges the status and keeps subject ids (passed, pass_to_pass); test_m6b_admin::test_... | - | - | - |
| C-403c66db | web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy | covered | web.src.tools.tools-pages-restyle.test.ts::C-403c66db the Policies page puts its status in the header and bounds one editor (passed, pass_to_pass); test_m6b_admin::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium] (passed, pass_to_pass) | - | 0.92 | - |

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

2795 of 2795 passed, 0 failed, 0 errored, 0 skipped.
6 of 6 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-b824c627 | waived | - | - | - | 0 | waived by Q-002 | - |
| C-e4e27fab | waived | - | - | - | 0 | waived by Q-003 | - |
| C-e553aba2 | waived | - | - | - | 0 | waived by Q-004 | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-b824c627 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e4e27fab | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1baa1083 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23f3a934 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d8c406e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-effeb70f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e553aba2 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-68a6b8c2 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3c7c4fbe | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-403c66db | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |

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

- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b824c627): No end-to-end test traces criterion C-b824c627 (web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins); waived by Q-002, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e4e27fab): No end-to-end test traces criterion C-e4e27fab (web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden); waived by Q-003, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e553aba2): No end-to-end test traces criterion C-e553aba2 (web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins); waived by Q-004, step 5 generates none.
- [minor, judge] Section layout measurement skips direct children that contain the heading (spec gap) (criterion C-68a6b8c2): MEASURE filters out children where child.contains(heading), so a region whose heading is wrapped in a container together with its body never has that container's edges checked.
- [minor, judge] Section layout test requires at least one non-heading child (spec gap) (criterion C-68a6b8c2): assert_section_layout asserts found["others"] is truthy, so a region whose only direct child is its heading fails even though every other direct child vacuously satisfies the condition.

## Feedback

- FB-001: addressed at 316c8edec6: e2e/test_m6b_section_layout.py: each test ends with assert csp == []; web/src/tools/section-layout-browser-test.test.ts reads the six region names

## Guard events

- guard.test_tamper: e2e/test_m6b_section_layout.py
