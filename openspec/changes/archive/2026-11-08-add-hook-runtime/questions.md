# Questions — add-hook-runtime

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
| Q-001 | accepted | 1.1 | technical | src/interpreter/hooks/registry.test.ts:33-35 registers codeHookRunner a second time inside assert.doesNotThrow |
| Q-002 | answered | 3.1 | technical | Grant write access for the red step |
| Q-003 | accepted | 3.1 | technical | src/interpreter/hooks/visit-pre.test.ts:183: sandboxRuns counts the normalize node's sandbox run, giving 9, not 8 |
| Q-004 | answered | 3.3 | technical | Grant write access for the red step |
| Q-005 | answered | 3.4 | harness | Task 3.4: the pre-satisfied check could not decide |
| Q-006 | answered | 3.5 | harness | Task 3.5: the pre-satisfied check could not decide |
<!-- l4:index:end -->

---

## Q-001: src/interpreter/hooks/registry.test.ts:33-35 registers codeHookRunner a second time inside assert.doesNotThrow

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-07T20:41Z by claude-sonnet, run r-20261107T2028Z-9089, task 1.1

### Context
The first test (line 20) registers ('code', codeHookRunner). The second test (lines 33-35) registers the same runner again inside assert.doesNotThrow. It then expects a further identical call (lines 36-39) to throw HOOK_RUNNER_DUPLICATE with details.kind 'code'. The spec requires a second registration for a kind to throw HOOK_RUNNER_DUPLICATE. A correct registry throws at lines 33-35 and fails that test. No behaviour I can implement passes both tests without a hack, such as tolerating the first duplicate.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/interpreter/hooks/registry.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-hook-runtime`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/interpreter/hooks/registry.test.ts`: delete the `assert.doesNotThrow(() => { registerHookRunner("code", codeHookRunner); });` block at lines 33-35 of the second test, because the first test already registered the runner.
2. Edit `src/interpreter/hooks/registry.test.ts`: merge the second test into the first, so only the first registration sits in doesNotThrow.

### Clarifier suggestion
Edit `src/interpreter/hooks/registry.test.ts`: delete the `assert.doesNotThrow(() => { registerHookRunner("code", codeHookRunner); });` block at lines 33-35 of the second test, because the first test already registered the runner.

### Answer
<!-- write below this line -->

---

## Q-002: Grant write access for the red step

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The question asks for a change to the implementer session's tool permissions (Write/Edit denied on a new test file). Nothing in the repository settles that: the file src/interpreter/hooks/visit-pre.test.ts does not exist in the unit's head (the hooks directory holds only names, registry, actions, co
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-07T22:24Z by claude-sonnet, run r-20261107T2044Z-0cf0, task 3.1

### Context
The Write tool was denied in this session, so src/interpreter/hooks/visit-pre.test.ts cannot be created. Please allow Write/Edit on test files, or tell me how to proceed.

### Answer
<!-- write below this line -->
Write and Edit are allowed on any path inside the worktree (rule `Edit(./**)`): create `src/interpreter/hooks/visit-pre.test.ts` with that path relative to the worktree root, never under /tmp or outside the worktree; Bash runs only the gate command. Red may not change a production file: attempt 1's edit of `src/interpreter/types.ts` was restored by the red-scope guard, so `InterpreterDeps` has no `hookObserver` until green adds it (proposal.md: "Not scaffolded, because they change existing files"). Make the test typecheck without it, as `runtimes.test.ts` does for `NodeServices.hooks` (`{ ... } as NodeServices`): give the observer typed parameters, `(nodeId: string, entry: HookTraceEntry): void` with `HookTraceEntry` from `./types.ts`, and build the deps as `{ ...deps, hookObserver: observer } as InterpreterDeps`. The new tests then compile, fail by assertion at red, and need no change after green.

---

## Q-003: src/interpreter/hooks/visit-pre.test.ts:183: sandboxRuns counts the normalize node's sandbox run, giving 9, not 8

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-07T22:59Z by claude-sonnet, run r-20261107T2228Z-8bc6, task 3.1

### Context
The test wraps `sandbox.run` in `runFlow` and counts every call. In `onion`, the 8 hook runs use binding `ctx`, and the `normalize` code node also runs in the sandbox with binding `input`. That makes 9 calls. The spec (C-e9060697) says '8 sandbox calls with binding `ctx`', so the test should count only hook runs. The implementation is correct, so the assertion at line 183 cannot pass.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/interpreter/hooks/visit-pre.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-hook-runtime`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/interpreter/hooks/visit-pre.test.ts`: in the `run` wrapper inside `runFlow`, increment `sandboxRuns` only when `opts.binding === "ctx"`, so the count is the hook calls and `assert.equal(scene.sandboxRuns, 8)` holds.

### Clarifier suggestion
Edit `src/interpreter/hooks/visit-pre.test.ts`: in the `run` wrapper inside `runFlow`, increment `sandboxRuns` only when `opts.binding === "ctx"`, so the count is the hook calls and `assert.equal(scene.sandboxRuns, 8)` holds.

### Answer
<!-- write below this line -->

---

## Q-004: Grant write access for the red step

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.3
- **Kind:** technical
- **Asked:** 2026-11-07T23:47Z by claude-sonnet, run r-20261107T2301Z-fa9e, task 3.3

### Context
Edit and Write were denied in this session (don't ask mode). The red step has to add `generation?: number` to `IntentCall` in `src/runs/intents/gate.ts`, create `src/runs/intents/gate-generation.db.test.ts` and create `src/interpreter/hooks/retry.test.ts`. Please grant file-write permission for these paths and re-run.

### Options
1. Grant Edit/Write for src/runs/intents/gate.ts, src/runs/intents/gate-generation.db.test.ts and src/interpreter/hooks/retry.test.ts and re-run the step

### Answer
<!-- write below this line -->
No permission grant is needed and none can be given here; the denial follows from the red step itself. A red step may not change a production file: `src/runs/intents/gate.ts` is production, and tasks.md 3.3 puts `IntentCall.generation?` and the key in the "then" part that green implements after the two tests are written. Leave `gate.ts` untouched at red. Write only the two new test files, with paths relative to the worktree root (`src/runs/intents/gate-generation.db.test.ts` and `src/interpreter/hooks/retry.test.ts`), as the 3.1 and 3.2 red steps did for `visit-pre.test.ts` and `visit-post.test.ts`. Make the gate test typecheck without the field by casting the call, for example `{ ...CALL, generation: 1 } as IntentCall`, the same pattern `runtimes.test.ts` uses with `as NodeServices` and `visit-pre.test.ts` with `as InterpreterDeps` for members green adds later. `createEffectIntents` then keys every call with `idemKey(tenant, lineage, node, effectSeq)` at generation 0, so the generation-1 `before` returns `K0` and the test fails by assertion (expected `K1`), and the invalid generations -1 and 1.5 fail by assertion too (wrap those in `await assert.rejects(p, { code: "INTENT_INVALID" })`); green adds `generation?: number` to `IntentCall`, `call.generation ?? 0` to `keyOf`, and the retry attempts to `pipeline.ts` and `visit.ts`.

---

## Q-005: Task 3.4: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.4
- **Kind:** harness
- **Asked:** 2026-11-08T00:27Z by claude-sonnet, run r-20261107T2350Z-4917, task 3.4
- **Criteria:** C-8243f499 (hooks-runtime › A hook fault fails the node and never leaves a run running › Faults)

### Context
L4 could not run the pre-satisfied check of task 3.4, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/interpreter/hooks/faults.test.ts is not a Python file; the base run: its new tests fail against the unit base code only by an error, not by assertion
Runs: test-base-run
Kept real: nothing
Tests: src.interpreter.hooks.faults.test.ts::C-8243f499 a code hook with no sandbox fails before the first step, src.interpreter.hooks.faults.test.ts::C-8243f499 a hook of a kind with no runner fails HOOK_UNSUPPORTED with no row, src.interpreter.hooks.faults.test.ts::C-8243f499 a mutated post output that is not a payload fails inside its own step, src.interpreter.hooks.faults.test.ts::C-8243f499 a rejecting sandbox run fails the node sandbox_unavailable, src.interpreter.hooks.faults.test.ts::C-8243f499 a return outside the grammar fails the node, src.interpreter.hooks.faults.test.ts::C-8243f499 a skip output outside the schema fails INTERPRETER_OUTPUT_INVALID, src.interpreter.hooks.faults.test.ts::C-8243f499 a throwing hook fails HOOK_ERROR with runtime_error and leaks nothing, src.interpreter.hooks.faults.test.ts::C-8243f499 an input that is not a storable payload fails HOOK_ACTION_INVALID, src.interpreter.hooks.faults.test.ts::C-8243f499 an unresolved input reference fails before any hook runs, src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault input_invalid fails the node HOOK_ERROR (+9 more)

Changes the replay applies (2 files):
    added src/interpreter/hooks/faults.test.ts
    added src/interpreter/hooks/taint.test.ts

Source of the tests (redacted; at most 40 lines each):
src.interpreter.hooks.faults.test.ts::C-8243f499 a code hook with no sandbox fails before the first step:
    test("C-8243f499 a code hook with no sandbox fails before the first step", async () => {
      const scene = await runFlow(hookRunVersion("skip-read"), "none");
      assert.equal(scene.result.state, "failed");
      assert.equal(scene.result.error?.code, "INTERPRETER_NO_SANDBOX");
      assert.equal(scene.result.error?.node, "lookup");
      assert.deepEqual(scene.result.error?.details, { hook: "lookup:pre:cache_hit" });
      assert.deepEqual(scene.executed, [...LEAD, "run:finish"]);
      assert.deepEqual(scene.steps, []);
    });
src.interpreter.hooks.faults.test.ts::C-8243f499 a hook of a kind with no runner fails HOOK_UNSUPPORTED with no row:
    test("C-8243f499 a hook of a kind with no runner fails HOOK_UNSUPPORTED with no row", async () => {
      const version = variant("skip-read", "F7", "kind: code, source", "kind: mystery, source");
      const scene = await runFlow(version);
      assert.equal(scene.result.state, "failed");
      assert.equal(scene.result.error?.code, "HOOK_UNSUPPORTED");
      assert.deepEqual(scene.result.error?.details, { hook: "lookup:pre:cache_hit", kind: "mystery" });
      assert.deepEqual(scene.executed, [...LEAD, "run:finish"]);
      assert.deepEqual(scene.steps, []);
    });
src.interpreter.hooks.faults.test.ts::C-8243f499 a mutated post output that is not a payload fails inside its own step:
    test("C-8243f499 a mutated post output that is not a payload fails inside its own step", async () => {
      const version = variant(
        "redirect",
        "F6",
        "if (ctx.output.risk === 'high' && ctx.next.id === 'pay') return { action: 'redirect', to: 'review' };",
        "return { action: 'continue', output: { risk: 'a\\\\u0000b' } };",
      );
      const scene = await runFlow(version, "pool", { vendor: "Acme", amount: 2000, mode: "auto" });
      assert.equal(scene.result.state, "failed");
      assert.equal(scene.result.error?.code, "HOOK_ACTION_INVALID");
      assert.equal(scene.result.error?.details?.["keyword"], "payload");
      assert.equal(scene.executed[scene.executed.length - 2], "classify:post:to_review");
      assert.equal(scene.steps.find((step) => step.nodeId === "classify")?.state, "failed");
    });
src.interpreter.hooks.faults.test.ts::C-8243f499 a rejecting sandbox run fails the node sandbox_unavailable:
    test("C-8243f499 a rejecting sandbox run fails the node sandbox_unavailable", async () => {
      const scene = await runFlow(
        hookRunVersion("skip-read"),
        (pool) =>
          rejecting(pool, async () => {
            throw new Error(`${SECRET} closed`);
          }),
      );
      assert.equal(scene.result.state, "failed");
      assert.equal(scene.result.error?.code, "HOOK_ERROR");
      assert.deepEqual(scene.result.error?.details, {
        hook: "lookup:pre:cache_hit",
        fault: "sandbox_unavailable",
      });
      assert.equal(scene.executed[scene.executed.length - 2], "lookup");
      assert.equal(scene.steps[0]?.state, "failed");
      noSecret(scene);
    });
src.interpreter.hooks.faults.test.ts::C-8243f499 a return outside the grammar fails the node:
    test("C-8243f499 a return outside the grammar fails the node", async () => {
      const scene = await runFlow(skipReadWith("return 5;", "F4"));
      assert.equal(scene.result.state, "failed");
      assert.equal(scene.result.error?.code, "HOOK_ERROR");
      assert.equal(scene.result.error?.details?.["fault"], "output_invalid");
      assert.equal(scene.steps[0]?.state, "failed");
    });
src.interpreter.hooks.faults.test.ts::C-8243f499 a skip output outside the schema fails INTERPRETER_OUTPUT_INVALID:
    test("C-8243f499 a skip output outside the schema fails INTERPRETER_OUTPUT_INVALID", async () => {
      const scene = await runFlow(
        skipReadWith('return { action: "skip", output: { vendor_id: 5, status: "active" } };', "F3"),
      );
      assert.equal(scene.result.state, "failed");
      assert.equal(scene.result.error?.code, "INTERPRETER_OUTPUT_INVALID");
      assert.deepEqual(scene.result.error?.details, {
        path: "/vendor_id",
        keyword: "type",
        hook: "lookup:pre:cache_hit",
      });
    });
src.interpreter.hooks.faults.test.ts::C-8243f499 a throwing hook fails HOOK_ERROR with runtime_error and leaks nothing:
    test("C-8243f499 a throwing hook fails HOOK_ERROR with runtime_error and leaks nothing", async () => {
      const scene = await runFlow(skipReadWith(`throw new Error("${SECRET}");`, "F1"));
      assert.equal(scene.result.state, "failed");
      assert.equal(scene.result.error?.code, "HOOK_ERROR");
      assert.deepEqual(scene.result.error?.details, { hook: "lookup:pre:cache_hit", fault: "runtime_error" });
      assert.equal(scene.steps[0]?.state, "failed");
      assert.equal(scene.calls.length, 0);
      noSecret(scene);
    });
src.interpreter.hooks.faults.test.ts::C-8243f499 an input that is not a storable payload fails HOOK_ACTION_INVALID:
    test("C-8243f499 an input that is not a storable payload fails HOOK_ACTION_INVALID", async () => {
      const scene = await runFlow(
        skipReadWith('return { action: "continue", input: { vendor_name: "a\\u0000b" } };', "F2"),
      );
      assert.equal(scene.result.state, "failed");
      assert.equal(scene.result.error?.code, "HOOK_ACTION_INVALID");
      assert.equal(scene.result.error?.details?.["keyword"], "payload");
      assert.equal(scene.steps[0]?.state, "failed");
      assert.equal(scene.calls.length, 0);
    });
src.interpreter.hooks.faults.test.ts::C-8243f499 an unresolved input reference fails before any hook runs:
    test("C-8243f499 an unresolved input reference fails before any hook runs", async () => {
      const version = variant("skip-read", "F5", "${{ inputs.vendor }}", "${{ inputs.missing }}");
      const scene = await runFlow(version);
      assert.equal(scene.result.state, "failed");
      assert.equal(scene.result.error?.code, "INTERPRETER_REF_UNRESOLVED");
      assert.equal(scene.hookCalls, 0);
    });
src.interpreter.hooks.faults.test.ts::C-8243f499 sandbox fault input_invalid fails the node HOOK_ERROR:
    (the source of this test was not found)

Diff of src/interpreter/hooks/faults.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/interpreter/hooks/faults.test.ts b/src/interpreter/hooks/faults.test.ts
    new file mode 100644
    index 0000000..e1e6d3a
    --- /dev/null
    +++ b/src/interpreter/hooks/faults.test.ts
    @@ -0,0 +1,261 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import type { JsonValue } from "../../authoring/index.ts";
    +import { fixedClock, sequentialIds } from "../../core/index.ts";
    +import { createMemoryRunStore } from "../../runs/index.ts";
    +import type { RunRecord, RunStore, StepRecord, TenantContext } from "../../runs/index.ts";
    +import { createWorkerSandbox } from "../../sandbox/index.ts";
    +import type { SandboxResult, WorkerSandbox } from "../../sandbox/index.ts";
    +import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
    +import { parseCatalogueFlow } from "../../../test/support/catalogue/flows.ts";
    +import { hookRunVersion, readHookRunText } from "../../../test/support/hook-runs/index.ts";
    +import { executeRun, memoryWorkflowOps, startRun } from "../index.ts";
    +import type {
    +  EffectGate,
    +  InterpreterDeps,
    +  LoadedVersion,
    +  ToolCall,
    +  ToolInvoker,
    +} from "../index.ts";
    +import type { HookTraceEntry } from "./types.ts";
    +
    +const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
    +const ALICE = { userId: "u_alice", kind: "human" } as const;
    +const INPUT: JsonValue = { vendor: "  Acme ", amount: 120, currency: "eur" };
    +const CATALOGUE = loadTestCatalogue();
    +const LEAD = ["run:load", "run:start"];
    +const SECRET = "secret-" + "token";
    +
    +type SandboxKind = "none" | "pool" | ((pool: WorkerSandbox) => WorkerSandbox);
    +
    +interface Scene {
    +  result: RunRecord;
    +  executed: readonly string[];
    [cut: 227 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-hook-runtime/.l4/held/3.4-pre_satisfied.patch` on the unit branch]

Diff of src/interpreter/hooks/taint.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/interpreter/hooks/taint.test.ts b/src/interpreter/hooks/taint.test.ts
    new file mode 100644
    index 0000000..6d66356
    --- /dev/null
    +++ b/src/interpreter/hooks/taint.test.ts
    @@ -0,0 +1,115 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import type { JsonValue } from "../../authoring/index.ts";
    +import { fixedClock, sequentialIds } from "../../core/index.ts";
    +import { createMemoryRunStore } from "../../runs/index.ts";
    +import type { RunRecord, RunStore, StepRecord, StepWrite, TenantContext } from "../../runs/index.ts";
    +import { createWorkerSandbox } from "../../sandbox/index.ts";
    +import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
    +import { parseCatalogueFlow } from "../../../test/support/catalogue/flows.ts";
    +import { hookRunVersion, readHookRunText } from "../../../test/support/hook-runs/index.ts";
    +import { executeRun, memoryWorkflowOps, NO_EFFECT_GATE, startRun } from "../index.ts";
    +import type { InterpreterDeps, LoadedVersion, ToolInvoker } from "../index.ts";
    +
    +const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
    +const ALICE = { userId: "u_alice", kind: "human" } as const;
    +const CATALOGUE = loadTestCatalogue();
    +
    +interface Scene {
    +  result: RunRecord;
    +  writes: StepWrite[];
    +  rows: StepRecord[];
    +}
    +
    +async function runFlow(version: LoadedVersion): Promise<Scene> {
    +  const inner: RunStore = createMemoryRunStore();
    +  const writes: StepWrite[] = [];
    +  const store: RunStore = {
    +    createRun: (ctx, run, at) => inner.createRun(ctx, run, at),
    +    getRun: (ctx, runId) => inner.getRun(ctx, runId),
    +    transition: (ctx, runId, change) => inner.transition(ctx, runId, change),
    +    async recordStep(ctx, step) {
    +      writes.push(step);
    +      return inner.recordStep(ctx, step);
    [cut: 81 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-hook-runtime/.l4/held/3.4-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 2 files (the whole patch is in `openspec/changes/add-hook-runtime/.l4/held/3.4-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: Count the fault tests on the evidence of the real run. The unit head already implements every clause of the Faults scenario in this unit's own new files: the pipeline refuses a kind without runner and a code hook without sandbox before the first step, the code runner maps a rejecting sandbox to HOOK_ERROR sandbox_unavailable and a sandbox fault to HOOK_ERROR with its code, normalizeHookReturn gives HOOK_ACTION_INVALID with keyword payload, and the output check gives INTERPRETER_OUTPUT_INVALID with details.hook. Task 3.4 therefore has nothing left to add for that criterion, so its new tests can only pin behaviour built by tasks 3.1 to 3.3 and cannot fail by assertion against the head. Against the unit base they fail because the base has no hook runtime at all and the scaffold stubs throw, which is an error and not an assertion, so the base run cannot show discrimination although the criterion is plainly not satisfied by the base. The assertions of the nineteen tests check exactly the values of the Faults scenario and of the test plan's Variants and Sandbox faults tables, including the fixed messages, the failed row, the step position and the absence of the secret text. The taint tests of the same step fail by assertion, since the rows still carry only nodeInputTaint. The lint error in the excerpt names a baseInput assignment that is not in the head's visit.ts, so the replay of the two test files alone is not affected by it.

---

## Q-006: Task 3.5: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.5
- **Kind:** harness
- **Asked:** 2026-11-08T01:18Z by claude-sonnet, run r-20261108T0033Z-999a, task 3.5
- **Criteria:** C-14990344 (hooks-runtime › A replay runs no recorded hook and reaches the same rows › Replay of onion-own)

### Context
L4 could not run the pre-satisfied check of task 3.5, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/interpreter/hooks/replay.test.ts is not a Python file; the base run: its new tests fail against the unit base code only by an error, not by assertion
Runs: test-base-run
Kept real: nothing
Tests: src.interpreter.hooks.replay.test.ts::C-14990344 a replay of onion-own runs only the later steps and keeps the rows

Changes the replay applies (1 files):
    added src/interpreter/hooks/replay.test.ts

Source of the tests (redacted; at most 40 lines each):
src.interpreter.hooks.replay.test.ts::C-14990344 a replay of onion-own runs only the later steps and keeps the rows:
    test("C-14990344 a replay of onion-own runs only the later steps and keeps the rows", async () => {
      const setup: Setup = { version: onionOwn(), input: INPUT, fakeSandbox: false };
      const store = createMemoryRunStore();
      const first = await pass(setup, store, null);
      assert.equal(first.result.state, "completed");
      assert.equal(first.values.length, 9);
      assert.equal(first.payCalls.length, 1);
      assert.equal(first.obs.length, 8);
      const cases: [number, string[], number, number][] = [
        [4, ["pay", "pay#done", "pay:post:rule.rule_a", "done", "run:finish"], 6, 1],
        [6, ["pay:post:rule.rule_a", "done", "run:finish"], 1, 0],
        [9, [], 0, 0],
      ];
      for (const [k, executed, sandboxRuns, payCalls] of cases) {
        const again = await pass(setup, store, first.values.slice(0, k));
        assert.deepEqual(again.executed, executed, `executed for ${k}`);
        assert.equal(again.sandboxRuns, sandboxRuns, `sandbox runs for ${k}`);
        assert.equal(again.payCalls.length, payCalls, `invoker calls for ${k}`);
        if (payCalls === 1) assert.deepEqual(again.payCalls[0]?.args, first.payCalls[0]?.args);
        assert.deepEqual(again.obs, first.obs, `observer for ${k}`);
        assert.deepEqual(again.steps, first.steps, `rows for ${k}`);
        assert.equal(again.steps.find((s) => s.nodeId === "pay")?.idemKey, "ik_pay_1");
      }
    });

Diff of src/interpreter/hooks/replay.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/interpreter/hooks/replay.test.ts b/src/interpreter/hooks/replay.test.ts
    new file mode 100644
    index 0000000..c69ff01
    --- /dev/null
    +++ b/src/interpreter/hooks/replay.test.ts
    @@ -0,0 +1,245 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import type { JsonValue } from "../../authoring/index.ts";
    +import { fixedClock, sequentialIds } from "../../core/index.ts";
    +import { createMemoryRunStore } from "../../runs/index.ts";
    +import type { RunRecord, RunStore, StepRecord, TenantContext } from "../../runs/index.ts";
    +import { createWorkerSandbox } from "../../sandbox/index.ts";
    +import type { WorkerSandbox } from "../../sandbox/index.ts";
    +import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
    +import { parseCatalogueFlow } from "../../../test/support/catalogue/flows.ts";
    +import { hookRunVersion, readHookRunText } from "../../../test/support/hook-runs/index.ts";
    +import { executeRun, memoryWorkflowOps, startRun } from "../index.ts";
    +import type {
    +  EffectGate,
    +  InterpreterDeps,
    +  LoadedVersion,
    +  ToolCall,
    +  ToolInvoker,
    +} from "../index.ts";
    +import type { HookTraceEntry } from "./types.ts";
    +
    +const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
    +const ALICE = { userId: "u_alice", kind: "human" } as const;
    +const INPUT: JsonValue = { vendor: "  Acme ", amount: 120, currency: "eur" };
    +const PAY_INPUT: JsonValue = { vendor: "Acme", invoice: "inv-1", amount: 120 };
    +const LOOKUP_OK = { vendor_id: "v1", status: "active" };
    +const PAID = { payment_id: "pay-1", status: "paid" };
    +const CATALOGUE = loadTestCatalogue();
    +
    +const PAY_ONCE = `ursitoare: "0.1"
    +flow: pay-once
    +version: 1.0.0
    +inputs: {type: object, properties: {vendor: {type: string}, invoice: {type: string}, amount: {type: number}}, required: [vendor, invoice, amount]}
    [cut: 211 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-hook-runtime/.l4/held/3.5-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-hook-runtime/.l4/held/3.5-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: accept: Count the onion-own replay test on the evidence of the real run. The unit head already implements what the scenario "Replay of onion-own" asks, so a test written for task 3.5 can only pin behaviour that tasks 3.1 to 3.4 built, and it cannot fail by assertion against the head; against the unit base it fails by an error because the base has no hook runtime, so the base run cannot show discrimination although the base plainly does not satisfy the criterion. In pipeline.ts the fused step records each hook run with its phase and name, and unwrap re-applies the records of a replayed step without running a hook: it observes each recorded entry in order, re-applies pre records to the input and taint state, and re-applies post records to the produced taint. The code runner runs an own-step hook through ops.runStep, so a replayed own step returns its recorded HookRun and runs no sandbox code, and memoryWorkflowOps answers a recorded value without calling the step function or listing it in executed. In visit.ts the started row is written only inside a fresh step, and every final-row write is guarded by that flag, so a visit whose steps were all replayed rewrites no row and the pay row keeps its idemKey, while a fresh pay step takes its idemKey from the gate decision and writes the same row as the first run under the fixed clock. The test's assertions check exactly the scenario's rows: executed lists for k 4, 6 and 9, sandbox runs 6, 1 and 0, invoker calls 1, 0 and 0 with the first run's args, observer entries and listSteps equal to the first run's, and the pay row's idemKey ik_pay_1; its onion-own variant is the test plan's (rule_a.post gets routes: [done]), the same replacement visit-pre.test.ts uses. The lint error in the excerpt names a baseInput assignment at visit.ts line 114 that is not in the head, where baseInput appears only as a property of the pipeline request, so the replay of the test file alone is not affected by it.
