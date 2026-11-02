# Questions — add-web-flow-editor

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
| Q-001 | answered | none | verdict | Criterion C-086f1719 (web-flow-editor › The editor works against the real engine, in logic and in a browser › Alice creates, edits, saves and validates): accept as satisfied? |
| Q-002 | open | none | verdict | Hold H-5e7d0c9f: UI criterion C-1f5393c5 has no end-to-end test; see the generated UI tests table |
| Q-003 | open | none | verdict | Hold H-35d043eb: UI criterion C-b6b033e0 has no end-to-end test; see the generated UI tests table |
| Q-004 | open | none | verdict | Hold H-07cda852: UI criterion C-e71f3bcb has no end-to-end test; see the generated UI tests table |
| Q-005 | open | none | verdict | Hold H-38c874c4: UI criterion C-94bf935b has no end-to-end test; see the generated UI tests table |
| Q-006 | open | none | verdict | Hold H-67f12272: UI criterion C-92ac8872 has no end-to-end test; see the generated UI tests table |
| Q-007 | open | none | verdict | Hold H-a353239d: UI criterion C-f4c862cb has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-4b5a072c: UI criterion C-36b16be8 has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-4db2c80f: UI criterion C-f96f8003 has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-62ed1c71: UI criterion C-944fd4d1 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-796232b4: UI criterion C-84837cec has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-b9374a84: UI criterion C-ba506c1d has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-bbd88603: UI criterion C-159129bd has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-99f05b4a: UI criterion C-3e0a938c has no end-to-end test; see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-2e32408a: UI criterion C-6b221b86 has no end-to-end test; see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-c1bc3708: UI criterion C-086f1719 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-086f1719 (web-flow-editor › The editor works against the real engine, in logic and in a browser › Alice creates, edits, saves and validates): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-086f1719 (web-flow-editor › The editor works against the real engine, in logic and in a browser › Alice creates, edits, saves and validates)

### Context
Criterion C-086f1719 (web-flow-editor › The editor works against the real engine, in logic and in a browser › Alice creates, edits, saves and validates) is needs human after round 2.

Scenario:
\- **WHEN** `e2e/test_m3_flow_editor.py` signs in alice with `login(page, users["alice"])`, collects console messages, opens "Flows" from the navigation, creates `demo-intake` for `finance` with the labels "Flow name" and "Owner team", fills the text box "Flow text" with `BAD`, presses "Save version", presses "Validate", then fills `GOOD` and presses "Validate"
\- **THEN** the title is "Flow demo-intake · Ursitoare"; the region "Diagnostics" has a status containing "Not valid. 1 error" and a link "Guide for L2_UNKNOWN_BLOCK (opens in a new tab)" whose `href` ends with "docs/authoring/diagnostics.md#l2_unknown_block"; `.cm-lintRange-error` exists; after `GOOD` the status contains "Valid. 0 errors"; `.cm-scroller` has `overflow-x` "auto"; no console message mentions "Content Security Policy"; Tab leaves the text box for "Save version"; `assert_accessible(page)` passes on both pages

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m3_flow_editor::test_c_086f1719_alice_creates_edits_saves_and_validates[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The browser journey tagged with this criterion performs every step of the scenario and asserts every clause of its THEN: the title, the Diagnostics region status and guide link with its href, the lint range, the valid status after the good text, the overflow-x of the scroller, the absence of Content-Security-Policy console messages, Tab moving focus to Save version, and the accessibility check on both pages. The page, the editor configuration and the shadow-root mount implement each of those facts, and the design records the measured behaviour under the engine's policy. The only reason the verifier set the criterion aside is that the browser test has no red record, which the project's own rules make impossible: a red step runs only the Node gate and a criterion that only browser tests check is left to the verifier. The e2e gate runs the whole e2e folder, so this test is exercised in every verification round.
---

## Q-002: Hold H-5e7d0c9f: UI criterion C-1f5393c5 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-1f5393c5 has no end-to-end test; see the generated UI tests table

Step 5 for C-1f5393c5: not_testable after 2 attempt(s); The criterion asserts values of TypeScript module exports (FLOW_PAGES, nav, flowFeatureLiterals, FLOW_TABLES from createFeatureRegistry) that are not observable through the browser DOM against the base URL; it requires a Node/JS unit test, not a pytest-playwright e2e test..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-003: Hold H-35d043eb: UI criterion C-b6b033e0 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-b6b033e0 has no end-to-end test; see the generated UI tests table

Step 5 for C-b6b033e0: not_testable after 1 attempt(s); The criterion concerns internal functions (parseFlow, flowCells, flowListFetcher) whose results and client call arguments are not exposed through the page UI; nothing a user can see corresponds to parseFlow returning null or to the exact fetch options, so it cannot be asserted via the page fixture..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-004: Hold H-07cda852: UI criterion C-e71f3bcb has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-e71f3bcb has no end-to-end test; see the generated UI tests table

Step 5 for C-e71f3bcb: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_e71f3bcb::test_flow_creation_checks_form_and_sends_idempotent_request[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-005: Hold H-38c874c4: UI criterion C-94bf935b has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-94bf935b has no end-to-end test; see the generated UI tests table

Step 5 for C-94bf935b: not_testable after 1 attempt(s); The criterion tests internal TypeScript API client functions (saveVersion, loadVersion, saveMessage) by inspecting exact fetch call structures and rejection reasons, not user-observable page behavior; pytest-playwright cannot invoke these client functions directly or assert their internal opts/bo....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-006: Hold H-67f12272: UI criterion C-92ac8872 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-92ac8872 has no end-to-end test; see the generated UI tests table

Step 5 for C-92ac8872: not_testable after 1 attempt(s); textProblemRow is an internal TypeScript function invoked with constructed ApiRequestError values; it is not exposed by any URL or user action, so an e2e test against L4_E2E_BASE_URL cannot call it or supply these specific server errors..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-007: Hold H-a353239d: UI criterion C-f4c862cb has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-f4c862cb has no end-to-end test; see the generated UI tests table

Step 5 for C-f4c862cb: not_testable after 1 attempt(s); The criterion directly calls internal TypeScript functions from src/authoring/index.ts (including asserting a thrown RangeError and exact return values); those outcomes are not observable through the browser page's public interface, so a page: Page e2e test cannot check them..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-4b5a072c: UI criterion C-36b16be8 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-36b16be8 has no end-to-end test; see the generated UI tests table

Step 5 for C-36b16be8: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_36b16be8::test_validation_shows_diagnostics_that_link_to_the_guide[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-4db2c80f: UI criterion C-f96f8003 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-f96f8003 has no end-to-end test; see the generated UI tests table

Step 5 for C-f96f8003: not_testable after 1 attempt(s); Criterion checks TypeScript functions diagnosticHref/diagnosticLink against code sets — a unit-level property with no browser-observable outcome, so it cannot be verified through the playwright page fixture against the base URL origin..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-62ed1c71: UI criterion C-944fd4d1 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-944fd4d1 has no end-to-end test; see the generated UI tests table

Step 5 for C-944fd4d1: not_testable after 1 attempt(s); Internal function results (lineColumnOffset offsets, pointerRange slices, lintItems from/to/source) are not exposed or observable through the rendered page; only severity/code/message are shown, so the exact numeric outcomes cannot be asserted via the page fixture..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-796232b4: UI criterion C-84837cec has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-84837cec has no end-to-end test; see the generated UI tests table

Step 5 for C-84837cec: not_testable after 2 attempt(s); The criterion requires reading source files (editor-mount.ts, flows.css, flows .tsx files, feature files, tokens.css) and asserting on internal editor behaviour (createEditorState document, key bindings, theme raw colours, shadow-root attachment, EditorView root argument, inline-style/CSP source ....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-b9374a84: UI criterion C-ba506c1d has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-ba506c1d has no end-to-end test; see the generated UI tests table

Step 5 for C-ba506c1d: writer_failed after 2 attempt(s); code does not parse: SyntaxError.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-bbd88603: UI criterion C-159129bd has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-159129bd has no end-to-end test; see the generated UI tests table

Step 5 for C-159129bd: not_testable after 1 attempt(s); The panel registry (createEditorPanelRegistry/listEditorPanels) is an internal frontend module not exposed through the browser's public interface or window, and the criterion also asserts source-file structure (each listEditorPanels( follows function FlowEditorPage( in FlowEditorPage.tsx). Neithe....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-99f05b4a: UI criterion C-3e0a938c has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-3e0a938c has no end-to-end test; see the generated UI tests table

Step 5 for C-3e0a938c: not_testable after 1 attempt(s); The criterion describes backend seeding operations (cataloguePart.start, seed, discoverParts, listBlockVersions, readCatalogueDocument, registry.block_imported events) with no web UI observable outcome; nothing named is checkable through the page fixture / base URL origin..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-015: Hold H-2e32408a: UI criterion C-6b221b86 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-6b221b86 has no end-to-end test; see the generated UI tests table

Step 5 for C-6b221b86: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_6b221b86::test_flow_editor_alice_bob_carol_mallory[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-016: Hold H-c1bc3708: UI criterion C-086f1719 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-086f1719 has no end-to-end test; see the generated UI tests table

Step 5 for C-086f1719: writer_failed after 2 attempt(s); structured output invalid: criterion: required; $id: not allowed; type: not allowed.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
