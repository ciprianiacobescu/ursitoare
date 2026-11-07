# Questions — add-taint-runtime-fix-1

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
| Q-001 | open | 1.1 | technical | Who fixes the failing sign-in e2e test? |
<!-- l4:index:end -->

---

## Q-001: Who fixes the failing sign-in e2e test?

- **Status:** open
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-07T13:13Z by claude-sonnet, run r-20261107T1050Z-9cf7, task 1.1

### Context
`e2e/test_l4_c_23a4ce1e.py::test_sign_in_search_parsing` belongs to `add-web-sign-in`, not `add-taint-runtime`. A fix task cannot edit test files, and I could not see a source defect in `web/src/auth` that would explain the failure.

Harness note: this is a fix task. It cannot unfreeze a test or test-support file (a test, `conftest.py`, a fixture), whatever the answer says: a fix step's change to one is put back. A person must commit the change on the unit branch themselves, then answer this question (`l4 questions answer Q-NNN --unit openspec:add-taint-runtime-fix-1 --text "..."`).

### Answer
<!-- write below this line -->
