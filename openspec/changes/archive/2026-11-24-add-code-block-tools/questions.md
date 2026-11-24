# Questions — add-code-block-tools

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
| Q-001 | accepted | 2.1 | technical | src/tools/code/register.db.test.ts:140 asserts r4 deepEquals r3 after approval |
| Q-002 | accepted | 6.1 | technical | src/main.conventions.test.ts:126 and src/api/people-openapi.test.ts:55 hard-code 55 document paths |
| Q-003 | answered | none | verdict | Criterion C-aebcc921 (credentials › Credential references are stored per tenant and hold no value › Migration 0480 stores references and no value): accept as satisfied? |
<!-- l4:index:end -->

---

## Q-001: src/tools/code/register.db.test.ts:140 asserts r4 deepEquals r3 after approval

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-11-23T23:29Z by beam, run r-20261123T2308Z-9bd2, task 2.1

### Context
After approved2 approves D_WC2, the server is approved (approvedDigest D_WC2, no pending surface). Resubmitting WC2 (digest D_WC2) matches approvedDigest, so submitLockedTx returns the approved record; it cannot equal the earlier drifted r3 (state drifted, approvedDigest D_WC, pending D_WC2). The R4 block therefore tests idempotent resubmission of a still-pending surface and belongs before approved2.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/code/register.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-code-block-tools`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/tools/code/register.db.test.ts: move the block from `// R4 again no new event` through `assert.deepEqual(r4, r3);` (lines 132-140) to immediately before `const approved2 = await approveSurface(...)` (line 131), so the idempotent resubmission is checked while D_WC2 is still pending.
2. Edit src/tools/code/register.db.test.ts:140: replace `assert.deepEqual(r4, r3);` with `assert.equal((r4 as { state: string }).state, "approved");`.

### Clarifier suggestion
Edit `src/tools/code/register.db.test.ts`: move the block from `// R4 again no new event` through `assert.deepEqual(r4, r3);` (lines 132-140) to immediately before `const approved2 = await approveSurface(...)` (line 131), so the idempotent resubmission is checked while D_WC2 is still pending.

### Answer
<!-- write below this line -->

---

## Q-002: src/main.conventions.test.ts:126 and src/api/people-openapi.test.ts:55 hard-code 55 document paths

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 6.1
- **Kind:** technical
- **Asked:** 2026-11-24T07:18Z by claude-sonnet, run r-20261124T0634Z-0e03, task 6.1

### Context
Both frozen tests assert the committed OpenAPI document lists exactly 55 paths. The task and spec require `/api/v1/tool-registrations/code` and `/api/v1/tool-servers/{id}/code` in the regenerated document, which makes 57. I ran the gate after regenerating: C-d150bfa4 and C-fb2cd0d1 fail with `57 !== 55`, and every other test passes.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/people-openapi.test.ts`, `src/main.conventions.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-code-block-tools`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/main.conventions.test.ts`: change the expected path count 55 to 57 (line 126) and its message to match, and edit `src/api/people-openapi.test.ts`: change the expected path count 55 to 57 (line 55)

### Clarifier suggestion
Edit `src/main.conventions.test.ts`: change the expected path count 55 to 57 (line 126) and its message to match, and edit `src/api/people-openapi.test.ts`: change the expected path count 55 to 57 (line 55)

### Answer
<!-- write below this line -->

---

## Q-003: Criterion C-aebcc921 (credentials › Credential references are stored per tenant and hold no value › Migration 0480 stores references and no value): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-aebcc921 (credentials › Credential references are stored per tenant and hold no value › Migration 0480 stores references and no value)

### Context
Criterion C-aebcc921 (credentials › Credential references are stored per tenant and hold no value › Migration 0480 stores references and no value) is needs human after round 1.

Scenario:
\- **WHEN** the migrations run and the 21 rows of test-plan.md § Migration rows (of the archived change `add-credentials`) run in order
\- **THEN** `schema_migration` holds version 480 named `credentials`, `checkTenancyCatalog` returns `[]`, the columns are exactly the eleven of design.md § The table, each row ends with its listed outcome and constraint (`23505` rows 2-4, `23503` row 5, `23514` rows 6-14, `42501` rows 16-20) and `tenant_b` sees 0 rows where `tenant_a` sees 1

Why: uncovered: no adequate discriminating test traces it
Judge: insufficient_evidence
Tracing tests: none
Ignored tests: src.credentials.schema.test.ts::C-aebcc921 migration 0480 stores references and no value (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The scenario "Migration 0480 stores references and no value" is the unchanged first scenario of a MODIFIED requirement, and the frozen test of the archived change add-credentials, named with this criterion's id, asserts each of its rows: the ledger holds version 480 named credentials, checkTenancyCatalog returns an empty array, the columns are exactly the eleven of the design, rows 2 to 4 fail 23505 with their constraint names, row 5 fails 23503 on the foreign key, rows 6 to 14 fail 23514, the app role updates key_version and rotated_at, rows 16 to 20 fail 42501 (target_origin, mintkey_service_id, provisioned_by, DELETE and a cross-tenant insert), and tenant_b sees 0 rows where tenant_a sees 1. The judge ignored it only because it has no red record in this unit, which is expected for a test written by an earlier unit. This unit's only migration, 0550_credential_scheme.sql, grants UPDATE on auth_scheme and header_name alone, so none of the refusals the frozen test asserts for rows 16 to 20 is loosened and the 0480 scenario still holds on the migrated database.
