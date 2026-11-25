# Questions — add-web-tool-journeys

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
| Q-001 | answered | 1.1 | harness | Task 1.1: the pre-satisfied check could not decide |
| Q-002 | answered | none | verdict | Criterion C-eba5ac9e (web-tools › The M7 journey proves tool registration, review and a dry run in a browser › Carol sets up three tool servers and alice's dry run reads, runs and stubs): accept as sa |
<!-- l4:index:end -->

---

## Q-001: Task 1.1: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** harness
- **Asked:** 2026-11-25T09:38Z by claude-sonnet, run r-20261125T0805Z-29d6, task 1.1
- **Criteria:** C-a147034b (web-tools › The journey files carry the milestone marker, the M6b checks and no skip › The journey sources read as the rules say), C-ef502704 (web-tools › The tools journey works against the real engine › Carol registers three servers and alice dry-runs through all three adapters)

### Context
L4 could not run the pre-satisfied check of task 1.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and test/journeys/journey-sources.test.ts is not a Python file; the base run: every new test passes against the unit base code too
Runs: test-base-run
Kept real: nothing
Tests: test.journeys.journey-sources.test.ts::C-a147034b four mutated copies each give one problem, test.journeys.journey-sources.test.ts::C-a147034b the Node journey source holds the rules, test.journeys.journey-sources.test.ts::C-a147034b the browser journey source holds the rules, test.journeys.m7-tools.test.ts::C-ef502704 carol registers three servers and alice dry-runs through all three adapters

Changes the replay applies (3 files):
    added e2e/test_m7_tools.py
    added test/journeys/journey-sources.test.ts
    added test/journeys/m7-tools.test.ts

Source of the tests (redacted; at most 40 lines each):
test.journeys.journey-sources.test.ts::C-a147034b four mutated copies each give one problem:
    test("C-a147034b four mutated copies each give one problem", () => {
      const python = read(PYTHON_FILE);
      const node = read(NODE_FILE);
      assert.ok(python.length > 0 && node.length > 0);
      assert.equal(checkPython(python.replaceAll("watch_csp(", "watch_css(")).length, 1);
      assert.equal(checkPython(`${python}\npytest.skip("later")\n`).length, 1);
      assert.equal(checkNode(node.replaceAll('"mcp"', '"mcq"')).length, 1);
      assert.equal(checkNode(`${node}\ntest.skip("later");\n`).length, 1);
    });
test.journeys.journey-sources.test.ts::C-a147034b the Node journey source holds the rules:
    test("C-a147034b the Node journey source holds the rules", () => {
      const text = read(NODE_FILE);
      assert.ok(text.length > 0);
      assert.deepEqual(checkNode(text), []);
    });
test.journeys.journey-sources.test.ts::C-a147034b the browser journey source holds the rules:
    test("C-a147034b the browser journey source holds the rules", () => {
      const text = read(PYTHON_FILE);
      assert.ok(text.length > 0);
      assert.deepEqual(checkPython(text), []);
    });
test.journeys.m7-tools.test.ts::C-ef502704 carol registers three servers and alice dry-runs through all three adapters:
    test("C-ef502704 carol registers three servers and alice dry-runs through all three adapters", async () => {
      const current = running();
      const carol = await signedIn("carol");
      const alice = await signedIn("alice");
      const { fake } = egressApi(current.handles);
      const { tools } = toolsApi(current.handles);
      const { mcp } = mcpApi(current.handles);
      mcp.setTools([...FAKE_MCP_TOOLS, HDR]);
    
      // 1. MCP: register, store the credential, discover, set find_vendor to read
      const crm = await registerServer(
        carol,
        okRequest(mcpRegistration({ id: "crm", url: "https://mcp.fake.test/mcp", local: false })),
        "k-r-crm",
      );
      assert.equal(crm.id, "crm");
      const crmBody = credentialBody("crm", { authScheme: "BEARER_TOKEN", headerName: "", value: CRM_KEY });
      assert.ok(crmBody.ok);
      await storeCredential(carol, crmBody.body, "k-c-crm");
      const crmSvc = await serviceOf(carol, "crm");
    
      const first = await discoverTools(carol, "crm", discoverBody(initialDraft([])), "k-d1");
      assert.deepEqual(first, {
        protocolVersion: "2026-07-28",
        era: "modern",
        count: 2,
        excluded: [{ name: "route_ticket", reason: "x_mcp_header" }],
      });
      const review1 = await loadServerReview(carol, "crm");
      assert.equal(review1.server.state, "pending");
      assert.equal(review1.approved, null);
      const changes = changesView(review1.approved, review1.pending);
      assert.deepEqual(
        changes.items.map((i) => i.text),
        ["added find_vendor", "added log_note"],
      );
      for (const item of changes.items) {
        assert.ok(item.lines.includes("Description: (none)"), item.text);
      }
      const lines1 = toolLines(review1.pending);
    [cut: 250 more lines]

Diff of e2e/test_m7_tools.py (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/e2e/test_m7_tools.py b/e2e/test_m7_tools.py
    new file mode 100644
    index 0000000..38d2a8e
    --- /dev/null
    +++ b/e2e/test_m7_tools.py
    @@ -0,0 +1,352 @@
    +"""The M7 closing journey: carol registers three tool servers, alice's dry run reads, runs and stubs."""
    +
    +import json
    +import re
    +
    +import pytest
    +from playwright.sync_api import Browser, Page, expect
    +
    +from conftest import assert_accessible, assert_layout, login, watch_csp
    +
    +DEMO_TOOLS = "\n".join(
    +    [
    +        'ursitoare: "0.1"',
    +        "flow: demo-tools",
    +        "version: 1.0.0",
    +        "inputs:",
    +        "  type: object",
    +        "  properties: { vendor_name: { type: string }, vendor_id: { type: string }, amount: { type: number } }",
    +        "  required: [vendor_name, vendor_id, amount]",
    +        "start: find",
    +        "nodes:",
    +        '  find: { kind: block, uses: crm.find_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: score }',
    +        '  score: { kind: block, uses: calc.risk_score@1, with: { amount: "${{ inputs.amount }}" }, next: pay }',
    +        "  pay:",
    +        "    kind: block",
    +        "    uses: ledger.create_payment@1",
    +        '    with: { vendor_id: "${{ inputs.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }',
    +        "    next: done",
    +        '  done: { kind: end, status: completed, output: { status: "${{ nodes.find.output.status }}", band: "${{ nodes.score.output.band }}", payment_id: "${{ nodes.pay.output.payment_id }}" } }',
    +        "",
    +    ]
    +)
    +INPUT_TEXT = json.dumps(
    +    {"vendor_name": "Acme GmbH", "vendor_id": "V-ACME", "amount": 12.5}, separators=(",", ":")
    [cut: 318 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-web-tool-journeys/.l4/held/1.1-pre_satisfied.patch` on the unit branch]

Diff of test/journeys/journey-sources.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/test/journeys/journey-sources.test.ts b/test/journeys/journey-sources.test.ts
    new file mode 100644
    index 0000000..f7cd615
    --- /dev/null
    +++ b/test/journeys/journey-sources.test.ts
    @@ -0,0 +1,83 @@
    +import assert from "node:assert/strict";
    +import { readFileSync } from "node:fs";
    +import { test } from "node:test";
    +
    +const PYTHON_FILE = "e2e/test_m7_tools.py";
    +const NODE_FILE = "test/journeys/m7-tools.test.ts";
    +
    +const PYTHON_REQUIRED: readonly string[] = [
    +  '@pytest.mark.milestone("M7")',
    +  "set_viewport_size(",
    +  "watch_csp(",
    +  "assert_layout(",
    +  "assert_accessible(",
    +  "exact=True",
    +  "browser.new_context(",
    +  "def test_carol_sets_up_three_servers_and_alice_dry_runs",
    +];
    +const PYTHON_FORBIDDEN: readonly string[] = [
    +  "pytest.skip",
    +  "xfail",
    +  "skipif",
    +  "time.sleep",
    +  "page.wait_for_timeout",
    +];
    +const NODE_REQUIRED: readonly string[] = [
    +  "startE2eStack(",
    +  '"mcp"',
    +  '"tool-servers"',
    +  "mcpApi(",
    +  "toolsApi(",
    +  "egressApi(",
    +  "demo-live",
    +];
    +const NODE_FORBIDDEN: readonly string[] = [".skip(", ".todo("];
    [cut: 49 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-web-tool-journeys/.l4/held/1.1-pre_satisfied.patch` on the unit branch]

Diff of test/journeys/m7-tools.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/test/journeys/m7-tools.test.ts b/test/journeys/m7-tools.test.ts
    new file mode 100644
    index 0000000..be7c09e
    --- /dev/null
    +++ b/test/journeys/m7-tools.test.ts
    @@ -0,0 +1,509 @@
    +import assert from "node:assert/strict";
    +import { after, before, test } from "node:test";
    +
    +import type { ApiClient } from "../../web/src/api/client.ts";
    +import { postFlow } from "../../web/src/flows/flows.ts";
    +import { saveVersion, validateVersion } from "../../web/src/flows/versions.ts";
    +import { decisionRows, loadDecisions } from "../../web/src/runs/decisions.ts";
    +import { startDryRun } from "../../web/src/runs/dry-run.ts";
    +import { followRun } from "../../web/src/runs/polling.ts";
    +import type { RunSnapshot } from "../../web/src/runs/polling.ts";
    +import { loadPayload } from "../../web/src/runs/runs-source.ts";
    +import { credentialBody, storeCredential } from "../../web/src/tools/credentials.ts";
    +import { postGrant } from "../../web/src/tools/grants.ts";
    +import { deployPolicy } from "../../web/src/tools/policies.ts";
    +import {
    +  codeRegistration,
    +  mcpRegistration,
    +  openApiRegistration,
    +  previewOperations,
    +  previewRequest,
    +  registerServer,
    +} from "../../web/src/tools/register.ts";
    +import type { RegistrationRequest } from "../../web/src/tools/register.ts";
    +import {
    +  changesView,
    +  discoverBody,
    +  discoverTools,
    +  initialDraft,
    +  loadServerReview,
    +  parseReviewTools,
    +} from "../../web/src/tools/review.ts";
    +import { approveToolSurface } from "../../web/src/tools/servers.ts";
    +import { egressApi } from "../support/e2e-stack/egress-part.ts";
    +import { mcpApi } from "../support/e2e-stack/mcp-part.ts";
    [cut: 475 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-web-tool-journeys/.l4/held/1.1-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 3 files (the whole patch is in `openspec/changes/add-web-tool-journeys/.l4/held/1.1-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: Count these tests on the evidence of the real run. The unit adds no production file: its proposal scaffolds nothing and its three files are tests, so the Node journey and the source test pass against the base code by construction, and the design and task 1.1 foresee exactly this pre_satisfied question for a unit whose journeys are green on arrival. The project's own test-gate decision record states that L4's zero-value check is Python-only and that a TypeScript test passing at red holds the unit for a decision, which is the situation here. The replay runs the saved change through every gate, so the earlier typecheck excerpt is checked there; the lines it names in the saved copy of the Node journey are an assertion's closing bracket and a plain awaited call, not the code that excerpt describes, and the held record says the later attempt typechecked clean.

---

## Q-002: Criterion C-eba5ac9e (web-tools › The M7 journey proves tool registration, review and a dry run in a browser › Carol sets up three tool servers and alice's dry run reads, runs and stubs): accept as sa

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-eba5ac9e (web-tools › The M7 journey proves tool registration, review and a dry run in a browser › Carol sets up three tool servers and alice's dry run reads, runs and stubs)

### Context
Criterion C-eba5ac9e (web-tools › The M7 journey proves tool registration, review and a dry run in a browser › Carol sets up three tool servers and alice's dry run reads, runs and stubs) is needs human after round 1.

Scenario:
\- **WHEN** steps 1 to 5 of test-plan-browser.md § Journey run in two browser contexts (carol, alice)
\- **THEN** the values are those of the steps: "Discovered 2 tools over MCP 2026-07-28.", `find_vendor` `read` in "Tools" and in the exact Effect cell of "Calls", the exact cells `unsafe to retry` (`create_payment`) and `safe to retry`, `trusted` (`risk_score`), "Surface approved." three times, the `ledger` credential stored; the run `State: completed` with the items `find · allow · POST mcp.fake.test/mcp`, `score · allow` (no Service detail) and `pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1`, outputs `V-ACME`, `low`, `P-7`, and the Taint row `none` for `pay`, `untrusted` for `done`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m7_tools::test_carol_sets_up_three_servers_and_alice_dry_runs[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The browser journey traces the criterion and checks every value of its scenario. It runs in two browser contexts (carol's page and alice's new context), and asserts the exact status "Discovered 2 tools over MCP 2026-07-28.", find_vendor read in the Tools row and in the exact Effect cell of Calls, the exact Retry cells unsafe to retry for create_payment and safe to retry plus the Result cell trusted for risk_score, the status "Surface approved." once in each of three approvals, the ledger credential stored at key version 1, the run state completed, the three Policy decisions items with no Service detail on score, the outputs V-ACME, low and P-7, and the Taint row none after pay and untrusted after done, with assert_layout and assert_accessible after every view and both watch_csp lists asserted empty. The test is ignored only because it has no red record, which is by construction: the unit adds test files only and the project rules say a browser criterion stays out of criteria_ids and is checked by the verifier, so the judge's pass stands.
