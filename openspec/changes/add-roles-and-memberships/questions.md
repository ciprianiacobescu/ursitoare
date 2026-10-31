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
| Q-001 | answered | 5.1 | technical | src/identity/rbac/grants.test.ts:348-350 — count query has no placeholder but binds one parameter |
| Q-002 | answered | none | verdict | Criterion C-bb91aeca (identity-rbac › Every tenant has the four default roles › Created with the tenant): accept as satisfied? |
| Q-003 | open | none | verdict | Finding F-780eb40d: Schema test does not check the exported DEFAULT_ROLES |
<!-- l4:index:end -->

---

## Q-001: src/identity/rbac/grants.test.ts:348-350 — count query has no placeholder but binds one parameter

- **Status:** answered
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
Take option 2. Edit `src/identity/rbac/grants.test.ts` line 350: change the params `[a.tenantId]` to `[]`, and leave the SQL at lines 348-349 as it is.

Do not take option 1 (the clarifier suggestion): it binds the tenant id to `user_id`, so the query would count the memberships of a user named after the tenant, find 0, and fail `assert.equal(..., 1)` for a reason that has nothing to do with the code under test.

Checked: `tx` is a pg PoolClient (src/tenancy/tx.ts:8 and :21), and pg 8.23.1 uses the extended protocol whenever `values` is non-empty (node_modules/pg/lib/query.js:53-57), so the current call fails with 08P01 before it counts anything. With `[]` it runs as a plain query. `withTenantTx` sets `app.tenant_id` (src/tenancy/tx.ts:21), so the count is scoped to tenant a the same way as the sibling count at lines 293-295.

---

## Q-002: Criterion C-bb91aeca (identity-rbac › Every tenant has the four default roles › Created with the tenant): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-bb91aeca (identity-rbac › Every tenant has the four default roles › Created with the tenant)

### Context
Criterion C-bb91aeca (identity-rbac › Every tenant has the four default roles › Created with the tenant) is needs human after round 1.

Scenario:
\- **WHEN** after `seedTwoTenants(db)` the owner inserts tenant `tenant_c`, and `SELECT role_id FROM ursitoare.role` is read for each tenant inside `withTenantTx(db.ownerPool, ...)`
\- **THEN** each of `tenant_a`, `tenant_b`, `tenant_c` has exactly `approver`, `auditor`, `author`, `tenant_admin`, and `[...DEFAULT_ROLES].sort()` equals that list

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: src.identity.rbac.schema.test.ts::C-bb91aeca Created with the tenant (passed, red_assertion, inadequate)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject The scenario's THEN clause requires that the exported DEFAULT_ROLES constant, sorted, equals the four role ids found in every tenant's ursitoare.role table. The tracing test never imports DEFAULT_ROLES: it declares its own literal list and, at the point where the constant should be compared, asserts that the sorted copy of that literal equals the literal itself, which is a tautology. No other test in the unit references DEFAULT_ROLES either. The production constant in src/identity/rbac/names.ts does hold exactly tenant_admin, author, approver and auditor, so the code is right, but the part of the scenario that ties the exported constant to the seeded roles is unverified and was skipped on purpose, so the criterion is not satisfied as it stands. The fix can add a new Node test rather than touch the frozen file. WHEN after seedTwoTenants(db) the owner inserts tenant_c and DEFAULT_ROLES is imported from src/identity/index.ts THEN a test asserts that [...DEFAULT_ROLES].sort() deep-equals ["approver", "auditor", "author", "tenant_admin"] and that this same list is what SELECT role_id FROM ursitoare.role returns for each of tenant_a, tenant_b and tenant_c inside withTenantTx(db.ownerPool, ...).
---

## Q-003: Finding F-780eb40d: Schema test does not check the exported DEFAULT_ROLES

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-bb91aeca).

Title: Schema test does not check the exported DEFAULT_ROLES
Detail: C-bb91aeca requires `[...DEFAULT_ROLES].sort()` to equal the role list. src/identity/rbac/schema.test.ts never imports DEFAULT_ROLES and asserts `[...DEFAULT_ROLE_IDS].sort()` against its own literal. The THEN clause about the constant is therefore untested, and the implementer's note confirms it was left this way on purpose.
Suggested fix: Import DEFAULT_ROLES from src/identity/index.ts and assert `[...DEFAULT_ROLES].sort()` deep-equals the roles read for each tenant.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-bb91aeca as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
