## Context

A `code` node is pure JavaScript (ADR-04): input in, object out, no host function. U33 already walks, records and replays nodes; this change adds the `code` runtime on U38's pool, opens `startRun` and the test endpoint to `code`, and gives the engine its pool.

## Decisions

1. **Built in, pool injected [D4].** `src/interpreter/index.ts` registers `codeRuntime`. The pool arrives through `InterpreterDeps.sandbox?`, which `visitNode` copies to `NodeServices.sandbox?` by conditional spread (`tsconfig.json:10` sets `exactOptionalPropertyTypes`, which refuses `sandbox: undefined`); absent stays absent. `inputFor` gets `case "code": return resolve(node.input);`.
2. **One step named by the node id; all five checks run inside its `runStep` callback** (so the `started` row exists when one fails), in the order of the requirements: sandbox present, input resolved (an unresolved reference is rethrown with `node` set to the id, as the block runtime does), `run`, `checkSchema(node.output_schema, value)`, then `payloadDigest(value)` in a try. The step returns `{ output, outcome: null, next: node.next ?? null, end: null }`, so a recorded code step is always storable.
3. **Faults are terminal.** The error is thrown inside the step; `WorkflowOps.runStep` has no retry option (M4 D18), so the pool is called once per visit. A fault `message` can hold input data (U38), so only its code is copied. Both new codes join the union and `INTERPRETER_ERROR_CODES`: DBOS revives a recorded step error as a plain `Error` that `toInterpreterError` knows by `code` alone.
4. **Seed and clock.** `ctx.now` is read once per visit, so the guarantee is: same run, node, attempt and `ctx.now` give the same output. After a crash re-runs a step body the visit has a new `now`; DBOS keeps only the recorded result. `CODE_LIMITS` is `Object.freeze({ ...DEFAULT_SANDBOX_LIMITS })` [D8].
5. **Why the payload check.** The Phase-0 pool returns a U+0000 string, a lone surrogate and 65 nested objects as `ok`; `assertPayloadValue` refuses them. Without the check `writeFinal` would throw outside the step, no `run:finish` would run and the run would stay `running`.
6. **`main` [D8, D18].** In the durable branch, before `bindInterpreter`, `main` creates the pool (`main` imports `availableParallelism` from `node:os`; `src/sandbox` may not) and sets `base.sandbox`; the branch's `catch` and `closeAll` close it, after `durable.shutdown()` and before the database. A throwing `createSandbox` is a start failure with the usual fatal line. No health check.
7. **Not here.** `ursitoare flow test` has no sandbox, so a code node fails `INTERPRETER_NO_SANDBOX` there [D5]; no CLI scenario. A code node never has a mock (`checkMocks` keeps `not_a_block`): F3 runs it for real.
8. **Test support.** `test/support/code-pay.ts` holds `CODE_PAY_TEXT` and `codePayVersion()`. `test/support/code-pay-seed.ts` holds `seedCodePay`, modelled on `seedMockRunFlows` (`createFlow`, `saveFlowVersion`, `validateVersion` with `loadTestCatalogue()`; flow `code-pay`, team `finance`; called after `seedMockRunFlows`).

## Interfaces

Given (equal to `proposal.md`):

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

Taken from `add-code-sandbox` (U38, `src/sandbox/index.ts`, copied from its proposal):

```ts
export type SandboxJson = null | boolean | number | string | SandboxJson[] | { [key: string]: SandboxJson };
export type SandboxFaultCode =
  | "timeout" | "memory_limit" | "stack_overflow" | "output_too_large" | "output_invalid"
  | "input_invalid" | "syntax_error" | "runtime_error" | "never_settled" | "sandbox_crash";
export interface SandboxLimits { timeoutMs: number; memoryBytes: number; maxStackBytes: number; maxOutputBytes: number }
export interface SandboxOptions { seed: string; nowIso: string; binding: "input" | "ctx"; result: "object" | "object_or_null" }
export interface SandboxStats { ms: number; memBytes: number }   // memBytes -1 when not sampled
export type SandboxResult =
  | { ok: true; value: { [key: string]: SandboxJson } | null; stats: SandboxStats }
  | { ok: false; fault: { code: SandboxFaultCode; message: string }; stats: SandboxStats };
export interface WorkerSandbox {
  readonly size: number; readonly respawns: number;
  run(code: string, input: SandboxJson, limits: SandboxLimits, options: SandboxOptions): Promise<SandboxResult>;
  close(): Promise<void>;
}
export interface WorkerSandboxOptions { size?: number; graceMs?: number; stackSizeMb?: number; stackCapBytes?: number; maxOldGenerationSizeMb?: number; workerFactory?: (url: URL, options: WorkerOptions) => Worker }
export type SandboxErrorCode = "SANDBOX_CLOSED" | "SANDBOX_INVALID";
export class SandboxError extends Error { readonly code: SandboxErrorCode; readonly details: Readonly<Record<string, string>>; constructor(code: SandboxErrorCode, message: string, details?: Record<string, string>) }
export const DEFAULT_SANDBOX_LIMITS: Readonly<SandboxLimits>;  // { timeoutMs: 1000, memoryBytes: 33554432, maxStackBytes: 262144, maxOutputBytes: 1048576 }
export function poolSize(availableCpus: number): number;      // max(1, min(2, n - 1))
export function createWorkerSandbox(opts?: WorkerSandboxOptions): WorkerSandbox;
```

The rest is merged code: `proposal.md` § Interfaces taken, declarations in `delivered-shapes.md`.

## Failure cases

No sandbox, an unresolved reference, a fault, a rejecting pool, a schema mismatch and an unstorable object each fail the node once with a fixed message, and the run ends `failed` with the same `RunError`. An input over the pool's 8,000,000 characters is the fault `input_invalid`. The pool closes after `durable.shutdown()`, so a run still in flight then fails `sandbox_unavailable` at worst.

## Security

1. No endpoint and no PEP action: the test endpoint keeps `test_flow`. 2. No table; every store call carries the run's `TenantContext`; tenants share one pool, but each run gets a fresh runtime and only the node's resolved input (U38). 3. The source is checked at L1 (`L1_CODE_NO_RETURN`), the object against `output_schema` and `payloadDigest`; rows keep `taint: []` until U40. 4. No secret reaches the sandbox (`env: {}`, U38); the guest's message never enters an error, row or run. 5. Abuse and proof: a loop, bomb, recursion, oversized output, secret in a thrown error, U+0000, lone surrogate or 65 levels in the output (scenarios "Faults, a missing sandbox, unstorable output and no leak" and "A memory bomb and a deep recursion on DBOS"), a mock aimed at a code node ("code-pay through main…"), a pool closed under a run.

## Test plan

Timing is toleranced: `loop` in `[1000, 3250]` ms (`timeoutMs` + 250 grace + 2000); memory by RSS growth; pools close in `finally`; DBOS tests use `waitForRun` (20 s). No scenario replays a failed step (D21). I ran `code-pay` and the three `solo` flows through `validateFlowText(…, loadTestCatalogue())` on main@a6b5fb37: `ok` at L1-L3.

## Decisions made while writing

- The payload check goes beyond the card (decision 5). `INTERPRETER_NO_SANDBOX` precedes input resolution; `sandbox_unavailable` covers every rejection of `run`; `CODE_LIMITS` is frozen.
- `seedCodePay` and `codePayVersion` are test support for the card's fixture `code-pay`.

## Unverified

U38's pool is not written: every pool result is from the Phase-0 pool (Node 26.8.1; the planner's probe covered Node 24.22.2). The DBOS, `main` and test-endpoint scenarios were not run (they need U38 and this code); the 256 MiB RSS bound is the card's, unmeasured on DBOS.
