# Questions — add-policy-catalogue

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
| Q-001 | open | none | verdict | Finding F-e12398b4: An unreadable or non-directory policy directory is skipped silently |
<!-- l4:index:end -->

---

## Q-001: Finding F-e12398b4: An unreadable or non-directory policy directory is skipped silently

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-510115a3). It reports behaviour that no scenario pins down.

Title: An unreadable or non-directory policy directory is skipped silently
Detail: loadPolicyFragments wraps readdir of <module>/policy in try/catch and does `continue` on any error, so a policy directory that exists but cannot be read (EACCES), or a `policy` that is a regular file, drops every fragment in it without an error. Design decision 6 refuses unusable entries 'because a forbid must never be skipped silently'; no scenario covers an unreadable policy directory.
Suggested fix: WHEN `<srcDir>/<module>/policy` exists but cannot be read or is a regular file THEN `loadPolicyFragments` skips that module and resolves without its fragments.
The suggested fix describes what the code does now, and a reject does not use it: to pin that behaviour, end the reason with it.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-510115a3 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
