# Questions — add-interpreter-core-fix-1

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
<!-- l4:index:end -->

---

## Q-001: Task 1.1: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** harness
- **Asked:** 2026-11-05T00:54Z by deepseek-free, run r-20261105T0040Z-f642, task 1.1
- **Criteria:** C-9d40929b (interpreter › An effectful block runs inside the effect gate in every mode › Gate order, decisions and failures), C-cb54b30e (interpreter › An effectful block runs inside the effect gate in every mode — regression 1 › task 2.3: gate-step test does not observe the active durable step)

### Context
L4 could not run the pre-satisfied check of task 1.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/interpreter/runtimes/block-effect.test.ts is not a Python file; the base run: its new tests fail against the unit base code only by an error, not by assertion
Runs: test-base-run
Kept real: nothing
Tests: src.interpreter.runtimes.block-effect.test.ts::C-9d40929b C-cb54b30e each gate and invoker call logs the step that is running

Changes the replay applies (1 files):
    modified src/interpreter/runtimes/block-effect.test.ts

Source of the tests (redacted; at most 40 lines each):
src.interpreter.runtimes.block-effect.test.ts::C-9d40929b C-cb54b30e each gate and invoker call logs the step that is running:
    test("C-9d40929b C-cb54b30e each gate and invoker call logs the step that is running", async () => {
      const r = stepRig();
      const events: string[] = [];
      const effects = stepLoggingGate(events, r.step, { action: "invoke", idemKey: "ik_1" });
      const invoker = stepLoggingInvoker(events, r.step, { output: PAID });
      const outcome = await run(r.services(effects, invoker), "mock");
      const withKey = { ...ctxFor("mock"), idemKey: "ik_1" };
      assert.deepEqual(events, [
        `pay: before ${JSON.stringify([CALL, ctxFor("mock")])}`,
        `pay: invoke ${JSON.stringify([CALL, withKey])}`,
        `pay#done: after ${JSON.stringify([CALL, withKey, { output: PAID }])}`,
      ]);
      assert.deepEqual(outcome, { output: PAID, outcome: null, next: "done", end: null });
      assert.deepEqual(r.ops.executed, ["pay", "pay#done"]);
    });

Diff of src/interpreter/runtimes/block-effect.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/interpreter/runtimes/block-effect.test.ts b/src/interpreter/runtimes/block-effect.test.ts
    index 6c11eba..15c937d 100644
    --- a/src/interpreter/runtimes/block-effect.test.ts
    +++ b/src/interpreter/runtimes/block-effect.test.ts
    @@ -123,6 +123,77 @@ function loggingInvoker(
       };
     }
     
    +interface StepRig {
    +  log: string[];
    +  ops: MemoryWorkflowOps;
    +  step: () => string;
    +  services: (effects: EffectGate, invoker: ToolInvoker) => NodeServices;
    +}
    +
    +function stepRig(): StepRig {
    +  const log: string[] = [];
    +  const base = memoryWorkflowOps("r_1");
    +  let current = "";
    +  const ops: WorkflowOps = {
    +    get workflowId() {
    +      return base.workflowId;
    +    },
    +    async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
    +      return base.runStep(name, async () => {
    +        const previous = current;
    +        current = name;
    +        try {
    +          return await fn();
    +        } finally {
    +          current = previous;
    +        }
    +      });
    +    },
    +    sleep: (ms) => base.sleep(ms),
    +  };
    +  return {
    +    log,
    +    ops: base,
    +    step: () => current,
    [cut: 65 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-interpreter-core-fix-1/.l4/held/1.1-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-interpreter-core-fix-1/.l4/held/1.1-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: Count the held test on the evidence of the real run and replay the saved change. Task 1.1 is the test-only fix of finding F-a71db6eb: the block runtime already calls EffectGate.before and the invoker inside the step named after the node and EffectGate.after inside the step named node#done, and the finding asked only that the logging gate and invoker tag each entry with the running step. The saved test does exactly that: its three expected entries and the executed list match the scenario of the fix unit's spec word for word, and it discriminates, because a runtime that called after inside the pay step would log it under pay instead of pay#done. The base run could only end in an error because the unit base is the milestone scaffold, whose bodies throw a not-implemented error, which L4 does not count as an assertion failure, and the project's own decision record says the zero-value check is Python-only so a TypeScript test of this shape is held for a person. The replay runs under every gate, and a criterion that does not discriminate still fails the attempt, so accepting here risks nothing the harness does not still guard.
