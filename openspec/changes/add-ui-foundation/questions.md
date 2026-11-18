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
| Q-002 | answered | none | verdict | Hold H-b858d0c9: UI criterion C-52eda073 has no end-to-end test; see the generated UI tests table |
| Q-003 | answered | none | verdict | Hold H-9ada2edb: UI criterion C-c476cd94 has no end-to-end test; see the generated UI tests table |
| Q-004 | answered | none | verdict | Hold H-508a051f: UI criterion C-546ee64e has no end-to-end test; see the generated UI tests table |
| Q-005 | answered | none | verdict | Hold H-ee794d23: UI criterion C-d77fa65f has no end-to-end test; see the generated UI tests table |
| Q-006 | answered | none | verdict | Hold H-7cfd2d65: UI criterion C-d3240b20 has no end-to-end test; see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-0311979d: UI criterion C-3c9f8b7f has no end-to-end test; see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-ab85b284: UI criterion C-d69c05cb has no end-to-end test; see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-ad97dd92: UI criterion C-a22e8a8b has no end-to-end test; see the generated UI tests table |
| Q-010 | answered | none | verdict | Hold H-52afaabe: UI criterion C-48ccaf77 has no end-to-end test; see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-c11b074f: UI criterion C-67de6235 has no end-to-end test; see the generated UI tests table |
| Q-012 | answered | none | verdict | Hold H-e8d05402: UI criterion C-97e30a51 has no end-to-end test; see the generated UI tests table |
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

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. Criterion C-52eda073 is the scenario The new tokens are hex and their contrast pairs pass, which by its own text reads the real tokens.css and runs the F0 to F3 rows of test-plan.md T1 through checkTokenContrast; it is a Node unit-test scenario about a source file and a pure function, with nothing a browser can observe over the base origin. Six Node tests named with the criterion id in web/src/kit/extra-contrast.test.ts cover each row: the nine ids and minimums, the real tokens passing with the listed ratios, the 25 hex colours, the weak quiet-text failure, the five sidebar zero-ratio failures and the two accent-surface failures. An end-to-end test would add nothing the scenario asks for.
---

## Q-003: Hold H-9ada2edb: UI criterion C-c476cd94 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. Criterion C-c476cd94 is the scenario app.css keeps its imports, bridge and base layer in order, which by its own text is a test that reads app.css, tokens.css, main.tsx and vite.config.ts and checks their lines. That is source-file content, not anything observable through the browser, so step 5 is right that no end-to-end test can assert it. Three Node tests named with the criterion id in web/src/styles/app-css.test.ts check the 13 imports in order and the allowed top-level lines, the single --color-*: initial line, one bridge line per colour token, the ten base rules and no raw colour, and the one stylesheet import in main.tsx with the tailwind plugin in vite.config.ts. I also read app.css and main.tsx and they match.
---

## Q-004: Hold H-508a051f: UI criterion C-546ee64e has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. The verifier's generated file for C-546ee64e was uncollectable at the merge base, but the unit does have an end-to-end test for this criterion: test_signed_out_pages_are_styled_clean_and_accessible in e2e/test_m6b_foundation.py, tagged with the criterion id, imports pytest correctly, and performs every step of the scenario over / and /sign-in at 1366 by 860, with watch_csp before goto, assert_layout at 300 px, an h1 of at least 24 px, assert_accessible and an empty violation list. The criterion's own text says this test is green at main and guards rather than proves the base layer, so a generated discriminating test is not something the specification expects. The base layer in app.css holds the h1 rule, main.tsx imports only app.css, and the unit's browser plan records the test passing against the scratch build and main. The e2e gate continues to run this test on every verification.
---

## Q-005: Hold H-ee794d23: UI criterion C-d77fa65f has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. Criterion C-d77fa65f is the scenario Palette utilities, stylesheet imports and banned imports: hits and misses, which by its own text runs the three pure scanner functions on the sample rows P1 to P11, C1 to C8 and B1 to B11 of test-plan.md T3. These are string-in, hits-out unit checks of source-code scanners with no browser-observable outcome, so step 5 is right that no end-to-end test can drive them. Three Node tests named with the criterion id in web/src/ui/rules.test.ts cover the palette rows including the joined arbitrary-colour samples and the line-2 hit, the css-import hits and misses including the .css.ts miss, and the banned-import hits and misses including the react-slot and react-dialog-extra misses and the bare string line.
---

## Q-006: Hold H-7cfd2d65: UI criterion C-d3240b20 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. Criterion C-d3240b20 is the scenario The real tree holds the rules, and the scanners scan themselves clean, which by its own text is a Node test that walks every .ts and .tsx under web/src except *.test.ts with the three scanners and then scans ui/rules.ts alone. That is a filesystem and source-content check with nothing a browser can observe, so step 5 is right that no end-to-end test can drive it. Two Node tests named with the criterion id in web/src/ui/rules-tree.test.ts assert at least 100 files, the single stylesheet import in main.tsx, no banned-import and no palette hit in any file, rules.ts clean for all three scanners, and no stylesheet import left in the 20 task files.
---

## Q-007: Hold H-0311979d: UI criterion C-3c9f8b7f has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. Criterion C-3c9f8b7f is the scenario The packages: no banned name, nine exact versions, which by its own text is a test that reads web/package.json and compares it with BANNED_PACKAGES and M6B_PACKAGES. A package manifest is not visible through the browser, so step 5 is right that no end-to-end test can check it. Three Node tests named with the criterion id in web/src/ui/packages.test.ts assert the 14 banned names in order, the nine exact versions split seven and two, and that the manifest holds none of the banned names in its four dependency sections and each of the nine at its exact version.
---

## Q-008: Hold H-ab85b284: UI criterion C-d69c05cb has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. Criterion C-d69c05cb is the scenario cn and buttonClasses merge and order their classes, which by its own text runs the two pure functions on the K1 to K12 and B1 to B6 rows and the eight tone and size pairs of test-plan.md T5 and compares the returned class strings. These are string-in, string-out unit checks; this unit changes no page markup and mounts no Button, so step 5 is right that no end-to-end test can assert them. Three Node tests named with the criterion id in web/src/ui/classes.test.ts cover the cn rows including the listed three, the buttonClasses rows including primary sm and the className bg-accent override, and all eight pairs for ui-button, aria-disabled:cursor-not-allowed and an empty findPaletteUtilities result.
---

## Q-009: Hold H-ad97dd92: UI criterion C-a22e8a8b has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. Criterion C-a22e8a8b is the scenario The components' sources keep the markup rules, which by its own text is a test that reads the six component sources and checks findInlineStyleUse, forbidden substrings and required markers. That is source-text inspection, and this unit mounts none of the six components in a page, so step 5 is right that no end-to-end test can observe it. Six Node tests named with the criterion id in web/src/ui/components.test.ts cover each file: no inline style and no outline-none, focus ring or role= in any of them, button.tsx without the standalone word disabled and with data-slot button, Slot, buttonClasses(, type = button and the props spread, badge.tsx with data-slot badge, data-tone and the five tone pairs, and the card, skeleton, tooltip and collapsible tokens.
---

## Q-010: Hold H-52afaabe: UI criterion C-48ccaf77 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. Criterion C-48ccaf77 is the scenario Tone mappers, which by its own text runs the five pure mapper functions on the rows of test-plan.md T7 and compares the returned Tone strings. No page in this unit calls these mappers, so step 5 is right that no end-to-end test can observe their output. Six Node tests named with the criterion id in web/src/ui/tones.test.ts cover each mapper's known states, including failed to danger, published to info, tested to success, drifted to warning and needs_reconfirm to warning, and the fallback to neutral for weird, the empty string, __proto__ and toString across all five. The implementation in tones.ts uses switch statements with a neutral default, so prototype keys cannot leak.
---

## Q-011: Hold H-c11b074f: UI criterion C-67de6235 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. Criterion C-67de6235 is the scenario Durations, instants and ages, which by its own text runs the three pure functions formatDuration, formatInstant and formatAgo on the D1 to D13, I1 to I6 and A1 to A10 rows of test-plan.md T8 and compares the returned strings. No file under web/src other than format.ts and its test names these functions, and the design says this unit changes no page's markup, so nothing a browser can observe depends on them and step 5's generated file could only fail to collect. Three Node tests named with the criterion id in web/src/ui/format.test.ts cover every row, including 999 ms as <1 s, 2,349 ms as 2.3 s, 245 s as 4 min 5 s, 7,410 s as 2 h 3 min, the reversed range as a dash, the +01:00 instant as 21:38 UTC, yesterday and the out-of-range year kept, 5 min ago, 49 h as 2 d ago, and formatInstant of the input for one second ahead and junk. The implementation in format.ts matches the requirement's rules.
---

## Q-012: Hold H-e8d05402: UI criterion C-97e30a51 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept The hold can be waived. Criterion C-97e30a51 is the scenario watch_csp sees a violation and assert_layout reports numbers, and the unit does have end-to-end tests for it: test_watch_csp_reports_a_violation and test_assert_layout_reports_the_numbers in e2e/test_m6b_foundation.py, both tagged with the criterion id, perform exactly the scenario's steps, namely a routed page with the style-src header and a style element whose list gains an entry starting Content Security Policy violation: style-src, and a 100 px banner above a 1,500 px body in a 1,000 px window that raises the two numbered messages, passes at 100 and raises exactly layout: banner 100px is taller than 99px at 99. The helpers in e2e/conftest.py match the requirement: watch_csp adds an init script that logs each securitypolicyviolation with its directive and blocked URI, listens on console for Content Security Policy and returns the live list; assert_layout reads the banner by role and raises AssertionError with layout: and the joined problems. The Node test web/src/ui/e2e-helpers.test.ts checks both definitions, the violation text, and that login and assert_accessible remain. The generated test erroring at the merge base proves nothing only because the helpers do not exist there, which is the expected state before this unit; the unit's own tests import the helpers and so would also fail at main, so they do discriminate.
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
