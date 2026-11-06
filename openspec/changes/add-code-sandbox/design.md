## Context

ADR-04 and § 9.4: pure `code` in a worker pool inside the DBOS step, faults terminal. Port of `seed/sandbox-quickjs` (REPORT § 2: F1-F9) without fetch.

## Decisions

1. **Files.** `types.ts`, `limits.ts`, `validate.ts` (main-thread checks), `pool.ts`, `worker-entry.ts`, `run-code.ts`, `prelude.ts` (guest source), `wasm.ts` (`WebAssembly` typing, module cache), `index.ts`.
2. **Protocol.** No ready handshake (Node delivers a message posted before the worker listens: probe, 26.8.1). One message per job, `{ id, code, inputJson, limits, options, stackCapBytes }`, answered `{ id, result }`; the input travels as validated JSON text, so no `DataCloneError`.
3. **One run.** The seed's `runCode`: a Wasm module per `memoryBucket` (`initial` 256, `maximum` 256 + bucket / 65536 pages; dropped after an abort or fault); `setMemoryLimit`, `setMaxStackSize(clampStack(…))`, an interrupt past the deadline, `executePendingJobs(512)` until settled, `never_settled` when pending with no job. `memBytes` is -1 after `memory_limit`, `sandbox_crash` and a watchdog `timeout` (F9); `ms` is measured in the worker for a settled run, else on the main thread. `classify` and `buildPrelude` are ported (errors read via `getProp`, F6); under `object_or_null`, `undefined` and `null` give `"Onull"`.
4. **Pool.** `run` reserves a worker synchronously (idle, new below `size`, or a FIFO entry); the seed reserved after an `await` and timed out 5 of 6 concurrent runs. The watchdog starts at `postMessage`. Exit with a job: clear the timer, replace at once, `respawns`++, `sandbox_crash`. Idle exit: remove the slot; the next run spawns (`respawns`++). A throwing factory gives `sandbox_crash`. Workers are `unref()`ed; the watchdog timer is not.
5. **Validation** (main thread; first failure wins in the order `code`, `limits`, `options`, `seed`, `nowIso`, `binding`, `result`, `input`; messages start with the argument's name; a `limits` or `options` that is not a non-null object is refused under its own name before any member is read): `nowIso` matches `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$` and `Date.parse` is finite, and the day is at most its month's length (V8 rolls `2026-02-30` over to 2 March). The input check is the spec's `strictJson` in a try/catch (a throw is `input_invalid`), then at most 8,000,000 JSON characters. No `node:util` (the import rule forbids it).
6. **Sizing** is the caller's: no `size` means 2; U39's `main` passes `poolSize(availableParallelism())` (`node:os` is refused here).
7. **Typing.** `wasm.ts` declares the `WebAssembly.Memory` members it uses; `tsconfig.json` stays.
8. **Arch rule.** `checkSandboxIo` resolves relative refs with `resolveSpecifier` and matches bare ones by exact text; every identifier `process` is reported; the result goes through `sortViolations`.

## Interfaces

```ts
export type SandboxJson = null | boolean | number | string | SandboxJson[] | { [key: string]: SandboxJson };
export type SandboxFaultCode =
  | "timeout" | "memory_limit" | "stack_overflow" | "output_too_large" | "output_invalid"
  | "input_invalid" | "syntax_error" | "runtime_error" | "never_settled" | "sandbox_crash";
export interface SandboxLimits { timeoutMs: number; memoryBytes: number; maxStackBytes: number; maxOutputBytes: number }
export interface SandboxOptions {
  seed: string;                          // hashed with seedOf into the guest PRNG seed
  nowIso: string;                        // the frozen Date.now() / new Date() of the guest
  binding: "input" | "ctx";              // the body's parameter name
  result: "object" | "object_or_null";   // object_or_null: a body returning undefined or null gives value null
}
export interface SandboxStats { ms: number; memBytes: number }   // memBytes -1 when not sampled
export type SandboxResult =
  | { ok: true; value: { [key: string]: SandboxJson } | null; stats: SandboxStats }
  | { ok: false; fault: { code: SandboxFaultCode; message: string }; stats: SandboxStats };
export interface WorkerSandbox {
  readonly size: number;
  readonly respawns: number;
  run(code: string, input: SandboxJson, limits: SandboxLimits, options: SandboxOptions): Promise<SandboxResult>;
  close(): Promise<void>;
}
export interface WorkerSandboxOptions {
  size?: number; graceMs?: number; stackSizeMb?: number; stackCapBytes?: number; maxOldGenerationSizeMb?: number;
  workerFactory?: (url: URL, options: WorkerOptions) => Worker;   // test only; production passes none
}
export type SandboxErrorCode = "SANDBOX_CLOSED" | "SANDBOX_INVALID";
export class SandboxError extends Error {
  readonly code: SandboxErrorCode; readonly details: Readonly<Record<string, string>>;
  constructor(code: SandboxErrorCode, message: string, details?: Record<string, string>);
}
// src/sandbox/limits.ts (re-exported from index)
export const DEFAULT_SANDBOX_LIMITS: Readonly<SandboxLimits>;
  // spec values [D8]
export const SANDBOX_POOL_DEFAULTS: Readonly<{ size: number; graceMs: number; stackSizeMb: number; stackCapBytes: number; maxOldGenerationSizeMb: number }>;
  // spec values [D8]
export const MIN_STACK_BYTES: number;                       // 32768
export function memoryBucket(memoryBytes: number): number;  // max(1, ceil(n / 16 MiB)) * 16 MiB
export function clampStack(maxStackBytes: number, capBytes: number): number;  // min(cap, max(MIN_STACK_BYTES, floor(n)))
export function poolSize(availableCpus: number): number;    // integer n >= 1: max(1, min(2, n - 1)); else 1
export function seedOf(seed: string): number;               // FNV-1a 32-bit over UTF-16 code units (the seed's fnv1a)
export function workerEntryUrl(moduleUrl: string): URL;     // "./worker-entry.ts" when moduleUrl ends with ".ts", else "./worker-entry.js"
// src/sandbox/pool.ts (re-exported from index)
export function createWorkerSandbox(opts?: WorkerSandboxOptions): WorkerSandbox;
// test/support/sandbox-escape.ts
export type EscapeExpect = { ok: true; value?: SandboxJson } | { fault: SandboxFaultCode | readonly SandboxFaultCode[] };
export interface EscapeCase {
  id: string; title: string; source: string; input: SandboxJson; limits?: Partial<SandboxLimits>;
  expect: EscapeExpect; hookExpect?: EscapeExpect;   // hookExpect: the outcome under binding "ctx", result "object_or_null"
}
export const ESCAPE_CASES: readonly EscapeCase[];
export function checkEscapeCase(c: EscapeCase, result: SandboxResult, mode: "node" | "hook"): string | null;  // null = pass
// test/arch/sandbox-io.ts
export function checkSandboxIo(s: Snapshot): Violation[];   // code ARCH_SANDBOX_IO
```

## Failure cases

Bad arguments are faults, a closed sandbox rejects, a bad option throws; a Wasm load failure, abort, exiting worker or failed spawn is `sandbox_crash` and the pool survives; an abort while disposing a run that already has its result (E20, from `JS_FreeRuntime`) keeps that result and drops the module.

## Security

1-2. No endpoint, PEP action or table. 3. Arguments are validated before a worker sees them; the guest gets a JSON copy and no host function. 4. Workers get `env: {}`; the guest has no `process` or I/O; the arch rule refuses host I/O and `process`. A fault `message` can hold data the body threw: U39 and U42 never copy it. 5. Abuse and proof: pollution and host access (sweep), loops (deadline), bombs (memory), recursion and output (stack and output), shared workers (pool), exiting workers (crash), hostile `Proxy` input (invalid arguments). A QuickJS-plus-V8 escape would reach the engine; ADR-04's `ROLE=sandbox` profile and adversarial pass remain.

## Test plan

Fixtures: `test-plan.md`, `escape-data.md`. Timing is wall-clock, so no `Clock`; assertions use the spec's windows.

## Decisions made while writing

- Added behaviour, not seams (accepted by the coordinator): the caps of the spec; `nowIso` needs a zone; `code` must be a string; `run` checks `closed` first; idle-exit replacement is lazy; option, watchdog and spawn-failure messages are fixed.
- One representative body per multi-body Phase-0 case.

## Unverified

Node 24 (probes ran on 26.8.1; the planner's probe covers 24.22.2 for the core path); the `"hook"` sweep, recording factory, exit worker, child processes; `dist/sandbox/worker-entry.js` in a built image (the built-worker scenario covers the `tsc` build from `node_modules/.cache/`, probed with a stand-in pool, `src/sandbox` being stubs).
