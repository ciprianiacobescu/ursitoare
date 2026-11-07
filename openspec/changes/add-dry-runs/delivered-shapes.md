# Delivered shapes taken by add-dry-runs

Declarations from main@cf34c628 (`file:line`; `…` elides unused members). M5 and M6 names come from their folders' Interfaces blocks.

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
test-run-routes.ts:64-109,111,139-260  mapStartRunError (module-private on main; the mapping below), registryVersionLoader(pool), registerTestRunRoutes (:152-170 resource loader, :233-255 idempotency)
run-routes.ts:41-47,104-126  RunApiDeps { pool; clock; ids; engineKey: KeyMaterial | null; durable }, context(), loadRun   run-views.ts:119-137,177  RUN_VIEW_SCHEMA, STEP_VIEW_SCHEMA, toRunView, runResource(tenantId, run): ResourceRef
pagination.ts:17-91 PAGE_QUERY_SCHEMA, readPage, startAfter, paginate   cursor.ts:101 deriveCursorKey   flow-common.ts:54-82 pageSchema, engineKeyRequired (503), cursorInvalid (400), notFound (404)
// src/pdp, src/identity, src/runs
pdp/decisions-query.ts:14-28,137 PolicyDecisionRecord { decisionId; decidedAt; runId; nodeId; action; principal; resource; decision; reasons; errors; policySetVersion; requestDigest; permit: Record<string, unknown> | null }   listPolicyDecisions(pool, ctx, { filter?: { runId? }, continueAfter?, order, limit 1..200 })
pdp/actions.ts:90 dry_run_flow on ["Tenant", "Flow"]   pdp/fragments.ts:72 defaultSrcDir(); fragments are src/<module>/policy/*.cedar
identity/users.ts:13-21,150 User { userId; kind: "human" | "service"; state: "active" | "disabled"; … }, getUser(tx, ctx, userId)   identity/rbac/memberships.ts:4-14 MembershipSet { roles; teams }, loadMemberships(tx, ctx, userId)
runs/store/run-store.ts:15-26 RunStore { createRun; getRun; recordStep; listSteps; getPayload(ctx, sha256) }   runs/store/types.ts:60-81 RunRecord (…, mocksRef: string | null)   runs/index.ts:34 createMemoryRunStore()
// src/main.ts before the M6 edits: :216-225 engine and installPep; :277-286 `base: InterpreterDeps` with invokerFor: testRunInvokers(store); :304 registerRunRoutes; :312 registerTestRunRoutes
// test/support/crash/pay-once.ts:19-47 PAY_ONCE_INPUT, PAY_ONCE_PAID_OUTPUT, payOnceVersion(), payOnceCatalogue()
```

## `mapStartRunError`, complete (src/api/test-run-routes.ts:64-109, main@cf34c628)

`function mapStartRunError(error: unknown): never` throws and never returns. The dry-run route calls it unchanged (task 4.1 only adds `export`), on the errors of `startRun` (`src/interpreter/start.ts`, which throws exactly the five `InterpreterError` codes below, at :41, :47, :56, :74, :115) and of the run store. `ApiError(status, code, message, details?)`; `notFound()` is `flow-common.ts:82` and `runsUnavailable()` is `test-run-routes.ts:51`.

| error | status, code, message | `details` | line |
|---|---|---|---|
| `INTERPRETER_VERSION_NOT_FOUND` | 404 `NOT_FOUND` `Resource not found` | none | :67-68 |
| `INTERPRETER_VERSION_NOT_RUNNABLE` (a draft: `details.reason` `draft`) | 422 `OPERATION_REFUSED` `Operation is refused` | `{ reason: "version_not_runnable", cause: <error.details.reason when a string, else "not_runnable"> }` plus `blocks` when `error.details.blocks` is an array | :69-79 |
| `INTERPRETER_KIND_UNSUPPORTED` | 422 `OPERATION_REFUSED` `Operation is refused` | `{ reason: "kind_unsupported", kinds: error.details.kinds }` | :80-84 |
| `INTERPRETER_INPUT_INVALID` | 400 `VALIDATION_FAILED` `Request validation failed` | `{ fields: [{ field: "body/input", message: "must satisfy the flow inputs (<path> <keyword>)" }] }`, `path` from `error.details.path` (default `/`), `keyword` from `error.details.keyword` (default `schema`) | :85-96 |
| `INTERPRETER_UNBOUND` (the run could not be queued) | 503 `RUNS_UNAVAILABLE` `Runs are unavailable` | none | :97-98 |
| any other `InterpreterError` | rethrown | | :99-100 |
| `RunDataError` (mocks or input not plain JSON of at most 1 MiB) | 400 `VALIDATION_FAILED` `Request validation failed` | `{ fields: [{ field: "body", message: "must be plain JSON of at most 1 MiB" }] }` | :103-107 |
| anything else | rethrown | | :108 |

## M5 and M6 names (folders)

```ts
// add-hook-checker: hookPlacements(flow, nodeId, catalogue): { pre: HookPlacement[]; post: HookPlacement[] }   HookPlacement { phase; hook: HookDef; ruleId: string | null; label: string }
//   augmentedSuccessors(flow, catalogue): ReadonlyMap<string, readonly string[]>   // successor fields, then hook routes
// add-block-hooks: hookMockKey(nodeId, placement): string   // `${nodeId}:${phase}:${label}`; a hook call carries phase and hookId: placement.label
```

- add-hook-trace: `STEP_VIEW_SCHEMA.properties.hooks` is a closed object whose `inputOriginalRef` is `{ type: ["string", "null"], pattern: "^[0-9a-f]{64}$" }`.
The M6 names (the invoke path, gateway, directory, resolver, policy runtime, harness and fakes) are in their folders' Interfaces given blocks, which the judge sees.
