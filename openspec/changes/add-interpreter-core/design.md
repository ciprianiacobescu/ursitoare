## Context

A run is one DBOS workflow (`ursitoare.run`) over a stored, acyclic flow version. Replay (DBOS or `memoryWorkflowOps`) is by step order, so control flow depends only on recorded step values. U30 Decision 6 runs the observer's `after` inside the step callback, so a kill at `after:<step>` re-runs a committed body: every body tolerates that.

## Decisions

1. **Registry.** A `Map`; `details.kind` names the kind in `NODE_RUNTIME_*`. `SUPPORTED_KINDS` does not grow. Runtime errors carry `node: ctx.nodeId`.
2. **Values.** `resolveValue` scans with `scanTemplate`; a segment with `error` is unresolved (`details.ref`: the trimmed text between `${{` and `}}`, or the raw tail). `isSingleRef` keeps the type; otherwise strings stay and other values go through `JSON.stringify`. Roots `item` and `hook` are unresolved. A path walks plain objects by own keys (`Object.hasOwn`), never arrays (the validator forbids indexing) or strings. A `node` ref needs the node in `scope.nodes`; `outcome` must be a string, `output` a non-null object. Results are copies built with `Object.fromEntries`. Messages name the ref, never a value.
3. **Durations.** `durationMs` accepts `P`, then `nW`, `nD`, then `T` with `nH`, `nM`, `nS` (digits; decimals on seconds only), in that order, one component at least, no trailing `T`. The validator's pattern (`schema.ts:96-100`) also admits years, months and decimals elsewhere; those have no fixed length and are refused. Result: `Math.round` of the milliseconds.
4. **WorkflowOps.** `dbosWorkflowOps()`: `workflowId` a getter over U30 `currentWorkflowId()`, `runStep` U30 `runStep(name, fn)` without options, `sleep` `durableSleep`. `memoryWorkflowOps(id, recorded = [])` replays by position: `runStep` call `i < recorded.length` returns a copy of `recorded[i]` without calling `fn`; later calls push the name to `executed`, call `fn` and return a JSON copy; names are not compared. `sleep(ms)` pushes `ms` to `slept` and takes no slot. Step values are JSON, never `undefined` (U30 refuses it); markers return `null`.
5. **`executeRun`:**
   1. Step `run:load`: `getRun` (absent: reject `INTERPRETER_VERSION_NOT_FOUND`, `details.reason` `run_missing`); then `loadVersion`, `catalogueFor`, the payload of `run.inputRef`. Value `{ run, version, blocks, input, error }`: `blocks` the recorded `BlockDef`s (`services.block` reads them); `error` a `RunError` when the version is absent, `checkRunnable` fails or the payload is gone (`INTERPRETER_INPUT_INVALID`). A terminal run is returned as it is; with `error`, go to 5.
   2. Step `run:start`: `transition` to `running`, `from: ["queued", "running"]`; value `{ started }`; `false` returns `getRun`.
   3. Outside steps: `invoker = await deps.invokerFor(run.mode, run)`; a rejection fails the run `INTERPRETER_NO_INVOKER`.
   4. Loop from `flow.start`: a node already visited fails the run `INTERPRETER_LOOP_LIMIT` at that node, with no row; a kind without a runtime, `INTERPRETER_KIND_UNSUPPORTED`; else `visit`. An outcome needs exactly one of `next` and `end`, else `NODE_RUNTIME_INVALID`, checked before the row closes. The scope then holds the node's `{ output, outcome }`. A failing end (`end.status` `failed`) is the failure `FLOW_FAILED` at the end node, its row `failed`.
   5. Step `run:finish`: `transition`, `from: ["queued", "running"]`, to `completed` (`output` when non-null, `terminalNode` the end node) or `failed` (`error`, `terminalNode` the failing node if any); `null` falls back to `getRun`. The step value and the result is the `RunRecord`.
6. **`visit`** (`seq` counts visits from 0, failed ones too; `now` read once per visit; `attempt` 1). `StepContext`: `effect` from the recorded `BlockDef` (block) else `null`, `unsafeToRetry` = `unsafe_to_retry === true`, `idemKey` null, the run's `principal`. `ops` is wrapped so that the first `runStep` that actually runs (a replayed step runs no callback) first upserts the row `started`; `effects` is wrapped to remember the key of `before`'s decision or of the context given to `after`. After `execute` returns or throws, the final row is upserted **only if that first write ran**, so a replay never lowers a row. Final row: `state` `completed` or `failed`, the outcome's `output` and `outcome`, `error`, the remembered `idemKey`, `startedAt` the visit's `now`, `endedAt` `clock.now()`, and `taint` `[]`, `policyDecisionId` null, `effectSeq`, `turn`, `generation` 0, `attempt` 1. `input` by kind: block `resolve(with)`, switch `{ on }`, wait `{ duration }`, end `null` (`null` if resolving fails). A store error writing a failed row is ignored. A kill between a visit's last checkpoint and its final upsert leaves the row `started`.
7. **Block.** Step `<node>`: resolve `with`, check `BlockDef.input`; `read`: invoke, check the output; other effects: `before(call, ctx)`, then `invoke` calls the invoker with `{ ...ctx, idemKey }`, `reuse` takes the decision's result, `unknown` throws `INTERPRETER_EFFECT_UNKNOWN`; value `{ output, idemKey }`. Step `<node>#done`: resolve again (pure), `after(call, { ...ctx, idemKey }, { output })` always (also after `reuse`; U34 makes it idempotent), then the output check, so an invalid output still completes the intent. An invoker or gate rejection becomes, inside the step callback, `INTERPRETER_TOOL_FAILED` (`details.stage`; fixed message); a block missing from `services.block`, `INTERPRETER_VERSION_NOT_RUNNABLE`.
8. **Switch, end, wait**, each in step `<node>`. Switch: key `on` if a string, `String(on)` if a number or boolean, else none. Wait: value `{ ms }`; unless mode `mock`, `ops.sleep` in chunks of at most 86,400,000 ms (U30's `durableSleep` limit); then step `<node>#wake` (value `null`); outcome `skipped` in `mock` (D10), else `null`.
9. **Errors.** A thrown value is an `InterpreterError` when its `code` is in `InterpreterErrorCode`, not by `instanceof`: a workflow engine may rethrow a recorded step error as a copy (inferred, not checked against DBOS 5.3.0). Any other error is `INTERPRETER_TOOL_FAILED`, message `node execution failed`. `RunError.node` is `error.node ?? the visit's node`; messages are fixed sentences naming ids, refs, codes.
10. **`startRun`:** checks in the spec's order (`runId` against `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$`, only ever an `IdSource` id, because DBOS workflow ids span tenants; `req.input` against `flow.inputs`), then `createRun` (`lineageId` the `runId`, `trigger` `test`, `ownerTeam` the version's) and, unless `durable` is null, `enqueue("ursitoare.run", runId, { tenantId, reviewProfile, runId })`. A rejection moves the run `queued` to `failed` (`INTERPRETER_UNBOUND`, `the run could not be queued`) and `startRun` throws it.
11. **Workflow.** `registerRunWorkflow()` calls U30 `registerWorkflow(RUN_WORKFLOW, fn)` once (a flag, even after launch). `fn` checks its input (`tenantId`, `runId`, `reviewProfile` `solo` or `team`), throws `INTERPRETER_UNBOUND` before `bindInterpreter`, and returns `{ runId, state }`. A later `bindInterpreter` replaces the deps.
12. **Schemas.** One `Ajv2020` (`ajv/dist/2020.js`), `{ allErrors: false, strict: false, validateFormats: false }` (the validator checks schemas strictly; this checks data). A schema Ajv cannot compile fails the check. Details `{ path, keyword }`; `path` is `/` for a root-level `required` error.
13. **Kit.** `runConformance` runs each case on `memoryWorkflowOps("conformance")`, `NO_EFFECT_GATE`, `resolve` over the case scope, `block` from `loadTestCatalogue()`, the case invoker or one rejecting `new Error("no invoker")`, and a fixed context (node `node_under_test`, the case `kind` and `mode`). Outcomes compare with `deepStrictEqual`, errors by `code`; `detail` is `""` when `ok`, else names expected and actual (`unexpected error: <message>` for a foreign error). `waitForRun` polls every 10 ms and rejects `Error("waitForRun timed out: <runId> is <state>")`.

## Interfaces

```ts
type EffectMode = "live" | "mock" | "stub";
interface ToolCall { tool: string; args: JsonValue; nodeId: string; effectSeq: number; phase?: "pre" | "post"; hookId?: string }
interface ToolResult { output: JsonValue }
interface RunPrincipal { userId: string; kind: "human" | "service" }
interface StepContext {
  readonly tenant: TenantContext;
  readonly runId: string; readonly lineageId: string; readonly flowId: string; readonly flowHash: string;
  readonly nodeId: string; readonly kind: NodeKind; readonly mode: EffectMode; readonly attempt: number;
  readonly effect: Effect | null;
  readonly unsafeToRetry: boolean;
  readonly idemKey: string | null;  // from EffectGate.before; null for reads
  readonly principal: RunPrincipal; readonly now: Date;
}
interface ToolInvoker { invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult> }
type EffectDecision =
  | { action: "invoke"; idemKey: string | null }
  | { action: "reuse"; idemKey: string; result: ToolResult }
  | { action: "unknown"; idemKey: string };
interface EffectGate {
  before(call: ToolCall, ctx: StepContext): Promise<EffectDecision>;
  after(call: ToolCall, ctx: StepContext, result: ToolResult): Promise<void>;
}
const NO_EFFECT_GATE: EffectGate;  // before → { action: "invoke", idemKey: null }; after → resolves
interface WorkflowOps {
  readonly workflowId: string;
  runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T>;
  sleep(ms: number): Promise<void>;
}
function dbosWorkflowOps(): WorkflowOps;
interface MemoryWorkflowOps extends WorkflowOps { readonly executed: readonly string[]; readonly slept: readonly number[] }
function memoryWorkflowOps(workflowId: string, recorded?: readonly JsonValue[]): MemoryWorkflowOps;
interface NodeOutcome {
  output: JsonValue | null; outcome: string | null; next: string | null;
  end: { status: "completed" | "failed" } | null;
}
interface NodeServices {
  ops: WorkflowOps; invoker: ToolInvoker; effects: EffectGate;
  resolve(value: unknown): JsonValue; block(ref: string): BlockDef | undefined;
}
interface NodeRuntime { execute(node: FlowNode, ctx: StepContext, services: NodeServices): Promise<NodeOutcome> }
function registerNodeRuntime(kind: NodeKind, runtime: NodeRuntime): void;
function nodeRuntimeFor(kind: NodeKind): NodeRuntime | undefined;
const SUPPORTED_KINDS: readonly NodeKind[];  // ["block", "end", "switch", "wait"]
interface LoadedVersion { flowId: string; hash: string; state: VersionState; ownerTeam: string; flow: Flow }
type VersionLoader = (ctx: TenantContext, flowId: string, hash: string) => Promise<LoadedVersion | null>;
interface InterpreterDeps {
  store: RunStore;
  durable: Pick<DurableRuntime, "enqueue"> | null;  // U30; null for in-memory runs
  loadVersion: VersionLoader;
  catalogueFor: (ctx: TenantContext) => Promise<Catalogue>;
  invokerFor: (mode: EffectMode, run: RunRecord) => Promise<ToolInvoker>;
  effects: EffectGate;
  clock: Clock; ids: IdSource;
}
interface StartRunRequest {
  flowId: string; hash: string; mode: EffectMode; input: JsonValue; mocks: JsonValue | null;
  principal: RunPrincipal; actorChain: readonly string[]; runId?: string;
}
const RUN_WORKFLOW = "ursitoare.run";
function registerRunWorkflow(): void;
function bindInterpreter(deps: InterpreterDeps): void;
function startRun(deps: InterpreterDeps, ctx: TenantContext, req: StartRunRequest): Promise<RunRecord>;
function executeRun(ops: WorkflowOps, deps: InterpreterDeps, ctx: TenantContext, runId: string): Promise<RunRecord>;
interface RunScope { inputs: JsonValue; nodes: ReadonlyMap<string, { output: JsonValue | null; outcome: string | null }> }
function resolveValue(value: unknown, scope: RunScope): JsonValue;
function durationMs(iso: string): number;
type InterpreterErrorCode =
  | "INTERPRETER_VERSION_NOT_FOUND" | "INTERPRETER_VERSION_NOT_RUNNABLE" | "INTERPRETER_KIND_UNSUPPORTED"
  | "INTERPRETER_UNBOUND" | "INTERPRETER_REF_UNRESOLVED" | "INTERPRETER_INPUT_INVALID" | "INTERPRETER_OUTPUT_INVALID"
  | "INTERPRETER_TOOL_FAILED" | "INTERPRETER_EFFECT_UNKNOWN" | "INTERPRETER_NO_INVOKER" | "INTERPRETER_LOOP_LIMIT"
  | "NODE_RUNTIME_DUPLICATE" | "NODE_RUNTIME_INVALID" | "FLOW_FAILED";
class InterpreterError extends Error {
  readonly code: InterpreterErrorCode; readonly node: string | null; readonly details: Readonly<Record<string, string | string[]>>;
  constructor(code: InterpreterErrorCode, message: string, node?: string | null, details?: Record<string, string | string[]>);
}
// test/support/node-conformance.ts
interface ConformanceCase {
  name: string; node: FlowNode; scope: RunScope; mode: EffectMode; invoker?: ToolInvoker;
  expect: { outcome: NodeOutcome } | { error: InterpreterErrorCode };
}
function runConformance(kind: NodeKind, runtime: NodeRuntime, cases: readonly ConformanceCase[]):
  Promise<{ name: string; ok: boolean; detail: string }[]>;
// test/support/run-wait.ts
function waitForRun(store: RunStore, ctx: TenantContext, runId: string,
  states: readonly RunState[], timeoutMs?: number): Promise<RunRecord>;  // default 20000; rejects on timeout
```

## Failure cases

A store, gate or invoker rejection is `INTERPRETER_TOOL_FAILED`; a vanished version or payload fails the run; only an absent run throws. A cancelled workflow throws at its next step (U36).

## Security

No endpoint or PEP action (U35 and U36 authorise) and no table: every store call carries the run's `TenantContext`, so another tenant's run id finds no run (scenario "Run-level failures and nothing to do"). References are resolved, never evaluated; `__proto__`, `constructor`, arrays and strings are refused as paths; payloads are untrusted JSON checked against schemas; no code node can run. No secret is read; a raw tool error never reaches a message, row or payload. Abuse: a `runId` U30 refuses, a looping flow, an unsupported kind, a switch key `constructor`.

## Test plan

Memory store, `fixedClock("2026-11-02T10:00:00Z")` (row times `2026-11-02T10:00:00.000000Z`), `loadTestCatalogue()`. `T_A` `{ tenantId: "tenant_a", reviewProfile: "solo" }`, `T_B` likewise; `ALICE` `{ userId: "u_alice", kind: "human" }`; `INPUT` `{ vendor: "Acme", invoice: "inv-1", amount: 120 }`; `LOOKUP_OK` `{ vendor_id: "v1", status: "active" }`; `PAID` `{ payment_id: "pay-1", status: "paid" }`; `PAY_ARGS` `{ vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" }`.

Flow `pay-once` (hash `"sha256:" + "a".repeat(64)`, state `validated`, team `finance`; `inputs` an object schema requiring `vendor`, `invoice` (strings) and `amount` (number); `start` `lookup`): nodes `lookup` (block `erp.lookup_vendor@1`, `with` `{ vendor_name: "${{ inputs.vendor }}" }`, next `route`), `route` (switch on `${{ nodes.lookup.output.status }}`, cases `{ active: "pay" }`, default `rejected`), `pay` (block `erp.create_payment@1`, `with` `{ vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: "EUR", reference: "${{ inputs.invoice }}" }`, next `done`), `done` (end completed, output `{ payment_id: "${{ nodes.pay.output.payment_id }}" }`), `rejected` (end failed). Variants: `pay-po` (`pay.with.reference` `${{ inputs.po_number }}`), `pay-draft` (state `draft`), `pay-missing` (`lookup` uses `erp.unknown@1`), `pay-nonext` (`lookup` without `next`), `spin` (one switch `spin` on `x`, no cases, `default` `spin`). `loadVersion` answers by flow id; `rf-1-core` is `loadTestFlow`.

`CTX(nodeId)`: `{ tenant: T_A, runId: "r_1", lineageId: "r_1", flowId: "pay-once", flowHash, nodeId, kind: "block", mode: "mock", attempt: 1, effect: "read", unsafeToRetry: false, idemKey: null, principal: ALICE, now: new Date("2026-11-02T10:00:00Z") }`. `PAY_ROWS` (all `completed`, `effectSeq`, `turn`, `generation` 0, `attempt` 1, `taint` `[]`, `policyDecisionId` null; refs are `payloadDigest` of the values): `seq` 0 `lookup` `block`, input `{ vendor_name: "Acme" }`, output `LOOKUP_OK`; 1 `route` `switch`, input `{ on: "active" }`, output null, outcome `active`; 2 `pay` `block`, input `PAY_ARGS`, output `PAID`, `idemKey` `ik_pay_1`; 3 `done` `end`, input null, output `{ payment_id: "pay-1" }`; other `outcome` and `idemKey` null.

Test-file fakes: a recording invoker (answers by tool, rejects an `Error` value, logs `{ call, ctx }`), a recording gate, tagged ops (over `memoryWorkflowOps`; log the running step's name, capture results), `deps(over)` (memory store, `durable: null`, `ids: sequentialIds(0)`). The DBOS test uses `withTestDatabase()` (U30's `global-setup` prepares the template), one launch, `rt.shutdown()` in `finally`, a local 20 ms poll (20 s deadline) on `rt.status`, a silent logger.

## Decisions made while writing

- The interpreter writes the rows (`NodeServices` has no store), only when the visit's first step ran. A node visited twice fails `INTERPRETER_LOOP_LIMIT` (the row key holds one visit; flows are acyclic).
- `stub` sleeps like `live`; the mock wait row is `completed`, outcome `skipped`; `after` runs after `reuse`.
