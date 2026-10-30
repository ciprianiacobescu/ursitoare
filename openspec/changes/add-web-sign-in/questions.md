# Questions — add-web-sign-in

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
| Q-001 | accepted | 4.2 | technical | stack.db.test.ts asserts one tenant; the frozen tests at lines 205 and 274/318 now contradict the shipped tenant-b part (stop at line 205) |
<!-- l4:index:end -->

---

## Q-001: stack.db.test.ts asserts one tenant; the frozen tests at lines 205 and 274/318 now contradict the shipped tenant-b part (stop at line 205)

- **Status:** accepted
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The conflict is real: database-part.ts seed drops and recreates the database then ensures only the default tenant, reset.ts re-runs every part's seed, stack.ts discovers the shipped parts, and task 4.2 makes the tenant-b seed insert Tenant B, so the real stack holds two tenants after start and after
- **Blocking tasks:** 4.2
- **Kind:** technical
- **Asked:** 2026-10-30T04:25Z by glm, run r-20261030T0247Z-7d77, task 4.2

### Context
test/support/e2e-stack/stack.db.test.ts:205 asserts 'the seed created exactly one tenant' (tenants.length === 1) and :274/:318 assert the seeded tenant count stays 1, but this unit's criterion C-39471a6a requires test/support/e2e-stack/parts/27-tenant-b.ts to exist and be discovered, and its seed (decision 12, criterion C-812ae263 and later C-79192192) inserts tenant 'Tenant B' into the shipped stack, so the real stack now legitimately holds two tenants (E2E tenant and tenant_b) after start and after every reset. The two stack.db tests are frozen and previously green; I changed nothing in them. Expected edit consistent with the spec: C-d194233f's tenant assertion (line 205) would additionally require tenant_b with review_profile 'solo' to be present, and C-f55456d0's assertions (lines 273-276 and 317-319) would expect the two seeded tenants (default plus tenant_b) both before the probe and after each reset, comparing the tenant id sets instead of a single id.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/e2e-stack/stack.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-sign-in`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit test/support/e2e-stack/stack.db.test.ts: change the one-tenant assertions at lines 205, 274 and 318 so they accept the default tenant plus tenant B (both with their own review_profile 'solo' check), keep the reset idempotence assertions, and unfreeze exactly these two tests (C-d194233f and C-f55456d0) for this task.

### Clarifier suggestion
Edit `test/support/e2e-stack/stack.db.test.ts`: change the one-tenant assertions at lines 205, 274 and 318 so they accept the default tenant plus tenant B (both with their own review_profile 'solo' check), keep the reset idempotence assertions, and unfreeze exactly these two tests (C-d194233f and C-f55456d0) for this task.

### Answer
<!-- write below this line -->
