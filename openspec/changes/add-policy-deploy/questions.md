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
