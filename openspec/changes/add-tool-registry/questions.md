# Questions — add-tool-registry

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
| Q-001 | open | 3.1 | technical | src/tools/store.test.ts:130-146 and :243-248 read forced-RLS tables through a bare ownerPool |
<!-- l4:index:end -->

---

## Q-001: src/tools/store.test.ts:130-146 and :243-248 read forced-RLS tables through a bare ownerPool

- **Status:** open
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-09T17:26Z by claude-sonnet, run r-20261109T1452Z-37e1, task 3.1

### Context
Test 'registerToolServer stores a pending server with its first surface' (lines 130-146) reads tool_server and tool_surface through db.ownerPool.query with no tenant set. Test 'registerToolServerTx refuses a transaction of another tenant' (lines 243-248) does the same. The spec and migration 0470 force row-level security on app.tenant_id, and ursitoare_owner is NOBYPASSRLS, so these reads return 0 rows: 'stored.rows[0]?.origin' is undefined and the row list is [] instead of ['inside']. The audit_event count is likely affected the same way. Other tests, such as src/tools/schema.test.ts, read through withTenantTx(db.ownerPool, ctx, ...).

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/schema.test.ts`, `src/tools/store.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-tool-registry`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/tools/store.test.ts`: wrap each ownerPool read of ursitoare.tool_server, ursitoare.tool_surface and ursitoare.audit_event in `withTenantTx(db.ownerPool, a, async (tx) => tx.query(...))` for tenant a, using `a` from seedTwoTenants. Then green re-runs against the implementation already written.

### Clarifier suggestion
Edit `src/tools/store.test.ts`: wrap each ownerPool read of ursitoare.tool_server, ursitoare.tool_surface and ursitoare.audit_event in `withTenantTx(db.ownerPool, a, async (tx) => tx.query(...))` for tenant a, using `a` from seedTwoTenants. Then green re-runs against the implementation already written.

### Answer
<!-- write below this line -->
