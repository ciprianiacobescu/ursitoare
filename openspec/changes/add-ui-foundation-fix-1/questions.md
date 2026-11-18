# Questions — add-ui-foundation-fix-1

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
| Q-001 | answered | 1.1 | ambiguous | Task 1.1 is blocked |
<!-- l4:index:end -->

---

## Q-001: Task 1.1 is blocked

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The failing browser test test_assert_layout_reports_the_numbers (e2e/test_m6b_foundation.py:48-63) builds its pages with page.set_content and never loads the application, so no production code is on its path; the only code involved is assert_layout and watch_csp in e2e/conftest.py plus the test itse
- **Blocking tasks:** 1.1
- **Kind:** ambiguous
- **Asked:** 2026-11-18T19:51Z by claude-sonnet, run r-20261118T1820Z-992f, task 1.1

### Context
No change made. The finding is a failure of test_m6b_foundation::test_assert_layout_reports_the_numbers. The only code involved is `assert_layout` and `watch_csp` in e2e/conftest.py, plus the test in e2e/test_m6b_foundation.py. Both are test or test-support files, which a fix task may not change. I did not run the gate and did not reproduce the e2e failure, so I don't know its cause.

### Answer
<!-- write below this line -->
The failure was in the test's own fixture, not in production code: the fixture put a 1500 px div inside a body with Chromium's default 8 px margin, so the helper correctly reported a scroll width of 1508 while the spec scenario says a 1,500 px body. The owner's delegate corrected the fixture in commit 3cceda88 on this unit's branch (body margin 0; no assertion changed; reproduced and re-run 3 of 3 green locally). Make no code change for task 1.1; run its gates, which now pass.
