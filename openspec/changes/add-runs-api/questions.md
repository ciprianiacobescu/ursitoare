# Questions — add-runs-api

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
| Q-001 | accepted | 2.1 | technical | src/runs/policy.test.ts:89: ERIN userId does not match the run initiator |
| Q-002 | open | none | verdict | Criterion C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan): accept as satisfied? |
| Q-003 | open | none | verdict | Criterion C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass): accept as satisfied? |
<!-- l4:index:end -->

---

## Q-001: src/runs/policy.test.ts:89: ERIN userId does not match the run initiator

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-11-05T05:43Z by deepseek-free, run r-20261105T0521Z-fb85, task 2.1

### Context
The test builds the run with initiator entityRef("User", "tenant_a/u_erin") at line 51 and expects erin to be allowed read_run via the initiator, but ERIN is principalWith("tenant_a", "erin", ["author"], ["ops"]) at line 89, so userEntity yields tenant_a/erin. Design Decision 10 and the requirement use principal == resource.initiator, which therefore denies (observed 'deny' !== 'allow'). The spec scenario names the initiator u_erin and the principal erin, which cannot both hold under UID equality. Which side should the frozen test correct?

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/runs/policy.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-runs-api`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/runs/policy.test.ts`: change line 89 to `const ERIN = principalWith("tenant_a", "u_erin", ["author"], ["ops"]);` and change line 108 to `u_erin: "allow",`.
2. Edit `src/runs/policy.test.ts`: change line 51 to `initiator: entityRef("User", "tenant_a/erin"),`.

### Clarifier suggestion
Edit `src/runs/policy.test.ts`: change line 89 to `const ERIN = principalWith("tenant_a", "u_erin", ["author"], ["ops"]);` and change line 108 to `u_erin: "allow",`.

### Answer
<!-- write below this line -->

---

## Q-002: Criterion C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan)

### Context
Criterion C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan) is needs human after round 1.

Scenario:
\- **WHEN** `checkApiErrorCodes` runs on a snapshot whose `src/x/a.ts` has `throw new ApiError(409, "FLOW_EXISTS", "x")` on line 3, with the registered list `["NOT_FOUND"]`
\- **THEN** it returns one violation with code `ARCH_API_ERROR_CODE`, file `src/x/a.ts`, line 3, and a message that names `FLOW_EXISTS` and `src/api/error-codes.ts`

Why: the judge answered insufficient_evidence
Judge: insufficient_evidence
Tracing tests: test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan (passed, pass_to_pass)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-003: Criterion C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass)

### Context
Criterion C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass) is needs human after round 1.

Scenario:
\- **WHEN** a snapshot holds `new ApiError(404, "NOT_FOUND", "m")`, `new ApiError(500, code, "m")` and a `src/x/a.test.ts` with the literal `"FLOW_EXISTS"`
\- **THEN** `checkApiErrorCodes` returns `[]`, and also `[]` over `readSnapshot()` with the default registry

Why: the judge answered insufficient_evidence
Judge: insufficient_evidence
Tracing tests: test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan (passed, pass_to_pass)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
