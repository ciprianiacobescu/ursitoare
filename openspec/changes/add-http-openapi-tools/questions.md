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
| Q-001 | accepted | 4.1 | technical | src/api/openapi-tool-routes.test.ts:420 expects 2 tool servers in tenant a, but only 1 can exist |
| Q-002 | accepted | 5.1 | technical | src/main.conventions.test.ts:126 and src/api/people-openapi.test.ts:55 hard-code 50 paths |
<!-- l4:index:end -->

---

## Q-001: src/api/openapi-tool-routes.test.ts:420 expects 2 tool servers in tenant a, but only 1 can exist

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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

---

## Q-002: src/main.conventions.test.ts:126 and src/api/people-openapi.test.ts:55 hard-code 50 paths

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.1
- **Kind:** technical
- **Asked:** 2026-11-23T00:20Z by claude-sonnet, run r-20261122T2330Z-2571, task 5.1

### Context
Both frozen tests assert the committed and served OpenAPI document lists exactly 50 paths. The three routes this unit must document (/api/v1/tool-registrations/openapi, /api/v1/tool-registrations/openapi/preview, /api/v1/tool-servers/{id}/openapi) are three new paths, so the document now holds 53. The spec requires those three operations in the document, and task 5.1 says C-d150bfa4 stays green, which is impossible while it asserts 50.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/people-openapi.test.ts`, `src/main.conventions.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-http-openapi-tools`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/main.conventions.test.ts`: change `paths.length, 50` and the message `lists 50 paths` to 53; and edit `src/api/people-openapi.test.ts`: change the expected path count at line 55 from 50 to 53.
2. Make the count assertion relative (at least 50) in both files.

### Clarifier suggestion
Edit `src/main.conventions.test.ts`: change `paths.length, 50` and the message `lists 50 paths` to 53; and edit `src/api/people-openapi.test.ts`: change the expected path count at line 55 from 50 to 53.

### Answer
<!-- write below this line -->
