# Test plan

Every body was run through the Phase-0 pool (`seed/sandbox-quickjs`, Node 26.8.1, 2026-11-06); expectations are those results. Not run (new code): `"hook"` mode, the factory, exit worker and child processes.

## Conventions

- `MiB` is 1048576. `LIM` is `DEFAULT_SANDBOX_LIMITS`. `OPT` is `{ seed: "r_1:normalize:1", nowIso: "2026-10-24T12:00:00.000Z", binding: "input", result: "object" }`. `run(body, input, limits, options)` means `sandbox.run(body, input, { ...LIM, ...limits }, { ...OPT, ...options })`.
- A run that could hang races a 5000 ms timer; elapsed time is `performance.now()` around the awaited run.
- A recording factory is `(url, options) => { const w = new Worker(url, options); log.push({ url, options }); workers.push(w); return w; }`; a counting worker counts `postMessage` calls; `test/support/sandbox-exit-worker.ts` runs `parentPort.once("message", () => process.exit(1))`.

## Bodies and inputs

- `NORMALIZE`: `return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };` on `{ amount: 1234.567, currency: "eur" }`.
- `CTX_BODY`: `return { amount: ctx.amount, inputType: typeof input };`. `NUL_BODY`: `const s = arguments[0].s; return { len: s.length, nul: s.charCodeAt(1), out: s };`. `DEEP(n)`: `let v = []; for (let i = 1; i < n; i++) v = [v];` and `v`. `NEST(n)` (a body): `let o = {}; for (let i = 1; i < n; i++) o = { n: o }; return o;`.
- `BAD_ARGS` (the message contains the argument's name, `limits.<member>` for limits): `code` 42; `timeoutMs` 0, `"100"`, 3600001; `memoryBytes` -1, 1073741825; `maxStackBytes` NaN; `maxOutputBytes` Infinity, 67108865; `seed` `""`, `"a".repeat(1025)`, 1; `nowIso` `"yesterday"`, `"2026-10-24T12:00:00"`, `"2026-02-30T00:00:00Z"`; `binding` `"args"`; `result` `"array"`.
- `INVALID_INPUTS`: `{ f: () => 1 }`, `{ u: undefined }`, `{ b: 1n }`, `{ d: new Date(0) }`, a cycle (`c.self = c`), `{ get g() { return 1; } }`, `{ n: NaN }`, `[1, , 3]`, `new (class A {})()`, `new Proxy({}, { ownKeys() { throw new Error("x"); } })`, `DEEP(66)`, `"x".repeat(7999999)`. The first nine are not `SandboxJson`; the test casts them.
- `BUSY`: `for (let i = 0; i < 3000000; i++) {} return { i: 0 };`. `LOOP`: `for (;;) {}`. `BIG`: `const x = 3n ** 150000n; return { l: (x * x * x * x).toString().length };` (2194 ms on the probe machine). `LATE`: the same with `100000n`.
- `BAD_OPTIONS` (option: values; range): `size`: 0, 17, 1.5, `"2"`, NaN (1 to 16); `graceMs`: -1, 10001 (0 to 10000); `stackSizeMb`: 0, 65 (1 to 64); `stackCapBytes`: 32767, 1048577 (32768 to 1048576); `maxOldGenerationSizeMb`: 15, 4097 (16 to 4096); `workerFactory`: `"x"` (a function). `GOOD_OPTIONS`: `{}`, `{ size: undefined }` and both ends of every range.
- `CLOCK_RANDOM`: the seed's body (`determinism.test.ts` line 22): clock reads, three `Math.random()` values, a random id, a random-comparator `sort`, date arithmetic and local getters, in one object. `CLOCK_BODY`: `return { now: Date.now(), iso: new Date().toISOString(), str: String(new Date()) };`. `RANDOM_BODY`: `return { v: Array.from({ length: 10 }, () => Math.random()) };` against the seed's `mulberry32` (`determinism.test.ts` line 75) started at `seedOf("12345")`. `TZ_BODY`: `return { off: new Date().getTimezoneOffset(), h: new Date(2020,5,1,12).getHours(), s: String(new Date(2020,0,1)), p: Date.parse('2020-06-01T12:00:00'), l: String(Date.parse('Jun 1 2020 12:00')), d: new Date(0).getDate() };`. A determinism child is `execFileSync(process.execPath, ["--input-type=module", "-e", script], { env: { ...process.env, TZ } })`; the script imports `createWorkerSandbox` from the `file:` URL of `src/sandbox/index.ts`, prints `<sha256 hex> <TZ_BODY JSON>`, closes the pool. A lifetime child uses `spawnSync` with `timeout: 20000`, no `close`.
- `BOMBS`: `const a=[];for(;;)a.push(new Array(100000).fill(1));`, `const a=[];for(let i=0;;i++)a.push("x".repeat(1000)+i);`, `const a=[];for(let i=0;;i++)a.push({i, s: "v" + i});`. `ALLOC`: `const a = []; for (let i = 0; i < 30; i++) a.push(new Array(200000).fill(i)); return { n: a.length };`.
- `STACK_BODIES` (`timeoutMs` 2000, `memoryBytes` 64 MiB; results on the probe): the ten bodies of the seed's E26 (`escape.test.ts` line 185) plus `newRec` (`function F(){ new F(); } new F();`) and `mapCb` (`function f(){ [1].map(() => f()); } f();`). Probe: `jsonParse` `runtime_error`, `bind` and `promiseChain` `memory_limit`, the rest `stack_overflow`. `RECURSE`: `let d = 0; function f() { d++; f(); } try { f(); } catch (e) {} return { d };` gives `d` 1485 at 262144 and 536870912, 368 at 65536, 181 at 1 and 32768.
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

## ESCAPE_CASES

`ESCAPE_OPTIONS` is `{ seed: "escape", nowIso: "2026-10-24T12:00:00.000Z", binding: "input", result: "object" }`, with `binding: "ctx"` and `result: "object_or_null"` in `"hook"` mode. Every `source` reads the input as `arguments[0]` (never by the binding's name) and computes its verdict in the guest. A seed case with several bodies keeps its first; the rest are `VARIANTS`. `limits` lists only members differing from `LIM` (a case with none has no `limits` member); `input` is `{}` unless shown; a fault array is a set of acceptable codes. `ESCAPE_IDS`: E01-E11, E13, E14, E16-E33, E46-E51, E53-E56, E59 (42 ids).

`THREW` = `ok {threw:'ReferenceError'}`; `T400` = `limits{timeoutMs:400} fault timeout`.

```
E01 ok {defined:[]}  const names=[the 28 names of seed E01, `escape.test.ts` line 52: process, require, module, …, fetch, XMLHttpRequest, WebSocket, Worker, std, os, __hf, hostFetch]; return{defined:names.filter((k)=>typeof globalThis[k]!=='undefined')};
E02 THREW  try{return{home:process.env.HOME}}catch(e){return{threw:e.name}}
E03 THREW  try{return{x:require('fs').readdirSync('/')}}catch(e){return{threw:e.name}}
E04 THREW  try{const m=await import('fs');return{k:Object.keys(m)}}catch(e){return{threw:e.name}}
E05 fault syntax_error  import fs from 'fs'; return {};
E06 fault syntax_error  return { u: import.meta.url };
E07 ok {extra:[],missing:[]}  const expected=[the 58 names of seed E07, `escape.test.ts` line 66: AggregateError … unescape, including Float16Array, InternalError and Iterator, without console, Intl, Atomics, WebAssembly, SharedArrayBuffer, WeakRef or FinalizationRegistry]; const got=Object.getOwnPropertyNames(globalThis).sort(); return{extra:got.filter(x=>!expected.includes(x)),missing:expected.filter(x=>!got.includes(x))};
E08 ok {a:'undefined',b:'undefined',c:true,d:'undefined'}  const F=(function(){}).constructor; const g=F('return globalThis')(); return{a:F('return typeof process')(),b:typeof g.process,c:g===globalThis,d:typeof g.require};
E09 THREW  try{return{p:({}).constructor.constructor('return process')()}}catch(e){return{threw:e.name}}
E10 ok {a:'undefined',g:'string'}  const AF=Object.getPrototypeOf(async function(){}).constructor; const GF=Object.getPrototypeOf(function*(){}).constructor; return{a:await AF('return typeof process')(),g:typeof GF('return typeof require')().next().value};
E11 limits{timeoutMs:2000} ok {hits:[],crawledMany:true}  breadth-first walk (at most 20000 objects) from globalThis over Reflect.ownKeys, descriptor value/get/set and prototypes; hits = keys named process, require, __hf, hostFetch, Buffer, fs, child_process or module; return{hits,crawledMany:n>100};
E13 ok {t:'undefined'}  return { t: typeof this };
E14 ok {guestSees:'yes',hadOwnProto:true}  input JSON.parse('{"__proto__":{"polluted":"yes"},"a":1}'); const data=arguments[0]; function merge(t,s){for(const k in s){t[k]=s[k]&&typeof s[k]==='object'?merge(t[k]||{},s[k]):s[k]}return t} merge({},data); return{guestSees:({}).polluted??null,hadOwnProto:Object.hasOwn(data,'__proto__')};
E16 ok {len:1}  input {n:{deep:[1,2,3]},s:'x'}; const data=arguments[0]; data.n.deep.push(99); data.s='changed'; delete data.n; return{len:Object.keys(data).length};
E17 fault input_invalid  input DEEP(66); return {};
E18 T400  for(;;){}
E19 T400  while(true){try{for(;;){}}catch(e){}}
E20 limits{timeoutMs:400,memoryBytes:16*MiB} fault [timeout,memory_limit,never_settled,runtime_error]  const f=()=>Promise.resolve().then(f); f(); await new Promise(()=>{}); return {};
E21 T400  await Promise.resolve().then(()=>{for(;;){}}); return {};
E22 T400  return{m:/(a+)+$/.test('a'.repeat(40)+'!')};
E23 T400  return{m:/^(([a-z])+.)+[A-Z]([a-z])+$/.test('a'.repeat(60)+'!')};
E24 fault stack_overflow  function f(n){return f(n+1)+1} return{v:f(0)};
E25 ok {nameOk:true,deepEnough:true}  let depth=0; function f(){depth++;return f()+1} try{f()}catch(e){return{nameOk:/^(InternalError|RangeError)$/.test(e.name),deepEnough:depth>100}} return {};
E26 limits{timeoutMs:2000,memoryBytes:64*MiB,maxStackBytes:262144} ok {contained:true}  try{JSON.parse('['.repeat(200000)+']'.repeat(200000))}catch(e){} return{contained:true};
E27 limits{maxStackBytes:512*MiB} fault stack_overflow  function f(n){return f(n+1)+1} return{v:f(0)};
E28 limits{timeoutMs:5000} fault memory_limit  const a=[];for(;;)a.push(new Array(100000).fill(1));
E29 limits{timeoutMs:3000} fault [memory_limit,runtime_error]  let s='x'; for(;;) s+=s;
E30 limits{timeoutMs:600} fault [timeout,memory_limit]  const keep=[];for(;;){try{keep.push(new Array(50000).fill(2))}catch(e){}}
E31 limits{memoryBytes:64*MiB,maxOutputBytes:100000} fault output_too_large  return{big:'x'.repeat(2000000)};
E32 limits{maxOutputBytes:100000} fault output_too_large  const o={};for(let i=0;i<20000;i++)o['k'+i]=i;return o;
E33 ok {threw:'ReferenceError',type:'undefined'}  try{const r=await fetch('http://localhost:18930/ok');return{s:r.status}}catch(e){return{threw:e.name,type:typeof fetch}}
E46 ok {a:3,b:'undefined',c:'undefined',d:'undefined'}  return{a:eval('1 + 2'),b:new Function('return typeof process')(),c:(0,eval)('typeof require'),d:eval('typeof globalThis.__hf')};
E47 THREW  try{return{p:eval('process.pid')}}catch(e){return{threw:e.name}}
E48 ok {<each of Atomics, SharedArrayBuffer, WebAssembly, WeakRef, FinalizationRegistry, Intl, gc, WebAssemblyInstance>:'undefined', sab:'ReferenceError'}  o[k]=typeof globalThis[k]; try{new SharedArrayBuffer(8);o.sab='constructed'}catch(e){o.sab=e.name}
E49 limits{timeoutMs:3000} ok {delta:0,same:true,perf:'undefined'}  const t0=Date.now(); let x=0; for(let i=0;i<3000000;i++)x+=i; const t1=Date.now(); return{delta:t1-t0,same:Date.now()===new Date().getTime()&&new Date().toISOString()===new Date(Date.now()).toISOString(),perf:typeof performance};
E50 ok {allEqual:true,tries:['assign:TypeError','define:TypeError']}  const target=Date.now(); const tries=[]; try{Date.now=()=>1}catch(e){tries.push('assign:'+e.name)} try{Object.defineProperty(Date,'now',{value:()=>2})}catch(e){tries.push('define:'+e.name)} class D2 extends Date{} const routes=[D2.now(),new D2().getTime(),Object.getPrototypeOf(new Date()).constructor.now(),new Date().constructor.now(),(function(){}).constructor('return Date.now()')(),Date.now()]; return{allEqual:routes.every(v=>v===target),tries};
E51 ok {threw:'TypeError',pinned:false,moved:true}  const first=Math.random(); let threw=''; try{Math.random=()=>0.5}catch(e){threw=e.name} return{threw,pinned:Math.random()===0.5,moved:first!==Math.random()};
E53 fault output_invalid  return JSON.parse('{"__proto__":{"polluted":1},"x":2}');
E54 fault output_invalid; hookExpect ok null  return undefined;
E55 ok {leaks:false}  try{null.x}catch(e){return{leaks:/\/Users|node_modules|file:\/\/|quickjs-emscripten/.test(String(e.stack))}} return {};
E56 ok {good:[1,2,3]}  JSON.stringify=()=>'{"evil":true}'; JSON.parse=()=>({evil:true}); Promise.prototype.then=()=>{}; Array.prototype.push=()=>{}; Object.keys=()=>[]; return{good:[1,2,3]};
E59 limits{memoryBytes:16*MiB,timeoutMs:3000} fault memory_limit  ALLOC
```

E20: at 16 MiB the probe gave `never_settled`; at 64 MiB, and once at 32 MiB, `runtime_error` with the message `Error: ` (a promise flood whose exception object could not be built), so the set has four codes. The flood prints one `Aborted(...)` line to stderr; no test asserts empty stderr. E20 still asserts `ok: false` with one of the four codes.

## VARIANTS (`run` at `LIM` plus the limits shown; each result code must be in the set)

`E13b` `with ({}) { return {}; }` `syntax_error`. `E21b` `const o = { get x() { for (;;) {} } }; return { v: o.x };` (`timeoutMs` 400) `timeout`. `E23b` `return { m: ('a'.repeat(50) + 'b').replace(/(x+x+)+y/g, '').length + /(a|aa)+$/.test('a'.repeat(60) + 'b') };` (400) `timeout`. `E29b` `return { v: new Array(2 ** 32 - 1).fill(0).length };`, `E29c` `String(2n ** 100000000n).length`, `E29d` `new Uint8Array(2 ** 31).length`, `E29e` `'x'.repeat(2 ** 30).length` (each in `return { v: … };`, `timeoutMs` 3000): `memory_limit` or `runtime_error`. `E32b` `return { s: '€'.repeat(40000) };` (`maxOutputBytes` 100000) `output_too_large`. `E53b` `Object.prototype.toJSON = () => ({ evil: 1 }); return { a: 1 };` `output_invalid`. `E54a`-`E54q` (all `output_invalid`): the 17 other bodies of the seed's E54 (`escape.test.ts` line 367), from `return { f() {} };` to the 100-deep chain, which here is `NEST(101)`. `FRESH` (pool `size` 1, same worker): the seed's E15 bodies A and B (`escape.test.ts` line 133: A sets `globalThis.secret`, pollutes four prototypes and tries to replace `Math.random`; B reports them) then `return { rnd: Math.random() };`; B must equal `{ secret: "undefined", o: null, ar: null, s: null, d: null, rnd: R }` with R the value of that last run on the same seed.
