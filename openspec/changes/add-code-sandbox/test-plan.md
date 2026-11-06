# Test plan

Every body was run through the Phase-0 pool (`seed/sandbox-quickjs`, Node 26.8.1, 2026-11-06); expectations are those results. Cases: `escape-data.md`.

## Conventions

- `MiB` is 1048576. `LIM` is `DEFAULT_SANDBOX_LIMITS`. `OPT` is `{ seed: "r_1:normalize:1", nowIso: "2026-10-24T12:00:00.000Z", binding: "input", result: "object" }`. `run(body, input, limits, options)` means `sandbox.run(body, input, { ...LIM, ...limits }, { ...OPT, ...options })`.
- A run that could hang races a 5000 ms timer; elapsed time is `performance.now()` around the awaited run.
- `BUILD`: `execFile(process.execPath, [<repo>/node_modules/typescript/bin/tsc, "-p", "tsconfig.build.json", "--outDir", <dir>], { cwd: <repo>, timeout: 60000 })`; `<dir>` is `mkdtemp(<repo>/node_modules/.cache/ursitoare-sandbox-build-)` after `mkdir -p` of `.cache` (ignored by `.gitignore:2` `node_modules/`; Node finds `node_modules`), holding `{ "type": "module" }` as `package.json` (scope stops at `node_modules`).
- A recording factory is `(url, options) => { const w = new Worker(url, options); log.push({ url, options }); workers.push(w); return w; }`; a counting worker counts `postMessage` calls; `test/support/sandbox-exit-worker.ts` runs `parentPort.once("message", () => process.exit(1))`.

## Bodies and inputs

- `NORMALIZE`: `return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };` on `{ amount: 1234.567, currency: "eur" }`.
- `CTX_BODY`: `return { amount: ctx.amount, inputType: typeof input };`. `NUL_BODY`: `const s = arguments[0].s; return { len: s.length, nul: s.charCodeAt(1), out: s };`. `DEEP(n)`: `let v = []; for (let i = 1; i < n; i++) v = [v];` and `v`. `NEST(n)` (a body): `let o = {}; for (let i = 1; i < n; i++) o = { n: o }; return o;`.
- `BAD_ARGS` (the message contains the argument's name, `limits.<member>` for limits): `code` 42; `limits` `null`, `undefined`, `"x"` and `options` `null`, `undefined`, `5` (passed as the argument itself, not spread; the name is `limits` or `options`); `timeoutMs` 0, `"100"`, 3600001; `memoryBytes` -1, 1073741825; `maxStackBytes` NaN; `maxOutputBytes` Infinity, 67108865; `seed` `""`, `"a".repeat(1025)`, 1; `nowIso` `"yesterday"`, `"2026-10-24T12:00:00"`, `"2026-02-30T00:00:00Z"`; `binding` `"args"`; `result` `"array"`.
- `BUSY`: `for (let i = 0; i < 3000000; i++) {} return { i: 0 };`. `LOOP`: `for (;;) {}`. `BIG`: `const x = 3n ** 150000n; return { l: (x * x * x * x).toString().length };` (2194 ms on the probe machine). `LATE`: the same with `100000n`.
- `BAD_OPTIONS` (option: values; range): `size`: 0, 17, 1.5, `"2"`, NaN (1 to 16); `graceMs`: -1, 10001 (0 to 10000); `stackSizeMb`: 0, 65 (1 to 64); `stackCapBytes`: 32767, 1048577 (32768 to 1048576); `maxOldGenerationSizeMb`: 15, 4097 (16 to 4096); `workerFactory`: `"x"` (a function). `GOOD_OPTIONS`: `{}`, `{ size: undefined }` and both ends of every range.
- `CLOCK_RANDOM`: `const r = [Math.random(), Math.random(), Math.random()]; return { now: Date.now(), iso: new Date().toISOString(), str: String(new Date()), r, id: Math.floor(Math.random() * 1e9).toString(36), shuffled: [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5), plus1h: new Date(Date.now() + 3600000).toISOString(), parts: [new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), new Date().getHours()] };`. `CLOCK_BODY`: `return { now: Date.now(), iso: new Date().toISOString(), str: String(new Date()) };`, expected `{ now: 1792843200000, iso: "2026-10-24T12:00:00.000Z", str: "Sat Oct 24 2026 12:00:00 GMT+0000 (UTC)" }`. `RANDOM_BODY`: `return { v: Array.from({ length: 10 }, () => Math.random()) };` against the host reference `mulberry32(seedOf("12345"))`, with `function mulberry32(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }`. `TZ_BODY`: `return { off: new Date().getTimezoneOffset(), h: new Date(2020,5,1,12).getHours(), s: String(new Date(2020,0,1)), p: Date.parse('2020-06-01T12:00:00'), l: String(Date.parse('Jun 1 2020 12:00')), d: new Date(0).getDate() };`, expected JSON `{"off":0,"h":12,"s":"Wed Jan 01 2020 00:00:00 GMT+0000 (UTC)","p":1591012800000,"l":"NaN","d":1}`. A determinism child is `execFileSync(process.execPath, ["--input-type=module", "-e", script], { env: { ...process.env, TZ } })`; the script imports `createWorkerSandbox` from the `file:` URL of `src/sandbox/index.ts`, prints `<sha256 hex> <TZ_BODY JSON>`, closes the pool. A lifetime child uses `spawnSync` with `timeout: 20000`, no `close`.
- `BOMBS`: `const a=[];for(;;)a.push(new Array(100000).fill(1));`, `const a=[];for(let i=0;;i++)a.push("x".repeat(1000)+i);`, `const a=[];for(let i=0;;i++)a.push({i, s: "v" + i});`. `ALLOC`: `const a = []; for (let i = 0; i < 30; i++) a.push(new Array(200000).fill(i)); return { n: a.length };`.
- `STACK_BODIES`: the 12 bodies of `escape-data.md` (`timeoutMs` 2000, `memoryBytes` 64 MiB). `RECURSE`: `let d = 0; function f() { d++; f(); } try { f(); } catch (e) {} return { d };` gives `d` 1485 at 262144 and 536870912, 368 at 65536, 181 at 1 and 32768.
- `EURO`: `return { s: '€'.repeat(30) };` (98 bytes as JSON), `ASCII`: `return { s: 'x'.repeat(100) };` (108 bytes).

## ARCH_FILES (under `src/sandbox/` unless shown)

`ok.ts`: imports of `node:worker_threads`, `import type … from "worker_threads"`, the two QuickJS packages, `./limits.ts`, `../sandbox/limits.ts`, `../core/index.ts`, `../config/index.ts`. `b.ts`: line 1 `import fs from "node:fs";`, 2 `import { q } from "../db/index.ts";`, 3 `import type { T } from "quickjs-emscripten-core/dist/x";`, 4 `const m = await import("node:path");`, 5 `const n = await import(name);`. `c.ts`: 1 `const a = process.env.X;`, 2 `const b = globalThis.process;`, 3 `const c = "process";`. `g.ts`: 1 `import { z } from "../sandboxish/x.ts";`, 2 `import { i } from "../core/ids.ts";`. `d.test.ts` (also `process.env.X`) and `src/api/e.ts`: `import fs from "node:fs";`.

## VERDICTS (results carry `stats: { ms: 1, memBytes: 0 }`; text is `<id>: expected <expect>, got <result>`, each side `ok`, `ok <value JSON>` or `fault <code>`, codes joined by `|`)

1 `E02` node, ok `{ threw: "ReferenceError" }`: `null`. 2 `E02` node, ok `{ threw: "TypeError" }`: `E02: expected ok {"threw":"ReferenceError"}, got ok {"threw":"TypeError"}`.
3 `E18` node, fault `timeout`: `null`. 4 `E18` node, fault `memory_limit`: `E18: expected fault timeout, got fault memory_limit`.
5 `E20` node, fault `runtime_error`: `null`. 6 `E20` node, fault `input_invalid`: `E20: expected fault timeout|memory_limit|never_settled|runtime_error, got fault input_invalid`.
7 `E54` node, ok `null`: `E54: expected fault output_invalid, got ok null`. 8 `E54` node, fault `output_invalid`: `null`.
9 `E54` hook, ok `null`: `null`. 10 `E54` hook, fault `output_invalid`: `E54: expected ok null, got fault output_invalid`.
11 `X1` (`expect` `{ ok: true }`) node, ok `{ a: 1 }`: `null`. 12 `X1` node, fault `timeout`: `X1: expected ok, got fault timeout`.

A `value` passes on `isDeepStrictEqual`; an `ok` without `value` takes any ok; `hookExpect` replaces `expect` only in `"hook"` mode.

## INVALID_INPUTS

X01-X26 are refused: `NORMALIZE` resolves `ok: false`, `input_invalid`, `stats.memBytes` -1, a message containing `input`, no worker started. A1-A5: `ECHO` (`return { v: arguments[0] };`) resolves `ok: true` with the value shown (A2, A3: plain-data traps; X23: the traps report `Date.prototype`).

Refused rows: X01 `undefined`; X02 `{ u: undefined }`; X03 `{ f: () => 1 }`; X04 `{ s: Symbol("x") }`; X05 `{ b: 1n }`; X06 `{ n: NaN }`; X07 `{ n: new Number(1) }`; X08 `{ d: new Date(0) }`; X09 `{ m: new Map() }`; X10 `{ s: new Set() }`; X11 `new (class A {})()`; X12 `{ t: new Uint8Array(2) }`; X13 `[1, , 3]`; X14 `{ get g() { return 1; } }`; X15 `Object.defineProperty({}, "h", { value: 1 })`; X16 `{ [Symbol("k")]: 1 }`; X17 `c` after `const c = {}; c.self = c;`; X18 `Object.defineProperty([], "0", { value: 1 })`; X19 `Object.assign([1], { x: 2 })`; X20 `Object.setPrototypeOf([], null)`; X21 `Object.create({ a: 1 })`; X22 `new Proxy({}, { ownKeys() { throw new Error("x"); } })`; X23 `new Proxy(new Date(0), {})`; X24 `{ a: [{ b: 1n }] }`; X25 `DEEP(66)`; X26 `"x".repeat(7999999)`.

| Row | Input | Verdict |
|---|---|---|
| A1 | `Object.assign(Object.create(null), { a: 1 })` | ok `{ v: { a: 1 } }` |
| A2 | `new Proxy({ a: 1 }, {})` | ok `{ v: { a: 1 } }` |
| A3 | `new Proxy([1, 2], {})` | ok `{ v: [1, 2] }` |
| A4 | `[]` | ok `{ v: [] }` |
| A5 | `{}` | ok `{ v: {} }` |
