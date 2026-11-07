# Escape data

The literal data of the 42 escape cases, their variants and the stack bodies, ported from `seed/sandbox-quickjs/test/escape.test.ts` and `worker.test.ts`.

## ESCAPE_CASES

`ESCAPE_OPTIONS`: `{ seed: "escape", nowIso: "2026-10-24T12:00:00.000Z", binding: "input", result: "object" }`, with `binding: "ctx"` and `result: "object_or_null"` in `"hook"` mode. Every `source` reads the input as `arguments[0]` (never by the binding's name) and computes its verdict in the guest. `ESCAPE_IDS`: E01-E11, E13, E14, E16-E33, E46-E51, E53-E56, E59 (42 ids).

Row grammar: each row is `id | source | input | limits | expect | hookExpect` with `source` the guest body alone in backticks (no input directive; `\|` is `|`), `input` the JSON value passed to `run` (empty: `{}`; E14's has an own `__proto__` key), `limits` the JSON members differing from `LIM` (empty: `{}`), `expect` the JSON `{"ok":true,"value":V}` or `{"fault":code}` (an array of codes is a set of acceptable ones) and `hookExpect` the same form (E54 only; empty: absent).

|id|source|input|limits|expect|hookExpect|
|---|---|---|---|---|---|
|E01|`const names='process require module exports Buffer global window self setTimeout setInterval setImmediate queueMicrotask console structuredClone TextEncoder URL performance navigator __dirname __filename fetch XMLHttpRequest WebSocket Worker std os __hf hostFetch'.split(' '); return{defined:names.filter((k)=>typeof globalThis[k]!=='undefined')};`|||`{"ok":true,"value":{"defined":[]}}`||
|E02|`try{return{home:process.env.HOME}}catch(e){return{threw:e.name}}`|||`{"ok":true,"value":{"threw":"ReferenceError"}}`||
|E03|`try{return{x:require('fs').readdirSync('/')}}catch(e){return{threw:e.name}}`|||`{"ok":true,"value":{"threw":"ReferenceError"}}`||
|E04|`try{const m=await import('fs');return{k:Object.keys(m)}}catch(e){return{threw:e.name}}`|||`{"ok":true,"value":{"threw":"ReferenceError"}}`||
|E05|`import fs from 'fs'; return {};`|||`{"fault":"syntax_error"}`||
|E06|`return { u: import.meta.url };`|||`{"fault":"syntax_error"}`||
|E07|`const expected='AggregateError Array ArrayBuffer BigInt BigInt64Array BigUint64Array Boolean DataView Date Error EvalError Float16Array Float32Array Float64Array Function Infinity Int16Array Int32Array Int8Array InternalError Iterator JSON Map Math NaN Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set String Symbol SyntaxError TypeError URIError Uint16Array Uint32Array Uint8Array Uint8ClampedArray WeakMap WeakSet decodeURI decodeURIComponent encodeURI encodeURIComponent escape eval globalThis isFinite isNaN parseFloat parseInt undefined unescape'.split(' '); const got=Object.getOwnPropertyNames(globalThis).sort(); return{extra:got.filter(x=>!expected.includes(x)),missing:expected.filter(x=>!got.includes(x))};`|||`{"ok":true,"value":{"extra":[],"missing":[]}}`||
|E08|`const F=(function(){}).constructor; const g=F('return globalThis')(); return{a:F('return typeof process')(),b:typeof g.process,c:g===globalThis,d:typeof g.require};`|||`{"ok":true,"value":{"a":"undefined","b":"undefined","c":true,"d":"undefined"}}`||
|E09|`try{return{p:({}).constructor.constructor('return process')()}}catch(e){return{threw:e.name}}`|||`{"ok":true,"value":{"threw":"ReferenceError"}}`||
|E10|`const AF=Object.getPrototypeOf(async function(){}).constructor; const GF=Object.getPrototypeOf(function*(){}).constructor; return{a:await AF('return typeof process')(),g:typeof GF('return typeof require')().next().value};`|||`{"ok":true,"value":{"a":"undefined","g":"string"}}`||
|E11|`const deny=new Set('process require __hf hostFetch Buffer fs child_process module __proto_host__'.split(' '));const seen=new Set();const q=[globalThis];const hits=[];let n=0;while(q.length&&n<20000){const o=q.shift();if(seen.has(o))continue;seen.add(o);n++;let names=[];try{names=Reflect.ownKeys(o)}catch{}for(const k of names){if(typeof k==='string'&&deny.has(k))hits.push(k);let d;try{d=Object.getOwnPropertyDescriptor(o,k)}catch{continue}if(!d)continue;for(const v of [d.value,d.get,d.set])if((typeof v==='object'&&v!==null)\|\|typeof v==='function')q.push(v)}try{const p=Object.getPrototypeOf(o);if(p)q.push(p)}catch{}}return{hits,crawledMany:n>100};`||`{"timeoutMs":2000}`|`{"ok":true,"value":{"crawledMany":true,"hits":[]}}`||
|E13|`return { t: typeof this };`|||`{"ok":true,"value":{"t":"undefined"}}`||
|E14|`const data=arguments[0]; function merge(t,s){for(const k in s){t[k]=s[k]&&typeof s[k]==='object'?merge(t[k]\|\|{},s[k]):s[k]}return t} merge({},data); return{guestSees:({}).polluted??null,hadOwnProto:Object.hasOwn(data,'__proto__')};`|`{"__proto__":{"polluted":"yes"},"a":1}`||`{"ok":true,"value":{"guestSees":"yes","hadOwnProto":true}}`||
|E16|`const data=arguments[0]; data.n.deep.push(99); data.s='changed'; delete data.n; return{len:Object.keys(data).length};`|`{"n":{"deep":[1,2,3]},"s":"x"}`||`{"ok":true,"value":{"len":1}}`||
|E17|`return {};`|`[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]`||`{"fault":"input_invalid"}`||
|E18|`for(;;){}`||`{"timeoutMs":400}`|`{"fault":"timeout"}`||
|E19|`while(true){try{for(;;){}}catch(e){}}`||`{"timeoutMs":400}`|`{"fault":"timeout"}`||
|E20|`const f=()=>Promise.resolve().then(f); f(); await new Promise(()=>{}); return {};`||`{"memoryBytes":16777216,"timeoutMs":400}`|`{"fault":["timeout","memory_limit","never_settled","runtime_error"]}`||
|E21|`await Promise.resolve().then(()=>{for(;;){}}); return {};`||`{"timeoutMs":400}`|`{"fault":"timeout"}`||
|E22|`return{m:/(a+)+$/.test('a'.repeat(40)+'!')};`||`{"timeoutMs":400}`|`{"fault":"timeout"}`||
|E23|`return{m:/^(([a-z])+.)+[A-Z]([a-z])+$/.test('a'.repeat(60)+'!')};`||`{"timeoutMs":400}`|`{"fault":"timeout"}`||
|E24|`function f(n){return f(n+1)+1} return{v:f(0)};`|||`{"fault":"stack_overflow"}`||
|E25|`let depth=0; function f(){depth++;return f()+1} try{f()}catch(e){return{nameOk:/^(InternalError\|RangeError)$/.test(e.name),deepEnough:depth>100}} return {};`|||`{"ok":true,"value":{"deepEnough":true,"nameOk":true}}`||
|E26|`try{JSON.parse('['.repeat(200000)+']'.repeat(200000))}catch(e){} return{contained:true};`||`{"maxStackBytes":262144,"memoryBytes":67108864,"timeoutMs":2000}`|`{"ok":true,"value":{"contained":true}}`||
|E27|`function f(n){return f(n+1)+1} return{v:f(0)};`||`{"maxStackBytes":536870912}`|`{"fault":"stack_overflow"}`||
|E28|`const a=[];for(;;)a.push(new Array(100000).fill(1));`||`{"timeoutMs":5000}`|`{"fault":"memory_limit"}`||
|E29|`let s='x'; for(;;) s+=s;`||`{"timeoutMs":3000}`|`{"fault":["memory_limit","runtime_error"]}`||
|E30|`const keep=[];for(;;){try{keep.push(new Array(50000).fill(2))}catch(e){}}`||`{"timeoutMs":600}`|`{"fault":["timeout","memory_limit"]}`||
|E31|`return{big:'x'.repeat(2000000)};`||`{"maxOutputBytes":100000,"memoryBytes":67108864}`|`{"fault":"output_too_large"}`||
|E32|`const o={};for(let i=0;i<20000;i++)o['k'+i]=i;return o;`||`{"maxOutputBytes":100000}`|`{"fault":"output_too_large"}`||
|E33|`try{const r=await fetch('http://localhost:18930/ok');return{s:r.status}}catch(e){return{threw:e.name,type:typeof fetch}}`|||`{"ok":true,"value":{"threw":"ReferenceError","type":"undefined"}}`||
|E46|`return{a:eval('1 + 2'),b:new Function('return typeof process')(),c:(0,eval)('typeof require'),d:eval('typeof globalThis.__hf')};`|||`{"ok":true,"value":{"a":3,"b":"undefined","c":"undefined","d":"undefined"}}`||
|E47|`try{return{p:eval('process.pid')}}catch(e){return{threw:e.name}}`|||`{"ok":true,"value":{"threw":"ReferenceError"}}`||
|E48|`const o={}; for(const k of 'Atomics SharedArrayBuffer WebAssembly WeakRef FinalizationRegistry Intl gc WebAssemblyInstance'.split(' '))o[k]=typeof globalThis[k]; try{new SharedArrayBuffer(8);o.sab='constructed'}catch(e){o.sab=e.name} return o;`|||`{"ok":true,"value":{"Atomics":"undefined","FinalizationRegistry":"undefined","Intl":"undefined","SharedArrayBuffer":"undefined","WeakRef":"undefined","WebAssembly":"undefined","WebAssemblyInstance":"undefined","gc":"undefined","sab":"ReferenceError"}}`||
|E49|`const t0=Date.now(); let x=0; for(let i=0;i<3000000;i++)x+=i; const t1=Date.now(); return{delta:t1-t0,same:Date.now()===new Date().getTime()&&new Date().toISOString()===new Date(Date.now()).toISOString(),perf:typeof performance};`||`{"timeoutMs":3000}`|`{"ok":true,"value":{"delta":0,"perf":"undefined","same":true}}`||
|E50|`const target=Date.now(); const tries=[]; try{Date.now=()=>1}catch(e){tries.push('assign:'+e.name)} try{Object.defineProperty(Date,'now',{value:()=>2})}catch(e){tries.push('define:'+e.name)} class D2 extends Date{} const routes=[D2.now(),new D2().getTime(),Object.getPrototypeOf(new Date()).constructor.now(),new Date().constructor.now(),(function(){}).constructor('return Date.now()')(),Date.now()]; return{allEqual:routes.every(v=>v===target),tries};`|||`{"ok":true,"value":{"allEqual":true,"tries":["assign:TypeError","define:TypeError"]}}`||
|E51|`const first=Math.random(); let threw=''; try{Math.random=()=>0.5}catch(e){threw=e.name} return{threw,pinned:Math.random()===0.5,moved:first!==Math.random()};`|||`{"ok":true,"value":{"moved":true,"pinned":false,"threw":"TypeError"}}`||
|E53|`return JSON.parse('{"__proto__":{"polluted":1},"x":2}');`|||`{"fault":"output_invalid"}`||
|E54|`return undefined;`|||`{"fault":"output_invalid"}`|`{"ok":true,"value":null}`|
|E55|`try{null.x}catch(e){return{leaks:/\/Users\|node_modules\|file:\/\/\|quickjs-emscripten/.test(String(e.stack))}} return {};`|||`{"ok":true,"value":{"leaks":false}}`||
|E56|`JSON.stringify=()=>'{"evil":true}'; JSON.parse=()=>({evil:true}); Promise.prototype.then=()=>{}; Array.prototype.push=()=>{}; Object.keys=()=>[]; return{good:[1,2,3]};`|||`{"ok":true,"value":{"good":[1,2,3]}}`||
|E59|`const a = []; for (let i = 0; i < 30; i++) a.push(new Array(200000).fill(i)); return { n: a.length };`||`{"memoryBytes":16777216,"timeoutMs":3000}`|`{"fault":"memory_limit"}`||


E20 (Node 24.22.2): 16 MiB (5 runs) and 32 MiB (3 runs) gave `never_settled`; 64 MiB (4 runs) gave `never_settled`, `timeout` and twice `runtime_error` (message `Error: `, the flood's exception object could not be built): four codes. The flood prints one `Aborted(...)` line to stderr; no test asserts empty stderr.

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

Probe (seed pool, Node 24.22.2, both stacks): `jsonParse` `runtime_error`; `bind`, `promiseChain` `memory_limit`; the rest `stack_overflow`.

## DIGESTS

A digest is the SHA-256 hex of the UTF-8 bytes of `canon(entries)`, and the test compares it with these:

```ts
const canon = (x: unknown): string => JSON.stringify(x, (_k, v) =>
  v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : +(a > b)))) : v);
```

Entries are plain JSON: `undefined`, a function, a `RegExp`, `NaN`, a bigint or a `Date` anywhere changes the digest, and `expect` is the data of its line (no predicate exists). A case entry is `{ id, source, input, limits, expect }` (empty `input` and `limits` are `{}`) plus `hookExpect` when defined, never `title`; build E14's `input` with `JSON.parse` (an object literal sets the prototype). A variant entry is `{ id, source, input: {}, limits, expect }` (`limits` `{}` for none; `expect` `{ fault: code }` or `{ fault: [codes] }`) in block order, the suffix lines expanded to `E29b`-`E29e` and `E54a`-`E54q` with their stated `limits` and set.

- `ESCAPE_CASES` (42 entries, `ESCAPE_IDS` order): `3c1b49c560e10c65d0cc0d7f26e930ad26dfe4341d79d3bc6e30f44d7fbe9b6f`
- Variants (26 entries): `1c18ea7cb5e2e9eadac4a296fef9bc6d657f80eeb20aa7cb4a4058ab18ec1db0`
