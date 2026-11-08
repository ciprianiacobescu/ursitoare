## Why

U42 runs hooks and tells an observer what each one did, but nothing is kept: after the run no one can see which hooks ran on a node, which of them changed its input, or what that input was before. The policy check of M6 also needs the approvals on a run's path (gap X3), and nothing lists them.

Observable result:
- After `onion` the step rows of `lookup` and `pay` carry `hooks` with 2 and 6 entries in onion order (`pay`: `pre:rule.rule_a`, `pre:rule.rule_b`, `pre:pay_pre_note`, `post:pay_post_note`, `post:rule.rule_b`, `post:rule.rule_a`); the rows of `normalize` and `done` have no `hooks` key.
- After `mutate` the `lookup` row has `hooks.inputOriginalRef` `364f588406d58da425488ae35b7aeb5ae04e6a5b18e212ff5c52472a33a8bd2b`, the digest of the untrimmed input `{ vendor_name: "  Acme " }` that the envelope store still holds, while its `inputRef` is the digest of `{ vendor_name: "Acme" }`.
- `GET /api/v1/runs/{runId}/steps` returns that `hooks`; the payload route answers 404 for `inputOriginalRef`.
- `approvalsOnPath` lists an approved and a rejected `human.approval` step with their approvers and nothing for a timed-out one.

Batch `m5-code-hooks` (U38-U44 and U42b, in plan order U38, U39, U40, U41, U42, U42b, U43, U44; closing unit `add-web-hooks-view`, journey `e2e/test_m5_code_hooks.py`) delivers M5: flows with pure `code` nodes and pre/post hooks run durably; hook routes into effect nodes are rejected. This unit's part: the persisted hook trace, its API view and the pure list of approvals on a path. The plan runs acceptance profile `all` after this unit merges: every configured gate (setup, build, lint, typecheck, test, e2e) on the target; the batch outcome itself is proven by the closing unit's journey.

## What Changes

- Migration `0425_step_hooks.sql` (column `step_execution.hooks jsonb`); edits to `src/runs/store/{types,validate,step-repository,memory-store}.ts`, `src/runs/index.ts`, `src/api/run-views.ts`, `src/interpreter/{visit,index}.ts`; the new `src/interpreter/hooks/approvals.ts`; tests; the regenerated `docs/api/openapi.json`.
- Capability `hooks-trace` (ADDED), ADDED requirements in `run-data`, MODIFIED `runs-api` "Run and step views expose the stored rows" (restated whole, scenario name unchanged).
- Frozen test changed: `src/api/run-views.test.ts::C-8e399d8e the view schemas list exactly the view fields` (task 2.1).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing declarations or files: `StepWrite.hooks?: StepHooksWrite | null`, `StepRecord.hooks?: StepHooks`, `StepView.hooks?: StepHooks`, the member `hooks` of `STEP_VIEW_SCHEMA.properties` (not in `required`), the migration, `assertStepHooks` (module-internal in `validate.ts`), the export lines in `src/runs/index.ts` and `src/interpreter/index.ts`, and the wiring in `visit.ts`. No dependency.
- **Depends on:** (each with its evidence) `add-envelope-store` (U31): the step table, `StepWrite`, `StepRecord`, both stores and `envelopeStore` are extended; `add-interpreter-core` (U33): `visitNode` writes the rows and `executeRun` drives the scenarios (`visit.ts` is edited after U42, before U43); `add-runs-api` (U36): `StepView`, `toStepView`, `STEP_VIEW_SCHEMA` gain `hooks` and its requirement is MODIFIED; `add-hook-runtime` (U42): `HookTraceEntry` and `HookRun.entry` are what is stored, its pipeline keeps the per-attempt entries (design 1.8, 3), and its fixtures `onion`, `onion-own`, `mutate`, `bad-upper`, `f-ret` run. Edges added beyond the card, for names the scenarios call: `add-test-catalogue` (U24: `loadTestCatalogue`, `loadHookFlow`), `add-code-sandbox` (U38: `createWorkerSandbox`) and `add-code-node-runtime` (U39: `InterpreterDeps.sandbox`, which the hooked runs set), and `add-hook-checker` (U41: the label grammar and the `H_SCHEMA` bounds of design 4 and § Failure cases). Also used, by module: `add-db-foundation` (`withTestDatabase`, `ensurePartitions`), `add-tenancy-foundation` (`withTenantTx`, `checkTenancyCatalog`, `seedTwoTenants`), `add-engine-skeleton` (`fixedClock`).
- `src/runs` never imports `interpreter`: `StepHookEntry` is declared again in `runs` and is structurally equal to U42's `HookTraceEntry` as its proposal gives it (design § Decisions 3); `test/arch/modules.ts` needs no change.
- No endpoint, API error code, policy fragment, e2e part, CLI command, feature file, health check or `interpreter` requirement change. The shared files and their order are in design § Shared files.

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// src/runs/store/types.ts (exported from src/runs/index.ts)
export interface StepHookEntry { label: string; kind: "code" | "block"; fused: boolean; attempt: number; state: "completed" | "failed"; action: "continue" | "skip" | "redirect" | "retry" | "fail" | null; mutated: "input" | "output" | null; to: string | null; error: { code: string; message: string } | null; tool: string | null; idemKey: string | null }
export interface StepHooksWrite { inputOriginal: PayloadValue | null; entries: readonly StepHookEntry[] }
export interface StepHooks { inputOriginalRef: string | null; entries: StepHookEntry[] }
// src/db/migrations/0425_step_hooks.sql
// src/interpreter/hooks/approvals.ts (exported from src/interpreter/index.ts)
export interface PathStep { nodeId: string; kind: string; state: StepState; outcome: string | null; output: JsonValue | null }
export interface Approval { nodeId: string; decision: "approved" | "rejected"; approver: string | null }
export function approvalsOnPath(steps: readonly PathStep[]): Approval[];
```

**Interfaces taken:**

- From `add-envelope-store`: `StepWrite`, `StepRecord`, `PayloadValue`, `StepState`, `RunStore`, `RunDataError`, `stepRepository`, `envelopeStore`, `createRunStore`, `createMemoryRunStore`, `payloadDigest`.
- From `add-interpreter-core`: `executeRun`, `InterpreterDeps`, `memoryWorkflowOps`, `JsonValue`.
- From `add-runs-api`: `StepView`, `toStepView`, `STEP_VIEW_SCHEMA`.
- From `add-hook-runtime`: `HookTraceEntry`, `HookRun`, `hookRunVersion`, `hookRunNames`, `loadHookRun`, `HOOK_RUN_HASH`.
- From `add-test-catalogue`: `loadTestCatalogue`, `loadHookFlow`.
- From `add-code-sandbox`: `createWorkerSandbox`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@a6b5fb37, checked line by line).

## Out of scope

Producing the entries (U42), block hooks and their entries with `kind: "block"` (U43), serving or showing `input_original` (D15; follow-up with the audit and debug UI in M14), the web view of the trace (U44), the PEP and Cedar use of `approvalsOnPath` (U50, M6), the `human.approval` step records with the approver (U74b `add-approval-nodes`, M11; D23), and a retention job for the original input.
