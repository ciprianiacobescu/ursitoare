# Verification: openspec:restyle-admin-pages: NEEDS_HUMAN (round 2)

traceability: 8/10 criteria covered by a discriminating test

- Base: `e62be04a7038d7b7d6c6a7667a30df1a274b829c`
- Head: `157f4e2ee4f768e61be30a45323d306201217332`
- Implementer profiles: claude-sonnet
- Judge: beam-judge, 1 call(s), prompt sha256 `84458382432aff6864302cc87d9aefd2b82c4ebe07ddedee4f687eea89849161`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.5 | base main@e62be04a70 contained |
| 1 | integrity | ok | 258.6 | 11 sub-checks; scope: 26 changed file(s) |
| 2 | build | ok | 32.6 |  |
| 3 | tests | ok | 373.7 |  |
| 4 | traceability | ok | 0.2 | 8/10 criteria covered |
| 4a | audit sampling | ok | 449.8 | 2 rejected, 1 skipped; support files at the base: 4 |
| 5 | ui test generation | ok | 1595.0 | 1 base_error, 6 fails_at_head, 3 not_testable |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/tools/GrantsPage.tsx and 2 more |
| 8 | s1 judge | ok | 0.6 | 9/10 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 71.2 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261119T2251Z-ec8b/016-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261119T2251Z-ec8b/017-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261119T2251Z-ec8b/018-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261119T2251Z-ec8b/019-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261119T2251Z-ec8b/020-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261119T2251Z-ec8b/021-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261119T2251Z-ec8b/022-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 3 task(s): red and green compared |
| test path freeze | ok | 4 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/admin/admin-pages-restyle.test.ts (+5 more) |
| tdd history | ok | 3 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2559 of 2559 base tests pass on the unit's code with its 3 test and support files at the base (base: not needed) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_m6b_admin.py kept at head for the run (people changed it last (52f99d1a1b, 27eb36870f))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-b824c627 | web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins | covered | web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the admin sources use the layout parts and keep their pins (passed, red_assertion); web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the checker fails three altered Users sources (passed, red_assertion) | - | 0.91 | - |
| C-e4e27fab | web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden | covered | web.src.admin.captions-by-page.test.ts::C-e4e27fab exactly four captions are hidden (passed, red_assertion) | - | 0.89 | - |
| C-1baa1083 | web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name | covered | web.src.admin.admin-pages-restyle.test.ts::C-1baa1083 the Users page shows a toned state badge, the id and a red confirm (passed, red_assertion, inadequate) | test_m6b_admin::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.87 | `e2e/test_l4_c_1baa1083.py`, `test-results/test-l4-c-1baa1083-py-test-users-page-hides-its-caption-toned-badge-and-red-disable-confirm-chromium/test-failed-1.png`, `test-results/test-l4-c-1baa1083-py-test-users-page-hides-its-caption-toned-badge-and-red-disable-confirm-chromium/trace.zip`, `.l4-out/... |
| C-23f3a934 | web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100 | uncovered | - | test_m6b_admin::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.18 | `e2e/test_l4_c_23f3a934.py`, `test-results/test-l4-c-23f3a934-py-test-teams-form-sits-beside-the-tables-at-1366-and-above-them-at-1100-chromium/test-failed-1.png`, `test-results/test-l4-c-23f3a934-py-test-teams-form-sits-beside-the-tables-at-1366-and-above-them-at-1100-chromium/trace.zip`, `.l4-out/... |
| C-5d8c406e | web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure | covered | web.src.admin.admin-pages-restyle.test.ts::C-5d8c406e the Mappings page shows reviewer names through useDisplayNames (passed, red_assertion, inadequate) | test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium] (no proof that it discriminates (no red, audit or generated record)) | - | `e2e/test_l4_c_5d8c406e.py`, `test-results/test-l4-c-5d8c406e-py-test-mappings-show-the-reviewer-name-and-keep-ids-that-are-not-people-chromium/test-failed-1.png`, `test-results/test-l4-c-5d8c406e-py-test-mappings-show-the-reviewer-name-and-keep-ids-that-are-not-people-chromium/trace.zip`, `.l4-out/... |
| C-effeb70f | web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line | uncovered | - | test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.08 | `e2e/test_l4_c_effeb70f.py`, `test-results/test-l4-c-effeb70f-py-test-audit-page-keeps-actor-ids-and-one-line-times-chromium/test-failed-1.png`, `test-results/test-l4-c-effeb70f-py-test-audit-page-keeps-actor-ids-and-one-line-times-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-e553aba2 | web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins | covered | web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the checker fails three altered Servers sources (passed, red_assertion); web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the tool sources use the layout parts and keep their pins (passed, red_assertion) | - | 0.86 | - |
| C-68a6b8c2 | web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged | covered | web.src.tools.tools-pages-restyle.test.ts::C-68a6b8c2 the Servers page names who registered the server and badges the state (passed, red_assertion, inadequate) | test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.93 | `e2e/test_l4_c_68a6b8c2.py`, `test-results/test-l4-c-68a6b8c2-py-test-tool-servers-show-who-registered-outside-the-surface-region-chromium/test-failed-1.png`, `test-results/test-l4-c-68a6b8c2-py-test-tool-servers-show-who-registered-outside-the-surface-region-chromium/trace.zip`, `.l4-out/e2e/page.h... |
| C-3c7c4fbe | web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows | covered | web.src.tools.tools-pages-restyle.test.ts::C-3c7c4fbe the Grants page badges the status and keeps subject ids (passed, red_assertion, inadequate) | test_m6b_admin::test_grants_error_state_has_two_alerts_and_one_option[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m6b_admin::test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form[chromium] (no proof that it discriminates (no red, audit or g... | 0.91 | `e2e/test_l4_c_3c7c4fbe.py`, `test-results/test-l4-c-3c7c4fbe-py-test-grants-rows-keep-subject-ids-and-show-status-badges-beside-the-form-chromium/test-failed-1.png`, `test-results/test-l4-c-3c7c4fbe-py-test-grants-rows-keep-subject-ids-and-show-status-badges-beside-the-form-chromium/trace.zip`, `.l... |
| C-403c66db | web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy | covered | web.src.tools.tools-pages-restyle.test.ts::C-403c66db the Policies page puts its status in the header and bounds one editor (passed, red_assertion, inadequate) | test_m6b_admin::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.89 | `e2e/test_l4_c_403c66db.py`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6b_admin.py` |  | relevant | new test file |
| `openspec/changes/restyle-admin-pages-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages-fix-1/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/ledger/r-20261119T1941Z-03bc.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/ledger/r-20261119T2206Z-463f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/ledger/r-20261119T2251Z-ec8b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/verification.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/admin/AuditPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/MappingsPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/TeamsPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/UsersPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/admin-pages-restyle.test.ts` |  | relevant | new test file |
| `web/src/admin/admin.css` | web | relevant | named in the spec |
| `web/src/admin/captions-by-page.test.ts` |  | relevant | new test file |
| `web/src/tools/GrantsPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/PoliciesPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/tools-pages-restyle.test.ts` |  | relevant | new test file |
| `web/src/tools/tools.css` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/tools/GrantsPage.tsx and 2 more

### Tests

2662 of 2662 passed, 0 failed, 0 errored, 0 skipped.
18 of 18 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-b824c627 | not_testable | - | - | - | 1 | This criterion checks source files and static test assertions, not browser-observable behavior. | - |
| C-e4e27fab | not_testable | - | - | - | 1 | It checks a TypeScript helper and source-file markers, not browser-observable behavior. | - |
| C-1baa1083 | fails_at_head | e2e/test_l4_c_1baa1083.py | fail | fail | 2 | the test fails at the head: test_l4_c_1baa1083::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium] | test-results/test-l4-c-1baa1083-py-test-users-page-hides-its-caption-toned-badge-and-red-disable-confirm-chromium/test-failed-1.png, test-results/test-l4-c-1baa1083-py-test-users-page-hides-its-caption-toned-badge-and-red-disable-confirm-chromium/trace.zip |
| C-23f3a934 | fails_at_head | e2e/test_l4_c_23f3a934.py | fail | fail | 2 | the test fails at the head: test_l4_c_23f3a934::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium] | test-results/test-l4-c-23f3a934-py-test-teams-form-sits-beside-the-tables-at-1366-and-above-them-at-1100-chromium/test-failed-1.png, test-results/test-l4-c-23f3a934-py-test-teams-form-sits-beside-the-tables-at-1366-and-above-them-at-1100-chromium/trace.zip |
| C-5d8c406e | fails_at_head | e2e/test_l4_c_5d8c406e.py | fail | fail | 2 | the test fails at the head: test_l4_c_5d8c406e::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium] | test-results/test-l4-c-5d8c406e-py-test-mappings-show-the-reviewer-name-and-keep-ids-that-are-not-people-chromium/test-failed-1.png, test-results/test-l4-c-5d8c406e-py-test-mappings-show-the-reviewer-name-and-keep-ids-that-are-not-people-chromium/trace.zip |
| C-effeb70f | fails_at_head | e2e/test_l4_c_effeb70f.py | fail | fail | 2 | the test fails at the head: test_l4_c_effeb70f::test_audit_page_keeps_actor_ids_and_one_line_times[chromium] | test-results/test-l4-c-effeb70f-py-test-audit-page-keeps-actor-ids-and-one-line-times-chromium/test-failed-1.png, test-results/test-l4-c-effeb70f-py-test-audit-page-keeps-actor-ids-and-one-line-times-chromium/trace.zip |
| C-e553aba2 | not_testable | - | - | - | 1 | It validates source-level checker behavior, not browser-visible behavior. | - |
| C-68a6b8c2 | fails_at_head | e2e/test_l4_c_68a6b8c2.py | fail | fail | 2 | the test fails at the head: test_l4_c_68a6b8c2::test_tool_servers_show_who_registered_outside_the_surface_region[chromium] | test-results/test-l4-c-68a6b8c2-py-test-tool-servers-show-who-registered-outside-the-surface-region-chromium/test-failed-1.png, test-results/test-l4-c-68a6b8c2-py-test-tool-servers-show-who-registered-outside-the-surface-region-chromium/trace.zip |
| C-3c7c4fbe | fails_at_head | e2e/test_l4_c_3c7c4fbe.py | fail | fail | 2 | the test fails at the head: test_l4_c_3c7c4fbe::test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form[chromium] | test-results/test-l4-c-3c7c4fbe-py-test-grants-rows-keep-subject-ids-and-show-status-badges-beside-the-form-chromium/test-failed-1.png, test-results/test-l4-c-3c7c4fbe-py-test-grants-rows-keep-subject-ids-and-show-status-badges-beside-the-form-chromium/trace.zip |
| C-403c66db | base_error | e2e/test_l4_c_403c66db.py | error | - | 2 | the test errors at the merge base, which proves nothing: test_l4_c_403c66db::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium] | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-b824c627 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e4e27fab | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1baa1083 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23f3a934 | ok | 0.180 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d8c406e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-effeb70f | ok | 0.080 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e553aba2 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-68a6b8c2 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3c7c4fbe | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-403c66db | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-e4e27fab | skipped | - | - | cap |
| C-5d8c406e | rejected | e2e/test_l4_audit_c_5d8c406e_r2.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_5d8c406e_r2.py |
| C-b824c627 | rejected | e2e/test_l4_audit_c_b824c627_r2.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_b824c627_r2.py |

## Rejected audit tests

- C-5d8c406e: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_5d8c406e_r2.py
- C-b824c627: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_b824c627_r2.py

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-b824c627 | web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins | pass | pass | the judge passed it and a discriminating test passes |
| C-e4e27fab | web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden | pass | pass | the judge passed it and a discriminating test passes |
| C-1baa1083 | web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-23f3a934 | web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100 | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-5d8c406e | web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-effeb70f | web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-e553aba2 | web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins | pass | pass | the judge passed it and a discriminating test passes |
| C-68a6b8c2 | web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-3c7c4fbe | web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-403c66db | web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-1baa1083): test_m6b_admin::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-23f3a934): test_m6b_admin::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-5d8c406e): test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-effeb70f): test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-68a6b8c2): test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3c7c4fbe): test_m6b_admin::test_grants_error_state_has_two_alerts_and_one_option[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3c7c4fbe): test_m6b_admin::test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-403c66db): test_m6b_admin::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] an audit test was rejected (criterion C-5d8c406e): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_5d8c406e_r2.py
- [minor, deterministic] an audit test was rejected (criterion C-b824c627): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_b824c627_r2.py
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b824c627): No end-to-end test traces criterion C-b824c627 (web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e4e27fab): No end-to-end test traces criterion C-e4e27fab (web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1baa1083): The end-to-end test test_m6b_admin::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium] traces criterion C-1baa1083 (web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-23f3a934): The end-to-end test test_m6b_admin::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium] traces criterion C-23f3a934 (web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5d8c406e): The end-to-end test test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium] traces criterion C-5d8c406e (web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-effeb70f): The end-to-end test test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium] traces criterion C-effeb70f (web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e553aba2): No end-to-end test traces criterion C-e553aba2 (web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-68a6b8c2): The end-to-end test test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium] traces criterion C-68a6b8c2 (web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3c7c4fbe): The end-to-end test test_m6b_admin::test_grants_error_state_has_two_alerts_and_one_option[chromium], test_m6b_admin::test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form[chromium] traces criterion C-3c7c4fbe (web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-403c66db): The end-to-end test test_m6b_admin::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium] traces criterion C-403c66db (web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] Audit Type and Target wrapping also inserts wbr elements (spec gap) (criterion C-effeb70f): The criterion pins the CSS class but not how the text breaks; the committed code inserts a wbr after each dot or underscore in addition to the anywhere-wrap class.
- [minor, judge] Users Name cell id span styling is not fully pinned (spec gap) (criterion C-1baa1083): The requirement pins font-mono but not the surrounding span classes used for the id under the name.
- [minor, judge] Registered by line styling is not pinned (spec gap) (criterion C-68a6b8c2): The criterion pins the text and placement but not the paragraph class used for the registered-by line.
- [minor, judge] Group mappings form width is not pinned (spec gap) (criterion C-5d8c406e): The browser scenario checks the form's position but not its maximum width.
- [minor, judge] the judge called a test inadequate (criterion C-1baa1083): web.src.admin.admin-pages-restyle.test.ts::C-1baa1083 the Users page shows a toned state badge, the id and a red confirm
- [minor, judge] the judge called a test inadequate (criterion C-5d8c406e): web.src.admin.admin-pages-restyle.test.ts::C-5d8c406e the Mappings page shows reviewer names through useDisplayNames
- [minor, judge] the judge called a test inadequate (criterion C-68a6b8c2): web.src.tools.tools-pages-restyle.test.ts::C-68a6b8c2 the Servers page names who registered the server and badges the state
- [minor, judge] the judge called a test inadequate (criterion C-3c7c4fbe): web.src.tools.tools-pages-restyle.test.ts::C-3c7c4fbe the Grants page badges the status and keeps subject ids
- [minor, judge] the judge called a test inadequate (criterion C-403c66db): web.src.tools.tools-pages-restyle.test.ts::C-403c66db the Policies page puts its status in the header and bounds one editor

## Needs a human

- UI criterion C-b824c627 has no end-to-end test; see the generated UI tests table
- UI criterion C-e4e27fab has no end-to-end test; see the generated UI tests table
- UI criterion C-1baa1083 has no end-to-end test; see the generated UI tests table
- UI criterion C-23f3a934 has no end-to-end test; see the generated UI tests table
- UI criterion C-5d8c406e has no end-to-end test; see the generated UI tests table
- UI criterion C-effeb70f has no end-to-end test; see the generated UI tests table
- UI criterion C-e553aba2 has no end-to-end test; see the generated UI tests table
- UI criterion C-68a6b8c2 has no end-to-end test; see the generated UI tests table
- UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table
- UI criterion C-403c66db has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.admin.admin-pages-restyle.test.ts::C-1baa1083 the Users page shows a toned state badge, the id and a red confirm` (task 2.1): passed
- `web.src.admin.admin-pages-restyle.test.ts::C-5d8c406e the Mappings page shows reviewer names through useDisplayNames` (task 2.1): passed
- `web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the admin sources use the layout parts and keep their pins` (task 2.1): passed
- `web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the checker fails three altered Users sources` (task 2.1): passed
- `web.src.admin.captions-by-page.test.ts::C-e4e27fab exactly four captions are hidden` (task 1.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-3c7c4fbe the Grants page badges the status and keeps subject ids` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-403c66db the Policies page puts its status in the header and bounds one editor` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-68a6b8c2 the Servers page names who registered the server and badges the state` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the checker fails three altered Servers sources` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the tool sources use the layout parts and keep their pins` (task 3.1): passed

## Guard events

- guard.test_tamper: e2e/test_m6b_admin.py
