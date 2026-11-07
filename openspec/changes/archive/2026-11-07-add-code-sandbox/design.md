## Context

ADR-04, § 9.4: pure `code` in a worker pool inside the DBOS step, faults terminal; port of `seed/sandbox-quickjs` (REPORT § 2: F1-F9) without fetch.

**Runtime: Node 24.** `package.json` engines `>=24.11 <25`; CI `node-version: "24"` (`.github/workflows/l4.yml:67`, `e2e.yml:26`). `.ts` worker entries run on Node 24's built-in type stripping (`process.features.typescript` is `"strip"`): the `test` script has no flag, `tsconfig.json` sets `erasableSyntaxOnly`, and the seed's `.ts` worker ran under plain `node` 24.22.2. No other `.ts` worker exists in the repo.

## Decisions

1. **Files.** `types.ts`, `limits.ts`, `classify.ts` (pure fault classification), `validate.ts` (main-thread checks), `pool.ts`, `worker-entry.ts`, `run-code.ts`, `prelude.ts` (guest source), `wasm.ts` (`WebAssembly` typing, module cache), `index.ts`.
2. **Protocol.** No ready handshake (Node delivers a message posted before the worker listens: probe, 24.22.2). One message per job, `{ id, code, inputJson, limits, options, stackCapBytes }`, answered `{ id, result }`; the input travels as validated JSON text, so no `DataCloneError`.
3. **One run.** The seed's `runCode`: a Wasm module per `memoryBucket` (`initial` 256, `maximum` 256 + bucket / 65536 pages; dropped after a `sandbox_crash` or an abort while disposing, which keeps the result); `setMemoryLimit`, `setMaxStackSize(clampStack(…))`, an interrupt past the deadline, `executePendingJobs(512)` until settled, `never_settled` when pending with no job. `memBytes` is -1 after `memory_limit`, `sandbox_crash` and a watchdog `timeout` (F9); `ms` is measured in the worker for a settled run, else on the main thread. `buildPrelude` is ported and `classify` becomes `classifyFault`; errors are read via `getProp` (F6); under `object_or_null`, `undefined` and `null` give `"Onull"`.
4. **Pool.** `run` reserves a worker synchronously (idle, new below `size`, or a FIFO entry); the seed reserved after an `await` and timed out 5 of 6 concurrent runs. The watchdog starts at `postMessage`. Exit with a job: clear the timer, replace at once, `respawns`++, `sandbox_crash`. Idle exit: remove the slot; the next run spawns (`respawns`++). A throwing factory gives `sandbox_crash`. `createWorkerSandbox` reads `opts` once into a plain copy in a try/catch (`Reflect.ownKeys`, `Reflect.get`, `String(key)`), unknown keys before values. Workers are `unref()`ed; the watchdog timer is not.
5. **Validation** (main thread; first failure wins in the order `code`, `limits`, `options`, `seed`, `nowIso`, `binding`, `result`, `input`; messages start with the argument's name). `limits` and `options` are each read once into a plain copy at their own step, after the non-null-object check (as design 4's `opts`); a throw gives `input_invalid` (no rejection), message `limits could not be read` or `options could not be read`, before any worker is reserved; members are checked on the copy. `nowIso` matches `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$` and `Date.parse` is finite, and the day is at most its month's length (V8 rolls `2026-02-30` over to 2 March). The input check is the spec's `strictJson` in a try/catch (a throw is `input_invalid`), then at most 8,000,000 JSON characters. No `node:util` (the import rule forbids it).
6. **Sizing** is the caller's: no `size` means 2; U39's `main` passes `poolSize(availableParallelism())` (`node:os` is refused here).
7. **Typing.** `wasm.ts` declares the `WebAssembly.Memory` members it uses.
8. **Arch rule.** `checkSandboxIo` resolves relative refs with `resolveSpecifier` and matches bare ones by exact text; every identifier `process` is reported; the result goes through `sortViolations`.

## Interfaces

```ts
export type SandboxJson = null | boolean | number | string | SandboxJson[] | { [key: string]: SandboxJson };
export type SandboxFaultCode =
  | "timeout" | "memory_limit" | "stack_overflow" | "output_too_large" | "output_invalid"
  | "input_invalid" | "syntax_error" | "runtime_error" | "never_settled" | "sandbox_crash";
export interface SandboxLimits { timeoutMs: number; memoryBytes: number; maxStackBytes: number; maxOutputBytes: number }
export interface SandboxOptions {
  seed: string; // hashed with seedOf into the guest PRNG seed
  nowIso: string; // the frozen Date.now() / new Date() of the guest
  binding: "input" | "ctx"; // the body's parameter name
  result: "object" | "object_or_null"; // object_or_null: a body returning undefined or null gives value null
}
export interface SandboxStats { ms: number; memBytes: number } // memBytes -1 when not sampled
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
  workerFactory?: (url: URL, options: WorkerOptions) => Worker; // test only; production passes none
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
export const MIN_STACK_BYTES: number; // 32768
export function memoryBucket(memoryBytes: number): number; // max(1, ceil(n / 16 MiB)) * 16 MiB
export function clampStack(maxStackBytes: number, capBytes: number): number; // min(cap, max(MIN_STACK_BYTES, floor(n)))
export function poolSize(availableCpus: number): number; // integer n >= 1: max(1, min(2, n - 1)); else 1
export function seedOf(seed: string): number; // FNV-1a 32-bit over UTF-16 code units (the seed's fnv1a)
export function workerEntryUrl(moduleUrl: string): URL; // "./worker-entry.ts" when moduleUrl ends with ".ts", else "./worker-entry.js"
// src/sandbox/classify.ts (re-exported from index)
export interface FaultFacts {
  stage: "args" | "compile" | "run" | "jobs" | "output" | "pending" | "host" | "watchdog" | "exit" | "spawn";
  error?: { name: string; message: string } | null;
  interrupted?: boolean; nearCeiling?: boolean;
  bytes?: number; maxBytes?: number;
  ms?: number; timeoutMs?: number; graceMs?: number;
}
export function classifyFault(facts: FaultFacts): { code: SandboxFaultCode; message: string };
// src/sandbox/pool.ts (re-exported from index)
export function createWorkerSandbox(opts?: WorkerSandboxOptions): WorkerSandbox;
// test/support/sandbox-escape.ts
export type EscapeExpect = { ok: true; value?: SandboxJson } | { fault: SandboxFaultCode | readonly SandboxFaultCode[] };
export interface EscapeCase {
  id: string; title: string; source: string; input: SandboxJson; limits?: Partial<SandboxLimits>;
  expect: EscapeExpect; hookExpect?: EscapeExpect; // hookExpect: the outcome under binding "ctx", result "object_or_null"
}
export const ESCAPE_CASES: readonly EscapeCase[];
export function checkEscapeCase(c: EscapeCase, result: SandboxResult, mode: "node" | "hook"): string | null; // null = pass
// test/arch/sandbox-io.ts
export function checkSandboxIo(s: Snapshot): Violation[]; // code ARCH_SANDBOX_IO
```

## Failure classification

A closed sandbox rejects and a bad option throws (spec); every other failure is a returned fault, chosen by `classifyFault` (`classify.ts`; pure, called only for a fault) as the code of the first matching row. `validate.ts` builds its `FaultFacts` for R1 (stage `args`, `error.message` the whole message), the worker (`run-code.ts`) for R2-R11 (stage `run`: the driver call, a rejected driver promise or an `E` envelope, R6 and R8), `pool.ts` for R12. Source: the seed (`runCode`, `classify`, `drive`; probed on Node 24.22.2) minus its fetch rows, so a thrown `FetchDeniedError` is V7. "Interrupted" is the deadline flag: the interrupt handler sets it, and so does the worker when it finds the deadline passed at a settled or pending check; `T` is `execution exceeded timeoutMs`; `<m>` is the error's message (V4 and V6 return it); an `O` text no row refuses is `ok`. A `null` error is a thrown null (R5 at the job queue unless interrupted, else V1's `NullThrown`); V1's memory signal is set for an `E` envelope only.

| Row | Condition | Code | Message |
|---|---|---|---|
| R1 | an argument is invalid | `input_invalid` | starts with the argument's name |
| R2 | compiling the wrapper throws; interrupted | `timeout` | `T` |
| R3 | compiling throws `SyntaxError` | `syntax_error` | `SyntaxError: <m>` |
| R4 | compiling throws another error (`InternalError: out of memory`) | `runtime_error` | `<name>: <m>` |
| R5 | the job queue fails with `null`; not interrupted | `memory_limit` | `guest heap exceeded memoryBytes (job queue)` |
| R6 | the driver call or job queue fails otherwise, or the driver promise is rejected | V1-V7 | on the error value |
| R7 | the deadline has passed, the promise settled (a result too) or pending | `timeout` | `T` |
| R8 | an `E` envelope: the body threw or rejected (`Promise.reject(new Error("x"))` is `Error: x`), or the walker refused its output | V1-V7 | on `{ name, message }` |
| R9 | an `O` text over `maxOutputBytes` UTF-8 bytes (in characters: V5) | `output_too_large` | `output is <bytes> bytes, limit <maxOutputBytes>` |
| R10 | pending, no job queued | `never_settled` | `the code body returned a promise that can never settle (deadlock, or an out-of-memory failure swallowed inside a promise job)` |
| R11 | the host throws at any stage: a Wasm trap or abort, V8's `RangeError` through Wasm frames | `sandbox_crash` | `<constructor name>: <m to 300 characters>`; module dropped |
| R12 | no answer `timeoutMs` + `graceMs` after `postMessage` / the worker exits during the job (a failed Wasm load too) / the factory throws | `timeout` / `sandbox_crash` / `sandbox_crash` | `worker watchdog killed the sandbox after <ms> ms (limit <timeoutMs> + grace <graceMs>)` / `worker thread exited unexpectedly` / `worker thread could not be started` |

Error-value rows (a body can forge V1 and V3-V6, which match a name and message it chooses, but only to codes it reaches honestly):

| Row | Condition | Code | Message |
|---|---|---|---|
| V1 | name `NullThrown` (`throw null`, `Promise.reject(null)`, an allocation that left no exception object): not interrupted and Wasm memory within 2 pages of the module's maximum / interrupted / otherwise | `memory_limit` / `timeout` / `runtime_error` | `allocation failed at the Wasm memory ceiling (no exception object could be built)` / `T` / `null was thrown` |
| V2 | interrupted | `timeout` | `T` |
| V3 | `InternalError`, message `out of memory` | `memory_limit` | `guest heap exceeded memoryBytes` |
| V4 | `InternalError` with message `stack overflow`; or `RangeError` matching `Maximum call stack size exceeded` | `stack_overflow` | `<m>` |
| V5 | name `OutputTooLargeError` (walker: over `maxOutputBytes` characters) | `output_too_large` | `output exceeds size limit` |
| V6 | name `OutputError` (walker) | `output_invalid` | `output is not JSON-serializable at <path>: <reason>` |
| V7 | any other (`RangeError`, `InternalError`, a string) | `runtime_error` | `<name>: <m>` |

A thrown object gives name `String(e.name)` (`Error` if undefined) and message `String(e.message)` (`<thrown <typeof> without a message>` if undefined), another value `Error` and `String(value)`, a throw while reading `<unprintable thrown value>`; name is cut to 200, message to 2000 characters. The walker refuses what E54a-q lists, nesting over 64, a `__proto__` key and a `toJSON` member, and reads accessors by descriptor without calling them: a throwing getter is V6 (`accessor property`), a throwing `Proxy` trap V7 (`Error: trap`). R11 probes: 100000 nested `(` gives `RangeError: Maximum call stack size exceeded`; a 70 MB body (32 MiB bucket) `RuntimeError: table index is out of bounds`. The V1 ceiling is sticky: a `memory_limit` keeps the module, so there `throw null` gives `memory_limit` (probed: `runtime_error`, then after a bomb `memory_limit`).

## Security

1-2. No endpoint, PEP action or table. 3. Arguments are validated before a worker sees them; the guest gets a JSON copy and no host function. 4. Workers get `env: {}`; the guest has no `process` or I/O; the arch rule refuses host I/O and `process`. A fault `message` can hold data the body threw: U39 and U42 never copy it. 5. Abuse and proof: pollution and host access (sweep), loops (deadline), bombs (memory), recursion and output (stack and output), shared workers (pool), exiting workers (crash), hostile `Proxy` input (invalid arguments). A QuickJS-plus-V8 escape would reach the engine; ADR-04's `ROLE=sandbox` profile and adversarial pass remain.

## Test plan

Timing is wall-clock, so no `Clock`; assertions use the spec's windows.

## Decisions made while writing

- Added behaviour, not seams (accepted by the coordinator): the caps of the spec; `nowIso` needs a zone; `code` must be a string; `run` checks `closed` first; idle-exit replacement is lazy; option, watchdog and spawn-failure messages are fixed.
- One representative body per multi-body Phase-0 case.

## Unverified

`src/sandbox` on Node 24 (every probe ran on 24.22.2) and its `.ts` worker entry under `node --test`; the throwing `limits` and `options` rows and `MULTI_BAD` (design 5); the unprobed `classifyFault` vectors (no seed body reaches R2, R5, R6 or the factory of R12, the worker's facts for them are unverified); the `"hook"` sweep, recording factory, exit worker, child processes; `dist/sandbox/worker-entry.js` in a built image (the built-worker scenario covers the `tsc` build from `node_modules/.cache/`, probed with a stand-in pool, `src/sandbox` being stubs).
