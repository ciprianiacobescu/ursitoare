# Questions — add-e2e-stack

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
| Q-001 | answered | 5.2 | technical | test/support/e2e-stack/stack.db.test.ts:340 counts nested Postgres PG_VERSION directories |
| Q-002 | answered | none | verdict | Criterion C-67438cd6 (e2e-stack › fresh_state resets the stack on the fake profile › Faults and state cleared before a test): accept as satisfied? |
| Q-003 | answered | none | verdict | Criterion C-ef0357b4 (e2e-stack › fresh_state resets the stack on the fake profile › Stack profile and unreachable control): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-0828b57f (e2e-stack › The browser gate sees the database and not the control routes › Health and control paths in the browser gate): accept as satisfied? |
<!-- l4:index:end -->

---

## Q-001: test/support/e2e-stack/stack.db.test.ts:340 counts nested Postgres PG_VERSION directories

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: checked spec:spec.md#scenario-close-stops-postgres-a-failed-start-leaves-nothing does not resolve
- **Blocking tasks:** 5.2
- **Kind:** technical
- **Asked:** 2026-10-26T23:43Z by deepseek, run r-20261026T2221Z-da09, task 5.2

### Context
While the stack runs, dirsWithPgVersion(tmpDir) recurses into the cluster and finds PG_VERSION in the cluster root plus every base/<oid>/ directory (initdb creates base/1, base/4 and base/5; seeding adds more), so a single healthy cluster yields 6 matches and the assertion `clusterDirs.length === 1` can never pass. Criterion C-fe09bf7e only requires that the TMPDIR directory holding the cluster's PG_VERSION be gone after close; database-part.test.ts already identifies that directory by the ursitoare-pg- prefix instead of counting every PG_VERSION. No implementation of startE2eStack can make a real Postgres expose exactly one PG_VERSION directory without corrupting the cluster.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/e2e-stack/stack.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-e2e-stack`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/support/e2e-stack/stack.db.test.ts`: at line 339 replace `const clusterDirs = dirsWithPgVersion(tmpDir);` with `const clusterDirs = dirsWithPgVersion(tmpDir).filter((dir) => path.dirname(dir) === tmpDir);`

### Clarifier suggestion
Edit `test/support/e2e-stack/stack.db.test.ts`: at line 339 replace `const clusterDirs = dirsWithPgVersion(tmpDir);` with `const clusterDirs = dirsWithPgVersion(tmpDir).filter((dir) => path.dirname(dir) === tmpDir);`

### Answer
<!-- write below this line -->
Take option 1. Edit `test/support/e2e-stack/stack.db.test.ts`: at line 339 replace `const clusterDirs = dirsWithPgVersion(tmpDir);` with `const clusterDirs = dirsWithPgVersion(tmpDir).filter((dir) => path.dirname(dir) === tmpDir);`. Change nothing else in the test. The claim checks out: a fresh initdb cluster (PostgreSQL via Homebrew, run locally) holds PG_VERSION in PGDATA and in each of base/1, base/14212 and base/14213. So the recursive walk finds four or more directories, and `clusterDirs.length === 1` cannot pass. startCluster (test/support/pg.ts:85) creates the cluster at mkdtemp(join(tmpdir(), "ursitoare-pg-")), and the test sets TMPDIR to tmpDir. That makes the cluster root the only match that is a direct child of tmpDir. The test still asserts exactly one, and then that this directory, every postmaster.pid and the stack directory are gone after close, which is what C-fe09bf7e requires.

---

## Q-002: Criterion C-67438cd6 (e2e-stack › fresh_state resets the stack on the fake profile › Faults and state cleared before a test): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 5, verifier
- **Criteria:** C-67438cd6 (e2e-stack › fresh_state resets the stack on the fake profile › Faults and state cleared before a test)

### Context
Criterion C-67438cd6 (e2e-stack › fresh_state resets the stack on the fake profile › Faults and state cleared before a test) is needs human after round 5.

Scenario:
\- **WHEN** a test installs a fault `GET /health` 503 through a fixture and then requests `fresh_state` before loading `/health`
\- **THEN** the page load answers 200; without `fresh_state` it answers 503 with `error.code` `"FAULT_INJECTED"`; the fault is deleted again in the fixture teardown

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_e2e_stack::test_fresh_state_clears_faults[chromium] (no proof that it discriminates (no red, audit or generated record)); test_e2e_stack::test_injected_fault_fails_the_route[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The two tests the judge set aside check the scenario exactly as written. The injected_fault fixture posts a GET /health 503 fault to the control URL and asserts 204, and its teardown sends DELETE /faults and asserts 204. test_injected_fault_fails_the_route takes only that fixture, loads /health through the page and asserts 503 with error.code FAULT_INJECTED, which is the "without fresh_state" branch. test_fresh_state_clears_faults takes injected_fault and then fresh_state, in that order, so the fault is installed before the reset runs, then loads /health and asserts 200 with status ok and checks.db ok. The fresh_state fixture in e2e/conftest.py posts a bodyless /reset to E2E_CONTROL_URL on the fake profile, and the reset clears faults by design. The only reason the tests were ignored is the absence of a red or audit record, not any gap in their assertions, so the criterion is satisfied as it stands.
---

## Q-003: Criterion C-ef0357b4 (e2e-stack › fresh_state resets the stack on the fake profile › Stack profile and unreachable control): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 5, verifier
- **Criteria:** C-ef0357b4 (e2e-stack › fresh_state resets the stack on the fake profile › Stack profile and unreachable control)

### Context
Criterion C-ef0357b4 (e2e-stack › fresh_state resets the stack on the fake profile › Stack profile and unreachable control) is needs human after round 5.

Scenario:
\- **WHEN** with `E2E_PROFILE=stack` and `E2E_CONTROL_URL=http://127.0.0.1:1` the fixture is requested, and in another test with profile `fake` and the same URL
\- **THEN** the first returns without any request; the second raises `RuntimeError` whose message contains the URL

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_e2e_stack::test_fresh_state_is_a_noop_on_the_stack_profile (no proof that it discriminates (no red, audit or generated record)); test_e2e_stack::test_fresh_state_reports_an_unreachable_control_url (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The two tests the judge set aside check the scenario as written. test_fresh_state_is_a_noop_on_the_stack_profile sets E2E_PROFILE to stack and E2E_CONTROL_URL to http://127.0.0.1:1, then requests fresh_state and asserts it returns None. Port 1 refuses connections, so any request from the fixture would raise RuntimeError through the URLError branch and fail the test; a clean return therefore proves no request was made. test_fresh_state_reports_an_unreachable_control_url sets the profile to fake with the same URL, asserts that requesting fresh_state raises RuntimeError, and asserts the URL is in the message. The fixture in e2e/conftest.py returns early when the profile is stack, otherwise posts a bodyless /reset and converts a URLError into a RuntimeError whose message names the URL. The tests were ignored only for lacking a red or audit record, not for any gap in their assertions, so the criterion is satisfied as it stands.
---

## Q-004: Criterion C-0828b57f (e2e-stack › The browser gate sees the database and not the control routes › Health and control paths in the browser gate): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 5, verifier
- **Criteria:** C-0828b57f (e2e-stack › The browser gate sees the database and not the control routes › Health and control paths in the browser gate)

### Context
Criterion C-0828b57f (e2e-stack › The browser gate sees the database and not the control routes › Health and control paths in the browser gate) is needs human after round 5.

Scenario:
\- **WHEN** `e2e/test_e2e_stack.py` loads `<base_url>/health` and sends `POST /reset`, `POST /faults` and `DELETE /faults` to `<base_url>`, each as a bodyless `urllib.request.Request(url, method=...)` (no `data`, no `Content-Type`), reading status and body from the caught `urllib.error.HTTPError`
\- **THEN** health is 200 with `checks.db` `"ok"` and the three others answer 404 with `error.code` `NOT_FOUND`; a refused connection (`urllib.error.URLError`) or any other status fails the test; `e2e/test_health.py::test_health_reports_ok` still passes unchanged

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_e2e_stack::test_control_paths_are_not_on_the_engine_port (no proof that it discriminates (no red, audit or generated record)); test_e2e_stack::test_health_reports_database_ok[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The two tests the judge set aside check the scenario as written. test_health_reports_database_ok loads base_url/health through the page and asserts status 200, status ok and checks.db ok. test_control_paths_are_not_on_the_engine_port sends POST /reset, POST /faults and DELETE /faults to base_url, each built as urllib.request.Request(url, method=...) with no data and no headers, so no body and no Content-Type; the helper reads status and body from the caught HTTPError, catches nothing else, so a refused connection raises URLError and fails the test, and any status other than 404 fails the assertion; the body must carry error.code NOT_FOUND. e2e/test_health.py::test_health_reports_ok is still the bootstrap smoke test asserting 200, status ok and a string version, which the served engine also satisfies. The tests were ignored only for lacking a red or audit record, not for any gap in their assertions. One note outside this scenario: no test in the file calls pytest.skip on a non-fake profile, though the requirement sentence asks for it; that clause is not part of this criterion and these two tests do not depend on the control listener.
