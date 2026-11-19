# Questions — restyle-web-kit

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
| Q-001 | answered | none | verdict | Criterion C-859c63d2 (web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › A table is a card with a header row and a hover row): accept as satisfied? |
| Q-002 | open | none | verdict | Criterion C-40cb2e75 (web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The Flows form is bounded, toned and keeps its prefix and focus ring): acc |
| Q-003 | open | none | verdict | Criterion C-5b9e6539 (web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus): accept as satisfied? |
| Q-004 | open | none | verdict | Hold H-09735f2a: UI criterion C-97684e64 has no end-to-end test; see the generated UI tests table |
| Q-005 | open | none | verdict | Hold H-b35898ab: UI criterion C-66cb6cb0 has no end-to-end test; see the generated UI tests table |
| Q-006 | open | none | verdict | Hold H-5c5d8c36: UI criterion C-859c63d2 has no end-to-end test; see the generated UI tests table |
| Q-007 | open | none | verdict | Hold H-7415271d: UI criterion C-23da30c9 has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-f260119c: UI criterion C-40cb2e75 has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-1db9756c: UI criterion C-3192e29f has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-2dab7e00: UI criterion C-2c488542 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-6bc82384: UI criterion C-ab3cdbf6 has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-a317ca0a: UI criterion C-dac61932 has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-95a10e9a: UI criterion C-5b9e6539 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-859c63d2 (web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › A table is a card with a header row and a hover row): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-859c63d2 (web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › A table is a card with a header row and a hover row)

### Context
Criterion C-859c63d2 (web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › A table is a card with a header row and a hover row) is needs human after round 1.

Scenario:
\- **WHEN** `test_users_table_is_a_card_with_a_header_and_a_hover_row` opens `/admin/users` with mocked `/api/v1/me` and `/api/v1/users` (Alice and Bob) at 1366 by 860 after `watch_csp(page)`, then hovers the row "Bob Example" (test-plan-browser.md)
\- **THEN** the card wrapper has border colour `rgb(208, 213, 221)`, radius `8px` and `overflow-x` `auto`; "Name" has background `rgb(244, 245, 247)` and weight `600`; the caption's class list contains `ui-table-caption`, its text is `Users` and its weight is `600` (nothing asserts that it is visible or its exact class string, because a page may hide it with `captionDisplay`; the table is found by its name `Users` either way); the row is `rgba(0, 0, 0, 0)` before the hover and `rgb(239, 244, 255)` after; `assert_layout(page, max_banner_px=300)` and `assert_accessible(page)` pass and the `watch_csp` list is `[]`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_kit::test_users_table_is_a_card_with_a_header_and_a_hover_row[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The repository's own browser test pins this scenario exactly and the kit sources produce every value it asserts. The card wrapper rule gives the divider border, the large radius and horizontal scrolling, and the tokens resolve to the asserted colours: the divider token is #d0d5dd, which is rgb(208, 213, 221), the radius token is 0.5rem, which is 8px, the surface token is #f4f5f7 for the header cell with weight 600, and the accent surface token is #eff4ff, which is rgb(239, 244, 255), on the hovered body row, while no rule gives an unhovered row a background. The caption carries the ui-table-caption class with weight 600 and the Users page passes the caption Users. No other stylesheet touches tables, rows or captions, and data.css is loaded in the components layer. The only reason the test is ignored is that a red step cannot run the browser suite, which the unit's task plan states and leaves to the verifier; the harness's generated replacement failed at base and head alike, which points at that generated test rather than at the code.
---

## Q-002: Criterion C-40cb2e75 (web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The Flows form is bounded, toned and keeps its prefix and focus ring): acc

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-40cb2e75 (web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The Flows form is bounded, toned and keeps its prefix and focus ring)

### Context
Criterion C-40cb2e75 (web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The Flows form is bounded, toned and keeps its prefix and focus ring) is needs human after round 1.

Scenario:
\- **WHEN** `test_flows_form_is_bounded_and_keeps_its_focus_ring` opens `/flows` with mocked `/api/v1/me` and `/api/v1/flows` (one flow) at 1366 by 860 after `watch_csp(page)`, focuses "Create flow" and clicks it with `force=True` (test-plan-browser.md)
\- **THEN** "Flow name" is at most 640 px wide; the table "Flows" is visible; "Create flow" has `outlineWidth` at least 2, `backgroundColor` `rgb(29, 78, 216)` and `color` `rgb(255, 255, 255)`; the first `.ui-field-error` has `textContent` exactly `Error: Enter a flow name.`, its hidden span has `position` `absolute` and width 1, and the children of the first `.ui-field` are, in order, `LABEL.ui-field-label`, `INPUT.ui-input`, `P.ui-field-hint`, `P.ui-field-error`; `assert_layout(page, max_banner_px=300)` and `assert_accessible(page)` pass and the `watch_csp` list is `[]`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_kit::test_flows_form_is_bounded_and_keeps_its_focus_ring[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-003: Criterion C-5b9e6539 (web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-5b9e6539 (web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus)

### Context
Criterion C-5b9e6539 (web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus) is needs human after round 1.

Scenario:
\- **WHEN** `test_disable_dialog_is_centred_toned_and_returns_focus` opens `/admin/users` with mocked `/api/v1/me` and `/api/v1/users` at 1366 by 860 after `watch_csp(page)`, clicks "Disable Bob Example" and presses Escape (test-plan-browser.md)
\- **THEN** the `dialog` has one heading and two buttons, its horizontal centre is within 1 px of 683 and its width at most 512, the `data-tone` of "Disable user" is `primary` or `danger` and its computed background equals that token's resolved colour (read from the tokens at run time, not a literal; `rgb(29, 78, 216)` for `primary`, `rgb(180, 35, 24)` for `danger`), and "Cancel" equals `--ui-color-surface`; after Escape there is no `dialog`, "Disable Bob Example" is focused, `assert_accessible(page)` passes and the `watch_csp` list is `[]`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_kit::test_disable_dialog_is_centred_toned_and_returns_focus[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-004: Hold H-09735f2a: UI criterion C-97684e64 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-97684e64 has no end-to-end test; see the generated UI tests table

Step 5 for C-97684e64: writer_failed after 1 attempt(s); no answer within 600s.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-005: Hold H-b35898ab: UI criterion C-66cb6cb0 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-66cb6cb0 has no end-to-end test; see the generated UI tests table

Step 5 for C-66cb6cb0: not_testable after 1 attempt(s); This criterion is a static audit of CSS source files (one rule per pinned selector, exact declarations, findRawColours === [], defined CSS vars, no @media) with no user-observable outcome through the page's public interface, so it cannot be verified by an E2E browser test..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-006: Hold H-5c5d8c36: UI criterion C-859c63d2 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-859c63d2 has no end-to-end test; see the generated UI tests table

Step 5 for C-859c63d2: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_859c63d2::test_users_table_is_a_card_with_a_header_and_a_hover_row[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-007: Hold H-7415271d: UI criterion C-23da30c9 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-23da30c9 has no end-to-end test; see the generated UI tests table

Step 5 for C-23da30c9: not_testable after 1 attempt(s); The criterion verifies static TSX source structure (JSX child order in Field/Form and a data-tone occurrence count in source), which is not user-observable through the page fixture, and no route is given to mount a Field/Form..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-f260119c: UI criterion C-40cb2e75 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-40cb2e75 has no end-to-end test; see the generated UI tests table

Step 5 for C-40cb2e75: uncollectable after 1 attempt(s); no test of the new file ran at the merge base (collection error or no test).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-1db9756c: UI criterion C-3192e29f has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-3192e29f has no end-to-end test; see the generated UI tests table

Step 5 for C-3192e29f: not_testable after 1 attempt(s); The criterion asserts internal CSS file structure (theme.css/tokens.css rules read by a Node unit test); the page renders no kit buttons, dialogs, states or toasts, so nothing is observable through the page fixture..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-2dab7e00: UI criterion C-2c488542 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-2c488542 has no end-to-end test; see the generated UI tests table

Step 5 for C-2c488542: not_testable after 1 attempt(s); Criterion verifies static source-file string contents via readFileSync; nothing user-observable is exposed at the base URL (snapshot shows only an empty #root), so it cannot be checked through the pytest-playwright page fixture..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-6bc82384: UI criterion C-ab3cdbf6 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-ab3cdbf6 has no end-to-end test; see the generated UI tests table

Step 5 for C-ab3cdbf6: not_testable after 1 attempt(s); sectionHeadingId, captionDisplayFor and PAGE_WIDTHS are pure layout helpers not exposed through any browser-observable interface on the base origin page (empty root), so a pytest-playwright e2e test limited to that origin cannot observe them..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-a317ca0a: UI criterion C-dac61932 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-dac61932 has no end-to-end test; see the generated UI tests table

Step 5 for C-dac61932: not_testable after 1 attempt(s); The criterion asserts static source-file contents (banned strings, exact markup, directory listings of kit/ and kit/layout/) rather than anything observable through the page; the snapshot renders only an empty #root, so there is no public UI interface to assert against..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-95a10e9a: UI criterion C-5b9e6539 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-5b9e6539 has no end-to-end test; see the generated UI tests table

Step 5 for C-5b9e6539: writer_failed after 2 attempt(s); opencode's permission rules rejected a tool call (bash).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
