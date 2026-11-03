## Context

U34 uses this harness for the interpreter (D5), so this unit proves it with its own workflow `crash.counter`. D4: the child runs a scenario module the test builds, never `src/main.ts`. D3: DBOS is a process singleton, so each child launches its own runtime through U30's `launchDurable`. Verified on 2026-11-02 in a throwaway experiment (DBOS 5.3.0, app role): a child that SIGKILLs itself at `after:two` or `before:two` and is started again ends `SUCCESS` about 1.5 s later with the spec's logs; the no-fault log is inferred.

## Decisions

1. **Files.** `src/config/faults.ts` (re-exported); `test/arch/fault-points.ts`; `test/support/crash/{observer,effects,cluster,engine,child,counter-scenario,index}.ts`. `index.ts` only re-exports; `child.ts` never imports `cluster.ts`.
2. **`createFaultPoints`** checks `armed` is an array of entries matching `^(before|after):[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$`, `markerDir` is absolute and `kill` a function; else `new ConfigError("CONFIG_INVALID", <"armed"|"markerDir"|"kill">, <reason>)`. `armed` is a frozen copy. `hit(point)`: not armed, return; else `mkdirSync(markerDir, { recursive: true })`, `writeFileSync(<markerDir>/<sha256 hex of point>, point, { flag: "wx", mode: 0o600 })`; `EEXIST` returns (fired before, maybe by another process); another error propagates without `kill`; then `spec.kill()`. `NO_FAULT_POINTS` is `Object.freeze({ armed: Object.freeze([]), hit() {} })`.
3. **No production path.** `loadConfig` ignores variables it does not name, `AppConfig` gets no member, `faults.ts` takes `kill` as a parameter and never touches `process`. `checkFaultPoints` (code `ARCH_FAULT_POINTS`, pure; `collectImports` and the TypeScript AST as in `test/arch/owner-endpoint.ts`) checks non-test files under `src/`: (a) an Identifier, string literal or no-substitution template `createFaultPoints` outside `src/config/faults.ts` and `src/config/index.ts`, once per file at the first occurrence; (b) in `src/config/faults.ts`, the first Identifier `process` or an import of `process` or `node:process`; (c) an import that `resolveSpecifier` resolves to `src/config/faults.ts` from any file but `src/config/index.ts`. Messages are in the spec; `sortViolations` orders the result. A type-only use of `FaultPoints` is allowed.
4. **`faultObserver(points)`** is `(phase, step) => { points.hit(`${phase}:${step}`); }`. U30's `runStep` runs `before` inside the DBOS step ahead of `fn` and `after` once `fn` resolved, before DBOS records it: `after:two` re-runs `two` on recovery, `before:two` runs it once.
5. **`startCrashCluster(parts)`:** `mkdtemp(<os.tmpdir()>/ursitoare-crash-)` mode `0o700`; two placeholder origins `http://127.0.0.1:<freePort()>` (drawn until they differ, never listened on); per part a directory `<dir>/<name>`; each part starts in order with a `PartContext` built as `startE2eStack` does (failure `STACK_PART_FAILED`, `details.part`; an env key already set `STACK_ENV_CONFLICT`, `details.key`, after the handle is stored); then each `seed` in order (failure `STACK_PART_FAILED`, `details.part`). `ownerUrl` is `databaseApi(handles).ownerUrl` (no `database` part: `STACK_PART_MISSING`). `appEndpoint` is `loadConfig` of only the two database variables of `env`, `.database.app` (the whole `env` makes `loadConfig` throw: the oidc variables need the engine key of the stack's base env). Any failure closes what started (engines, then handles in reverse; part-close errors ignored), removes the directory and rethrows the first error; `close()` is that same sequence, idempotent. `withDedicatedCluster(fn)` is `startCrashCluster(await discoverParts())`, then `fn`, then `close()` in `finally`; `fn`'s error wins.
6. **The parent never launches a `DurableRuntime`:** it would recover the child's pending workflow (executor `local`, same application version) and spoil every proof. The cluster relies on the contract in U30's requirement "The e2e stack shuts the runtime down before a reset and checks it after" (`add-dbos-runtime`): with no runtime in the process, the durable part's `seed`, `beforeReset` and `close` do nothing. The parent reads `SELECT status FROM dbos.workflow_status WHERE workflow_uuid = $1` as owner. `withDedicatedCluster` runs more than once per process, so the durable part's `stack.ready` function must be one module-level reference.
7. **Child protocol.** `spawnEngine` first validates (absolute existing file `scenario`, `faultPoints` entries as in 2, `args` a plain object of strings, and for `spawnEngineTuned` `readyTimeoutMs` an integer 1 to 600000; else `CRASH_OPTIONS_INVALID`, `details.field`), then runs `process.execPath <abs child.ts> <json>` (Node 24, `engines` `>=24.11 <25`, runs `.ts` with built-in type stripping, no loader and no flag, as the e2e serve command `node test/support/e2e-stack/main.ts` already does; so the closed env needs no `NODE_OPTIONS`) with `json = { scenario, faultPoints, args, dataDir }`, `cwd` the `dataDir`, env `{ ...cluster.env, PATH, HOME }` (those two when the parent has them). The child builds `faultPoints` (`NO_FAULT_POINTS` when none, else `createFaultPoints` with `markerDir: faultMarkerDir(dataDir)` and `kill: () => process.kill(process.pid, "SIGKILL")`), a stdout logger, `stepObserver = faultObserver(faultPoints)` and `env` as a copy of its `process.env`, `import()`s the scenario and awaits `start(ctx)`. `ctx.ready()` writes the line `CRASH_READY` to stdout once. Failures write one stderr line (`writeSync(2, ...)`) and exit 1: `crash-child: bad_payload`, `scenario_unloadable` (import threw), `scenario_invalid` (no `start` function), `scenario_failed <error.code if a string, else unknown>`, `scenario_not_ready` (`start` settled without `ready()`). After a good start the child idles until killed.
8. **Parent side.** A child is finished at its `close` event (both pipes ended). Both streams go through `appendFileSync` to `<dataDir>/engine.log`, so output before the ready line is in the file when `spawnEngine` resolves. A child that closes before `CRASH_READY` rejects `CRASH_START_FAILED` with `{ reason: "exited", line, exitCode }` (`line`: last non-empty stderr line, 300 characters at most; no `exitCode` for a signal); at `readyTimeoutMs` the child is killed and the rejection has `{ reason: "timeout", line, pid }`. `spawnEngine(opts)` is `spawnEngineTuned(opts, { readyTimeoutMs: READY_TIMEOUT_MS })`; `restart` reuses the tuning. `pid` is a getter on the current child. `deaths` counts ready children that closed without a `kill`, `restart` or `stop` asking for it. `kill()` marks the request, SIGKILLs a live child and awaits its close (a dead child: resolves). `restart()` calls run on one serial chain: `kill()`, then spawn. `stop()` is `kill()` plus a flag that makes `restart()` reject `CRASH_STOPPED`. A map `dataDir -> live engines` lets the cluster's close stop engines a test left behind.
9. **`counter-scenario.ts`:** at module load `registerWorkflow("crash.counter", fn)`; `fn(input: { log: string })` runs `runStep` `one`, `two`, `three` (each appends `<name>\n` to `input.log` and returns the name), then appends `done\n`. `start(ctx)`: `loadConfig` of the two database variables of `ctx.env` gives the endpoint (`null`: throw), `launchDurable({ endpoint, logger: ctx.logger, stepObserver: ctx.stepObserver, pollingIntervalMs: 20 })`, `ctx.ready()` (before the enqueue, so no fault point fires ahead of the ready line), then `enqueue("crash.counter", ctx.args.workflowId ?? "crash-counter", { log: join(ctx.dataDir, ctx.args.log ?? "steps.log") })`. After a restart the same id is enqueued again (U30's `return-existing`: a no-op); DBOS recovers the pending workflow inside `launchDurable`.
10. **Effects.** `appendEffect` validates (`tool`, `nodeId` non-empty strings; `idemKey` a non-empty string or `null`; else `CRASH_OPTIONS_INVALID`, `details.field`), creates the directory, and does one `appendFileSync` of `JSON.stringify({ tool, idemKey, nodeId }) + "\n"` (one `O_APPEND` write per line). `countEffects` reads the file (absent: zeros) and builds `byTool` with a `Map` and `Object.fromEntries`, so `__proto__` is an own key; a line that is not a JSON object with `tool` and `nodeId` non-empty strings and `idemKey` a non-empty string or `null` (`not json`, `{}`, a numeric `tool`) throws `CRASH_EFFECT_LOG_INVALID`, `details.line` its 1-based number.
11. **Waiting.** No `waitForDeath` helper: a test polls `proc.deaths` or the `workflow_status` row with a local loop (25 ms pause, 20 s deadline).

## Interfaces

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


## Failure cases

Bad options are refused before any file or process exists. A child that dies or hangs before its ready line gives `CRASH_START_FAILED` and leaves no live process; a failed `restart()` leaves the engine dead (`pid` keeps the last started child's pid, `deaths` is unchanged, the serial chain continues); concurrent restarts never leave two live children. A failed part start, seed or env merge closes what started and removes the directory.

## Security

1. No endpoint, PEP action, table or migration; each cluster is private to one test. 2. Boundary validation: spawn options, fault names (a file name only as a sha256), effect entries. 3. Secrets: the app password reaches the child only through `URSITOARE_DATABASE_PASSWORD_FILE` (a `0o600` file in a `0o700` directory), never a URL, log line or error; the closed child environment keeps `L4_*` out. 4. Abuse: production code arming a fault ("Rule fixtures, the real tree and the config"); a fault firing twice ("Armed point, marker, second hit"); a leaked cluster or process ("Real parts, a value and a throw", "Kill, restart, stop, deaths"); a tool named `__proto__` ("A fixed file, the empty file, the bad inputs").

## Test plan

Pure tests: `src/config/faults.test.ts`, `test/arch/fault-points.test.ts` (the `answer()` wrapper of `test/arch/owner-endpoint.test.ts`), `observer.test.ts`, `effects.test.ts`. `engine.test.ts` and `engine.control.test.ts` need no database: a hand-built `CrashCluster` and `.mjs` scenarios the test writes into its `dataDir`. `cluster.test.ts` (two boots) and `counter.test.ts` (one boot, three children) boot real parts, well under the 120 s test timeout.

## Decisions made while writing

- **Additions to the card** (nothing renamed): `READY_TIMEOUT_MS` and `spawnEngineTuned` (a 30 s deadline cannot be tested in real time), `startCrashCluster` (part failures cannot be injected into `discoverParts()`), `faultMarkerDir` (parent and child share one path).
- **`appEndpoint` from two variables** (decision 5); `env` stays the merged part env. Seeds run in an own loop, not `createResetRunner` (fault table and health probe the harness lacks).
- **`deaths` counts every unrequested end**; a test waits for it before `restart()`, since `ready()` precedes the first step and an early `restart()` would kill the child before its fault fires.
- **Part-close errors are ignored** in `close()` and rollback, so a test's failure is not masked.
