# sandbox-quickjs (M7)

Spike: a deterministic, gateway-only `code` node for Ursitoare, using QuickJS compiled to Wasm.

- Library: `quickjs-emscripten` **0.32.0**, pinned exactly (`RELEASE_SYNC` variant; the asyncify variant was not needed, see REPORT.md).
- Node 26.8.1, TypeScript 7.0.2 (typecheck only; Node runs the `.ts` files directly via type stripping, so imports use `.ts` extensions and no `tsx` is needed).
- Results, the escape-suite table, the benchmark table and the D4 inputs are in [REPORT.md](REPORT.md).

## API

```ts
import { runCode } from './src/index.ts';

const result = await runCode({
  source: `return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase() };`, // format-v0 code body
  input: { amount: 12.345, currency: 'eur' },      // plain JSON; deep-copied into the guest as a JSON string
  limits: { timeoutMs: 1000, memoryBytes: 32 << 20, maxStackBytes: 64 << 10, maxOutputBytes: 1 << 20 },
  seed: 42,                                         // Math.random seed (number, or string -> FNV-1a)
  nowIso: '2026-10-24T12:00:00.000Z',               // the frozen clock
  fetchAllowlist: ['http://localhost:18930'],       // optional; omit to leave `fetch` undefined
  // fetchReplay: previousResult.fetchLog,          // optional; replay recorded responses, no network
});
// { ok: true, output, stats: { ms, memBytes, setupMs, execMs }, fetchLog }
// { ok: false, error: { code, message }, stats, fetchLog }
```

Error codes: `timeout`, `memory_limit`, `stack_overflow`, `output_too_large`, `output_invalid`, `input_invalid`, `syntax_error`, `runtime_error`, `never_settled`, `fetch_denied`, `fetch_failed`, `replay_mismatch`, `sandbox_crash`.

`src/worker-sandbox.ts` offers `WorkerSandbox`, the recommended production mode: the same `runCode` on a long-lived worker thread, with a watchdog that kills the thread if a native call ignores the interrupt, and a 4 MB native stack so a 256 KiB guest stack is safe.

```ts
const ws = new WorkerSandbox(2);            // 2 worker threads
const r = await ws.run({ source, input, limits, seed, nowIso });
await ws.close();
```

## What the sandbox does

Per execution: a fresh Wasm runtime and context (nothing survives between runs), the `input` as a JSON copy, the source compiled as `async function (input) { "use strict"; <source> }` (so `await` works), the result validated and serialised inside the guest, then re-parsed on the host.

### Determinism: what is overridden or removed

| Item | Treatment | Why |
|---|---|---|
| `Date` | Replaced. `Date.now()`, `new Date()` and `Date()` return `nowIso`; `Date.now` / `Date.parse` / `Date.UTC` are non-writable, non-configurable | clock reads |
| Local-time API (`getHours`, `getDate`, `setMonth`, `getTimezoneOffset`, `toString`, `toDateString`, `toTimeString`, `toLocale*String`, `new Date(y, m, d, ...)`) | Aliased to UTC; `getTimezoneOffset()` is 0; `toString()` is `... GMT+0000 (UTC)`; `toLocale*` are fixed ISO-like formats | the stock context leaks the host timezone (`getTimezoneOffset()` was -120 here, and follows `TZ`) |
| `Date.parse` / `new Date(string)` | Only ISO-8601 (zone-less date-times are UTC), RFC-1123 `... GMT`, and this sandbox's own `toString()` output are accepted; any other string gives `Invalid Date`. `getYear` / `setYear` deleted | legacy formats are parsed in the host timezone |
| `Math.random` | Replaced by mulberry32 seeded from `seed`; non-writable, non-configurable | randomness |
| `SharedArrayBuffer`, `WeakRef`, `FinalizationRegistry` | Deleted (present in the stock build) | threading and GC-timing observability |
| `Atomics`, `WebAssembly`, `Intl`, `console`, `process`, `require`, `module`, timers (`setTimeout`, `setInterval`, `setImmediate`, `queueMicrotask`), `performance`, `structuredClone`, `TextEncoder`, `URL`, `Buffer`, `global`, `window`, `self` | Not present in the stock build, and asserted absent by the suite | host access and clocks |
| `fetch` | Absent unless `fetchAllowlist` is passed | gateway-only network |
| `eval`, `Function` constructor | Kept (contained: they only see the sandbox global) | the brief allows them |
| `import()` | Present but fails: no module loader is installed (`could not load module`) | no module access |

Not removed, and not a source of nondeterminism: `Object` key order, `Array.prototype.sort` (stable), `Map` / `Set` order, `Number` formatting, `Error.stack` (guest file names and line numbers only).

### Output rules

The returned value must be a plain object (not an array or primitive) containing only `null`, booleans, strings, finite numbers, arrays and plain objects, with no cycles, accessors, sparse holes, `toJSON`, `__proto__` keys, or nesting deeper than 64. Anything else is `output_invalid`. The serialised size is capped by `maxOutputBytes` (UTF-8 bytes).

### Gateway-only fetch

Enabled by `fetchAllowlist` (exact origins, `scheme://host[:port]`). The guest `fetch(url, init)` returns a small Response (`status`, `ok`, `headers.get()`, `text()`, `json()`).

- Only `http:` / `https:`, no credentials in the URL, exact-origin match, methods GET/HEAD/POST/PUT/PATCH/DELETE, no `host` / `content-length` / `transfer-encoding` headers.
- Redirects are never followed (`redirect: 'manual'`): the guest receives the 3xx and its `location` header.
- Caps: 16 requests per run, 1 MB per response and per request body (overridable).
- Every request and response is recorded in `fetchLog`. Pass that array back as `fetchReplay` to re-run with no network: allowed calls consume the recording in order, and any difference gives `replay_mismatch`.
- Implemented on the **sync** build: the host function returns a QuickJS promise (`newPromise`), the host settles it when the real `fetch` completes, and the driver loop pumps `executePendingJobs`. Asyncify was not needed.

### Memory, stack and time (read REPORT.md before relying on these)

- `memoryBytes` is enforced as a ceiling on the Wasm linear memory of a per-bucket module instance. `JS_SetMemoryLimit` alone does not count bytes in this build.
- `maxStackBytes` is clamped to 32-64 KiB in-process (256 KiB in `WorkerSandbox`), because the Wasm code runs on V8's ~984 KB native stack.
- `timeoutMs` is wall-clock for the whole run, including time awaiting `fetch`. In-process, a few native built-ins (BigInt arithmetic, large `String.replace`, ...) do not poll the interrupt; `WorkerSandbox` bounds them to `timeoutMs + graceMs`.

## Reproduce

```bash
cd sandbox-quickjs
npm ci
npm run typecheck
npm test                      # 70 tests: 59 escape/abuse cases, 6 determinism, 5 worker; starts a stub on 127.0.0.1:18930 (only port used)
npm run memory-probe          # stock JS_SetMemoryLimit vs Wasm-memory ceiling
node bench/stock-probe.ts     # what the stock context exposes (timezone leak, SharedArrayBuffer, ...)
node bench/stack-matrix.ts    # recursion shapes x stack sizes, in-process and in a worker
node bench/native-ops.ts      # built-ins that ignore the interrupt handler
node bench/fetch-cost.ts      # cost of the async fetch bridge

# benchmarks: 3 rounds, then aggregate (alpine:3.20 must be pulled first: docker pull alpine:3.20)
npm run ivm:install           # isolated-vm probe (optional; the bench skips it if absent)
for i in 1 2 3; do BENCH_OUT=results/bench-run$i.json node bench/bench.ts; done
node bench/summarize.ts && node bench/escape-table.ts
```

`ITER=300` is the default iteration count (`ITER=...` overrides). Raw outputs are in `results/`.

## Layout

```
src/index.ts            runCode, module/bucket management, error classification
src/prelude.ts          guest-side prelude (Date, Math.random, removals, validation, fetch shim, driver)
src/fetchGateway.ts     allowlist, recording, replay
src/worker-sandbox.ts   WorkerSandbox (+ worker-entry.ts)
test/                   escape.test.ts, determinism.test.ts, worker.test.ts, stub-server.ts
bench/                  bench.ts, summarize.ts, memory-limit-probe.ts, stock-probe.ts, fetch-cost.ts, child-load.ts
results/                raw evidence (JSON, logs)
```
