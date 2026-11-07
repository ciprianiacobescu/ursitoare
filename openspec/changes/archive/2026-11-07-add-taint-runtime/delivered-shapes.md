# Delivered shapes taken by add-taint-runtime

Declarations from the merged code, main@a6b5fb37 (`file:line`; `…` elides unused members). U38 and U39 are not merged; their names are restated in `design.md`.

```ts
// src/authoring/taint (U23)
labels.ts:1-3,5,10  type TaintLabel = "extracted" | "untrusted";  type Taint = readonly TaintLabel[];  const TAINT_LABELS: readonly TaintLabel[];  const NO_TAINT: Taint;   // frozen
labels.ts:16,30,34,42  function normalizeTaint(labels: readonly string[]): Taint;  function joinTaint(a: Taint, b: Taint): Taint;  function relabelExtract(input: Taint): Taint;  function taintIncludes(outer: Taint, inner: Taint): boolean;
analyze.ts:17-36,391  interface NodeTaint { input: Taint; output: Taint; fields: { [field: string]: Taint } }  interface TaintEdge { …; ref: string; taint: Taint; resolved: boolean; hook: string | null }
  interface TaintAnalysis { nodes: { [id: string]: NodeTaint }; edges: TaintEdge[] }  function analyzeTaint(flow: Flow, catalogue: Catalogue): TaintAnalysis;
index.ts:3-17 re-exports these;  src/authoring/index.ts:4  export * from "./taint/index.ts";
// src/authoring/format (U22)
refs.ts:14-22,89,159  type Ref = { root: "inputs"; path: string[] } | { root: "node"; id: string; field: "output" | "outcome"; path: string[] } | { root: "item"; path: string[] } | { root: "hook"; scope: HookScope; path: string[] };
  function scanTemplate(text: string): Seg[];   // Seg = { type: "text"; text: string } | { type: "ref"; raw: string; ref?: Ref; error?: string }
   function walkStrings(value: unknown, path: string, visit: (text: string, path: string) => void): void;
nodes.ts:27,80  function valueFields(node: unknown): { field: string; value: unknown }[];  function successorFields(node: unknown): { path: string; id: unknown; producesOutput: boolean }[];
catalogue.ts:5-14,34-42,44  interface BlockDef { effect: Effect; …; input: JsonSchema; output: JsonSchema; untrusted_fields?: string[]; untrusted_result?: boolean; … }
  interface Catalogue { block(ref: string): BlockDef | undefined; modelProfile(ref: string): ModelProfileDef | undefined; role(name: string): RoleDef | undefined; delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined; flow(ref: string, major: number): FlowSignature | undefined; delegateWorkflows?(target: string): readonly string[] | undefined }
types.ts:234  interface Flow { …; start: string; nodes: { [id: string]: FlowNode }; … }
// src/authoring/validate (U25)
validate.ts:72  function validateFlowText(text: string, format: FlowFormat, catalogue: Catalogue): ValidationResult;   // { ok: boolean; errors: Issue[]; warnings: Issue[]; layers_run: Layer[] } (types.ts:13-18)
// src/interpreter (U33)
types.ts:93-99,107-116,118-127  interface LoadedVersion { flowId: string; hash: string; state: VersionState; ownerTeam: string; flow: Flow }
  interface InterpreterDeps { store: RunStore; durable: Pick<DurableRuntime, "enqueue"> | null; loadVersion: VersionLoader; catalogueFor: (ctx: TenantContext) => Promise<Catalogue>; invokerFor: (mode: EffectMode, run: RunRecord) => Promise<ToolInvoker>; effects: EffectGate; clock: Clock; ids: IdSource }
  interface StartRunRequest { flowId: string; hash: string; mode: EffectMode; input: JsonValue; mocks: JsonValue | null; principal: RunPrincipal; actorChain: readonly string[]; runId?: string }
visit.ts:28-41,66  interface VisitRequest { readonly run: RunRecord; readonly nodeId: string; readonly node: FlowNode; readonly seq: number; readonly blocks: Readonly<Record<string, BlockDef>>; readonly scope: RunScope; readonly deps: InterpreterDeps; readonly tenant: TenantContext; readonly ops: WorkflowOps; readonly invoker: ToolInvoker; readonly runtime: NodeRuntime; readonly now: Date }
  async function visitNode(request: VisitRequest): Promise<NodeOutcome>;
execute.ts:170  async function executeRun(ops: WorkflowOps, deps: InterpreterDeps, ctx: TenantContext, runId: string): Promise<RunRecord>;
start.ts:33  async function startRun(deps: InterpreterDeps, ctx: TenantContext, req: StartRunRequest): Promise<RunRecord>;
ops.ts:13  function memoryWorkflowOps(workflowId: string, recorded: readonly JsonValue[] = []): MemoryWorkflowOps;   // extends WorkflowOps { readonly executed: readonly string[]; readonly slept: readonly number[] }
gate.ts:3  const NO_EFFECT_GATE: EffectGate;
// src/runs (U31), src/core, src/tenancy
store/types.ts:105-123,125-145  interface StepWrite { runId; nodeId; …; seq: number; kind: string; state: StepState; input: PayloadValue | null; output: PayloadValue | null; outcome: string | null; error: RunError | null; taint: readonly string[]; …; startedAt: Date; endedAt: Date | null }   // StepRecord: … taint: string[]
store/run-store.ts:15-26  interface RunStore { …; recordStep(ctx: TenantContext, step: StepWrite): Promise<StepRecord>; listSteps(ctx: TenantContext, runId: string, q: { limit: number; afterSeq?: number }): Promise<{ steps: StepRecord[]; next: number | null }>; … }
store/memory-store.ts:44  function createMemoryRunStore(): RunStore;
core/clock.ts:11  function fixedClock(iso: string): Clock;   core/ids.ts:63  function sequentialIds(seed = 0): IdSource;   tenancy/context.ts:7  interface TenantContext { readonly tenantId: string; … }
// test/support (U24, U25)
catalogue/loader.ts:85  function loadTestCatalogue(path?: string): TestCatalogue;   catalogue/flows.ts:12,43,60  const TEST_FLOW_NAMES: readonly TestFlowName[];  function parseCatalogueFlow(text: string, label: string): Flow;  function loadTestFlow(name: string): Flow;
catalogue/errors.ts:9-13  class CatalogueDataError extends Error { readonly code: CatalogueDataErrorCode; … }   // includes "CATALOGUE_UNKNOWN_FLOW"
flow-cases/index.ts:12-20,38,60  interface FlowCase { group: CaseGroup; name: string; text: string; format: FlowFormat; … }  function flowCases(group: CaseGroup, namePrefix = ""): FlowCase[];  function caseCatalogue(): Catalogue;
```

## Facts from the merged code

- `src/authoring/taint/analyze.ts:195-269` `outputFor` is the per-kind rule; `:266-267` `default: return { output: UNTRUSTED, fields: new Map() };` (unknown kind, input ignored); `:230` `llm.decide` gives `fields: new Map([["outcome", NO_TAINT]])`.
- `analyze.ts:110-155` `resolveReference`: `:119` `inputs` gives `NO_TAINT`; `:120-125` an `item` reference resolves to `itemTaint` only when `occurrence.fromValue && occurrence.field === "with" && itemTaint !== undefined`, else `UNRESOLVED`; `:140-141` a `node` reference without a state is `UNRESOLVED`; `:142-148` `outcome` is `NO_TAINT` for `llm.decide` and `human.approval`, else `state.output`; `:149-154` a field via `state.fields.get(first)`, else `state.output`.
- `src/interpreter/visit.ts:111` and `:139`: `taint: [],` on the `started` row and in `writeFinal` (`completed` and `failed`).
- `src/interpreter/execute.ts:139-151` `blocks` holds only the definitions of `block` nodes; `:176-178` `run:load` is a `runStep` whose value (including `blocks`) a replay reads back; `:293-297` after a visit `seq += 1` and the node's output and outcome go into `scope.nodes`.
- `src/interpreter/ops.ts:23-31` `memoryWorkflowOps` replays by position: the call at index `i < recorded.length` returns a copy of `recorded[i]` without running `fn`; later calls push the step name to `executed`.
- `src/runs/store/memory-store.ts:191` `taint: [...step.taint],`; `:202-216` `listSteps` sorts by `seq`.
- `src/authoring/format/refs.ts:159-171` `walkStrings` visits string values of arrays and of `Object.entries(value)`, never keys; `:89-123` `scanTemplate` gives a `ref` segment with `error` and no `ref` for an unparsable `${{ }}`.
- `test/support/catalogue/loader.ts:27-32` `block(ref)` is a `structuredClone` of an own key; `:57` `delegateTarget` returns `{ effect: "send", untrusted_result: true }` for every listed workflow. `blocks.v0.json`: `invoices.get@1` (`:6`, `untrusted_fields` `["raw_text", "vendor_name"]` at `:12`), `http.get@1` (`:30`, `["body"]` at `:36`), `erp.lookup_vendor@1` (`:38`) and `kb.search@1` (`:59`) have none.
- `test/support/flow-cases/valid/` holds three `foreach` flows (`foreach-bare-item-primitive-array`, `foreach-block-items-and-results`, `foreach-subflow`), each with one `foreach` node named `each`; `warnings/` and the three RF-1 flows have none.
