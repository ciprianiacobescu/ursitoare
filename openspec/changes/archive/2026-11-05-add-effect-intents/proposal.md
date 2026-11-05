## Why

The interpreter (U33) ships only an `EffectGate` that does nothing, so a kill between a paid call and its checkpoint pays twice on recovery. M4's exit tests 1 and 3 need the real gate: an intent row before every call that is not a read, a key that survives recovery and forks, and SIGKILL proofs.

Observable result: `createEffectIntents(pool)` is an `EffectGate` for U33's `executeRun`. Before a block with `effect` other than `read` calls its tool, a row `effect_intent` in state `intent` exists under `idemKey(tenantId, lineageId, nodeId, effectSeq)` (`ik1_` plus 64 hex digits); after the call it is `done` with the result stored. A run killed with SIGKILL after the tool returned and before the step was checkpointed, then restarted, completes with the same key sent twice and `countEffects` reporting one effect and one duplicate; for a tool marked `unsafe_to_retry` the same kill ends the run `failed` with `INTERPRETER_EFFECT_UNKNOWN`, the tool called once and the row `unknown`. Rows are recorded in every mode and carry `mode`; the table is tenant-isolated.

Batch `m4-runs-timeline` (U30-U37 and U35b; closing unit `add-web-run-timeline`, journey `e2e/test_m4_runs.py`) delivers M4: an author test-runs a validated flow with mocked tools and follows each step on the run timeline; runs survive a kill. This unit's part: every consequential call is recorded as an intent first, so a kill between the intent and the done gives exactly one effect.

## What Changes

- `src/db/migrations/0340_effect_intent.sql`; `src/runs/intents/` exported from `src/runs/index.ts`; tests beside the code, among them three SIGKILL tests on U32's harness (D5); test support `test/support/crash/pay-once.ts`, `flows/pay-once.yaml` and the scenario module `intents-scenario.ts`; one documentation line for `run-wait.ts` in `test/support/README.md`.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: the exports in `src/runs/index.ts` and the line in `test/support/README.md`. No dependency.
- **Depends on:** `add-envelope-store` (U31), `add-crash-harness` (U32), `add-interpreter-core` (U33), as the roadmap says; the card adds `add-dbos-runtime` (U30: the scenario calls `launchDurable`) and `add-test-catalogue` (U24: `loadTestCatalogue`). Also used, hence listed: `add-engine-skeleton` (U01), `add-db-foundation` (U02), `add-tenancy-foundation` (U03), `add-e2e-stack` (U06: `E2E_TENANT_NAME`), `add-flow-format-model` (U22) and `add-flow-validator` (U25: `validateFlow`). `src/runs` never imports `interpreter`; `test/arch/modules.ts` needs no change.
- **Seam change by the orchestrator (D9):** the card's `idemKey(lineage, node, effectSeq)` (text `lineage:node:effectSeq`) is replaced by the ADR-08 form given below; the roadmap rows follow. Every other card seam is unchanged. **Addition to the card** (nothing renamed): `test/support/crash/pay-once.ts`, shared by the gate tests and the scenario.
- **Migration** `0340_effect_intent.sql` (SQL in `data-model.md`), table `ursitoare.effect_intent` (not on U03's allowlist). No endpoint, env var, audit event, e2e part, web feature or `ERROR_CODES` entry (`INTENT_*` are module codes). **Changed** existing files: `src/runs/index.ts` and `test/support/README.md`; no archived scenario.

**Interfaces given** (declarations as exported; the block of `design.md` § Interfaces)

```ts
// src/runs/intents/*.ts, exported from src/runs/index.ts
export function idemKey(tenantId: string, lineageId: string, nodeId: string, effectSeq: number, generation?: number): string;
// "ik1_" + hex sha256 of JSON.stringify([tenantId, lineageId, nodeId, effectSeq, generation]); generation = 0
export function lineageOf(run: { runId: string; lineageId: string }): string;
export type IntentState = "intent" | "done" | "unknown";
export interface IntentRecord {
  idemKey: string; runId: string; nodeId: string; tool: string; argsDigest: string; mode: RunMode;
  state: IntentState; resultRef: string | null; createdAt: string; completedAt: string | null;
}
export interface IntentWrite { idemKey: string; runId: string; nodeId: string; tool: string; args: PayloadValue; mode: RunMode }
export function recordIntent(tx: TenantTx, ctx: TenantContext, intent: IntentWrite, at: Date):
  Promise<{ record: IntentRecord; created: boolean }>;
export function completeIntent(tx: TenantTx, ctx: TenantContext, idemKey: string, result: PayloadValue, at: Date): Promise<IntentRecord>;
export function markIntentUnknown(tx: TenantTx, ctx: TenantContext, idemKey: string, at: Date): Promise<IntentRecord>;
export function getIntent(tx: TenantTx, ctx: TenantContext, idemKey: string): Promise<IntentRecord | null>;
export interface IntentCall { tool: string; args: PayloadValue; nodeId: string; effectSeq: number }
export interface IntentContext {
  tenant: TenantContext; runId: string; lineageId: string; mode: RunMode; unsafeToRetry: boolean; now: Date;
}
export type IntentDecision =
  | { action: "invoke"; idemKey: string | null }
  | { action: "reuse"; idemKey: string; result: { output: PayloadValue } }
  | { action: "unknown"; idemKey: string };
export interface EffectIntents {
  before(call: IntentCall, ctx: IntentContext): Promise<IntentDecision>;
  after(call: IntentCall, ctx: IntentContext, result: { output: PayloadValue }): Promise<void>;
}
export function createEffectIntents(pool: TenantPool): EffectIntents;
export type IntentErrorCode = "INTENT_INVALID" | "INTENT_NOT_FOUND";
export class IntentError extends Error { readonly code: IntentErrorCode; constructor(code: IntentErrorCode, message: string) }
// test/support/crash/pay-once.ts
export const PAY_ONCE_HASH: string;        // "sha256:" + "a".repeat(64)
export const PAY_ONCE_INPUT: { vendor: string; invoice: string; amount: number };   // "Acme", "inv-1", 120
export const PAY_ONCE_PAY_ARGS: PayloadValue;       // { vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" }
export const PAY_ONCE_PAID_OUTPUT: PayloadValue;    // { payment_id: "pay-1", status: "paid" }
export function payOnceVersion(): LoadedVersion;    // validated, team "finance"
export function payOnceCatalogue(opts?: { unsafePay?: boolean }): Catalogue;
export function effectLogInvoker(file: string): ToolInvoker;
// test/support/crash/intents-scenario.ts
export const start: ScenarioStart;
```

**Interfaces taken:**

- From `add-envelope-store` (run and lineage ids use its id grammar, design decision 14): `TenantContext`, `TenantTx`, `TenantPool`, `PayloadValue`, `RunMode`, `createRunStore`, `envelopeStore`, `payloadDigest`, `RunDataError`.
- From `add-interpreter-core`: `EffectGate`, `EffectDecision`, `ToolCall`, `ToolResult`, `ToolInvoker`, `StepContext`, `LoadedVersion`, `InterpreterDeps`, `startRun`, `executeRun`, `registerRunWorkflow`, `bindInterpreter`, `memoryWorkflowOps`, `waitForRun`.
- From `add-crash-harness`: `withDedicatedCluster`, `spawnEngine`, `EngineProcess`, `CrashCluster`, `ScenarioStart`, `ScenarioContext`, `faultMarkerDir`, `appendEffect`, `countEffects`. From `add-dbos-runtime`: `launchDurable`, `DurableRuntime`.
- From `add-test-catalogue`: `loadTestCatalogue`, `parseCatalogueFlow`. From `add-flow-format-model`: `Catalogue`, `canonicalizeFlow`. From `add-flow-validator`: `validateFlow`.
- From `add-interpreter-core` (added in readiness round 5): `workflowIdOf`, the DBOS workflow id of a run (`<tenantId>:<runId>`).
- From `add-engine-skeleton`: `fixedClock`, `systemClock`, `systemIds`, `sequentialIds`, `loadConfig`. From `add-db-foundation`: `createPool`, `withTestDatabase`. From `add-tenancy-foundation`: `withTenantTx`, `checkTenancyCatalog`, `seedTwoTenants`. From `add-e2e-stack`: `E2E_TENANT_NAME`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e06fdb3, checked line by line), with the sibling shapes used quoted from their folders.

## Out of scope

The interpreter (U33), DBOS runtime (U30), harness (U32), run and payload tables (U31), HTTP routes and policies (U35, U36), the gateway's `Idempotency-Key` header and retries (U50), a human task for an `unknown` intent, `generation` above 0 and re-firing (M14; the key already carries `generation`), a retention job, partitioning, and an `invoke_tool` permit (M6).
