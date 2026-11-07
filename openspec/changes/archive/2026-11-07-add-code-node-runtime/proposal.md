## Why

`code` nodes validate (L1-L3) but cannot run: `startRun` refuses them and no runtime exists. With U38's pool, this unit runs pure `code` nodes durably, in mock test runs too (F3), every sandbox failure contained.

Batch `m5-code-hooks` (U38-U44 and U42b, in plan order U38, U39, U40, U41, U42, U42b, U43, U44; closing unit `add-web-hooks-view`, journey `e2e/test_m5_code_hooks.py`) delivers M5: flows with pure `code` nodes and pre/post hooks run durably; hook routes into effect nodes are rejected. This unit's part: the `code` runtime on the injected pool, the engine's pool, and exit test 15 (a memory bomb and a deep recursion inside a DBOS step are contained). The plan runs acceptance profile `all` after this unit merges: every configured gate (setup, build, lint, typecheck, test, e2e) on the target; the batch outcome itself is proven by the closing unit's journey.

Observable result: `code-pay` (lookup, a `normalize` code node, pay, done) started through the test endpoint completes, with `normalize` recorded as kind `code` and `pay` called with amount `1234.57`; a code node that exhausts memory or recurses without end ends its run `failed` with `INTERPRETER_CODE_FAILED` (`details.fault` `memory_limit` or `stack_overflow`) after one sandbox call, and the next run completes; `rf-1-core` is refused for its `llm.*` nodes only; the engine creates and closes one pool; `/health` `checks` stay `{ db: "ok" }`.

## What Changes

New: `src/interpreter/runtimes/code.ts`, `test/support/code-pay.ts`, `test/support/code-pay-seed.ts` and tests. Edited in named tasks: `src/interpreter/{types,errors,registry,index,visit}.ts`, `src/main.ts`, `test/support/node-conformance.ts`, three frozen tests. Capability `node-code` (ADDED); MODIFIED `interpreter` (two requirements) and `flow-testing` (one), each restated whole, scenario names unchanged.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: the lines marked so in the block below, the exports in `src/interpreter/index.ts`, the pool in `main`, and the `inputFor` case and `services.sandbox` in `visit.ts`. No new dependency.
- **Depends on** (evidence in `delivered-shapes.md`): `add-flow-format-model` (U22, `CodeNode`), `add-dbos-runtime` (U30, `launchDurable`, `main`'s durable branch), `add-envelope-store` (U31, `createRunStore`, `payloadDigest`, `StepRecord`), `add-interpreter-core` (U33, the registry, `visitNode`, `executeRun`, the kit), `add-mock-test-runs` (U35, `registerTestRunRoutes`, `seedMockRunFlows`, and the `flow-testing` requirement MODIFIED here), `add-code-sandbox` (U38), `add-test-catalogue` (U24, `loadTestCatalogue`), `add-flow-validator` (U25, `validateFlowText`). Edges added to the roadmap row: U22, U24, U25, U30, U31, U35; U32 dropped [D19]: exit 15 is proven in-process on a DBOS run, with no crash harness.
- **Changed:** three frozen tests, named in `tasks.md` 2.1 (`registry.test.ts::C-f3de9ac6`, `start.test.ts::C-d807f118`, `test-run-refusals.test.ts::C-7d9b0050`). `src/main.durable.test.ts::C-c37d6095` and `src/main.mockruns.test.ts` stay as they are (the pool spawns no worker until a run). No migration, endpoint, API error code, policy, e2e part, CLI command, feature file or health check [D18].
- **Rulings** (`m5-decisions.md`): D4, D5, D8, D18, D19, D21 and the U38 rulings (argument caps, `nowIso` with `Z`, lazy respawn); `design.md` tags each use.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/interpreter/runtimes/code.ts (exported from src/interpreter/index.ts)
export const codeRuntime: NodeRuntime;
export const CODE_LIMITS: Readonly<SandboxLimits>;      // equal to U38's DEFAULT_SANDBOX_LIMITS
export function codeSeed(ctx: StepContext): string;      // `${ctx.runId}:${ctx.nodeId}:${ctx.attempt}`
// Not scaffolded (members of existing interfaces, values and calls in existing files):
//   src/interpreter/types.ts   InterpreterDeps gains `sandbox?: WorkerSandbox`; NodeServices gains `sandbox?: WorkerSandbox`
//   src/interpreter/errors.ts  InterpreterErrorCode and INTERPRETER_ERROR_CODES gain "INTERPRETER_CODE_FAILED", "INTERPRETER_NO_SANDBOX"
//   src/interpreter/registry.ts  SUPPORTED_KINDS = ["block", "code", "end", "switch", "wait"]
//   src/interpreter/index.ts   registerNodeRuntime("code", codeRuntime)
//   test/support/node-conformance.ts  ConformanceCase gains `sandbox?: WorkerSandbox`
//   src/main.ts                MainDeps gains `createSandbox?: typeof createWorkerSandbox`
// test/support/code-pay.ts
export const CODE_PAY_TEXT: string;                      // the YAML of test-plan.md
export function codePayVersion(): LoadedVersion;         // flowId "code-pay", state "validated", ownerTeam "finance"
// test/support/code-pay-seed.ts
export function seedCodePay(db: TestDatabase, ctx: TenantContext, clock: Clock): Promise<string>;  // after seedMockRunFlows; the validated hash
```

**Interfaces taken:**

- From `add-code-sandbox` (U38, restated in `design.md`): `WorkerSandbox`, `createWorkerSandbox`, `WorkerSandboxOptions`, `SandboxLimits`, `DEFAULT_SANDBOX_LIMITS`, `poolSize`, `SandboxFaultCode`, `SandboxOptions`, `SandboxResult`, `SandboxError`, `SandboxErrorCode`.
- From `add-interpreter-core` (U33): `NodeRuntime`, `NodeServices`, `StepContext`, `InterpreterDeps`, `registerNodeRuntime`, `nodeRuntimeFor`, `SUPPORTED_KINDS`, `InterpreterError`, `toInterpreterError`, `checkSchema`, `memoryWorkflowOps`, `startRun`, `executeRun`, `registerRunWorkflow`, `bindInterpreter`, `runConformance`, `ConformanceCase`, `waitForRun`. From `add-dbos-runtime` (U30): `launchDurable`, `StepObserver`, `main`, `MainDeps`. From `add-envelope-store` (U31): `createRunStore`, `payloadDigest`. From `add-mock-test-runs` (U35): `registerTestRunRoutes`, `seedMockRunFlows`. From `add-flow-format-model` (U22): `CodeNode`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@a6b5fb37, checked line by line).

## Out of scope

Hooks (U42), row taint (U40), retries (U42), a sandbox in `ursitoare flow test` (D5, later), `fetch` or any host function, an environment variable, a health check, an API error code, a policy, a CLI command, any `web/` change (until U44 the run timeline shows `code (unknown kind)`), the footprint harness (M15), the pool itself (U38).
