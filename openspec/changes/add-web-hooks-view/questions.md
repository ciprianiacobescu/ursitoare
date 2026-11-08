# Questions — add-web-hooks-view

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
| Q-001 | answered | 5.1 | ambiguous | Block hook entry action contradicts the demo-hooks journey expectation |
| Q-002 | answered | 5.1 | harness | Task 5.1: the pre-satisfied check could not decide |
| Q-003 | answered | none | verdict | Criterion C-25335f88 (web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice validates, test-runs and reads demo-hooks): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-6d33a627 (web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice meets the X3 rejection on demo-x3): accept as satisfied? |
| Q-005 | answered | none | verdict | Hold H-ad2767b0: UI criterion C-822061e0 has no end-to-end test; see the generated UI tests table |
| Q-006 | answered | none | verdict | Hold H-b3c4f418: UI criterion C-8a9b0cea has no end-to-end test; see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-52301bd3: UI criterion C-740bc49b has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-8bb22c50: UI criterion C-67dea741 has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-480e66a5: UI criterion C-c595362a has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-5b0fc692: UI criterion C-ff5e87af has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-feaadce1: UI criterion C-d630941c has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-a457f21b: UI criterion C-1f095289 has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-c3ceafa2: UI criterion C-25335f88 has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-e3e2b1c3: UI criterion C-6d33a627 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Block hook entry action contradicts the demo-hooks journey expectation

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: the reason has 1028 characters: the limit is 1000
- **Blocking tasks:** 5.1
- **Kind:** ambiguous
- **Asked:** 2026-11-08T11:36Z by deepseek-free, run r-20261108T1014Z-5062, task 5.1

### Context
C-1f095289 expects hookRows(pay) to give the texts ["pre:guard · code (fused) · completed · continue", "post:notify · block · completed"]. The merged add-block-hooks code (src/interpreter/hooks/block-runner.ts, entryOf) records every block entry with action "continue", and the add-block-hooks ledger notes say entry.action was deliberately not asserted because its spec wording is ambiguous. Running the real stack therefore yields "post:notify · block · completed · continue". This unit's design decision 5 and test-plan fixture N assume the block entry action is null. The journey cannot be both faithful to the scenario and green on arrival; the browser assertion is a substring so it would pass either way.

### Options
1. Treat the engine as authoritative: the Node journey (and test-plan fixture N) expect "post:notify · block · completed · continue"; keep src/ unchanged.
2. Treat the scenario as authoritative: change src/interpreter/hooks/block-runner.ts so a block entry records action null (outside this unit's declared web-only scope), making hookRows give "post:notify · block · completed".
3. Change web/src/runs/hook-rows.ts to omit the action for block-kind entries (deviates from the hookRows requirement, which appends the action whenever it is not null).

### Answer
<!-- write below this line -->
Option 1: the merged engine is authoritative; keep src/ unchanged (this unit is web-only).

Why: add-block-hooks' blockHookRunner (src/interpreter/hooks/block-runner.ts, entryOf) records every block entry with action "continue", completed and failed under on_error: continue alike, and neither the hooks-block nor the hooks-runtime spec pins a block entry's action. So this unit's design decision 5 ("a block hook's entry has action null (U43)") misdescribes U43. "continue" is also the truthful text: the node went on.

What to do in task 5.1:
- In test/journeys/m5-code-hooks.test.ts only, expect the engine's second entry of pay as `{ ...N, action: "continue", idemKey: <the run's key> }` (G and the other members of N as written; the key still matches ^ik1_[0-9a-f]{64}$) and the hookRows texts of pay `pre:guard · code (fused) · completed · continue` and `post:notify · block · completed · continue`.
- Do not change G, N or the hookRows/parseStepHooks unit tests: an entry with action null stays valid input and gives no action part, as the hookRows requirement says.
- Leave the browser test's substring assertion as it is.

The spec text (design decision 5, the journey's expected hookRows text, test-plan § Journey expectations) is corrected on main after this unit merges.

---

## Q-002: Task 5.1: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.1
- **Kind:** harness
- **Asked:** 2026-11-08T12:21Z by deepseek-free, run r-20261108T1146Z-9221, task 5.1
- **Criteria:** C-1f095289 (web-runs › The hooks view works against the real engine › Alice and bob run demo-hooks and alice meets the X3 rule)

### Context
L4 could not run the pre-satisfied check of task 5.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and test/journeys/m5-code-hooks.test.ts is not a Python file; the base run: its new tests fail against the unit base code only by an error, not by assertion
Runs: test-base-run
Kept real: nothing
Tests: test.journeys.m5-code-hooks.test.ts::C-1f095289 alice and bob run demo-hooks and alice meets the X3 rule

Changes the replay applies (2 files):
    added e2e/test_m5_code_hooks.py
    added test/journeys/m5-code-hooks.test.ts

Source of the tests (redacted; at most 40 lines each):
test.journeys.m5-code-hooks.test.ts::C-1f095289 alice and bob run demo-hooks and alice meets the X3 rule:
    test("C-1f095289 alice and bob run demo-hooks and alice meets the X3 rule", async () => {
      const alice = await signedIn("alice");
      const bob = await signedIn("bob");
    
      await postFlow(alice.client, { name: "demo-hooks", ownerTeam: "finance" }, "k-hooks-flow");
      await postFlow(alice.client, { name: "demo-x3", ownerTeam: "finance" }, "k-x3-flow");
    
      const hooksSaved = await saveVersion(
        alice.client,
        { flowId: "demo-hooks", text: DEMO_HOOKS },
        "k-hooks-save",
      );
      const hooksHash = hooksSaved.version.hash;
      const hooksValidation = await validateVersion(alice.client, "demo-hooks", hooksHash);
      assert.equal(hooksValidation.result.ok, true);
      assert.deepEqual(hooksValidation.result.errors, []);
      assert.deepEqual(hooksValidation.result.warnings, []);
      assert.deepEqual(hooksValidation.result.layers_run, ["L1", "L2", "L3", "H"]);
      assert.equal(hooksValidation.version.state, "validated");
    
      const x3Saved = await saveVersion(
        alice.client,
        { flowId: "demo-x3", text: DEMO_X3 },
        "k-x3-save",
      );
      const x3Hash = x3Saved.version.hash;
      const x3Validation = await validateVersion(alice.client, "demo-x3", x3Hash);
      assert.equal(x3Validation.result.ok, false);
      assert.equal(x3Validation.version.state, "draft");
      assert.equal(x3Validation.result.errors.length, 1);
      const x3Error = x3Validation.result.errors[0];
      assert.ok(x3Error !== undefined);
      assert.equal(x3Error.layer, "H");
      assert.equal(x3Error.code, "H_ROUTE_EFFECT");
      assert.equal(x3Error.node, "classify");
      assert.equal(x3Error.path, "/nodes/classify/post/0/routes/0");
      assert.deepEqual(x3Validation.result.warnings, []);
      assert.deepEqual(x3Validation.result.layers_run, ["L1", "L2", "L3", "H"]);
      const x3Rows = diagnosticRows(x3Validation.result);
      assert.equal(
    [cut: 128 more lines]

Diff of e2e/test_m5_code_hooks.py (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/e2e/test_m5_code_hooks.py b/e2e/test_m5_code_hooks.py
    new file mode 100644
    index 0000000..3989662
    --- /dev/null
    +++ b/e2e/test_m5_code_hooks.py
    @@ -0,0 +1,289 @@
    +"""The M5 closing journey: a code node with hooks, and the X3 hook route into an effect node."""
    +
    +import json
    +import re
    +
    +import pytest
    +from playwright.sync_api import Page, expect
    +
    +from conftest import assert_accessible, login
    +
    +DEMO_HOOKS = "\n".join(
    +    [
    +        'ursitoare: "0.1"',
    +        "flow: demo-hooks",
    +        "version: 1.0.0",
    +        "inputs:",
    +        "  type: object",
    +        "  properties: { vendor_name: { type: string }, amount: { type: number } }",
    +        "  required: [vendor_name, amount]",
    +        "start: lookup",
    +        "nodes:",
    +        '  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: normalize }',
    +        "  normalize:",
    +        "    kind: code",
    +        "    language: js",
    +        '    input: { amount: "${{ inputs.amount }}", status: "${{ nodes.lookup.output.status }}" }',
    +        '    source: "return { amount: Math.round(input.amount * 100) / 100, route: input.status === \'active\' ? \'pay\' : \'blocked\' };"',
    +        "    output_schema:",
    +        "      type: object",
    +        "      properties: { amount: { type: number }, route: { type: string, enum: [pay, blocked] } }",
    +        "      required: [amount, route]",
    +        "    next: route",
    +        '  route: { kind: switch, on: "${{ nodes.normalize.output.route }}", cases: { pay: pay }, default: blocked }',
    +        "  pay:",
    [cut: 255 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-web-hooks-view/.l4/held/5.1-pre_satisfied.patch` on the unit branch]

Diff of test/journeys/m5-code-hooks.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/test/journeys/m5-code-hooks.test.ts b/test/journeys/m5-code-hooks.test.ts
    new file mode 100644
    index 0000000..bbbef42
    --- /dev/null
    +++ b/test/journeys/m5-code-hooks.test.ts
    @@ -0,0 +1,351 @@
    +import assert from "node:assert/strict";
    +import { after, before, test } from "node:test";
    +
    +import { ApiRequestError } from "../../web/src/api/client.ts";
    +import type { ApiClient } from "../../web/src/api/client.ts";
    +import { postFlow } from "../../web/src/flows/flows.ts";
    +import { diagnosticRows } from "../../web/src/flows/diagnostics.ts";
    +import { loadVersion, saveVersion, validateVersion } from "../../web/src/flows/versions.ts";
    +import { graphView } from "../../web/src/flow-graph/graph-model.ts";
    +import { hookOverlay } from "../../web/src/flow-graph/hook-overlay.ts";
    +import { layoutFlow } from "../../web/src/flow-graph/layout.ts";
    +import { hookRows, hookTraceNote } from "../../web/src/runs/hook-rows.ts";
    +import { registerRunMessages } from "../../web/src/runs/messages.ts";
    +import { followRun } from "../../web/src/runs/polling.ts";
    +import type { RunSnapshot } from "../../web/src/runs/polling.ts";
    +import { loadPayload, loadSteps } from "../../web/src/runs/runs-source.ts";
    +import { startTestRun, testRunFormErrors } from "../../web/src/runs/test-run.ts";
    +import type { StepView } from "../../web/src/runs/types.ts";
    +import type { E2eStack } from "../support/e2e-stack/stack.ts";
    +import { startE2eStack } from "../support/e2e-stack/stack.ts";
    +import { sessionClient, signInAs } from "./session.ts";
    +import type { TestSession } from "./session.ts";
    +
    +const DEMO_HOOKS = `ursitoare: "0.1"
    +flow: demo-hooks
    +version: 1.0.0
    +inputs:
    +  type: object
    +  properties: { vendor_name: { type: string }, amount: { type: number } }
    +  required: [vendor_name, amount]
    +start: lookup
    +nodes:
    +  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "\${{ inputs.vendor_name }}" }, next: normalize }
    +  normalize:
    [cut: 317 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-web-hooks-view/.l4/held/5.1-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 2 files (the whole patch is in `openspec/changes/add-web-hooks-view/.l4/held/5.1-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: The check's evidence is enough as it stands. Task 5.1 itself says the Node journey is green on arrival and that the e2e stack is its proof, so a pre-satisfied test is what the unit's own documents expect here, not an accident. The base run failing by an error rather than an assertion is also what the design predicts: against the unit base, parseValidation does not know layer H, so validateVersion throws INVALID_RESPONSE before the journey reaches any assertion, and the zero-value run cannot vary a TypeScript file at all, so a retry would reproduce the same inconclusive result. The held test's assertions follow the scenario Alice and bob run demo-hooks and alice meets the X3 rule step by step (validation layers and state, the TEST_MOCK_MISSING form error, the five steps and kinds, the normalize and pay payloads, the pay hook entries and hookRows texts, hookTraceNote null, no hooks key elsewhere, bob's steps, the X3 error and OPERATION_REFUSED refusal, and the overlay route and rule), and its only departure from the spec text, the block entry's action being continue, matches the merged block hook runner and the answer to Q-001. Since the accept only takes effect through a replay that runs every gate against the real stack, a journey that does not actually pass is still stopped.

---

## Q-003: Criterion C-25335f88 (web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice validates, test-runs and reads demo-hooks): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-25335f88 (web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice validates, test-runs and reads demo-hooks)

### Context
Criterion C-25335f88 (web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice validates, test-runs and reads demo-hooks) is needs human after round 2.

Scenario:
\- **WHEN** alice signs in with `login(page, users["alice"])`, opens "Flows", creates `demo-hooks` for `finance`, fills "Flow text" with `DEMO_HOOKS`, presses "Save version" and "Validate", reads the region "Graph", fills "Input (JSON)" and "Mocks (JSON)" of the region "Test run" with `INPUT` and `MOCKS_HOOKS`, presses "Start test run", follows its one link, presses `normalize` then `pay` in the list "Steps"; then, last, installs `page.route` on the steps request of that run (URL regex `/api/v1/runs/<run id>/steps(\?|$)`, the run id read from the link's name as in `e2e/test_m4_runs.py`), whose handler calls `route.fetch()`, sets `hooks` to `null` on the item of `normalize`, passes every other item and member through unchanged and fulfils with that JSON, reloads the run page with `page.goto`, and presses `normalize` then `pay`
\- **THEN** the status in the region "Diagnostics" contains "Valid. 0 errors, 0 warnings. Layers run: L1, L2, L3, H."; the region "Graph" contains "Flow graph: 6 nodes, 5 edges, 5 layers.", its list "Hooks" has one item containing `pay: pre guard; post notify`, and it has no list named "Hook routes" or "Flow rules"; the run page shows within 20 seconds the status "Run state" "State: completed" and the buttons `lookup`, `normalize`, `route`, `pay`, `done` in order; after `normalize` the region "Step details" shows `code`, `completed`, `Attempt`, the region "Input" shows `"amount": 12.5` and `"status": "active"`, the region "Output" shows `"route": "pay"`, and there is no region named "Hooks"; after `pay` the region "Hooks" holds a list named "Hooks" of two items, the first containing `pre:guard · code (fused) · completed · continue` and the second `post:notify · block · completed`; with the answer rewritten: the buttons are still `lookup`, `normalize`, `route`, `pay`, `done` in order, after `normalize` the region "Hooks" contains the paragraph "This step's hook trace could not be read." (and no element with role `alert`), there is no list named "Hooks", and the region "Step details" still shows `code` and `completed`; after `pay` the list "Hooks" still has the same two items and the paragraph is gone; `assert_accessible(page)` passes on each page

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m5_code_hooks::test_c_25335f88_alice_validates_test_runs_and_reads_demo_hooks[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The browser journey in e2e/test_m5_code_hooks.py follows the scenario assertion by assertion: the diagnostics status with layer H, the graph message and its one Hooks item with no Hook routes or Flow rules list, the completed run with the five step buttons in order, the code step's details, input and output with no Hooks region, the two hook rows of pay, and then the page.route rewrite that sets hooks to null on normalize, the reload, the note paragraph without an alert and without a list, and the unchanged pay rows, with assert_accessible on every page. The production code renders exactly that: parseStepView keeps a malformed trace as hooks null, hookTraceNote returns the note for it, RunPage renders the Hooks section only when there are rows or a note and prints the note as a plain paragraph, and FlowGraphView renders the Hooks list from hookSectionView. The engine side is proved by the Node journey against the real e2e stack (layers_run with H, a completed run, the pay hook rows), accepted in Q-002. The only gap the verifier names is the lack of a red record for the browser test, which the project's rules make impossible: a red step runs only the Node gate and browser-only criteria are left to the verifier. The generated test could not replace it because its own file failed to import a helper module at collection, which says nothing about the unit. The round 2 e2e gate ran this test and passed.
---

## Q-004: Criterion C-6d33a627 (web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice meets the X3 rejection on demo-x3): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-6d33a627 (web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice meets the X3 rejection on demo-x3)

### Context
Criterion C-6d33a627 (web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice meets the X3 rejection on demo-x3) is needs human after round 2.

Scenario:
\- **WHEN** alice signs in with `login(page, users["alice"])`, opens "Flows", creates `demo-x3` for `finance`, fills "Flow text" with `DEMO_X3`, presses "Save version" and "Validate", and reads the regions "Diagnostics", "Test run" and "Graph"
\- **THEN** the status in "Diagnostics" contains "Not valid. 1 error, 0 warnings. Layers run: L1, L2, L3, H."; the list "Issues" has one item that contains `H_ROUTE_EFFECT` and `Node classify · /nodes/classify/post/0/routes/0` and holds the link "Guide for H_ROUTE_EFFECT (opens in a new tab)", whose `href` ends in `docs/authoring/diagnostics.md#h_route_effect`; the region "Test run" contains "Save and validate a version to test-run it." and no button "Start test run"; the region "Graph" has a list named "Hook routes" of one item containing `hook rush: classify may route to pay`, a list named "Flow rules" of one item containing `audit: match kind code; pre none; post rule.audit` followed by the paragraph "Flow rules are listed, not drawn: the graph cannot tell which nodes they match.", and in its `svg` exactly one `path.hook-route` whose `d` is `M 112 168 L 112 328` and whose computed `stroke-dasharray` is not `none`; `assert_accessible(page)` passes

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m5_code_hooks::test_c_6d33a627_alice_meets_the_x3_rejection[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The browser test follows the scenario: it saves and validates DEMO_X3, asserts the Not valid status with layer H, the one Issues item with H_ROUTE_EFFECT, its where text and the guide link whose href ends in the h_route_effect anchor, the Test run region's text with no Start test run button, the Hook routes and Flow rules lists with their one item each, the flow rules paragraph, and exactly one path.hook-route in the svg with d M 112 168 L 112 328 and a computed stroke-dasharray that is not none, with assert_accessible at the end. The production code delivers each piece: diagnostics.ts accepts layer H and links H_ codes, test-run.ts holds the no-version text, GraphPanel renders the saved document's graph, FlowGraphView renders the Hook routes and Flow rules lists, the rules paragraph and the hook-route paths, and hook-overlay.css dashes them. The Node tests fix the path geometry and the overlay texts for this exact document, and the Node journey proves against the real engine that demo-x3 validates with exactly one H_ROUTE_EFFECT error and stays a draft. The missing red record is structural, since a red step runs only the Node gate, and the verifier's generated test was not written because it lacked the suite's helpers. The round 2 e2e gate ran this test and passed.
---

## Q-005: Hold H-ad2767b0: UI criterion C-822061e0 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-822061e0 has no end-to-end test; see the generated UI tests table

Step 5 for C-822061e0: not_testable after 1 attempt(s); Criterion specifies pure functions (parseValidation, diagnosticRows, diagnosticHref) with fixture inputs; the page snapshot is an empty SPA shell with no UI route to feed them, so it is a unit-level check, not an e2e one..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold can be waived. Criterion C-822061e0 is written as a function-level scenario over parseValidation, diagnosticRows, diagnosticsSummary and diagnosticHref with fixture inputs, and three Node tests named with its id check every value it lists: the parsed result, the three refusals, the two rows, the summary text and the seven hrefs. The project's rules make Node tests the red step and leave browser checks to the verifier, so an end-to-end test is not what traces such a criterion. Its visible effect in the browser is nevertheless covered by the M5 journey, which asserts the layer H status text in the Diagnostics region and the H_ROUTE_EFFECT guide link with its anchor.
---

## Q-006: Hold H-b3c4f418: UI criterion C-8a9b0cea has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-8a9b0cea has no end-to-end test; see the generated UI tests table

Step 5 for C-8a9b0cea: not_testable after 1 attempt(s); Criterion is about a Node unit test (hook-link-parity.test.ts) comparing library constants and functions; no browser-observable behavior or UI to drive with Playwright..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold can be waived. Criterion C-8a9b0cea names its own Node test, test/web-flow-editor/hook-link-parity.test.ts, and describes a comparison of library constants and functions: the two hook code lists from src/authoring and diagnosticHref against REPO_DOCS_BASE plus diagnosticLink. That test exists, is named with the criterion's id, asserts the eight error codes and the one warning code, and compares every link. There is no browser behaviour to drive beyond what the M5 journey already checks, where the H_ROUTE_EFFECT guide link's href ends in its guide anchor.
---

## Q-007: Hold H-52301bd3: UI criterion C-740bc49b has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-740bc49b has no end-to-end test; see the generated UI tests table

Step 5 for C-740bc49b: not_testable after 1 attempt(s); Criterion specifies return values of pure functions on test-plan fixtures; no known browser route/flow to reach the graph from the empty SPA shell..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold can be waived. Criterion C-740bc49b lists return values of hookOverlay, hookBadgeText, hookRouteText, flowRuleText, hookRoutePaths and hookSectionView on the HOOKED, X3 and RULES fixtures. Two Node tests named with its id assert each of those values, including the path geometry and the section view texts. The page side belongs to the sibling requirement text about FlowGraphView, which renders the section view mechanically, and the M5 browser journey checks it: the Hooks item for demo-hooks, the Hook routes and Flow rules items for demo-x3, and the one dashed hook-route path. An end-to-end test for the pure functions would add nothing the Node tests do not already discriminate.
---

## Q-008: Hold H-8bb22c50: UI criterion C-67dea741 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-67dea741 has no end-to-end test; see the generated UI tests table

Step 5 for C-67dea741: not_testable after 1 attempt(s); The criterion is about pure module functions (hookOverlay, layoutFlow, hookSectionView with a counting Proxy). A browser user can't observe those, and the page snapshot shows no route or fixture for loading such documents..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-480e66a5: UI criterion C-c595362a has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-c595362a has no end-to-end test; see the generated UI tests table

Step 5 for C-c595362a: not_testable after 1 attempt(s); Criterion is about pure functions parseStepHooks/parseStepView; the browser UI (empty SPA shell) exposes no way to call them or their fixtures, so no end-to-end check exists..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-5b0fc692: UI criterion C-ff5e87af has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-ff5e87af has no end-to-end test; see the generated UI tests table

Step 5 for C-ff5e87af: not_testable after 1 attempt(s); Criterion specifies pure functions (hookRows, hookTraceNote) on in-memory fixtures; the snapshot shows only an empty SPA shell with no known route or data to drive a run page with these hook traces..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-feaadce1: UI criterion C-d630941c has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-d630941c has no end-to-end test; see the generated UI tests table

Step 5 for C-d630941c: not_testable after 1 attempt(s); Criterion concerns in-process module APIs (stepRenderers, registerCodeRenderer, timelineItems) in a fresh process; not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-a457f21b: UI criterion C-1f095289 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-1f095289 has no end-to-end test; see the generated UI tests table

Step 5 for C-1f095289: not_testable after 1 attempt(s); Criterion is a Node-level test (m5-code-hooks.test.ts) that calls web helper functions (followRun, loadPayload, hookOverlay, testRunFormErrors) against a real engine stack. The page snapshot shows only an empty SPA shell, with no known UI selectors, login flow or seed data, so a browser test can'....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-c3ceafa2: UI criterion C-25335f88 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-25335f88 has no end-to-end test; see the generated UI tests table

Step 5 for C-25335f88: uncollectable after 1 attempt(s); no test of the new file ran at the merge base (collection error or no test).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-e3e2b1c3: UI criterion C-6d33a627 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-6d33a627 has no end-to-end test; see the generated UI tests table

Step 5 for C-6d33a627: not_testable after 2 attempt(s); Needs the suite's login(), seeded users and assert_accessible() helpers plus the DEMO_X3 fixture. None of these are visible here, so a self-contained test would only guess the sign-in UI and fail..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
