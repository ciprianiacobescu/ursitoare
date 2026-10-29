# Questions — add-web-ui-kit

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
| Q-001 | accepted | 9.1 | technical | e2e/test_m1_web_kit.py:129 — set_content page without <title>/<html lang> can never pass assert_accessible |
| Q-002 | accepted | 9.1 | technical | test/support/a11y-setup.test.ts:167 (C-574fc31a) depends on e2e/conftest.py:68, which the frozen-test guard protects |
| Q-003 | open | none | verdict | Criterion C-c5c7028c (web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The helper in a browser): accept as satisfied? |
| Q-004 | answered | none | verdict | Finding F-4e8c6585: Toast Dismiss button turns white-on-white on hover |
| Q-005 | answered | none | verdict | Hold H-4c6c7bb5: UI criterion C-cb608bfb has no end-to-end test (not_testable); see the generated UI tests table |
| Q-006 | answered | none | verdict | Hold H-2b729d71: UI criterion C-16a71639 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-01c51033: UI criterion C-4f003820 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-f79f2bc2: UI criterion C-92d9ac35 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-6dadab51: UI criterion C-d365d748 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-010 | answered | none | verdict | Hold H-df7e1bc7: UI criterion C-e2ce7344 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-fb25c506: UI criterion C-2f2f685e has no end-to-end test (not_testable); see the generated UI tests table |
| Q-012 | answered | none | verdict | Hold H-9e414469: UI criterion C-c175f655 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-013 | answered | none | verdict | Hold H-c4c6e005: UI criterion C-1688efa8 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-560ac014: UI criterion C-30ed04fb has no end-to-end test (not_testable); see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-ae010e47: UI criterion C-0dae9ed5 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-5049f1f6: UI criterion C-63a759ac has no end-to-end test (not_testable); see the generated UI tests table |
| Q-017 | open | none | verdict | Hold H-b1fcc4d1: UI criterion C-af45d5fe has no end-to-end test (not_testable); see the generated UI tests table |
| Q-018 | open | none | verdict | Hold H-fc3f4be7: UI criterion C-844ec099 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-019 | open | none | verdict | Hold H-05b93ca5: UI criterion C-c0db9325 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-020 | open | none | verdict | Hold H-59ec0374: UI criterion C-38740f97 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-021 | open | none | verdict | Hold H-ca25c180: UI criterion C-b735b791 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-022 | open | none | verdict | Hold H-223efcbe: UI criterion C-c149362f has no end-to-end test (not_testable); see the generated UI tests table |
| Q-023 | open | none | verdict | Hold H-b19cf330: UI criterion C-51e7abfc has no end-to-end test (not_testable); see the generated UI tests table |
| Q-024 | open | none | verdict | Hold H-c9b87e6e: UI criterion C-ab614782 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-025 | open | none | verdict | Hold H-da07a80f: UI criterion C-0b8be44d has no end-to-end test (not_testable); see the generated UI tests table |
| Q-026 | open | none | verdict | Hold H-2d42146d: UI criterion C-278586d8 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-027 | open | none | verdict | Hold H-af0cdc46: UI criterion C-c3a242d6 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-028 | open | none | verdict | Hold H-d560b43e: UI criterion C-16e957dd has no end-to-end test (not_testable); see the generated UI tests table |
| Q-029 | open | none | verdict | Hold H-72502a0f: UI criterion C-d9604877 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-030 | open | none | verdict | Hold H-0e29e529: UI criterion C-a1ea941d has no end-to-end test (not_testable); see the generated UI tests table |
| Q-031 | open | none | verdict | Hold H-d7bde6af: UI criterion C-574fc31a has no end-to-end test (not_testable); see the generated UI tests table |
| Q-032 | open | none | verdict | Hold H-addeb9d5: UI criterion C-c5c7028c has no end-to-end test (fails_at_head); see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: e2e/test_m1_web_kit.py:129 — set_content page without <title>/<html lang> can never pass assert_accessible

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 9.1
- **Kind:** technical
- **Asked:** 2026-10-29T19:40Z by glm, run r-20261029T1856Z-fd8d, task 9.1

### Context
The frozen test asserts that assert_accessible(page) returns after page.set_content("<button>Save changes</button>"). The task 9.1 text specifies assert_accessible to run axe with AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]. axe 4.14.0 tags document-title and html-has-lang as wcag2a, and runs them with impact serious, so on the bare set_content page (no <title>, no <html lang>) the helper must fail with 'accessibility violations: document-title (serious): html; html-has-lang (serious): html'. This contradicts the THEN of the browser scenario ('the first returns'). I verified the failure live with the given helper; the second test still fails with button-name even when the page is complete, so only the first test is affected. I could make it pass only by excluding document-level rules from the check, which weakens it beyond what the task states.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m1_web_kit.py`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-ui-kit`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit e2e/test_m1_web_kit.py: in test_assert_accessible_accepts_a_named_button replace page.set_content("<button>Save changes</button>") with page.set_content('<html lang="en"><head><title>Kit check</title></head><body><button>Save changes</button></body></html>'); optionally apply the same wrapper around the button in test_assert_accessible_names_the_failing_rule.

### Clarifier suggestion
Edit `e2e/test_m1_web_kit.py`: in test_assert_accessible_accepts_a_named_button replace page.set_content("<button>Save changes</button>") with page.set_content('<html lang="en"><head><title>Kit check</title></head><body><button>Save changes</button></body></html>'); optionally apply the same wrapper around the button in test_assert_accessible_names_the_failing_rule.

### Answer
<!-- write below this line -->

---

## Q-002: test/support/a11y-setup.test.ts:167 (C-574fc31a) depends on e2e/conftest.py:68, which the frozen-test guard protects

- **Status:** accepted
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the answer would unfreeze e2e/conftest.py of task 9.1, a test-support file: a person's change (delegate.unfreeze opens test files only)
- **Blocking tasks:** 9.1
- **Kind:** technical
- **Asked:** 2026-10-29T20:02Z by glm, run r-20261029T1943Z-8995, task 9.1

### Context
The frozen red test asserts checkAccessibilitySetup(repoRoot) returns [] for the real repository. The check reads e2e/conftest.py and needs the implemented helper there: the text def assert_accessible(page, both literal impacts 'serious' and 'critical', and no add_script_tag or bypass_csp. The red step left assert_accessible as a stub (raise NotImplementedError, e2e/conftest.py:68), so the check correctly reports ASSERT_ACCESSIBLE_UNSAFE. Task 9.1 says the green step implements the helper in e2e/conftest.py ('the only task that changes it'), but the harness restored green attempt 1's identical edit as a protected path and instructed not to repeat it, so the criterion C-574fc31a and the browser criteria that need the helper (C-c5c7028c, C-5bbabdc1) cannot pass while the file stays frozen.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/conftest.py`, `test/support/a11y-setup.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-ui-kit`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit e2e/conftest.py: replace the stub body of assert_accessible (lines 68-70) with the implementation of task 9.1: add 'from pathlib import Path' to the imports, add a module function _axe_source() that reads Path(__file__).resolve().parent.parent / 'node_modules' / 'axe-core' / 'axe.min.js' as utf8 and calls pytest.fail("axe-core is not installed: run pnpm install") on OSError, add the lines AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] and AXE_BLOCKING_IMPACTS = ("serious", "critical"), and give assert_accessible the exact body shown in tasks.md task 9.1 (inject _axe_source() when window.axe is undefined, run window.axe.run with runOnly type tag over AXE_TAGS, and pytest.fail with the joined 'id (impact): targets' list when a violation has impact serious or critical); every other existing statement (module docstring, imports, base_url, e2e_profile, _reset_failure, fresh_state) stays.

### Clarifier suggestion
Edit `e2e/conftest.py`: replace the stub body of assert_accessible (lines 68-70) with the implementation of task 9.1: add 'from pathlib import Path' to the imports, add a module function _axe_source() that reads Path(__file__).resolve().parent.parent / 'node_modules' / 'axe-core' / 'axe.min.js' as utf8 and calls pytest.fail("axe-core is not installed: run pnpm install") on OSError, add the lines AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] and AXE_BLOCKING_IMPACTS = ("serious", "critical"), and give assert_accessible the exact body shown in tasks.md task 9.1 (inject _axe_source() when window.axe is undefined, run window.axe.run with runOnly type tag over AXE_TAGS, and pytest.fail with the joined 'id (impact): targets' list when a violation has impact serious or critical); every other existing statement (module docstring, imports, base_url, e2e_profile, _reset_failure, fresh_state) stays.

### Answer
<!-- write below this line -->

---

## Q-003: Criterion C-c5c7028c (web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The helper in a browser): accept as satisfied?

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): I could not verify the criterion from the files alone. The helper in e2e/conftest.py reads axe from node_modules, runs it with WCAG 2.x tags and fails with "<id> (<impact>): <targets>" for serious or critical violations, which would yield a message holding button-name if axe reports that rule at cri
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-c5c7028c (web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The helper in a browser)

### Context
Criterion C-c5c7028c (web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The helper in a browser) is needs human after round 1.

Scenario:
\- **WHEN** the journey calls `assert_accessible(page)` on a loaded page with a labelled button, and on a page with a button without a name
\- **THEN** the first returns and the second fails the test with a message that holds `button-name`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m1_web_kit::test_assert_accessible_accepts_a_named_button[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m1_web_kit::test_assert_accessible_names_the_failing_rule[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-004: Finding F-4e8c6585: Toast Dismiss button turns white-on-white on hover

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-92d9ac35).

Title: Toast Dismiss button turns white-on-white on hover
Detail: The Dismiss button in ToastRegion carries class ui-button. On hover, `.ui-button:hover` (specificity 0,2,0) beats `.ui-toast button` (0,1,1) and sets the background to var(--ui-color-bg) (#ffffff), while `.ui-toast button` keeps color var(--ui-color-toast-text) (#ffffff). The label becomes invisible on hover, which breaks the WCAG AA contrast that the toast-text-on-toast-bg pair is meant to give. axe does not see hover states, so no gate catches it.
Suggested fix: Add a `.ui-toast button:hover` rule (or `.ui-toast .ui-button:hover`) that keeps a transparent background or uses toast colours.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-92d9ac35 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject The finding is correct. The Dismiss button in ToastRegion carries the class ui-button, and theme.css gives .ui-button:hover (specificity 0,2,0) a background of var(--ui-color-bg), which tokens.css sets to #ffffff. The rule .ui-toast button (specificity 0,1,1) sets the colour to var(--ui-color-toast-text), also #ffffff, and its transparent background loses to the hover rule. So while the pointer hovers the Dismiss button of a toast, its label is white on white, which contradicts the requirement that the theme meets WCAG AA contrast and defeats the toast-text-on-toast-bg pair of design decision 3. axe does not evaluate hover states, so no gate catches it, and this is a real accessibility defect that a user of the toast will meet on every dismissal. The fix belongs in theme.css only, with colours still taken from var(--ui-color-*) tokens so that findRawColours stays empty. WHEN the pointer hovers the Dismiss button inside a toast THEN the button keeps a transparent or toast-background colour under its toast-text-coloured label so that the label and its background still reach a contrast ratio of at least 4.5:1.
---

## Q-005: Hold H-4c6c7bb5: UI criterion C-cb608bfb has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-cb608bfb has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-cb608bfb is the scenario "Contrast maths and colour parsing": it exercises the pure functions contrastRatio and parseHexColour and the KitError thrown for a non-hex argument. None of that is rendered or reachable from the browser; the spec scenario names only function calls and their return values, and the design's test plan assigns the contrast maths to Node tests while the browser proves the theme through axe contrast on real pages. The Node test in web/src/kit/contrast.test.ts asserts every value of the scenario (the four ratios within 0.01, the four parse results, and the KIT_TOKEN_INVALID throw) and passed in the latest report, so the criterion is checked where it can be. An end-to-end test for it is not possible and not needed, and the unit can go on as it stands.
---

## Q-006: Hold H-2b729d71: UI criterion C-16a71639 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-16a71639 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-16a71639 is the scenario "The real tokens meet WCAG AA": it reads tokens.css, parses it with parseTokens, and checks CONTRAST_PAIRS, checkTokenContrast and the six-digit hex form of every colour token. Every step of the scenario is a function call on a file and its return value; nothing in it is a user-visible browser behaviour, so an end-to-end test cannot express it. The Node test in web/src/kit/contrast.test.ts asserts each value of the scenario (sixteen pairs in design order, ids text-on-bg first and focus-on-surface last, checkTokenContrast returning an empty array, every colour token six-digit hex) and passed in the latest report. The design's test plan assigns exactly this split: the Node tests check the token maths, and the browser proves the theme through axe contrast on real pages, which the four page tests of e2e/test_m0_skeleton.py do by calling assert_accessible after their last step. The criterion is checked where it can be, and the unit can go on as it stands.
---

## Q-007: Hold H-01c51033: UI criterion C-4f003820 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-4f003820 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-4f003820 is the scenario "A weak, missing or malformed token is reported": it calls checkTokenContrast on the real tokens with --ui-color-text weakened to #777777, then without --ui-color-focus, then with --ui-color-border set to red, and checks the failure ids, ratios and minimums it returns. Every step is a function call on a token map and its return value; the browser app does not expose checkTokenContrast and never runs it, so no end-to-end test can observe the behaviour. The Node test in web/src/kit/contrast.test.ts asserts each value of the scenario (text-on-bg and text-on-surface with min 4.5 and ratio below 4.5; focus-on-bg and focus-on-surface with min 3 and ratio 0; border-on-bg and border-on-surface with min 3 and ratio 0) and passed in the latest report. The design's test plan assigns exactly this split: Node tests check the token maths and the browser proves the theme through axe contrast on real pages, which the four page tests of e2e/test_m0_skeleton.py do. The criterion is checked where it can be, and the unit can go on as it stands.
---

## Q-008: Hold H-f79f2bc2: UI criterion C-92d9ac35 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-92d9ac35 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-92d9ac35 is the scenario "The theme uses only tokens": it reads the source file theme.css, asserts that findRawColours reports nothing on it and that it holds :focus-visible, prefers-reduced-motion and the six kit classes, and then runs findRawColours on a five-line sample and expects lines 1 and 2 only. Every step is a scan of a source file or a pure function call on a string and its return value; the browser never exposes findRawColours, and the bundled stylesheet does not show whether the source theme took its colours from tokens, so no end-to-end test can observe the behaviour. The Node test in web/src/kit/contrast.test.ts asserts each value of the scenario (empty result on the real theme, every required selector and class present, and exactly lines 1 and 2 reported on the sample) and passed in the latest report, and theme.css does hold :focus-visible, prefers-reduced-motion and all six classes. The design's test plan assigns exactly this split: Node tests check the theme source and the browser proves the theme through axe contrast on real pages, which the four page tests of e2e/test_m0_skeleton.py do by calling assert_accessible. The criterion is checked where it can be, and the unit can go on as it stands.
---

## Q-009: Hold H-6dadab51: UI criterion C-d365d748 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-d365d748 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-d365d748 is the scenario "The web sources have no inline styles": it calls findInlineStyleUse on a four-line sample and expects lines 1, 2 and 3 reported, then runs it over every .tsx file under web/src and over web/index.html and expects nothing. Every step is a pure function call on source text or a scan of repository source files and its return value; the browser never exposes findInlineStyleUse, and a rendered page does not show whether its source files held a style attribute or a style element, so no end-to-end test can observe the behaviour. The Node test in web/src/kit/contrast.test.ts asserts each value of the scenario (lines 1, 2 and 3 on the sample; an empty result for every .tsx file walked recursively under web/src and for web/index.html, each first asserted to exist) and passed in the latest report. The design's test plan assigns exactly this split: contrast.test.ts walks web/src for .tsx files, and the browser proves the theme through axe contrast on real pages with no Content Security Policy message, which the four page tests of e2e/test_m0_skeleton.py do by calling assert_accessible. The criterion is checked where it can be, and the unit can go on as it stands.
---

## Q-010: Hold H-df7e1bc7: UI criterion C-e2ce7344 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-e2ce7344 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-e2ce7344 is the scenario "Known codes" of the requirement "One catalogue maps API error codes to text": it checks that typeof messageFor is a function and that messageFor, called with each key of BASE_MESSAGES, answers the ten codes of task 2.1 with their catalogue text, each ending with a full stop, 1 to 200 characters long and not containing its own code. Every step is a call to a module export and its return value; the built page exposes neither messageFor nor BASE_MESSAGES, and the design states that no route renders ErrorPanel or any other consumer of the catalogue in this unit, so no end-to-end test can observe the whole catalogue. The Node test in web/src/kit/messages.test.ts asserts each value of the scenario: the sorted keys equal the ten codes of task 2.1, each BASE_MESSAGES entry and each messageFor answer equal the task 2.1 text, and every text ends with a full stop, is 1 to 200 characters and does not contain its code. That test passed in the latest report, and the catalogue in messages.ts holds exactly those ten codes with those texts. The browser proves the one message a page shows in this unit, the AUTHZ_UNAVAILABLE notice, through the nav journey. The criterion is checked where it can be, and the unit can go on as it stands.
---

## Q-011: Hold H-fb25c506: UI criterion C-2f2f685e has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-2f2f685e has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-2f2f685e is the scenario "Unknown codes use the fallback" of the requirement "One catalogue maps API error codes to text": messageFor, called with "NO_SUCH_CODE", "", "forbidden", "constructor" and "__proto__", must answer FALLBACK_MESSAGE every time. Every step is a call to a module export and its return value. The built page exposes neither messageFor nor FALLBACK_MESSAGE, and the design states that no route renders ErrorPanel or any other consumer of the catalogue in this unit, so no end-to-end test can trigger an unknown code and observe the fallback text in the browser. The Node test in web/src/kit/messages.test.ts asserts each value of the scenario: it calls messageFor with exactly those five codes and checks that each answer equals the fallback text, and that test passed in the latest report. The implementation in messages.ts keeps the catalogue in a Map and answers FALLBACK_MESSAGE for any absent key, so prototype names such as constructor and __proto__ cannot resolve to anything. The design's test plan assigns this check to Node tests, and the browser proves the one message a page shows in this unit, the AUTHZ_UNAVAILABLE notice, through the nav journey. The criterion is checked where it can be, and the unit can go on as it stands.
---

## Q-012: Hold H-9e414469: UI criterion C-c175f655 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c175f655 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-c175f655 is the scenario "Later units register codes" of the requirement "One catalogue maps API error codes to text": registerMessages is called twice with the same TEST_ONLY_FLOW_LOCKED entry, then with a duplicate FORBIDDEN text, a changed text for the registered code, a malformed code, a blank text and a mixed batch, and the scenario expects the catalogue text, KIT_MESSAGE_DUPLICATE and KIT_MESSAGE_INVALID throws, and the fallback for TEST_ONLY_NEW. Every step is a call to a module export and its thrown error or return value. The built page exposes neither registerMessages nor messageFor, no .tsx file under web/src calls registerMessages, and the design states that no route renders ErrorPanel or any other consumer of the catalogue in this unit, so no end-to-end test can register a code in the browser and observe the result. The Node test in web/src/kit/messages.test.ts asserts each value of the scenario: the two registrations succeed, messageFor answers "This flow is locked.", the third and fourth calls throw KitError KIT_MESSAGE_DUPLICATE, the fifth and sixth KIT_MESSAGE_INVALID, the seventh KIT_MESSAGE_DUPLICATE, and messageFor("TEST_ONLY_NEW") is the fallback text. That test passed in the latest report. The implementation in messages.ts validates every entry, then checks duplicates against the Map, and only then writes, so a batch with one duplicate registers nothing, as the scenario requires. The design's test plan assigns this check to Node tests, and the browser proves the one message a page shows in this unit, the AUTHZ_UNAVAILABLE notice, through the nav journey. The criterion is checked where it can be, and the unit can go on as it stands.
---

## Q-013: Hold H-c4c6e005: UI criterion C-1688efa8 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-1688efa8 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-1688efa8 is the scenario "Parsing the answer" of the requirement "The nav shows only the entries the user's capabilities allow": parseMe gets a valid body with capabilities ["read_flow", "Bad Cap", 5, "read_flow"], then bodies with capabilities as a string, without csrfToken, with reviewProfile "x", and the value null, and must give a Set holding only read_flow for the first and null for the other four. Every step is a call to a module export and its return value. The built page does not expose parseMe, no .tsx or Python file in the repository references it, and the only route that reaches it is the shell's one GET /api/v1/me call, whose user-visible outcomes (the nav signed out, on a 503 and on a valid answer) are the separate scenario "The nav in the browser" and are proven by the three nav journeys of e2e/test_m1_web_kit.py. The Node test in web/src/kit/capabilities.test.ts asserts each value of the scenario: the valid body parses with capabilities equal to new Set(["read_flow"]), and each of the four invalid bodies gives null, and that test passed in the latest report. The implementation in capabilities.ts checks the record shape, the user and tenant fields, the reviewProfile value and the csrfToken, and keeps only string capabilities matching the pattern, so the scenario's values follow from the code as written. The design's test plan assigns the loader and parsing to Node tests with a fake client and the nav to the browser. The criterion is checked where it can be, and the unit can go on as it stands.
---

## Q-014: Hold H-560ac014: UI criterion C-30ed04fb has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-30ed04fb has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-015: Hold H-ae010e47: UI criterion C-0dae9ed5 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-0dae9ed5 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-016: Hold H-5049f1f6: UI criterion C-63a759ac has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-63a759ac has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-017: Hold H-b1fcc4d1: UI criterion C-af45d5fe has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-af45d5fe has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-018: Hold H-fc3f4be7: UI criterion C-844ec099 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-844ec099 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-019: Hold H-05b93ca5: UI criterion C-c0db9325 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c0db9325 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-020: Hold H-59ec0374: UI criterion C-38740f97 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-38740f97 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-021: Hold H-ca25c180: UI criterion C-b735b791 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-b735b791 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-022: Hold H-223efcbe: UI criterion C-c149362f has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c149362f has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-023: Hold H-b19cf330: UI criterion C-51e7abfc has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-51e7abfc has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-024: Hold H-c9b87e6e: UI criterion C-ab614782 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-ab614782 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-025: Hold H-da07a80f: UI criterion C-0b8be44d has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-0b8be44d has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-026: Hold H-2d42146d: UI criterion C-278586d8 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-278586d8 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-027: Hold H-af0cdc46: UI criterion C-c3a242d6 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c3a242d6 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-028: Hold H-d560b43e: UI criterion C-16e957dd has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-16e957dd has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-029: Hold H-72502a0f: UI criterion C-d9604877 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-d9604877 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-030: Hold H-0e29e529: UI criterion C-a1ea941d has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-a1ea941d has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-031: Hold H-d7bde6af: UI criterion C-574fc31a has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-574fc31a has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-032: Hold H-addeb9d5: UI criterion C-c5c7028c has no end-to-end test (fails_at_head); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.41 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c5c7028c has no end-to-end test (fails_at_head); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
