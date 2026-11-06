## Why

U42 runs code hooks, but a `block` hook still cannot run: no runner is registered for its kind, a mock test run has nowhere to put its mock, and no kill has been proven to leave one effect per hook key.

Observable result: `notify-pay` (`pay` with a post block hook `notify`, `slack.post_message@1`) completes in a mock run only with a mock under `pay:post:notify` (the endpoint answers `TEST_MOCK_MISSING` with `details.nodes` `["pay:post:notify"]` without it), keeps the hook's intent under `idemKey(tenant, run, "pay", 1)` beside the node's under slot 0, and a failed hook fails `HOOK_ERROR` unless `on_error: continue`. A SIGKILL at `after:pay` on `onion`, at `after:pay:post:notify` on `notify-pay` and at `after:send:r2` on `f-eff` restarts to `completed` with `erp.create_payment@1` `{ calls: 2, effects: 1, duplicates: 1 }`, slack `{ calls: 2, effects: 1, duplicates: 1 }` and `mail.send@1` `{ calls: 3, effects: 2, duplicates: 1 }`.

Batch `m5-code-hooks` (U38-U44 and U42b, in plan order U38, U39, U40, U41, U42, U42b, U43, U44; closing unit `add-web-hooks-view`, journey `e2e/test_m5_code_hooks.py`) delivers M5: flows with pure `code` nodes and pre/post hooks run durably; hook routes into effect nodes are rejected. This unit's part: block hooks as steps of their own with effect intents, hook mocks, and the SIGKILL proofs of the hook pipeline (C1, C2, C6). The plan runs acceptance profile `all` after this unit merges: every configured gate (setup, build, lint, typecheck, test, e2e) on the target; the batch outcome itself is proven by the closing unit's journey.

## What Changes

New: `src/interpreter/hooks/block-runner.ts`, `test/support/hook-runs/notify-pay.yaml` and `notify-pay.ts`, `test/support/crash/hooks-scenario.ts`, tests, `test/support/README.md` rows. Edited in named tasks: `docs/authoring/format.md` (a section `## Running code and hooks`, moved from U42; `doc-terms.test.ts` is frozen), `src/interpreter/{types,index,mocks,execute}.ts`. Capability `hooks-block` (ADDED); MODIFIED `flow-testing` (two requirements, each restated whole with its scenario names unchanged and one scenario added).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: `StepContext` gains `readonly hook?: { phase: HookPhase; label: string }` (`src/interpreter/types.ts`); `src/interpreter/index.ts` gains `registerHookRunner("block", blockHookRunner)` and the exports; `checkMocks` and `createMockInvoker` change in place (`mocks.ts`); `loadValue` loads `hookBlockRefs(flow)` (`execute.ts`). No dependency.
- **Depends on** (evidence = the names under Interfaces taken): U22 `add-flow-format-model`, U24 `add-test-catalogue`, U30 `add-dbos-runtime`, U31 `add-envelope-store`, U32 `add-crash-harness`, U33 `add-interpreter-core`, U34 `add-effect-intents`, U35 `add-mock-test-runs` (its two requirements are restated here), U38 `add-code-sandbox`, U39 `add-code-node-runtime`, U41 `add-hook-checker`, U42 `add-hook-runtime`, and U42b `add-hook-trace`. Edges added to the card's row: U22, U31, U38, U39 (the pool of the crash scenario and `InterpreterDeps.sandbox`), and U41 (`HookPlacement`, `hookPlacements`, `NodeMeta`).
- **Changed:** no frozen test. The frozen tests of the two MODIFIED requirements (`src/interpreter/mocks.test.ts` C-3e0e5412 and C-3fb317e4, `src/interpreter/mock-invoker.test.ts` C-e19890aa and C-2e79b082, `src/api/test-run-*.test.ts`, `src/cli/flow/*.test.ts`) pass with the change (`test-plan.md`). No migration, endpoint, API error code, policy, e2e part, CLI command, feature file or health check [D18].
- **Rulings** (`m5-decisions.md`): D1, D10, D11 and its added rule, D17, D18, D21, U42 ruling 6a; review round 1: C2, C8, C10, C12.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

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

**Interfaces taken:**

- From `add-hook-runtime` (U42): `HookRunner`, `HookRun`, `HookContext`, `HookServices`, `HookStepSite` (with its required `slot`), `HookTraceEntry`, `registerHookRunner`, `hookStepName`, `attemptStepName`, `hookSlot`.
- From `add-hook-checker` (U41): `HookPlacement`, `hookPlacements`, `NodeMeta`, `HookPhase`, `augmentedSuccessors`.
- From `add-hook-trace` (U42b): `StepHookEntry` (equal to `HookTraceEntry`), `StepHooks` (the type of `StepRecord.hooks?`, present only when stored).
- From `add-mock-test-runs` (U35): `checkMocks`, `createMockInvoker`, `MockEntry`, `TestMocks`, `MockProblem`, `registerTestRunRoutes`, `seedMockRunFlows`. From `add-effect-intents` (U34): `createEffectIntents`, `idemKey`, `IntentCall`. From `add-interpreter-core` (U33): `ToolCall`, `StepContext`, `EffectGate`, `resolveValue`, `checkSchema`, `InterpreterError`, `memoryWorkflowOps`, `executeRun`. From `add-crash-harness` (U32): `withDedicatedCluster`, `startCrashCluster`, `spawnEngine`, `appendEffect`, `countEffects`. From `add-dbos-runtime` (U30): `launchDurable`. From `add-test-catalogue` (U24): `loadHookFlow`, `loadTestCatalogue`. From `add-envelope-store` (U31): `createRunStore`, `payloadDigest`. From `add-code-sandbox` (U38): `createWorkerSandbox`. From `add-code-node-runtime` (U39): `InterpreterDeps`. From `add-flow-format-model` (U22): `HookDef`, `Flow`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@a6b5fb37, checked line by line).

## Out of scope

The persisted trace and `approvalsOnPath` (U42b); the code-hook pipeline (U42); static taint on block-hook edges (D14); the PEP check of a hook call (U50); a block hook that mutates, skips, redirects or retries (block hooks always continue); `llm.*` hooks; "60 random kills during a hooked RF-1 run" (U86); any `web/` change.
