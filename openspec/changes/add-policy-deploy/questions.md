# Questions — add-policy-deploy

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
| Q-001 | accepted | 1.1 | technical | src/grants/policy-schema.test.ts:208 expects UPDATE of current rows in tenant A to affect 2 rows, but only one current row exists in that tenant |
| Q-002 | open | 3.4 | technical | src/grants/policy-deploy.test.ts:279 and :325 read policy_set through ownerPool, which forced RLS hides |
| Q-003 | open | 3.4 | technical | src/grants/policy-deploy.test.ts:307 expects base-engine P requests to deny with errors [] although the base schema has no amount argument |
<!-- l4:index:end -->

---

## Q-001: src/grants/policy-schema.test.ts:208 expects UPDATE of current rows in tenant A to affect 2 rows, but only one current row exists in that tenant

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-10T12:04Z by deepseek-free, run r-20261110T1146Z-9857, task 1.1

### Context
The migration implements the test-plan verbatim: a partial unique index `policy_set_current_idx ON ursitoare.policy_set (tenant_id) WHERE current` permits exactly one current row per tenant, and a rejected second current insert (asserted 23505 earlier in the test) leaves only tenant A's deploy_seq 1 current row. Tenant B's current row is filtered by the RLS policy, so `withTenantTx(db.appPool, a, UPDATE ... SET current = false WHERE current)` returns rowCount 1, not 2. This contradiction is internal to the frozen test: changing that expected value to 1 makes the whole test pass (verified with a scratch copy), while no migration can both enforce one current row per tenant and have this update touch two rows.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/grants/policy-schema.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-policy-deploy`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/grants/policy-schema.test.ts`: change the expected value on line 208 from `2` to `1`.

### Clarifier suggestion
Edit `src/grants/policy-schema.test.ts`: change the expected value on line 208 from `2` to `1`.

### Answer
<!-- write below this line -->

---

## Q-002: src/grants/policy-deploy.test.ts:279 and :325 read policy_set through ownerPool, which forced RLS hides

- **Status:** open
- **Blocking tasks:** 3.4
- **Kind:** technical
- **Asked:** 2026-11-10T15:03Z by deepseek-free, run r-20261110T1444Z-ede1, task 3.4

### Context
The frozen test's rows() helper (line 279) and stored-row query (line 325) run SELECTs through f.db.ownerPool without setting app.tenant_id. Migration 0495 enables and forces row security with USING (tenant_id = current_setting('app.tenant_id', true)); the owner role is created NOBYPASSRLS, so with no tenant GUC it sees zero rows. Verified in this sandbox: a row inserted via appPool/withTenantTx is invisible to ownerPool (count 0) and visible to withTenantTx(appPool, tenant_a) (count 1). Thus every rows() assertion sees [] regardless of implementation, while the test plan says rows() runs 'in T'. With rows() and the stored query switched to withTenantTx(f.db.appPool, f.t, ...), and the separate base-engine issue below also corrected, all 11 tests pass.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/grants/policy-deploy.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-policy-deploy`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/grants/policy-deploy.test.ts`: make `rows` run its SELECT through `withTenantTx(f.db.appPool, f.t, (tx) => tx.query<Row>(...))`, and make the `stored` query at line 325 run through `withTenantTx(f.db.appPool, f.t, (tx) => tx.query<{ current: boolean; grant_ids: string[]; tool_args: unknown; tenant_sources: { id: string }[] }>(...))`, keeping the SQL unchanged.

### Clarifier suggestion
Edit `src/grants/policy-deploy.test.ts`: make `rows` run its SELECT through `withTenantTx(f.db.appPool, f.t, (tx) => tx.query<Row>(...))`, and make the `stored` query at line 325 run through `withTenantTx(f.db.appPool, f.t, (tx) => tx.query<{ current: boolean; grant_ids: string[]; tool_args: unknown; tenant_sources: { id: string }[] }>(...))`, keeping the SQL unchanged.

### Answer
<!-- write below this line -->
---

## Q-003: src/grants/policy-deploy.test.ts:307 expects base-engine P requests to deny with errors [] although the base schema has no amount argument

- **Status:** open
- **Blocking tasks:** 3.4
- **Kind:** technical
- **Asked:** 2026-11-10T15:03Z by deepseek-free, run r-20261110T1444Z-ede1, task 3.4

### Context
The four P before-requests carry context.args.amount as a decimal extension. The runtime's base engine is built with no toolArgs (its version is the frozen VBASE 599ac6...), so Cedar request validation rejects the undeclared amount attribute and runCheck returns ['deny', [], ['PDP_REQUEST_INVALID'], VBASE]. Verified directly with createPolicyEngine and also observed when running the frozen test. The test plan marks these four before-rows 'derived, not run', and the spec still requires the base engine to decide a tenant request with no stored set, so the expectation of empty errors is wrong.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/grants/policy-deploy.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-policy-deploy`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/grants/policy-deploy.test.ts`: in the before loop at line 306, set `const errors = name.startsWith("P") ? ["PDP_REQUEST_INVALID"] : [];` and assert `assert.deepEqual(dec(await rt.engine.check(r)), ["deny", [], errors, VBASE], `before: ${name}`);`.

### Clarifier suggestion
Edit `src/grants/policy-deploy.test.ts`: in the before loop at line 306, set `const errors = name.startsWith("P") ? ["PDP_REQUEST_INVALID"] : [];` and assert `assert.deepEqual(dec(await rt.engine.check(r)), ["deny", [], errors, VBASE], `before: ${name}`);`.

### Answer
<!-- write below this line -->
