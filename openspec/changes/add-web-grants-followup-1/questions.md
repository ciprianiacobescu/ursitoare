# Questions — add-web-grants-followup-1

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
| Q-001 | answered | none | verdict | Criterion C-44e0e2c0 (web-tools › Server list keeps the old state after approve, replace or discovery — feedback FB-002 › Server list keeps the old state after approve, replace or discovery): accept a |
| Q-002 | open | none | verdict | Criterion C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages): accept as satisfied? |
| Q-003 | open | none | verdict | Hold H-ca42fb4d: UI criterion C-debfaec1 has no end-to-end test; see the generated UI tests table |
| Q-004 | open | none | verdict | Hold H-e57e62e0: UI criterion C-464ddcf9 has no end-to-end test; see the generated UI tests table |
| Q-005 | open | none | verdict | Hold H-cb78452d: UI criterion C-4f5443ee has no end-to-end test; see the generated UI tests table |
| Q-006 | open | none | verdict | Hold H-966b3c99: UI criterion C-228ef9c6 has no end-to-end test; see the generated UI tests table |
| Q-007 | open | none | verdict | Hold H-43d41b0f: UI criterion C-35974302 has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-ec30fde7: UI criterion C-4c2144fe has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-95489d0f: UI criterion C-78ea404d has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-d38f4f7c: UI criterion C-985ca634 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-3848153d: UI criterion C-ba990588 has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-7723363f: UI criterion C-a7f551fc has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-44e0e2c0 (web-tools › Server list keeps the old state after approve, replace or discovery — feedback FB-002 › Server list keeps the old state after approve, replace or discovery): accept a

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-44e0e2c0 (web-tools › Server list keeps the old state after approve, replace or discovery — feedback FB-002 › Server list keeps the old state after approve, replace or discovery)

### Context
Criterion C-44e0e2c0 (web-tools › Server list keeps the old state after approve, replace or discovery — feedback FB-002 › Server list keeps the old state after approve, replace or discovery) is needs human after round 1.

Scenario:
\- **WHEN** an admin approves a pending or drifted surface, replaces a server's document, or discovers its tools again on the tool servers page
\- **THEN** the server list on the same page is loaded again and the server's row shows its new state (for example approved), as the Surface card does, without reloading the page

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.tools.servers-list-reload.test.ts::C-44e0e2c0 the server list is rebuilt on reload after approve replace and discovery (passed, red_assertion, inadequate)
Ignored tests: test_server_list_reload::test_approving_a_drifted_surface_reloads_the_server_list[chromium] (no proof that it discriminates (no red, audit or generated record)); test_server_list_reload::test_approving_a_surface_reloads_the_server_list[chromium] (no proof that it discriminates (no red, audit or generated record)); test_server_list_reload::test_discovering_tools_again_reloads_the_server_list[chromium] (no proof that it discriminates (no red, audit or generated record)); test_server_list_reload::test_replacing_a_document_reloads_the_server_list[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept Evidence (delegate, 2026-11-25): e2e/test_server_list_reload.py's four browser tests ran through the CI e2e build and stack in a node:24 container. At this unit's head 5ff290b3 they passed 4/4 in each of three runs. At base 35a0d283, with only the test file added, they failed 4/4, each at its first row assertion: the Tool servers row kept its old state (pending, drifted, approved, approved) after approve, approve drifted, replace and discover again. A head screenshot after approving shows the row and the Surface card both reading approved.
---

## Q-002: Criterion C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages)

### Context
Criterion C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages) is needs human after round 1.

Scenario:
\- **WHEN** the calls of test-plan.md § Calls (`loadToolServer(get, "acme")`, `postGrant(post, <u_bob draft>, "k-1")`, `deployPolicy(post, SRC, "k-1")` and the others) run against a recording fake
\- **THEN** the records are the plan's eight; `loadToolRefs` returns the two bound refs over two requests and, for a cursor that is never null, makes 10 requests and resolves `acme.t1@1` to `acme.t10@1`; results, `RangeError`s and `INVALID_RESPONSE` rejections are the plan's

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: web.src.tools.calls.test.ts::C-78ea404d approveToolSurface posts the digest and reads the server (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d approveToolSurface refuses an answer without a server and a bad id (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d confirmGrantById posts an empty body and resolves with nothing (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d deployPolicy posts the source under the key and returns the version (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d loadPolicy gets the view and refuses an unreadable answer (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d loadToolRefs refuses an unreadable item (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d loadToolRefs returns the bound refs over two requests (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d loadToolRefs stops after ten pages without failing (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d loadToolServer gets the server and reads the view (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d loadToolServer passes the signal and refuses what it cannot read (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d postGrant posts the body under the key and returns the id (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d postGrant refuses a bad draft, a blank key and unreadable answers (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d revokeGrantById deletes the grant and resolves with nothing (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d validatePolicy posts the source and returns ok and problems (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-003: Hold H-ca42fb4d: UI criterion C-debfaec1 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-debfaec1 has no end-to-end test; see the generated UI tests table

Step 5 for C-debfaec1: not_testable after 1 attempt(s); Criterion is about pure functions (parseToolServer, serverRowText, toolRows, stateNote) with fixed fixtures from a test plan; not reachable through the browser UI, so a unit test fits, not e2e..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-004: Hold H-e57e62e0: UI criterion C-464ddcf9 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-464ddcf9 has no end-to-end test; see the generated UI tests table

Step 5 for C-464ddcf9: not_testable after 1 attempt(s); The criterion specifies a pure function (approvalView) over a table of rows in test-plan.md; it exposes no browser-observable behaviour that an e2e test can drive, so it's covered by unit tests..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-005: Hold H-cb78452d: UI criterion C-4f5443ee has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-4f5443ee has no end-to-end test; see the generated UI tests table

Step 5 for C-4f5443ee: not_testable after 1 attempt(s); Criterion concerns pure functions (approveRequest, approveDialog, approveFailure, toolsErrorMessage) over test-plan rows; not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-006: Hold H-966b3c99: UI criterion C-228ef9c6 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-228ef9c6 has no end-to-end test; see the generated UI tests table

Step 5 for C-228ef9c6: not_testable after 1 attempt(s); Criterion concerns pure functions (parseGrant, grantRowText, grantActions, GRANT_DONE) tested by unit tests; no browser-observable behavior or public UI path to exercise them..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-007: Hold H-43d41b0f: UI criterion C-35974302 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-35974302 has no end-to-end test; see the generated UI tests table

Step 5 for C-35974302: not_testable after 1 attempt(s); grantBody is a pure function over a test-plan table with no UI the browser can reach; it is covered by unit tests, not an e2e flow..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-ec30fde7: UI criterion C-4c2144fe has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-4c2144fe has no end-to-end test; see the generated UI tests table

Step 5 for C-4c2144fe: not_testable after 1 attempt(s); Criterion is about pure TypeScript model functions (regionState, actionState, approveControl) checked against a test-plan table; no browser-observable interface, so it belongs in unit tests, not e2e..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-95489d0f: UI criterion C-78ea404d has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-78ea404d has no end-to-end test; see the generated UI tests table

Step 5 for C-78ea404d: not_testable after 1 attempt(s); Criterion concerns pure client-library calls (routes, headers, recorded requests) run against a recording fake; no user-visible browser behaviour to check..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-d38f4f7c: UI criterion C-985ca634 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-985ca634 has no end-to-end test; see the generated UI tests table

Step 5 for C-985ca634: not_testable after 1 attempt(s); Pure-function unit behaviour (parsePolicyView, texts, checkPolicySource) on test-plan values; no user-visible browser flow is named, so e2e cannot check it..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-3848153d: UI criterion C-ba990588 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-ba990588 has no end-to-end test; see the generated UI tests table

Step 5 for C-ba990588: not_testable after 1 attempt(s); Criterion checks source files, CSS and unit-level helpers (dataTableModel, findRawColours) in a node test, not browser-observable behaviour..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-7723363f: UI criterion C-a7f551fc has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-a7f551fc has no end-to-end test; see the generated UI tests table

Step 5 for C-a7f551fc: not_testable after 1 attempt(s); Criterion checks source-file literals, a fresh registry and the visibleNav function directly (unit-level); no distinct browser-observable behavior is specified..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
