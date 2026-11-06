## Context

This unit makes `visitNode` and the five runtimes run a node's hooks. The trace is U42b's, block hooks and the SIGKILL proofs U43's: entries leave only through `deps.hookObserver`.

## Decisions

1. **The visit algorithm** (fixed by the plan; U42b and U43 build on it).
   1. `hookPlacements`, then `splitFused` into `ownPre`, `fusedPre`, `fusedPost`, `ownPost`; `next_candidates` come from `augmentedSuccessors(flow, catalogue).get(nodeId)`.
   2. Before the first step, a placement of a kind with no runner fails the node `HOOK_UNSUPPORTED` (`details.hook`, `kind`) and a `code` placement with no `deps.sandbox` `INTERPRETER_NO_SANDBOX` (`details.hook`): no step, no row (a post-hook must not fail a node after its payment). Each matching `ownPre` placement (`whenMatches(when, from, null, null)`) runs through `hookRunnerFor(kind)` with site `{ fused: false, stepName: attemptStepName(hookStepName(nodeId, p), attempt), slot: hookSlot({ pre, post }, p) }`; the runner makes its own step, whose value is the `HookRun`. If `inputFor(node)` throws, no own pre-hook runs.
   3. The runtime gets `services.hooks` (absent without placements). `pre` starts from the last own-step input change, else from its argument, runs the matching `fusedPre` inline and answers `run` with the input, or `skip` at once after a skip. `end` has no post; from attempt 2 `pre` runs no hook.
   4. **Replay of fused hooks.** The ops given to the runtime wrap statically, when `fusedPre.length + fusedPost.length > 0`: every step records `{ value, __fused }` (the value and the `{ phase, name, run }` records of the fused hooks run in it) and a replayed step re-applies its records. The decision never inspects recorded JSON. Own hook steps use ops that rename and wrap nothing.
   5. After `execute`, the matching `ownPost` placements run in order as own steps (`whenMatches(when, from, nextMeta, outcome)`); a `redirect` changes the successor for later hooks and the run, a `retry` ends the chain.
   6. **Retry.** Attempt `a + 1` re-runs the runtime with `ctx.attempt = a + 1`, the retry's `input` and `feedback`, no pre-hooks, steps renamed `attemptStepName(name, a + 1)`, its own row (attempt `a + 1`, `generation` 0, the next `seq`) and a restarted post chain. The block runtime sets `ToolCall.generation = ctx.attempt - 1` only above attempt 1 (frozen tests `deepEqual` whole calls); `gate.ts` reads `call.generation ?? 0`.
   7. **`runCodeHook`** calls `sandbox.run(hook.source, hctx, HOOK_LIMITS, { seed: `${step.runId}:${hookStepName(step.nodeId, placement)}:${hctx.attempt}`, nowIso: step.now.toISOString(), binding: "ctx", result: "object_or_null" })`; `hctx.args` is `services.resolve(hook.input ?? {})`; `codeHookRunner` returns `{ outcome, entry }`: `label` `${phase}:${placement.label}`, `kind` `code`, `fused` from the site, `state` `completed`, `action`, `mutated` (`input` or `output` for a `continue` carrying it), `to` for a redirect, other members `null`.
   8. **Rows.** `started` carries the base input and taint, an attempt's final row the effective ones (`skipped` after a skip, `failed` with the error, and with the node's own output when its node step completed before a post-hook failed (a paid `pay` row keeps its payment), else `completed`). Each `HookRun.entry` goes to `deps.hookObserver(nodeId, entry)` in execution order when its hook returns, before the pipeline checks the outcome (a refused result is still observed and kept), replays included; it is also appended to a per-attempt list that `visitNode` holds and passes to the attempt's final-row write, so U42b edits `visit.ts` only.
2. **Seam.** `VisitRequest` gains required `flow`, `catalogue` (U40's `blocksCatalogue`, built once) and `from` (only `execute.ts` builds one, checked with grep). `visitNode` returns `{ outcome, attempts, produced }`; `executeRun` adds `attempts` to `seq`, records `produced` into `RunTaints` (replacing U40's post-visit `producedTaint(node, nodeInputTaint(…), catalogue)` call, same value for a hookless node) and sets `from`. The outcome check applies after redirects.
3. **Rows survive a replay.** A fresh step after a replayed one of the same attempt does not write `started` again (the upsert would replace the stored state), and an effect block's row `idemKey` is read from the `idemKey` of its first step's value, run or replayed. With hooks that step also returns the effective `args`, for `effects.after` in `#done`.
4. **Smaller rules.** `details.hook` is `hookStepName(nodeId, placement)`; messages are fixed text naming `details.hook` and the closed cause, since the run page shows only `code: message`: `hook "<hook>" failed (<fault>)`, `hook "<hook>" returned an invalid action (<reason or keyword>)`, `hook "<hook>" may not <what>`, `hook "<hook>" may not route to "<to>"`, `hook "<hook>" failed the node`, `hook "<hook>" used its <attempts> attempts`, `hook "<hook>" has kind "<kind>", which has no runner`; `HOOK_ERROR` has `details.fault`, never the fault message; a pre `skip` and a post `continue` with `output` are checked against the output schema (`def.output`; `output_schema`); `checkHookAction` runs again on every replay. `normalizeHookReturn` runs `payloadDigest` in a try on `input`, `output`, `feedback` (`assertPayloadValue` is not exported). `HookServices.effects` is `deps.effects`; in a post-hook `resolve` and `scope` add the wrapped node. `hookRunNames()` lists `flows/*.yaml`, `HOOK_RUN_HASH` is `"sha256:" + "d".repeat(64)`, `hookRunVersion(name)` is built as test-plan.md § Runnable versions says, an unknown name throws `CatalogueDataError` `CATALOGUE_UNKNOWN_FLOW`. The sweep wraps the pool (`LIM`); the plan's `const input = ctx.args;` prefix is dropped (no case reads `input`).

## Interfaces

Given, equal to `proposal.md` (`HookTraceEntry.label` is `${phase}:${placement.label}`; `HookStepSite.fused` means run inline; `slot` is `hookSlot({ pre, post }, placement)` of the node's placements, the `effectSeq` of U43's block-hook calls, the node's own effect being 0). Not scaffolded, taken: `proposal.md`; merged shapes: `delivered-shapes.md`.

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

## Failure cases

Every hook fault, refusal and bad return fails the node and the run `failed`, never `running`; a store write failure propagates as in M4; no scenario replays a failed step (D21).

## Security

No endpoint, PEP action, table or secret. The sandbox gets `HookContext` JSON only; hook text and fault messages never reach an error, row or log. U41's `H_ROUTE_EFFECT` and `H_RETRY_SCOPE` refuse a route into an effect node and a retried `pay`; as R1 does for retries, a `redirect` that passes the `routes` check but targets a node whose meta in `next_candidates` has effect `write`, `send`, `pay` or `null` fails `HOOK_ACTION_FORBIDDEN` (`what` `redirect into an effect node`); `checkHookAction` also refuses a retry on `pay` with `allow_effect_retry` (X1), since a validated version is not re-checked at run start; labels are never removed.

## Verification

Run on 2026-11-06 in a scratch copy of main@a6b5fb37 (Node 26.8.1) with this design ported (pipeline, runtimes, `execute.ts`, `gate.ts`, U41's placement model, a QuickJS stand-in for the pool); the frozen interpreter tests without a database pass unchanged. **Verified by running:** every scenario value except taint, the sweep and the gate; the flows and `onion-own` are `ok` at L1-L3 through `validateFlowText` and clean in the seed `check.ts` (with `ursitoare: "0.2-draft"` set in memory), and the documents of `fixtures.md` were re-run through both on Node 24.22.2; the key vectors (`idemKey`, Python). **Unverified:** layer `H` of U41's `validateFlow`; the real `createWorkerSandbox` (`F4`, the sweep); variant `F9` (a rejecting `run`: the mapping to `sandbox_unavailable` follows U39's rule and was not run); the `test-plan.md` § Sandbox faults rows; the scenario values on the exact text of `fixtures.md` (recorded on the fixtures as first described); the taint rows (U40 is not on main); the database gate scenario; DBOS.

## Decisions made while writing

- Row `generation` stays 0, a superseded row stays `completed`.
- For U43: `loadValue` (`execute.ts:144`) loads only `node.uses` blocks; hook blocks need loading too.
