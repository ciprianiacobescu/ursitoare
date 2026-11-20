# Verification: openspec:restyle-admin-pages: NEEDS_HUMAN (round 4)

traceability: 10/12 criteria covered by a discriminating test

- Base: `e62be04a7038d7b7d6c6a7667a30df1a274b829c`
- Head: `635e7c2022c6058a9a239133e026a07030ead1a9`
- Implementer profiles: claude-sonnet
- Judge: nemotron-judge, 3 call(s), prompt sha256 `c1ecf3fa7884310ef02e42522f67b6621beb04fa8b4e8741a111ec57d164c58a`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 1.0 | base main@e62be04a70 contained |
| 1 | integrity | ok | 325.8 | 11 sub-checks; scope: 44 changed file(s) |
| 2 | build | ok | 37.1 |  |
| 3 | tests | ok | 445.6 |  |
| 4 | traceability | ok | 0.2 | 10/12 criteria covered |
| 4a | audit sampling | ok | 413.1 | 1 not_testable, 1 rejected, 1 skipped; support files at the base: 6 |
| 5 | ui test generation | ok | 1040.8 | 1 base_error, 2 fails_at_head |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/tools/GrantsPage.tsx and 2 more |
| 8 | s1 judge | ok | 0.5 | 11/12 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 673.7 | 3 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261120T0035Z-bdb9/039-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261120T0035Z-bdb9/040-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261120T0035Z-bdb9/041-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261120T0035Z-bdb9/042-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261120T0035Z-bdb9/043-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261120T0035Z-bdb9/044-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261120T0035Z-bdb9/045-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 4 task(s): red and green compared |
| test path freeze | ok | 5 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/admin/admin-pages-restyle.test.ts (+7 more) |
| tdd history | ok | 5 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2559 of 2559 base tests pass on the unit's code with its 5 test and support files at the base (base: not needed) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_m6b_admin.py kept at head for the run (people changed it last (52f99d1a1b, 27eb36870f))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-b824c627 | web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins | covered | web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the admin sources use the layout parts and keep their pins (passed, red_assertion); web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the checker fails three altered Users sources (passed, red_assertion) | - | 0.91 | - |
| C-e4e27fab | web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden | covered | web.src.admin.captions-by-page.test.ts::C-e4e27fab exactly four captions are hidden (passed, red_assertion) | - | 0.85 | - |
| C-1baa1083 | web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name | covered | web.src.admin.admin-pages-restyle.test.ts::C-1baa1083 the Users page shows a toned state badge, the id and a red confirm (passed, red_assertion) | test_m6b_admin::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.87 | - |
| C-23f3a934 | web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100 | uncovered | - | test_m6b_admin::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.22 | - |
| C-5d8c406e | web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure | covered | web.src.admin.admin-pages-restyle.test.ts::C-5d8c406e the Mappings page shows reviewer names through useDisplayNames (passed, red_assertion) | test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium] (no proof that it discriminates (no red, audit or generated record)) | - | - |
| C-effeb70f | web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line | uncovered | - | test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.08 | - |
| C-e553aba2 | web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins | covered | web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the checker fails three altered Servers sources (passed, red_assertion); web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the tool sources use the layout parts and keep their pins (passed, red_assertion) | - | 0.85 | - |
| C-68a6b8c2 | web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged | covered | web.src.tools.tools-pages-restyle.test.ts::C-68a6b8c2 the Servers page names who registered the server and badges the state (passed, red_assertion) | test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.93 | - |
| C-3c7c4fbe | web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows | covered | web.src.tools.grants-section-layout.test.ts::C-3c7c4fbe the Grants subject field keeps its hint beside the status badges (passed, pre_satisfied); web.src.tools.tools-pages-restyle.test.ts::C-3c7c4fbe the Grants page badges the status and keeps subject ids (passed, red_assertion) | test_m6b_admin::test_grants_error_state_has_two_alerts_and_one_option[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m6b_admin::test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form[chromium] (no proof that it discriminates (no red, audit or g... | 0.91 | `e2e/test_l4_c_3c7c4fbe.py`, `.l4-out/e2e/page.html` |
| C-403c66db | web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy | covered | web.src.tools.tools-pages-restyle.test.ts::C-403c66db the Policies page puts its status in the header and bounds one editor (passed, red_assertion) | test_m6b_admin::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.89 | - |
| C-e96ac1a6 | web-admin › Rejected hold: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table — finding H-5a571db9 › Rejected hold: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table | covered | web.src.tools.grants-subject-hint.test.ts::C-e96ac1a6 the Grants page gives the Role or user field its hint (passed, red_assertion) | - | 0.91 | `e2e/test_l4_c_e96ac1a6.py`, `test-results/test-l4-c-e96ac1a6-py-test-grants-role-user-field-shows-hint-chromium/test-failed-1.png`, `test-results/test-l4-c-e96ac1a6-py-test-grants-role-user-field-shows-hint-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-3802bfd0 | web-tools › The Grants page keeps its errors, options and subject ids and shows status badges — regression 2 › the Grants page is open at 1366 by 860 with the rows and with the error state of its two e2e test... | covered | web.src.tools.grants-section-layout.test.ts::C-3802bfd0 a section body spans the grid below its heading (passed, pre_satisfied) | - | 0.67 | `e2e/test_l4_c_3802bfd0.py`, `test-results/test-l4-c-3802bfd0-py-test-admin-region-headings-single-line-and-left-aligned-chromium-audit-chain-verification/test-failed-1.png`, `test-results/test-l4-c-3802bfd0-py-test-admin-region-headings-single-line-and-left-aligned-chromium-audit-chain-verification... |

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
| `openspec/changes/restyle-admin-pages-fix-2/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages-fix-2/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages-fix-2/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages-fix-2/specs/web-admin/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages-fix-2/specs/web-tools/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages-fix-2/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-3/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-3/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/evidence/round-3/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/ledger/r-20261119T1941Z-03bc.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/ledger/r-20261119T2206Z-463f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/ledger/r-20261119T2251Z-ec8b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/ledger/r-20261120T0003Z-f99f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/.l4/ledger/r-20261120T0035Z-bdb9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/verification.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/admin/AuditPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/MappingsPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/TeamsPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/UsersPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/admin-pages-restyle.test.ts` |  | relevant | new test file |
| `web/src/admin/admin.css` | web | relevant | named in the spec |
| `web/src/admin/captions-by-page.test.ts` |  | relevant | new test file |
| `web/src/kit/theme.css` | web | relevant | named in the spec |
| `web/src/tools/GrantsPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/PoliciesPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/grants-section-layout.test.ts` |  | relevant | new test file |
| `web/src/tools/grants-subject-hint.test.ts` |  | relevant | new test file |
| `web/src/tools/tools-pages-restyle.test.ts` |  | relevant | new test file |
| `web/src/tools/tools.css` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/tools/GrantsPage.tsx and 2 more

### Tests

2665 of 2665 passed, 0 failed, 0 errored, 0 skipped.
21 of 21 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-b824c627 | waived | - | - | - | 0 | waived by Q-008 | - |
| C-e4e27fab | waived | - | - | - | 0 | waived by Q-009 | - |
| C-1baa1083 | waived | - | - | - | 0 | waived by Q-010 | - |
| C-23f3a934 | waived | - | - | - | 0 | waived by Q-011 | - |
| C-5d8c406e | waived | - | - | - | 0 | waived by Q-012 | - |
| C-effeb70f | waived | - | - | - | 0 | waived by Q-013 | - |
| C-e553aba2 | waived | - | - | - | 0 | waived by Q-014 | - |
| C-68a6b8c2 | waived | - | - | - | 0 | waived by Q-015 | - |
| C-403c66db | waived | - | - | - | 0 | waived by Q-017 | - |
| C-3c7c4fbe | base_error | e2e/test_l4_c_3c7c4fbe.py | error | - | 2 | the test errors at the merge base, which proves nothing: test_l4_c_3c7c4fbe::test_grants_error_state_has_two_alerts_and_one_option[chromium], test_l4_c_3c7c4fbe::test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form[chromium] | - |
| C-e96ac1a6 | fails_at_head | e2e/test_l4_c_e96ac1a6.py | fail | fail | 2 | the test fails at the head: test_l4_c_e96ac1a6::test_grants_role_user_field_shows_hint[chromium] | test-results/test-l4-c-e96ac1a6-py-test-grants-role-user-field-shows-hint-chromium/test-failed-1.png, test-results/test-l4-c-e96ac1a6-py-test-grants-role-user-field-shows-hint-chromium/trace.zip |
| C-3802bfd0 | fails_at_head | e2e/test_l4_c_3802bfd0.py | fail | fail | 2 | the test fails at the head: test_l4_c_3802bfd0::test_admin_region_headings_single_line_and_left_aligned[chromium-audit-chain-verification], test_l4_c_3802bfd0::test_admin_region_headings_single_line_and_left_aligned[chromium-audit-filter-audit-log], test_l4_c_3802bfd0::test_admin_region_headings_sin... | test-results/test-l4-c-3802bfd0-py-test-admin-region-headings-single-line-and-left-aligned-chromium-audit-chain-verification/test-failed-1.png, test-results/test-l4-c-3802bfd0-py-test-admin-region-headings-single-line-and-left-aligned-chromium-audit-chain-verification/trace.zip, test-results/test-l4... |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-b824c627 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e4e27fab | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1baa1083 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23f3a934 | ok | 0.220 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d8c406e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-effeb70f | ok | 0.080 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e553aba2 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-68a6b8c2 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3c7c4fbe | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-403c66db | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e96ac1a6 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3802bfd0 | ok | 0.670 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-e4e27fab | skipped | - | - | cap |
| C-3802bfd0 | not_testable | - | - | Requires a rendered browser page at 1366x860 with pixel geometry checks (heading height < 2x font size; every other child's left edge within 1 px and top at/below the heading's bottom) across six named regions. The shown sources expose only TypeScript/React layout names; no Python module under test |
| C-3c7c4fbe | rejected | e2e/test_l4_audit_c_3c7c4fbe_r4.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_3c7c4fbe_r4.py |

## Rejected audit tests

- C-3c7c4fbe: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_3c7c4fbe_r4.py

## Answers to verdict questions

- Q-001 accept C-1baa1083 by the delegate (claude-fable-5-1 via claude-code): The Users page satisfies the scenario as written. It passes destructive to its ConfirmDialog, and the kit writes data-tone danger on the confirm button and puts the first focus on Cancel when destructive is true; the danger token is #b42318, which is rgb(180, 35, 24). The state cell is a Badge with ...
- Q-002 accept C-23f3a934 by the delegate (claude-fable-5-1 via claude-code): The Roles and teams page satisfies the scenario. The Create team Section and the two tables sit in a grid with xl:grid-cols-[20rem_minmax(0,1fr)] and the Section first in DOM order, and the stylesheet entry overrides no Tailwind breakpoint, so the xl breakpoint is 1280 px: at 1366 the form is a 20 r...
- Q-003 accept C-5d8c406e by the delegate (claude-fable-5-1 via claude-code): The Group mappings page satisfies the scenario. It collects the distinct reviewedBy values from the list, passes them once to useDisplayNames and renders the cell as clip(personLabel(names, mapping.reviewedBy)). The name cache requests only ids matching ^[A-Za-z0-9_-]{1,64}$, so operator:e2e-seed is...
- Q-004 accept C-effeb70f by the delegate (claude-fable-5-1 via claude-code): The Audit log page satisfies the scenario. The Chain verification and Filter the audit log Sections sit in a grid with lg:grid-cols-2 and lg:items-start, so at 1366 their tops align and the first ends at the second's left edge, and the table follows below. The verification status paragraph has role ...
- Q-005 accept C-68a6b8c2 by the delegate (claude-fable-5-1 via claude-code): The Tool servers page satisfies the scenario. With a server selected it renders the paragraph Registered by followed by personLabel of registeredBy after the servers table and before the Surface Section, so the text is visible and absent from the region, and useDisplayNames is called with that one i...
- Q-007 accept C-403c66db by the delegate (claude-fable-5-1 via claude-code): The Policies page satisfies the scenario as written. Its root is cn(tools-page, PAGE_WIDTHS.form), that is max-w-3xl or 768 px, and the editor sits in a Card with padding inside it with a textarea of width 100 percent, so the Hand-written Cedar editor is at most 768 px wide. Once loaded the PageHead...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-b824c627 | web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins | pass | pass | the judge passed it and a discriminating test passes |
| C-e4e27fab | web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden | pass | pass | the judge passed it and a discriminating test passes |
| C-1baa1083 | web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The Users page satisfies the scenario as written. It passes destructive to its ConfirmDialog, and the kit writes data-tone danger on the confirm button and puts the first focus on Cancel when destructive is true; the danger token is #b4231... |
| C-23f3a934 | web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100 | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The Roles and teams page satisfies the scenario. The Create team Section and the two tables sit in a grid with xl:grid-cols-[20rem_minmax(0,1fr)] and the Section first in DOM order, and the stylesheet entry overrides no Tailwind breakpoint... |
| C-5d8c406e | web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The Group mappings page satisfies the scenario. It collects the distinct reviewedBy values from the list, passes them once to useDisplayNames and renders the cell as clip(personLabel(names, mapping.reviewedBy)). The name cache requests onl... |
| C-effeb70f | web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The Audit log page satisfies the scenario. The Chain verification and Filter the audit log Sections sit in a grid with lg:grid-cols-2 and lg:items-start, so at 1366 their tops align and the first ends at the second's left edge, and the tab... |
| C-e553aba2 | web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins | pass | pass | the judge passed it and a discriminating test passes |
| C-68a6b8c2 | web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The Tool servers page satisfies the scenario. With a server selected it renders the paragraph Registered by followed by personLabel of registeredBy after the servers table and before the Surface Section, so the text is visible and absent f... |
| C-3c7c4fbe | web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows | pass | pass | the judge passed it and a discriminating test passes |
| C-403c66db | web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The Policies page satisfies the scenario as written. Its root is cn(tools-page, PAGE_WIDTHS.form), that is max-w-3xl or 768 px, and the editor sits in a Card with padding inside it with a textarea of width 100 percent, so the Hand-written ... |
| C-e96ac1a6 | web-admin › Rejected hold: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table — finding H-5a571db9 › Rejected hold: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table | pass | pass | the judge passed it and a discriminating test passes |
| C-3802bfd0 | web-tools › The Grants page keeps its errors, options and subject ids and shows status badges — regression 2 › the Grants page is open at 1366 by 860 with the rows and with the error state of its two e2e test... | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-1baa1083): test_m6b_admin::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-23f3a934): test_m6b_admin::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-5d8c406e): test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-effeb70f): test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-68a6b8c2): test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3c7c4fbe): test_m6b_admin::test_grants_error_state_has_two_alerts_and_one_option[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3c7c4fbe): test_m6b_admin::test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-403c66db): test_m6b_admin::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] an audit test was rejected (criterion C-3c7c4fbe): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_3c7c4fbe_r4.py
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b824c627): No end-to-end test traces criterion C-b824c627 (web-admin › The four admin pages are built from PageHeader, Section and the list width › The admin sources use the layout parts and keep their pins); waived by Q-008, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e4e27fab): No end-to-end test traces criterion C-e4e27fab (web-admin › A table caption that repeats its page heading is hidden, and only four are › Exactly four captions are hidden); waived by Q-009, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1baa1083): The end-to-end test test_m6b_admin::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium] traces criterion C-1baa1083 (web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-010, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-23f3a934): The end-to-end test test_m6b_admin::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium] traces criterion C-23f3a934 (web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-011, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5d8c406e): The end-to-end test test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium] traces criterion C-5d8c406e (web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-012, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-effeb70f): The end-to-end test test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium] traces criterion C-effeb70f (web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-013, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e553aba2): No end-to-end test traces criterion C-e553aba2 (web-tools › The three tool pages are built from PageHeader, Section and the page widths › The tool sources use the layout parts and keep their pins); waived by Q-014, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-68a6b8c2): The end-to-end test test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium] traces criterion C-68a6b8c2 (web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-015, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3c7c4fbe): The end-to-end test test_m6b_admin::test_grants_error_state_has_two_alerts_and_one_option[chromium], test_m6b_admin::test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form[chromium] traces criterion C-3c7c4fbe (web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-403c66db): The end-to-end test test_m6b_admin::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium] traces criterion C-403c66db (web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; waived by Q-017, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e96ac1a6): No end-to-end test traces criterion C-e96ac1a6 (web-admin › Rejected hold: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table — finding H-5a571db9 › Rejected hold: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3802bfd0): No end-to-end test traces criterion C-3802bfd0 (web-tools › The Grants page keeps its errors, options and subject ids and shows status badges — regression 2 › the Grants page is open at 1366 by 860 with the rows and with the error state of its two e2e test...); step 5 generates one.
- [minor, judge] Observable outcome for Grants hint not confirmed by a passing browser test (criterion C-e96ac1a6): The trace test for C-e96ac1a6 only asserts hint= is present on the subject Field (source-level); it does not verify the hint is rendered under the Role or user field in the browser. The gate report's supplementary generated UI test e2e/test_l4_c_e96ac1a6.py fails at head (also failed at base), so the observable outcome is unconfirmed. Evidence: gate report "UI tests the verifier generated" (C-e96ac1a6 fails_at_head); web/src/tools/grants-subject-hint.test.ts.
- [minor, judge] Observable outcome for section heading geometry not confirmed by a passing browser test (criterion C-3802bfd0): The trace test for C-3802bfd0 only asserts the .ui-section grid-column CSS rule exists (source-level); it does not verify the pixel geometry (heading height < 2x font size, children aligned within 1px) in the browser. The gate report's supplementary generated UI test e2e/test_l4_c_3802bfd0.py fails at head (also failed at base), so the observable outcome is unconfirmed. Evidence: gate report "UI tests the verifier generated" (C-3802bfd0 fails_at_head); web/src/tools/grants-section-layout.test.ts.

## Needs a human

- UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table
- UI criterion C-e96ac1a6 has no end-to-end test; see the generated UI tests table
- UI criterion C-3802bfd0 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.admin.admin-pages-restyle.test.ts::C-1baa1083 the Users page shows a toned state badge, the id and a red confirm` (task 2.1): passed
- `web.src.admin.admin-pages-restyle.test.ts::C-5d8c406e the Mappings page shows reviewer names through useDisplayNames` (task 2.1): passed
- `web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the admin sources use the layout parts and keep their pins` (task 2.1): passed
- `web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the checker fails three altered Users sources` (task 2.1): passed
- `web.src.admin.captions-by-page.test.ts::C-e4e27fab exactly four captions are hidden` (task 1.1): passed
- `web.src.tools.grants-section-layout.test.ts::C-3802bfd0 a section body spans the grid below its heading` (task 1.2): passed
- `web.src.tools.grants-section-layout.test.ts::C-3c7c4fbe the Grants subject field keeps its hint beside the status badges` (task 1.2): passed
- `web.src.tools.grants-subject-hint.test.ts::C-e96ac1a6 the Grants page gives the Role or user field its hint` (task 1.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-3c7c4fbe the Grants page badges the status and keeps subject ids` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-403c66db the Policies page puts its status in the header and bounds one editor` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-68a6b8c2 the Servers page names who registered the server and badges the state` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the checker fails three altered Servers sources` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the tool sources use the layout parts and keep their pins` (task 3.1): passed

## Guard events

- guard.test_tamper: e2e/test_m6b_admin.py
