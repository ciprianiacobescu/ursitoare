## Why

Nothing yet walks a flow. U34, U35 and U36 need one interpreter: it takes a registry version, visits its nodes, records one numbered step row per visit, calls tools only through an injected `ToolInvoker` and `EffectGate`, and runs on DBOS and in memory.

Observable result: `startRun` accepts only a stored version (`flowId` + `hash`) of kinds `block`, `switch`, `wait` and `end` whose blocks the catalogue knows, stores a `queued` run and enqueues `ursitoare.run`. `executeRun` moves it `running`, then `completed` or `failed`, writes `step_execution` rows with `seq` 0, 1, 2 in visit order (a replay reuses them), and ends a failed run with a `RunError` that never holds a raw tool error. In `mock` mode a `wait` sleeps nothing and records outcome `skipped`; the gate is called in every mode.

Batch `m4-runs-timeline` (U30-U37 and U35b; closing unit `add-web-run-timeline`, journey `e2e/test_m4_runs.py`) delivers M4: an author test-runs a validated flow with mocked tools and follows each step on the run timeline; runs survive a kill. This unit's part: it executes a validated version node by node as one durable workflow, deterministically on replay. The plan runs acceptance profile `all` after this unit merges: every configured gate (setup, build, lint, typecheck, test, e2e) on the target; the batch outcome itself is proven by the closing unit's journey `e2e/test_m4_runs.py`.

## What Changes

- `src/interpreter/`, `test/support/node-conformance.ts` (the kit every node runtime passes) and `test/support/run-wait.ts`. No `src/main.ts` edit (U35 wires it), migration, route, policy or `ERROR_CODES` entry.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. No new dependency.
- **Depends on:** `add-flow-format-model` (U22), `add-test-catalogue` (U24, tests), `add-flow-registry` (U27), `add-dbos-runtime` (U30), `add-envelope-store` (U31); beyond the roadmap row `add-engine-skeleton` (U01), `add-db-foundation` (U02) and `add-tenancy-foundation` (U03, both for the database test). Not U25 or U26. `TenantContext` comes from `src/runs`; `test/arch/modules.ts` needs no change.
- **Changed:** nothing existing; no migration, table, endpoint, env var, audit event, part or web feature.
- **Rulings:** D5 (SIGKILL proofs are U34's), D6 (its `kind_unsupported` is `INTERPRETER_KIND_UNSUPPORTED`), D7, D10, D12 (only `draft` is refused), D18, D19. No name changed; code uses beyond the card are in design.md § Decisions made while writing.

**Interfaces given** (declarations omit `export`; from `src/interpreter/index.ts` and the two `test/support` files)

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

**Interfaces taken:**

- U30: `registerWorkflow`, `runStep`, `durableSleep`, `currentWorkflowId`, `DurableRuntime`, `launchDurable`, `StepObserver` (tests). U31: `RunStore`, `RunRecord`, `RunState`, `RunError`, `NewRun`, `StepWrite`, `StepRecord`, `TenantContext` (type), `createRunStore`, `createMemoryRunStore`, `payloadDigest`.
- U22: `Flow`, `FlowNode`, `NodeKind`, `NODE_KINDS`, `Effect`, `JsonValue`, `Catalogue`, `BlockDef`, `scanTemplate`, `isSingleRef`. U27: `VersionState`. U01: `Clock`, `IdSource`, `fixedClock`, `sequentialIds`. U24: `loadTestCatalogue`, `loadTestFlow`. U02/U03: `withTestDatabase`, `seedTwoTenants`. Root dependency `ajv` (`Ajv2020`).

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e06fdb3, checked line by line). U30 and U31 are siblings: see their folders.

## Out of scope

Effect intents and SIGKILL proofs (U34), mocks, the test endpoint, the CLI and `main` wiring (U35), run routes and cancel (U36), hooks, taint and `policyDecisionId` (rows carry `taint: []` and `null`), the other node kinds (M5 on), retries (D18).
