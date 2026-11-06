# Escape data

The literal data of the 42 escape cases, their variants and the stack bodies, ported from `seed/sandbox-quickjs/test/escape.test.ts` and `worker.test.ts`. With the conventions of `test-plan.md` it is all that the escape tests and U42's `"hook"` re-run need.

## ESCAPE_CASES

`ESCAPE_OPTIONS`: `{ seed: "escape", nowIso: "2026-10-24T12:00:00.000Z", binding: "input", result: "object" }`, with `binding: "ctx"` and `result: "object_or_null"` in `"hook"` mode. Every `source` reads the input as `arguments[0]` (never by the binding's name) and computes its verdict in the guest. `limits` lists only members differing from `LIM` (a case with none has no `limits` member); `input` is `{}` unless shown; a fault array is a set of acceptable codes. `ESCAPE_IDS`: E01-E11, E13, E14, E16-E33, E46-E51, E53-E56, E59 (42 ids).

`THREW` = `ok {threw:'ReferenceError'}`; `T400` = `limits{timeoutMs:400} fault timeout`.

```
E01 ok {defined:[]}  const names='process require module exports Buffer global window self setTimeout setInterval setImmediate queueMicrotask console structuredClone TextEncoder URL performance navigator __dirname __filename fetch XMLHttpRequest WebSocket Worker std os __hf hostFetch'.split(' '); return{defined:names.filter((k)=>typeof globalThis[k]!=='undefined')};
E02 THREW  try{return{home:process.env.HOME}}catch(e){return{threw:e.name}}
E03 THREW  try{return{x:require('fs').readdirSync('/')}}catch(e){return{threw:e.name}}
E04 THREW  try{const m=await import('fs');return{k:Object.keys(m)}}catch(e){return{threw:e.name}}
E05 fault syntax_error  import fs from 'fs'; return {};
E06 fault syntax_error  return { u: import.meta.url };
E07 ok {extra:[],missing:[]}  const expected='AggregateError Array ArrayBuffer BigInt BigInt64Array BigUint64Array Boolean DataView Date Error EvalError Float16Array Float32Array Float64Array Function Infinity Int16Array Int32Array Int8Array InternalError Iterator JSON Map Math NaN Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set String Symbol SyntaxError TypeError URIError Uint16Array Uint32Array Uint8Array Uint8ClampedArray WeakMap WeakSet decodeURI decodeURIComponent encodeURI encodeURIComponent escape eval globalThis isFinite isNaN parseFloat parseInt undefined unescape'.split(' '); const got=Object.getOwnPropertyNames(globalThis).sort(); return{extra:got.filter(x=>!expected.includes(x)),missing:expected.filter(x=>!got.includes(x))};
E08 ok {a:'undefined',b:'undefined',c:true,d:'undefined'}  const F=(function(){}).constructor; const g=F('return globalThis')(); return{a:F('return typeof process')(),b:typeof g.process,c:g===globalThis,d:typeof g.require};
E09 THREW  try{return{p:({}).constructor.constructor('return process')()}}catch(e){return{threw:e.name}}
E10 ok {a:'undefined',g:'string'}  const AF=Object.getPrototypeOf(async function(){}).constructor; const GF=Object.getPrototypeOf(function*(){}).constructor; return{a:await AF('return typeof process')(),g:typeof GF('return typeof require')().next().value};
E11 limits{timeoutMs:2000} ok {hits:[],crawledMany:true}  const deny=new Set('process require __hf hostFetch Buffer fs child_process module __proto_host__'.split(' '));const seen=new Set();const q=[globalThis];const hits=[];let n=0;while(q.length&&n<20000){const o=q.shift();if(seen.has(o))continue;seen.add(o);n++;let names=[];try{names=Reflect.ownKeys(o)}catch{}for(const k of names){if(typeof k==='string'&&deny.has(k))hits.push(k);let d;try{d=Object.getOwnPropertyDescriptor(o,k)}catch{continue}if(!d)continue;for(const v of [d.value,d.get,d.set])if((typeof v==='object'&&v!==null)||typeof v==='function')q.push(v)}try{const p=Object.getPrototypeOf(o);if(p)q.push(p)}catch{}}return{hits,crawledMany:n>100};
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
E48 ok {Atomics:'undefined',SharedArrayBuffer:'undefined',WebAssembly:'undefined',WeakRef:'undefined',FinalizationRegistry:'undefined',Intl:'undefined',gc:'undefined',WebAssemblyInstance:'undefined',sab:'ReferenceError'}  const o={}; for(const k of 'Atomics SharedArrayBuffer WebAssembly WeakRef FinalizationRegistry Intl gc WebAssemblyInstance'.split(' '))o[k]=typeof globalThis[k]; try{new SharedArrayBuffer(8);o.sab='constructed'}catch(e){o.sab=e.name} return o;
E49 limits{timeoutMs:3000} ok {delta:0,same:true,perf:'undefined'}  const t0=Date.now(); let x=0; for(let i=0;i<3000000;i++)x+=i; const t1=Date.now(); return{delta:t1-t0,same:Date.now()===new Date().getTime()&&new Date().toISOString()===new Date(Date.now()).toISOString(),perf:typeof performance};
E50 ok {allEqual:true,tries:['assign:TypeError','define:TypeError']}  const target=Date.now(); const tries=[]; try{Date.now=()=>1}catch(e){tries.push('assign:'+e.name)} try{Object.defineProperty(Date,'now',{value:()=>2})}catch(e){tries.push('define:'+e.name)} class D2 extends Date{} const routes=[D2.now(),new D2().getTime(),Object.getPrototypeOf(new Date()).constructor.now(),new Date().constructor.now(),(function(){}).constructor('return Date.now()')(),Date.now()]; return{allEqual:routes.every(v=>v===target),tries};
E51 ok {threw:'TypeError',pinned:false,moved:true}  const first=Math.random(); let threw=''; try{Math.random=()=>0.5}catch(e){threw=e.name} return{threw,pinned:Math.random()===0.5,moved:first!==Math.random()};
E53 fault output_invalid  return JSON.parse('{"__proto__":{"polluted":1},"x":2}');
E54 fault output_invalid; hookExpect ok null  return undefined;
E55 ok {leaks:false}  try{null.x}catch(e){return{leaks:/\/Users|node_modules|file:\/\/|quickjs-emscripten/.test(String(e.stack))}} return {};
E56 ok {good:[1,2,3]}  JSON.stringify=()=>'{"evil":true}'; JSON.parse=()=>({evil:true}); Promise.prototype.then=()=>{}; Array.prototype.push=()=>{}; Object.keys=()=>[]; return{good:[1,2,3]};
E59 limits{memoryBytes:16*MiB,timeoutMs:3000} fault memory_limit  const a = []; for (let i = 0; i < 30; i++) a.push(new Array(200000).fill(i)); return { n: a.length };
```

E20: at 16 MiB the probe gave `never_settled`; at 64 MiB, and once at 32 MiB, `runtime_error` with the message `Error: ` (a promise flood whose exception object could not be built), so the set has four codes. The flood prints one `Aborted(...)` line to stderr; no test asserts empty stderr. E20 is the concrete disposal-abort case: `Aborted` is `JS_FreeRuntime` failing after the result exists; the result is kept (`never_settled` at 16 MiB), the module dropped, the next run `ok`.

## VARIANTS

Each runs in `"node"` mode (`ESCAPE_OPTIONS`; `E54o` `return null;` is `output_invalid` here, `ok` `null` under `object_or_null`) at `LIM` plus its `limits`, and its code must be in its set. Lines: id, limits, set, two spaces, source. `E29b-e` have `limits{timeoutMs:3000} fault [memory_limit,runtime_error]`, `E54a-q` have `fault output_invalid`; their lines are suffix, two spaces, source.

```
E13b fault syntax_error  with ({}) { return {}; }
E21b limits{timeoutMs:400} fault timeout  const o = { get x() { for (;;) {} } }; return { v: o.x };
E23b limits{timeoutMs:400} fault timeout  return { m: ('a'.repeat(50) + 'b').replace(/(x+x+)+y/g, '').length + /(a|aa)+$/.test('a'.repeat(60) + 'b') };
E32b limits{maxOutputBytes:100000} fault output_too_large  return { s: '€'.repeat(40000) };
E53b fault output_invalid  Object.prototype.toJSON = () => ({ evil: 1 }); return { a: 1 };
```

E29b-e:

```
b  return { v: new Array(2 ** 32 - 1).fill(0).length };
c  return { v: String(2n ** 100000000n).length };
d  return { v: new Uint8Array(2 ** 31).length };
e  return { v: 'x'.repeat(2 ** 30).length };
```

E54a-q:

```
a  return { f() {} };
b  return { u: undefined };
c  return { b: 1n };
d  return { n: NaN };
e  return { n: Infinity };
f  return { d: new Date() };
g  return { m: new Map() };
h  return { s: Symbol('x') };
i  const o = {}; o.o = o; return o;
j  return { get g() { return 1; } };
k  return { a: [1, , 3] };
l  class A {} return { a: new A() };
m  return [1, 2];
n  return 5;
o  return null;
p  return 'str';
q  let o = {}; for (let i = 1; i < 101; i++) o = { n: o }; return o;
```

`FRESH` (pool `size` 1; `ESCAPE_OPTIONS`, `LIM`) runs three bodies in order. A: `globalThis.secret = 'S3CR3T'; Object.prototype.leak = 1; Array.prototype.leak = 2; String.prototype.leak = 3; Date.prototype.leak = 4; try { Math.random = () => 4; } catch (e) {} return { ok: 1 };`. B: `return { secret: typeof globalThis.secret, o: ({}).leak ?? null, ar: [].leak ?? null, s: 'x'.leak ?? null, d: new Date().leak ?? null, rnd: Math.random() };`. R: `return { rnd: Math.random() };`. A gives `{ ok: 1 }`; B equals `{ secret: "undefined", o: null, ar: null, s: null, d: null, rnd: R }` with R the value of R's run on the same seed.

## STACK_BODIES

`timeoutMs` 2000, `memoryBytes` 64 MiB; the ten bodies of Phase-0 E26 plus `newRec` and `mapCb`; name, two spaces, source.

```
jsonParse  const s = '['.repeat(200000) + ']'.repeat(200000); return { v: JSON.parse(s).length };
jsonStringify  let a = []; for (let i = 0; i < 200000; i++) a = [a]; return { v: JSON.stringify(a).length };
flat  let a = []; for (let i = 0; i < 200000; i++) a = [a]; return { v: a.flat(Infinity).length };
toString  let a = []; for (let i = 0; i < 200000; i++) a = [a]; return { v: String(a).length };
proxy  let p = {}; for (let i = 0; i < 100000; i++) p = new Proxy(p, {}); return { v: typeof p.x };
getter  let o = { get x() { return o.x; } }; return { v: o.x };
apply  function f() { return f.apply(null, []); } return { v: f() };
bind  let f = function () { return 1; }; for (let i = 0; i < 100000; i++) f = f.bind(null); return { v: f() };
promiseChain  let p = Promise.resolve(1); for (let i = 0; i < 200000; i++) p = p.then(x => x + 1); return { v: await p };
sortCmp  function f(){ [2,1].sort(() => f()); } f(); return {};
newRec  function F(){ new F(); } new F();
mapCb  function f(){ [1].map(() => f()); } f();
```

Probe: `jsonParse` `runtime_error`, `bind` and `promiseChain` `memory_limit`, the rest `stack_overflow`.
