# Questions — add-tool-adapters

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
| Q-001 | accepted | 2.2 | technical | src/tools/adapter-submit.db.test.ts:134 compares JSON text of a jsonb payload |
| Q-002 | open | none | verdict | Criterion C-f287b385 (tool-invocation › Authorization is recorded before anything is sent › A granted read is authorised): accept as satisfied? |
| Q-003 | open | none | verdict | Criterion C-8b5cbc41 (tool-invocation › Authorization is recorded before anything is sent › Policy errors and an unrecorded decision deny with fixed reasons): accept as satisfied? |
| Q-004 | open | none | verdict | Criterion C-c28f570f (tool-invocation › A refusal before the policy point records and sends nothing › Each refusal reason, in order): accept as satisfied? |
| Q-005 | open | none | verdict | Criterion C-17a3e8b7 (tool-invocation › invoke sends only what was authorised › A call through the fakes, and each failure): accept as satisfied? |
<!-- l4:index:end -->

---

## Q-001: src/tools/adapter-submit.db.test.ts:134 compares JSON text of a jsonb payload

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.2
- **Kind:** technical
- **Asked:** 2026-11-21T21:06Z by claude-sonnet, run r-20261121T2043Z-ef00, task 2.2

### Context
The test asserts `JSON.stringify(p) === JSON.stringify({ digest: dC, drift: true })` on rows read from audit_event.payload, which is jsonb. Postgres orders jsonb keys by length then bytes, so `drift` comes before `digest` and the strings differ whatever the code does. The spec only requires the event payload `{ digest, drift }`.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/adapter-submit.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-tool-adapters`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/tools/adapter-submit.db.test.ts`: at line 134 compare with `assert.deepEqual` (for example `assert.ok((await submitted(...)).some((p) => isDeepStrictEqual(p, { digest: dC, drift: true })))`) instead of `JSON.stringify` text

### Clarifier suggestion
Edit `src/tools/adapter-submit.db.test.ts`: at line 134 compare with `assert.deepEqual` (for example `assert.ok((await submitted(...)).some((p) => isDeepStrictEqual(p, { digest: dC, drift: true })))`) instead of `JSON.stringify` text

### Answer
<!-- write below this line -->

---

## Q-002: Criterion C-f287b385 (tool-invocation › Authorization is recorded before anything is sent › A granted read is authorised): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-f287b385 (tool-invocation › Authorization is recorded before anything is sent › A granted read is authorised)

### Context
Criterion C-f287b385 (tool-invocation › Authorization is recorded before anything is sent › A granted read is authorised) is needs human after round 1.

Scenario:
\- **WHEN** with the harness of the base `test-plan-runs.md` and only `G_LOOKUP` deployed, `authorize` runs for `LOOKUP` (run `r_1`, node `lookup`, taint `[]`) on the `liveInvoker` of the live run `r_1` that `h.start` made
\- **THEN** it answers the permit of V1 (`{ POST, tools.fake.test, /blocks/erp.lookup_vendor@1, D_LV, S, 60 }`, `isIssuedPermit` true) and `r_1` has one row: action `invoke_tool`, principal `User::"tenant_a/alice"`, resource `Block::"tenant_a/read-then-pay/lookup"`, node `lookup`, `allow`, reasons `[G_LOOKUP.id]`, that permit; the gateway has 0 calls and `effect_intent` 0 rows

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: src.runtimes.invoke.authorize.db.test.ts::C-f287b385 a granted read is authorised (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-003: Criterion C-8b5cbc41 (tool-invocation › Authorization is recorded before anything is sent › Policy errors and an unrecorded decision deny with fixed reasons): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-8b5cbc41 (tool-invocation › Authorization is recorded before anything is sent › Policy errors and an unrecorded decision deny with fixed reasons)

### Context
Criterion C-8b5cbc41 (tool-invocation › Authorization is recorded before anything is sent › Policy errors and an unrecorded decision deny with fixed reasons) is needs human after round 1.

Scenario:
\- **WHEN** on one harness of the base `test-plan-runs.md` with only `G_LOOKUP` deployed, whose `policy` wrapper takes the answer of `check` from the row, `authorize` runs for `LOOKUP` with rows E1 to E5 and E7 of the base `test-plan.md` § Policy failure rows
\- **THEN** each row throws its `details` and leaves its decision rows (one for E1 to E3, none for E4 and E5, one for E7, the first call's); the gateway has 0 calls and `effect_intent` 0 rows; no error JSON contains `POLICY_SET_UNAVAILABLE`, `PDP_EVALUATION_ERROR` or `db down`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: src.runtimes.invoke.authorize.db.test.ts::C-8b5cbc41 policy errors and an unrecorded decision deny with fixed reasons (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-004: Criterion C-c28f570f (tool-invocation › A refusal before the policy point records and sends nothing › Each refusal reason, in order): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-c28f570f (tool-invocation › A refusal before the policy point records and sends nothing › Each refusal reason, in order)

### Context
Criterion C-c28f570f (tool-invocation › A refusal before the policy point records and sends nothing › Each refusal reason, in order) is needs human after round 1.

Scenario:
\- **WHEN** `authorize` runs with the doubles of the base `test-plan.md` § Refusal rows R1 to R11, R13 and R14, and R12 and R15 on the harness of the base `test-plan-runs.md`
\- **THEN** R1 to R10, R13 and R14 throw the message and `details` of their rows (R10, a hook call, adds `hook: "pay:post:notify"`) with `node` the call's node and no `decisionId`; R11 throws `INTERPRETER_TOOL_FAILED` `{ stage: "authorize" }`; `policy.engine.check` has 1 call for R9 and 0 in the other rows that throw, the pool 1 connection attempt for R9 and 0 in the others, and the gateway 0 calls in every row; R12 and R15 give the results of their rows

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: src.runtimes.invoke.authorize.db.test.ts::C-c28f570f a dependency that rejects before the check is a failed call, row R11 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.authorize.db.test.ts::C-c28f570f each refusal reason in order, rows R1 to R10 R13 and R14 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.authorize.db.test.ts::C-c28f570f the approver of a rejected or null approval is not loaded, row R15 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.authorize.db.test.ts::C-c28f570f the initiator is loaded on each authorize and the version once, row R12 (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-005: Criterion C-17a3e8b7 (tool-invocation › invoke sends only what was authorised › A call through the fakes, and each failure): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-17a3e8b7 (tool-invocation › invoke sends only what was authorised › A call through the fakes, and each failure)

### Context
Criterion C-17a3e8b7 (tool-invocation › invoke sends only what was authorised › A call through the fakes, and each failure) is needs human after round 1.

Scenario:
\- **WHEN** after its own `authorize` for `LOOKUP` (one is consumed per `invoke`, so C7 and C8 each use a harness of their own) the rows C1 to C10 of the base `test-plan-runs.md` § Invoke rows run
\- **THEN** C1 answers `{ output: { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 } }`, the fake egress issued one token `{ serviceId: S, tenantId: mintkeyTenantId("tenant_a"), agentId: "ursitoare-engine", ttlSeconds: 60 }` and the fake tools hold one call with `callHeader` `r_1:lookup:1`, `host` `tools.fake.test`, `path` `/blocks/erp.lookup_vendor@1`, `bodySha256` `D_LV`; C2 to C8 throw the `details` of their rows (C4 with one request at the local upstream); C9 throws `unauthorized` twice with no new token; C10 answers once and then throws `unauthorized` with no second token; no error JSON and no captured log line contains `brokerServiceToken` or the C2 body text `injected_failure`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a granted read is sent as one brokered request, row C1 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a missing or copied authorization is unauthorized, row C9 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a redirect is not followed and a non JSON body fails, rows C4 to C6 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a rejected send fails at the send stage, row C8 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a rejected token request fails at the token stage, row C7 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 an authorization is consumed by its invoke, row C10 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 an upstream status other than 2xx fails the call, rows C2 and C3 (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
