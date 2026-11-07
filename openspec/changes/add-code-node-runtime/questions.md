# Questions — add-code-node-runtime

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
| Q-001 | answered | 2.1 | harness | Task 2.1: the pre-satisfied check could not decide |
<!-- l4:index:end -->

---

## Q-001: Task 2.1: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** harness
- **Asked:** 2026-11-07T07:00Z by deepseek-free, run r-20261107T0555Z-d757, task 2.1
- **Criteria:** C-de412456 (flow-testing › The test endpoint refuses what it cannot run › Who may test which flow)

### Context
L4 could not run the pre-satisfied check of task 2.1, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/api/test-run-refusals.test.ts is not a Python file; the base run: every new test passes against the unit base code too
Runs: test-base-run
Kept real: nothing
Tests: src.api.test-run-refusals.test.ts::C-de412456 who may test which flow and what is refused before a run

Changes the replay applies (5 files):
    modified src/api/test-run-refusals.test.ts
    added src/interpreter/code-run.db.test.ts
    added src/interpreter/code-run.test.ts
    modified src/interpreter/registry.test.ts
    modified src/interpreter/start.test.ts

Source of the tests (redacted; at most 40 lines each):
src.api.test-run-refusals.test.ts::C-de412456 who may test which flow and what is refused before a run:
    test("C-de412456 who may test which flow and what is refused before a run", async () => {
      const h = await createHarness();
      const server = await makeServer(h, h.deps);
      const body = { input: PAY_ONCE_INPUT, mocks: MOCKS };
      try {
        for (const who of ["bob", "dave", "carol"]) {
          const res = await post(h, server, who, "pay-once", h.seed.validated, body);
          assert.equal(res.statusCode, 403, `${who} is forbidden`);
          const error = res.json() as ErrorBody;
          assert.equal(error.error.code, "FORBIDDEN");
          assert.equal(typeof error.error.details?.["decisionId"], "string");
        }
    
        const mallory = await post(h, server, "mallory", "pay-once", h.seed.validated, body);
        assert.equal(mallory.statusCode, 404);
        assert.equal((mallory.json() as ErrorBody).error.code, "NOT_FOUND");
    
        const noCookie = await post(h, server, "alice", "pay-once", h.seed.validated, body, {
          cookie: false,
        });
        assert.equal(noCookie.statusCode, 401);
        assert.equal((noCookie.json() as ErrorBody).error.code, "UNAUTHENTICATED");
    
        const noCsrf = await post(h, server, "alice", "pay-once", h.seed.validated, body, {
          csrf: false,
        });
        assert.equal(noCsrf.statusCode, 403);
        assert.equal((noCsrf.json() as ErrorBody).error.code, "CSRF_INVALID");
    
        const noFlow = await post(h, server, "alice", "nope", h.seed.validated, body);
        assert.equal(noFlow.statusCode, 404);
        assert.equal((noFlow.json() as ErrorBody).error.code, "NOT_FOUND");
    
        const unknownHash = await post(
          h,
          server,
          "alice",
          "pay-once",
          "sha256:" + "0".repeat(64),
          body,
    [cut: 15 more lines]

Diff of src/api/test-run-refusals.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/api/test-run-refusals.test.ts b/src/api/test-run-refusals.test.ts
    index e93cbae..3db5c56 100644
    --- a/src/api/test-run-refusals.test.ts
    +++ b/src/api/test-run-refusals.test.ts
    @@ -70,7 +70,7 @@ interface Harness {
     
     async function createHarness(): Promise<Harness> {
       const db = await withTestDatabase();
    -  const { a } = await seedTwoTenants(db);
    +  const { a, b } = await seedTwoTenants(db);
       const clock = fixedClock(NOW);
       await seedFlowActors(
         db,
    @@ -83,12 +83,19 @@ async function createHarness(): Promise<Harness> {
         ],
         clock,
       );
    +  await seedFlowActors(
    +    db,
    +    b,
    +    [{ subject: "mallory", roles: ["author"], teams: ["finance"] }],
    +    clock,
    +  );
       const seed = await seedMockRunFlows(db, a, clock);
     
       const sessions: Record<string, Session> = {};
       for (const name of ["alice", "bob", "dave", "carol"]) {
         sessions[name] = await createTestSession(db, a, name, clock);
       }
    +  sessions["mallory"] = await createTestSession(db, b, "mallory", clock);
     
       const engine = await createPolicyEngine({
         srcDir: defaultSrcDir(),
    @@ -154,15 +161,16 @@ function post(
       flowId: string,
       hash: string,
       body: unknown,
    +  opts: { cookie?: boolean; csrf?: boolean } = {},
     ) {
       const session = h.sessions[who] as Session;
    [cut: 109 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-code-node-runtime/.l4/held/2.1-pre_satisfied.patch` on the unit branch]

Diff of src/interpreter/code-run.db.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/interpreter/code-run.db.test.ts b/src/interpreter/code-run.db.test.ts
    new file mode 100644
    index 0000000..f0269f6
    --- /dev/null
    +++ b/src/interpreter/code-run.db.test.ts
    @@ -0,0 +1,270 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import type { Flow, JsonValue } from "../authoring/index.ts";
    +import { fixedClock, sequentialIds } from "../core/index.ts";
    +import { launchDurable } from "../durable/index.ts";
    +import type { DurableRuntime, StepObserver, StepPhase } from "../durable/index.ts";
    +import { createLogger } from "../observability/index.ts";
    +import type { LogDestination } from "../observability/index.ts";
    +import { createRunStore } from "../runs/index.ts";
    +import type { RunRecord, TenantContext } from "../runs/index.ts";
    +import { createWorkerSandbox } from "../sandbox/index.ts";
    +import type {
    +  SandboxJson,
    +  SandboxLimits,
    +  SandboxOptions,
    +  SandboxResult,
    +  WorkerSandbox,
    +} from "../sandbox/index.ts";
    +import {
    +  bindInterpreter,
    +  NO_EFFECT_GATE,
    +  registerRunWorkflow,
    +  startRun,
    +  workflowIdOf,
    +} from "./index.ts";
    +import type { InterpreterDeps } from "./index.ts";
    +import { CODE_LIMITS } from "./runtimes/code.ts";
    +import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
    +import { withTestDatabase } from "../../test/support/pg.ts";
    +import { waitForRun } from "../../test/support/run-wait.ts";
    +import { seedTwoTenants } from "../../test/support/tenants.ts";
    +
    +const silent: LogDestination = {
    [cut: 236 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-code-node-runtime/.l4/held/2.1-pre_satisfied.patch` on the unit branch]

Diff of src/interpreter/code-run.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/interpreter/code-run.test.ts b/src/interpreter/code-run.test.ts
    new file mode 100644
    index 0000000..e98ea88
    --- /dev/null
    +++ b/src/interpreter/code-run.test.ts
    @@ -0,0 +1,268 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import { validateFlowText } from "../authoring/index.ts";
    +import type { JsonValue } from "../authoring/index.ts";
    +import { fixedClock, sequentialIds } from "../core/index.ts";
    +import { createMemoryRunStore, payloadDigest } from "../runs/index.ts";
    +import type { RunRecord, RunStore, TenantContext } from "../runs/index.ts";
    +import { createWorkerSandbox } from "../sandbox/index.ts";
    +import type {
    +  SandboxJson,
    +  SandboxLimits,
    +  SandboxOptions,
    +  SandboxResult,
    +  WorkerSandbox,
    +} from "../sandbox/index.ts";
    +import { executeRun, memoryWorkflowOps, NO_EFFECT_GATE, startRun } from "./index.ts";
    +import type { InterpreterDeps, ToolInvoker, WorkflowOps } from "./index.ts";
    +import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
    +import { CODE_PAY_TEXT, codePayVersion } from "../../test/support/code-pay.ts";
    +
    +const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
    +const ALICE = { userId: "u_alice", kind: "human" } as const;
    +const NOW = "2026-11-02T10:00:00Z";
    +const PAY_INPUT: JsonValue = {
    +  vendor: "Acme",
    +  invoice: "inv-1",
    +  amount: 1234.567,
    +  currency: "eur",
    +};
    +const LOOKUP_OK: JsonValue = { vendor_id: "v1", status: "active" };
    +const PAID: JsonValue = { payment_id: "pay-1", status: "paid" };
    +const NORMALIZED: JsonValue = { amount: 1234.57, currency: "EUR", is_large: true };
    +const PAY_ARGS: JsonValue = {
    [cut: 234 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-code-node-runtime/.l4/held/2.1-pre_satisfied.patch` on the unit branch]

Diff of src/interpreter/registry.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/interpreter/registry.test.ts b/src/interpreter/registry.test.ts
    index 6873067..c8c9632 100644
    --- a/src/interpreter/registry.test.ts
    +++ b/src/interpreter/registry.test.ts
    @@ -10,6 +10,7 @@ import {
       SUPPORTED_KINDS,
     } from "./index.ts";
     import type { NodeOutcome, NodeRuntime } from "./index.ts";
    +import { codeRuntime } from "./runtimes/code.ts";
     
     const OUTCOME: NodeOutcome = { output: null, outcome: null, next: null, end: null };
     const RT: NodeRuntime = { execute: async () => OUTCOME };
    @@ -25,7 +26,7 @@ function codeAndKind(run: () => void): { code: string; kind: unknown } {
     }
     
     test("C-f3de9ac6 built-in kinds are registered and the rest are not", () => {
    -  assert.deepEqual(SUPPORTED_KINDS, ["block", "end", "switch", "wait"]);
    +  assert.deepEqual(SUPPORTED_KINDS, ["block", "code", "end", "switch", "wait"]);
       assert.equal(NODE_KINDS.length, 14);
       for (const kind of NODE_KINDS) {
         const runtime = nodeRuntimeFor(kind);
    @@ -38,6 +39,11 @@ test("C-f3de9ac6 built-in kinds are registered and the rest are not", () => {
       assert.equal(nodeRuntimeFor("constructor" as NodeKind), undefined);
     });
     
    +test("C-f3de9ac6 code is built in and runs codeRuntime", () => {
    +  assert.ok(SUPPORTED_KINDS.includes("code"), "code is a supported kind");
    +  assert.equal(nodeRuntimeFor("code"), codeRuntime);
    +});
    +
     test("C-f3de9ac6 registration refuses duplicates and invalid runtimes", () => {
       assert.deepEqual(codeAndKind(() => registerNodeRuntime("block", RT)), {
         code: "NODE_RUNTIME_DUPLICATE",

Diff of src/interpreter/start.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/interpreter/start.test.ts b/src/interpreter/start.test.ts
    index e57acef..efeac71 100644
    --- a/src/interpreter/start.test.ts
    +++ b/src/interpreter/start.test.ts
    @@ -98,6 +98,35 @@ function payOnceFlow(lookupUses = "erp.lookup_vendor@1"): Flow {
       };
     }
     
    +function payCodeFlow(): Flow {
    +  return {
    +    ursitoare: "0.1",
    +    flow: "pay-code",
    +    version: "1.0.0",
    +    inputs: {
    +      type: "object",
    +      properties: { vendor: { type: "string" } },
    +      required: ["vendor"],
    +    },
    +    start: "normalize",
    +    nodes: {
    +      normalize: {
    +        kind: "code",
    +        language: "js",
    +        source: "return { n: 1 };",
    +        input: {},
    +        output_schema: { type: "object" },
    +        next: "done",
    +      },
    +      done: {
    +        kind: "end",
    +        status: "completed",
    +        output: { n: "${{ nodes.normalize.output.n }}" },
    +      },
    +    },
    +  };
    +}
    +
     const VERSIONS: ReadonlyMap<string, LoadedVersion> = new Map([
       [
         "pay-once",
    [cut: 50 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-code-node-runtime/.l4/held/2.1-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 5 files (the whole patch is in `openspec/changes/add-code-node-runtime/.l4/held/2.1-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: The held test pins the scenario "Who may test which flow", which this unit does not change: its WHEN and THEN are word for word the ones already on the base branch, and the base branch already has a passing test of that criterion in the routes test file. Nothing in task 2.1 touches authorisation, cookies, CSRF or the unknown-flow and unknown-hash answers, so no test of that scenario can fail at red; the test passing against the base code is the expected result, not a sign that the task is pre-satisfied. The part of the flow-testing requirement that this unit does change, the kind_unsupported list dropping "code", is covered by the in-place change to the C-7d9b0050 test, which fails on base because the base registry still lacks the code kind and the base test still expects "code" in that list. Running the check again cannot help, because the zero-value variation applies only to Python files and the base run would give the same result. Count the test on the evidence of the real run.
