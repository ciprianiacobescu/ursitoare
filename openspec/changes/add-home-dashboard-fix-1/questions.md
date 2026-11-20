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
| Q-001 | answered | 1.1 | ambiguous | Task 1.1 is blocked |
| Q-002 | answered | 1.2 | ambiguous | Task 1.2 is blocked |
<!-- l4:index:end -->

---

## Q-001: Task 1.1 is blocked

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The e2e gate failure is a Python error in the test file itself, not in production code. e2e/test_m6b_home.py:12 reads HASH = "sha256:" + "ab".repeat(32); Python strings have no repeat method (that is JavaScript), so the module raises AttributeError at import, pytest collects nothing and exits 2, whi
- **Blocking tasks:** 1.1
- **Kind:** ambiguous
- **Asked:** 2026-11-20T08:53Z by claude-sonnet, run r-20261120T0807Z-a5b2, task 1.1

### Context
I changed nothing. The e2e gate failed with exit code 2 and the new file `e2e/test_m6b_home.py` ran no test. That is a collection or test-file problem, and a fix task may not change test files. I could only run the Node gate here, not pytest, so I could not see the actual collection error.

### Answer
<!-- write below this line -->
The collection error is fixed by the person's commit 566ade37 on this branch: e2e/test_m6b_home.py:12 now builds HASH as "sha256:" + "ab" * 32 (Python; "ab".repeat(32) raised AttributeError at import). Do not edit that file. The e2e gate still fails on a real defect in production code, which this task must fix. In web/src/app/HomePage.tsx, HomePage creates its client with createApiClient(), whose base is /api/v1, and passes it to loadEngineHealth. So the page requests /api/v1/health, which is 404, and shows "Engine unavailable". The server's health route is /health, and main's web/src/features/10-home.tsx used createApiClient({ baseUrl: "" }) for the health check. Give loadEngineHealth a client with baseUrl "" (keep the /api/v1 client for runs, flows, people, users, tool servers and policies). This defect fails test_a_failing_list_fails_alone_and_try_again_reads_it_again and test_the_signed_out_home_is_unchanged in e2e/test_m6b_home.py, both tests in e2e/test_m0_skeleton.py that expect "Engine healthy", and e2e/test_l4_c_1542e67b.py. Checked on a private e2e stack at 7642eae7 plus the test fix: with only that change, all 14 tests of those four files pass; without it, 5 fail.

---

## Q-002: Task 1.2 is blocked

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The gate failure is a defect in the test file itself: e2e/test_m6b_home.py line 12 reads `HASH = "sha256:" + "ab".repeat(32)`, and Python str has no repeat method (it should be `"ab" * 32`), so the module raises AttributeError on import and collects no test. The question comes from a fix task, and t
- **Blocking tasks:** 1.2
- **Kind:** ambiguous
- **Asked:** 2026-11-20T09:05Z by claude-sonnet, run r-20261120T0856Z-d6a7, task 1.2

### Context
No change made. F-c17c0f0a concerns e2e/test_m6b_home.py running no test. A fix task may not change test files, and the harness reverts any edit to that file. A person must commit the fix on the unit branch.

### Answer
<!-- write below this line -->
Fixed by the person's commit 566ade37 on this branch: e2e/test_m6b_home.py:12 read HASH = "sha256:" + "ab".repeat(32), which is JavaScript; Python raised AttributeError at import, so the file collected no test. It now reads "sha256:" + "ab" * 32 and collects its 4 tests. Nothing else is needed for F-c17c0f0a; do not edit the test file. The remaining e2e failures are the engine-health defect described in the answer to Q-001 (task 1.1).
