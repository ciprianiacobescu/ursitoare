# Questions — add-web-sign-in-fix-2

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
| Q-001 | open | 1.2 | technical | Unfreeze e2e/test_m1_sign_in.py to repair its broken URL assertion |
<!-- l4:index:end -->

---

## Q-001: Unfreeze e2e/test_m1_sign_in.py to repair its broken URL assertion

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The question comes from a fix task and its only remedy is a change to the frozen browser test e2e/test_m1_sign_in.py (line 137 does read `expect(page).to_have_url(lambda ...)` as described). A fix task cannot unfreeze or edit a test file, there is no clarifier suggestion to accept, and an answer nam
- **Blocking tasks:** 1.2
- **Kind:** technical
- **Asked:** 2026-10-30T06:35Z by glm, run r-20261030T0434Z-57e9, task 1.2

### Context
Line 137 of e2e/test_m1_sign_in.py reads `expect(page).to_have_url(lambda url: urlparse(url).path == "/flows")`. Playwright Python's to_have_url accepts only a string or a regular expression; the installed playwright 1.63 raises Error("value must be a string or regular expression") from to_expected_text_values before the assertion is evaluated, so test_c_4faae006_the_return_path_is_kept fails with a library error no matter what the app does. I reproduced the crash, then verified the app behaviour is correct: with the line replaced by the supported equivalent `page.wait_for_url(lambda url: urlparse(url).path == "/flows")` (same condition, same strength) the test passes against the locally served e2e stack. The file is frozen: the guard reverted this exact edit in the two earlier attempts of this run (lesson L-c96adcf5), so I restored the original line and changed nothing. Request: unfreeze e2e/test_m1_sign_in.py for this task so line 137 can be replaced with the equivalent page.wait_for_url form; the assertion that the page ends on the path /flows with the banner showing Alice Example is unchanged and nothing is weakened, skipped or deleted.

Harness note: this is a fix task. It cannot unfreeze a test or test-support file (a test, `conftest.py`, a fixture), whatever the answer says: a fix step's change to one is put back. A person must commit the change on the unit branch themselves, then answer this question (`l4 questions answer Q-NNN --unit openspec:add-web-sign-in-fix-2 --text "..."`).

### Options
1. Unfreeze e2e/test_m1_sign_in.py and replace line 137 with `page.wait_for_url(lambda url: urlparse(url).path == "/flows")` (equivalent assertion, supported API)
2. Keep the file frozen; a person repairs the line themselves

### Answer
<!-- write below this line -->
