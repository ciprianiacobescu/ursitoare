# Delivered shapes taken by add-hook-taint-check

Declarations from the merged code, main@cf34c628 (`file:line`; `…` elides members this unit does not touch). The M5 names are restated from the Interfaces given of their folders, which are archived before this unit runs and not shown to its judge; no line of M5 code is cited.

```ts
// src/authoring/taint (U23, add-taint-static)
labels.ts:1-3,5,10  type TaintLabel = "extracted" | "untrusted";  type Taint = readonly TaintLabel[];  const TAINT_LABELS: readonly TaintLabel[];  const NO_TAINT: Taint;   // frozen
labels.ts:16,30,42  function normalizeTaint(labels: readonly string[]): Taint;  function joinTaint(a: Taint, b: Taint): Taint;  function taintIncludes(outer: Taint, inner: Taint): boolean;   // inner included in outer; an unknown label counts as "untrusted"
analyze.ts:17-36  interface NodeTaint { input: Taint; output: Taint; fields: { [field: string]: Taint } }
  interface TaintEdge { to: string; path: string; ref: string; from: string | null; taint: Taint; resolved: boolean; hook: string | null }
  interface TaintAnalysis { nodes: { [id: string]: NodeTaint }; edges: TaintEdge[] }
analyze.ts:391  function analyzeTaint(flow: Flow, catalogue: Catalogue): TaintAnalysis;
analyze.ts:271,279  const WIDEN_KINDS: Set<string>  ("block", "code", "llm.extract", "llm.generate", "delegate");  function evaluate(id, found, node, states, nodes, catalogue, hooks): State   // module-internal, edited by this unit
analyze.ts:484-508  one TaintEdge per reference: `from` is the referenced node (the wrapped node for hook.output.*, else null); `hook` is the hook's id ("" without one), null for a node's own reference
hooks.ts:22-27,147  interface AppliedHooks { all; code; hasCodeHook: boolean; malformed: boolean };  function collectHooks(id, node, flow, catalogue): AppliedHooks   // internal: a node's hooks and the matching flow rules
// src/authoring/validate (U25, add-flow-validator)
validate.ts:51,72  function validateFlow(doc: unknown, catalogue: Catalogue): ValidationResult;  function validateFlowText(text: string, format: FlowFormat, catalogue: Catalogue): ValidationResult;
types.ts:5-18  interface Issue { layer: Layer; code: string; node: string | null; path: string; message: string }  interface ValidationResult { ok: boolean; errors: Issue[]; warnings: Issue[]; layers_run: Layer[] }   // Layer = "L1" | "L2" | "L3" here; add-hook-checker adds "H"
taint-checks.ts:19,29  function consequential(catalogue, ref): boolean  (block exists and effect !== "read"; module-internal);  function checkTaint(flow: Flow, catalogue: Catalogue, refErrorPaths: ReadonlySet<string>, s: Sink): void   // :33 skips every edge with a hook
sink.ts  class Sink { errors: Issue[]; warnings: Issue[]; err(layer, code, node, path, message): void; warn(...): void }   // jsonschema.ts:19 isObj(v: unknown): v is Record<string, unknown>
codes.ts:47  "L3_TAINT_TO_CONSEQUENTIAL" in FLOW_ERROR_CODES
// src/authoring/format (U22, add-flow-format-model)
catalogue.ts:34-42  interface Catalogue { block(ref: string): BlockDef | undefined; modelProfile(ref): …; role(name): …; delegateTarget(target, workflow): …; flow(ref, major): …; delegateWorkflows?(target): readonly string[] | undefined }
types.ts:234  interface Flow { …; start: string; nodes: { [id: string]: FlowNode }; hooks?: …; … }
refs.ts:125  function refToString(ref: Ref): string
// src/interpreter (U33, add-interpreter-core)
types.ts:19-26,54-56  interface ToolCall { tool: string; args: JsonValue; nodeId: string; effectSeq: number; phase?: "pre" | "post"; hookId?: string }  interface ToolInvoker { invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult> }  // ToolResult = { output: JsonValue }
types.ts:107-116  interface InterpreterDeps { store: RunStore; durable: Pick<DurableRuntime, "enqueue"> | null; loadVersion: VersionLoader; catalogueFor: (ctx: TenantContext) => Promise<Catalogue>; invokerFor: (mode: EffectMode, run: RunRecord) => Promise<ToolInvoker>; effects: EffectGate; clock: Clock; ids: IdSource }   // add-code-node-runtime adds `sandbox?: WorkerSandbox`
types.ts:93-99,118-127  interface LoadedVersion { flowId; hash; state: VersionState; ownerTeam; flow: Flow }  interface StartRunRequest { flowId: string; hash: string; mode: EffectMode; input: JsonValue; mocks: JsonValue | null; principal: RunPrincipal; actorChain: readonly string[]; runId?: string }
start.ts:33  async function startRun(deps: InterpreterDeps, ctx: TenantContext, req: StartRunRequest): Promise<RunRecord>;
execute.ts:170  async function executeRun(ops: WorkflowOps, deps: InterpreterDeps, ctx: TenantContext, runId: string): Promise<RunRecord>;
ops.ts:13  function memoryWorkflowOps(workflowId: string, recorded: readonly JsonValue[] = []): MemoryWorkflowOps;   gate.ts:3  const NO_EFFECT_GATE: EffectGate;
// src/runs (U31), src/core, src/tenancy
runs/store/memory-store.ts:44  function createMemoryRunStore(): RunStore;   runs/store/run-store.ts:15-26  interface RunStore { …; listSteps(ctx: TenantContext, runId: string, q: { limit: number; afterSeq?: number }): Promise<{ steps: StepRecord[]; next: number | null }>; … }
runs/store/types.ts:125-145  interface StepRecord { runId; nodeId: string; …; seq: number; kind: string; state: StepState; …; taint: string[]; …; startedAt: string; endedAt: string | null }
core/clock.ts:11  function fixedClock(iso: string): Clock;   core/ids.ts:63  function sequentialIds(seed = 0): IdSource;   tenancy/context.ts:7  interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile }
// test/support (U24, U25)
catalogue/loader.ts:85  function loadTestCatalogue(path?: string): TestCatalogue;   catalogue/flows.ts:43  function parseCatalogueFlow(text: string, label: string): Flow;
flow-cases/index.ts:38,60  function flowCases(group: CaseGroup, namePrefix = ""): FlowCase[];  function caseCatalogue(): Catalogue;   // FlowCase { group; name; path; text: string; format: FlowFormat; expect: string[]; expectWarnings: string[] }
// M5 names (from the Interfaces given of the folders; archived before this unit runs)
add-code-sandbox     src/sandbox/index.ts   createWorkerSandbox(opts?: WorkerSandboxOptions): WorkerSandbox   // WorkerSandboxOptions { size?: number; … }; run(code, input, limits, options): Promise<SandboxResult>; close(): Promise<void>
add-hook-runtime     test/support/hook-runs/index.ts   export const HOOK_RUN_HASH: string;  export function hookRunNames(): string[];  export function loadHookRun(name: string): Flow;  export function hookRunVersion(name: string): LoadedVersion;   // nine flows: onion, mutate, skip-read, skip-pay, fail, end-pre, redirect, undeclared, taint-hook; HOOK_RUN_HASH is "sha256:" + "d".repeat(64)
add-taint-runtime    src/authoring/taint/runtime.ts   export function producedTaint(node: unknown, input: Taint, catalogue: Catalogue): ProducedTaint;   // evaluate calls it; ProducedTaint { output: Taint; fields: Readonly<Record<string, Taint>>; outcome: Taint }
add-hook-checker     layer H: validateFlow runs it after L3 only when L1 to L3 produced no error and the document declares a hook; Layer gains "H"
```

## Facts from the merged code

- `analyze.ts:300-306` (`evaluate`): `widens` is `(hooks.hasCodeHook || hooks.malformed) && WIDEN_KINDS.has(kind)`; it returns `output: joinTaint(result.output, input)` and each field `joinTaint(value, input)`. `outputFor` gives a block with `untrusted_fields` an `output` equal to its input and one field per name, each `joinTaint(input, UNTRUSTED)` (`:208-215`), so only a block's `output` changes under the new join. `resolveReference` (`:130-154`) gives a field name found in `state.fields` that taint, else `state.output`, for a node and for `hook.output.*`.
- `taint-checks.ts:32-37`: the loop skips an edge with a hook, an unresolved edge, one without `untrusted` and a path in `refErrorPaths`; `:37` is `edge.from ?? "foreach items"`. `validate.ts:63-69` sorts errors by layer, path, code, message and de-duplicates only warnings; `l3.ts:601-606` builds `refErrorPaths` from `L3_REF_*` and `L3_ITEM_OUTSIDE_FOREACH` errors, then calls `checkTaint` last.
- `taint.test.ts:130-152`: `C-f97887e5 hook edges are not checked` validates `taint-via-extract-passes` with a `mail.send@1` pre block hook `h` on `extract` and expects no error and no warning; it is the one frozen test this unit changes.
- `test/support/hook-flows/flows/*.yaml` say `ursitoare: 0.2-draft`, so `validateFlowText` stops them at L1 (`L1_CONST`); the hook checker's tests run them through `checkHooks` only. No file of `test/support/flow-cases/` declares a hook list (two have a node named `post`).
- `flow_version.validation` is `jsonb` (`0270_flow_registry.sql:24`), which refuses U+0000 and a lone surrogate; hook ids are checked by layer `H`, which runs after L3.
