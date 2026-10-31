# Questions — add-admin-cli

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
| Q-001 | accepted | 7.4 | technical | src/cli/admin/list-users.test.ts:160 |
| Q-002 | answered | none | verdict | Criterion C-a13f7327 (ops-cli › admin grant-role and revoke-role change a direct grant › Refusals and isolation): accept as satisfied? |
| Q-003 | open | none | verdict | Finding F-f42f8c30: task 7.2: revoke-role refusals and isolation are not exercised |
<!-- l4:index:end -->

---

## Q-001: src/cli/admin/list-users.test.ts:160

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 7.4
- **Kind:** technical
- **Asked:** 2026-10-31T14:14Z by deepseek-free, run r-20261031T1409Z-233f, task 7.4

### Context
The helper bobLine (line 160) expects the line to end in "Bob", but the fixture at line 82 creates bob with `name: "Bob B"` and the JSON scenario at line 270 expects `displayName: "Bob B"`. The requirement says to print the user's display name, so the text expectation is inconsistent with the fixture and with the same file's JSON expectation; the failing assertions are at lines 176 and 213.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/cli/admin/list-users.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-admin-cli`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/cli/admin/list-users.test.ts`: change line 160 to `const bobLine = (bob: User): string => `${bob.userId}\thuman\tactive\t\t\tBob B`;`
2. Edit `src/cli/admin/list-users.test.ts`: change line 82 to `{ issuer: ISS, subject: "bob-sub", name: "Bob" }` and line 270 to `displayName: "Bob"`

### Clarifier suggestion
Edit `src/cli/admin/list-users.test.ts`: change line 160 to `const bobLine = (bob: User): string => `${bob.userId}\thuman\tactive\t\t\tBob B`;`

### Answer
<!-- write below this line -->

---

## Q-002: Criterion C-a13f7327 (ops-cli › admin grant-role and revoke-role change a direct grant › Refusals and isolation): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-a13f7327 (ops-cli › admin grant-role and revoke-role change a direct grant › Refusals and isolation)

### Context
Criterion C-a13f7327 (ops-cli › admin grant-role and revoke-role change a direct grant › Refusals and isolation) is needs human after round 1.

Scenario:
\- **WHEN** each command runs with user `usr_ghost` (role `author`); role `Bad Role` (user alice); no `--user`; no `--role`; and bob of `tenant_b`, who holds `author`, with `--tenant tenant_a --role author`; and `grant-role` with role `ghost`
\- **THEN** exit and stderr: 1 `RBAC_NOT_FOUND: `, 1 `RBAC_INVALID: `, 2 `CLI_USAGE: missing required option --user`, 2 `CLI_USAGE: missing required option --role`, 1 `RBAC_NOT_FOUND: ` (and `ghost`); the `RBAC_*` runs leave an event `outcome: "refused"` with that code; bob still holds `author`

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: insufficient_evidence
Tracing tests: src.cli.admin.grant-role.test.ts::C-a13f7327 admin grant-role and revoke-role refuse invalid input and stay isolated (passed, red_assertion, inadequate)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied by the code as it stands. The judge's doubt was that revoke-role might answer an unknown or foreign user with "not held" and exit 0. It cannot: revokeRole in src/identity/rbac/grants.ts runs requireUserId, requireRoleId, requireRole and requireUser before its DELETE, exactly as grantRole does, so "Bad Role" throws RBAC_INVALID, the role "ghost" and the user "usr_ghost" throw RBAC_NOT_FOUND, and bob of tenant_b is not found by the tenant-scoped user lookup for tenant_a and throws RBAC_NOT_FOUND too; the boolean "absent" branch is reached only after those checks pass. The revoke-role command is a thin wrapper over revokeRole with the same required-option handling as grant-role, and both go through the same defineAdminCommand, whose describeError marks any RBAC_* code as a refusal, prints "CODE: message", writes the cli.command_run event with outcome "refused" and that code, and exits 1. The tracing test exercises that whole path for grant-role (RBAC_NOT_FOUND, RBAC_INVALID, cross-tenant bob, ghost role, four refused events, bob still holding author) and the missing --user and --role usage errors for revoke-role; the remaining revoke-role refusals follow from the shared identity checks read above. The missing direct test of revoke-role refusals is a coverage gap worth closing later, not a defect in behaviour.
---

## Q-003: Finding F-f42f8c30: task 7.2: revoke-role refusals and isolation are not exercised

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-a13f7327).

Title: task 7.2: revoke-role refusals and isolation are not exercised
Detail: Task 7.2 says the 'Refusals and isolation' scenario is 'run for both commands'. src/cli/admin/grant-role.test.ts runs usr_ghost, Bad Role, bob of tenant_b and ghost only through admin grant-role. admin revoke-role is run only for the missing --user and --role. If revokeRole returns false for an unknown or foreign user, revoke-role would print 'not held' and exit 0, against the scenario, and no test would catch it.
Suggested fix: Add revoke-role runs for usr_ghost, Bad Role and bob of tenant_b with --tenant tenant_a, and assert exit 1, RBAC_* stderr, refused events, and that bob still holds author.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-a13f7327 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
