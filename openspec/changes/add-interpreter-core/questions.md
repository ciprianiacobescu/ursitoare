# Questions — add-interpreter-core

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
| Q-001 | open | 2.3 | harness | Task 2.3: the pre-satisfied check could not decide |
<!-- l4:index:end -->

---

## Q-001: Task 2.3: the pre-satisfied check could not decide

- **Status:** open
- **Blocking tasks:** 2.3
- **Kind:** harness
- **Asked:** 2026-11-04T22:39Z by claude-sonnet, run r-20261104T2014Z-19d3, task 2.3
- **Criteria:** C-9d40929b (interpreter › An effectful block runs inside the effect gate in every mode › Gate order, decisions and failures)

### Context
L4 could not run the pre-satisfied check of task 2.3, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/interpreter/runtimes/block-effect.test.ts is not a Python file; the base run: its new tests fail against the unit base code only by an error, not by assertion
Runs: test-base-run
Kept real: nothing
Tests: src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a rejecting after maps to TOOL_FAILED without the message, src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a rejecting before maps to TOOL_FAILED without invoking, src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a rejecting invoker maps to TOOL_FAILED and skips after, src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a reuse decision skips the invoker and still calls after, src.interpreter.runtimes.block-effect.test.ts::C-9d40929b an invalid output still logs after and then is refused, src.interpreter.runtimes.block-effect.test.ts::C-9d40929b an invoke decision runs before, invoke and after in order, src.interpreter.runtimes.block-effect.test.ts::C-9d40929b an unknown decision fails the node after before only, src.interpreter.runtimes.block-effect.test.ts::C-9d40929b each gate call runs in the step named after the node, src.interpreter.runtimes.block-effect.test.ts::C-9d40929b the no-effect gate invokes with a null idemKey

Changes the replay applies (1 files):
    added src/interpreter/runtimes/block-effect.test.ts

Source of the tests (redacted; at most 40 lines each):
src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a rejecting after maps to TOOL_FAILED without the message:
    test("C-9d40929b a rejecting after maps to TOOL_FAILED without the message", async () => {
      const r = rig();
      const events: string[] = [];
      const effects = loggingGate(events, { action: "invoke", idemKey: "ik_1" }, { after: E_GATE });
      const error = await rejection(run(r.services(effects, loggingInvoker(events, { output: PAID }))));
      assert.equal(error.code, "INTERPRETER_TOOL_FAILED");
      assert.ok(!error.message.includes("gate secret"));
      assert.ok(events.some((e) => e.startsWith("after ")));
    });
src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a rejecting before maps to TOOL_FAILED without invoking:
    test("C-9d40929b a rejecting before maps to TOOL_FAILED without invoking", async () => {
      const r = rig();
      const events: string[] = [];
      const effects = loggingGate(events, { action: "invoke", idemKey: "ik_1" }, { before: E_GATE });
      const error = await rejection(run(r.services(effects, loggingInvoker(events, { output: PAID }))));
      assert.equal(error.code, "INTERPRETER_TOOL_FAILED");
      assert.ok(!error.message.includes("gate secret"));
      assert.ok(!events.some((e) => e.startsWith("invoke ")));
      assert.deepEqual(r.ops.executed, ["pay"]);
    });
src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a rejecting invoker maps to TOOL_FAILED and skips after:
    test("C-9d40929b a rejecting invoker maps to TOOL_FAILED and skips after", async () => {
      const r = rig();
      const events: string[] = [];
      const effects = loggingGate(events, { action: "invoke", idemKey: "ik_1" });
      const error = await rejection(
        run(r.services(effects, loggingInvoker(events, new Error("boom")))),
      );
      assert.equal(error.code, "INTERPRETER_TOOL_FAILED");
      assert.ok(!error.message.includes("boom"));
      assert.ok(!events.some((e) => e.startsWith("after ")));
    });
src.interpreter.runtimes.block-effect.test.ts::C-9d40929b a reuse decision skips the invoker and still calls after:
    test("C-9d40929b a reuse decision skips the invoker and still calls after", async () => {
      const r = rig();
      const events: string[] = [];
      const effects = loggingGate(events, {
        action: "reuse",
        idemKey: "ik_1",
        result: { output: REUSED },
      });
      const outcome = await run(r.services(effects, loggingInvoker(events, { output: PAID })), "live");
      const withKey = { ...ctxFor("live"), idemKey: "ik_1" };
      assert.deepEqual(events, [
        `before ${JSON.stringify([CALL, ctxFor("live")])}`,
        `after ${JSON.stringify([CALL, withKey, { output: REUSED }])}`,
      ]);
      assert.deepEqual(outcome.output, REUSED);
      assert.equal(outcome.next, "done");
    });
src.interpreter.runtimes.block-effect.test.ts::C-9d40929b an invalid output still logs after and then is refused:
    test("C-9d40929b an invalid output still logs after and then is refused", async () => {
      const r = rig();
      const events: string[] = [];
      const effects = loggingGate(events, { action: "invoke", idemKey: "ik_1" });
      const invoker = loggingInvoker(events, { output: { payment_id: "p" } });
      const error = await rejection(run(r.services(effects, invoker)));
      assert.equal(error.code, "INTERPRETER_OUTPUT_INVALID");
      assert.equal(error.node, "pay");
      assert.ok(events[events.length - 1]?.startsWith("after "));
      assert.equal(events.filter((e) => e.startsWith("after ")).length, 1);
    });
src.interpreter.runtimes.block-effect.test.ts::C-9d40929b an invoke decision runs before, invoke and after in order:
    test("C-9d40929b an invoke decision runs before, invoke and after in order", async () => {
      const r = rig();
      const events: string[] = [];
      const effects = loggingGate(events, { action: "invoke", idemKey: "ik_1" });
      const invoker = loggingInvoker(events, { output: PAID });
      const outcome = await run(r.services(effects, invoker), "mock");
      const withKey = { ...ctxFor("mock"), idemKey: "ik_1" };
      assert.deepEqual(events, [
        `before ${JSON.stringify([CALL, ctxFor("mock")])}`,
        `invoke ${JSON.stringify([CALL, withKey])}`,
        `after ${JSON.stringify([CALL, withKey, { output: PAID }])}`,
      ]);
      assert.deepEqual(outcome, { output: PAID, outcome: null, next: "done", end: null });
      assert.deepEqual(r.ops.executed, ["pay", "pay#done"]);
    });
src.interpreter.runtimes.block-effect.test.ts::C-9d40929b an unknown decision fails the node after before only:
    test("C-9d40929b an unknown decision fails the node after before only", async () => {
      const r = rig();
      const events: string[] = [];
      const effects = loggingGate(events, { action: "unknown", idemKey: "ik_1" });
      const error = await rejection(run(r.services(effects, loggingInvoker(events, { output: PAID }))));
      assert.equal(error.code, "INTERPRETER_EFFECT_UNKNOWN");
      assert.equal(error.node, "pay");
      assert.equal(events.length, 1);
      assert.ok(events[0]?.startsWith("before "));
      assert.deepEqual(r.ops.executed, ["pay"]);
    });
src.interpreter.runtimes.block-effect.test.ts::C-9d40929b each gate call runs in the step named after the node:
    test("C-9d40929b each gate call runs in the step named after the node", async () => {
      const steps: string[] = [];
      const r = rig();
      const base = r.services(NO_EFFECT_GATE, loggingInvoker([], { output: PAID }));
      const tagged: NodeServices = {
        ...base,
        effects: {
          async before(call, ctx) {
            steps.push("before");
            return NO_EFFECT_GATE.before(call, ctx);
          },
          async after(call, ctx, result) {
            steps.push("after");
            return NO_EFFECT_GATE.after(call, ctx, result);
          },
        },
      };
      await run(tagged);
      assert.deepEqual(steps, ["before", "after"]);
      assert.deepEqual(r.ops.executed, ["pay", "pay#done"]);
    });
src.interpreter.runtimes.block-effect.test.ts::C-9d40929b the no-effect gate invokes with a null idemKey:
    test("C-9d40929b the no-effect gate invokes with a null idemKey", async () => {
      const r = rig();
      const seen: StepContext[] = [];
      const outcome = await run(r.services(NO_EFFECT_GATE, loggingInvoker([], { output: PAID }, seen)));
      assert.deepEqual(outcome.output, PAID);
      assert.equal(seen.length, 1);
      assert.equal(seen[0]?.idemKey, null);
      assert.deepEqual(seen[0], ctxFor("mock"));
    });

Diff of src/interpreter/runtimes/block-effect.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/interpreter/runtimes/block-effect.test.ts b/src/interpreter/runtimes/block-effect.test.ts
    new file mode 100644
    index 0000000..6c11eba
    --- /dev/null
    +++ b/src/interpreter/runtimes/block-effect.test.ts
    @@ -0,0 +1,265 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import type { BlockNode, JsonValue } from "../../authoring/index.ts";
    +import { NO_EFFECT_GATE, memoryWorkflowOps, nodeRuntimeFor } from "../index.ts";
    +import type {
    +  EffectDecision,
    +  EffectGate,
    +  MemoryWorkflowOps,
    +  NodeOutcome,
    +  NodeServices,
    +  StepContext,
    +  ToolCall,
    +  ToolInvoker,
    +  ToolResult,
    +  WorkflowOps,
    +} from "../index.ts";
    +import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
    +
    +const PAY_ARGS = { vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" };
    +const PAID = { payment_id: "pay-1", status: "paid" };
    +const REUSED = { payment_id: "pay-0", status: "paid" };
    +const CATALOGUE = loadTestCatalogue();
    +
    +const NODE: BlockNode = {
    +  kind: "block",
    +  uses: "erp.create_payment@1",
    +  with: PAY_ARGS,
    +  next: "done",
    +};
    +
    +const CALL: ToolCall = { tool: "erp.create_payment@1", args: PAY_ARGS, nodeId: "pay", effectSeq: 0 };
    +
    +function ctxFor(mode: "live" | "mock" | "stub"): StepContext {
    [cut: 231 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-interpreter-core/.l4/held/2.3-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-interpreter-core/.l4/held/2.3-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
