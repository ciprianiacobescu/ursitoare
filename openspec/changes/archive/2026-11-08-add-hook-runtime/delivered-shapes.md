# Delivered shapes taken by add-hook-runtime

Declarations from main@a6b5fb37 (`file:line`; `…` elides unused members).

```ts
// src/interpreter/types.ts (U33)
:19  interface ToolCall { tool: string; args: JsonValue; nodeId: string; effectSeq: number; phase?: "pre" | "post"; hookId?: string }
:37  interface StepContext { …; nodeId: string; kind: NodeKind; mode: EffectMode; attempt: number; effect: Effect | null; unsafeToRetry: boolean; idemKey: string | null; now: Date }
:54-68  interface ToolInvoker { invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult> }   interface EffectGate { before(call, ctx): Promise<EffectDecision>; after(call, ctx, result: ToolResult): Promise<void> }   interface WorkflowOps { readonly workflowId: string; runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T>; sleep(ms: number): Promise<void> }
:74-91,107,129  interface NodeServices { ops; invoker; effects; resolve(value: unknown): JsonValue; block(ref: string): BlockDef | undefined }   interface InterpreterDeps { store; durable; loadVersion; catalogueFor; invokerFor; effects: EffectGate; clock; ids }   interface RunScope { inputs: JsonValue; nodes: ReadonlyMap<string, { output: JsonValue | null; outcome: string | null }> }
// src/interpreter/errors.ts:63  toInterpreterError(value: unknown): InterpreterError | null;  visit.ts:28,66  interface VisitRequest { run; nodeId; node; seq; blocks; scope; deps; tenant; ops; invoker; runtime; now }, visitNode(request: VisitRequest): Promise<NodeOutcome>;  execute.ts:170  executeRun(ops: WorkflowOps, deps: InterpreterDeps, ctx: TenantContext, runId: string): Promise<RunRecord>;  ops.ts:13  memoryWorkflowOps(workflowId: string, recorded: readonly JsonValue[] = []): MemoryWorkflowOps
// src/runs/intents/gate.ts:19   interface IntentCall { tool: string; args: PayloadValue; nodeId: string; effectSeq: number }      key.ts:26   idemKey(tenantId: string, lineageId: string, nodeId: string, effectSeq: number, generation = 0): string
// src/runs/index.ts:26 payloadDigest;  src/config/index.ts:13 createFaultPoints;  test/support: catalogue/loader.ts:85 loadTestCatalogue(path?): TestCatalogue, hook-flows/index.ts:63 loadHookFlow(name: string): Flow;  src/authoring/validate/validate.ts:72 validateFlowText(text: string, format: FlowFormat, catalogue: Catalogue): ValidationResult
```

## Facts from the merged code

- `src/interpreter/runtimes/block-effect.test.ts:32`: ``const CALL: ToolCall = { tool: "erp.create_payment@1", args: PAY_ARGS, nodeId: "pay", effectSeq: 0 };`` is compared whole with gate calls, so `generation` must be absent at attempt 1.
- `src/interpreter/visit.ts:182,236`: ``idemKey = decision.idemKey;`` (in `before`) and ``if (wrote) await writeFinal("completed", …, idemKey);``: a replay that skips the gate calls leaves `idemKey` `null`.
- `src/runs/store/step-repository.ts:81-90`: ``ON CONFLICT (…) DO UPDATE SET … state = EXCLUDED.state, … idem_key = EXCLUDED.idem_key`` replaces state and key; `0310_run_data.sql:69-70` has ``UNIQUE (tenant_id, run_day, run_id, seq)``, so each attempt needs its own `seq`.
- `test/support/hook-flows/flows/f-eff.yaml`, `f-ret.yaml`, `f-ret-exhausted.yaml` (`ursitoare: 0.2-draft`): `f-eff` is `send` (`mail.send@1`) with post hook `fix_subject` (`max_retries: 1`, `allow_effect_retry: true`, retries at attempt 1); `f-ret*` are `search` (`kb.search@1`, `top_k: 1`) with `enough_passages` (`max_retries` 2, 1).
