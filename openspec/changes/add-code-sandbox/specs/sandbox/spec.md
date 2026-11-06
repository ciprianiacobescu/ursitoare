## Purpose

The `sandbox` capability runs a pure JavaScript body in QuickJS (Wasm) on a worker-thread pool, under fixed limits, a frozen clock and seeded randomness, with no host function and no secret; every failure is a returned, never retried, typed fault.

## ADDED Requirements

### Requirement: Pure helpers and default objects fix the sandbox's numbers
`src/sandbox` SHALL export `seedOf`, `memoryBucket`, `clampStack`, `poolSize`, `workerEntryUrl`, `MIN_STACK_BYTES`, the frozen `DEFAULT_SANDBOX_LIMITS` and `SANDBOX_POOL_DEFAULTS`, and `SandboxError`, with these values.

#### Scenario: Helper vectors, defaults and the error class
- **WHEN** `seedOf` gets `""`, `"a"`, `"r_1:normalize:1"` and `"😀"`; `memoryBucket` gets 1, 16777216, 16777217, 33554432 and 0.5; `clampStack` gets `(262144, 262144)`, `(1, 262144)`, `(536870912, 262144)`, `(100000.9, 262144)` and `(262144, 65536)`; `poolSize` gets 1, 2, 3, 16, 0, NaN and 2.5; `workerEntryUrl` gets `"file:///app/src/sandbox/pool.ts"` and `"file:///app/dist/sandbox/pool.js"`; and `new SandboxError("SANDBOX_INVALID", "m", { option: "size" })` and `new SandboxError("SANDBOX_CLOSED", "m")` are built
- **THEN** `seedOf` gives 2166136261, 3826002220, 2599622025 and 3409036472; `memoryBucket` gives 16777216, 16777216, 33554432, 33554432 and 16777216; `clampStack` gives 262144, 32768, 262144, 100000 and 65536; `poolSize` gives 1, 1, 2, 2, 1, 1 and 1; the hrefs are `file:///app/src/sandbox/worker-entry.ts` and `file:///app/dist/sandbox/worker-entry.js`; `MIN_STACK_BYTES` is 32768; `DEFAULT_SANDBOX_LIMITS` and `SANDBOX_POOL_DEFAULTS` are frozen and equal `{ timeoutMs: 1000, memoryBytes: 33554432, maxStackBytes: 262144, maxOutputBytes: 1048576 }` and `{ size: 2, graceMs: 250, stackSizeMb: 4, stackCapBytes: 262144, maxOldGenerationSizeMb: 512 }`; the first error is an `Error` named `SandboxError`, with `code` `SANDBOX_INVALID`, `message` `m`, `details` `{ option: "size" }`; the second has `details` `{}`

### Requirement: The sandbox imports no host I/O
`checkSandboxIo` SHALL report `ARCH_SANDBOX_IO` for each import in a non-test file under `src/sandbox/` other than a relative path inside it, `../core/index.ts`, `../config/index.ts`, `node:worker_threads`, `worker_threads`, `quickjs-emscripten-core` or `@jitl/quickjs-wasmfile-release-sync`, and for each use of the identifier `process`.

#### Scenario: Allowed, refused and ignored files
- **WHEN** `checkSandboxIo` runs on `snapshotOf(ARCH_FILES)`
- **THEN** nine violations, all `ARCH_SANDBOX_IO`, in order `src/sandbox/b.ts` lines 1-5, `c.ts` lines 1 and 2, `g.ts` lines 1 and 2; import messages are `<specifier> is not allowed in src/sandbox; the sandbox uses no host I/O` (specifier as written; `a computed import specifier` for `b.ts` line 5), and both `c.ts` messages are `process is not allowed in src/sandbox`; `checkSandboxIo(snapshotOf({}))` and `checkSandboxIo(readSnapshot())` are `[]`

### Requirement: A run refuses invalid arguments as input_invalid faults
On an open sandbox `run` SHALL, before using a worker, return an `input_invalid` fault (never a rejection) for a non-string `code`, a `limits` or `options` that is not a non-null object or cannot be read (each is read once into a plain copy; a throwing getter or `Proxy` trap names `limits` or `options`), a limit that is not a finite number above 0, a `timeoutMs` above 3600000, `memoryBytes` above 1073741824 or `maxOutputBytes` above 67108864, a `seed` that is not 1 to 1024 characters, a `nowIso` that is not an ISO 8601 instant with `Z` or an offset, an unknown `binding` or `result`, or an input that is not strict JSON or exceeds 8000000 JSON characters; the `message` names the argument, and with several invalid arguments the first in the order `code`, `limits`, `options`, `seed`, `nowIso`, `binding`, `result`, `input`. A value is strict JSON iff, recursively, it is `null`, a boolean, a finite number or a string primitive; an `Array.isArray` value with prototype `Array.prototype` whose own keys are exactly its indices and `length`, each index an enumerable data property; or an object with prototype `Object.prototype` or `null`, string keys only and every own property an enumerable data property. Nesting over 65 levels and a cycle are refused. Everything else is refused (X01-X26 of `INVALID_INPUTS`). A `Proxy` is judged by what its traps report, and a throwing trap is refused.

#### Scenario: Each invalid argument is refused with no worker started
- **WHEN** a pool with a recording `workerFactory` runs `NORMALIZE` once per row of `BAD_ARGS` (one changed argument each, a whole `limits` or `options` too) and once per refused row X01-X26 of `INVALID_INPUTS` and per call of `MULTI_BAD`
- **THEN** every call resolves `ok: false` with `fault.code` `input_invalid`, `stats.memBytes` -1 and a `fault.message` containing the argument name of its `BAD_ARGS` row (`input` for X01-X26); the factory was called 0 times; each `MULTI_BAD` message starts with its row's name and holds none of the others

### Requirement: A body runs in a fresh context and every failure is a typed fault
`run` SHALL run the body as `(async function (<binding>) {\n"use strict";\n<code>\n})` in a fresh QuickJS runtime and context on a deep JSON copy of the input, and return the returned object as `value` (`null` for `undefined` or `null` under `object_or_null`) or one fault of `SandboxFaultCode` chosen by the first matching row of `design.md` § Failure classification, without retrying. An abort while disposing a run that already has its result keeps that result and drops the module; E20 (`escape-data.md`) is the concrete case: it keeps `never_settled` (at its 16 MiB, on the probe) and the next run is `ok`.

#### Scenario: Bindings, result modes and accepted boundaries
- **WHEN** a pool runs `NORMALIZE` on `{ amount: 1234.567, currency: "eur" }` with `OPT`; `CTX_BODY` with binding `"ctx"` on `{ amount: 5 }`; `return undefined;`, `return null;` and `return;` under `object_or_null`; `return [1];`, `return 5;` and `return "s";` under both modes; `return null;`, `return undefined;` and `return {};` under `object`; `return { v: await new Promise((r) => r(7)) };`; `NUL_BODY` on `{ s: "a\u0000b" }`; and `return { n: arguments[0].length };` on `DEEP(65)` and on a string of 7999998 characters (`memoryBytes` 67108864), with seeds of 1 and 1024 characters and `nowIso` `"2026-10-24T14:00:00+02:00"`; and `ECHO` on rows A1-A5 of `INVALID_INPUTS`
- **THEN** the first value equals `{ amount: 1234.57, currency: "EUR", is_large: true }` with prototype `Object.prototype`, with a finite `stats.ms` >= 0 and an integer `stats.memBytes` >= 0; the `ctx` value is `{ amount: 5, inputType: "undefined" }`; the three `object_or_null` bodies give `ok: true`, `value` `null`; `[1]`, `5`, `"s"`, and `null` and `undefined` under `object`, give `output_invalid`; `{}` gives `{}`; the async body gives `{ v: 7 }`; `NUL_BODY` gives `{ len: 3, nul: 0, out: "a\u0000b" }`; the boundary runs are `ok: true`; each `ECHO` gives `ok: true` and its row's value

#### Scenario: Faults of the body and no retry
- **WHEN** a pool whose workers are counting `Worker` subclasses runs, one after another, each body of `FAULT_BODIES`
- **THEN** each result has the code of its row and a message that matches its pattern; no message contains `/Users`, `node_modules` or `file://`, each has at most 2202 characters; the counter equals the number of runs

### Requirement: The pool spawns workers lazily, one job each, and refuses bad options
`createWorkerSandbox` SHALL spawn no worker before the first run, then at most `size`, each with `{ env: {}, resourceLimits: { stackSizeMb, maxOldGenerationSizeMb } }` at `workerEntryUrl(import.meta.url)`, run one job per worker, serve queued runs first in, first out, and throw `SandboxError("SANDBOX_INVALID", …, { option })` for an `opts` that is neither `undefined` nor a plain object (`option` `opts`), an own key outside `WorkerSandboxOptions` (`option` that key), a getter or Proxy trap that throws (`option` `opts`) or a member out of range; `opts` is read once into a plain copy.

#### Scenario: Spawn record, concurrency and options
- **WHEN** a pool with a recording `workerFactory` runs `NORMALIZE` five times in sequence; a pool of `size` 2 gets 12 concurrent runs of `NORMALIZE`; a pool of `size` 1 gets `BUSY` then five runs of `return { i: <n> };` (n = 1 to 5) together; and pools are created with `{ size: 3, stackSizeMb: 8, maxOldGenerationSizeMb: 256 }`, each of `BAD_OPTIONS`, `{ size: 0, graceMs: -1 }` and each of `GOOD_OPTIONS`
- **THEN** the first factory log is empty before the first run, then holds 1 call, with `url.href` equal to `new URL("./worker-entry.ts", import.meta.url).href` (in a test beside `pool.ts`) and `options` deep-equal `{ env: {}, resourceLimits: { stackSizeMb: 4, maxOldGenerationSizeMb: 512 } }`, with `size` 2 and `respawns` 0; the 12 results are `ok` with one distinct `value` JSON and the second log has 2 calls; the six runs finish in the order `BUSY`, 1, 2, 3, 4, 5; the `size` 3 pool spawns with `resourceLimits` `{ stackSizeMb: 8, maxOldGenerationSizeMb: 256 }`; each `BAD_OPTIONS` row throws synchronously a `SandboxError` of `code` `SANDBOX_INVALID`, `details` `{ option: "<name>" }` and `message` `<name> must be an integer from <min> to <max>` (`workerFactory must be a function`; the `opts`, unknown-key and unreadable rows: the messages listed there); `{ size: 0, graceMs: -1 }` reports `size`; each of `GOOD_OPTIONS` is accepted

### Requirement: Runs are deterministic
A run SHALL give the same `value` for the same arguments in any process, timezone or pool: `Date.now()`, `new Date()` and `Date()` are frozen at `nowIso`, `Math.random` is seeded with `seedOf(seed)`, local-time `Date` functions are UTC (`getTimezoneOffset()` is 0, `getHours`, `getMinutes`, `getDate`, `getMonth`, `getFullYear` and `getDay` equal their `getUTC` forms, `toLocaleString()` is the UTC date, a space, the UTC time) and `Date()` equals `new Date().toString()`.

#### Scenario: Same arguments, same output
- **WHEN** a pool runs `CLOCK_RANDOM` 1000 times with seed `"base"` and `nowIso` `"2026-10-24T12:00:00.000Z"`, then with seeds `"s0"` to `"s999"`, then with seed `"base"` and 50 `nowIso` values a second apart; `CLOCK_BODY` with `nowIso` `"2026-10-24T12:00:00.000Z"` and `"2026-10-24T14:00:00+02:00"`; `RANDOM_BODY` with seed `"12345"` against a host mulberry32 on `seedOf("12345")`; `LOCAL_BODY` with `nowIso` `"2026-12-31T23:30:15.250Z"` (the children's too); and three child processes with `TZ` `UTC`, `America/Los_Angeles` and `Asia/Tokyo` run `CLOCK_RANDOM` 100 times (seeds `"s0"` to `"s99"`), `TZ_BODY` and `LOCAL_BODY`
- **THEN** the 1000 equal runs give one distinct SHA-256 of their value JSON; the 1000 seeds give 1000 distinct digests, none the digest of `"base"`, and the 50 clocks 50; `CLOCK_BODY` gives its expected object (`test-plan.md`) for both `nowIso` values; the first 10 `Math.random` values equal the host reference; `LOCAL_BODY` gives `LOCAL_JSON`; each child prints `<digest> <TZ_BODY JSON> <LOCAL_JSON>`, the three lines are equal, and the JSONs are the expected ones of `test-plan.md`

### Requirement: A run past its deadline is a timeout, and a stuck worker is killed
`run` SHALL return `timeout` for a run interrupted at `timeoutMs` or ending after it, and the pool SHALL terminate and replace a worker silent `timeoutMs + graceMs` after the job was posted, returning `timeout` and counting one respawn.

#### Scenario: Interrupt, late finish and watchdog
- **WHEN** a pool of `size` 1, warmed with one `NORMALIZE`, runs `LOOP` at `timeoutMs` 200, then `NORMALIZE`; one with a recording factory runs `BIG` at `timeoutMs` 50, then `NORMALIZE`; one with `graceMs` 8000 runs `LATE` at 50; one with `graceMs` 1000 runs `BIG` at 50
- **THEN** `LOOP` gives `timeout` (message `execution exceeded timeoutMs`) after 200 to 2450 ms with `respawns` 0, then `NORMALIZE` answers; `BIG` gives `timeout` after 50 to 2300 ms with `respawns` 1, `stats.memBytes` -1, a message matching `/^worker watchdog killed the sandbox after \d+ ms \(limit 50 \+ grace 250\)$/` and two factory calls, then `NORMALIZE` answers on the replacement; `LATE` gives `timeout` with message `execution exceeded timeoutMs` after 50 to 10050 ms with `respawns` 0; the last gives the watchdog message with `grace 1000` after 50 to 3050 ms and `respawns` 1

### Requirement: Guest memory is capped per memory bucket
A run SHALL return `memory_limit` when the guest exhausts the Wasm memory of its bucket (one instance per worker and `memoryBucket(memoryBytes)`, maximum 16 MiB plus the bucket), and the next run SHALL work.

#### Scenario: Bombs are contained and buckets are isolated
- **WHEN** a pool, warmed with one `NORMALIZE`, runs each of the three `BOMBS` three times at the default limits with `timeoutMs` 5000; then `ALLOC` at `memoryBytes` 16777216, 268435456 and 16777216; then `NORMALIZE`
- **THEN** the nine bombs give `memory_limit`, each in under 2000 ms with `stats.memBytes` -1, and the process RSS has grown by at most 268435456 bytes since the warm-up; `ALLOC` gives `memory_limit`, then `ok: true` with `{ n: 30 }`, then `memory_limit`; `NORMALIZE` gives `ok: true`, `respawns` 0

### Requirement: Stack depth, output size and nesting are capped
A run SHALL clamp the guest stack to `clampStack(maxStackBytes, stackCapBytes)` and answer a recursion with `stack_overflow`, SHALL refuse an output over `maxOutputBytes` UTF-8 bytes as `output_too_large`, and SHALL refuse a non-JSON output, an output nested over 65 levels, a `__proto__` key or a `toJSON` member as `output_invalid`.

#### Scenario: Recursion, clamp, byte limits and walker
- **WHEN** a pool runs each body of `STACK_BODIES` at `maxStackBytes` 262144 and 536870912; `RECURSE` at `maxStackBytes` 262144, 65536, 1, 32768 and 536870912, and at 262144 on a pool with `stackCapBytes` 65536; `EURO` at `maxOutputBytes` 98 and 97, `ASCII` at 108 and 107, and `NEST(65)` and `NEST(66)`
- **THEN** no `STACK_BODIES` result is `sandbox_crash` (each is `stack_overflow`, `runtime_error` or `memory_limit`), `respawns` stays 0 and `NORMALIZE` then answers; with `d(n)` the depth `RECURSE` reports, `d(65536)` is below `d(262144)`, `d(1)` equals `d(32768)`, `d(536870912)` equals `d(262144)`, and the capped pool's depth equals `d(65536)`; `EURO` and `ASCII` give `ok` at 98 and 108, `output_too_large` at 97 and 107; `NEST(65)` is `ok`, `NEST(66)` `output_invalid`

### Requirement: A failed worker is replaced and the run reports sandbox_crash
The pool SHALL return `sandbox_crash` for a run whose worker exits or cannot start, replace a worker that exits during a job at once and one that exits idle at the next run, and count each replacement in `respawns`. A Wasm load failure makes the worker exit before it answers, so the pool reports `sandbox_crash`, as for the exiting worker below.

#### Scenario: Exit during a job, idle exit and a factory that throws
- **WHEN** a `size` 1 pool whose `workerFactory` returns the worker of `test/support/sandbox-exit-worker.ts` first (it exits before answering, as a failed Wasm load does), then real workers, runs `NORMALIZE` twice; the second worker is terminated while idle (the test awaits its `exit` event) and `NORMALIZE` runs again; and a pool whose first factory call throws `Error("no worker")` runs it twice
- **THEN** the first run gives `sandbox_crash` (message `worker thread exited unexpectedly`), `stats.memBytes` -1 and `respawns` 1, the second `ok: true`; after the idle exit `respawns` is still 1 and the factory has 2 calls, then the next run gives `ok: true`, `respawns` 2 and 3 calls; the throwing pool's first run gives `sandbox_crash` (message `worker thread could not be started`), its second `ok: true`

### Requirement: A closed sandbox rejects pending and later runs
`close` SHALL clear every watchdog, terminate every worker, reject every queued and in-flight run with `SandboxError("SANDBOX_CLOSED")` and resolve; later `close` calls resolve, `run` rejects the same way, and idle workers SHALL NOT keep the process alive.

#### Scenario: Close mid-run, after close and process lifetime
- **WHEN** a `size` 2 pool is warmed with `NORMALIZE`, three runs are issued (`LOOP` at `timeoutMs` 5000 twice, then `NORMALIZE`, queued) and `close()` is called at once, each raced against 5000 ms; then `close()` is called twice together and `run` with `NORMALIZE` and with an invalid argument; and two child processes that never call `close` run `NORMALIZE` and `LOOP` at `timeoutMs` 200 (not awaited, printing the fault code)
- **THEN** the three runs reject with `SandboxError` `code` `SANDBOX_CLOSED` and `close()` resolves, before the timer; both later `close()` calls resolve; both later `run` calls reject with `SANDBOX_CLOSED`; the child processes exit with status 0 within 20000 ms, printing the normalize value and `timeout`

### Requirement: The escape suite is shared data and the guest stays contained
`test/support/sandbox-escape.ts` SHALL export `ESCAPE_CASES` (the 42 ids of `escape-data.md`) and `checkEscapeCase`; every case SHALL pass on a real pool in both modes, the host unchanged.

#### Scenario: Case data and verdicts
- **WHEN** `ESCAPE_CASES` is read and `checkEscapeCase` is called once per call listed in `VERDICTS` (12 calls over `E02`, `E18`, `E20`, `E54` and a synthetic case `X1`)
- **THEN** the ids equal `ESCAPE_IDS` in order, each `title` is non-empty; `E02`, `E17`, `E18`, `E20`, `E27`, `E54` and `E59` match `escape-data.md` in `source`, `input`, `limits` and `expect`, only `E54` has `hookExpect` (`{ ok: true, value: null }`), and each call returns the text (or `null`) of its `VERDICTS` row

#### Scenario: Every case on a real pool, variants and the host
- **WHEN** one pool of `size` 2 runs every `ESCAPE_CASES` entry with `{ ...DEFAULT_SANDBOX_LIMITS, ...c.limits }` and `ESCAPE_OPTIONS`, in `"node"` mode (binding `"input"`, result `"object"`) and in `"hook"` mode (binding `"ctx"`, result `"object_or_null"`); then runs `VARIANTS`, `FRESH` and `NORMALIZE`; `Object.prototype` is read before and after
- **THEN** in each mode the swept ids equal `ESCAPE_IDS` in order and `checkEscapeCase` returns `null` for each; each `VARIANTS` body gives a code in its set; `FRESH` run B sees none of run A's state; the caller's `E16` input is unchanged; `NORMALIZE` gives `{ amount: 1234.57, currency: "EUR", is_large: true }`; `Object.getOwnPropertyNames(Object.prototype)` is unchanged and `({}).polluted` is `undefined`
