# Questions — add-ui-foundation

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
| Q-001 | answered | none | verdict | Criterion C-546ee64e (web-design-system › Unstyled elements stay readable and the signed-out pages stay clean › Signed-out pages are styled, clean and accessible): accept as satisfied? |
| Q-002 | open | none | verdict | Hold H-b858d0c9: UI criterion C-52eda073 has no end-to-end test; see the generated UI tests table |
| Q-003 | open | none | verdict | Hold H-9ada2edb: UI criterion C-c476cd94 has no end-to-end test; see the generated UI tests table |
| Q-004 | open | none | verdict | Hold H-508a051f: UI criterion C-546ee64e has no end-to-end test; see the generated UI tests table |
| Q-005 | open | none | verdict | Hold H-ee794d23: UI criterion C-d77fa65f has no end-to-end test; see the generated UI tests table |
| Q-006 | open | none | verdict | Hold H-7cfd2d65: UI criterion C-d3240b20 has no end-to-end test; see the generated UI tests table |
| Q-007 | open | none | verdict | Hold H-0311979d: UI criterion C-3c9f8b7f has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-ab85b284: UI criterion C-d69c05cb has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-ad97dd92: UI criterion C-a22e8a8b has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-52afaabe: UI criterion C-48ccaf77 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-c11b074f: UI criterion C-67de6235 has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-e8d05402: UI criterion C-97e30a51 has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-b5dcea3b: UI criterion C-f665c2d6 has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-53d309b3: UI criterion C-f357664d has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-546ee64e (web-design-system › Unstyled elements stay readable and the signed-out pages stay clean › Signed-out pages are styled, clean and accessible): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-546ee64e (web-design-system › Unstyled elements stay readable and the signed-out pages stay clean › Signed-out pages are styled, clean and accessible)

### Context
Criterion C-546ee64e (web-design-system › Unstyled elements stay readable and the signed-out pages stay clean › Signed-out pages are styled, clean and accessible) is needs human after round 2.

Scenario:
\- **WHEN** `test_signed_out_pages_are_styled_clean_and_accessible` opens `/` and `/sign-in` at 1366 by 860 after `watch_csp(page)` (test-plan-browser.md)
\- **THEN** `assert_layout(page, max_banner_px=300)` passes, the `h1` `font-size` is at least 24 px, `assert_accessible(page)` passes and the `watch_csp` list is `[]`; the test is green on arrival at main (its `h1` is 32 px), so it guards the base layer rather than proving it

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_foundation::test_signed_out_pages_are_styled_clean_and_accessible[chromium-/] (no proof that it discriminates (no red, audit or generated record)); test_m6b_foundation::test_signed_out_pages_are_styled_clean_and_accessible[chromium-/sign-in] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. Its own scenario says the browser test is green on arrival at main and guards the base layer rather than proving it, so no red or discriminating record can exist for it by design, and the project's rules leave browser-only criteria to the verifier rather than to a red step. The unit's test test_signed_out_pages_are_styled_clean_and_accessible in e2e/test_m6b_foundation.py performs exactly the scenario: viewport 1366 by 860, watch_csp before goto, assert_layout with max_banner_px=300, h1 font-size at least 24, assert_accessible, and an empty violation list, parametrized over / and /sign-in. The base layer in web/src/styles/app.css holds the h1 rule at 1.5rem and no other stylesheet sets an h1 font-size, and main.tsx imports only app.css, so the 24 px floor follows from the code. The test-plan-browser record and the design's probe report the four runs green against the scratch build and main's live stack, and the e2e gate keeps running this test on every verification.
---

## Q-002: Hold H-b858d0c9: UI criterion C-52eda073 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-52eda073 has no end-to-end test; see the generated UI tests table

Step 5 for C-52eda073: not_testable after 1 attempt(s); This criterion requires reading a local tokens.css file and programmatically evaluating contrast ratios for mutated token sets (F1-F3), which is not observable or driveable through the browser over the base origin; it is a unit-test concern, not user-visible behavior..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-003: Hold H-9ada2edb: UI criterion C-c476cd94 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-c476cd94 has no end-to-end test; see the generated UI tests table

Step 5 for C-c476cd94: not_testable after 1 attempt(s); The criterion verifies source-file contents (app.css import order and bridge/base lines, tokens.css colours, main.tsx CSS imports, vite.config.ts plugins) by reading files on disk. None of this is observable through the browser's public interface or reachable by requesting only the base origin, s....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-004: Hold H-508a051f: UI criterion C-546ee64e has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-546ee64e has no end-to-end test; see the generated UI tests table

Step 5 for C-546ee64e: uncollectable after 1 attempt(s); no test of the new file ran at the merge base (collection error or no test).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-005: Hold H-ee794d23: UI criterion C-d77fa65f has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-d77fa65f has no end-to-end test; see the generated UI tests table

Step 5 for C-d77fa65f: not_testable after 1 attempt(s); The criterion checks static source-code scanners for hits/misses on test-plan.md rows; it has no browser-observable outcome or named public UI interface to drive via page..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-006: Hold H-7cfd2d65: UI criterion C-d3240b20 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-d3240b20 has no end-to-end test; see the generated UI tests table

Step 5 for C-d3240b20: not_testable after 1 attempt(s); The criterion requires running three static-analysis scanners over the local source tree (every .ts/.tsx under web/src except *.test.ts, plus ui/rules.ts) and asserting filesystem-level results such as file counts and specific import lines. Nothing about this is observable through the browser pag....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-007: Hold H-0311979d: UI criterion C-3c9f8b7f has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-3c9f8b7f has no end-to-end test; see the generated UI tests table

Step 5 for C-3c9f8b7f: not_testable after 1 attempt(s); The criterion reads web/package.json from the filesystem and compares package names/versions; nothing in the browser UI or page snapshot exposes the manifest, so it cannot be checked through the page fixture..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-ab85b284: UI criterion C-d69c05cb has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-d69c05cb has no end-to-end test; see the generated UI tests table

Step 5 for C-d69c05cb: not_testable after 1 attempt(s); cn and buttonClasses are class-merging utilities with no browser-observable outcome; the page snapshot renders an empty root and no buttons, so the class strings cannot be asserted through the page fixture..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-ad97dd92: UI criterion C-a22e8a8b has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-a22e8a8b has no end-to-end test; see the generated UI tests table

Step 5 for C-a22e8a8b: not_testable after 1 attempt(s); The criterion inspects static source-file contents (findInlineStyleUse results, button.tsx and badge.tsx text) via a file reader; nothing rendered at the base URL exposes these sources, so a page-fixture test cannot observe the required outcome..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-52afaabe: UI criterion C-48ccaf77 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-48ccaf77 has no end-to-end test; see the generated UI tests table

Step 5 for C-48ccaf77: not_testable after 1 attempt(s); The criterion checks return values of tone-mapper functions (runStateTone, versionStateTone, serverStateTone, grantStatusTone), which are not exposed through any page or user-observable UI element; there is nothing for the page fixture to assert, and test-plan.md T7 contents are unavailable..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-c11b074f: UI criterion C-67de6235 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-67de6235 has no end-to-end test; see the generated UI tests table

Step 5 for C-67de6235: uncollectable after 1 attempt(s); no test of the new file ran at the merge base (collection error or no test).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-e8d05402: UI criterion C-97e30a51 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-97e30a51 has no end-to-end test; see the generated UI tests table

Step 5 for C-97e30a51: base_error after 2 attempt(s); the test errors at the merge base, which proves nothing: test_l4_c_97e30a51::test_assert_layout_reports_the_numbers[chromium], test_l4_c_97e30a51::test_watch_csp_reports_a_violation[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-b5dcea3b: UI criterion C-f665c2d6 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-f665c2d6 has no end-to-end test; see the generated UI tests table

Step 5 for C-f665c2d6: not_testable after 1 attempt(s); The criterion verifies static source-file properties (findInlineStyleUse, dangerouslySetInnerHTML, registerEditorPanel/registerRunMessages calls, flowFeatureLiterals return value) that are not exposed through the rendered UI; only a subset of string labels is user-observable, so a pytest-playwrig....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-53d309b3: UI criterion C-f357664d has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-f357664d has no end-to-end test; see the generated UI tests table

Step 5 for C-f357664d: writer_failed after 1 attempt(s); opencode's permission rules rejected a tool call (bash).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
