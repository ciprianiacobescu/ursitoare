# Questions — add-home-dashboard-fix-1

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
| Q-001 | open | 1.1 | ambiguous | Task 1.1 is blocked |
| Q-002 | open | 1.2 | ambiguous | Task 1.2 is blocked |
<!-- l4:index:end -->

---

## Q-001: Task 1.1 is blocked

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The e2e gate failure is a Python error in the test file itself, not in production code. e2e/test_m6b_home.py:12 reads HASH = "sha256:" + "ab".repeat(32); Python strings have no repeat method (that is JavaScript), so the module raises AttributeError at import, pytest collects nothing and exits 2, whi
- **Blocking tasks:** 1.1
- **Kind:** ambiguous
- **Asked:** 2026-11-20T08:53Z by claude-sonnet, run r-20261120T0807Z-a5b2, task 1.1

### Context
I changed nothing. The e2e gate failed with exit code 2 and the new file `e2e/test_m6b_home.py` ran no test. That is a collection or test-file problem, and a fix task may not change test files. I could only run the Node gate here, not pytest, so I could not see the actual collection error.

### Answer
<!-- write below this line -->

---

## Q-002: Task 1.2 is blocked

- **Status:** open
- **Blocking tasks:** 1.2
- **Kind:** ambiguous
- **Asked:** 2026-11-20T09:05Z by claude-sonnet, run r-20261120T0856Z-d6a7, task 1.2

### Context
No change made. F-c17c0f0a concerns e2e/test_m6b_home.py running no test. A fix task may not change test files, and the harness reverts any edit to that file. A person must commit the fix on the unit branch.

### Answer
<!-- write below this line -->
