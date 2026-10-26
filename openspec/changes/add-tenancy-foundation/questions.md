# Questions — add-tenancy-foundation

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
| Q-001 | answered | none | verdict | Finding F-9d433ef5: A failed tenant reset after a successful COMMIT rejects although the writes were committed |
| Q-002 | open | none | verdict | Finding F-a449516e: App-role membership in pg_read_all_data / pg_write_all_data is not reported |
<!-- l4:index:end -->

---

## Q-001: Finding F-9d433ef5: A failed tenant reset after a successful COMMIT rejects although the writes were committed

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-c58611eb). It reports behaviour that no scenario pins down.

Title: A failed tenant reset after a successful COMMIT rejects although the writes were committed
Detail: In inTransaction, when COMMIT succeeds but the following `set_config('app.tenant_id', '', false)` throws (for example the connection drops between the two statements), `failure` is set to the reset error. withTenantTx then rejects even though fn's writes are durable. A caller that retries on rejection may duplicate the work. No scenario pins down what the helper should report in this case.
Suggested fix: WHEN the session reset after a successful COMMIT fails THEN withTenantTx destroys the connection and rejects with the reset's error even though fn's writes are committed.
The suggested fix describes what the code does now, and a reject does not use it: to pin that behaviour, end the reason with it.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-c58611eb as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The finding is waived. The design already decides this case: a failed reset destroys the connection, and when the connection dies the connection is destroyed and the original error is rethrown. The code does exactly that: a reset error after a successful COMMIT marks the client for destruction, is kept as the failure when nothing earlier failed, and is rethrown after release. The reset is a plain set_config of a session-level custom setting, which fails only when the connection itself is broken, so this is the design's "connection dies" row, not a case the documents leave open. A caller that sees a connection error after sending COMMIT can never be sure whether the writes landed, which is the general post-commit ambiguity of any database client, and the judge's own suggested behaviour restates what the code does now.

---

## Q-002: Finding F-a449516e: App-role membership in pg_read_all_data / pg_write_all_data is not reported

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
The judge raised a major finding in round 2, and no deterministic check confirms it (criterion C-ae959f29). It reports behaviour that no scenario pins down.

Title: App-role membership in pg_read_all_data / pg_write_all_data is not reported
Detail: APP_ROLE_PRIVILEGED flags membership only in ownerRole or in a superuser or BYPASSRLS role. If a later change grants ursitoare_app the predefined pg_read_all_data or pg_write_all_data role, the app role can read or write tenant_route directly. The catalog check stays clean in that case, because has_table_privilege on tenant_route may report the predefined-role grant inconsistently, and no role rule covers it.
Suggested fix: WHEN the app role is a member of pg_read_all_data or pg_write_all_data THEN checkTenancyCatalog reports no app_role_privileged violation for that membership.
The suggested fix describes what the code does now, and a reject does not use it: to pin that behaviour, end the reason with it.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-ae959f29 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
