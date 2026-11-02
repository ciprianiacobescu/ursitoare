## Why

Exit tests 1 and 2 kill the engine with SIGKILL in a durable run and expect it to finish once. U34 needs one harness for that; the product must have no way to arm a crash. Observable result: `test/support/crash/` starts every discovered e2e part on a private embedded Postgres, runs a scenario module a test built in a child process, kills it hard at an armed fault point or on request, restarts it on the same database, and counts effects by idempotency key. The `FaultPoints` port in `src/config` fires once per marker file; no production config or module can create one, and an architecture test proves it. The harness proves itself with its workflow `crash.counter`: armed at `after:two` its step log reads `one, two, two, three, done` and it ends `SUCCESS`; at `before:two`, `one, two, three, done`.

## What Changes

`src/config/faults.ts` and its re-export; `test/arch/fault-points.ts`; `test/support/crash/` (`observer`, `effects`, `cluster`, `engine`, `child`, `counter-scenario`, `index`). The child runs scenario modules, never `src/main.ts` (D4); the interpreter's SIGKILL proofs are U34's (D5).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because it changes an existing file: the re-export of `FaultPoints`, `NO_FAULT_POINTS` and `createFaultPoints` in `src/config/index.ts`. No dependency is added.
- **Depends on:** `add-engine-skeleton` (U01), `add-db-foundation` (U02), `add-e2e-stack` (U06), `add-dbos-runtime` (U30), as the roadmap says; beyond the row `add-architecture-fitness` (U05), because `checkFaultPoints` restates its `Snapshot`, `Violation` and helpers.
- **Changed:** `src/config/index.ts` only. **Migrations, tables, endpoints, env vars, `ERROR_CODES` entries, parts, web features:** none. `CRASH_START_FAILED`, `CRASH_OPTIONS_INVALID`, `CRASH_STOPPED` and `CRASH_EFFECT_LOG_INVALID` are harness `E2eStackError` codes.
- **Additions to the card's seams** (nothing renamed): `READY_TIMEOUT_MS`, `spawnEngineTuned`, `startCrashCluster`, `faultMarkerDir`.

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// src/config/faults.ts, exported from src/config/index.ts
export interface FaultPoints { readonly armed: readonly string[]; hit(point: string): void }
export const NO_FAULT_POINTS: FaultPoints;   // armed [], hit is a no-op
export function createFaultPoints(spec: { armed: readonly string[]; markerDir: string; kill: () => void }): FaultPoints;
// test/support/crash/index.ts (re-exports observer.ts, effects.ts, cluster.ts, engine.ts)
export interface CrashCluster {
  readonly env: Readonly<Record<string, string>>;   // merged env of every started part
  readonly ownerUrl: string;                         // owner URL of the stack database (assertions only)
  readonly appEndpoint: EndpointLike;                // for RunStore/assertion pools in the parent
  readonly dataDir: string;
}
export interface SpawnOptions {
  cluster: CrashCluster;
  scenario: string;                                  // absolute path of a module exporting `start`
  faultPoints?: readonly string[];
  args?: Readonly<Record<string, string>>;
}
export interface ScenarioContext {
  env: Readonly<Record<string, string>>; args: Readonly<Record<string, string>>; dataDir: string;
  faultPoints: FaultPoints; stepObserver: StepObserver; logger: Logger; ready(): void;
}
export type ScenarioStart = (ctx: ScenarioContext) => Promise<void>;   // a scenario module exports `start`
export interface EngineProcess {
  readonly pid: number; readonly deaths: number;
  kill(): Promise<void>; restart(): Promise<void>; stop(): Promise<void>;
}
export function withDedicatedCluster<T>(fn: (cluster: CrashCluster) => Promise<T>): Promise<T>;
export function spawnEngine(opts: SpawnOptions): Promise<EngineProcess>;
export function faultObserver(points: FaultPoints): StepObserver;   // ("after","pay",id) → points.hit("after:pay")
export function appendEffect(file: string, entry: { tool: string; idemKey: string | null; nodeId: string }): void;
export function countEffects(file: string): {
  calls: number; effects: number; duplicates: number;
  byTool: Readonly<Record<string, { calls: number; effects: number; duplicates: number }>>;
};
// additions to the card
export const READY_TIMEOUT_MS: number;   // 30000
export function spawnEngineTuned(opts: SpawnOptions, tuning: { readyTimeoutMs: number }): Promise<EngineProcess>;
export function startCrashCluster(parts: readonly E2eStackPart[]): Promise<{ cluster: CrashCluster; close(): Promise<void> }>;
export function faultMarkerDir(dataDir: string): string;   // join(dataDir, "fault-markers")
// test/support/crash/counter-scenario.ts
export const start: ScenarioStart;   // workflow crash.counter
// test/arch/fault-points.ts
export function checkFaultPoints(s: Snapshot): Violation[];   // code ARCH_FAULT_POINTS
```

**Interfaces taken:**

- from `add-engine-skeleton` (U01): `loadConfig`, `ConfigError`, `Logger`, `createLogger`.
- from `add-db-foundation` (U02): `createPool`, `EndpointLike`, `freePort`.
- from `add-architecture-fitness` (U05): `Snapshot`, `Violation`, `snapshotOf`, `readSnapshot`, `collectImports`, `resolveSpecifier`, `sortViolations`.
- from `add-e2e-stack` (U06): `E2eStackPart`, `PartContext`, `PartHandle`, `E2eStackError`, `discoverParts`, `databaseApi`; the parts `10-database` to `35-catalogue`.
- from `add-dbos-runtime` (U30): `StepObserver`, `launchDurable`, `registerWorkflow`, `runStep`, `DurableRuntime`; the part `parts/40-durable.ts` (`durablePart`). Behaviour taken: `design.md` decisions 4, 6, 9.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e06fdb3, checked line by line).

## Out of scope

Recovery tests RT-0 to RT-6 and the SIGKILL proofs of the interpreter and effect intents (U34, U86); starting a run over HTTP (U35); a fault member on `MainDeps` or `AppConfig` (D4); Docker, mocks over HTTP, `CRASH_*` variables read by product code.
