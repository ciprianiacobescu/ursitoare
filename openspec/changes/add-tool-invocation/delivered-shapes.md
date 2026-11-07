# Delivered shapes taken by add-tool-invocation

Merged code: main@62b84e23, read 2026-11-07 (`file:line`; `…` elides unused members). `ServiceResolver` and `ServiceTarget`: `add-credentials` Interfaces given.

```ts
// src/interpreter (U33, U39)
types.ts:20-27   interface ToolCall { tool: string; args: JsonValue; nodeId: string; effectSeq: number; phase?: "pre" | "post"; hookId?: string }
types.ts:38-53   interface StepContext { readonly tenant: TenantContext; runId; lineageId; flowId; flowHash; nodeId: string; kind: NodeKind; mode: EffectMode; attempt: number; effect: Effect | null; unsafeToRetry: boolean; idemKey: string | null; principal: RunPrincipal; now: Date }
types.ts:55-57   interface ToolInvoker { invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult> }
types.ts:82-89   interface NodeServices { ops; invoker: ToolInvoker; effects: EffectGate; resolve(value: unknown): JsonValue; block(ref: string): BlockDef | undefined; sandbox?: WorkerSandbox }
types.ts:103-119 type VersionLoader = (ctx: TenantContext, flowId: string, hash: string) => Promise<LoadedVersion | null>   interface InterpreterDeps { …; invokerFor: (mode: EffectMode, run: RunRecord) => Promise<ToolInvoker>; …; sandbox?: WorkerSandbox }
errors.ts:1-42   InterpreterErrorCode (16 members) and INTERPRETER_ERROR_CODES (the same 16, not exported)
errors.ts:48-79  class InterpreterError(code, message, node?, details?: Record<string, string | string[]>); toInterpreterError(value): InterpreterError | null
runtimes/block.ts:11-130   mapFailure(error, nodeId, stage); prepare() at 32; read: one step <id>; effect: step <id> runs prepare, effects.before, invoke and returns { output, idemKey }, step <id>#done runs effects.after
visit.ts:28-41,114,142   interface VisitRequest { run; nodeId; node; seq; blocks; scope; deps; tenant; ops; invoker; runtime; now }; ctx (82-97) and services (193-200) are built here; rows are written with policyDecisionId: null
execute.ts:249-316   the visit loop; 296-303 any InterpreterError of a visit ends the run failed (no node retry, no failure route)
registry.ts:10,30 registerNodeRuntime, nodeRuntimeFor   mocks.ts:288-318 testRunInvokers (311: `loaded ??= load(ctx.tenant)`)
// src/runs, src/tenancy
runs/index.ts:3   export type { TenantContext, TenantTx, TenantPool }   (runtimes may not import tenancy: test/arch/modules.ts:50-67)   tenancy/tx.ts:6,14 TenantPool = Pick<pg.Pool, "connect">; withTenantTx(pool, ctx, fn)
runs/store/types.ts:27-30,60-81,105-145   RunRecord { runId; lineageId; flowId; flowHash; ownerTeam; mode; principal: { userId; kind }; … } (no tenant member); StepWrite and StepRecord with policyDecisionId: string | null
// src/pdp
types.ts:11-57   Entity { uid: { type; id }; attrs; parents }  Egress { method; host; path; bodyDigest; serviceId; ttlSeconds }  Permit = Egress  PolicyRequest { principal; action; resource; context; entities; egress? }  Decision { decision: "allow" | "deny"; decisionId; reasons; errors; policySetVersion; permit? }
contexts.ts:5-23,54-63  EntityRef = { __entity: { type; id } }  ToolArgs  Approval { approver: EntityRef; role: EntityRef }  ApproversByRole { tenant_admin?; author?; approver?; auditor?: EntityRef[] }
principal.ts:5-11,66,70-88  PrincipalEntity { tenantId; userId; kind: "human" | "service"; roles; teams }  scopedId(tenantId, id)  userEntity(p): Entity
values.ts:5,21,25  MAX_SLICE_ENTITIES = 24 (guards.ts refuses more, and a duplicate entity)  entityRef(type, id)  toDecimal(n)   cedar-schema.ts:48-53  Flow { tenant, owner_team, reviewed }, Tool { tenant, effect }, Block { tenant, kind, flow }
log.ts:8-13,104-142   recordDecision(tx: TenantTx, ctx, decision, req, extra?: { runId?; nodeId? }): Promise<boolean>  // run_id, node_id 1..128 characters; ON CONFLICT (tenant_id, decision_id, decided_at) DO NOTHING, answers rowCount === 1   decisions-query.ts:137 listPolicyDecisions(pool, ctx, { filter?: { runId? }, order, limit })
api/test-run-routes.ts:111-130 registryVersionLoader(pool): flow = version.canonical (jsonb, sorted keys: authoring/format/canonical.ts:2-6, migrations/0270_flow_registry.sql:19)
```

## From plan m5

Plan m6 activates only after plan m5 completes (L4 0.4.54 refuses `external_dependencies`, `yolo/admit.py:170`), so these are implemented on main when this unit runs. Copied from each unit's `openspec/changes/<unit>/proposal.md` Interfaces on this worktree; only the names this unit uses.

```ts
// add-hook-trace: src/interpreter/hooks/approvals.ts (exported from src/interpreter/index.ts)
export interface PathStep { nodeId: string; kind: string; state: StepState; outcome: string | null; output: JsonValue | null }
export interface Approval { nodeId: string; decision: "approved" | "rejected"; approver: string | null }   // not the PDP's Approval
export function approvalsOnPath(steps: readonly PathStep[]): Approval[];
// add-hook-runtime: src/interpreter/hooks/types.ts (exported from src/interpreter/index.ts)
export interface HookContext { phase: HookPhase; node: NodeMeta; from: NodeMeta | null; next: NodeMeta | null; next_candidates: NodeMeta[]; input: JsonValue | null; output: JsonValue | null; outcome: string | null; attempt: number; feedback: JsonValue | null; args: JsonValue }   // `NodeMeta`: add-hook-checker
export interface HookRun { outcome: HookOutcome; entry: HookTraceEntry }
export interface HookStepSite { fused: boolean; stepName: string; slot: number }
export interface HookServices { ops: WorkflowOps; invoker: ToolInvoker; effects: EffectGate; sandbox: WorkerSandbox | null; block(ref: string): BlockDef | undefined; resolve(value: unknown): JsonValue; scope: RunScope }
export interface HookRunner { run(placement: HookPlacement, hctx: HookContext, step: StepContext, services: HookServices, site: HookStepSite): Promise<HookRun> }
// add-hook-runtime: src/interpreter/hooks/names.ts
export function hookStepName(nodeId: string, placement: HookPlacement): string;   // `${nodeId}:${phase}:${label}` (add-block-hooks design § Interfaces)
// add-hook-checker: src/authoring/hooks (exported from src/authoring/index.ts)
export type HookPhase = "pre" | "post";
export interface HookPlacement { phase: HookPhase; hook: HookDef; ruleId: string | null; label: string }
// add-taint-runtime: src/authoring/taint/runtime.ts (exported from src/authoring/index.ts)
export interface ProducedTaint { output: Taint; fields: Readonly<Record<string, Taint>>; outcome: Taint }
export type TaintOf = (nodeId: string) => ProducedTaint | undefined;
export interface HookTaintScope { input: Taint; output: ProducedTaint | null }
export function valueTaint(value: unknown, taintOf: TaintOf, hook?: HookTaintScope): Taint;
// add-block-hooks: src/interpreter/hooks/block-runner.ts (exported from src/interpreter/index.ts)
export const blockHookRunner: HookRunner;      // registered for "block"
// add-block-hooks proposal Scaffold bullet: StepContext gains readonly hook?: { phase: HookPhase; label: string }   (src/interpreter/types.ts)
```

`Taint` is `readonly TaintLabel[]`, `TaintLabel` `"extracted" | "untrusted"` (`src/authoring/taint/labels.ts:1-3`). `HOOK_ERROR` `details` are `{ hook, reason }`; `on_error: continue` swallows `tool_failed`, `input_invalid`, `output_invalid` and `args_unresolved` and no other reason (add-block-hooks design 4).
