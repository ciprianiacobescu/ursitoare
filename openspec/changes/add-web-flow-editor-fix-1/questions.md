# Questions — add-web-flow-editor-fix-1

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
| Q-001 | open | 1.1 | technical | Unfreeze the two stale deep-link e2e tests so task 1.1 can point them at an unowned path |
<!-- l4:index:end -->

---

## Q-001: Unfreeze the two stale deep-link e2e tests so task 1.1 can point them at an unowned path

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The conflict is real: e2e/test_m0_skeleton.py (line 227) and e2e/test_l4_c_0daf92cd.py (line 10) open /flows and expect the "Page not found" heading, while web/src/features/70-flows.tsx registers /flows as the spec requires (Flow pages requirement). No production change can satisfy both. But the onl
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-01T22:18Z by deepseek-free, run r-20261101T2157Z-7044, task 1.1

### Context
F-22a9abae: e2e/test_m0_skeleton.py::test_deep_link_returns_the_app and e2e/test_l4_c_0daf92cd.py::test_deep_link_not_found_shell both open /flows and expect the heading "Page not found". That scenario belongs to add-web-shell, when no feature owned /flows. add-web-flow-editor now registers /flows (web/src/features/70-flows.tsx) and an unauthenticated visit issues the list request whose 401 redirects to /sign-in?error=SESSION_ENDED&return_to=%2Fflows, which C-e3de8f9e, C-086f1719 and test_m1_sign_in expect. The generated test for C-5bbabdc1 already uses the unowned path /no-such-page-deep-link. No production change can satisfy both behaviours, so the two e2e tests need their deep-link target changed to an unowned path (for example /no-such-page-deep-link) while keeping their names, markers, titles and every other assertion. e2e/** is a frozen test path (see the add-e2e-stack-fix-2 Q-001 precedent): the harness restores edits unless an answer names the files. Note that test_l4_c_0daf92cd.py is harness-generated from the archived C-0daf92cd scenario; if the generator rewrites it from that stale /flows text, the archived scenario may also need updating. Option 2 is to keep both files frozen and withdraw F-22a9abae.

Harness note: this is a fix task. It cannot unfreeze a test or test-support file (a test, `conftest.py`, a fixture), whatever the answer says: a fix step's change to one is put back. A person must commit the change on the unit branch themselves, then answer this question (`l4 questions answer Q-NNN --unit openspec:add-web-flow-editor-fix-1 --text "..."`).

### Options
1. Unfreeze e2e/test_m0_skeleton.py and e2e/test_l4_c_0daf92cd.py: change only the deep-link target from /flows to /no-such-page-deep-link, keeping test names, markers, page titles and all assertions; then task 1.1 can make that edit.
2. Keep both e2e files frozen and withdraw F-22a9abae.

### Answer
<!-- write below this line -->
