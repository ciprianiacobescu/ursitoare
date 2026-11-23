# Questions — add-mcp-client

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
| Q-001 | accepted | 2.1 | technical | src/tools/mcp/surface.test.ts:540 asserts checkSchema(find.output, {}).ok is true, but the schema requires vendor_id and status |
| Q-002 | accepted | 3.1 | technical | src/tools/mcp/register.db.test.ts:18,58 owner-pool inserts/selects on RLS-forced tables |
| Q-003 | accepted | 3.1 | technical | src/tools/mcp/register.db.test.ts:137 bad-endpoint loop leaves tool_server rows |
| Q-004 | accepted | 3.1 | technical | src/tools/mcp/register.db.test.ts:221 two good cases share one generated id |
| Q-005 | answered | 3.1 | technical | src/tools/mcp/register.db.test.ts:191 G4 expects ["/"] after G1 inserted seven endpoints for tenant A |
| Q-006 | accepted | 4.1 | technical | src/tools/mcp/discover.db.test.ts:261-277 rowCount and newRows read policy_decision through ownerPool and always see 0 rows |
| Q-007 | accepted | 5.2 | technical | src/api/mcp-discover-route.db.test.ts:386 (T8) contradicts T14 at :482 and the spec |
| Q-008 | accepted | 5.2 | technical | src/api/mcp-discover-route.db.test.ts:326 T6 pendingDigest regex rejects the sha256: prefix |
| Q-009 | answered | 5.2 | technical | src/api/mcp-discover-route.db.test.ts:539 T15 absolute policy_decision count of 2 ignores PEP decisions |
| Q-010 | open | 5.3 | technical | src/api/people-openapi.test.ts:55 asserts 53 OpenAPI paths but this task makes 55 |
<!-- l4:index:end -->

---

## Q-001: src/tools/mcp/surface.test.ts:540 asserts checkSchema(find.output, {}).ok is true, but the schema requires vendor_id and status

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-11-23T05:07Z by claude-sonnet, run r-20261123T0346Z-0270, task 2.1

### Context
The test 'C-8557e582 M13 pattern id and anchor are dropped so the output compiles twice' first asserts `find.output` deep-equals `findOutput()`, which has `required: ["vendor_id","status"]` and `additionalProperties: false`. Lines 540 and 541 then assert `checkSchema(find.output, {}).ok === true`. `checkSchema` validates the data `{}` against the schema, so `required` makes `ok` false. The spec only says the two compiles of the output pass. Every other new test in the file passes, including the deep-equal assertion at line 539.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/mcp/surface.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/tools/mcp/surface.test.ts`: change both `checkSchema(find.output, {})` calls (lines 540 and 541) to `checkSchema(find.output, { vendor_id: "V-ACME", status: "active" })`

### Clarifier suggestion
Edit `src/tools/mcp/surface.test.ts`: change both `checkSchema(find.output, {})` calls (lines 540 and 541) to `checkSchema(find.output, { vendor_id: "V-ACME", status: "active" })`

### Answer
<!-- write below this line -->

---

## Q-002: src/tools/mcp/register.db.test.ts:18,58 owner-pool inserts/selects on RLS-forced tables

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-23T06:31Z by beam, run r-20261123T0509Z-33fe, task 3.1

### Context
seedToolServer inserts into ursitoare.tool_server (FORCE ROW LEVEL SECURITY) through db.ownerPool without setting app.tenant_id, so it fails with 42501; countRows selects from ursitoare.mcp_server the same way and always returns 0. Other tests in the repo wrap such access in withTenantTx.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/mcp/register.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/tools/mcp/register.db.test.ts: wrap seedToolServer's INSERT in withTenantTx(pool, { tenantId, reviewProfile: "solo" }, (tx) => tx.query(...)) and change countRows to withTenantTx(pool, ctx, (tx) => ...) with its callers passing ctx
2. Leave the test unchanged and make ursitoare_owner bypass RLS (not recommended)

### Clarifier suggestion
Edit `src/tools/mcp/register.db.test.ts`: wrap seedToolServer's INSERT in withTenantTx(pool, { tenantId, reviewProfile: "solo" }, (tx) => tx.query(...)) and change countRows to withTenantTx(pool, ctx, (tx) => ...) with its callers passing ctx

### Answer
<!-- write below this line -->
---

## Q-003: src/tools/mcp/register.db.test.ts:137 bad-endpoint loop leaves tool_server rows

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-23T06:31Z by beam, run r-20261123T0509Z-33fe, task 3.1

### Context
Each iteration calls seedToolServer("srv_bad_check") but only deletes from mcp_server, so the second iteration violates tool_server_pkey.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/mcp/register.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/tools/mcp/register.db.test.ts: add DELETE FROM ursitoare.tool_server WHERE tenant_id = $1 AND tool_server_id = $2 for srv_bad_check after the mcp_server delete, or use a unique id per iteration
2. Leave unchanged

### Clarifier suggestion
Edit `src/tools/mcp/register.db.test.ts`: add DELETE FROM ursitoare.tool_server WHERE tenant_id = $1 AND tool_server_id = $2 for srv_bad_check after the mcp_server delete, or use a unique id per iteration

### Answer
<!-- write below this line -->
---

## Q-004: src/tools/mcp/register.db.test.ts:221 two good cases share one generated id

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-23T06:31Z by beam, run r-20261123T0509Z-33fe, task 3.1

### Context
Case 2 (https://mcp.fake.test/mcp) and case 5 (http://10.0.0.5:8080/mcp) both derive id docs__mcp, so the second registration throws TOOLS_EXISTS although the test wraps it in assert.doesNotReject.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/mcp/register.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/tools/mcp/register.db.test.ts: make the id unique by including item.url (or the loop index) in the template
2. Leave unchanged

### Clarifier suggestion
Edit `src/tools/mcp/register.db.test.ts`: make the id unique by including item.url (or the loop index) in the template

### Answer
<!-- write below this line -->

---

## Q-005: src/tools/mcp/register.db.test.ts:191 G4 expects ["/"] after G1 inserted seven endpoints for tenant A

- **Status:** answered
- **Escalated by:** the delegate: delegate answer limit of task 3.1 reached (3)
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-23T07:06Z by deepseek-free, run r-20261123T0636Z-f199, task 3.1

### Context
G1 inserts the good endpoints "/", "/mcp", "/a/b%20c", "/" + 1023 x, "/a\\b", "/~" and "/!" for tenant A (each under srv_good_i via insertEndpoint(db.appPool, a, ...)) and never deletes them; G4 then runs SELECT endpoint FROM ursitoare.mcp_server (no WHERE) as tenant A and expects exactly ["/"]. No conforming implementation can both accept those inserts (they are wrapped in assert.doesNotReject) and hide the committed rows from a tenant-scoped SELECT, so the assertion cannot pass for any correct mcp_server table. The tenant-isolation intent is preserved by scoping each query to the server it seeds.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/mcp/register.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/tools/mcp/register.db.test.ts`: change the G4 tenant-A query to `SELECT endpoint FROM ursitoare.mcp_server WHERE tool_server_id = 'srv_a' ORDER BY endpoint` (still expects ["/"]) and the tenant-B query to `SELECT endpoint FROM ursitoare.mcp_server WHERE tool_server_id = 'srv_b' ORDER BY endpoint` (still expects ["/mcp"])
2. Edit `src/tools/mcp/register.db.test.ts`: change the G4 tenant-A expectation to ["/", "/", "/!", "/a/b%20c", "/a\\b", "/mcp", "/" + "x".repeat(1023), "/~"] and leave the tenant-B expectation ["/mcp"]

### Clarifier suggestion
Edit `src/tools/mcp/register.db.test.ts`: change the G4 tenant-A query to `SELECT endpoint FROM ursitoare.mcp_server WHERE tool_server_id = 'srv_a' ORDER BY endpoint` (still expects ["/"]) and the tenant-B query to `SELECT endpoint FROM ursitoare.mcp_server WHERE tool_server_id = 'srv_b' ORDER BY endpoint` (still expects ["/mcp"])

### Answer
<!-- write below this line -->
Edit `src/tools/mcp/register.db.test.ts`, G4 only, and take neither option as written.

Option 1 is rejected. With tenant A's query filtered to srv_a and tenant B's to srv_b, neither query can ever return the other tenant's row, so G4 would pass with no row level security at all. It would stop testing isolation, which is what the spec's forced row level security on mcp_server requires.

Option 2 keeps the isolation check, but it hard-codes an ORDER BY order that depends on the test database's collation.

Keep both queries unscoped and compare the rows as a set:
- Change the tenant-A assertion to `assert.deepEqual(aRows.rows.map((row) => row.endpoint).sort(), ["/", ...good].sort());`. That is srv_a's "/" from G3 plus the seven G1 endpoints, and none of tenant B's.
- Leave the tenant-B assertion `["/mcp"]` as it is.

Change nothing else in the file.

---

## Q-006: src/tools/mcp/discover.db.test.ts:261-277 rowCount and newRows read policy_decision through ownerPool and always see 0 rows

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-23T10:41Z by claude-sonnet, run r-20261123T0928Z-3bb6, task 4.1

### Context
The `policy_decision` table has FORCE ROW LEVEL SECURITY with USING `tenant_id = current_setting('app.tenant_id', true)` (migration 0110). `ownerPool` is the NOBYPASSRLS role `ursitoare_owner`, and the plain query sets no `app.tenant_id`, so it sees no rows. `rowCount()` is always 0 and `newRows(before)` is always empty. D1 asserts 3 new rows, D9 asserts the deny and allow rows, D11 asserts 2 new rows. All three fail although the code records the decisions: `recordDecisionOwnTx` returns true and the stage `decision` is not raised. The spec for C-85421c4d expects the decision rows to be readable.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/mcp/discover.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/tools/mcp/discover.db.test.ts`: make `rowCount()` and `newRows()` read through `withTenantTx(d.appPool, CTX, tx => tx.query(...))` (import `withTenantTx` from `../../tenancy/index.ts`) instead of `d.ownerPool.query`, with the same SQL.
2. Edit `test/support/pg.ts`: give the owner pool a session that bypasses RLS for reads. Not recommended, because it changes shared test support.

### Harness notes
Harness note: the previous attempt of this task was rejected: the agent step reached its time limit (30m)

### Clarifier suggestion
Edit `src/tools/mcp/discover.db.test.ts`: make `rowCount()` and `newRows()` read through `withTenantTx(d.appPool, CTX, tx => tx.query(...))` (import `withTenantTx` from `../../tenancy/index.ts`) instead of `d.ownerPool.query`, with the same SQL.

### Answer
<!-- write below this line -->

---

## Q-007: src/api/mcp-discover-route.db.test.ts:386 (T8) contradicts T14 at :482 and the spec

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.2
- **Kind:** technical
- **Asked:** 2026-11-23T16:57Z by claude-sonnet, run r-20261123T1523Z-e57b, task 5.2

### Context
T8 builds the harness with `services: null` (the harness passes null through as the route's `services` dep), registers `docs`, and expects 422 OPERATION_REFUSED with reason credential_missing. T14 builds the same harness with `services: null` (and with `policy: null`, `gateway: null`) and expects 503 EGRESS_UNAVAILABLE with reason discovery_not_configured. The spec (requirement 'The routes register a server by URL and discover its tools') says a null `gateway`, `policy` or `services` is 503 `EGRESS_UNAVAILABLE` `{ reason: "discovery_not_configured" }` first, before the unknown-server 404. credential_missing (row T8, D10) comes from a services lookup that resolves null. The only difference between the two tests is that T8 registers `docs` first, and the spec's order makes that irrelevant. T8 was presumably meant to pass `services: { resolve: async () => null }`.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/mcp-discover-route.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/mcp-discover-route.db.test.ts`: in test T8 (line 387) replace `createHarness({ services: null })` with `createHarness({ services: { resolve: async () => null } })`
2. Edit `src/api/mcp-discover-route.db.test.ts`: delete the `services: null` case from T14

### Harness notes
Harness note: the previous attempt of this task was rejected: the agent step reached its time limit (30m)

### Clarifier suggestion
Edit `src/api/mcp-discover-route.db.test.ts`: in test T8 (line 387) replace `createHarness({ services: null })` with `createHarness({ services: { resolve: async () => null } })`

### Answer
<!-- write below this line -->

---

## Q-008: src/api/mcp-discover-route.db.test.ts:326 T6 pendingDigest regex rejects the sha256: prefix

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.2
- **Kind:** technical
- **Asked:** 2026-11-23T17:11Z by claude-sonnet, run r-20261123T1700Z-c746, task 5.2

### Context
T6 asserts firstBody.server.pendingDigest matches /^[0-9a-f]{64}$/. surfaceDigest, and every ToolServerRecord already on main, gives 'sha256:<64 hex>'. The approve route takes this exact value as `digest`, so the route cannot return bare hex without breaking approval.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/mcp-discover-route.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/mcp-discover-route.db.test.ts`: at line 326 change the regex to /^sha256:[0-9a-f]{64}$/

### Clarifier suggestion
Edit `src/api/mcp-discover-route.db.test.ts`: at line 326 change the regex to /^sha256:[0-9a-f]{64}$/

### Answer
<!-- write below this line -->
---

## Q-009: src/api/mcp-discover-route.db.test.ts:539 T15 absolute policy_decision count of 2 ignores PEP decisions

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: names the frozen path src/api/mcp-discover-route.db.test.ts of task 5.2; only the clarifier suggestion may unfreeze it
- **Blocking tasks:** 5.2
- **Kind:** technical
- **Asked:** 2026-11-23T17:11Z by claude-sonnet, run r-20261123T1700Z-c746, task 5.2

### Context
T15 asserts countPolicyDecisions(h) === 2 after register, discover and a replayed discover. countPolicyDecisions counts every policy_decision row of tenant A. The PEP records one decision per API call (3 here) plus 2 discovery decisions, so the observed count is 5 even though the replay sends and records nothing (the fake MCP stays at 2 requests).

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/mcp-discover-route.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/mcp-discover-route.db.test.ts`: in T15 read countPolicyDecisions before the replay and assert it is unchanged after it, in place of the literal 2 at line 539

### Clarifier suggestion
Edit `src/api/mcp-discover-route.db.test.ts`: in T15 read countPolicyDecisions before the replay and assert it is unchanged after it, in place of the literal 2 at line 539

### Answer
<!-- write below this line -->
Edit `src/api/mcp-discover-route.db.test.ts`, test T15 (line 539). Do not take the clarifier option as written. It would also fail, because the replayed request records its own PEP row.

Why the literal 2 is wrong:
- Every routed call is authorized by `decisionPreHandler` (src/api/pep.ts:52-78). It calls `enforce`, which records one `policy_decision` row (src/api/decision.ts:67-70).
- Register, discover and the replay each add one PEP row, and discovery adds 2. So tenant A has 4 rows before the replay and 5 after it.
- The spec's "no new decision" on a replay (scenario "Discover, refuse and replay", row T15) means discovery does not run again. The request's own PEP row is the base authorization rule, not a discovery decision.

What to assert instead. Keep every other T15 assertion as it is.
1. Next to `countPolicyDecisions`, add a helper `countDiscoveryDecisions(h)`. Use the same query with `AND permit IS NOT NULL` added. Discovery decisions carry the egress permit, because only a request with `egress` gets one (src/pdp/check.ts:109-110). PEP rows have `permit` null, because `buildPolicyRequest` sets no egress (src/api/decision.ts:19-36).
2. After `first` answers 200 and before the replay, read `const decisionsBefore = await countPolicyDecisions(h);`. Then assert `assert.equal(await countDiscoveryDecisions(h), 2);`.
3. Replace `assert.equal(await countPolicyDecisions(h), 2);` with two assertions:
   - `assert.equal(await countPolicyDecisions(h), decisionsBefore + 1);`: the replayed request's own PEP row, and nothing else.
   - `assert.equal(await countDiscoveryDecisions(h), 2);`: the replay recorded no discovery decision.

---

## Q-010: src/api/people-openapi.test.ts:55 asserts 53 OpenAPI paths but this task makes 55

- **Status:** open
- **Blocking tasks:** 5.3
- **Kind:** technical
- **Asked:** 2026-11-23T18:45Z by deepseek-free, run r-20261123T1726Z-c688, task 5.3

### Context
The frozen test at src/api/people-openapi.test.ts:55 asserts `Object.keys(paths).length === 53`, while the red step updated src/main.conventions.test.ts C-d150bfa4 to 55 and the spec requires main to add POST /api/v1/tool-registrations/mcp and POST /api/v1/tool-servers/{id}/discover to the committed document. Both cannot pass with the same document: the gate currently fails only this one assertion (55 !== 53). I did not edit the frozen test.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/people-openapi.test.ts`, `src/main.conventions.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-mcp-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/people-openapi.test.ts`: change `assert.equal(Object.keys(paths).length, 53, "the document lists 53 paths");` to `assert.equal(Object.keys(paths).length, 55, "the document lists 55 paths");`

### Clarifier suggestion
Edit `src/api/people-openapi.test.ts`: change `assert.equal(Object.keys(paths).length, 53, "the document lists 53 paths");` to `assert.equal(Object.keys(paths).length, 55, "the document lists 55 paths");`

### Answer
<!-- write below this line -->
