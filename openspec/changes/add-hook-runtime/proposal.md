## Why

U41 rejects unsafe hook routes, but no run executes a hook.

Observable result: `onion` (rules and node hooks around `pay`) reports eight hook entries in onion order; `f-eff` retries a `mail.send@1` as attempt 2 under `ik1_952c…` after attempt 1's `ik1_747c…`, and not after an `unknown` effect; `skip-pay` fails `HOOK_ACTION_FORBIDDEN` with no payment call; a replay from any recorded prefix reaches the same rows.

Batch `m5-code-hooks` (U38-U44 and U42b, in plan order U38, U39, U40, U41, U42, U42b, U43, U44; closing unit `add-web-hooks-view`, journey `e2e/test_m5_code_hooks.py`) delivers M5: flows with pure `code` nodes and pre/post hooks run durably; hook routes into effect nodes are rejected. This unit's part: the code-hook runtime, its visit algorithm and the retry key. The plan runs acceptance profile `all` after this unit merges: every configured gate (setup, build, lint, typecheck, test, e2e) on the target; the batch outcome itself is proven by the closing unit's journey.

## What Changes

New: `src/interpreter/hooks/`, `test/support/hook-runs/` (nine flows, loader), tests; edits to `src/interpreter/` (types, errors, visit, execute, index, five runtimes), `src/runs/intents/gate.ts`, `test/support/README.md`. Capability `hooks-runtime` (ADDED), ADDED in `idempotency`, MODIFIED `interpreter` "A run records one numbered row per node visit" (whole, scenario names unchanged).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: `NodeServices.hooks?: NodeHooks`, `ToolCall.generation?: number`, `InterpreterDeps.hookObserver?: (nodeId: string, entry: HookTraceEntry) => void`, `IntentCall.generation?: number`, the nine `HOOK_*` codes (`InterpreterErrorCode`, `INTERPRETER_ERROR_CODES`), `registerHookRunner("code", codeHookRunner)` and the exports in `index.ts`. No dependency.
- **Depends on:** `add-flow-format-model` (U22), `add-taint-static` (U23: `Taint`), `add-test-catalogue` (U24: `loadTestCatalogue`), `add-flow-validator` (U25: `validateFlowText`), `add-envelope-store` (U31: `payloadDigest`), `add-interpreter-core` (U33), `add-effect-intents` (U34: `IntentCall`), `add-code-sandbox` (U38), `add-code-node-runtime` (U39), `add-taint-runtime` (U40), `add-hook-checker` (U41). Edges added: U22, U23, U24, U25, U31, U34, U38; U32 dropped (the SIGKILL proofs are U43's).
- No migration, endpoint, API code, policy, e2e part, CLI command, feature file, health check or frozen test change.

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// src/interpreter/hooks/types.ts (exported from src/interpreter/index.ts)
export interface HookContext { phase: HookPhase; node: NodeMeta; from: NodeMeta | null; next: NodeMeta | null; next_candidates: NodeMeta[]; input: JsonValue | null; output: JsonValue | null; outcome: string | null; attempt: number; feedback: JsonValue | null; args: JsonValue }
export type HookOutcome = { action: "continue"; input?: JsonValue; output?: JsonValue } | { action: "skip"; output: JsonValue } | { action: "redirect"; to: string } | { action: "retry"; input?: JsonValue; feedback?: JsonValue } | { action: "fail"; reason: string };
export interface HookTraceEntry { label: string; kind: "code" | "block"; fused: boolean; attempt: number; state: "completed" | "failed"; action: HookOutcome["action"] | null; mutated: "input" | "output" | null; to: string | null; error: { code: string; message: string } | null; tool: string | null; idemKey: string | null }
export interface HookRun { outcome: HookOutcome; entry: HookTraceEntry }
export interface HookStepSite { fused: boolean; stepName: string; slot: number }
export interface HookServices { ops: WorkflowOps; invoker: ToolInvoker; effects: EffectGate; sandbox: WorkerSandbox | null; block(ref: string): BlockDef | undefined; resolve(value: unknown): JsonValue; scope: RunScope }
export interface HookRunner { run(placement: HookPlacement, hctx: HookContext, step: StepContext, services: HookServices, site: HookStepSite): Promise<HookRun> }
export type PreHookResult = { action: "run"; input: JsonValue | null } | { action: "skip"; output: JsonValue };
export interface NodeHooks { pre(input: JsonValue | null): Promise<PreHookResult>; post(result: { output: JsonValue | null; outcome: string | null; next: string | null }): Promise<{ output: JsonValue | null }> }
export type HookActionVerdict = { allowed: true } | { allowed: false; code: "HOOK_ACTION_FORBIDDEN" | "HOOK_ROUTE_UNDECLARED"; what: string };
// src/interpreter/hooks/code-runner.ts
export const HOOK_LIMITS: Readonly<SandboxLimits>;
export const codeHookRunner: HookRunner;
export function runCodeHook(sandbox: WorkerSandbox, placement: HookPlacement, hctx: HookContext, step: StepContext): Promise<SandboxResult>;
// src/interpreter/hooks/registry.ts
export function registerHookRunner(kind: "code" | "block", runner: HookRunner): void;
export function hookRunnerFor(kind: string): HookRunner | undefined;
// src/interpreter/hooks/names.ts
export function hookStepName(nodeId: string, placement: HookPlacement): string;
export function attemptStepName(name: string, attempt: number): string;
export function hookSlot(p: { pre: readonly HookPlacement[]; post: readonly HookPlacement[] }, placement: HookPlacement): number;
export function isFusable(placement: HookPlacement): boolean;
export function splitFused(p: { pre: readonly HookPlacement[]; post: readonly HookPlacement[] }): { ownPre: HookPlacement[]; fusedPre: HookPlacement[]; fusedPost: HookPlacement[]; ownPost: HookPlacement[] };
// src/interpreter/hooks/actions.ts
export function normalizeHookReturn(value: JsonValue | null, label: string): HookOutcome;
export function checkHookAction(placement: HookPlacement, outcome: HookOutcome, node: NodeMeta): HookActionVerdict;
// test/support/hook-runs/index.ts
export const HOOK_RUN_HASH: string;
export function hookRunNames(): string[];
export function readHookRunText(name: string): string;
export function loadHookRun(name: string): Flow;
export function hookRunVersion(name: string): LoadedVersion;
```

**Interfaces taken:**

- From `add-code-sandbox`: `WorkerSandbox`, `SandboxLimits`, `SandboxOptions`, `SandboxResult`, `DEFAULT_SANDBOX_LIMITS`, `createWorkerSandbox`, `ESCAPE_CASES`, `checkEscapeCase`.
- From `add-code-node-runtime`: `INTERPRETER_NO_SANDBOX`, `NodeServices`, `InterpreterDeps` (each gains `sandbox?`).
- From `add-taint-runtime`: `producedTaint`, `valueTaint`, `nodeInputTaint`, `ProducedTaint`, `blocksCatalogue`, `RunTaints`, `createRunTaints`.
- From `add-hook-checker`: `HookPlacement`, `NodeMeta`, `HookPhase`, `hookPlacements`, `augmentedSuccessors`, `nodeMeta`, `whenMatches`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@a6b5fb37, checked line by line).

## Out of scope

The persisted trace, `StepWrite.hooks`, `approvalsOnPath` (U42b); block hooks, hook mocks and every SIGKILL proof (U43); the web (U44); `llm.*` hooks.
