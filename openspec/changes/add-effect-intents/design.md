## Context

ADR-08: an intent row precedes every consequential call, keyed on the run lineage; a tool that ignores keys is `unsafe_to_retry` and recovery parks it. U33 calls an `EffectGate` in its steps (`before` in step `<node>`, `after` in `<node>#done`); U30 runs the observer's `after` inside the step, before the checkpoint, so a kill at `after:<node>` re-runs `<node>` and `before` finds the intent. This unit supplies the gate, its table and the SIGKILL proofs (D5).

## Decisions

1. **Files** in `src/runs/intents/`: `errors.ts`, `key.ts`, `validate.ts` (module-internal), `repository.ts`, `gate.ts`, `index.ts`. Types come from `../index.ts` with `import type`; the values `payloadDigest` from `../store/canonical.ts` and `envelopeStore` from `../store/envelope-store.ts` (the files U31's design names); `withTenantTx` from `src/tenancy`.
2. **Key (D9).** `idemKey` checks `tenantId` `^[A-Za-z0-9_-]{1,64}$`, `lineageId` `^[A-Za-z0-9_-]{1,128}$`, `nodeId` `^[a-z][a-z0-9_]{0,127}$` (U31's id rules), `effectSeq` and `generation` integers 0 to 2,147,483,647; else `INTENT_INVALID` with a fixed message naming the field. The key is `"ik1_"` plus the lowercase hex SHA-256 (`node:crypto`) of the UTF-8 text `JSON.stringify([tenantId, lineageId, nodeId, effectSeq, generation])`, which is also `payloadDigest` of that array. `StepContext` has no `generation` member, so the gate uses the default 0 (M14 adds it).
3. **Validation**, before any SQL, in the four repository functions: `idemKey` `^ik1_[0-9a-f]{64}$`, `intent.runId` `^[A-Za-z0-9_-]{1,128}$`, `intent.nodeId` as above, `intent.tool` 1 to 256 characters, `intent.mode` one of the three modes, `at` a valid `Date` (year 1970 to 9999). Tenant check as U31 (decision 11): `current_setting('app.tenant_id', true)` must equal `ctx.tenantId`, else `INTENT_INVALID`. A non-`PayloadValue` is refused by `payloadDigest` or `envelopeStore.put` with U31's `RunDataError` `RUN_DATA_INVALID`; the row is unchanged.
4. **`recordIntent`** stores `argsDigest = payloadDigest(args)` (the arguments are on the step row) with `INSERT ... ON CONFLICT (tenant_id, idem_key) DO NOTHING RETURNING` in state `intent`, `created_at = at`; with no row returned it `SELECT`s the existing row and answers it with `created: false`. The first row never changes (ADR-08: an edited fork reuses the key). A missing run violates the foreign key (`23503`).
5. **`completeIntent`** locks the row (`SELECT ... FOR UPDATE`); absent is `INTENT_NOT_FOUND`; `done` is answered unchanged; `intent` and `unknown` become `done` through `envelopeStore.put` and an `UPDATE` of `state`, `result_ref`, `completed_at = at`. **`markIntentUnknown`** locks the row; absent is `INTENT_NOT_FOUND`; `intent` becomes `unknown`; `unknown` and `done` are answered unchanged; its `at` is validated, not stored. **`getIntent`** answers the row or `null`. Time strings are U31's: `date.toISOString().slice(0, -1) + "000Z"`.
6. **`createEffectIntents(pool)`.** Each call runs in one `withTenantTx(pool, ctx.tenant, ...)`. The gate records every call it gets; U33 calls it only for `effect` other than `read`. `before` validates `call` and `ctx.now`, derives the key from `ctx.tenant.tenantId`, `ctx.lineageId`, `call.nodeId`, `call.effectSeq`, calls `recordIntent` (with `ctx.runId`, `ctx.mode`, `ctx.now`) and decides: created is `invoke`; existing `done` of the same `mode` is `reuse` with `{ output: <stored data> }`, or `unknown` when the payload is gone; existing `intent` is `invoke` with the same key unless `ctx.unsafeToRetry`, then `markIntentUnknown` and `unknown`; existing `unknown` is `unknown`. An existing `done` row of another `mode` is `unknown`, never `reuse` (D19). `after` recomputes the key and calls `completeIntent(tx, ctx.tenant, key, result.output, ctx.now)`; a repeat is a no-op.
7. **Fit to U33.** `EffectIntents` is assignable to `EffectGate` with no adapter: `IntentContext`'s six members exist on `StepContext` (`RunMode` and `EffectMode` are one union), `IntentCall` is `ToolCall` without its optional members, `PayloadValue` and `JsonValue` are one recursive union, `IntentDecision` is `EffectDecision` with `{ output }` for `ToolResult`. `runs` imports neither module; task 5.1 assigns the gate to `InterpreterDeps["effects"]`, which the typecheck gate proves.
8. **Test support.** `payOnceVersion()` is `{ flowId: "pay-once", hash: PAY_ONCE_HASH, state: "validated", ownerTeam: "finance", flow }`, `flow` read from `flows/pay-once.yaml` by `parseCatalogueFlow`; `payOnceCatalogue({ unsafePay: true })` wraps `loadTestCatalogue()` so that `block("erp.create_payment@1")` returns the definition with `unsafe_to_retry: true`. `effectLogInvoker(file)` appends `{ tool, idemKey: ctx.idemKey, nodeId }` with `appendEffect`, then answers `erp.lookup_vendor@1` with `{ vendor_id: "v1", status: "active" }` and `erp.create_payment@1` with `PAY_ONCE_PAID_OUTPUT`; another tool rejects `new Error("no output for tool")`.
9. **The scenario module** `intents-scenario.ts`, `start(ctx)`: the `TenantContext` from `ctx.args.tenantId` and `reviewProfile`; the endpoint is `loadConfig` of only the two database variables of `ctx.env`, `.database.app` (absent: throw), as U32's counter; `pool = createPool(endpoint, { max: 4 })`; `deps` hold `createRunStore(pool)`, `createEffectIntents(pool)`, a `loadVersion` answering `payOnceVersion()` for `pay-once` and `PAY_ONCE_HASH` (else `null`), `catalogueFor` giving `payOnceCatalogue({ unsafePay: ctx.args.unsafePay === "true" })`, `invokerFor` giving `effectLogInvoker(join(ctx.dataDir, ctx.args.effects))`, `systemClock`, `systemIds`, `durable: null`. **Order:** `registerRunWorkflow()`, `bindInterpreter(deps)`, `ctx.ready()`, `launchDurable({ endpoint, logger: ctx.logger, stepObserver: ctx.stepObserver, pollingIntervalMs: 20 })`, then `startRun({ ...deps, durable: runtime }, tenant, request)` (mode `live`, `PAY_ONCE_INPUT`, `mocks: null`, principal `{ userId: "u_alice", kind: "human" }`, `actorChain: ["u_alice"]`, `runId: ctx.args.runId`). Binding comes first because the workflow throws `INTERPRETER_UNBOUND` when nothing is bound (a restart recovers the run inside `launchDurable`). After a restart `startRun` finds the run and enqueues `workflowIdOf(tenantId, runId)` again (a no-op, U30); a test that names the workflow of a run uses `workflowIdOf`, never the bare `runId`.
10. **Crash tests** each use their own `withDedicatedCluster`. The parent reads the tenant as owner (`createPool(cluster.ownerUrl, { max: 1 })`, `SELECT tenant_id, review_profile FROM ursitoare.tenant WHERE name = $1` with `E2E_TENANT_NAME`), passes `tenantId`, `reviewProfile`, `runId`, `effects`, `unsafePay` as `args`, polls `proc.deaths` (25 ms pause, 20 s deadline), calls `restart()`, then `waitForRun(store, ctx, runId, states, 20000)` on `createRunStore(createPool(cluster.appEndpoint, { max: 2 }))`. It never launches a `DurableRuntime`, and ends its pools and `proc.stop()` in `finally`. The log is `join(cluster.dataDir, <effects>)`, read with `countEffects` and, for keys, with `JSON.parse` per line.

## Interfaces

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

## Failure cases

- Bad input (key, ids, tool, mode, date, transaction tenant): `INTENT_INVALID`, nothing written. An absent key in `completeIntent`, `markIntentUnknown` or `after`: `INTENT_NOT_FOUND`. Non-JSON `args` or `result`: `RUN_DATA_INVALID`, row unchanged. Two writers of one new key: one row, one `created: true`.
- A pool that cannot connect: the driver's error propagates (U33 maps it to `INTERPRETER_TOOL_FAILED`). After a crash the next `before` sees `intent` (same key, or `unknown` for an unsafe tool) or `done`, and a repeated `after` is a no-op.

## Security

1. No endpoint and no PEP action: the interpreter calls this module.
2. `effect_intent` is tenant-leading with forced RLS, every function runs in `withTenantTx` and checks the tenant, and the key holds the tenant. Two-tenant proofs: the scenarios "Objects, isolation and privileges", "Completing and marking unknown" and "The key follows the lineage, not the run".
3. Inputs are validated at every boundary (decision 3); arguments are stored as a digest only; results are untrusted JSON stored through `envelopeStore`. Taint labels arrive in M6.
4. No secret is read or logged (the scenario child reads the password only through `URSITOARE_DATABASE_PASSWORD_FILE`); messages name fields, never values.
5. Abuse, each a scenario: a key colliding across tenants or lineages, an edited fork rewriting the first row, rewriting or deleting history (`42501`), a stranger's intent, a second payment or an unsafe tool re-fired after a kill.

## Test plan

DB tests use `withTestDatabase()` and `seedTwoTenants(db)` (`T_A`, `T_B`), one `withTenantTx(db.appPool, ctx, ...)` per call. Fixtures: `AT = new Date("2026-11-02T10:00:00.000Z")` (string `2026-11-02T10:00:00.000000Z`); `NEW_RUN(runId, over?)` is a U31 `NewRun` of `pay-once` (`flowHash: "sha256:" + "a".repeat(64)`, `ownerTeam: "finance"`, `mode: "live"`, `input: PAY_ONCE_INPUT`, `lineageId: runId`) created by `createRunStore(db.appPool).createRun`; `KEY(node, run = "r_1")` is `idemKey("tenant_a", run, node, 0)` and `K1 = KEY("pay")`; `WRITE(over?)` is `{ idemKey: K1, runId: "r_1", nodeId: "pay", tool: "erp.create_payment@1", args: PAY_ONCE_PAY_ARGS, mode: "live", ...over }`; `CALL` is `{ tool: "erp.create_payment@1", args: PAY_ONCE_PAY_ARGS, nodeId: "pay", effectSeq: 0 }`; `CTX(over?)` is `{ tenant: T_A, runId: "r_1", lineageId: "r_1", mode: "live", unsafeToRetry: false, now: AT, ...over }`; `PAID` is `PAY_ONCE_PAID_OUTPUT`.

## Decisions made while writing

- **The card's crash `after:pay#done` is replaced.** U32 accepts fault names only of `[A-Za-z0-9_.:-]`, while U33 fixes the step `<node>#done`. The double `after` is proved by a replay on `memoryWorkflowOps` ("The gate inside executeRun, and a replay") and a kill after the paid steps by `after:done`.
- **A third support file, `test/support/crash/pay-once.ts`**, beyond the card's two: the DB tests and the scenario share the flow, catalogue and invoker; no test imports the scenario module (`start` registers a workflow).
- **`unknown` becomes `done`** when `completeIntent` gets a result (it proves the effect happened); `done` never moves; a `done` row with a lost payload answers `unknown`; the row has a foreign key to `run`.
