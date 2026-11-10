# Questions — add-grants-model

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
| Q-001 | accepted | 4.2 | technical | src/api/grant-routes.test.ts:471 bob's create expects 201, but bob is an approver without deploy_policy |
<!-- l4:index:end -->

---

## Q-001: src/api/grant-routes.test.ts:471 bob's create expects 201, but bob is an approver without deploy_policy

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 4.2
- **Kind:** technical
- **Asked:** 2026-11-10T10:28Z by claude-sonnet, run r-20261110T0842Z-90d9, task 4.2

### Context
The test POSTs `/api/v1/grants` with bob's session (`bobCreate = call(server, "POST", "/api/v1/grants", bob, ...)`) and expects 201, and `g1.createdBy` is `bob.userId` at line 378. Bob is seeded as `approver`. Only `tenant_admin` holds `deploy_policy` (`src/grants/policy/grants.cedar:2`), so the PEP rightly answers 403. The spec and test-plan-store.md line 72 say only carol holds `deploy_policy`, and the row "POST user `bob`, `acme.lookup_vendor@1`, no key" means a grant for the user bob, created by carol.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/grant-routes.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-grants-model`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/grant-routes.test.ts`: in the `bobCreate` call (line ~471) send carol's session instead of `bob`, and set `g1.createdBy` (line ~378) to `carol.userId`
2. Edit the fragment so `approver` also holds `deploy_policy` (contradicts the spec and the alice-403/carol-only rows)

### Clarifier suggestion
Edit `src/api/grant-routes.test.ts`: in the `bobCreate` call (line ~471) send carol's session instead of `bob`, and set `g1.createdBy` (line ~378) to `carol.userId`

### Answer
<!-- write below this line -->
