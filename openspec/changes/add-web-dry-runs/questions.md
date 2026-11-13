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
