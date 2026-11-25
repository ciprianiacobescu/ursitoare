# Questions — add-run-view-followup-1

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
| Q-001 | answered | none | verdict | Criterion C-2df1ce97 (web-runs › Run page scrolls sideways when a step's input or output has a long line — feedback FB-001 › Run page scrolls sideways when a step's input or output has a long line): a |
| Q-002 | answered | none | verdict | Finding F-130c464c: FB-001 browser scroll check still fails |
| Q-003 | open | none | verdict | Hold H-37094cb1: UI criterion C-2df1ce97 has no end-to-end test; see the generated UI tests table |
| Q-004 | open | none | verdict | Hold H-51c57b0f: UI criterion C-56e16a37 has no end-to-end test; see the generated UI tests table |
| Q-005 | open | none | verdict | Hold H-bdd939da: UI criterion C-39bfdc20 has no end-to-end test; see the generated UI tests table |
| Q-006 | open | none | verdict | Hold H-cd993b33: UI criterion C-6bf9588b has no end-to-end test; see the generated UI tests table |
| Q-007 | open | none | verdict | Hold H-636fd3aa: UI criterion C-aeec17be has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-3019b859: UI criterion C-f21e5186 has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-bcb55e31: UI criterion C-01ce6552 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-2df1ce97 (web-runs › Run page scrolls sideways when a step's input or output has a long line — feedback FB-001 › Run page scrolls sideways when a step's input or output has a long line): a

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-2df1ce97 (web-runs › Run page scrolls sideways when a step's input or output has a long line — feedback FB-001 › Run page scrolls sideways when a step's input or output has a long line)

### Context
Criterion C-2df1ce97 (web-runs › Run page scrolls sideways when a step's input or output has a long line — feedback FB-001 › Run page scrolls sideways when a step's input or output has a long line) is needs human after round 2.

Scenario:
\- **WHEN** the Step details of a run show an Input or Output whose JSON holds a line longer than the column, such as a long string value
\- **THEN** the text wraps inside the Step details column and the page does not scroll sideways at 1280 px and at 375 px wide (the document's scrollWidth equals its clientWidth)

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: fail
Tracing tests: web.src.runs.payload-wrap.test.ts::C-2df1ce97 Input and Output payloads use the class whose rule wraps long lines (passed, red_assertion, inadequate); web.src.runs.payload-wrap.test.ts::C-2df1ce97 the payload rule reaches the pre element inside the Step details column (passed, red_assertion, inadequate)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept Evidence (delegate, 2026-11-25, real Chromium 153 through the CI e2e build and stack, run API mocked with a 600-character unbroken string in a step Output and long policy-decision ids): at this unit's head f6c66983 the document scrollWidth equals clientWidth in every state (1280/1280 and 375/375, no step selected and the step selected), and the Output pre wraps (scrollWidth 432 = clientWidth at 1280, 275 at 375). At base 31968a29, with the step selected, the page is 6673 wide at 1280 and 5925 at 375, all from the Output pre (scrollWidth 5876). Screenshots were looked at by the delegate. The verifier-generated browser test's failure at head is not reproduced by this measurement; its artifacts were not kept, so its cause cannot be read.
---

## Q-002: Finding F-130c464c: FB-001 browser scroll check still fails

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
The judge raised a major finding in round 2, and no deterministic check confirms it (criterion C-2df1ce97).

Title: FB-001 browser scroll check still fails
Detail: The verifier-generated browser test e2e/test_l4_c_2df1ce97.py fails at head, so the page still scrolls sideways for a long Input or Output line despite the CSS and markup change.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-2df1ce97 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The finding's premise, that the page still scrolls sideways at head, is refuted by measurement. Evidence (delegate, 2026-11-25, real Chromium 153 through the CI e2e build and stack, run API mocked with a 600-character unbroken string in a step Output and long policy-decision ids): at this unit's head f6c66983 the document scrollWidth equals clientWidth in every state (1280/1280 and 375/375, no step selected and the step selected), and the Output pre wraps (scrollWidth 432 = clientWidth at 1280, 275 at 375). At base 31968a29, with the step selected, the page is 6673 wide at 1280 and 5925 at 375, all from the Output pre (scrollWidth 5876). Screenshots were looked at by the delegate.
---

## Q-003: Hold H-37094cb1: UI criterion C-2df1ce97 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-2df1ce97 has no end-to-end test; see the generated UI tests table

Step 5 for C-2df1ce97: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_2df1ce97::test_run_page_does_not_scroll_sideways_with_long_payload[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-004: Hold H-51c57b0f: UI criterion C-56e16a37 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-56e16a37 has no end-to-end test; see the generated UI tests table

Step 5 for C-56e16a37: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_56e16a37::test_run_header_and_row_views[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-005: Hold H-bdd939da: UI criterion C-39bfdc20 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-39bfdc20 has no end-to-end test; see the generated UI tests table

Step 5 for C-39bfdc20: not_testable after 1 attempt(s); stepRowViews is an internal function requiring fixture rows; not reachable through browser UI.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-006: Hold H-cd993b33: UI criterion C-6bf9588b has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-6bf9588b has no end-to-end test; see the generated UI tests table

Step 5 for C-6bf9588b: not_testable after 1 attempt(s); The criterion validates pure preview-helper outputs and fixture refs that are not exposed through a stable browser UI route or public endpoint in the provided e2e support..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-007: Hold H-636fd3aa: UI criterion C-aeec17be has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-aeec17be has no end-to-end test; see the generated UI tests table

Step 5 for C-aeec17be: not_testable after 1 attempt(s); The criterion specifies hand-settled promises and internal enqueue/work call counts, which are not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-3019b859: UI criterion C-f21e5186 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-f21e5186 has no end-to-end test; see the generated UI tests table

Step 5 for C-f21e5186: not_testable after 1 attempt(s); Static source-file assertions are not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-bcb55e31: UI criterion C-01ce6552 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-01ce6552 has no end-to-end test; see the generated UI tests table

Step 5 for C-01ce6552: not_testable after 1 attempt(s); Criterion exercises the internal detailCell helper and frozen unit-test expectations, which are not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
