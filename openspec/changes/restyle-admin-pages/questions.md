# Questions — restyle-admin-pages

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | open | none | verdict | Criterion C-1baa1083 (web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name): accept as satisfied? |
| Q-002 | open | none | verdict | Criterion C-23f3a934 (web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100): accept as satisfied? |
| Q-003 | open | none | verdict | Criterion C-5d8c406e (web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure): accept as satisfied? |
| Q-004 | open | none | verdict | Criterion C-effeb70f (web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line): accept as satisfied? |
| Q-005 | open | none | verdict | Criterion C-68a6b8c2 (web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged) |
| Q-006 | open | none | verdict | Criterion C-3c7c4fbe (web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows): accept as satisfied? |
| Q-007 | open | none | verdict | Criterion C-403c66db (web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy): accept as satisfied? |
| Q-008 | open | none | verdict | Hold H-91a276d8: UI criterion C-b824c627 has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-6e8dbf95: UI criterion C-e4e27fab has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-84f9c6e9: UI criterion C-1baa1083 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-85d419d4: UI criterion C-23f3a934 has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-1dd17d4f: UI criterion C-5d8c406e has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-ddba32f9: UI criterion C-effeb70f has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-73dee3af: UI criterion C-e553aba2 has no end-to-end test; see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-48b9bece: UI criterion C-68a6b8c2 has no end-to-end test; see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-5a571db9: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table |
| Q-017 | open | none | verdict | Hold H-16db4d27: UI criterion C-403c66db has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-1baa1083 (web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-1baa1083 (web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name)

### Context
Criterion C-1baa1083 (web-admin › A destructive confirm is red and a state is a badge › Disable user opens red and the table keeps its name) is needs human after round 2.

Scenario:
\- **WHEN** `test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm` opens `/admin/users` at 1366 by 860 with `/users` answering "Alice Example" (the signed-in user) and "Bob Example" (test-plan-browser.md), then clicks "Disable Bob Example"
\- **THEN** one `heading` "Users" exists; the caption has the class `ui-table-caption ui-visually-hidden`, `position` `absolute` and `clip` `rect(0px, 0px, 0px, 0px)`, and the table's first header cell is at most 2 px below the table's top; Bob's row has one `[data-slot="badge"]` with text "Active" and `data-tone` `success` and contains `user-2`; the dialog has one heading, "Disable user" has `data-tone` `danger` and background `rgb(180, 35, 24)`, "Cancel" is focused; after `Escape` no dialog remains and "Disable Bob Example" is focused; `assert_layout`, `assert_accessible` and `watch_csp` (`[]`) pass

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.admin.admin-pages-restyle.test.ts::C-1baa1083 the Users page shows a toned state badge, the id and a red confirm (passed, red_assertion, inadequate)
Ignored tests: test_m6b_admin::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-002: Criterion C-23f3a934 (web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-23f3a934 (web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100)

### Context
Criterion C-23f3a934 (web-admin › A form sits beside the tables from 1280 px and above them below › The team form is beside the tables at 1366 and above them at 1100) is needs human after round 2.

Scenario:
\- **WHEN** `test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100` opens `/admin/roles-and-teams` with `/roles` answering `author` and `tenant_admin` and `/teams` answering `finance` (test-plan-browser.md), measures at 1366 by 860, then sets the viewport to 1100 by 860
\- **THEN** at 1366 the right edge of the region "Create team" is at most the left edge of the table "Teams", the "Team name" width is at most 640 and the caption of "Roles" has the class `ui-table-caption`; at 1100 the bottom edge of the region is at most the top edge of the table; `assert_layout` passes at both widths, `assert_accessible` passes and `watch_csp` is `[]`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_admin::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-003: Criterion C-5d8c406e (web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-5d8c406e (web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure)

### Context
Criterion C-5d8c406e (web-admin › Reviewer names replace ids only when a person is found › Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure) is needs human after round 2.

Scenario:
\- **WHEN** `test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people` opens `/admin/group-mappings` with two mappings, `reviewedBy` `u_carol` and `operator:e2e-seed`, and `/people` answering `u_carol` as "Carol Example"; then a second page opens it with `/people` answering 500 (test-plan-browser.md)
\- **THEN** the "ursitoare-authors" row contains "Carol Example" and not "u_carol"; the "ursitoare-admins" row contains "operator:e2e-seed"; the `/people` requests of the first page are exactly one, with the query `ids=u_carol`; the caption has the class `ui-table-caption ui-visually-hidden`; the bottom edge of the region "Map a group" is at most the top edge of the table; the right edge of "Remove ursitoare-authors" is at most the right edge of its `.ui-table-wrap`; with four rows (the two above, `ursitoare-approvers` and `team-finance`, the last two with issuer `http://127.0.0.1:53086/realms/ursitoare`) the four "Remove" buttons differ in height by at most 1 px, the wrapper's `scrollWidth <= clientWidth`, and the cells "operator:e2e-seed" and "ursitoare-approvers" are each at most 30 px tall; on the second page, after the response to its one `/people` request (500), the same row contains "u_carol" and the hit list has one entry; `assert_layout`, `assert_accessible` and both `watch_csp` lists (`[]`) pass

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.admin.admin-pages-restyle.test.ts::C-5d8c406e the Mappings page shows reviewer names through useDisplayNames (passed, red_assertion, inadequate)
Ignored tests: test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-004: Criterion C-effeb70f (web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-effeb70f (web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line)

### Context
Criterion C-effeb70f (web-admin › The Audit log keeps actor ids and reads its times on one line › One audit row keeps its ids and its time on one line) is needs human after round 2.

Scenario:
\- **WHEN** `test_audit_page_keeps_actor_ids_and_one_line_times` opens `/admin/audit` at 1366 by 860 with `/audit/verify` answering ok, `/people` answering `u_carol`, and one `identity.group_mapped` event by `{ "kind": "user", "id": "u_carol" }` at `2026-11-18T09:15:00.123456Z` whose details hold a 200-character issuer, an `identity.memberships_synced` event whose target is `usr_01a1ed71-e612-7000-849d-10aa1e127a47`, and a `registry.block_imported` event whose details hold a 64-hex `contentHash` (test-plan-browser.md)
\- **THEN** the region "Chain verification" has a `status` containing "Audit chain verified"; the row contains "user: u_carol" and not "Carol Example"; the `/people` hit list is empty; the cell "2026-11-18 09:15:00 UTC" is at most 24 px tall and the `.ui-table-wrap` has `scrollWidth <= clientWidth`; the two regions have tops within 1 px and the first ends at or before the second's left edge; `assert_layout`, `assert_accessible` and `watch_csp` (`[]`) pass

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-005: Criterion C-68a6b8c2 (web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged)

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-68a6b8c2 (web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged)

### Context
Criterion C-68a6b8c2 (web-tools › The tool server detail names who registered the server outside the Surface region › Registered by Carol Example sits outside the region and the row text is unchanged) is needs human after round 2.

Scenario:
\- **WHEN** `test_tool_servers_show_who_registered_outside_the_surface_region` opens `/admin/tool-servers?server=acme` at 1366 by 860 with the server `acme` pending, `registeredBy` `u_carol`, and `/people` answering `u_carol` as "Carol Example" (test-plan-browser.md), then clicks "Approve surface"
\- **THEN** the region "Surface" contains "acme · https://tools.fake.test · pending" and has one `[data-slot="badge"]` with text "pending" and `data-tone` `warning`; the text "Registered by Carol Example" (`exact=True`) is visible and the same text inside the region has count 0; the `/people` queries are exactly `ids=u_carol`; the caption of "Tool servers" has the class `ui-table-caption ui-visually-hidden`; the button "Approve surface" has background `rgb(29, 78, 216)`; the dialog's heading is "Approve surface 0123456789ab?" and its confirm has `data-tone` `primary` and `rgb(29, 78, 216)`; `assert_layout`, `assert_accessible` and `watch_csp` (`[]`) pass

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.tools.tools-pages-restyle.test.ts::C-68a6b8c2 the Servers page names who registered the server and badges the state (passed, red_assertion, inadequate)
Ignored tests: test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-006: Criterion C-3c7c4fbe (web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-3c7c4fbe (web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows)

### Context
Criterion C-3c7c4fbe (web-tools › The Grants page keeps its errors, options and subject ids and shows status badges › Grants in the error state and with rows) is needs human after round 2.

Scenario:
\- **WHEN** `test_grants_error_state_has_two_alerts_and_one_option` answers `/blocks` and `/grants` with 403 and a `decisionId`, and `test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form` answers one active user grant, one `needs_reconfirm` role grant scoped to `pay-run` / `pay`, one block and `/people` (test-plan-browser.md), both at 1366 by 860
\- **THEN** the first test finds 2 `alert`s, the options of "Tool" are exactly `["Choose a tool"]`, "Create grant" has `aria-disabled` `true`; the second finds the rows containing `user u_bob · acme.lookup_vendor@1 · any step · active` (badge `data-tone` `success`) and `role author · acme.lookup_vendor@1 · pay-run / pay · needs_reconfirm` (badge `warning`), the buttons "Revoke" and "Confirm for the newest version" visible, the caption of "Grants" hidden, the right edge of the region "New grant" at most the left edge of the table, and an empty `/people` hit list; both pass `assert_layout`, `assert_accessible` and `watch_csp` (`[]`)

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.tools.tools-pages-restyle.test.ts::C-3c7c4fbe the Grants page badges the status and keeps subject ids (passed, red_assertion, inadequate)
Ignored tests: test_m6b_admin::test_grants_error_state_has_two_alerts_and_one_option[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m6b_admin::test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-007: Criterion C-403c66db (web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-403c66db (web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy)

### Context
Criterion C-403c66db (web-tools › The Policies page keeps one editor, bounded to the form width › Policies with no deployed policy) is needs human after round 2.

Scenario:
\- **WHEN** `test_policies_page_has_no_status_once_loaded_and_a_bounded_editor` opens `/admin/policies` at 1366 by 860 with `/policies` answering `{ "current": null, "pendingGrants": 1 }` (test-plan-browser.md)
\- **THEN** the texts "No policy deployed." and "1 grant change is not deployed." (both `exact=True`) are visible, the editor "Hand-written Cedar" is at most 768 px wide, "Deploy" has background `rgb(29, 78, 216)`, `status` has count 0, and `assert_layout`, `assert_accessible` and `watch_csp` (`[]`) pass

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.tools.tools-pages-restyle.test.ts::C-403c66db the Policies page puts its status in the header and bounds one editor (passed, red_assertion, inadequate)
Ignored tests: test_m6b_admin::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-91a276d8: UI criterion C-b824c627 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-b824c627 has no end-to-end test; see the generated UI tests table

Step 5 for C-b824c627: not_testable after 1 attempt(s); This criterion checks source files and static test assertions, not browser-observable behavior..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-6e8dbf95: UI criterion C-e4e27fab has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-e4e27fab has no end-to-end test; see the generated UI tests table

Step 5 for C-e4e27fab: not_testable after 1 attempt(s); It checks a TypeScript helper and source-file markers, not browser-observable behavior..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-84f9c6e9: UI criterion C-1baa1083 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-1baa1083 has no end-to-end test; see the generated UI tests table

Step 5 for C-1baa1083: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_1baa1083::test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-85d419d4: UI criterion C-23f3a934 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-23f3a934 has no end-to-end test; see the generated UI tests table

Step 5 for C-23f3a934: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_23f3a934::test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-1dd17d4f: UI criterion C-5d8c406e has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-5d8c406e has no end-to-end test; see the generated UI tests table

Step 5 for C-5d8c406e: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_5d8c406e::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-ddba32f9: UI criterion C-effeb70f has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-effeb70f has no end-to-end test; see the generated UI tests table

Step 5 for C-effeb70f: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_effeb70f::test_audit_page_keeps_actor_ids_and_one_line_times[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-73dee3af: UI criterion C-e553aba2 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-e553aba2 has no end-to-end test; see the generated UI tests table

Step 5 for C-e553aba2: not_testable after 1 attempt(s); It validates source-level checker behavior, not browser-visible behavior..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-015: Hold H-48b9bece: UI criterion C-68a6b8c2 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-68a6b8c2 has no end-to-end test; see the generated UI tests table

Step 5 for C-68a6b8c2: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_68a6b8c2::test_tool_servers_show_who_registered_outside_the_surface_region[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-016: Hold H-5a571db9: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table

Step 5 for C-3c7c4fbe: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_3c7c4fbe::test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-017: Hold H-16db4d27: UI criterion C-403c66db has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-403c66db has no end-to-end test; see the generated UI tests table

Step 5 for C-403c66db: base_error after 2 attempt(s); the test errors at the merge base, which proves nothing: test_l4_c_403c66db::test_policies_page_has_no_status_once_loaded_and_a_bounded_editor[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
