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
| Q-001 | answered | 2.3 | harness | Task 2.3: the pre-satisfied check could not decide |
| Q-002 | open | none | verdict | Finding F-a71db6eb: task 2.3: gate-step test does not observe the active durable step |
| Q-003 | answered | none | verdict | Finding F-257bab9b: Copied interpreter errors are remapped as tool failures |
| Q-004 | answered | none | verdict | Finding F-8da8966d: task 3.3 is ticked as already satisfied, but its text is not done |
<!-- l4:index:end -->

---

## Q-001: Task 2.3: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept: The claim that task 2.3 is already satisfied holds: the effect path of the block runtime is already implemented at the unit head by task 2.2's commit. In src/interpreter/runtimes/block.ts the non-read branch calls the gate's before inside the step named after the node, fails an unknown decision with INTERPRETER_EFFECT_UNKNOWN before any invoke, takes the reuse result without invoking, invokes with the decision's idemKey, then in the step named node#done calls after before the output check, and maps any gate or invoker rejection to INTERPRETER_TOOL_FAILED with the fixed message node execution failed. Traced against that code, memoryWorkflowOps (which pushes the step name before running the callback and propagates errors unchanged), InterpreterError (which carries code and node) and the test catalogue (erp.create_payment@1 has effect pay and an output schema requiring payment_id and status), all nine new tests pass without a production change. The base run could not discriminate only because the unit base is the scaffold whose stubs throw before any assertion runs, so an error rather than an assertion failure is the expected shape there. Note for the verifier: the test named each gate call runs in the step named after the node checks only the order of gate calls and the executed step names, not that after ran inside node#done as the scenario's tagged ops would; the step-tagging coverage of the criterion is weaker than the scenario describes.

---

## Q-002: Finding F-a71db6eb: task 2.3: gate-step test does not observe the active durable step

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-9d40929b).

Title: task 2.3: gate-step test does not observe the active durable step
Detail: The test named "each gate call runs in the step named after the node" sets current to the running step in its WorkflowOps wrapper, but the logging gate never reads current. It therefore cannot distinguish before and after running in the required node and node#done steps from any other steps with the same execution list.
Suggested fix: Make the logging gate record the active step name and assert before runs in pay while after runs in pay#done.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-9d40929b as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-003: Finding F-257bab9b: Copied interpreter errors are remapped as tool failures

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-e3cb0a11).

Title: Copied interpreter errors are remapped as tool failures
Detail: The durable-error rule says code-bearing interpreter errors must be recognized without instanceof because durable replay can rethrow a copied error. src/interpreter/visit.ts instead requires both a recognized code and error instanceof Error. A copied InterpreterError-like value therefore reaches the fallback and becomes INTERPRETER_TOOL_FAILED, losing its original code.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-e3cb0a11 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject The finding is correct against the design. Design Decision 9 says a thrown value is an interpreter error when its code is in InterpreterErrorCode, not by instanceof, because a workflow engine may rethrow a recorded step error as a copy whose shape is inferred and unchecked. The predicate shared by visit.ts and the block runtime requires error instanceof Error in addition to a recognised code, so a code-bearing copy that is not an Error instance falls to the fallback and becomes INTERPRETER_TOOL_FAILED with the fixed message, losing its code, node and details in the failed row and the run error. The repository does not state the shape of DBOS's replayed step error, which is exactly why the design chose a code-only rule. WHEN a step of a node runtime rethrows a value whose code is an InterpreterErrorCode but which is not an instance of Error, as a replayed copy of a recorded step error may be THEN the visit and the block runtime keep that code, node and details in the failed row and the run error instead of mapping the value to INTERPRETER_TOOL_FAILED.
---

## Q-004: Finding F-8da8966d: task 3.3 is ticked as already satisfied, but its text is not done

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it.

Title: task 3.3 is ticked as already satisfied, but its text is not done
Detail: not in this part: src/interpreter/visit.ts is required by task 3.3 and is listed in part 2.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
This finding cites no criterion: end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals, or no fix can be made from the reject.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The finding is waived: the judge saw only the part of the diff without visit.ts, and the task's text is done at the unit head. The failure test file exists with tests for both the node-failure and run-level scenarios. execute.ts holds the revisit guard that fails a twice-visited node with INTERPRETER_LOOP_LIMIT, the terminal-run shortcut that returns a terminal run after run:load, and the run-level failure mapping for a missing invoker and unloadable versions. visit.ts, the file the judge did not see, holds the node failure mapping that writes a failed row with the RunError and rethrows a fixed InterpreterError, passes durable cancellations and store write errors through unchanged, and never copies a raw tool error. Ticking 3.3 as already satisfied by the 3.2 implementation is therefore consistent with the code.
