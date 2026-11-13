# Questions — add-web-dry-runs

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
| Q-001 | answered | 5.1 | harness | Task 5.1: the pre-satisfied check could not decide |
| Q-002 | answered | none | verdict | Criterion C-f78faba7 (web-runs › The run page lists the decisions of a finished stub run and confines their failure › Try again reads the decisions after a failure, and an empty page says so): accept |
| Q-003 | open | none | verdict | Criterion C-02d224b2 (web-runs › The M6 journey proves grants and the dry run in a browser › Carol approves and grants; alice's dry run is denied, then reads and stubs): accept as satisfied? |
| Q-004 | answered | none | verdict | Hold H-c3fca69f: UI criterion C-0ba641d3 has no end-to-end test; see the generated UI tests table |
| Q-005 | answered | none | verdict | Hold H-1eba1f05: UI criterion C-b51ecdbd has no end-to-end test; see the generated UI tests table |
| Q-006 | answered | none | verdict | Hold H-776d2026: UI criterion C-a0fe5421 has no end-to-end test; see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-4a3e3276: UI criterion C-320b7d94 has no end-to-end test; see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-bd785718: UI criterion C-0930141b has no end-to-end test; see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-9dca9db5: UI criterion C-0d1cacce has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-1406e643: UI criterion C-f78faba7 has no end-to-end test; see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-3c3b2517: UI criterion C-acb416e2 has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-b5dcea3b: UI criterion C-f665c2d6 has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-348b6970: UI criterion C-6d6e45b6 has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-53e5119d: UI criterion C-02d224b2 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Task 5.1: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.1
- **Kind:** harness
- **Asked:** 2026-11-13T04:09Z by claude-sonnet, run r-20261113T0322Z-b4b3, task 5.1
- **Criteria:** C-6d6e45b6 (web-runs › The grants flow works against the real engine › Carol approves and grants, alice is denied then reads and stubs)

### Context
L4 could not run the pre-satisfied check of task 5.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and test/journeys/m6-grants.test.ts is not a Python file; the base run: its new tests fail against the unit base code only by an error, not by assertion
Runs: test-base-run
Kept real: nothing
Tests: test.journeys.m6-grants.test.ts::C-6d6e45b6 alice and carol take acme from pending to a stubbed payment

Changes the replay applies (2 files):
    added e2e/test_m6_grants.py
    added test/journeys/m6-grants.test.ts

Source of the tests (redacted; at most 40 lines each):
test.journeys.m6-grants.test.ts::C-6d6e45b6 alice and carol take acme from pending to a stubbed payment:
    test("C-6d6e45b6 alice and carol take acme from pending to a stubbed payment", async () => {
      const current = running();
      const alice = await signedIn("alice");
      const carol = await signedIn("carol");
      const { fake } = egressApi(current.handles);
      const { tools } = toolsApi(current.handles);
    
      // /me issues a fresh CSRF token, so the tenant is read through a session of its own
      const state = await createCapabilityLoader(await signedIn("alice")).load();
      assert.ok(state.status === "ready");
      const tenantId = state.me.tenant.id;
      const svc = seedServiceId(tenantId, "acme");
    
      // 1. carol approves the seeded tool server
      const server = await loadToolServer(carol, "acme");
      assert.equal(server.state, "pending");
      assert.equal(server.origin, "https://tools.fake.test");
      assert.match(server.pendingDigest ?? "", /^sha256:[0-9a-f]{64}$/);
      assert.deepEqual(
        server.tools.map((t) => [t.name, t.effect, t.ref, t.untrusted_result, t.unsafe_to_retry, t.http]),
        [
          ["lookup_vendor", "read", null, false, false, { method: "POST", path: LOOKUP_PATH }],
          ["create_payment", "pay", null, false, false, { method: "POST", path: PAY_PATH }],
        ],
      );
      assert.deepEqual(
        toolRows(server).map((r) => [r.result, r.call]),
        [
          ["trusted", `POST ${LOOKUP_PATH}`],
          ["trusted", `POST ${PAY_PATH}`],
        ],
      );
      const approved = await approveToolSurface(carol, "acme", {
        digest: server.pendingDigest ?? "",
        selfApproval: false,
      });
      assert.equal(approved.state, "approved");
      assert.deepEqual(
        approved.tools.map((t) => t.ref),
        ["acme.lookup_vendor@1", "acme.create_payment@1"],
    [cut: 166 more lines]

Diff of e2e/test_m6_grants.py (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/e2e/test_m6_grants.py b/e2e/test_m6_grants.py
    new file mode 100644
    index 0000000..7cdb380
    --- /dev/null
    +++ b/e2e/test_m6_grants.py
    @@ -0,0 +1,219 @@
    +"""The M6 closing journey: carol approves and grants, alice's dry run is denied, then reads and stubs."""
    +
    +import json
    +import re
    +
    +import pytest
    +from playwright.sync_api import Browser, Page, expect
    +
    +from conftest import assert_accessible, login
    +
    +DEMO_GRANTS = "\n".join(
    +    [
    +        'ursitoare: "0.1"',
    +        "flow: demo-grants",
    +        "version: 1.0.0",
    +        "inputs:",
    +        "  type: object",
    +        "  properties: { vendor_name: { type: string }, amount: { type: number } }",
    +        "  required: [vendor_name, amount]",
    +        "start: lookup",
    +        "nodes:",
    +        '  lookup: { kind: block, uses: acme.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: pay }',
    +        "  pay:",
    +        "    kind: block",
    +        "    uses: acme.create_payment@1",
    +        '    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }',
    +        "    next: done",
    +        '  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }',
    +        "",
    +    ]
    +)
    +INPUT_TEXT = json.dumps({"vendor_name": "Acme GmbH", "amount": 12.5}, separators=(",", ":"))
    +FAKES_TEXT = json.dumps(
    +    {"pay": [{"output": {"payment_id": "P-1", "status": "created"}}]}, separators=(",", ":")
    [cut: 185 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-web-dry-runs/.l4/held/5.1-pre_satisfied.patch` on the unit branch]

Diff of test/journeys/m6-grants.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/test/journeys/m6-grants.test.ts b/test/journeys/m6-grants.test.ts
    new file mode 100644
    index 0000000..7232a8c
    --- /dev/null
    +++ b/test/journeys/m6-grants.test.ts
    @@ -0,0 +1,300 @@
    +import assert from "node:assert/strict";
    +import { after, before, test } from "node:test";
    +
    +import { seedServiceId } from "../../src/credentials/index.ts";
    +import { ApiRequestError } from "../../web/src/api/client.ts";
    +import type { ApiClient } from "../../web/src/api/client.ts";
    +import { postFlow } from "../../web/src/flows/flows.ts";
    +import { saveVersion, validateVersion } from "../../web/src/flows/versions.ts";
    +import { createCapabilityLoader } from "../../web/src/kit/capabilities.ts";
    +import { decisionRows, loadDecisions } from "../../web/src/runs/decisions.ts";
    +import { parseFakes, startDryRun } from "../../web/src/runs/dry-run.ts";
    +import { followRun } from "../../web/src/runs/polling.ts";
    +import type { RunSnapshot } from "../../web/src/runs/polling.ts";
    +import { loadPayload } from "../../web/src/runs/runs-source.ts";
    +import { stepDetailRows } from "../../web/src/runs/timeline.ts";
    +import { postGrant } from "../../web/src/tools/grants.ts";
    +import { deployPolicy, loadPolicy } from "../../web/src/tools/policies.ts";
    +import { approveToolSurface, loadToolServer, toolRows } from "../../web/src/tools/servers.ts";
    +import { egressApi } from "../support/e2e-stack/egress-part.ts";
    +import type { E2eStack } from "../support/e2e-stack/stack.ts";
    +import { startE2eStack } from "../support/e2e-stack/stack.ts";
    +import { toolsApi } from "../support/e2e-stack/tools-part.ts";
    +import { sessionClient, signInAs } from "./session.ts";
    +
    +const DEMO_GRANTS = [
    +  'ursitoare: "0.1"',
    +  "flow: demo-grants",
    +  "version: 1.0.0",
    +  "inputs:",
    +  "  type: object",
    +  "  properties: { vendor_name: { type: string }, amount: { type: number } }",
    +  "  required: [vendor_name, amount]",
    +  "start: lookup",
    +  "nodes:",
    [cut: 266 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-web-dry-runs/.l4/held/5.1-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 2 files (the whole patch is in `openspec/changes/add-web-dry-runs/.l4/held/5.1-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: Count the journey on the evidence of the real run. The pre-satisfied check cannot discriminate here by design: tasks.md plans task 5.1 as green on arrival, with the e2e stack as its proof, and against the unit base code the journey can only fail with a stub's not-implemented error, because the proposal's scaffold puts signature stubs for startDryRun, parseFakes, loadDecisions and decisionRows on the base branch, and AGENTS.md says L4 does not count such an error. The browser journey is Python, which the Node gate never runs, so the zero-value run cannot speak to it either. The Node test asserts the whole scenario of the requirement "The grants flow works against the real engine": the four stack handles, carol's 403 FORBIDDEN, run 1 failed with INTERPRETER_TOOL_DENIED at lookup and the one decision lookup · deny with no token, request or tool call, run 2 completed at done through lookup, pay and done with the two decision texts, one fake call to erp.lookup_vendor@1 with the call header, none for create_payment, one issued token for seedServiceId(tenant, "acme") with TTL 60 and one forwarded request equal to lookup's permit. Every symbol it imports exists in the head with the members it uses, including egressApi, toolsApi, the tool-servers part, seedServiceId from the credentials barrel and the grants, policies and servers helpers, and the Python journey uses only fixtures that e2e/conftest.py defines and the markers earlier journeys use. The lint error of the gate excerpt (a control-character regex in decisions.ts) is not in the current file, which checks control characters by char code, so the replay's lint gate should pass; if any gate still fails, the replay fails the attempt and the accept is used up, which is the right safeguard.

---

## Q-002: Criterion C-f78faba7 (web-runs › The run page lists the decisions of a finished stub run and confines their failure › Try again reads the decisions after a failure, and an empty page says so): accept 

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-f78faba7 (web-runs › The run page lists the decisions of a finished stub run and confines their failure › Try again reads the decisions after a failure, and an empty page says so)

### Context
Criterion C-f78faba7 (web-runs › The run page lists the decisions of a finished stub run and confines their failure › Try again reads the decisions after a failure, and an empty page says so) is needs human after round 1.

Scenario:
\- **WHEN** alice opens `/runs/run_1` (`RUN` of test-plan.md: mode `stub`, state `completed`, no steps) and `GET /runs/run_1/decisions` answers 500 `INTERNAL`, then `{ items: [D2, D3], next_cursor: null }`, then `{ items: [], next_cursor: null }`; she presses "Try again" in the region "Policy decisions" and then reloads the page (test-plan-browser.md)
\- **THEN** the region first holds the paragraph "The engine hit an unexpected problem. Try again, and tell an administrator if it keeps happening." and the button "Try again", the page has no list named "Policy decisions" and no alert, "State: completed" and "Timeline" stay, and the route was hit once; after "Try again" the list has two items, `lookup · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1` and `pay · allow · POST tools.fake.test/blocks/erp.create_payment@1`, the button is gone and the route was hit twice; after the reload the region holds "No policy decisions were recorded.", no list and no button (third hit)

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6_run_decisions::test_decisions_try_again_reads_the_page[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion holds as it stands. The run page loads the decisions once the run is terminal and not a mock run, keyed on the run id, the terminal state and a retry count, so the first visit makes one request. A 500 INTERNAL answer becomes an ApiRequestError whose kit text is the expected engine paragraph, rendered as a plain paragraph followed by the only Try again button, with no alert and no list named Policy decisions, while State and Timeline stay. Try again sets the loading state and bumps the retry count, so the effect requests again, and the two decisions parse and render as the two expected texts with their details, the button gone. A reload makes the third request and an empty page gives the paragraph that no policy decisions were recorded, with no list and no button. The browser test in the repository asserts exactly these steps, counting the route hits, and the Node tests cover the section logic for every state.
---

## Q-003: Criterion C-02d224b2 (web-runs › The M6 journey proves grants and the dry run in a browser › Carol approves and grants; alice's dry run is denied, then reads and stubs): accept as satisfied?

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: the reply has 25 checked entries: the limit is 20
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-02d224b2 (web-runs › The M6 journey proves grants and the dry run in a browser › Carol approves and grants; alice's dry run is denied, then reads and stubs)

### Context
Criterion C-02d224b2 (web-runs › The M6 journey proves grants and the dry run in a browser › Carol approves and grants; alice's dry run is denied, then reads and stubs) is needs human after round 1.

Scenario:
\- **WHEN** steps 1 to 8 of test-plan.md § Browser journey run in two browser contexts (carol, alice)
\- **THEN** the values are those of the steps: the row `acme · https://tools.fake.test · pending` and the status "Surface approved."; run 1 `State: failed` with `INTERPRETER_TOOL_DENIED: tool call of "lookup" is not permitted (policy) (at lookup)` and the one item `lookup · deny`; the grant rows `role author · acme.lookup_vendor@1 · any step · active` and `role author · acme.create_payment@1 · demo-grants / pay · active`, then "Deployed version" and 12 hex digits; run 2 `State: completed` with the buttons `lookup`, `pay`, `done`, `V-ACME` in the Output of `lookup`, the items `lookup · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1` (no `stubbed`) and `pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1`, and a `Taint` row `none` under `done`; with the decisions answer rewritten, the paragraph "Policy decisions could not be read." and no list named "Policy decisions"; `assert_accessible(page)` passes on each page

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6_grants::test_alice_is_denied_then_reads_and_stubs[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-004: Hold H-c3fca69f: UI criterion C-0ba641d3 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-0ba641d3 has no end-to-end test; see the generated UI tests table

Step 5 for C-0ba641d3: not_testable after 1 attempt(s); The criterion drives the internal dryRunPanelView function with capability Set and version arguments; those inputs are not parameters of any navigable public page, and the snapshot gives no authenticated flow-editor surface or backend setup to place a user in those capability/version states, so t....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. The criterion's scenario calls dryRunPanelView with capability sets and version objects and compares return values, and checks the DRY_RUN_PANEL constant; none of that is observable through a page, so no end-to-end test can trace it. The Node test of the criterion asserts every row of the scenario: not allowed without dry_run_flow, needs a version for no version and for a draft, ready for validated and tested, and the panel constant. The panel component renders from that function's result, and the browser journey checks the ready state's paragraph, example and form in a signed-in editor.
---

## Q-005: Hold H-1eba1f05: UI criterion C-b51ecdbd has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-b51ecdbd has no end-to-end test; see the generated UI tests table

Step 5 for C-b51ecdbd: not_testable after 1 attempt(s); parseFakes is an internal frontend function; its return-object shape, keys, and prototype chain are not observable through the web page UI, so this criterion cannot be checked end-to-end via the page fixture..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. The criterion's scenario feeds eleven texts to parseFakes and compares result objects, including the own keys, the prototype of the result and that lists are copies; none of that is observable through a page. The Node tests of the criterion assert every row: the valid texts with the a/b key and the __proto__ key as an own key on an object with Object.prototype, each refusal message, and that two parses give distinct list copies. The function trims, parses, refuses non-objects and non-list values with the spec's messages and defines each key as an own property with a copied list.
---

## Q-006: Hold H-776d2026: UI criterion C-a0fe5421 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-a0fe5421 has no end-to-end test; see the generated UI tests table

Step 5 for C-a0fe5421: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_a0fe5421::test_starting_a_dry_run_shows_the_started_run[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. The criterion's scenario drives startDryRun with a recording client and dryRunFormErrors with eight errors, and compares the recorded request, the thrown errors and the form error maps; those are function values, not page states. The Node tests of the criterion assert all of it: the one recorded path, body and Idempotency-Key header and the returned run, the three RangeErrors with no request, the two INVALID_RESPONSE errors and the rethrown post error, and each of the eight error mappings. The start itself is proved in a browser by the repository's journey, where a signed-in author fills the panel, presses Start dry run and sees the status Started dry run and the Open run link. The harness's generated test failed at head because its tests take only the page fixture and sign nobody in, so it could not reach the editor.
---

## Q-007: Hold H-4a3e3276: UI criterion C-320b7d94 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-320b7d94 has no end-to-end test; see the generated UI tests table

Step 5 for C-320b7d94: not_testable after 1 attempt(s); parseDecisions and permitText are internal JavaScript functions; the criterion requires passing specific inputs (empty page and M1–M18 malformed values) and asserting return values/null, which is not observable through a stable public web interface and cannot be driven by browser navigation alone..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. The criterion's scenario feeds parseDecisions one page with extra members, an empty page and eighteen malformed values, and compares the returned arrays and nulls, and gives permitText one permit; these are function values that no page exposes. The Node tests of the criterion assert every row: the kept members with decidedAt, policySetVersion and bodyDigest dropped, the empty page, each of M1 to M18 giving null including the three control characters and the bracketed host, and the permit text. The parser checks each pattern of the requirement and refuses C0 and C1 control characters by char code, and the page rendering of parsed decisions is proved in a browser by the repository's journeys.
---

## Q-008: Hold H-bd785718: UI criterion C-0930141b has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-0930141b has no end-to-end test; see the generated UI tests table

Step 5 for C-0930141b: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_0930141b::test_policy_decisions_show_each_decision_as_one_row[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. The criterion's scenario runs decisionRows on seven decisions and two steps and then on four variants, and compares row texts and detail lists; those are function values. The Node tests of the criterion assert all of it: the seven texts including the hook labels, the stubbed label and the unknown node, the details of R3, R1, R7 and R5 with the deny and allow reason texts, and the four variants where only the last pay step with a key gives stubbed. The rendering of those rows is proved in a browser by the repository's own journey, which reads the item lookup · deny with its Reasons detail after the first dry run and the lookup and stubbed pay items after the second, and by the Try again test, which reads the Reasons, Service and Token lifetime details of a row.
---

## Q-009: Hold H-9dca9db5: UI criterion C-0d1cacce has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-0d1cacce has no end-to-end test; see the generated UI tests table

Step 5 for C-0d1cacce: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_0d1cacce::test_run_page_lists_policy_decisions_of_finished_stub_run[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. The criterion's scenario drives loadDecisions with a recording client over four cases, decisionsWanted over seven runs and decisionsView over ten inputs, and compares recorded queries, thrown errors and section objects; those are function values. The Node tests of the criterion assert every row: the two paged requests with limit and cursor, five pages then truncated, the INVALID_RESPONSE error for an unreadable page, the RangeError with no request, the seven wanted values, and the hidden, loading, error, empty and rows sections with the 403 text, the unreadable text and the truncation note. The page half of the requirement is proved in a browser by the repository's Try again test and journey, which read the region's error paragraph, its list and its empty text.
---

## Q-010: Hold H-1406e643: UI criterion C-f78faba7 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-f78faba7 has no end-to-end test; see the generated UI tests table

Step 5 for C-f78faba7: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_f78faba7::test_run_page_decisions_try_again[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-3c3b2517: UI criterion C-acb416e2 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-acb416e2 has no end-to-end test; see the generated UI tests table

Step 5 for C-acb416e2: not_testable after 1 attempt(s); The criterion asserts exact per-step `stepDetailRows` output for test-plan cases T1–T6 (e.g. `Branch=active`, `Taint=none`). The change and snapshot expose no public page, URL, or step-details UI element for taint rows, so these values cannot be asserted via the `page` fixture without mirroring i....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. The criterion's scenario runs stepDetailRows on six steps and compares the full row lists, which are function values; the judge itself says they cannot be asserted through a page without mirroring the implementation. The Node tests of the criterion assert each of T1 to T6 by value: the switch ends Branch then Taint none, the wait ends Wait then the two labels, the end step and the unknown kind end with their Taint, the failed switch has Taint before Error and Decision with the decision href, and the block step keeps its ten rows with one Taint. The implementation appends the row after the renderer's rows only when none of them is Taint and before Error and Decision, and the built-in renderers are unchanged. The browser journey also reads the Taint row with the value none under the done step.
---

## Q-012: Hold H-b5dcea3b: UI criterion C-f665c2d6 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-f665c2d6 has no end-to-end test; see the generated UI tests table

Step 5 for C-f665c2d6: not_testable after 1 attempt(s); This criterion verifies source file contents (findInlineStyleUse, dangerouslySetInnerHTML, registerEditorPanel counts, flowFeatureLiterals) by reading .tsx files, which cannot be observed through the browser page fixture at L4_E2E_BASE_URL..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-348b6970: UI criterion C-6d6e45b6 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-6d6e45b6 has no end-to-end test; see the generated UI tests table

Step 5 for C-6d6e45b6: not_testable after 1 attempt(s); The criterion asserts backend state (issued token, forwarded request, recorded tool calls) and a stack start/sign-in flow that cannot be driven or observed through the public web UI; the page snapshot is an empty SPA shell with no interactive elements or selectors, and no sign-in or navigation ta....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-53e5119d: UI criterion C-02d224b2 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-02d224b2 has no end-to-end test; see the generated UI tests table

Step 5 for C-02d224b2: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_02d224b2::test_carol_approves_grants_and_alice_dry_run[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
