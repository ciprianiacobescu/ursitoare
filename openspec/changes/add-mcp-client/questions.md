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
