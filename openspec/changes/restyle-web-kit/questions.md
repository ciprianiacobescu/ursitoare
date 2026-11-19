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
| Q-002 | answered | none | verdict | Criterion C-40cb2e75 (web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The Flows form is bounded, toned and keeps its prefix and focus ring): acc |
| Q-003 | answered | none | verdict | Criterion C-5b9e6539 (web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus): accept as satisfied? |
| Q-004 | answered | none | verdict | Hold H-09735f2a: UI criterion C-97684e64 has no end-to-end test; see the generated UI tests table |
| Q-005 | answered | none | verdict | Hold H-b35898ab: UI criterion C-66cb6cb0 has no end-to-end test; see the generated UI tests table |
| Q-006 | answered | none | verdict | Hold H-5c5d8c36: UI criterion C-859c63d2 has no end-to-end test; see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-7415271d: UI criterion C-23da30c9 has no end-to-end test; see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-f260119c: UI criterion C-40cb2e75 has no end-to-end test; see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-1db9756c: UI criterion C-3192e29f has no end-to-end test; see the generated UI tests table |
| Q-010 | answered | none | verdict | Hold H-2dab7e00: UI criterion C-2c488542 has no end-to-end test; see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-6bc82384: UI criterion C-ab3cdbf6 has no end-to-end test; see the generated UI tests table |
| Q-012 | answered | none | verdict | Hold H-a317ca0a: UI criterion C-dac61932 has no end-to-end test; see the generated UI tests table |
| Q-013 | answered | none | verdict | Hold H-95a10e9a: UI criterion C-5b9e6539 has no end-to-end test; see the generated UI tests table |
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

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The repository's own browser test pins this scenario exactly and the sources produce every value it asserts. The stacked Field renders label, control, then hint and error, so the children of the Flow name field are the label, the input, the hint paragraph and the error paragraph in that order; the Flows page gives that field a hint and the empty-name check produces the message Enter a flow name. The error paragraph starts with the visually hidden Error: span, which theme.css positions absolutely at one pixel wide. The Form submit carries the primary tone, which theme.css paints with the accent token #1d4ed8, that is rgb(29, 78, 216), and the on-accent token white. The field rule bounds the field to 40rem, which is 640px, and the focus outline is the 3px focus width token. The test is ignored only because a red step cannot run the browser suite, as the unit's task plan states; the harness's generated replacement could not even be collected.
---

## Q-003: Criterion C-5b9e6539 (web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The repository's own browser test pins this scenario exactly and the sources produce every value it asserts. The dialog is the native dialog element with one h2 and two buttons; its rule sets width 32rem, which is 512px, and the app stylesheet gives dialog margin auto, so a modal dialog is centred at 683 in a 1366 viewport. The confirm button's tone is danger when destructive is set and primary otherwise, and the Users page passes no destructive prop, so the Disable user button takes the primary rule, whose background is the accent token that the test resolves at run time; the Cancel button keeps the quiet .ui-button surface background. The close handler returns focus to the stored opener. The test is ignored only because a red step cannot run the browser suite, as the unit's task plan states; the harness could not write a replacement.
---

## Q-004: Hold H-09735f2a: UI criterion C-97684e64 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. The criterion's scenario is a Node source test, not a browser journey: it runs captionClass on three inputs and reads DataTable.tsx and theme.css. That test exists, is named with the criterion id, and its assertions hold against the current sources: captionClass returns the visible and hidden class strings, DataTable declares the optional captionDisplay prop, writes the class on the caption, keeps aria-label on the group and the region, and theme.css has one visually-hidden rule positioned absolutely. No page passes captionDisplay yet, as the design states, so a browser test on the served pages has nothing to observe beyond what the browser table test already checks; the end-to-end writer timing out adds no doubt about the code.
---

## Q-005: Hold H-b35898ab: UI criterion C-66cb6cb0 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. The criterion's scenario is a Node audit of data.css and tokens.css: one rule per pinned selector, the listed declarations, no raw colour, only defined tokens and no media query. That test exists, is named with the criterion id, and its rows hold against the current data.css: each of the 22 selectors appears once, the wrapper has the divider border, large radius, shadow and background in five declarations, the field rules carry max-width 40rem, the hover row uses the accent surface token, the last row drops its bottom line, the input keeps its frozen border, width and min-height, every token used is defined in tokens.css and the text @media does not occur. The end-to-end writer itself reported that this static audit has no page-observable outcome, and the browser table test already covers the visible effect of these rules.
---

## Q-006: Hold H-5c5d8c36: UI criterion C-859c63d2 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. The repository's own browser test for this scenario opens the Users page with the mocked answers, reads the card wrapper, the Name header, the caption and the Bob Example row before and after the hover, and it ran green in the unit's end-to-end gate at the head. The sources give every value it asserts: the wrapper rule sets a one pixel divider border, the large radius and horizontal scrolling, and the divider token is #d0d5dd, which is rgb(208, 213, 221), while the radius token is 0.5rem, which is 8px; the header cell rule paints the surface token #f4f5f7 at weight 600; the caption rule gives weight 600 and the Users page passes the caption Users; the hover rule paints the accent surface token #eff4ff, which is rgb(239, 244, 255), and no rule gives an unhovered row a background. The data stylesheet is loaded in the components layer and no other stylesheet touches tables, rows or captions. The generated test failed at the base and at the head alike, so it discriminates nothing and says nothing about the code at the head.
---

## Q-007: Hold H-7415271d: UI criterion C-23da30c9 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. The criterion's scenario is a Node source test, not a browser journey: it reads the Field and Form sources and checks the order of the label, control and described blocks, the hidden Error prefix pattern and one primary tone on the submit button. That test exists, is named with the criterion id in three test functions, and its assertions hold against the current sources: the stacked block renders label, then the control, then the hint and error; the inline block keeps control, label, described; the error paragraph starts with the visually hidden Error span; and the Form submit carries data-tone primary exactly once. The end-to-end writer rightly reported that JSX child order and a source occurrence count are not page-observable, and the sibling browser scenario on the Flows form checks the visible effect of the same order and tone.
---

## Q-008: Hold H-f260119c: UI criterion C-40cb2e75 has no end-to-end test; see the generated UI tests table

- **Status:** answered
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
accept: the judge passed it and test_flows_form_is_bounded_and_keeps_its_focus_ring, which asserts every THEN value of the scenario, passed in the round-1 e2e gate (all tests pass at head). It discriminates although no red record exists for a browser test: at the unit base 1ff8361a the Form submit had no data-tone and .ui-button's background was var(--ui-color-surface), so the asserted backgroundColor rgb(29, 78, 216) fails there; this unit adds data-tone="primary" in Form.tsx and the .ui-button[data-tone="primary"] rule in theme.css. Step 5's generated file was uncollectable at the base, which adds nothing either way.
---

## Q-009: Hold H-1db9756c: UI criterion C-3192e29f has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. The criterion's scenario is a Node audit of the theme and tokens stylesheets: one rule per listed selector with its declarations, the primary tone rule after the disabled rule, no raw colour, only defined tokens, 25 colour tokens with the toast background unchanged, and three mutations that the checker rejects. That test exists, is named with the criterion id, and its rows hold against the current theme: the primary and danger tone rules and their hover and toned-disabled rules follow the disabled rule, the dialog is 32rem with a viewport bound, the toast keeps its token background and its hover and focus rules keep exactly two and one declarations, the toast button resets box-shadow, and the page header, section and visually hidden rules are present. The end-to-end writer rightly reported that a stylesheet's internal structure is not page-observable; the browser scenarios on the toned Create flow button and the Disable dialog check the visible effect of these rules.
---

## Q-010: Hold H-2dab7e00: UI criterion C-2c488542 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. The criterion's scenario is a Node source test that reads the eleven kit component files and checks their pinned strings and counts: the native dialog with its form, showModal, cancel before confirm and one data-tone computed from destructive; one primary tone and one alert role in Form; the error panel, loading, empty and toast texts with no data-tone; and no inline style, stylesheet import, palette utility, buttonClasses or ui/button import in any file. That test exists, is named with the criterion id, and its needles hold against the current sources: the confirm dialog is a native dialog with a method dialog form, the cancel button precedes the confirm button, which alone carries the tone expression, and the Form submit carries the primary tone once beside its aria-disabled. The end-to-end writer rightly reported that source strings are not page-observable; the Disable dialog browser scenario checks the visible effect of the tone.
---

## Q-011: Hold H-6bc82384: UI criterion C-ab3cdbf6 has no end-to-end test; see the generated UI tests table

- **Status:** answered
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
accept: the criterion is about the fixed strings returned by the pure helpers sectionHeadingId, captionDisplayFor and PAGE_WIDTHS, which no page shows by itself, so step 5 rightly found no browser test to write. Its Node test failed red then passed green (task 6.1), and the judge passed it. The judge's minor note (a prefix outside [a-z0-9] is not slugified) is a spec gap only: every caller passes a fixed lowercase prefix; recorded for a later spec.
---

## Q-012: Hold H-a317ca0a: UI criterion C-dac61932 has no end-to-end test; see the generated UI tests table

- **Status:** answered
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
accept: the criterion checks the source text of the layout files (no landmark, role, link or inline style) and the kit directory listing, which no page shows, so step 5 rightly found no browser test to write. Its Node test failed red then passed green (task 6.1), and the judge passed it.
---

## Q-013: Hold H-95a10e9a: UI criterion C-5b9e6539 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. The criterion is covered by the unit's own browser test in the end-to-end suite, tagged with the criterion id, which opens the Users page with the mocked me and users answers at 1366 by 860 after watching for Content Security Policy messages, clicks Disable Bob Example, checks one heading and two buttons, the horizontal centre within one pixel of 683 and width at most 512, reads the data-tone of Disable user and compares its background to that token resolved at run time, compares Cancel to the surface token, presses Escape and checks that the dialog is gone, the opener is focused, axe passes and the message list is empty. The sources give every value: the dialog is the native dialog element with one h2 and a cancel button before a confirm button, the app stylesheet centres a dialog with margin auto, the dialog rule sets width 32rem bounded by the viewport, the confirm button's tone is danger when destructive and primary otherwise, the Users page passes no destructive prop so the primary rule paints the accent token, the quiet button rule paints Cancel with the surface token, and the close handler returns focus to the stored opener. The generated writer only failed on a tool permission, which says nothing about the code.
