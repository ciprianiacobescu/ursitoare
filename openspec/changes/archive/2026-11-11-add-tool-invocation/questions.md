# Questions — add-tool-invocation

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
| Q-001 | accepted | 1.1 | technical | src/credentials/egress-site.test.ts:22 asserts the old two-path egress inventory |
| Q-002 | accepted | 2.2 | technical | src/interpreter/hooks/authorize.test.ts:293 — seen.events assertions expect 'authorize' and 'invoke' that the test never records |
| Q-003 | accepted | 3.3 | technical | invoke.db.test.ts:45 localBinding keeps serverId acme, so the redirect row C4 cannot reach the local server |
| Q-004 | accepted | 3.3 | technical | src/runtimes/invoke/invoke.db.test.ts:275 expects local.seen ["/found"] but rows C5/C6 must reach the local upstream |
| Q-005 | answered | 4.2 | harness | Task 4.2: the pre-satisfied check could not decide |
| Q-006 | answered | 4.2 | harness | Task 4.2: the pre-satisfied check could not decide |
| Q-007 | answered | 4.2 | harness | Task 4.2: the pre-satisfied check could not decide |
<!-- l4:index:end -->

---

## Q-001: src/credentials/egress-site.test.ts:22 asserts the old two-path egress inventory

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-10T19:21Z by deepseek-free, run r-20261110T1839Z-5522, task 1.1

### Context
Line 22 asserts that `checkEgressSites(readSnapshot(), ["src/credentials/vault-call.ts", "src/main.ts"])` is `[]`. The spec `The gateway has one more inventoried caller` requires `src/runtimes/invoke/request.ts` to import `bodyDigest` from the gateway by value and to be the third inventory path, so with that import `checkEgressSites` reports exactly one `ARCH_EGRESS_SITE` for `src/runtimes/invoke/request.ts` unless the allowed list includes it. Both assertions therefore cannot pass; the red step updated only `test/arch/egress-sites.test.ts` and left this pre-existing frozen test on the two-path literal.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/credentials/egress-site.test.ts`, `test/arch/egress-sites.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-tool-invocation`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/credentials/egress-site.test.ts`: change line 22's allowed list to `["src/credentials/vault-call.ts", "src/main.ts", "src/runtimes/invoke/request.ts"]`, matching the three-path inventory of `test/arch/egress-sites.test.ts::C-76ead8ea`.

### Clarifier suggestion
Edit `src/credentials/egress-site.test.ts`: change line 22's allowed list to `["src/credentials/vault-call.ts", "src/main.ts", "src/runtimes/invoke/request.ts"]`, matching the three-path inventory of `test/arch/egress-sites.test.ts::C-76ead8ea`.

### Answer
<!-- write below this line -->

---

## Q-002: src/interpreter/hooks/authorize.test.ts:293 — seen.events assertions expect 'authorize' and 'invoke' that the test never records

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.2
- **Kind:** technical
- **Asked:** 2026-11-10T23:38Z by glm, run r-20261110T2145Z-bb63, task 2.2

### Context
The test's own instrumentation writes 'authorize' and 'invoke' only into seen.phases (invokerFor, lines 146 and 154: seen.phases.push). seen.events is written only by the ops wrapper (line 179, always `step ${name}`) and by the effects gate (lines 188 and 196, 'before'/'after'). Yet the assertions expect the bare strings 'authorize' and 'invoke' inside seen.events: line 293-300 for the authorized run, lines 314-321 for the plain M5 run (which expects 'invoke' even with no authorize), and line 354 for the denial ('[step pay:post:notify, authorize]'). No object blockHookRunner receives can push those bare strings, so these assertions fail for every implementation; the actual events are ['step pay:post:notify', 'before', 'step pay:post:notify#done', 'after']. The green implementation is otherwise complete: contexts, taint ('untrusted' default and argsTaint), step values, authorize-before-before ordering, denial propagation past on_error and the HOOK_ERROR tool_failed mapping all pass (the file's other two tests and every other assertion pass, and the full suite is green).

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/interpreter/hooks/authorize.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-tool-invocation`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/interpreter/hooks/authorize.test.ts`: in `invokerFor` (lines 146 and 154) push each phase into seen.events as well, i.e. make the invoke callback `seen.events.push("invoke"); seen.phases.push("invoke");` and the authorize callback `seen.events.push("authorize"); seen.phases.push("authorize");`, which satisfies the events assertions at lines 293-300, 314-321 and 354 as written.
2. Edit `src/interpreter/hooks/authorize.test.ts`: drop 'authorize' and 'invoke' from the seen.events expectations at lines 293-300, 314-321 and 354 (the phases assertions at lines 301, 339 and 355 already assert that order).

### Clarifier suggestion
Edit `src/interpreter/hooks/authorize.test.ts`: in `invokerFor` (lines 146 and 154) push each phase into seen.events as well, i.e. make the invoke callback `seen.events.push("invoke"); seen.phases.push("invoke");` and the authorize callback `seen.events.push("authorize"); seen.phases.push("authorize");`, which satisfies the events assertions at lines 293-300, 314-321 and 354 as written.

### Answer
<!-- write below this line -->

---

## Q-003: invoke.db.test.ts:45 localBinding keeps serverId acme, so the redirect row C4 cannot reach the local server

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.3
- **Kind:** technical
- **Asked:** 2026-11-11T06:02Z by claude-sonnet, run r-20261111T0423Z-83d3, task 3.3

### Context
The test at line 45 builds local bindings as `{ ...LV, ref, origin: LOCAL_ORIGIN, http: { method: "GET", path } }`, so `serverId` stays "acme". The `services` wrapper in `rig()` (lines 134 to 138) only returns the local service (`S_LOCAL`) when `serverId === "local"`. The invoke path resolves the target from `binding.serverId`, so a call for `acme.found@1` goes to the fake tools at `/found` and answers 404. The test then expects `status: "302"` and `r.local.seen` of `["/found"]`.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/runtimes/invoke/invoke.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-tool-invocation`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/runtimes/invoke/invoke.db.test.ts`: in `localBinding` (line 45) add `serverId: "local"` to the returned object, i.e. `{ ...LV, serverId: "local", ref, origin: LOCAL_ORIGIN, http: { method: "GET", path } }`

### Clarifier suggestion
Edit `src/runtimes/invoke/invoke.db.test.ts`: in `localBinding` (line 45) add `serverId: "local"` to the returned object, i.e. `{ ...LV, serverId: "local", ref, origin: LOCAL_ORIGIN, http: { method: "GET", path } }`

### Answer
<!-- write below this line -->

---

## Q-004: src/runtimes/invoke/invoke.db.test.ts:275 expects local.seen ["/found"] but rows C5/C6 must reach the local upstream

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.3
- **Kind:** technical
- **Asked:** 2026-11-11T06:15Z by deepseek-free, run r-20261111T0604Z-ccb1, task 3.3

### Context
With the Q-003 fix (serverId "local"), all three rows route acme.found@1, acme.text@1 and acme.array@1 to the local node:http upstream. The spec scenario "A call through the fakes, and each failure" and test-plan-runs.md rows C5/C6 require the 2xx text/plain and JSON-array responses to come from that upstream, so its request log must contain /found, /text and /array. The final assertion after the loop at line 275 expects only ["/found"], which no spec-conforming implementation can produce (the observed list is ["/found", "/text", "/array"]); its intent appears to be proving the 302 redirect was not followed to /elsewhere.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/runtimes/invoke/invoke.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-tool-invocation`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/runtimes/invoke/invoke.db.test.ts`: change line 275 from `assert.deepEqual(r.local.seen, ["/found"]);` to `assert.deepEqual(r.local.seen, ["/found", "/text", "/array"]);`
2. Edit `src/runtimes/invoke/invoke.db.test.ts`: replace line 275 with `assert.deepEqual(r.local.seen.filter((p) => p === "/elsewhere"), []);` so the test asserts only that the redirect target was not followed.

### Clarifier suggestion
Edit `src/runtimes/invoke/invoke.db.test.ts`: change line 275 from `assert.deepEqual(r.local.seen, ["/found"]);` to `assert.deepEqual(r.local.seen, ["/found", "/text", "/array"]);`

### Answer
<!-- write below this line -->

---

## Q-005: Task 4.2: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 4.2
- **Kind:** harness
- **Asked:** 2026-11-11T08:12Z by glm, run r-20261111T0619Z-85a5, task 4.2
- **Criteria:** C-068f45cf (tool-invocation › Untrusted data reaches the policy as untrusted › A missing taint, an untrusted read and a rewriting pre-hook), C-6f15197c (tool-invocation › Grants bind to the confirmed node and rules see approvals › Exit 16 and 21, old fingerprint and payment above 1000), C-9b030af8 (tool-invocation › A live run stops at a denied call › A policy error at pay fails the run), C-9baab7e2 (tool-invocation › A live run stops at a denied call › An ungranted pay is denied in a run with nothing sent), C-a6f9dbd3 (tool-invocation › A hook call is checked as a hook › hooked-pay with a node grant and then a hook rule)

### Context
L4 could not run the pre-satisfied check of task 4.2, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/runtimes/invoke/policy-runs.db.test.ts is not a Python file; the test-base-run run wrote no readable report (timed out after 1800s)
Runs: test-base-run
Kept real: nothing
Tests: src.runtimes.invoke.policy-runs.db.test.ts::C-068f45cf a missing taint an untrusted read and a rewriting pre-hook, src.runtimes.invoke.policy-runs.db.test.ts::C-6f15197c old fingerprint and payment above 1000, src.runtimes.invoke.policy-runs.db.test.ts::C-9b030af8 a policy error at pay fails the run, src.runtimes.invoke.policy-runs.db.test.ts::C-9baab7e2 an ungranted pay is denied in a run with nothing sent, src.runtimes.invoke.policy-runs.db.test.ts::C-a6f9dbd3 hooked-pay with a node grant and then a hook rule

Changes the replay applies (1 files):
    added src/runtimes/invoke/policy-runs.db.test.ts

Source of the tests (redacted; at most 40 lines each):
src.runtimes.invoke.policy-runs.db.test.ts::C-068f45cf a missing taint an untrusted read and a rewriting pre-hook:
    test("C-068f45cf a missing taint an untrusted read and a rewriting pre-hook", async () => {
      const h = await settled("invokeHarness resolves", () => invokeHarness());
      try {
        assert.equal(typeof h.run, "function");
        const grants = await grantAll(h);
        const gPay = grants[1];
        assert.ok(gPay !== undefined, "the pay grant of G_ALL exists");
        await settled("the granted layer is deployed", () => h.deploy(""));
    
        const run9 = await settled("h.start resolves", () =>
          h.start("H1", INPUT, "r_9"),
        );
        const invoker = await settled("liveInvoker resolves", () => h.path.liveInvoker(run9));
        assert.ok(invoker.authorize !== undefined, "the live invoker has authorize");
        const authorize = invoker.authorize.bind(invoker);
        const payCtx = (extra: Record<string, unknown>) => ctxOf("r_9", "pay", "pay", extra);
    
        await assertDenied(authorize(payCall(12.5), payCtx({})), "pay", "policy");
        let rows = await h.decisions("r_9");
        assert.equal(rows.length, 1);
        assertDenyRow(rows[0] as PolicyDecisionRecord, "pay", ["platform-forbid-untrusted-egress"]);
    
        const empty = await settled("the empty taint allows", () =>
          authorize(payCall(12.5), payCtx({ taint: [] })),
        );
        assert.deepEqual(empty.permit, V2_PERMIT);
        const extracted = await settled("the extracted taint allows", () =>
          authorize(payCall(12.5), payCtx({ taint: ["extracted"] })),
        );
        assert.deepEqual(extracted.permit, V2_PERMIT);
        rows = await h.decisions("r_9");
        assert.equal(rows.length, 3);
        assertAllowRow(rows[1] as PolicyDecisionRecord, "pay", [gPay.id], V2_PERMIT);
        assertAllowRow(rows[2] as PolicyDecisionRecord, "pay", [gPay.id], V2_PERMIT);
    
        const r1: RunRecord = await settled("h.run resolves", () =>
          h.run("HU", { invoice_id: "INV-1001" }, "r_1"),
        );
        const denied1 = await h.decisions("r_1");
        assert.equal(denied1.length, 2);
    [cut: 36 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-6f15197c old fingerprint and payment above 1000:
    test("C-6f15197c old fingerprint and payment above 1000", async () => {
      const h = await settled("invokeHarness resolves", () => invokeHarness());
      try {
        assert.equal(typeof h.run, "function");
        const gLookup = await settled("G_LOOKUP is created", () => h.grant(G_LOOKUP));
        const gPay = await settled("G_PAY is created", () => h.grant({ ...G_PAY, versionHash: h.hashes.H1 }));
        await settled("the granted layer is deployed", () => h.deploy(""));
    
        const r1: RunRecord = await settled("h.run resolves", () => h.run("H2", INPUT, "r_1"));
        const rows1 = await h.decisions("r_1");
        assert.equal(rows1.length, 2);
        const payDeny1 = rows1[1];
        assert.ok(payDeny1 !== undefined);
        assertAllowRow(rows1[0] as PolicyDecisionRecord, "lookup", [gLookup.id], V1_PERMIT);
        assertDenyRow(payDeny1, "pay", []);
        assertRunFailed(r1, "pay", "policy", payDeny1.decisionId);
    
        await settled("G_PAY is confirmed for H2", () =>
          withTenantTx(h.pool, h.ctx, (tx) =>
            confirmGrant(
              tx,
              h.ctx,
              gPay.id,
              h.hashes.H2,
              { kind: "user", id: "carol" },
              {
                ids: sequentialIds(1),
                clock: fixedClock(T0),
                catalogueFor: (c) => loadRegistryCatalogue(h.pool, c),
              },
            ),
          ),
        );
        await settled("the layer is redeployed", () => h.deploy(""));
        const r2: RunRecord = await settled("h.run resolves", () => h.run("H2", INPUT, "r_2"));
        assert.equal(r2.state, "completed");
    
        await settled("FORBID is deployed", () => h.deploy(FORBID));
        const r3: RunRecord = await settled("h.run resolves", () =>
          h.run("H1", INPUT_2450, "r_3"),
    [cut: 57 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-9b030af8 a policy error at pay fails the run:
    test("C-9b030af8 a policy error at pay fails the run", async () => {
      let version = "v";
      const wrap: HarnessWrap = {
        policy: (real) =>
          ({
            engine: Object.assign(Object.create(real.engine) as object, {
              check: async (req: PolicyRequest): Promise<Decision> => {
                if (req.resource.id === "tenant_a/read-then-pay/pay") {
                  return {
                    decision: "deny",
                    decisionId: "dec_e6",
                    decidedAt: T0,
                    reasons: [],
                    errors: ["POLICY_SET_UNAVAILABLE"],
                    policySetVersion: version,
                  };
                }
                return real.engine.check(req);
              },
            }),
            toolArgs: (tenantId: string) => real.toolArgs(tenantId),
            reload: (tenantId: string) => real.reload(tenantId),
          }) as unknown as PolicyRuntime,
      };
      const h = await settled("invokeHarness resolves", () => invokeHarness(wrap));
      try {
        assert.equal(typeof h.run, "function");
        const gLookup = await settled("G_LOOKUP is created", () => h.grant(G_LOOKUP));
        await settled("the granted layer is deployed", () => h.deploy(""));
        version = h.runtime.engine.policySetVersion;
    
        const run: RunRecord = await settled("h.run resolves", () => h.run("H1", INPUT, "r_8"));
        assert.equal(run.state, "failed");
        assert.deepEqual(run.error, {
          code: "INTERPRETER_TOOL_DENIED",
          message: 'tool call of "pay" is not permitted (policy_error)',
          node: "pay",
          details: { reason: "policy_error", decisionId: "dec_e6", errorCount: "1" },
        });
    
    [cut: 29 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-9baab7e2 an ungranted pay is denied in a run with nothing sent:
    test("C-9baab7e2 an ungranted pay is denied in a run with nothing sent", async () => {
      const h = await settled("invokeHarness resolves", () => invokeHarness());
      try {
        assert.equal(typeof h.run, "function");
        const gLookup = await settled("G_LOOKUP is created", () => h.grant(G_LOOKUP));
        await settled("the granted layer is deployed", () => h.deploy(""));
    
        const run: RunRecord = await settled("h.run resolves", () => h.run("H1", INPUT, "r_2"));
        const rows = await h.decisions("r_2");
        assert.equal(rows.length, 2);
        const lookupRow = rows[0];
        const payRow = rows[1];
        assert.ok(lookupRow !== undefined && payRow !== undefined);
        assertAllowRow(lookupRow, "lookup", [gLookup.id], V1_PERMIT);
        assertDenyRow(payRow, "pay", []);
        assertRunFailed(run, "pay", "policy", payRow.decisionId);
    
        const payStep = finalRowOf(await stepRows(h, "r_2"), "pay");
        assert.ok(payStep !== undefined, "the pay row exists");
        assert.equal(payStep.state, "failed");
        assert.equal(payStep.policyDecisionId, payRow.decisionId);
    
        assert.equal(await h.intents("r_2"), 0);
        const calls = h.tools.calls();
        assert.equal(calls.length, 1);
        assert.equal(calls[0]?.ref, "erp.lookup_vendor@1");
        assert.equal(calls[0]?.callHeader, "r_2:lookup:1");
        assert.deepEqual(
          h.gateway.calls.map((call) => (call as { op: string }).op),
          ["requestToken", "send"],
        );
      } finally {
        await h.close();
      }
    });
src.runtimes.invoke.policy-runs.db.test.ts::C-a6f9dbd3 hooked-pay with a node grant and then a hook rule:
    test("C-a6f9dbd3 hooked-pay with a node grant and then a hook rule", async () => {
      const h = await settled("invokeHarness resolves", () => invokeHarness());
      try {
        assert.equal(typeof h.run, "function");
        const gLookup = await settled("G_LOOKUP is created", () => h.grant(G_LOOKUP));
        const gPayH = await settled("G_PAYH is created", () =>
          h.grant({ ...G_PAYH, versionHash: h.hashes.HP, confirm: h.hashes.HP }),
        );
        await settled("the granted layer is deployed", () => h.deploy(""));
    
        const r1: RunRecord = await settled("h.run resolves", () => h.run("HP", INPUT, "r_1"));
        const rows1 = await h.decisions("r_1");
        assert.equal(rows1.length, 3);
        const lookupRow = rows1[0];
        const payRow = rows1[1];
        const hookRow = rows1[2];
        assert.ok(lookupRow !== undefined && payRow !== undefined && hookRow !== undefined);
        assertAllowRow(lookupRow, "lookup", [gLookup.id], V1_PERMIT);
        assertAllowRow(payRow, "pay", [gPayH.id], V2_PERMIT);
        assert.equal(hookRow.resource, 'Block::"tenant_a/hooked-pay/pay:post:notify"');
        assertDenyRow(hookRow, "pay", []);
        assertRunFailed(r1, "pay", "policy", hookRow.decisionId, "pay:post:notify");
    
        const r1Calls = h.tools.calls().filter((call) => call.callHeader?.startsWith("r_1:"));
        assert.deepEqual(
          r1Calls.map((call) => call.ref),
          ["erp.lookup_vendor@1", "erp.create_payment@1"],
        );
        const payStep1 = finalRowOf(await stepRows(h, "r_1"), "pay");
        assert.ok(payStep1 !== undefined, "the pay row exists");
        assert.equal(payStep1.state, "failed");
        assert.equal(payStep1.policyDecisionId, payRow.decisionId);
    
        await settled("HOOK_OK is deployed", () => h.deploy(HOOK_OK));
        const r2: RunRecord = await settled("h.run resolves", () => h.run("HP", INPUT, "r_2"));
        assert.equal(r2.state, "completed");
        const rows2 = await h.decisions("r_2");
        assert.equal(rows2.length, 3);
        const payRow2 = rows2[1];
        const hookRow2 = rows2[2];
    [cut: 16 more lines]

Diff of src/runtimes/invoke/policy-runs.db.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/runtimes/invoke/policy-runs.db.test.ts b/src/runtimes/invoke/policy-runs.db.test.ts
    new file mode 100644
    index 0000000..96e8284
    --- /dev/null
    +++ b/src/runtimes/invoke/policy-runs.db.test.ts
    @@ -0,0 +1,565 @@
    +import assert from "node:assert/strict";
    +import { createHash } from "node:crypto";
    +import { test } from "node:test";
    +
    +import { fixedClock, sequentialIds } from "../../core/index.ts";
    +import { confirmGrant } from "../../grants/index.ts";
    +import type { GrantRecord, PolicyRuntime } from "../../grants/index.ts";
    +import type { StepContext, ToolCall } from "../../interpreter/index.ts";
    +import type { Decision, PolicyDecisionRecord, PolicyRequest } from "../../pdp/index.ts";
    +import { loadRegistryCatalogue } from "../../registry/index.ts";
    +import { createRunStore } from "../../runs/index.ts";
    +import type { RunRecord, StepRecord } from "../../runs/index.ts";
    +import { withTenantTx } from "../../tenancy/index.ts";
    +import { invokeHarness } from "../../../test/support/invoke-runs/harness.ts";
    +import type { HarnessWrap, InvokeHarness } from "../../../test/support/invoke-runs/harness.ts";
    +
    +const T0 = "2026-11-06T10:00:00.000Z";
    +const S = "87caf624-f579-8435-9540-24d6eb57aeff";
    +const D_LV = "ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad";
    +const D_PAY = "af25dc0c3f8ca575c8b06c393f52c90967511a03d6db13a277b748379e77d4f8";
    +const D_2450 = createHash("sha256")
    +  .update(JSON.stringify({ amount: 2450, currency: "EUR", reference: "inv-1", vendor_id: "V-ACME" }))
    +  .digest("hex");
    +const INPUT = { vendor_name: "Acme GmbH", amount: 12.5 };
    +const INPUT_2450 = { vendor_name: "Acme GmbH", amount: 2450 };
    +const TENANT_A = { tenantId: "tenant_a", reviewProfile: "solo" } as const;
    +const SLACK_IDEM_KEY = "ik1_b67e1caff43c8cbc2b72758a1870219a8375cace7325d2fd5ae425acb8701828";
    +
    +const V1_PERMIT = {
    +  method: "POST",
    +  host: "tools.fake.test",
    +  path: "/blocks/erp.lookup_vendor@1",
    +  bodyDigest: D_LV,
    +  serviceId: S,
    [cut: 531 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-tool-invocation/.l4/held/4.2-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-tool-invocation/.l4/held/4.2-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: The check cannot decide for reasons that lie in the harness, not in the change, and the repository itself expects this task's tests to pass before any new code. The plan's own text for task 4.2 says it adds no green code because every name its tests call exists after 4.1, so red is expected to report the tests as already satisfied; counting them on the evidence of the real run is therefore the outcome the plan asks for, not a shortcut around it. The zero-value run only varies Python files and this is a TypeScript repository, so a retry cannot make that part decide, and the base run stopped at the gate timeout of 30 minutes configured in the repository, which a retry would meet again under the same load. The names the five tests call are all on head: the harness run that starts a live run and drives executeRun over memory ops, liveInvoker with authorize and invoke on the invoke path, deploy, grant, decisions, intents and logs, and the harness close tears down the sandbox, the fake tools, the fake egress and the database in a finally, so the tests do not leave open handles that would explain a hang. The five tests follow the five spec scenarios they name. The accept replays the change through every gate, so a lint or test failure on head would still be caught and would use up the accept.

---

## Q-006: Task 4.2: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 4.2
- **Kind:** harness
- **Asked:** 2026-11-11T09:56Z by claude-sonnet, run r-20261111T0816Z-8c7f, task 4.2
- **Criteria:** C-068f45cf (tool-invocation › Untrusted data reaches the policy as untrusted › A missing taint, an untrusted read and a rewriting pre-hook), C-6f15197c (tool-invocation › Grants bind to the confirmed node and rules see approvals › Exit 16 and 21, old fingerprint and payment above 1000), C-9b030af8 (tool-invocation › A live run stops at a denied call › A policy error at pay fails the run), C-9baab7e2 (tool-invocation › A live run stops at a denied call › An ungranted pay is denied in a run with nothing sent), C-a6f9dbd3 (tool-invocation › A hook call is checked as a hook › hooked-pay with a node grant and then a hook rule)

### Context
L4 could not run the pre-satisfied check of task 4.2, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/runtimes/invoke/policy-runs.db.test.ts is not a Python file; the test-base-run run wrote no readable report (timed out after 1800s)
Runs: test-base-run
Kept real: nothing
Tests: src.runtimes.invoke.policy-runs.db.test.ts::C-068f45cf a missing taint, an untrusted read and a rewriting pre-hook, src.runtimes.invoke.policy-runs.db.test.ts::C-6f15197c exit 16 and 21, old fingerprint and payment above 1000, src.runtimes.invoke.policy-runs.db.test.ts::C-9b030af8 a policy error at pay fails the run, src.runtimes.invoke.policy-runs.db.test.ts::C-9baab7e2 an ungranted pay is denied in a run with nothing sent, src.runtimes.invoke.policy-runs.db.test.ts::C-a6f9dbd3 hooked-pay with a node grant and then a hook rule

Changes the replay applies (1 files):
    added src/runtimes/invoke/policy-runs.db.test.ts

Source of the tests (redacted; at most 40 lines each):
src.runtimes.invoke.policy-runs.db.test.ts::C-068f45cf a missing taint, an untrusted read and a rewriting pre-hook:
    test("C-068f45cf a missing taint, an untrusted read and a rewriting pre-hook", async () => {
      const h = await openHarness();
      try {
        for (const tool of ALL_TOOLS) {
          await settled(`grant ${tool}`, () =>
            h.grant({ subject: { kind: "role", role: "author" }, tool, scope: { kind: "any_step" }, args: [] }),
          );
        }
        await settled("deploy", () => h.deploy(""));
    
        const absent = await authorizeFor(h, "r_a", undefined, undefined, 12.5);
        const empty = await authorizeFor(h, "r_b", [], undefined, 12.5);
        const extracted = await authorizeFor(h, "r_c", ["extracted"], undefined, 12.5);
        assert.deepEqual([absent.allowed, empty.allowed, extracted.allowed], [false, true, true]);
        const absentRows = await h.decisions("r_a");
        assert.deepEqual(decisionIds(absentRows), [absent.decisionId]);
        assert.deepEqual(absentRows[0]?.reasons, ["platform-forbid-untrusted-egress"]);
    
        const r1 = await settled("untrusted-into-write runs", () =>
          h.run("HU", { invoice_id: "INV-1001" }, "r_1"),
        );
        assert.equal(r1.state, "failed");
        const err1 = r1.error as { code?: string; node?: string; details?: Record<string, string> } | null;
        assert.equal(err1?.code, "INTERPRETER_TOOL_DENIED");
        assert.equal(err1?.node, "flag");
        assert.equal(err1?.details?.["reason"], "policy");
        const rows1 = await h.decisions("r_1");
        const deny1 = rows1[rows1.length - 1];
        assert.ok(deny1 !== undefined);
        assert.equal(deny1.decision, "deny");
        assert.equal(deny1.decisionId, err1?.details?.["decisionId"]);
        assert.deepEqual(deny1.reasons, ["platform-forbid-untrusted-egress"]);
        assert.equal(await h.intents("r_1"), 0);
        assert.deepEqual(
          h.tools.calls().filter((c) => c.callHeader?.startsWith("r_1:")).map((c) => c.ref),
          ["invoices.get@1"],
        );
    
        const r2 = await settled("pre-taint-pay runs", () => h.run("HV", INPUT, "r_2"));
        assert.equal(r2.state, "failed");
    [cut: 20 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-6f15197c exit 16 and 21, old fingerprint and payment above 1000:
    test("C-6f15197c exit 16 and 21, old fingerprint and payment above 1000", async () => {
      const first = await openHarness();
      try {
        await settled("grant lookup", () => first.grant(G_LOOKUP));
        await settled("grant pay", () => first.grant({ ...G_PAY, versionHash: first.hashes.H1 }));
        await settled("deploy", () => first.deploy(""));
        const r1 = await settled("H2 runs", () => first.run("H2", INPUT, "r_1"));
        assert.equal(r1.state, "failed");
        const err = r1.error as { code?: string; node?: string; details?: Record<string, string> } | null;
        assert.equal(err?.code, "INTERPRETER_TOOL_DENIED");
        assert.equal(err?.node, "pay");
        assert.equal(err?.details?.["reason"], "policy");
        const rows = await first.decisions("r_1");
        const deny = rows[rows.length - 1];
        assert.ok(deny !== undefined);
        assert.equal(deny.decision, "deny");
        assert.deepEqual(deny.reasons, []);
      } finally {
        await first.close();
      }
    
      const h = await openHarness();
      try {
        await settled("grant lookup", () => h.grant(G_LOOKUP));
        const gPay = await settled("grant pay", () =>
          h.grant({ ...G_PAY, versionHash: h.hashes.H1, confirm: h.hashes.H2 }),
        );
        await settled("deploy", () => h.deploy(""));
        const r2 = await settled("H2 runs", () => h.run("H2", INPUT, "r_2"));
        assert.equal(r2.state, "completed");
    
        await settled("deploy FORBID", () => h.deploy(FORBID));
        const r3 = await settled("H1 runs at 2450", () => h.run("H1", { ...INPUT, amount: 2450 }, "r_3"));
        assert.equal(r3.state, "failed");
        const err3 = r3.error as { node?: string; details?: Record<string, string> } | null;
        assert.equal(err3?.node, "pay");
        const rows3 = await h.decisions("r_3");
        const deny3 = rows3[rows3.length - 1];
        assert.ok(deny3 !== undefined);
        assert.equal(deny3.decision, "deny");
    [cut: 40 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-9b030af8 a policy error at pay fails the run:
    test("C-9b030af8 a policy error at pay fails the run", async () => {
      const policy: NonNullable<HarnessWrap["policy"]> = (real) =>
        ({
          engine: Object.assign(Object.create(real.engine) as object, {
            check: async (req: PolicyRequest) => {
              if (!JSON.stringify(req.resource).includes("/pay")) {
                return real.engine.check(req);
              }
              return {
                decision: "deny",
                decisionId: "dec_e6",
                decidedAt: T0,
                reasons: [],
                errors: ["POLICY_SET_UNAVAILABLE"],
                policySetVersion: real.engine.policySetVersion,
              };
            },
          }),
          toolArgs: (tenantId: string) => real.toolArgs(tenantId),
          reload: (tenantId: string) => real.reload(tenantId),
        }) as unknown as PolicyRuntime;
      const h = await openHarness({ policy });
      try {
        await settled("grant", () => h.grant(G_LOOKUP));
        await settled("deploy", () => h.deploy(""));
        const run = await settled("h.run resolves", () => h.run("H1", INPUT, "r_8"));
        assert.equal(run.state, "failed");
        assert.deepEqual(run.error, {
          code: "INTERPRETER_TOOL_DENIED",
          message: 'tool call of "pay" is not permitted (policy_error)',
          node: "pay",
          details: { reason: "policy_error", decisionId: "dec_e6", errorCount: "1" },
        });
        assert.ok(!JSON.stringify(run.error).includes("POLICY_SET_UNAVAILABLE"));
    
        const rows = await h.decisions("r_8");
        assert.deepEqual(
          rows.map((r) => [r.nodeId, r.decision]),
          [
            ["lookup", "allow"],
    [cut: 18 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-9baab7e2 an ungranted pay is denied in a run with nothing sent:
    test("C-9baab7e2 an ungranted pay is denied in a run with nothing sent", async () => {
      const h = await openHarness();
      try {
        await settled("grant", () => h.grant(G_LOOKUP));
        await settled("deploy", () => h.deploy(""));
        const run = await settled("h.run resolves", () => h.run("H1", INPUT, "r_2"));
        assert.equal(run.state, "failed");
    
        const rows = await h.decisions("r_2");
        assert.deepEqual(
          rows.map((r) => [r.nodeId, r.decision]),
          [
            ["lookup", "allow"],
            ["pay", "deny"],
          ],
        );
        const deny = rows[1];
        assert.ok(deny !== undefined);
        assert.deepEqual(deny.reasons, []);
        assert.deepEqual(deny.errors, []);
        assert.equal(deny.permit, null);
        assert.deepEqual(run.error, {
          code: "INTERPRETER_TOOL_DENIED",
          message: 'tool call of "pay" is not permitted (policy)',
          node: "pay",
          details: { reason: "policy", decisionId: deny.decisionId },
        });
    
        const payRow = finalRowOf(await stepsOf(h, "r_2"), "pay");
        assert.ok(payRow !== undefined);
        assert.equal(payRow.state, "failed");
        assert.equal(payRow.policyDecisionId, deny.decisionId);
        assert.equal(await h.intents("r_2"), 0);
        assert.equal(h.tools.calls().length, 1);
        assert.deepEqual(
          h.gateway.calls.map((c) => (c as { op: string }).op),
          ["requestToken", "send"],
        );
      } finally {
        await h.close();
    [cut: 2 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-a6f9dbd3 hooked-pay with a node grant and then a hook rule:
    test("C-a6f9dbd3 hooked-pay with a node grant and then a hook rule", async () => {
      const h = await openHarness();
      try {
        await settled("grant lookup", () => h.grant(G_LOOKUP));
        await settled("grant pay", () => h.grant({ ...G_PAYH, versionHash: h.hashes.HP }));
        await settled("deploy", () => h.deploy(""));
    
        const r1 = await settled("hooked-pay runs", () => h.run("HP", INPUT, "r_1"));
        assert.equal(r1.state, "failed");
        const rows1 = await h.decisions("r_1");
        assert.equal(rows1.length, 3);
        const hook1 = rows1[2];
        assert.ok(hook1 !== undefined);
        assert.deepEqual(r1.error, {
          code: "INTERPRETER_TOOL_DENIED",
          message: 'tool call of "pay" is not permitted (policy)',
          node: "pay",
          details: { reason: "policy", decisionId: hook1.decisionId, hook: "pay:post:notify" },
        });
        assert.equal(hook1.resource, 'Block::"tenant_a/hooked-pay/pay:post:notify"');
        assert.equal(hook1.nodeId, "pay");
        assert.equal(hook1.decision, "deny");
        assert.deepEqual(hook1.reasons, []);
        assert.equal(h.tools.calls().filter((c) => c.ref === "erp.create_payment@1").length, 1);
        const pay1 = finalRowOf(await stepsOf(h, "r_1"), "pay");
        assert.ok(pay1 !== undefined);
        assert.equal(pay1.state, "failed");
        assert.equal(pay1.policyDecisionId, rows1[1]?.decisionId);
    
        await settled("deploy HOOK_OK", () => h.deploy(HOOK_OK));
        const r2 = await settled("hooked-pay runs again", () => h.run("HP", INPUT, "r_2"));
        assert.equal(r2.state, "completed");
        const rows2 = await h.decisions("r_2");
        assert.deepEqual(
          rows2.map((r) => r.decision),
          ["allow", "allow", "allow"],
        );
        assert.deepEqual(rows2[2]?.reasons, ["t-hook-send-ok"]);
        assert.equal(rows2[2]?.resource, 'Block::"tenant_a/hooked-pay/pay:post:notify"');
        const slack = h.tools.calls().filter((c) => c.callHeader === "r_2:pay:post:notify:1");
    [cut: 10 more lines]

Diff of src/runtimes/invoke/policy-runs.db.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/runtimes/invoke/policy-runs.db.test.ts b/src/runtimes/invoke/policy-runs.db.test.ts
    new file mode 100644
    index 0000000..1eba889
    --- /dev/null
    +++ b/src/runtimes/invoke/policy-runs.db.test.ts
    @@ -0,0 +1,434 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import type { StepContext, ToolCall } from "../../interpreter/index.ts";
    +import type { PolicyRuntime } from "../../grants/index.ts";
    +import type { PolicyDecisionRecord, PolicyRequest } from "../../pdp/index.ts";
    +import { createRunStore } from "../../runs/index.ts";
    +import type { RunRecord, StepRecord } from "../../runs/index.ts";
    +import { invokeHarness } from "../../../test/support/invoke-runs/harness.ts";
    +import type { HarnessWrap, InvokeHarness } from "../../../test/support/invoke-runs/harness.ts";
    +
    +const T0 = "2026-11-06T10:00:00.000Z";
    +const INPUT = { vendor_name: "Acme GmbH", amount: 12.5 };
    +const PAY_IDEM_KEY_HOOK = "ik1_b67e1caff43c8cbc2b72758a1870219a8375cace7325d2fd5ae425acb8701828";
    +
    +const G_LOOKUP = {
    +  subject: { kind: "role", role: "author" },
    +  tool: "acme.lookup_vendor@1",
    +  scope: { kind: "any_step" },
    +  args: [],
    +};
    +
    +const G_PAY = {
    +  subject: { kind: "role", role: "author" },
    +  tool: "acme.create_payment@1",
    +  scope: { kind: "node", flowId: "read-then-pay", nodeId: "pay" },
    +  args: [],
    +};
    +
    +const G_PAYH = {
    +  ...G_PAY,
    +  scope: { kind: "node", flowId: "hooked-pay", nodeId: "pay" },
    +};
    +
    [cut: 400 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-tool-invocation/.l4/held/4.2-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-tool-invocation/.l4/held/4.2-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: accept: The check cannot decide for reasons that lie in the harness, not in the change. The zero-value run varies Python files only and this is a TypeScript repository, and the base run stopped at the 1800 second gate timeout, which a retry would meet again. The plan's own text for task 4.2 says it adds no green code because every name its tests call exists after 4.1, so red is expected to report the tests as already satisfied. The names the five tests call are all on head: the harness's run starts a live run and drives executeRun over memory ops with the live invoker, grant, deploy, decisions, intents and close are implemented, and the invoke path has authorize and invoke with the policy, policy_error, hook and unauthorized denials the tests assert. The five tests follow the five spec scenarios they name, with the assertions on decision rows, run errors, step rows, intents, fake tool calls and gateway calls that the scenarios state. The accept replays the change through every gate, so a lint, typecheck or test failure on head would still be caught and would use up the accept.

---

## Q-007: Task 4.2: the pre-satisfied check could not decide

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): I cannot confirm that the five held tests pass on head, which is what an accept would assert. The run's own record of this attempt shows the full test gate with the new file applied at 2309 tests, 2308 passed and 1 failed, against a baseline of 2304 all passing; the only added tests are these five,
- **Blocking tasks:** 4.2
- **Kind:** harness
- **Asked:** 2026-11-11T11:22Z by deepseek-free, run r-20261111T1000Z-af7b, task 4.2
- **Criteria:** C-068f45cf (tool-invocation › Untrusted data reaches the policy as untrusted › A missing taint, an untrusted read and a rewriting pre-hook), C-6f15197c (tool-invocation › Grants bind to the confirmed node and rules see approvals › Exit 16 and 21, old fingerprint and payment above 1000), C-9b030af8 (tool-invocation › A live run stops at a denied call › A policy error at pay fails the run), C-9baab7e2 (tool-invocation › A live run stops at a denied call › An ungranted pay is denied in a run with nothing sent), C-a6f9dbd3 (tool-invocation › A hook call is checked as a hook › hooked-pay with a node grant and then a hook rule)

### Context
L4 could not run the pre-satisfied check of task 4.2, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/runtimes/invoke/policy-runs.db.test.ts is not a Python file; the test-base-run run wrote no readable report (timed out after 1800s)
Runs: test-base-run
Kept real: nothing
Tests: src.runtimes.invoke.policy-runs.db.test.ts::C-068f45cf a missing taint, an untrusted read and a rewriting pre-hook, src.runtimes.invoke.policy-runs.db.test.ts::C-6f15197c exit 16 and 21, old fingerprint and payment above 1000, src.runtimes.invoke.policy-runs.db.test.ts::C-9b030af8 a policy error at pay fails the run, src.runtimes.invoke.policy-runs.db.test.ts::C-9baab7e2 an ungranted pay is denied in a run with nothing sent, src.runtimes.invoke.policy-runs.db.test.ts::C-a6f9dbd3 hooked-pay with a node grant and then a hook rule

Changes the replay applies (1 files):
    added src/runtimes/invoke/policy-runs.db.test.ts

Source of the tests (redacted; at most 40 lines each):
src.runtimes.invoke.policy-runs.db.test.ts::C-068f45cf a missing taint, an untrusted read and a rewriting pre-hook:
    test("C-068f45cf a missing taint, an untrusted read and a rewriting pre-hook", async () => {
      const h = await openHarness();
      try {
        for (const tool of ALL_TOOLS) {
          await settled(`grant ${tool}`, () =>
            h.grant({ subject: { kind: "role", role: "author" }, tool, scope: { kind: "any_step" }, args: [] }),
          );
        }
        await settled("deploy", () => h.deploy(""));
    
        const absent = await authorizeFor(h, "r_a", undefined, undefined, 12.5);
        const empty = await authorizeFor(h, "r_b", [], undefined, 12.5);
        const extracted = await authorizeFor(h, "r_c", ["extracted"], undefined, 12.5);
        assert.deepEqual([absent.allowed, empty.allowed, extracted.allowed], [false, true, true]);
        const absentRows = await h.decisions("r_a");
        assert.deepEqual(decisionIds(absentRows), [absent.decisionId]);
        assert.deepEqual(absentRows[0]?.reasons, ["platform-forbid-untrusted-egress"]);
    
        const r1 = await settled("untrusted-into-write runs", () =>
          h.run("HU", { invoice_id: "INV-1001" }, "r_1"),
        );
        assert.equal(r1.state, "failed");
        const err1 = r1.error as { code?: string; node?: string; details?: Record<string, string> } | null;
        assert.equal(err1?.code, "INTERPRETER_TOOL_DENIED");
        assert.equal(err1?.node, "flag");
        assert.equal(err1?.details?.["reason"], "policy");
        const rows1 = await h.decisions("r_1");
        const deny1 = rows1[rows1.length - 1];
        assert.ok(deny1 !== undefined);
        assert.equal(deny1.decision, "deny");
        assert.equal(deny1.decisionId, err1?.details?.["decisionId"]);
        assert.deepEqual(deny1.reasons, ["platform-forbid-untrusted-egress"]);
        assert.equal(await h.intents("r_1"), 0);
        assert.deepEqual(
          h.tools.calls().filter((c) => c.callHeader?.startsWith("r_1:")).map((c) => c.ref),
          ["invoices.get@1"],
        );
    
        const r2 = await settled("pre-taint-pay runs", () => h.run("HV", INPUT, "r_2"));
        assert.equal(r2.state, "failed");
    [cut: 20 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-6f15197c exit 16 and 21, old fingerprint and payment above 1000:
    test("C-6f15197c exit 16 and 21, old fingerprint and payment above 1000", async () => {
      const first = await openHarness();
      try {
        await settled("grant lookup", () => first.grant(G_LOOKUP));
        await settled("grant pay", () => first.grant({ ...G_PAY, versionHash: first.hashes.H1 }));
        await settled("deploy", () => first.deploy(""));
        const r1 = await settled("H2 runs", () => first.run("H2", INPUT, "r_1"));
        assert.equal(r1.state, "failed");
        const err = r1.error as { code?: string; node?: string; details?: Record<string, string> } | null;
        assert.equal(err?.code, "INTERPRETER_TOOL_DENIED");
        assert.equal(err?.node, "pay");
        assert.equal(err?.details?.["reason"], "policy");
        const rows = await first.decisions("r_1");
        const deny = rows[rows.length - 1];
        assert.ok(deny !== undefined);
        assert.equal(deny.decision, "deny");
        assert.deepEqual(deny.reasons, []);
      } finally {
        await first.close();
      }
    
      const h = await openHarness();
      try {
        await settled("grant lookup", () => h.grant(G_LOOKUP));
        const gPay = await settled("grant pay", () =>
          h.grant({ ...G_PAY, versionHash: h.hashes.H1, confirm: h.hashes.H2 }),
        );
        await settled("deploy", () => h.deploy(""));
        const r2 = await settled("H2 runs", () => h.run("H2", INPUT, "r_2"));
        assert.equal(r2.state, "completed");
    
        await settled("deploy FORBID", () => h.deploy(FORBID));
        const r3 = await settled("H1 runs at 2450", () => h.run("H1", { ...INPUT, amount: 2450 }, "r_3"));
        assert.equal(r3.state, "failed");
        const err3 = r3.error as { node?: string; details?: Record<string, string> } | null;
        assert.equal(err3?.node, "pay");
        const rows3 = await h.decisions("r_3");
        const deny3 = rows3[rows3.length - 1];
        assert.ok(deny3 !== undefined);
        assert.equal(deny3.decision, "deny");
    [cut: 40 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-9b030af8 a policy error at pay fails the run:
    test("C-9b030af8 a policy error at pay fails the run", async () => {
      const policy: NonNullable<HarnessWrap["policy"]> = (real) =>
        ({
          engine: Object.assign(Object.create(real.engine) as object, {
            check: async (req: PolicyRequest) => {
              if (!JSON.stringify(req.resource).includes("/pay")) {
                return real.engine.check(req);
              }
              return {
                decision: "deny",
                decisionId: "dec_e6",
                decidedAt: T0,
                reasons: [],
                errors: ["POLICY_SET_UNAVAILABLE"],
                policySetVersion: real.engine.policySetVersion,
              };
            },
          }),
          toolArgs: (tenantId: string) => real.toolArgs(tenantId),
          reload: (tenantId: string) => real.reload(tenantId),
        }) as unknown as PolicyRuntime;
      const h = await openHarness({ policy });
      try {
        await settled("grant", () => h.grant(G_LOOKUP));
        await settled("deploy", () => h.deploy(""));
        const run = await settled("h.run resolves", () => h.run("H1", INPUT, "r_8"));
        assert.equal(run.state, "failed");
        assert.deepEqual(run.error, {
          code: "INTERPRETER_TOOL_DENIED",
          message: 'tool call of "pay" is not permitted (policy_error)',
          node: "pay",
          details: { reason: "policy_error", decisionId: "dec_e6", errorCount: "1" },
        });
        assert.ok(!JSON.stringify(run.error).includes("POLICY_SET_UNAVAILABLE"));
    
        const rows = await h.decisions("r_8");
        assert.deepEqual(
          rows.map((r) => [r.nodeId, r.decision]),
          [
            ["lookup", "allow"],
    [cut: 18 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-9baab7e2 an ungranted pay is denied in a run with nothing sent:
    test("C-9baab7e2 an ungranted pay is denied in a run with nothing sent", async () => {
      const h = await openHarness();
      try {
        await settled("grant", () => h.grant(G_LOOKUP));
        await settled("deploy", () => h.deploy(""));
        const run = await settled("h.run resolves", () => h.run("H1", INPUT, "r_2"));
        assert.equal(run.state, "failed");
    
        const rows = await h.decisions("r_2");
        assert.deepEqual(
          rows.map((r) => [r.nodeId, r.decision]),
          [
            ["lookup", "allow"],
            ["pay", "deny"],
          ],
        );
        const deny = rows[1];
        assert.ok(deny !== undefined);
        assert.deepEqual(deny.reasons, []);
        assert.deepEqual(deny.errors, []);
        assert.equal(deny.permit, null);
        assert.deepEqual(run.error, {
          code: "INTERPRETER_TOOL_DENIED",
          message: 'tool call of "pay" is not permitted (policy)',
          node: "pay",
          details: { reason: "policy", decisionId: deny.decisionId },
        });
    
        const payRow = finalRowOf(await stepsOf(h, "r_2"), "pay");
        assert.ok(payRow !== undefined);
        assert.equal(payRow.state, "failed");
        assert.equal(payRow.policyDecisionId, deny.decisionId);
        assert.equal(await h.intents("r_2"), 0);
        assert.equal(h.tools.calls().length, 1);
        assert.deepEqual(
          h.gateway.calls.map((c) => (c as { op: string }).op),
          ["requestToken", "send"],
        );
      } finally {
        await h.close();
    [cut: 2 more lines]
src.runtimes.invoke.policy-runs.db.test.ts::C-a6f9dbd3 hooked-pay with a node grant and then a hook rule:
    test("C-a6f9dbd3 hooked-pay with a node grant and then a hook rule", async () => {
      const h = await openHarness();
      try {
        await settled("grant lookup", () => h.grant(G_LOOKUP));
        await settled("grant pay", () => h.grant({ ...G_PAYH, versionHash: h.hashes.HP }));
        await settled("deploy", () => h.deploy(""));
    
        const r1 = await settled("hooked-pay runs", () => h.run("HP", INPUT, "r_1"));
        assert.equal(r1.state, "failed");
        const rows1 = await h.decisions("r_1");
        assert.equal(rows1.length, 3);
        const hook1 = rows1[2];
        assert.ok(hook1 !== undefined);
        assert.deepEqual(r1.error, {
          code: "INTERPRETER_TOOL_DENIED",
          message: 'tool call of "pay" is not permitted (policy)',
          node: "pay",
          details: { reason: "policy", decisionId: hook1.decisionId, hook: "pay:post:notify" },
        });
        assert.equal(hook1.resource, 'Block::"tenant_a/hooked-pay/pay:post:notify"');
        assert.equal(hook1.nodeId, "pay");
        assert.equal(hook1.decision, "deny");
        assert.deepEqual(hook1.reasons, []);
        assert.equal(h.tools.calls().filter((c) => c.ref === "erp.create_payment@1").length, 1);
        const pay1 = finalRowOf(await stepsOf(h, "r_1"), "pay");
        assert.ok(pay1 !== undefined);
        assert.equal(pay1.state, "failed");
        assert.equal(pay1.policyDecisionId, rows1[1]?.decisionId);
    
        await settled("deploy HOOK_OK", () => h.deploy(HOOK_OK));
        const r2 = await settled("hooked-pay runs again", () => h.run("HP", INPUT, "r_2"));
        assert.equal(r2.state, "completed");
        const rows2 = await h.decisions("r_2");
        assert.deepEqual(
          rows2.map((r) => r.decision),
          ["allow", "allow", "allow"],
        );
        assert.deepEqual(rows2[2]?.reasons, ["t-hook-send-ok"]);
        assert.equal(rows2[2]?.resource, 'Block::"tenant_a/hooked-pay/pay:post:notify"');
        const slack = h.tools.calls().filter((c) => c.callHeader === "r_2:pay:post:notify:1");
    [cut: 10 more lines]

Diff of src/runtimes/invoke/policy-runs.db.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/runtimes/invoke/policy-runs.db.test.ts b/src/runtimes/invoke/policy-runs.db.test.ts
    new file mode 100644
    index 0000000..537f869
    --- /dev/null
    +++ b/src/runtimes/invoke/policy-runs.db.test.ts
    @@ -0,0 +1,437 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import type { StepContext, ToolCall } from "../../interpreter/index.ts";
    +import type { PolicyRuntime } from "../../grants/index.ts";
    +import type { PolicyDecisionRecord, PolicyRequest } from "../../pdp/index.ts";
    +import { createRunStore } from "../../runs/index.ts";
    +import type { RunRecord, StepRecord } from "../../runs/index.ts";
    +import { invokeHarness } from "../../../test/support/invoke-runs/harness.ts";
    +import type { HarnessWrap, InvokeHarness } from "../../../test/support/invoke-runs/harness.ts";
    +
    +const T0 = "2026-11-06T10:00:00.000Z";
    +const INPUT = { vendor_name: "Acme GmbH", amount: 12.5 };
    +const PAY_IDEM_KEY_HOOK = "ik1_b67e1caff43c8cbc2b72758a1870219a8375cace7325d2fd5ae425acb8701828";
    +
    +const G_LOOKUP = {
    +  subject: { kind: "role", role: "author" },
    +  tool: "acme.lookup_vendor@1",
    +  scope: { kind: "any_step" },
    +  args: [],
    +};
    +
    +const G_PAY = {
    +  subject: { kind: "role", role: "author" },
    +  tool: "acme.create_payment@1",
    +  scope: { kind: "node", flowId: "read-then-pay", nodeId: "pay" },
    +  args: [],
    +};
    +
    +const G_PAYH = {
    +  ...G_PAY,
    +  scope: { kind: "node", flowId: "hooked-pay", nodeId: "pay" },
    +};
    +
    [cut: 403 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-tool-invocation/.l4/held/4.2-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-tool-invocation/.l4/held/4.2-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: verified on the unit head d91a68e0 with the held patch applied (sha256 21050e9b…ccc605ef): the five tests pass (node --test with the repo's global setup, 5/5), and `tsc -p tsconfig.json --noEmit` and the repo-wide `eslint --max-warnings=0 .` exit 0, so the replay's typecheck and lint gates (which failed the Q-006 replay) hold. The one failure in this attempt's test gate (2308 of 2309) is not one of the five: L4 put all five criteria into the pre-satisfied check, which takes only tests that passed at red. The likely failure is the known flaky src/interpreter/workflow.db.test.ts::C-b56c7793 (inferred, the gate log is not readable here): it broke the Q-005 replay at 08:28Z and add-code-sandbox's green on 2026-11-06 with the same excerpt, without this file; it passed 5/5 locally run together with this file. A retry cannot decide: the zero-value run varies Python files only and the base run hits its 1800s limit on every attempt. tasks.md says 4.2 adds no green code and expects already_satisfied. Answered by the owner's delegate (Claude Code).
