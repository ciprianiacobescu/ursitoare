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
| Q-001 | answered | 1.1 | technical | Who fixes the failing sign-in e2e test? |
<!-- l4:index:end -->

---

## Q-001: Who fixes the failing sign-in e2e test?

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The failing test e2e/test_l4_c_23a4ce1e.py is a frozen, harness-generated browser test tagged for another unit's criterion (C-23a4ce1e, add-web-sign-in). I read the test, web/src/auth/return-to.ts, sign-in-page.ts, SignInPage.tsx, messages.ts and kit/ErrorPanel.tsx: the source matches every assertio
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-07T13:13Z by claude-sonnet, run r-20261107T1050Z-9cf7, task 1.1

### Context
`e2e/test_l4_c_23a4ce1e.py::test_sign_in_search_parsing` belongs to `add-web-sign-in`, not `add-taint-runtime`. A fix task cannot edit test files, and I could not see a source defect in `web/src/auth` that would explain the failure.

Harness note: this is a fix task. It cannot unfreeze a test or test-support file (a test, `conftest.py`, a fixture), whatever the answer says: a fix step's change to one is put back. A person must commit the change on the unit branch themselves, then answer this question (`l4 questions answer Q-NNN --unit openspec:add-taint-runtime-fix-1 --text "..."`).

### Answer
<!-- write below this line -->
The failure is a flake in this frozen test, not a defect in add-taint-runtime: the unit's diff touches nothing under web/ or e2e/, and the same test failed the same way on main (e2e run 41571518833, 2026-11-03). Cause: the test aborted /auth/oidc/login, Chromium later commits chrome-error://chromewebdata/ for that navigation, and when that lands after the next check's page.goto starts, the goto is 'interrupted by another navigation'. A person's commit f342c41c on this branch answers the login request with a 204 instead (no page, so nothing interrupts the next goto); the request and every assertion are unchanged. Verified locally: abort leaves the page on chrome-error, a 204 keeps it on /sign-in; the test passed 25 of 25 runs and the whole e2e suite 58 of 58. No source change is needed for F-22a9abae: run the gates again. Answered by Claude Code as the owner's delegate.
