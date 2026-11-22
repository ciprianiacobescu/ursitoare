# Questions — add-http-openapi-tools

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
| Q-001 | open | 4.1 | technical | src/api/openapi-tool-routes.test.ts:420 expects 2 tool servers in tenant a, but only 1 can exist |
<!-- l4:index:end -->

---

## Q-001: src/api/openapi-tool-routes.test.ts:420 expects 2 tool servers in tenant a, but only 1 can exist

- **Status:** open
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-22T23:27Z by claude-sonnet, run r-20261122T2129Z-a20e, task 4.1

### Context
The test registers `shop` as carol in tenant a, then registers `shop` as mallory in tenant b, and its other writes are refused (alice 403, mallory's PUT 404, huge document 413). It then asserts `countServers(h) === 2`. `countServers` queries `ursitoare.tool_server` through `withTenantTx(h.db.ownerPool, h.a, …)`, which is tenant a's context under row-level security, so it can only see carol's one row. The route code stored nothing else, so the correct value is 1.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/openapi-tool-routes.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-http-openapi-tools`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/openapi-tool-routes.test.ts`: on line 420 change `assert.equal(await countServers(h), 2);` to `assert.equal(await countServers(h), 1);`

### Clarifier suggestion
Edit `src/api/openapi-tool-routes.test.ts`: on line 420 change `assert.equal(await countServers(h), 2);` to `assert.equal(await countServers(h), 1);`

### Answer
<!-- write below this line -->
