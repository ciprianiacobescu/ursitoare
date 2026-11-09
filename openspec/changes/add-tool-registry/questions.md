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
| Q-001 | accepted | 3.1 | technical | src/tools/store.test.ts:130-146 and :243-248 read forced-RLS tables through a bare ownerPool |
| Q-002 | answered | none | verdict | Criterion C-c3dcd848 (tool-registry › Tool servers and surfaces are stored per tenant, and only `approveSurface` sets the approval columns › Migration 0470 stores servers and surfaces with narrow upda |
| Q-003 | answered | none | verdict | Criterion C-f1acd012 (tool-registry › validateOrigin accepts public https origins and refuses unsafe ones › Each of 55 inputs is accepted or refused with its reason): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-9e03eeea (tool-registry › The surface digest is canonical, fixtureSurface builds fixture surfaces, and block refs are chosen by content › The digest ignores order and fills defaults, fixtu |
| Q-005 | answered | none | verdict | Criterion C-d0c13cf0 (tool-registry › Registering a server stores it pending with its first surface › Register stores a pending server and refuses what is invalid, taken or foreign): accept as satisfi |
| Q-006 | open | none | verdict | Criterion C-59cbd279 (tool-registry › Approval needs another admin in a team and an explicit, audited self-approval when solo › A team refuses the submitter, a solo tenant needs the flag, and every re |
| Q-007 | open | none | verdict | Criterion C-6d84e4c8 (tool-registry › Approval writes immutable bound block versions and a failure between its two steps leaves them inert › Approval imports bound blocks, and a repeat completes after |
| Q-008 | open | none | verdict | Criterion C-0955b490 (tool-registry › A changed surface disables the server until its new digest is approved › A submitted surface drifts an approved server and re-approval restores it): accept as sat |
| Q-009 | open | none | verdict | Criterion C-c3474bfc (tool-registry › The directory resolves a ref only to the approved definition of a bound tool › The directory answers an approved tool, a drifted one with its state, and null for  |
| Q-010 | open | none | verdict | Criterion C-95f2b798 (tool-registry › Tenant admins may register tool servers and approve surfaces › Only tenant admins of the tenant hold the two actions): accept as satisfied? |
| Q-011 | open | none | verdict | Criterion C-0ab1d0b5 (tool-registry › The routes register, list, read, submit and approve for tenant admins only › Carol registers and reads, alice is refused and tenant_b sees nothing): accept as sat |
| Q-012 | open | none | verdict | Criterion C-29de3844 (tool-registry › The routes register, list, read, submit and approve for tenant admins only › Approval over HTTP follows the tenant's profile and the approved blocks show as bound |
| Q-013 | open | none | verdict | Criterion C-4114528c (tool-registry › The routes register, list, read, submit and approve for tenant admins only › A null pool or engine key answers as the block routes do): accept as satisfied? |
| Q-014 | open | none | verdict | Criterion C-0bfb5dc5 (tool-registry › The committed OpenAPI document lists the tool-server routes › The committed document holds the five operations with their actions): accept as satisfied? |
| Q-015 | open | none | verdict | Hold H-332bbcee: the judge's reply was discarded (part 2 of 2, timeout: no answer within 600s) |
<!-- l4:index:end -->

---

## Q-001: src/tools/store.test.ts:130-146 and :243-248 read forced-RLS tables through a bare ownerPool

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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

---

## Q-002: Criterion C-c3dcd848 (tool-registry › Tool servers and surfaces are stored per tenant, and only `approveSurface` sets the approval columns › Migration 0470 stores servers and surfaces with narrow upda

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-c3dcd848 (tool-registry › Tool servers and surfaces are stored per tenant, and only `approveSurface` sets the approval columns › Migration 0470 stores servers and surfaces with narrow update rights)

### Context
Criterion C-c3dcd848 (tool-registry › Tool servers and surfaces are stored per tenant, and only `approveSurface` sets the approval columns › Migration 0470 stores servers and surfaces with narrow update rights) is needs human after round 1.

Scenario:
\- **WHEN** the migrations run on a fresh database and the 25 statements of test-plan.md § Migration rows run in order
\- **THEN** `schema_migration` holds version 470 named `tool_registry`, `checkTenancyCatalog` returns `[]`, every row ends with its listed outcome (state `other` is refused by `23514`), and `tenant_b` sees 0 rows where `tenant_a` sees 2 servers and 1 surface

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.tools.schema.test.ts::C-c3dcd848 migration 0470 stores servers and surfaces with narrow update rights (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The schema test walks all 25 migration rows of the test plan in order with the listed outcomes (23505, 42501, 23514, 23503), asserts version 470 named tool_registry, an empty checkTenancyCatalog, and tenant_b seeing 0 rows where tenant_a sees 2 servers and 1 surface. Migration 0470 has the primary keys, the state and approval-column CHECKs, forced row level security and the narrow column-level UPDATE grants with no DELETE grant.
---

## Q-003: Criterion C-f1acd012 (tool-registry › validateOrigin accepts public https origins and refuses unsafe ones › Each of 55 inputs is accepted or refused with its reason): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-f1acd012 (tool-registry › validateOrigin accepts public https origins and refuses unsafe ones › Each of 55 inputs is accepted or refused with its reason)

### Context
Criterion C-f1acd012 (tool-registry › validateOrigin accepts public https origins and refuses unsafe ones › Each of 55 inputs is accepted or refused with its reason) is needs human after round 1.

Scenario:
\- **WHEN** `validateOrigin(url, { local })` runs for the 55 rows of test-plan.md § Origins
\- **THEN** each result deep-equals its row (`https://2130706433` is `loopback`)

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.tools.origin.test.ts::C-f1acd012: each of the 55 origin rows is accepted or refused with its reason (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The origin test holds exactly the 55 rows of test-plan.md § Origins with their inputs, local flags and expected results, and deep-equals validateOrigin's result for each, including row 10 (https://2130706433 is loopback). The implementation follows design.md § validateOrigin: length and parse give not_url, then scheme, credentials, path, then the host classes with IPv4, embedded-IPv4 IPv6, link-local, unique-local and the named-host rules, with no DNS lookup. The code also refuses the bare name mintkey, which design.md does not list, but no row depends on it and it only narrows what is accepted.
---

## Q-004: Criterion C-9e03eeea (tool-registry › The surface digest is canonical, fixtureSurface builds fixture surfaces, and block refs are chosen by content › The digest ignores order and fills defaults, fixtu

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-9e03eeea (tool-registry › The surface digest is canonical, fixtureSurface builds fixture surfaces, and block refs are chosen by content › The digest ignores order and fills defaults, fixtureSurface matches the catalogue, and refs take the lowest fitting major)

### Context
Criterion C-9e03eeea (tool-registry › The surface digest is canonical, fixtureSurface builds fixture surfaces, and block refs are chosen by content › The digest ignores order and fills defaults, fixtureSurface matches the catalogue, and refs take the lowest fitting major) is needs human after round 1.

Scenario:
\- **WHEN** `surfaceDigest` runs on the surfaces of test-plan.md § Digests, `fixtureSurface` on the five argument lists listed there, and `surfaceRefs("acme", …)` on the 11 rows of § Refs
\- **THEN** `surfaceDigest(SMALL)` is `sha256:244a8eeaac0eaa92b0f9f37583383b828cfd1f4aaa3028ab7052e0d013ef2c0c`, its reordered and explicit-defaults forms give the same, and its eleven one-field variants and one-tool form give 12 digests differing from it and each other; `fixtureSurface` results equal the values of § Digests (`D_A`, `D_A_DEFAULT`, the tool names of the four-ref call) and the unknown ref and duplicate name throw `unknown test block nope.x@1` and `duplicate tool name get`; each `surfaceRefs` result deep-equals its row; `test/support/README.md` has exactly the one `tool-surface.ts` line of § Digests

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.tools.refs.test.ts::C-9e03eeea: surfaceRefs gives major 1 when nothing is taken or the same content holds it (passed, red_assertion); src.tools.refs.test.ts::C-9e03eeea: surfaceRefs skips a major held with other content (passed, red_assertion); src.tools.refs.test.ts::C-9e03eeea: surfaceRefs takes the lowest free major and ignores other servers (passed, red_assertion); src.tools.refs.test.ts::C-9e03eeea: surfaceRefs tells a changed tool block from the same one by its hash (passed, red_assertion); src.tools.surface.test.ts::C-9e03eeea: SMALL digest ignores tool order and explicit defaults (passed, red_assertion); src.tools.surface.test.ts::C-9e03eeea: each one-field variant and the one-tool form has a distinct digest (passed, red_assertion); test.support.tool-surface.test.ts::C-9e03eeea: fixtureSurface builds the two erp surfaces as D_A and D_A_DEFAULT (passed, red_assertion); test.support.tool-surface.test.ts::C-9e03eeea: fixtureSurface names the four-ref tools and posts to their catalogue paths (passed, red_assertion); test.support.tool-surface.test.ts::C-9e03eeea: fixtureSurface refuses an unknown ref and a duplicate tool name (passed, red_assertion); test.support.tool-surface.test.ts::C-9e03eeea: the support README names tool-surface.ts exactly once (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The surface tests assert the SMALL digest, that its reordered and explicit-defaults forms give the same digest, and that the eleven one-field variants and the one-tool form give twelve digests distinct from it and each other. The support tests assert fixtureSurface yields D_A and D_A_DEFAULT, the four-ref names, effects and paths, the two error messages, and that the README holds the tool-surface row exactly once. The refs tests cover all 11 rows of § Refs. The implementation matches design.md: canonicalize over name-sorted tools with defaults filled, lowest major whose ref is free or held with the same content hash, and no database read.
---

## Q-005: Criterion C-d0c13cf0 (tool-registry › Registering a server stores it pending with its first surface › Register stores a pending server and refuses what is invalid, taken or foreign): accept as satisfi

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-d0c13cf0 (tool-registry › Registering a server stores it pending with its first surface › Register stores a pending server and refuses what is invalid, taken or foreign)

### Context
Criterion C-d0c13cf0 (tool-registry › Registering a server stores it pending with its first surface › Register stores a pending server and refuses what is invalid, taken or foreign) is needs human after round 1.

Scenario:
\- **WHEN** `registerToolServer` registers `acme` (`SURF_A`) as ALICE, again, then the 6 inputs and 16 surfaces of test-plan.md § Register rows, then `loc` and `beta`; `registerToolServerTx` runs in a transaction opened for `T_B` with context `T_A`; `getToolServer` and `listToolServers` read as `T_A` and `T_B`
\- **THEN** the first call returns `REC_PENDING`; `beta` (origin `HTTPS://Tools.Fake.Test:443`) is returned and stored as `https://tools.fake.test`; the second throws `TOOLS_EXISTS` `{ id: "acme" }` and each row throws its listed code and `details`; the foreign transaction throws `TOOLS_TENANT_MISMATCH` and writes nothing; `getToolServer` of `nope` and of `acme` as `T_B` is `null`; the list of `T_A` is `["acme", "beta", "loc"]`, of `T_B` `[]`; the tables hold 3 servers and 3 surfaces and the audit 3 `tools.server_registered` events

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.tools.store.test.ts::C-d0c13cf0: registerToolServer refuses invalid inputs and surfaces with their field and reason (passed, red_assertion); src.tools.store.test.ts::C-d0c13cf0: registerToolServer stores a pending server with its first surface (passed, red_assertion); src.tools.store.test.ts::C-d0c13cf0: registerToolServerTx refuses a transaction of another tenant and writes nothing (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The store tests register acme as ALICE and deep-equal REC_PENDING, repeat it for TOOLS_EXISTS with id acme, run the 6 inputs and 16 surfaces of § Register rows with their field and reason, register loc and beta and check beta's origin is normalised both in the record and in the stored row, run registerToolServerTx in a tenant_b transaction with the tenant_a context for TOOLS_TENANT_MISMATCH with nothing written, read nope and the foreign tenant as null, list [acme, beta, loc] and [], and count 3 servers, 3 surfaces and 3 tools.server_registered events. The code checks the tenant, then id, adapter, origin and surface in that order and stores the validated origin.
---

## Q-006: Criterion C-59cbd279 (tool-registry › Approval needs another admin in a team and an explicit, audited self-approval when solo › A team refuses the submitter, a solo tenant needs the flag, and every re

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-59cbd279 (tool-registry › Approval needs another admin in a team and an explicit, audited self-approval when solo › A team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing)

### Context
Criterion C-59cbd279 (tool-registry › Approval needs another admin in a team and an explicit, audited self-approval when solo › A team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing) is needs human after round 1.

Scenario:
\- **WHEN** `acme` and `beta` are registered by ALICE and `approveSurface` runs the calls of test-plan.md § Approval calls in order
\- **THEN** the first four calls throw `approver_is_submitter`, `digest_mismatch`, `self_approval_required` and `TOOLS_NOT_FOUND` `{ id: "nope" }`, after which `block_version` holds no `acme.*` or `beta.*` row and the audit no `tools.surface_*` event; ALICE's flagged approval makes `beta` `approved` with `self_approved` true and the event `tools.surface_self_approved`; DAVE's returns `REC_APPROVED_A` with blocks `["acme.create_payment@1", "acme.lookup_vendor@1"]`, `self_approved` false and the event `tools.surface_approved`; a repeat throws `nothing_pending`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.tools.approve.test.ts::C-59cbd279: a team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-007: Criterion C-6d84e4c8 (tool-registry › Approval writes immutable bound block versions and a failure between its two steps leaves them inert › Approval imports bound blocks, and a repeat completes after

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-6d84e4c8 (tool-registry › Approval writes immutable bound block versions and a failure between its two steps leaves them inert › Approval imports bound blocks, and a repeat completes after a failed second step)

### Context
Criterion C-6d84e4c8 (tool-registry › Approval writes immutable bound block versions and a failure between its two steps leaves them inert › Approval imports bound blocks, and a repeat completes after a failed second step) is needs human after round 1.

Scenario:
\- **WHEN** the 20 test blocks are imported unbound into `T_A`, DAVE approves `acme` in a team, then `gamma` (`SURF_ONE`) is approved through a pool whose client rejects the statement `UPDATE ursitoare.tool_surface`, and again through the real pool
\- **THEN** `block_version` holds 22 rows after `acme` and 25 at the end (`gamma`, the rival `delta` and `zeta` add one each): `acme.lookup_vendor@1` has binding `{ server: "acme", tool: "lookup_vendor" }`, `imported_by` `u_dave`, hash `H_LV_F`, `acme.create_payment@1` hash `H_PAY`, and the 20 originals keep binding null and their hashes; the failed call rejects with the injected error, `gamma` is `pending` with its block already stored; the repeat returns `approved` and writes no second `registry.block_imported` event for that ref; `delta`, approved through a pool that, before its client's first statement naming `ursitoare:block_import:`, imports `delta.lookup_vendor@1` with another definition through the owner pool, rejects with `TOOLS_REFUSED` `{ reason: "ref_conflict" }` and stays `pending`; `zeta`, approved through a pool that, before its first statement matching `ursitoare.tool_server` and `FOR UPDATE`, inserts `SURF_ONE_T` as a newer surface through the owner pool, rejects with `TOOLS_REFUSED` `{ reason: "digest_mismatch" }` and stays `pending` on `D_ONE_T` (row `zeta` of test-plan.md); the `resolve` results of `gamma` and `zeta` are the directory scenario's

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.tools.approve.test.ts::C-6d84e4c8: approval imports bound blocks, and a repeat completes after a failed second step (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-008: Criterion C-0955b490 (tool-registry › A changed surface disables the server until its new digest is approved › A submitted surface drifts an approved server and re-approval restores it): accept as sat

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-0955b490 (tool-registry › A changed surface disables the server until its new digest is approved › A submitted surface drifts an approved server and re-approval restores it)

### Context
Criterion C-0955b490 (tool-registry › A changed surface disables the server until its new digest is approved › A submitted surface drifts an approved server and re-approval restores it) is needs human after round 1.

Scenario:
\- **WHEN** `acme` is approved on `SURF_A` and `beta` on `SURF_ONE` (ALICE, solo, flagged), `gamma` is registered; DAVE submits, advancing `CLOCK` by 1000 ms before each, the six surfaces of test-plan.md § Submit calls for `acme`, then `SURF_ONE_T` for `beta` and for `gamma`; CAROL approves `D_B` in a team; `SURF_A` is submitted again
\- **THEN** the six calls return `REC_APPROVED_A`, `REC_DRIFTED` three times, then throw `TOOLS_INVALID` `method_without_body` and `TOOLS_NOT_FOUND` `{ id: "nope" }`; `beta` is `drifted` and `gamma` `pending`, both with `pendingDigest` `D_ONE_T`, `gamma` with `approvedDigest` null; the three `tools.surface_submitted` payloads are `{ digest: D_B, drift: true }`, `{ digest: D_ONE_T, drift: true }`, `{ digest: D_ONE_T, drift: false }`; CAROL's approval returns `REC_APPROVED_B` with blocks `["acme.create_payment@1", "acme.lookup_vendor@2"]`; the last call throws `TOOLS_REFUSED` `{ reason: "surface_known" }`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.tools.submit.test.ts::C-0955b490: a submitted surface drifts an approved server and re-approval restores it (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-009: Criterion C-c3474bfc (tool-registry › The directory resolves a ref only to the approved definition of a bound tool › The directory answers an approved tool, a drifted one with its state, and null for 

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-c3474bfc (tool-registry › The directory resolves a ref only to the approved definition of a bound tool › The directory answers an approved tool, a drifted one with its state, and null for everything else)

### Context
Criterion C-c3474bfc (tool-registry › The directory resolves a ref only to the approved definition of a bound tool › The directory answers an approved tool, a drifted one with its state, and null for everything else) is needs human after round 1.

Scenario:
\- **WHEN** `resolve` runs for the rows of test-plan.md § Directory rows, each after the step it names, and on a pool whose `connect` rejects `db down`
\- **THEN** each result deep-equals its row (`acme.lookup_vendor@1` is `null` once `D_B` is approved; unbound, unknown, foreign-prefix and malformed-binding refs, the ref for `T_B` and the refs of `gamma` and `zeta` while pending are `null`); the failing pool rejects with message `db down`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.tools.directory.test.ts::C-c3474bfc: a database failure rejects instead of answering null (passed, red_assertion); src.tools.directory.test.ts::C-c3474bfc: blocks stored by a failed or raced approval stay inert (passed, red_assertion); src.tools.directory.test.ts::C-c3474bfc: the directory answers an approved tool, a drifted one with its state, and null for everything else (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-010: Criterion C-95f2b798 (tool-registry › Tenant admins may register tool servers and approve surfaces › Only tenant admins of the tenant hold the two actions): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-95f2b798 (tool-registry › Tenant admins may register tool servers and approve surfaces › Only tenant admins of the tenant hold the two actions)

### Context
Criterion C-95f2b798 (tool-registry › Tenant admins may register tool servers and approve surfaces › Only tenant admins of the tenant hold the two actions) is needs human after round 1.

Scenario:
\- **WHEN** an engine over copies of `identity/policy/roles.cedar` and `tools/policy/tools.cedar` runs `allowedActions` for carol (`tenant_admin`), alice (`author`), bob (`approver`), ada (`auditor`) and mallory (`tenant_admin` of `tenant_b`) and `check` for both actions on `tenant_a`; an engine over `defaultSrcDir()` lists its policy ids
\- **THEN** carol's capabilities are `["approve_tool_surface", "manage_tenant", "manage_users_roles", "read_audit", "read_self", "register_tool_server"]`, alice's and bob's `["read_self"]`, ada's `["read_audit", "read_self"]`; both checks allow carol (reasons `tools-register-admin` and `tools-approve-admin`), deny alice, bob and ada, and deny mallory with reason `platform-cross-tenant-forbid`; the ids starting `tools-` are `["tools-approve-admin", "tools-register-admin"]`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.tools.policy.test.ts::C-95f2b798 only tenant admins of the tenant hold the two actions (passed, red_assertion); src.tools.policy.test.ts::C-95f2b798 the default sources hold exactly the two tool permits (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-011: Criterion C-0ab1d0b5 (tool-registry › The routes register, list, read, submit and approve for tenant admins only › Carol registers and reads, alice is refused and tenant_b sees nothing): accept as sat

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-0ab1d0b5 (tool-registry › The routes register, list, read, submit and approve for tenant admins only › Carol registers and reads, alice is refused and tenant_b sees nothing)

### Context
Criterion C-0ab1d0b5 (tool-registry › The routes register, list, read, submit and approve for tenant admins only › Carol registers and reads, alice is refused and tenant_b sees nothing) is needs human after round 1.

Scenario:
\- **WHEN** with real fragments, carol (`tenant_admin`), alice (`author`) and mallory (`tenant_admin` of `tenant_b`), the requests of test-plan-routes.md § Route rows (register, read, `local`) and § Malformed rows run
\- **THEN** each request answers its row (§ Route rows, § Malformed rows); the audit holds 3 `tools.server_registered` events, each with actor kind `user` and carol's user id

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.tool-server-routes.test.ts::C-0ab1d0b5 carol registers and reads while alice is refused and tenant_b sees nothing (passed, red_assertion); src.api.tool-server-routes.test.ts::C-0ab1d0b5 malformed requests are 400 with the field of the rule (passed, red_assertion); src.api.tool-server-routes.test.ts::C-0ab1d0b5 the local flag widens the origin check and the audit names carol (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-012: Criterion C-29de3844 (tool-registry › The routes register, list, read, submit and approve for tenant admins only › Approval over HTTP follows the tenant's profile and the approved blocks show as bound

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-29de3844 (tool-registry › The routes register, list, read, submit and approve for tenant admins only › Approval over HTTP follows the tenant's profile and the approved blocks show as bound)

### Context
Criterion C-29de3844 (tool-registry › The routes register, list, read, submit and approve for tenant admins only › Approval over HTTP follows the tenant's profile and the approved blocks show as bound) is needs human after round 1.

Scenario:
\- **WHEN** carol registered `acme` and `beta`, the registry holds the 20 unbound test blocks, and the approve, `PUT` and blocks requests of test-plan-routes.md § Route rows run, the tenant set to `team` and back to `solo`
\- **THEN** each request answers its row (team: carol 422 `approver_is_submitter`, alice 403, dave 200; solo: carol 422 `self_approval_required`, flagged 200, repeated 422 `nothing_pending`); the blocks list shows the three tool refs `bound` true and the 20 test refs `bound` false

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.tool-server-routes.test.ts::C-29de3844 approval follows the review profile and the approved blocks show as bound (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-013: Criterion C-4114528c (tool-registry › The routes register, list, read, submit and approve for tenant admins only › A null pool or engine key answers as the block routes do): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-4114528c (tool-registry › The routes register, list, read, submit and approve for tenant admins only › A null pool or engine key answers as the block routes do)

### Context
Criterion C-4114528c (tool-registry › The routes register, list, read, submit and approve for tenant admins only › A null pool or engine key answers as the block routes do) is needs human after round 1.

Scenario:
\- **WHEN** `registerToolServerRoutes` is called with `pool: null` under a PEP with and without a pool, then with the real pool and `engineKey: null`, and the requests of test-plan-routes.md § Null dependency rows run
\- **THEN** no call throws and each request answers its row (503 `AUTHZ_UNAVAILABLE` `Authorization is unavailable` under a null PEP pool or, for carol's post, a null deps pool; 503 `ENGINE_KEY_REQUIRED` for a `cursor` or a further page without a key; 200 otherwise)

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.tool-server-routes.test.ts::C-4114528c a null PEP pool answers every route 503 before validation (passed, red_assertion); src.api.tool-server-routes.test.ts::C-4114528c a null deps pool is 503 for carol and 403 for alice (passed, red_assertion); src.api.tool-server-routes.test.ts::C-4114528c a null engine key refuses paging only (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-014: Criterion C-0bfb5dc5 (tool-registry › The committed OpenAPI document lists the tool-server routes › The committed document holds the five operations with their actions): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-0bfb5dc5 (tool-registry › The committed OpenAPI document lists the tool-server routes › The committed document holds the five operations with their actions)

### Context
Criterion C-0bfb5dc5 (tool-registry › The committed OpenAPI document lists the tool-server routes › The committed document holds the five operations with their actions) is needs human after round 1.

Scenario:
\- **WHEN** `docs/api/openapi.json` is read
\- **THEN** its `paths` hold the four paths and five operation ids of test-plan-routes.md § OpenAPI rows; every `x-ursitoare-action` is `register_tool_server` except `approve_tool_surface` on the approve operation, whose `x-ursitoare-errors` include `OPERATION_REFUSED`, `FORBIDDEN` and `NOT_FOUND`; the body schema of `post_api_v1_tool_servers` has `additionalProperties` false, `required` `id`, `adapter`, `origin`, `surface` and `local` of type `boolean`; `src/main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves` stays green

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.main.tools.test.ts::C-0bfb5dc5 the committed OpenAPI document holds the five tool server operations with their actions (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-015: Hold H-332bbcee: the judge's reply was discarded (part 2 of 2, timeout: no answer within 600s)

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: the judge's reply was discarded (part 2 of 2, timeout: no answer within 600s)

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
