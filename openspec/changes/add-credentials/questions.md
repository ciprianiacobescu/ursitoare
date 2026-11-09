# Questions — add-credentials

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
| Q-001 | accepted | 1.1 | technical | src/credentials/schema.test.ts:31-38 insertServer cannot insert into tool_server through the owner pool |
<!-- l4:index:end -->

---

## Q-001: src/credentials/schema.test.ts:31-38 insertServer cannot insert into tool_server through the owner pool

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-09T22:06Z by claude-sonnet, run r-20261109T2147Z-0cd4, task 1.1

### Context
`insertServer` runs INSERT INTO ursitoare.tool_server on `db.ownerPool` outside a tenant transaction. 0470 forces row level security with WITH CHECK (tenant_id = current_setting('app.tenant_id', true)), and the owner role has no bypass, so the insert fails with 42501 before any credential_ref row is tested. `insertRef` already uses withTenantTx, which sets app.tenant_id, and that works.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/credentials/schema.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-credentials`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/credentials/schema.test.ts`: make `insertServer` run its INSERT inside `withTenantTx(db.ownerPool, { tenantId } as TenantContext, tx => tx.query(...))`, or set `app.tenant_id` with set_config in a transaction on the owner pool, so the forced RLS policy passes.

### Clarifier suggestion
Edit `src/credentials/schema.test.ts`: make `insertServer` run its INSERT inside `withTenantTx(db.ownerPool, { tenantId } as TenantContext, tx => tx.query(...))`, or set `app.tenant_id` with set_config in a transaction on the owner pool, so the forced RLS policy passes.

### Answer
<!-- write below this line -->
