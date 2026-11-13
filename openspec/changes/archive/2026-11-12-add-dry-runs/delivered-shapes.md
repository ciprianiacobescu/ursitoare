# Delivered shapes taken by add-dry-runs

Declarations from main@cf34c628 (`file:line`; `…` elides unused members); `flowOwnerTeam`, `payloadDigest`, the closures, the principal and session helpers were read at 62b84e23. M5 and M6 names come from their folders' Interfaces blocks.

```ts
// src/interpreter (U33, U35)
types.ts:17-26   type EffectMode = "live" | "mock" | "stub"   interface ToolCall { tool; args: JsonValue; nodeId: string; effectSeq: number; phase?: "pre" | "post"; hookId?: string }
types.ts:37-56   interface StepContext { readonly tenant: TenantContext; runId; …; nodeId: string; mode: EffectMode; attempt: number; effect: Effect | null; idemKey: string | null; … }   interface ToolInvoker { invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult> }   ToolResult { output: JsonValue }
types.ts:107-127 interface InterpreterDeps { store: RunStore; durable: Pick<DurableRuntime, "enqueue"> | null; loadVersion; catalogueFor; invokerFor: (mode: EffectMode, run: RunRecord) => Promise<ToolInvoker>; effects; clock; ids }   interface StartRunRequest { flowId; hash; mode: EffectMode; input; mocks: JsonValue | null; principal; actorChain; runId? }
errors.ts:44-61  class InterpreterError(code, message, node?, details?: Record<string, string | string[]>)
mocks.ts:9-18    type MockEntry = { output: JsonValue } | { error: { code: string; message: string } }   type TestMocks = { [nodeId: string]: MockEntry[] }
mocks.ts:187     checkMocks(flow, catalogue, mocks): { mocks: TestMocks | null; problems: MockProblem[] }   (entry rules and texts :20-144; cap 50 :22)
mocks.ts:288-317 testRunInvokers(store): InterpreterDeps["invokerFor"]  // refuses every mode but "mock" with INTERPRETER_NO_INVOKER; loads run.mocksRef on first use through ctx.tenant (:298-300)
start.ts:33-129  startRun(deps, ctx, req): Promise<RunRecord>  // refuses a draft (:45); draws deps.ids.next("run") without req.runId (:80); stores mode: req.mode, trigger "test", mocks (:97-102)
runtimes/wait.ts:16 a wait sleeps unless ctx.mode is "mock"   runs/intents/gate.ts:74 a stored intent of another mode is "unknown"
// src/api
test-run-routes.ts:64-109,111,139-260  mapStartRunError (module-private on main; the mapping below), `export function registryVersionLoader(pool)` (:111), registerTestRunRoutes (`context` :140 and `loadFlowResource` :152-170 are closures inside it, not exported; the dry-run route writes its own; :233-255 idempotency)
run-routes.ts:41-47,104-126  RunApiDeps { pool; clock; ids; engineKey: KeyMaterial | null; durable }, `context` (:107) and `loadRun` (:120) are closures inside `registerRunRoutes`, not exported (the decisions route writes its own)   run-views.ts:119-137,177  RUN_VIEW_SCHEMA, STEP_VIEW_SCHEMA, toRunView, runResource(tenantId, run): ResourceRef
pagination.ts:17-91 PAGE_QUERY_SCHEMA, readPage, startAfter, paginate   cursor.ts:101 deriveCursorKey   flow-common.ts:54-82 pageSchema, engineKeyRequired (503), cursorInvalid (400), notFound (404)
// src/pdp, src/identity, src/runs
pdp/decisions-query.ts:14-28,137 PolicyDecisionRecord { decisionId; decidedAt; runId; nodeId; action; principal; resource; decision; reasons; errors; policySetVersion; requestDigest; permit: Record<string, unknown> | null }   listPolicyDecisions(pool, ctx, { filter?: { runId? }, continueAfter?, order, limit 1..200 })
pdp/actions.ts:90 dry_run_flow on ["Tenant", "Flow"]   pdp/fragments.ts:72 defaultSrcDir(); fragments are src/<module>/policy/*.cedar
identity/users.ts:13-21,150-158 (a malformed id throws IDENTITY_INVALID) User { userId; kind: "human" | "service"; state: "active" | "disabled"; … }, getUser(tx, ctx, userId)   identity/rbac/memberships.ts:4-14 MembershipSet { roles; teams }, loadMemberships(tx, ctx, userId) (sorted; active users only)   identity/rbac/principal.ts:9-27 resolvePrincipal   pdp/principal.ts:5-11 PrincipalEntity { tenantId; userId; kind; roles; teams }
// test/support: api-session.ts:13 createTestSession(db, ctx, subject, clock)   flow-actors.ts seedFlowActors(db, ctx, [{ subject; roles; teams }], clock)
registry/index.ts:21 `flowOwnerTeam(tx, ctx, flowId): Promise<string | null>`   runs/index.ts:26 `payloadDigest(value: PayloadValue): string`
runs/store/run-store.ts:15-26 RunStore { createRun; getRun; recordStep; listSteps; getPayload(ctx, sha256) }   runs/store/types.ts:60-81 RunRecord (…, mocksRef: string | null)   runs/index.ts:34 createMemoryRunStore()
// src/main.ts at 62b84e23, before the M6 edits: :229-238 engine (`createPolicyEngine` :230) and `installPep` :238; :281 `let interpreter`; :291 `base: InterpreterDeps`; :325 registerRunRoutes; :333 registerTestRunRoutes
// test/support/crash/pay-once.ts:19-47 PAY_ONCE_INPUT, PAY_ONCE_PAID_OUTPUT, payOnceVersion(), payOnceCatalogue()
```

## `mapStartRunError`, complete (src/api/test-run-routes.ts:64-109, main@cf34c628)

`mapStartRunError(error: unknown): never` always throws; the dry-run route calls it unchanged (task 4.1 only adds `export`) on the errors of `startRun` (`start.ts`: exactly the five `InterpreterError` codes below, at :41, :47, :56, :74, :115) and of the run store. `notFound()` is `flow-common.ts:82`, `runsUnavailable()` `test-run-routes.ts:51`.

| error (line) | answer |
|---|---|
| `INTERPRETER_VERSION_NOT_FOUND` (:67) | 404 `NOT_FOUND` `Resource not found`, no `details` |
| `INTERPRETER_VERSION_NOT_RUNNABLE` (:69-79) | 422 `OPERATION_REFUSED` `Operation is refused`, `details` `{ reason: "version_not_runnable", cause }`, `cause` the string `error.details.reason` (a draft: `draft`) else `not_runnable`, plus `blocks` when `error.details.blocks` is an array |
| `INTERPRETER_KIND_UNSUPPORTED` (:80) | 422 `OPERATION_REFUSED`, `{ reason: "kind_unsupported", kinds: error.details.kinds }` |
| `INTERPRETER_INPUT_INVALID` (:85-96) | 400 `VALIDATION_FAILED` `Request validation failed`, `{ fields: [{ field: "body/input", message: "must satisfy the flow inputs (<path> <keyword>)" }] }`, `path` and `keyword` from `error.details` (defaults `/` and `schema`) |
| `INTERPRETER_UNBOUND` (:97) | 503 `RUNS_UNAVAILABLE` `Runs are unavailable` |
| other `InterpreterError` (:99), anything else (:108) | rethrown |
| `RunDataError` (:103) | 400 `VALIDATION_FAILED`, `{ fields: [{ field: "body", message: "must be plain JSON of at most 1 MiB" }] }` |

## From plan m5

```ts
// add-hook-checker (openspec/changes/add-hook-checker/proposal.md Interfaces; src/authoring/hooks/model.ts, re-exported by src/authoring/index.ts)
export type HookPhase = "pre" | "post";
export interface HookPlacement { phase: HookPhase; hook: HookDef; ruleId: string | null; label: string }
export function hookPlacements(flow: Flow, nodeId: string, catalogue: Catalogue): { pre: HookPlacement[]; post: HookPlacement[] };
export function augmentedSuccessors(flow: Flow, catalogue: Catalogue): ReadonlyMap<string, readonly string[]>;   // successor fields, then hook routes
// add-block-hooks (…/add-block-hooks/proposal.md Interfaces; src/interpreter/hooks/block-runner.ts)
export function hookMockKey(nodeId: string, placement: HookPlacement): string;   // equals hookStepName(nodeId, placement) = `${nodeId}:${phase}:${label}`
// add-hook-trace (…/add-hook-trace/proposal.md Interfaces; src/runs/store/types.ts)
export interface StepHookEntry { …; state: "completed" | "failed"; …; error: { code: string; message: string } | null; tool: string | null; … }   // unused members elided
export interface StepHooks { inputOriginalRef: string | null; entries: StepHookEntry[] }   // StepRecord.hooks?: StepHooks
```

- add-block-hooks (`specs/hooks-block/spec.md`, "A block hook is its own step and calls its tool as a hook", "A failing block hook fails the node, or with on_error continue is recorded and skipped"): `blockHookRunner` calls `services.invoker` with `{ tool, args, nodeId, effectSeq: site.slot, phase, hookId: placement.label }` and the context `{ ...step, attempt: hctx.attempt, effect: def.effect, unsafeToRetry, idemKey: null, hook: { phase, label } }`, `def` the hook block's definition: a hook context's effect is the hook block's own. An invoker failure throws `HOOK_ERROR` (message `block hook "<label>" failed (tool_failed)`, `details` `{ hook: "<node>:<phase>:<label>", reason: "tool_failed" }`); with `on_error: "continue"` it is a `failed` entry (`error` `{ code: "HOOK_ERROR", message: "block hook failed (tool_failed)" }`) and the node goes on.
- add-hook-trace: `STEP_VIEW_SCHEMA.properties.hooks` is a closed object whose `inputOriginalRef` is `{ type: ["string", "null"], pattern: "^[0-9a-f]{64}$" }`.
The M6 names are in their folders' Interfaces given blocks.
