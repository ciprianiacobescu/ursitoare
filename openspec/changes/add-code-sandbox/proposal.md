## Why

`code` nodes (U39) and code hooks (U42) must run unreviewed JavaScript inside a durable step, and `src/sandbox` does not exist. This unit ports the hardened Phase-0 pool (`seed/sandbox-quickjs`) without the fetch gateway (ADR-04: code is pure).

Batch `m5-code-hooks` (U38-U44 and U42b, in plan order U38, U39, U40, U41, U42, U42b, U43, U44; closing unit `add-web-hooks-view`, journey `e2e/test_m5_code_hooks.py`) delivers M5: flows with pure `code` nodes and pre/post hooks run durably; hook routes into effect nodes are rejected. This unit's part: a worker pool that runs a pure body under fixed limits and returns typed faults. The plan runs acceptance profile `all` after this unit merges: every configured gate (setup, build, lint, typecheck, test, e2e) on the target; the batch outcome itself is proven by the closing unit's journey.

Observable result: `createWorkerSandbox().run` gives `{ ok: true, value: { amount: 1234.57, currency: "EUR", is_large: true } }` for the RF-1 `normalize` body, the same in any process and timezone, and a typed fault for a loop, bomb, recursion, bad output or argument and an exited worker; the 42 escape cases pass.

## What Changes

`src/sandbox/`, `test/arch/sandbox-io.ts`, `test/support/sandbox-escape.ts` and `sandbox-exit-worker.ts`, with tests.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded: the README row, `test/support/sandbox-exit-worker.ts`, internal files. The scaffold installs the dependencies below.
- **Dependencies:** `quickjs-emscripten-core` `0.32.0` and `@jitl/quickjs-wasmfile-release-sync` `0.32.0` (transitive `@jitl/quickjs-ffi-types` `0.32.0`), all MIT, exact in the root `package.json`, past `minimumReleaseAge`. The variant declares a `prepare` script; after `pnpm add --save-exact` the scaffold checks: no "Ignored build scripts" warning names them, no `requiresBuild` for them in `pnpm-lock.yaml`, `test/arch/licences.test.ts` passes. No scenario tests pnpm.
- **Depends on**: `add-engine-skeleton` (U01): `src/core` and `src/config`, the only modules `sandbox` may import. `add-architecture-fitness` (U04, edge added): the arch-rule API and the `worker_threads` exception. `add-supply-chain-gate` (U05, edge added): the licence and install-time gates.
- **Changed:** two rows appended to `test/support/README.md`; no accepted scenario. No migration, endpoint, error code, policy, e2e part, CLI command, feature file or health check.

**Interfaces given** (as in `design.md` § Interfaces)

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

**Interfaces taken:**

- From `add-architecture-fitness`: `Snapshot`, `Violation`, `isTestFile`, `snapshotOf`, `readSnapshot`, `collectImports` (`test/arch/sources.ts`).
- From `add-supply-chain-gate`: `ALLOWED_LICENCES` (`test/arch/licence-policy.ts`).

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@a6b5fb37, checked line by line).

## Out of scope

The `code` node runtime and the pool in `src/main.ts` (U39); code hooks (U42); any `fetch` option; an in-process `runCode`; an environment variable; a health check; ADR-04's adversarial pass; the footprint harness (M15).
