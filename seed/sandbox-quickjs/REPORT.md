# M7 report: QuickJS-in-Wasm `code` node sandbox and cold starts

Date: 2026-10-24. Library: `quickjs-emscripten` 0.32.0 (pinned; `@jitl/*` variants 0.32.0 via the lockfile). Node v26.8.1 (V8 14.6). Everything below is real command output from `results/` unless marked *inferred* or *guessed*.

## 1. Verdict (read this first)

**D4 inputs, against the pre-registered rule (design.md §9 D4):**

| D4 condition | Result | Evidence |
|---|---|---|
| Escape suite fully blocked | **Met for this suite, only after three mitigations the stock library did not give us.** 59/59 cases behave as expected. No case reached the host: no `process`/`require`/`import`, no host function, no real clock, no network outside the allowlist, no cross-run leakage. | §3 |
| Determinism over 1,000 runs | **Met.** 1,000 runs of RF-1 `normalize`: 1 distinct output. 1,000 runs of a `Date.now()` + `Math.random()` body: 1 distinct output for one seed; 1,000 distinct outputs for 1,000 seeds; also identical across 3 host timezones in separate processes. | §4 |
| p50 per-execution overhead for a fresh context < 10 ms | **Met by ~10x.** Full `runCode()` (fresh runtime + context + prelude + normalize + validation + stats): p50 **0.92 ms**, p95 1.22 ms. Bare runtime + context: 0.10 ms. | §5 |

By the letter of §9 the rule says **adopt QuickJS-in-Wasm as the default `code` runtime**. Three things about that verdict matter more than the headline:

1. **The three mitigations are mandatory, not optional.** With the stock library the "memory bomb", "deep recursion" and "infinite/long computation" cases are not contained to the configured limits (§2). A user of the raw library who sets `memoryBytes` / `maxStackBytes` / `timeoutMs` gets much weaker guarantees than the names suggest. If the format spec promises the limits, the runtime must be the hardened `runCode` / `WorkerSandbox` in this directory (or an equivalent), not the library defaults.
2. **Production should use `WorkerSandbox`, not in-process `runCode`.** In-process, a single native call (a BigInt multiply took 1.0-1.5 s with a 32 MiB heap and a 5-50 ms timeout) ignores the interrupt, and execution blocks the Node event loop. Worker mode bounds the native-call case to `timeoutMs + 250 ms` and costs nothing measurable on warm runs (0.98 ms p50). It costs ~48 ms once per worker.
3. **The suite was written by the same author who wrote the defences.** It found real holes in the stock library (which is the point), but 59 passing cases are not proof of absence of escapes. The orchestrator's independent review step should attack the sandbox with cases I did not think of. Residual risks are in §8.

Not claimed: that Wasm-isolated QuickJS is secure against a QuickJS or emscripten memory-safety bug (the Wasm linear memory bounds the blast radius to the module's own memory and the imports it is given, *inferred* from the Wasm design, not tested here).

## 2. Findings that changed the design (each verified by command output)

| # | Finding | Evidence | What the code does about it |
|---|---|---|---|
| F1 | **`JS_SetMemoryLimit` does not limit bytes in the stock Emscripten build.** With `setMemoryLimit(16 MiB)` a guest grew its live heap to 1,476 MiB and RSS by 1.5 GiB in 1.3 s before the Wasm heap's own 2 GiB cap failed a `malloc`. A 1 KB-strings pattern reached 1,032 MiB in 2.1 s. *Inferred cause:* QuickJS's `malloc_usable_size` is stubbed to 0 under Emscripten, so each allocation counts a fixed few bytes. | `results/memory-limit-probe.json` (`npm run memory-probe`) | Each memory bucket (16 MiB steps) gets its own module instance with `WebAssembly.Memory({initial: 256 pages, maximum: 256 + bucket/64KiB pages})`. The same bomb now dies in 16-65 ms with +18-26 MiB RSS. Tests E28, E58, E59. Costs nothing measurable (module load 3.96 ms vs 3.77 ms stock). |
| F2 | **The Wasm code runs on V8's ~984 KB native stack, while QuickJS counts its own limit on a different (shadow) stack.** Deep native recursion (`JSON.stringify` of 200k-deep nesting, `JSON.parse`, `flat`, `String(nested)`, getter chains, `new F()` recursion) exhausts V8's stack at a guest limit of 96-256 KiB and surfaces as a host-side `RangeError` through the Wasm frames. The process survives, but the Wasm instance is unsafe afterwards. At 512 KiB all 12 recursion shapes crash. | `results/stack-matrix.json` (`node bench/stack-matrix.ts`) | In-process cap 64 KiB (no crash in 12 shapes at 32 and 64 KiB; a 64 KiB stack allows 368 nested calls, measured). `WorkerSandbox` (4 MB thread stack) allows 256 KiB (about 1,485 nested calls, no crash in 12 shapes). Any host-visible fault is caught, reported as `sandbox_crash`, and the module instance is discarded. Tests E24-E27. |
| F3 | **Several native built-ins ignore the interrupt handler**: BigInt arithmetic, a large `String.replace`, `indexOf` on a huge string, `Array.reverse`. With a 5 ms timeout and a 32 MiB heap, wall times over 5 runs each were 1,013-1,233 ms (BigInt multiply), 343-384 ms (regex `replace` over 15M chars), 78-132 ms (`indexOf`), 62-69 ms (`split`), 65-75 ms (`reverse`), 10-19 ms (`fill`). Regex backtracking, loops, getters, `sort` and microtask loops *are* interrupted (E18-E23). | `results/native-ops.json` (`node bench/native-ops.ts`); `results/worker-mode.json` (`nativeOpOvershoot`: 50 ms timeout, in-process 1,272 ms, worker 300 ms) | A run that finishes after its deadline is reported as `timeout`. `WorkerSandbox` kills the thread at `timeoutMs + graceMs` and respawns it (test: 5 pool tests). |
| F4 | **The stock context leaks the host timezone** (`getTimezoneOffset()` = -120 on this host, `toString()` = `GMT+0200`, `new Date(y,m,d)` is local). Under `TZ=America/Los_Angeles` it reports 480. | `results/stock-probe.json` | Local-time API aliased to UTC; legacy date strings give `Invalid Date`. E52 and the determinism test show identical output under 4 and 3 different host timezones. |
| F5 | `SharedArrayBuffer`, `WeakRef`, `FinalizationRegistry` exist in the stock context (`Atomics`, `WebAssembly`, `Intl`, `console`, `process`, `fetch`, timers do not). | `results/stock-probe.json` | The three are deleted. E48. |
| F6 | **`ctx.dump()` calls the guest's `JSON.stringify`**, so a polluted `Object.prototype.toJSON` rewrites error messages that the host reads. | E53 (first version of the test failed with `runtime_error: undefined: undefined`) | Errors are described through `getProp`, and the in-guest error envelope is built from primitives only. |
| F7 | An allocation failure inside a promise job is swallowed by the engine: the flood stops, the heap is freed, and the promise never settles. The thrown value for an allocation failure with no room for an exception object is `null`. | E20, E58 (first version failed with `runtime_error: Error: null`) | `never_settled` message says it may be an OOM; a thrown `null` at the memory ceiling is classified `memory_limit` (heuristic: Wasm memory at its maximum, *inferred*; a user `throw null` after a bomb in the same bucket can be mislabelled, never mis-executed). |
| F8 | After an unbounded promise flood, `rt.dispose()` hit an Emscripten abort (`Assertion failed: list_empty(&rt->gc_obj_list)`). The test run printed one `Aborted(...)` line. | `results/escape-diagnostics.json`: `moduleResetsDuringSuite: 1`; `results/test-output.txt` | The instance is abandoned and replaced; the run's own result is still returned; later cases pass. Cost: one module reload (about 1-4 ms) and the old instance's memory until GC. |
| F9 | At the memory ceiling, even bookkeeping calls (`computeMemoryUsage`) trap with `memory access out of bounds`. | `results/memory-limit-probe.json` rows 4 and 6 | No memory sample is taken after a `memory_limit` result; a trap anywhere marks the instance poisoned. |

## 3. Escape and abuse suite (59 cases, `test/escape.test.ts`, output in `results/escape-suite.json`)

Run: `npm test` (70 tests in total: 59 cases here, 6 determinism, 5 worker) gave 70 pass, 0 fail (`results/test-output.txt`). "Actual" is the program's own output, truncated at 220 characters.

Coverage map for the cases the brief asked for: `process`/`require`/`import()`/`globalThis` leaks E01-E07, E11-E12; `Function`/`constructor` chains E08-E10; prototype pollution via input E14 and across runs E15; infinite loop E18-E19; microtask flood E20; deep recursion E24-E27; memory bomb E28-E30, E58-E59; huge output E31-E32; catastrophic regex E22-E23; `fetch` to a non-allowlisted host E34-E35; redirect to a non-allowlisted host E36 (and same-origin E37); `file:` and other schemes E38; `eval`/`new Function` E46-E47; `Atomics`/`SharedArrayBuffer`/`WebAssembly` E48; `Date` timing E49-E50; fresh context per run E15.

| ID | Case | Expected | Actual (from the run) | Pass |
|---|---|---|---|---|
| E01 | typeof process/require/module/Buffer/global/window/self/setTimeout/setInterval/setImmediate/queueMicrotask/console/structuredClone/TextEncoder/URL/performance/navigator | every name is "undefined" | ok {"process":"undefined","require":"undefined","module":"undefined","exports":"undefined","Buffer":"undefined","global":"undefined","window":"undefined","self":"undefined","setTimeout":"undefined","setInterval":"undefin | PASS |
| E02 | process.env.HOME | runtime_error ReferenceError: process is not defined | error runtime_error: ReferenceError: 'process' is not defined | PASS |
| E03 | require('fs') | runtime_error ReferenceError: require is not defined | error runtime_error: ReferenceError: 'require' is not defined | PASS |
| E04 | await import('fs') (dynamic import) | runtime_error (no module loader: could not load module) | error runtime_error: ReferenceError: could not load module 'fs' | PASS |
| E05 | import fs from 'fs' (static import in body) | syntax_error | error syntax_error: SyntaxError: expecting '(' | PASS |
| E06 | import.meta / new.target at top of body | syntax_error | error syntax_error: SyntaxError: import.meta only valid in module code | PASS |
| E07 | Object.getOwnPropertyNames(globalThis) equals the ES-builtin snapshot | exactly the 58 ES builtins listed in README (no host names) | 58 globals; extra=[] missing=[] | PASS |
| E08 | (function(){}).constructor('return typeof process')() and Function('return globalThis')() | ok: reaches only the sandbox global; process undefined | ok {"a":"undefined","b":"undefined","c":true,"d":"undefined"} | PASS |
| E09 | ({}).constructor.constructor('return process')() chain | runtime_error ReferenceError: process is not defined | error runtime_error: ReferenceError: 'process' is not defined | PASS |
| E10 | AsyncFunction / GeneratorFunction constructors to reach host | ok: still sandbox global only | ok {"a":"undefined","g":"string"} | PASS |
| E11 | Crawl every object reachable from globalThis (props, prototypes, constructors) for host-looking names | no property named process/require/__hf/hostFetch/Buffer/fs/child_process; crawl size reported | ok {"hits":[],"crawled":517} | PASS |
| E12 | E11 crawl again with fetch enabled (the bridge function must not be reachable) | no __hf/hostFetch reachable | ok {"hits":[],"crawled":520,"hasFetch":"function"} | PASS |
| E13 | top-level `this` and `arguments.callee`, `with` in strict wrapper | `this` is undefined; `with` is a syntax_error | ok {"t":"undefined"} \| error syntax_error: SyntaxError: invalid keyword: with | PASS |
| E14 | prototype pollution via input (naive deep merge of {"__proto__":{"polluted":true}}), then check host Object.prototype | guest sees pollution only inside its own context; host Object.prototype untouched | ok {"guestSees":"yes","hadOwnProto":true} hostClean=true | PASS |
| E15 | fresh context per run: globals, prototype edits and Math.random override in run A are invisible to run B | run B sees none of run A's state and the original seeded random sequence | A: ok {"ok":1} \| B: ok {"secret":"undefined","o":null,"ar":null,"s":null,"d":null,"rnd":0.6270739405881613} | PASS |
| E16 | input is a JSON copy: guest mutation of input does not touch the host object; host mutation after the call is irrelevant | caller-side object unchanged; guest saw a deep copy | ok {"len":1} host input after: {"n":{"deep":[1,2,3]},"s":"x"} | PASS |
| E17 | host input that cannot be JSON-copied faithfully: function, undefined, BigInt, Date, cycle, getter, NaN | input_invalid for each | input_invalid,input_invalid,input_invalid,input_invalid,input_invalid,input_invalid,input_invalid,input_invalid | PASS |
| E18 | infinite loop for(;;){} | timeout within ~timeoutMs+250ms | error timeout: execution exceeded timeoutMs wall=401ms (limit 400) | PASS |
| E19 | infinite loop wrapped in try/catch inside while(true) | timeout (interrupt is uncatchable) | error timeout: execution exceeded timeoutMs | PASS |
| E20 | infinite microtask chain (Promise.then re-queues itself) + await never-resolving promise | ends in timeout, memory_limit or never_settled (promise chain grows until the heap cap); bounded wall time | error never_settled: the code body returned a promise that can never settle (deadlock, or an out-of-memory failure swallowed inside a promise job) (host timers fired during run: 0; 0 is expected: the pump is synchronous) | PASS |
| E21 | infinite loop inside a then-callback and in a getter | timeout | error timeout: execution exceeded timeoutMs \| error timeout: execution exceeded timeoutMs | PASS |
| E22 | catastrophic regex /(a+)+$/ on 40 a's + "!" | timeout (regex engine honours the interrupt handler) | error timeout: execution exceeded timeoutMs wall=401ms | PASS |
| E23 | second ReDoS shape: /^(([a-z])+.)+[A-Z]([a-z])+$/ and String.replace with nested quantifier | timeout | error timeout: execution exceeded timeoutMs \| error timeout: execution exceeded timeoutMs | PASS |
| E24 | deep recursion function f(){return f()+1} | stack_overflow (clean guest RangeError) | error stack_overflow: stack overflow | PASS |
| E25 | deep recursion caught by user code | ok: user can catch it, run stays contained | ok {"name":"InternalError","deepEnough":true} | PASS |
| E26 | native-recursion bombs at the max stack: JSON.parse nesting, JSON.stringify nesting, Array.flat, toString of nested arrays, Proxy chain, getter chain | never sandbox_crash; each fails as a guest error or succeeds | jsonParse=runtime_error jsonStringify=stack_overflow flat=stack_overflow toString=stack_overflow proxy=stack_overflow getter=stack_overflow apply=stack_overflow bind=memory_limit promiseChain=memory_limit sortCmp=stack_overflow \| next run: ok {"alive":1} | PASS |
| E27 | requested maxStackBytes of 512 MB is clamped; recursion still gives stack_overflow, not a Wasm/V8 crash | stack_overflow | error stack_overflow: stack overflow | PASS |
| E28 | memory bomb: push 100k-element arrays forever | memory_limit | error memory_limit: guest heap exceeded memoryBytes | PASS |
| E29 | memory bomb: string doubling s += s; new Array(2**32-1).fill(0); 2n**100000000n; new Uint8Array(2**31) | each ends in memory_limit or runtime_error (RangeError / string too long); never a host crash | runtime_error,memory_limit,runtime_error,runtime_error,runtime_error | PASS |
| E30 | guest catches OOM and keeps allocating | terminates (memory_limit or timeout), never ok | error timeout: execution exceeded timeoutMs | PASS |
| E31 | huge output: 2 MB string with maxOutputBytes=100000 | output_too_large | error output_too_large: output exceeds size limit | PASS |
| E32 | huge output built from many small keys / multi-byte characters (UTF-8 > UTF-16 length) | output_too_large | error output_too_large: output exceeds size limit \| error output_too_large: output is 120008 bytes, limit 100000 | PASS |
| E33 | fetch with no fetchAllowlist (default) | fetch is not defined: runtime_error ReferenceError | error runtime_error: ReferenceError: 'fetch' is not defined | PASS |
| E34 | fetch to a non-allowlisted host (https://example.com, http://169.254.169.254/latest/meta-data) | fetch_denied; zero network traffic | error fetch_denied: fetch denied: origin https://example.com is not allowlisted \| error fetch_denied: fetch denied: origin http://169.254.169.254 is not allowlisted \| stubHits=0 | PASS |
| E35 | allowlist is an exact-origin match: 127.0.0.1:18930, localhost:18931, https://localhost:18930, userinfo trick, subdomain trick | fetch_denied for all; stub never hit | fetch_denied,fetch_denied,fetch_denied,fetch_denied,fetch_denied,fetch_denied,fetch_denied,fetch_denied,fetch_denied,fetch_denied stubHits=0 | PASS |
| E36 | redirect to a non-allowlisted origin (302 -> http://127.0.0.1:18930/secret) | not followed: guest gets the 302 + location header; /secret is never requested | ok {"status":302,"loc":"http://127.0.0.1:18930/secret","redirected":false,"body":"moved"} stubHits={"/redirect-evil":1} | PASS |
| E37 | redirect to a path on the allowlisted origin (302 -> /secret) | also not followed (redirects are never followed) | ok {"status":302,"loc":"/secret"} stubHits={"/redirect-internal":1} | PASS |
| E38 | file:///etc/passwd, data:, ftp:, javascript:, blob:, ws:, gopher: URLs | fetch_denied (scheme not allowed) | fetch_denied,fetch_denied,fetch_denied,fetch_denied,fetch_denied,fetch_denied,fetch_denied | PASS |
| E39 | allowlisted GET and POST work and are recorded | ok; two FetchRecords with status 200 | ok {"hello":"world","echoed":"{\"q\":1}","ct":"application/json"} log=2 | PASS |
| E40 | forbidden headers (host, content-length), bad method, oversized response, too many requests | fetch_denied / fetch_failed | fetch_denied,fetch_denied,fetch_failed,fetch_failed | PASS |
| E41 | slow upstream (2 s) with timeoutMs=300 | timeout; in-flight request aborted | error timeout: execution exceeded timeoutMs wall=303ms | PASS |
| E42 | guest can catch the denial and keep going (denial is an exception, not a crash) | ok with caught:true; denied attempt visible in fetchLog | ok {"caught":true,"name":"FetchDeniedError"} log0={"name":"FetchDeniedError","message":"fetch denied: origin https://evil.example is not allowlisted"} | PASS |
| E43 | allowlist http://localhost:18902 (the brief's value) with an injected fetchImpl: 18902 passes policy, 18930 is denied | policy allows 18902 only; no real network used | ok {"from":"fake"} \| error fetch_denied: fetch denied: origin http://localhost:18930 is not allowlisted fakeSaw=http://localhost:18902/blocks/x@1 | PASS |
| E44 | replay mode: recorded responses are returned with the network unreachable | identical output, zero stub hits; mismatched call -> replay_mismatch | live=ok {"n":1,"t":1792842068949,"r":0.9851756155768335,"c":"1"} replay=ok {"n":1,"t":1792842068949,"r":0.9851756155768335,"c":"1"} live2(differs)=ok {"n":2,"t":1792842068953,"r":0.13574020813672505,"c":"2"} hitsAfterLive=1 totalAfterAll=2 mism=error replay_mismatch: replay mismatch at call #0: recorded GET http://localhost:18930/nondeterministic, got GET http://localhost:18930/ok exhausted=error replay_mismatch: replay exhausted at call #1 | PASS |
| E45 | 12 concurrent runs with fetch (shared Wasm module, interleaved awaits) | all ok and identical | {"n":3,"h":"world","r":0.6270739405881613} (distinct outputs: 1) | PASS |
| E46 | eval and new Function inside the sandbox | allowed but contained: arithmetic works, process unreachable | ok {"a":3,"b":"undefined","c":"undefined","d":"undefined"} | PASS |
| E47 | eval cannot name host bindings: eval("process") | runtime_error ReferenceError | error runtime_error: ReferenceError: 'process' is not defined | PASS |
| E48 | Atomics, SharedArrayBuffer, WebAssembly, WeakRef, FinalizationRegistry, Intl, SIMD | all absent (typeof undefined); new SharedArrayBuffer -> ReferenceError | ok {"Atomics":"undefined","SharedArrayBuffer":"undefined","WebAssembly":"undefined","WeakRef":"undefined","FinalizationRegistry":"undefined","Intl":"undefined","gc":"undefined","WebAssemblyInstance":"undefined"} \| error runtime_error: ReferenceError: 'SharedArrayBuffer' is not defined | PASS |
| E49 | timing attack via Date: busy loop delta, repeated Date.now(), new Date(), Date() string, performance | every reading equals nowIso; delta is exactly 0 | ok {"delta":0,"now":1792843200000,"ctor":1792843200000,"perf":"undefined","str":"Sat Oct 24 2026 12:00:00 GMT+0000 (UTC)","iso":"2026-10-24T12:00:00.000Z"} | PASS |
| E50 | try to un-freeze the clock: assign Date.now, redefine, subclass, Date.prototype.constructor, reach the real Date via prototype chains | real clock unreachable: every route still returns nowIso | ok {"tries":["assign:TypeError","define:TypeError"],"viaSub":1792843200000,"viaSubNew":1792843200000,"viaProto":1792843200000,"viaCtor":1792843200000,"viaF":1792843200000,"nowStill":1792843200000} | PASS |
| E51 | Math.random cannot be made nondeterministic: attempts to reassign, or reach another Math | sequence still equals the seeded PRNG / assignment throws | ok {"first":0.011704753153026104,"second":0.06195825757458806,"threw":"TypeError"} \| ok {"first":0.011704753153026104,"second":0.06195825757458806} | PASS |
| E52 | host timezone must not leak: new Date(y,m,d), getTimezoneOffset, toString, local getters, legacy date strings, in a process with TZ=America/Los_Angeles | UTC results regardless of the process TZ | 4 TZs -> 1 distinct output: {"off":0,"h":12,"s":"Wed Jan 01 2020 00:00:00 GMT+0000 (UTC)","p":1591012800000,"l":"NaN","d":1} | PASS |
| E53 | output carrying "__proto__" key via JSON.parse; Object.prototype.toJSON pollution | output_invalid; host prototype clean | error output_invalid: output is not JSON-serializable at $: key "__proto__" is not allowed \| error output_invalid: output is not JSON-serializable at $: toJSON present hostClean=true | PASS |
| E54 | non-serializable outputs: function, undefined member, BigInt, NaN, Infinity, Date, Map, Symbol, cycle, getter, sparse array, class instance, array/primitive/null/undefined top-level | output_invalid for each | output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid,output_invalid | PASS |
| E55 | thrown values: Error, string, object, null; error stack does not leak host paths | runtime_error; stack contains no /Users, node_modules or file:// | error runtime_error: Error: boom \| error runtime_error: Error: just a string \| error runtime_error: Error: <thrown object without a message> \| error runtime_error: null was thrown \| stack="    at <anonymous> (code-node.js:3:11)\n    at drive (prelude.js:175:19)\n" | PASS |
| E56 | user code overrides JSON.stringify / Promise.prototype.then / Symbol.iterator / Array.prototype.push before returning | host still receives validated JSON for the returned object (driver uses captured natives) | ok {"good":[1,2,3]} | PASS |
| E57 | sandbox_crash recovery: after the whole abuse sequence the engine still runs RF-1 normalize correctly | ok and correct | ok {"amount":1234.57,"currency":"EUR","is_large":true} | PASS |
| E58 | memory bombs with memoryBytes=32 MiB: 3 allocation patterns x 3 runs; RSS growth and wall time | memory_limit each time, < 300 ms each, total RSS growth < 200 MiB, module still healthy | memory_limit,memory_limit,memory_limit,memory_limit,memory_limit,memory_limit,memory_limit,memory_limit,memory_limit maxMs=90 rssGrowthMiB=44 next=ok {"alive":1} | PASS |
| E59 | memoryBytes buckets are isolated: a 16 MiB run cannot use the memory of a 256 MiB run, and a legit 100 MiB allocation works with memoryBytes=256 MiB | small bucket -> memory_limit, big bucket -> ok | small=error memory_limit: guest heap exceeded memoryBytes big=ok {"n":30} | PASS |

Notes on the table:
- E43 uses the brief's allowlist value `http://localhost:18902` with an injected fake fetch implementation, so no mock service is touched. All other fetch cases use the stub server on port 18930 (`test/stub-server.ts`), which is the only port this milestone binds. The allowlist is data, so the allowed origin in those cases is `http://localhost:18930`. **Deviation from the brief's wording:** in tests the allowlist is `http://localhost:18930`, not `:18902`, because the stub must not depend on M1's mock.
- E20 accepts three outcomes (`timeout`, `memory_limit`, `never_settled`) because the engine swallows allocation failures in promise jobs (F7). It is the case that triggers the one module reset (F8).
- E26 runs 10 native-recursion shapes at the 64 KiB cap. E27 asks for a 512 MB stack and checks the clamp.
- E36: the redirect target `http://127.0.0.1:18930/secret` is a different origin string from the allowlisted `http://localhost:18930`; the stub's hit counter shows `/secret` was never requested.

## 4. Determinism evidence (`test/determinism.test.ts`, `results/determinism.json`)

| Check | Result |
|---|---|
| RF-1 `normalize` body, read verbatim from `shared/flows/rf-1-invoice-intake.yaml`, input `{amount: 1234.567, currency: "eur"}`, 1,000 runs, same seed and now | **1 distinct output** (sha256 `8fa91a97...4482`): `{"amount":1234.57,"currency":"EUR","is_large":true}` |
| Body using `Date.now()`, `new Date()`, `String(new Date())`, 3 x `Math.random()`, an id, a random-comparator `sort`, date arithmetic and local getters; 1,000 runs, seed 42, fixed now | **1 distinct output** (sha256 `2b7d5440...8848`) |
| Same body, 1,000 different seeds (1000..1999) | **1,000 distinct outputs**, none equal to the seed-42 output |
| Same body, 50 string seeds; 50 different `nowIso` values | 50 distinct; 50 distinct |
| Guest PRNG vs an independent host-side mulberry32 (seed 12345) | first 10 values equal |
| 100 runs x 3 separate Node processes with `TZ=UTC`, `America/Los_Angeles`, `Asia/Tokyo` | the 3 digests are identical (`c1060349...64b1`) |
| Fetch replay: record one live run, replay 200 times | 1 distinct output, equal to the recorded live output; **0 requests reached the stub during replay**; two live runs against the stub differ (counter and server time change) |

Sample output of the clock/random body: `{"now":1792843200000,"iso":"2026-10-24T12:00:00.000Z","str":"Sat Oct 24 2026 12:00:00 GMT+0000 (UTC)","r":[0.6011037519201636,0.44829055899754167,0.8524657934904099],...}`.

What determinism does *not* cover (§8): `Math.sin`/`exp`/... are computed by libm inside the Wasm module, so they are probably host-independent (*inferred*, not tested across machines or architectures); a guest that depends on wall-clock-sensitive native behaviour (timeouts firing) is nondeterministic by construction.

## 5. Benchmarks

### Method and machine

- Machine: Apple M4 Max, 16 logical cores, 128 GiB RAM, macOS (Darwin 25.6.0, arm64), Node v26.8.1, quickjs-emscripten 0.32.0. 300 iterations per in-process benchmark (50 warm-up discarded), 200 per fresh-process benchmark, 20 for Docker. Three complete rounds (`results/bench-run1..3.json`), aggregated by `bench/summarize.ts`. The table shows the median of the three per-round medians, the range of the three medians, and the median of the three p95s.
- **A quiet window was not available.** Other Phase-0 milestones were running on the same host. Recorded context per round (`results/bench-summary.json`): load average 11.6-16.2 on 16 cores; the Docker Desktop VM process at roughly 60-190% of one core; 77-79 running containers using about 7.6-8.0 GiB; `sysmond` at ~100% CPU, an anti-virus daemon at 50-90%, and another `node` process at ~100%. The headline medians moved by at most ~15% between rounds (0.904-1.056 ms for `runCode`), which does not change any conclusion against the 10 ms threshold, but the absolute figures are for a busy machine.
- All in-process figures include garbage-collection pauses (no manual GC).
- Docker: `alpine:3.20` was pulled beforehand (pull time excluded), `docker run --rm --label us.m7=bench alpine:3.20 true` x 20 (+2 warm-up) per round; after each round `docker ps -a --filter label=us.m7=bench` listed no leftover containers. No other container was touched.

### Results

| Benchmark | n/run | median ms (3-run median) | median range across runs | p95 ms (3-run median) | what |
|---|---|---|---|---|---|
| `load_sync_fresh_process` | 200 | 3.958 | 3.588 – 3.981 | 4.473 | RELEASE_SYNC + 48 MiB-ceiling WebAssembly.Memory (shipped config) cold, fresh process |
| `import_sync_fresh_process` | 200 | 4.186 | 3.744 – 4.240 | 4.809 | dynamic import('quickjs-emscripten') in a fresh process (sync) |
| `load_stock_fresh_process` | 200 | 3.769 | 3.617 – 3.908 | 4.678 | RELEASE_SYNC unmodified cold, fresh process |
| `import_stock_fresh_process` | 200 | 4.114 | 3.909 – 4.331 | 5.077 | dynamic import('quickjs-emscripten') in a fresh process (stock) |
| `load_asyncify_fresh_process` | 200 | 4.367 | 4.294 – 5.510 | 6.340 | RELEASE_ASYNC (asyncify) cold, fresh process |
| `import_asyncify_fresh_process` | 200 | 3.823 | 3.699 – 4.853 | 5.284 | dynamic import('quickjs-emscripten') in a fresh process (async) |
| `load_sync_in_process_repeat` | 200 | 0.960 | 0.958 – 1.146 | 1.700 | newQuickJSWASMModule() repeated inside one process (compile may be cached by V8) |
| `qjs_runtime_context_empty` | 300 | 0.099 | 0.097 – 0.126 | 0.139 | newRuntime + newContext + eval("1") + dispose |
| `qjs_asyncify_runtime_context_empty` | 300 | 0.149 | 0.143 – 0.183 | 0.239 | same, asyncify variant |
| `runCode_normalize` | 300 | 0.919 | 0.904 – 1.056 | 1.222 | full runCode(): fresh runtime+context, prelude, normalize, validate, stats (incl. computeMemoryUsage) |
| `runCode_normalize_fetch_on` | 300 | 0.842 | 0.832 – 0.941 | 1.180 | same with fetchAllowlist set (fetch shim + host fn installed, unused) |
| `raw_new_rt_ctx_normalize_noprelude` | 300 | 0.113 | 0.106 – 0.119 | 0.138 | newRuntime+newContext+eval normalize function only (no determinism prelude), no limits |
| `raw_new_rt_ctx_normalize_prelude` | 300 | 0.616 | 0.612 – 0.686 | 0.834 | newRuntime+newContext+prelude+driver+normalize (no stats, no limits) |
| `reused_rt_fresh_ctx_normalize` | 300 | 0.621 | 0.596 – 0.680 | 0.810 | ONE runtime reused, newContext per execution (prelude+driver+normalize), dispose context |
| `reused_rt_fresh_ctx_empty` | 300 | 0.085 | 0.083 – 0.093 | 0.100 | ONE runtime reused, newContext + eval("1") |
| `computeMemoryUsage_only` | 300 | 0.024 | 0.024 – 0.026 | 0.028 | rt.computeMemoryUsage() + dump on a warm context |
| `raw_asyncify_new_rt_ctx_normalize` | 300 | 0.842 | 0.836 – 0.986 | 1.121 | asyncify variant: newRuntime+newContext+prelude+driver+normalize |
| `worker_cold_start_to_first_result` | 1 | 48.2 | 45.6 – 48.9 | 48.2 | new WorkerSandbox(1) + first run (thread spawn, TS strip, wasm load, one execution) |
| `worker_run_normalize` | 300 | 0.975 | 0.813 – 1.052 | 1.162 | WorkerSandbox.run(): postMessage round trip + full runCode in a warm worker |
| `node_vm_new_context_normalize` | 300 | 0.164 | 0.156 – 0.183 | 0.215 | vm.createContext + script.runInContext (precompiled Script), JSON input copy |
| `node_vm_new_context_compile` | 300 | 0.170 | 0.159 – 0.177 | 0.243 | vm.runInNewContext(source) incl. compile |
| `spawn_node_e_roundtrip` | 200 | 28.2 | 25.8 – 29.6 | 34.7 | execFile('node', ['-e', normalize]) spawn to stdout collected |
| `docker_run_alpine_true` | 20 | 183 | 169 – 189 | 220 | docker run --rm alpine:3.20 true (image pre-pulled; Docker Desktop VM, ~70 containers running) |
| `isolated_vm_new_isolate_normalize` | 300 | 0.641 | 0.595 – 0.646 | 0.786 | new ivm.Isolate({memoryLimit}) + createContext + run normalize + dispose |

Reading the table:
- **Module load, once per process:** ~4.0 ms (shipped config) plus ~4.2 ms to import the JS package; the asyncify module is ~0.4-1.5 ms slower to load. A new memory bucket costs another ~1 ms (in-process repeat: 0.96 ms, compile cached).
- **Per execution:** the fresh runtime + context itself is 0.10 ms. Almost all of the 0.92 ms in `runCode_normalize` is the guest prelude (Date/PRNG overrides and the validation code, `raw_new_rt_ctx_normalize_prelude` 0.62 ms vs `..._noprelude` 0.11 ms) plus validation, the stats sample (0.024 ms) and host bookkeeping. *Inferred opportunity:* a snapshot or a cheaper prelude could roughly halve it; not needed for D4.
- **Reusing one runtime with a fresh context per run** saves only ~0.01 ms in the empty case (0.085 vs 0.099 ms) and nothing in the full path (0.62 vs 0.62 ms), so it is not worth the weaker isolation (shared runtime-level state). `runCode` creates a fresh runtime every time.
- **Asyncify:** not needed. Measured price if it were: +50% on the empty runtime + context (0.149 vs 0.099 ms), +37% on the raw normalize path (0.84 vs 0.62 ms), +0.4 ms module load. The sync build with promise bridging gives the same `await fetch(...)` semantics.
- **Async fetch bridge cost** (`results/fetch-cost.json`, 300 runs): bare Node `fetch` to the stub 1.50 ms; `runCode` without fetch 0.68 ms; `runCode` with one `await fetch` 2.49 ms (so the bridge adds ~0.3 ms over the sum); replayed fetch 0.68 ms (no network).
- **`node:vm`** is faster (0.16 ms) but is not a security boundary: same isolate, same process, no memory limit. It is the insecure baseline asked for.
- **`isolated-vm` 7.0.1** (separate V8 isolate, native addon): 0.64 ms per isolate + context + run + dispose, close to `runCode`. See "isolated-vm" below.
- **Process and container:** `node -e` round trip 28 ms; `docker run --rm alpine:3.20 true` 183 ms median (p95 220 ms) on this busy Docker Desktop VM. QuickJS in-process is ~30x faster than a Node spawn and ~200x faster than a container run.
- **Worker thread:** 45-49 ms to create the first worker and run once (thread start, TS stripping of the worker entry, Wasm load, one run); 0.98 ms per warm run (the postMessage round trip adds about 0.06 ms over in-process, within the run-to-run noise).
- **Memory over time** (`rss_over_runs`, three rounds): RSS 202-204 MiB at start, 205 after 1,000 runs, 254-262 MiB after 10,000 runs, 329-337 after 20 memory-bomb runs (64 MiB bucket), and flat (329-337) after 2,000 more runs. No unbounded growth; the Wasm linear memory never shrinks, so RSS plateaus at the sum of the buckets' high-water marks.

### isolated-vm

`npm install isolated-vm@7.0.1` on Node 26.8.1 succeeded (`results/isolated-vm-install.log`, exit 0). **No native build was run:** npm 11.19 held back the package's `install` script ("1 package has install scripts not yet covered by allowScripts"), but the package ships prebuilt binaries including `prebuilds/darwin-arm64/isolated-vm.abi147.node` (ABI 147 = Node 26), and it loads and works: `1+1` returned 2 and `for(;;){}` with a 200 ms timeout threw `Script execution timed out.` (`results/isolated-vm-probe/probe.cjs`). So there was no failure output to record. Its engines field is `node >= 24`. Whether it would build from source on this host was therefore not tested.

### Not available / not run

Deno, gVisor and Firecracker are not available on this macOS host (`which deno runsc firecracker` found nothing) and were not installed. Their cold starts are not measured. (gVisor and Firecracker are Linux-only in any case.)

## 6. Gateway-only fetch design and cost

- Async host functions did **not** require the asyncify build. The host function returns a QuickJS promise created with `context.newPromise()`; the real `fetch` runs on the host; when it settles the host resolves the deferred and the driver loop calls `executePendingJobs`. All guest code stays on the cheap sync build.
- Policy (`src/fetchGateway.ts`): exact-origin allowlist, `http(s)` only, no URL credentials, method and header filters, request/response caps, `redirect: 'manual'` so a 3xx is returned to the guest and never followed, and an `AbortController` that cancels in-flight requests when the run ends or times out (E41).
- Record and replay: every call (including denied ones) is appended to `fetchLog` with request and response; passing it as `fetchReplay` makes the run network-free and byte-identical (determinism test: 200 replays, 0 network hits). A different call gives `replay_mismatch`.
- Concurrency: 12 concurrent runs with three parallel fetches each, sharing one Wasm module, all produced identical output (E45).

## 7. Deviations from the brief

1. **Allowlist origin in tests** is `http://localhost:18930` (the stub), not `:18902`; the `:18902` value is exercised with an injected fake `fetch` (E43), so M1's mocks are never contacted.
2. **`maxStackBytes` is clamped** (32-64 KiB in-process, up to 256 KiB in `WorkerSandbox`), so values above the cap are silently reduced. Reason: F2.
3. **`memoryBytes` is enforced through a per-bucket Wasm memory ceiling** (16 MiB base + the budget rounded up to 16 MiB), not through `JS_SetMemoryLimit` alone. Reason: F1. Consequence: concurrent runs in the same bucket share that ceiling.
4. **`stats.memBytes` is the live heap at the end of the run** (`memory_used_size`), not the peak, and is `-1` after a `memory_limit` result (F9). `stats.ms` includes teardown.
5. **Date strings:** non-ISO date strings parse to `Invalid Date` (README), a behaviour change from stock JS made for determinism.
6. **No quiet window** for the benchmarks (§5).
7. Tests run Node's built-in test runner on `.ts` files via Node 26's type stripping; TypeScript 7.0.2 is used only for `tsc --noEmit`. The brief's "TypeScript" is satisfied, there is no build step.
8. Two extra modules beyond the brief: `WorkerSandbox` (needed by F2/F3) and the benchmark/probe scripts.

## 8. Unresolved and residual risks

- **The suite is the author's own.** An independent adversarial pass is still needed (candidates I did not try: Proxy-based TOCTOU on the output walker, exotic `Symbol.species` / `Symbol.toPrimitive` hooks on host-visible values, QuickJS bytecode or parser bugs, very large `RegExp` compilation, `Array.prototype.sort` with a hostile comparator on huge arrays inside a native sort).
- **Native calls are not interruptible in-process** (F3). Until `WorkerSandbox` is used, a hostile BigInt or `String.replace` can hold the Node event loop for a time that grows with `memoryBytes` (1.0-1.5 s measured at 32 MiB).
- **Event loop:** in-process execution is synchronous CPU on the caller's thread for up to `timeoutMs`.
- **Wasm instance sharing:** a V8 stack fault or Emscripten abort poisons the shared instance; concurrent in-flight runs on the same bucket may be affected. `WorkerSandbox` with a pool limits this to one worker, but a poisoned worker is only replaced after the failing run.
- **Stack depth is small:** about 370 nested calls in-process, about 1,485 in a worker.
- **Memory-limit labelling heuristic** (F7): `memory_limit` for a thrown `null` is inferred from the Wasm memory being at its maximum.
- **Origin allowlist is string-based:** an allowlisted hostname that resolves to a different or private address (DNS rebinding) is the operator's responsibility; there is no IP-level filtering. TLS validation is whatever Node's `fetch` does.
- **QuickJS engine version** is not exposed by the package; the build has `Float16Array` and `Iterator` helpers, so it is a recent upstream (*inferred*). CVE exposure of that version was not assessed.
- **Cross-architecture determinism** (e.g. the same body on x86-64 Linux) was not tested; only separate processes and timezones on this arm64 host.
- **Output walker nuance:** `Object.prototype.toJSON` pollution makes every output `output_invalid` in that run (by design), and input may contain a `__proto__` own key (it is data inside the guest) while output may not.
- **Wiki-ready cold-start numbers for the other runtimes** (Deno, gVisor, Firecracker) are absent.

## 9. Reproduction commands

```bash
cd ~/gooseProjects/ursitoare-spikes/sandbox-quickjs
npm ci && npm run typecheck                   # typecheck passes with no output
npm test                                      # 70 tests, ~12 s; stub server on 127.0.0.1:18930
npm run memory-probe                          # F1
node bench/stack-matrix.ts                    # F2
node bench/stock-probe.ts                     # F4, F5
node bench/native-ops.ts                      # F3 per-built-in timings
node bench/fetch-cost.ts                      # fetch bridge cost
docker pull alpine:3.20                       # once, before the benchmark
for i in 1 2 3; do BENCH_OUT=results/bench-run$i.json node bench/bench.ts; done
node bench/summarize.ts && node bench/escape-table.ts
```

Code size (`wc -l`): `src/` 863 lines (index 335, prelude 212, fetchGateway 124, worker-sandbox 105, types 78, worker-entry 9); `test/` 685 lines; `bench/` 387 lines (plus `native-ops.ts`, 36).
