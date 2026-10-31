# Questions — add-roles-and-memberships

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
| Q-001 | open | 5.1 | technical | src/identity/rbac/grants.test.ts:348-350 — count query has no placeholder but binds one parameter |
<!-- l4:index:end -->

---

## Q-001: src/identity/rbac/grants.test.ts:348-350 — count query has no placeholder but binds one parameter

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The diagnosis is confirmed: src/identity/rbac/grants.test.ts:348-350 sends a SQL text with no $1 and binds [a.tenantId] through membershipCount, which passes both straight to tx.query (a pg client), so Postgres rejects the bind (08P01) and the error escapes the test. But the clarifier suggestion (op
- **Blocking tasks:** 5.1
- **Kind:** technical
- **Asked:** 2026-10-30T23:59Z by glm, run r-20261030T2244Z-b219, task 5.1

### Context
Test 'C-f3ce9a1e Missing, invalid, concurrent, disabled' reaches its final check after every assertion on the implementation has passed (assert.equal(revoked, false) at line 343 succeeds, matching the spec's 'revoke is false for an idp_claim-only role'). The test then calls its own helper membershipCount with SQL `SELECT count(*)::int AS n FROM ursitoare.membership WHERE user_id = 'u2' AND role_id = 'author' AND source = 'idp_claim'` (no $1 anywhere) and params [a.tenantId] (line 350). Postgres rejects the bind with SQLSTATE 08P01 ('bind message supplies 1 parameters, but prepared statement "" requires 0'), the SQL error escapes the test, and the criterion fails even though the code under test behaves per spec. The sibling count at lines 290-298 uses `WHERE user_id = $1 AND ...` with matching params, suggesting a typo in this last call.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/identity/rbac/grants.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-roles-and-memberships`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/identity/rbac/grants.test.ts`: change the final count SQL (lines 348-349) to `SELECT count(*)::int AS n FROM ursitoare.membership WHERE user_id = $1 AND role_id = 'author' AND source = 'idp_claim'`, keeping the existing params `[a.tenantId]`.
2. Edit `src/identity/rbac/grants.test.ts`: line 350, change `[a.tenantId]` to `[]` so the parameterless SQL sentence is sent with no parameters.

### Clarifier suggestion
Edit `src/identity/rbac/grants.test.ts`: change the final count SQL (lines 348-349) to `SELECT count(*)::int AS n FROM ursitoare.membership WHERE user_id = $1 AND role_id = 'author' AND source = 'idp_claim'`, keeping the existing params `[a.tenantId]`.

### Answer
<!-- write below this line -->
