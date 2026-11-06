# Delivered shapes taken by add-block-hooks

Declarations from main@a6b5fb37 (`file:line`; `…` elides unused members). The hook names (U41, U42, U42b) are not on main: see `design.md` § Interfaces taken.

```ts
// src/interpreter/types.ts (U33)
:19  interface ToolCall { tool: string; args: JsonValue; nodeId: string; effectSeq: number; phase?: "pre" | "post"; hookId?: string }
:37  interface StepContext { readonly tenant; runId; lineageId; flowId; flowHash; nodeId: string; kind: NodeKind; mode: EffectMode; attempt: number; effect: Effect | null; unsafeToRetry: boolean; idemKey: string | null; principal; now: Date }
:54-68  interface ToolInvoker { invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult> }   type EffectDecision = { action: "invoke"; idemKey: string | null } | { action: "reuse"; idemKey: string; result: ToolResult } | { action: "unknown"; idemKey: string }
        interface EffectGate { before(call, ctx): Promise<EffectDecision>; after(call, ctx, result: ToolResult): Promise<void> }   interface WorkflowOps { readonly workflowId: string; runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T>; sleep(ms: number): Promise<void> }
:129    interface RunScope { inputs: JsonValue; nodes: ReadonlyMap<string, { output: JsonValue | null; outcome: string | null }> }
// src/interpreter/mocks.ts (U35)
:9-18   type MockEntry = { output: JsonValue } | { error: { code: string; message: string } }   type TestMocks = { [nodeId: string]: MockEntry[] }   interface MockProblem { nodeId: string; index: number | null; reason: "missing" | "unknown_node" | "not_a_block" | "schema" | "shape"; detail: string }
:187    checkMocks(flow: Flow, catalogue: Catalogue, mocks: unknown): { mocks: TestMocks | null; problems: MockProblem[] }
:268    createMockInvoker(mocks: TestMocks): ToolInvoker
// src/interpreter/refs.ts:73  resolveValue(value: unknown, scope: RunScope): JsonValue   schema.ts:9  checkSchema(schema: unknown, data: JsonValue): SchemaCheck
// src/runs/intents/gate.ts:19-24  interface IntentCall { tool: string; args: PayloadValue; nodeId: string; effectSeq: number }   :50  keyOf = idemKey(tenantId, lineageId, call.nodeId, call.effectSeq)
// src/runs/intents/key.ts:26  idemKey(tenantId: string, lineageId: string, nodeId: string, effectSeq: number, generation = 0): string
// src/runs/store/types.ts:126  interface StepRecord { runId; nodeId; effectSeq; turn; attempt; generation; seq; kind; state: StepState; inputRef; outputRef; outcome; error: RunError | null; taint: string[]; policyDecisionId; idemKey: string | null; startedAt; endedAt }
// test/support: crash/cluster.ts:59,163 startCrashCluster(parts), withDedicatedCluster(fn)   crash/engine.ts:310 spawnEngine(opts): Promise<EngineProcess> (deaths, kill, restart, stop)   crash/effects.ts:67,73 appendEffect(file, entry), countEffects(file)
//   hook-flows/index.ts:63 loadHookFlow(name: string): Flow   src/durable/launch.ts:387 launchDurable(opts)
```

## Facts from the merged code

- `src/interpreter/execute.ts:142-147`: ``for (const node of Object.values(version.flow.nodes)) { if (node.kind !== "block") continue; const def = catalogue.block(node.uses); … }``: `loadValue` collects the blocks of `node.uses` only, so a block named only by a hook is absent from `blocks` (U42 ruling 6a).
- `src/interpreter/mocks.ts:146-166,203-208`: `reachableNodeIds` follows `successorFields` only; a key of `mocks` that is not a node id is ``reason: "unknown_node"``. `:268-286` `createMockInvoker` reads ``mocks[call.nodeId]`` and answers ``list[ctx.attempt - 1]``.
- `src/api/test-run-routes.ts:40-41,204`: the body schema is ``{ input: { type: "object" }, mocks: { type: "object" } }`` (no `propertyNames`), and ``checkMocks(version.flow, catalogue, body.mocks)`` feeds `TEST_MOCK_MISSING` (``details.nodes`` the `nodeId` of each problem) and `TEST_MOCK_INVALID`.
- `src/interpreter/runtimes/block.ts:89-127`: an effect block runs `effects.before` then the invoker inside step `<id>` (not on `reuse`; `unknown` throws `INTERPRETER_EFFECT_UNKNOWN`), and `effects.after` plus the output check in `<id>#done`.
- `src/runs/intents/gate.ts:50-52,89,112` reads only `tool`, `args`, `nodeId`, `effectSeq` of a call; `0340_effect_intent.sql:3-5` keys the row by `(tenant_id, idem_key)`.
- `src/durable/steps.ts:93-118`: the fault observer runs ``stepObserver("after", name, workflowId)`` after the step function returned and before DBOS records the result, so an armed `after:<step>` kills a step whose effect has happened and is not checkpointed. `src/config/faults.ts:12` ``POINT_PATTERN = /^(before|after):[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/``; a marker file makes each point fire once.
- `src/runs/intents/crash-once.test.ts:111-150` (M4): ``faultPoints: ["after:pay"]`` gives `erp.create_payment@1` ``{ calls: 1, effects: 1, duplicates: 0 }`` at the death and ``{ calls: 2, effects: 1, duplicates: 1 }`` after `restart()`, one key.
