## Context

U42's visit pipeline runs a node's hooks and hands each own-step hook to `hookRunnerFor(kind)`. This unit is the `block` runner behind it, hook mocks, the load of hook blocks, and the three SIGKILL proofs of M5 (C1, C2, C6). Hooks never alter the node: a block hook always answers `continue`, its output is not referenceable downstream, and its failure fails the node unless `on_error: continue`.

## Decisions

1. **One runner, step shapes.** `blockHookRunner.run` is never fused. It reads `def = services.block(hook.uses)`, `values = { input, output, node, next, from }` of `hctx`, and builds the call in `prepare()` inside each step (so a replay re-derives the same call). A `read` hook is one `runStep(site.stepName)` whose value is the `HookRun`. Any other effect follows `runtimes/block.ts:89-127`: step 1 runs `prepare`, `effects.before`, the invoker (not on `reuse`) and returns `{ ok: true, output, idemKey }`; step 2, `attemptStepName(hookStepName(nodeId, placement) + "#done", hctx.attempt)` (`:r<n>` last, as U42's `send#done:r2`), runs `prepare`, `effects.after` with the decision's key, the output check and returns the `HookRun`. A failed step 1 under `continue` records `{ ok: false, idemKey }` and the runner returns the failed `HookRun` without step 2. A missing block takes the `read` path and fails in its step (`block_missing`). Durable cancellation is rethrown (`isDurableCancellation`).
2. **The slot comes from U42.** `HookStepSite.slot` is a required member of U42's site, set by its pipeline to `hookSlot({ pre, post }, placement)` for every runner site, so the runner has no slot logic: `effectSeq` is `site.slot`. Slots are unique within a node and the node's own effect is slot 0.
3. **Keys.** The call carries `effectSeq: site.slot` (1 or more) and `generation: attempt - 1` only above attempt 1, as U42's block runtime (frozen `block-effect.test.ts` compares whole calls); the gate reads `generation ?? 0`. `idemKey(tenant, lineage, nodeId, effectSeq, generation)` is a SHA-256 over the JSON tuple, so (`pay`, 0, 0) for the node, (`pay`, 1, 0) and (`pay`, 2, 0) for two hooks and (`pay`, 1, 1) for the first hook of attempt 2 are four keys (test-plan § Runner cases; the real gate stored four rows). `ToolCall.phase` and `hookId` already exist on main (`types.ts:19-26`); the gate ignores them.
4. **Errors and D11.** `HOOK_ERROR` (U42's code, already in both lists) has `details` `{ hook: hookStepName(nodeId, placement), reason }`, `reason` one of `tool_failed` (invoker or gate), `input_invalid`, `output_invalid`, `args_unresolved`, `block_missing`, `effect_unknown`, `effect_retry`, and the message `block hook "<label>" failed (<reason>)`; the tool's error text is dropped. `on_error: continue` swallows the first four; the other three always throw: a continued chain could reach a later `retry` over an unknown effect (D11), and a retried node must never pay again (X1, review C2). `effect_retry`: at `hctx.attempt` above 1 a hook whose block's effect is `pay` throws in step 1, after the `block_missing` check and before `prepare` and `effects.before`, so the invoker and the gate see no call; a `send` or `write` hook still runs under `generation: attempt - 1` (U41's `H_RETRY_SCOPE` already requires `allow_effect_retry` for it). A hook step that throws fails the node at once (as a node step does), so no post hook and no attempt `a + 1` follows. The failed entry's `error` is `{ code: "HOOK_ERROR", message: "block hook failed (<reason>)" }` (for example `block hook failed (tool_failed)`), and keeps the `idemKey` the gate issued.
5. **Mocks** (`mocks.ts`, this unit alone). `checkMocks` builds a `Map` from hook key to `{ nodeId, uses }` over `hookPlacements` of every node (block hooks only); a key of `mocks` that is a node id is checked as before, a hook key like a block node (shape, the hook block's output schema), anything else is `unknown_node`; every hook key of a reachable node needs a non-empty list (`missing`, `nodeId` the key); `reachableNodeIds` follows `augmentedSuccessors`, so a block that only a hook route reaches needs a mock too (equal to the old walk for a hookless flow). `createMockInvoker` uses the key `nodeId:phase:hookId` when the call has both, else the node id, and adds `details.hook` to its three failures for a hook call; the index stays `ctx.attempt - 1`. The endpoint needs no edit (`test-run-routes.ts:40-41,204`): `TEST_MOCK_MISSING` `details.nodes` lists problem keys, and a mock key with `:` round-trips through `createRun` and `getPayload`.
6. **`execute.ts`** (after U40 and U42; U42 ruling 6a). `loadValue` also does `for (const ref of hookBlockRefs(version.flow))` the same `catalogue.block(ref)` lookup, so a block named only by a hook is in `blocks`. `startRun` is unchanged: a hook block missing from the catalogue fails at run time as `block_missing` (U41's `H_BLOCK` rejects it statically). No `checkHooks` call at run start (ruling 6b was pulled).
7. **Fixtures.** `notify-pay.yaml` sits beside `test/support/hook-runs/index.ts`, not in `flows/`, so U42's `hookRunNames()` is unchanged; its loader and `seedNotifyPay` (the `strict` and `soft` versions through `saveFlowVersion` and `validateVersion`, as `seedMockRunFlows`) are in `notify-pay.ts`. `hooks-scenario.ts` follows `intents-scenario.ts` (the version chosen by the `flow` arg, a recording invoker, a one-worker pool). The C1 entries are compared with the literal six of test-plan § Onion entries, which an uncrashed run writes.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists the members that are not scaffolded. Taken: § Interfaces taken; merged shapes: `delivered-shapes.md`.

```ts
// src/interpreter/hooks/block-runner.ts (exported from src/interpreter/index.ts)
export const blockHookRunner: HookRunner;      // registered for "block"
export function hookMockKey(nodeId: string, placement: HookPlacement): string;   // equals hookStepName(nodeId, placement)
export function hookBlockRefs(flow: Flow): string[];   // sorted, unique `uses` of every block hook (nodes and flow rules)
export interface HookValues { input: JsonValue | null; output: JsonValue | null; node: NodeMeta; next: NodeMeta | null; from: NodeMeta | null }
export function resolveHookValue(value: unknown, scope: RunScope, hook: HookValues): JsonValue;   // resolveValue plus the `hook` root
// test/support/hook-runs/notify-pay.ts
export const NOTIFY_PAY_HASH: string;                       // "sha256:" + "b".repeat(64)
export function notifyPayVersion(variant?: "strict" | "soft"): LoadedVersion;   // flowId "notify-pay" or "notify-pay-soft", state "validated", ownerTeam "finance"
export function seedNotifyPay(db: TestDatabase, ctx: TenantContext, clock: Clock): Promise<{ strict: string; soft: string }>;   // after seedMockRunFlows; the validated hashes
// test/support/crash/hooks-scenario.ts (module exporting `start`, like intents-scenario.ts)
```

## Interfaces taken

U42: `HookRunner`, `HookRun`, `HookContext`, `HookServices`, `HookStepSite` (`{ fused; stepName; slot: number }`), `hookSlot(p, placement)`, `HookTraceEntry`, `registerHookRunner`, `hookStepName` (`${nodeId}:${phase}:${label}`), `attemptStepName`, `HOOK_ERROR`, `ToolCall.generation?`, `IntentCall.generation?`, `hookRunVersion("onion")`. U41: `HookPlacement { phase; hook: HookDef; ruleId; label }`, `hookPlacements`, `augmentedSuccessors`, `NodeMeta { id; kind; effect; tags }`, `HookPhase`. U42b: `StepRecord.hooks?: StepHooks` (`{ inputOriginalRef: string | null; entries: StepHookEntry[] }`, present only when stored) and `StepHookEntry`, equal to `HookTraceEntry`; its store accepts `failed` and `block` entries and a `tool` such as `slack.post_message@1`. U35, U34, U33, U32, U30, U24: `delivered-shapes.md`.

## Failure cases

A hook failure is one of the seven reasons above; it ends the run `failed` or, with `continue`, is a failed entry. A store failure propagates as in M4; no proof replays a failed step (D21).

## Security

No endpoint, PEP action, table or secret. Tool errors, gate errors and mock error messages never reach a message, detail, row or log. `StepContext.hook` is the "invoke context kind: hook" that U50's PEP reads; before it lands, a block hook's tool is checked by the effect gate only, and static taint on hook edges stays unchecked (D14). `effect_unknown`, `block_missing` and `effect_retry` fail closed whatever `on_error` says.

## Decisions made while writing

- `phase` and `hookId` of `ToolCall` are already on main; only `StepContext.hook?` is added to `types.ts`.
- `hookBlockRefs` is an addition to the card's seam (decision 6); `hookSlot` and `HookStepSite.slot` are U42's.
- C1 asserts the literal entries, not a second uncrashed run (a fault point fires once per cluster).
- `effect_unknown` is not swallowed by `continue` (D11); the card is silent on it.
