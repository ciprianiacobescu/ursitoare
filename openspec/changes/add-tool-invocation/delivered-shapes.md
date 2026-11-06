# Delivered shapes taken by add-tool-invocation

Declarations from main@cf34c628 (`file:line`; `…` elides unused members). M5 names come from the M5 folders: plan m6 is activated only after plan m5 completes, so they are implemented on main when this unit runs. The M6 siblings (U45-U49b) are in-plan prerequisites whose folders the judge sees; `ServiceResolver` and `ServiceTarget` are in `add-credentials` Interfaces given.

```ts
// src/interpreter (U33)
types.ts:19-26   interface ToolCall { tool: string; args: JsonValue; nodeId: string; effectSeq: number; phase?: "pre" | "post"; hookId?: string }
types.ts:37-52   interface StepContext { readonly tenant: TenantContext; runId; lineageId; flowId; flowHash; nodeId: string; kind: NodeKind; mode: EffectMode; attempt: number; effect: Effect | null; unsafeToRetry: boolean; idemKey: string | null; principal: RunPrincipal; now: Date }
types.ts:54-56   interface ToolInvoker { invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult> }
types.ts:81-116  interface NodeServices { ops; invoker: ToolInvoker; effects: EffectGate; resolve(value: unknown): JsonValue; block(ref: string): BlockDef | undefined }   type VersionLoader = (ctx: TenantContext, flowId: string, hash: string) => Promise<LoadedVersion | null>   interface InterpreterDeps { …; invokerFor: (mode: EffectMode, run: RunRecord) => Promise<ToolInvoker>; … }
errors.ts:1-75   InterpreterErrorCode (14 members) and INTERPRETER_ERROR_CODES (the same 14); class InterpreterError(code, message, node?, details?: Record<string, string | string[]>); toInterpreterError(value): InterpreterError | null
runtimes/block.ts:11-127   mapFailure(error, nodeId, stage); prepare(); read: one step <id>; effect: step <id> runs prepare, effects.before, invoke and returns { output, idemKey }, step <id>#done runs effects.after
visit.ts:28-41,112,140   interface VisitRequest { run; nodeId; node; seq; blocks; scope; deps; tenant; ops; invoker; runtime; now }; rows are written with policyDecisionId: null   execute.ts:237-304 the visit loop
registry.ts:10,30 registerNodeRuntime, nodeRuntimeFor   mocks.ts:298-300 (testRunInvokers loads on first use)
// src/runs, src/tenancy
runs/index.ts:3   export type { TenantContext, TenantTx, TenantPool }   (runtimes may not import tenancy: test/arch/modules.ts:50-67)   tenancy/tx.ts:6-14 TenantPool = Pick<pg.Pool, "connect">; withTenantTx(pool, ctx, fn)
runs/store/types.ts:27-30,60-81,105-145   RunRecord { runId; lineageId; flowId; flowHash; ownerTeam; mode; principal: { userId; kind }; … } (no tenant member); StepWrite and StepRecord with policyDecisionId: string | null
runs/intents/key.ts:26-43 idemKey(tenantId, lineageId, nodeId, effectSeq, generation = 0)
// src/pdp
types.ts:11-57   Entity { uid: { type; id }; attrs; parents }  Egress { method; host; path; bodyDigest; serviceId; ttlSeconds }  Permit = Egress  PolicyRequest { principal; action; resource; context; entities; egress? }  Decision { decision: "allow" | "deny"; decisionId; reasons; errors; policySetVersion; permit? }
contexts.ts:5-23,54-63  EntityRef = { __entity: { type; id } }  ToolArgs  Approval { approver: EntityRef; role: EntityRef }  ApproversByRole { tenant_admin?; author?; approver?; auditor?: EntityRef[] }
principal.ts:5-11,66,70-88  PrincipalEntity { tenantId; userId; kind: "human" | "service"; roles; teams }  scopedId(tenantId, id)  userEntity(p): Entity
values.ts:5,21,25  MAX_SLICE_ENTITIES = 24 (guards.ts refuses more, and a duplicate entity)  entityRef(type, id)  toDecimal(n)   cedar-schema.ts:48-53  Flow { tenant, owner_team, reviewed }, Tool { tenant, effect }, Block { tenant, kind, flow }
log.ts:104-142   recordDecision(tx: TenantTx, ctx, decision, req, extra?: { runId?; nodeId? }): Promise<boolean>  // run_id, node_id 1..128 characters   decisions-query.ts:137 listPolicyDecisions(pool, ctx, { filter?: { runId? }, order, limit })   api/test-run-routes.ts:111 registryVersionLoader(pool)
```

## M5 names (folders)

```ts
// add-hook-trace, src/interpreter/hooks/approvals.ts (exported from src/interpreter/index.ts)
export interface PathStep { nodeId: string; kind: string; state: StepState; outcome: string | null; output: JsonValue | null }
export interface Approval { nodeId: string; decision: "approved" | "rejected"; approver: string | null }   // not the PDP's Approval
export function approvalsOnPath(steps: readonly PathStep[]): Approval[];
// add-hook-runtime, src/interpreter/hooks/types.ts
export interface HookServices { ops: WorkflowOps; invoker: ToolInvoker; effects: EffectGate; sandbox: WorkerSandbox | null; block(ref: string): BlockDef | undefined; resolve(value: unknown): JsonValue; scope: RunScope }
// add-taint-runtime, src/authoring/taint/runtime.ts
export interface HookTaintScope { input: Taint; output: ProducedTaint | null }
export function valueTaint(value: unknown, taintOf: TaintOf, hook?: HookTaintScope): Taint;
```

- add-block-hooks: `StepContext` gains `readonly hook?: { phase: HookPhase; label: string }`; `HOOK_ERROR` has `details` `{ hook, reason }` with reason `tool_failed | input_invalid | output_invalid | args_unresolved | block_missing | effect_unknown | effect_retry`, and `on_error: continue` swallows the first four.
