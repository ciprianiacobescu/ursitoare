# Questions — add-validator-version

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
| Q-001 | accepted | 3.1 | technical | src/registry/flows/validator-version-schema.test.ts:47-55 owner UPDATEs match no rows under FORCE RLS |
<!-- l4:index:end -->

---

## Q-001: src/registry/flows/validator-version-schema.test.ts:47-55 owner UPDATEs match no rows under FORCE RLS

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-22T08:03Z by claude-sonnet, run r-20261122T0644Z-8be4, task 3.1

### Context
The test runs `db.ownerPool.query("UPDATE ursitoare.flow_version SET validator_version = $1", [0])` outside any tenant transaction and expects `{ code: "23514" }`. flow_version has FORCE ROW LEVEL SECURITY (0270), so with no app.tenant_id the UPDATE matches no rows, the CHECK is never evaluated and assert.rejects fails with "Missing expected rejection". The same applies to the updates at lines 47-51 and 74. The spec says the owner can set the column to NULL, 1 and 2 and that 0 rejects with 23514. Existing tests reach the table as owner through withTenantTx(db.ownerPool, ctx, ...).

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/registry/flows/validator-version-schema.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-validator-version`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/registry/flows/validator-version-schema.test.ts`: run the owner UPDATEs at lines 47-55 and 74 inside `withTenantTx(db.ownerPool, a, async (tx) => { ... })`, with the 0 update's rejection asserted around that call, importing withTenantTx from ../../tenancy/index.ts

### Clarifier suggestion
Edit `src/registry/flows/validator-version-schema.test.ts`: run the owner UPDATEs at lines 47-55 and 74 inside `withTenantTx(db.ownerPool, a, async (tx) => { ... })`, with the 0 update's rejection asserted around that call, importing withTenantTx from ../../tenancy/index.ts

### Answer
<!-- write below this line -->
