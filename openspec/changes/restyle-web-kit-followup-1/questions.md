# Questions — restyle-web-kit-followup-1

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
| Q-001 | answered | none | verdict | Criterion C-6027f26f (web-data-kit › Page header meta: a wrapping row below the title, with gaps between items — feedback FB-001 › Page header meta: a wrapping row below the title, with gaps between i |
| Q-002 | answered | none | verdict | Hold H-09735f2a: UI criterion C-97684e64 has no end-to-end test; see the generated UI tests table |
| Q-003 | answered | none | verdict | Hold H-b35898ab: UI criterion C-66cb6cb0 has no end-to-end test; see the generated UI tests table |
| Q-004 | answered | none | verdict | Hold H-7415271d: UI criterion C-23da30c9 has no end-to-end test; see the generated UI tests table |
| Q-005 | open | none | verdict | Hold H-1db9756c: UI criterion C-3192e29f has no end-to-end test; see the generated UI tests table |
| Q-006 | open | none | verdict | Hold H-2dab7e00: UI criterion C-2c488542 has no end-to-end test; see the generated UI tests table |
| Q-007 | open | none | verdict | Hold H-6bc82384: UI criterion C-ab3cdbf6 has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-a317ca0a: UI criterion C-dac61932 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-6027f26f (web-data-kit › Page header meta: a wrapping row below the title, with gaps between items — feedback FB-001 › Page header meta: a wrapping row below the title, with gaps between i

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-6027f26f (web-data-kit › Page header meta: a wrapping row below the title, with gaps between items — feedback FB-001 › Page header meta: a wrapping row below the title, with gaps between items)

### Context
Criterion C-6027f26f (web-data-kit › Page header meta: a wrapping row below the title, with gaps between items — feedback FB-001 › Page header meta: a wrapping row below the title, with gaps between items) is needs human after round 1.

Scenario:
\- **WHEN** a person opens the run page of a completed run, mocked as e2e/test_m6b_run_view.py mocks it, at 1366 by 860 and again at 390 by 860
\- **THEN** the status "Run state" and the five items Flow, Mode, Started by, Started and Duration of the header's meta each start at or below the bottom edge of the h1 "Run run_1"; the first starts within 1 px of the h1's left edge; any two of them whose tops are within 4 px are at least 8 px apart horizont...

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.kit.page-header-meta.test.ts::C-6027f26f the page header meta is a full-width wrapping row with a gap (passed, red_assertion, inadequate)
Ignored tests: test_run_header_meta::test_page_header_meta_wraps_below_the_title_with_gaps[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied, and the delegate verified it by hand. Ignored test e2e/test_run_header_meta.py::test_page_header_meta_wraps_below_the_title_with_gaps does discriminate. On the offline e2e stack with web built at the unit head 563f4585 it passes at 1366 and 390. With web/src/kit/theme.css put back to main's and web rebuilt, it fails: AssertionError, at 1366px meta item 0 starts at or below the title's bottom edge: 80 vs 116. It asserts the scenario as written: the status and the five items below the h1, the first within 1 px of the h1's left edge, items whose tops are within 4 px at least 8 px apart, the h1 on one line, and assert_layout at both widths. The CSS change (.ui-page-header-meta spanning the grid as a wrapping flex row with a gap; actions at row 1, column 2) is identical to the fix I tried on main 36dd7cce, where all 118 e2e tests and the 17 Node tests that read theme.css passed and the Home, Flow and Policies headers still read well.
---

## Q-002: Hold H-09735f2a: UI criterion C-97684e64 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-97684e64 has no end-to-end test; see the generated UI tests table

Step 5 for C-97684e64: not_testable after 1 attempt(s); Criterion checks a unit function's return values and source-file contents (DataTable.tsx, theme.css text), not browser-observable behaviour; no e2e page exercises it..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold can be waived. C-97684e64 is one of the parent unit restyle-web-kit's source criteria: its scenario reads source files or pure helpers through a Node test, and nothing about it can be observed in a browser. So step 5's not_testable result is correct, and no browser test can be written for it. In this round's verdict.json the criterion's own result is pass ('the judge passed it and a discriminating test passes'), with its Node test traced by id. This follow-up changes only web/src/kit/theme.css (one new rule block) and adds tests, and that test still passes.
---

## Q-003: Hold H-b35898ab: UI criterion C-66cb6cb0 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-66cb6cb0 has no end-to-end test; see the generated UI tests table

Step 5 for C-66cb6cb0: not_testable after 1 attempt(s); The criterion checks CSS source files (data.css, tokens.css) through a node unit test; it is not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold can be waived. C-66cb6cb0 is one of the parent unit restyle-web-kit's source criteria: its scenario reads source files or pure helpers through a Node test, and nothing about it can be observed in a browser. So step 5's not_testable result is correct, and no browser test can be written for it. In this round's verdict.json the criterion's own result is pass ('the judge passed it and a discriminating test passes'), with its Node test traced by id. This follow-up changes only web/src/kit/theme.css (one new rule block) and adds tests, and that test still passes.
---

## Q-004: Hold H-7415271d: UI criterion C-23da30c9 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-23da30c9 has no end-to-end test; see the generated UI tests table

Step 5 for C-23da30c9: not_testable after 1 attempt(s); Criterion asserts the order of JSX in Field.tsx/Form.tsx source files read by a node test; it is not observable through the served browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold can be waived. C-23da30c9 is one of the parent unit restyle-web-kit's source criteria: its scenario reads source files or pure helpers through a Node test, and nothing about it can be observed in a browser. So step 5's not_testable result is correct, and no browser test can be written for it. In this round's verdict.json the criterion's own result is pass ('the judge passed it and a discriminating test passes'), with its Node test traced by id. This follow-up changes only web/src/kit/theme.css (one new rule block) and adds tests, and that test still passes.
---

## Q-005: Hold H-1db9756c: UI criterion C-3192e29f has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-3192e29f has no end-to-end test; see the generated UI tests table

Step 5 for C-3192e29f: not_testable after 1 attempt(s); Criterion is about a node:test source-file check of theme.css/tokens.css text, not browser-observable behaviour..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-006: Hold H-2dab7e00: UI criterion C-2c488542 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-2c488542 has no end-to-end test; see the generated UI tests table

Step 5 for C-2c488542: not_testable after 1 attempt(s); Criterion checks kit .tsx source text via readFileSync in a node test; it has no browser-observable outcome..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-007: Hold H-6bc82384: UI criterion C-ab3cdbf6 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-ab3cdbf6 has no end-to-end test; see the generated UI tests table

Step 5 for C-ab3cdbf6: not_testable after 1 attempt(s); Criterion is about unit-test results of pure TypeScript helpers in layout.test.ts, not observable browser behavior..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-a317ca0a: UI criterion C-dac61932 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-dac61932 has no end-to-end test; see the generated UI tests table

Step 5 for C-dac61932: not_testable after 1 attempt(s); Criterion asserts on source files and directory listings of the repo (a node:test unit test), not on anything observable in the browser..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
