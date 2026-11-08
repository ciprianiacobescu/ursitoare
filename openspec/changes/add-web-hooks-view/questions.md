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
| Q-002 | open | 5.1 | harness | Task 5.1: the pre-satisfied check could not decide |
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

- **Status:** open
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
