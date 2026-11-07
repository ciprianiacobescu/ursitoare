// The 42 escape cases as shared data (escape-data.md), plus their verdict helper.

import { isDeepStrictEqual } from "node:util";

import type {
  SandboxFaultCode,
  SandboxJson,
  SandboxLimits,
  SandboxResult,
} from "../../src/sandbox/index.ts";

export type EscapeExpect =
  | { ok: true; value?: SandboxJson }
  | { fault: SandboxFaultCode | readonly SandboxFaultCode[] };

export interface EscapeCase {
  id: string;
  title: string;
  source: string;
  input: SandboxJson;
  limits?: Partial<SandboxLimits>;
  expect: EscapeExpect;
  hookExpect?: EscapeExpect;
}

export const ESCAPE_CASES: readonly EscapeCase[] = [
  {
    id: "E01",
    title: "escape case E01",
    source: "const names='process require module exports Buffer global window self setTimeout setInterval setImmediate queueMicrotask console structuredClone TextEncoder URL performance navigator __dirname __filename fetch XMLHttpRequest WebSocket Worker std os __hf hostFetch'.split(' '); return{defined:names.filter((k)=>typeof globalThis[k]!=='undefined')};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"defined\":[]}}"),
  },
  {
    id: "E02",
    title: "escape case E02",
    source: "try{return{home:process.env.HOME}}catch(e){return{threw:e.name}}",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"threw\":\"ReferenceError\"}}"),
  },
  {
    id: "E03",
    title: "escape case E03",
    source: "try{return{x:require('fs').readdirSync('/')}}catch(e){return{threw:e.name}}",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"threw\":\"ReferenceError\"}}"),
  },
  {
    id: "E04",
    title: "escape case E04",
    source: "try{const m=await import('fs');return{k:Object.keys(m)}}catch(e){return{threw:e.name}}",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"threw\":\"ReferenceError\"}}"),
  },
  {
    id: "E05",
    title: "escape case E05",
    source: "import fs from 'fs'; return {};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"fault\":\"syntax_error\"}"),
  },
  {
    id: "E06",
    title: "escape case E06",
    source: "return { u: import.meta.url };",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"fault\":\"syntax_error\"}"),
  },
  {
    id: "E07",
    title: "escape case E07",
    source: "const expected='AggregateError Array ArrayBuffer BigInt BigInt64Array BigUint64Array Boolean DataView Date Error EvalError Float16Array Float32Array Float64Array Function Infinity Int16Array Int32Array Int8Array InternalError Iterator JSON Map Math NaN Number Object Promise Proxy RangeError ReferenceError Reflect RegExp Set String Symbol SyntaxError TypeError URIError Uint16Array Uint32Array Uint8Array Uint8ClampedArray WeakMap WeakSet decodeURI decodeURIComponent encodeURI encodeURIComponent escape eval globalThis isFinite isNaN parseFloat parseInt undefined unescape'.split(' '); const got=Object.getOwnPropertyNames(globalThis).sort(); return{extra:got.filter(x=>!expected.includes(x)),missing:expected.filter(x=>!got.includes(x))};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"extra\":[],\"missing\":[]}}"),
  },
  {
    id: "E08",
    title: "escape case E08",
    source: "const F=(function(){}).constructor; const g=F('return globalThis')(); return{a:F('return typeof process')(),b:typeof g.process,c:g===globalThis,d:typeof g.require};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"a\":\"undefined\",\"b\":\"undefined\",\"c\":true,\"d\":\"undefined\"}}"),
  },
  {
    id: "E09",
    title: "escape case E09",
    source: "try{return{p:({}).constructor.constructor('return process')()}}catch(e){return{threw:e.name}}",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"threw\":\"ReferenceError\"}}"),
  },
  {
    id: "E10",
    title: "escape case E10",
    source: "const AF=Object.getPrototypeOf(async function(){}).constructor; const GF=Object.getPrototypeOf(function*(){}).constructor; return{a:await AF('return typeof process')(),g:typeof GF('return typeof require')().next().value};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"a\":\"undefined\",\"g\":\"string\"}}"),
  },
  {
    id: "E11",
    title: "escape case E11",
    source: "const deny=new Set('process require __hf hostFetch Buffer fs child_process module __proto_host__'.split(' '));const seen=new Set();const q=[globalThis];const hits=[];let n=0;while(q.length&&n<20000){const o=q.shift();if(seen.has(o))continue;seen.add(o);n++;let names=[];try{names=Reflect.ownKeys(o)}catch{}for(const k of names){if(typeof k==='string'&&deny.has(k))hits.push(k);let d;try{d=Object.getOwnPropertyDescriptor(o,k)}catch{continue}if(!d)continue;for(const v of [d.value,d.get,d.set])if((typeof v==='object'&&v!==null)||typeof v==='function')q.push(v)}try{const p=Object.getPrototypeOf(o);if(p)q.push(p)}catch{}}return{hits,crawledMany:n>100};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"timeoutMs\":2000}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"crawledMany\":true,\"hits\":[]}}"),
  },
  {
    id: "E13",
    title: "escape case E13",
    source: "return { t: typeof this };",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"t\":\"undefined\"}}"),
  },
  {
    id: "E14",
    title: "escape case E14",
    source: "const data=arguments[0]; function merge(t,s){for(const k in s){t[k]=s[k]&&typeof s[k]==='object'?merge(t[k]||{},s[k]):s[k]}return t} merge({},data); return{guestSees:({}).polluted??null,hadOwnProto:Object.hasOwn(data,'__proto__')};",
    input: JSON.parse("{\"__proto__\":{\"polluted\":\"yes\"},\"a\":1}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"guestSees\":\"yes\",\"hadOwnProto\":true}}"),
  },
  {
    id: "E16",
    title: "escape case E16",
    source: "const data=arguments[0]; data.n.deep.push(99); data.s='changed'; delete data.n; return{len:Object.keys(data).length};",
    input: JSON.parse("{\"n\":{\"deep\":[1,2,3]},\"s\":\"x\"}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"len\":1}}"),
  },
  {
    id: "E17",
    title: "escape case E17",
    source: "return {};",
    input: JSON.parse("[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"fault\":\"input_invalid\"}"),
  },
  {
    id: "E18",
    title: "escape case E18",
    source: "for(;;){}",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"timeoutMs\":400}"),
    expect: JSON.parse("{\"fault\":\"timeout\"}"),
  },
  {
    id: "E19",
    title: "escape case E19",
    source: "while(true){try{for(;;){}}catch(e){}}",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"timeoutMs\":400}"),
    expect: JSON.parse("{\"fault\":\"timeout\"}"),
  },
  {
    id: "E20",
    title: "escape case E20",
    source: "const f=()=>Promise.resolve().then(f); f(); await new Promise(()=>{}); return {};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"memoryBytes\":16777216,\"timeoutMs\":400}"),
    expect: JSON.parse("{\"fault\":[\"timeout\",\"memory_limit\",\"never_settled\",\"runtime_error\"]}"),
  },
  {
    id: "E21",
    title: "escape case E21",
    source: "await Promise.resolve().then(()=>{for(;;){}}); return {};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"timeoutMs\":400}"),
    expect: JSON.parse("{\"fault\":\"timeout\"}"),
  },
  {
    id: "E22",
    title: "escape case E22",
    source: "return{m:/(a+)+$/.test('a'.repeat(40)+'!')};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"timeoutMs\":400}"),
    expect: JSON.parse("{\"fault\":\"timeout\"}"),
  },
  {
    id: "E23",
    title: "escape case E23",
    source: "return{m:/^(([a-z])+.)+[A-Z]([a-z])+$/.test('a'.repeat(60)+'!')};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"timeoutMs\":400}"),
    expect: JSON.parse("{\"fault\":\"timeout\"}"),
  },
  {
    id: "E24",
    title: "escape case E24",
    source: "function f(n){return f(n+1)+1} return{v:f(0)};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"fault\":\"stack_overflow\"}"),
  },
  {
    id: "E25",
    title: "escape case E25",
    source: "let depth=0; function f(){depth++;return f()+1} try{f()}catch(e){return{nameOk:/^(InternalError|RangeError)$/.test(e.name),deepEnough:depth>100}} return {};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"deepEnough\":true,\"nameOk\":true}}"),
  },
  {
    id: "E26",
    title: "escape case E26",
    source: "try{JSON.parse('['.repeat(200000)+']'.repeat(200000))}catch(e){} return{contained:true};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"maxStackBytes\":262144,\"memoryBytes\":67108864,\"timeoutMs\":2000}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"contained\":true}}"),
  },
  {
    id: "E27",
    title: "escape case E27",
    source: "function f(n){return f(n+1)+1} return{v:f(0)};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"maxStackBytes\":536870912}"),
    expect: JSON.parse("{\"fault\":\"stack_overflow\"}"),
  },
  {
    id: "E28",
    title: "escape case E28",
    source: "const a=[];for(;;)a.push(new Array(100000).fill(1));",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"timeoutMs\":5000}"),
    expect: JSON.parse("{\"fault\":\"memory_limit\"}"),
  },
  {
    id: "E29",
    title: "escape case E29",
    source: "let s='x'; for(;;) s+=s;",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"timeoutMs\":3000}"),
    expect: JSON.parse("{\"fault\":[\"memory_limit\",\"runtime_error\"]}"),
  },
  {
    id: "E30",
    title: "escape case E30",
    source: "const keep=[];for(;;){try{keep.push(new Array(50000).fill(2))}catch(e){}}",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"timeoutMs\":600}"),
    expect: JSON.parse("{\"fault\":[\"timeout\",\"memory_limit\"]}"),
  },
  {
    id: "E31",
    title: "escape case E31",
    source: "return{big:'x'.repeat(2000000)};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"maxOutputBytes\":100000,\"memoryBytes\":67108864}"),
    expect: JSON.parse("{\"fault\":\"output_too_large\"}"),
  },
  {
    id: "E32",
    title: "escape case E32",
    source: "const o={};for(let i=0;i<20000;i++)o['k'+i]=i;return o;",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"maxOutputBytes\":100000}"),
    expect: JSON.parse("{\"fault\":\"output_too_large\"}"),
  },
  {
    id: "E33",
    title: "escape case E33",
    source: "try{const r=await fetch('http://localhost:18930/ok');return{s:r.status}}catch(e){return{threw:e.name,type:typeof fetch}}",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"threw\":\"ReferenceError\",\"type\":\"undefined\"}}"),
  },
  {
    id: "E46",
    title: "escape case E46",
    source: "return{a:eval('1 + 2'),b:new Function('return typeof process')(),c:(0,eval)('typeof require'),d:eval('typeof globalThis.__hf')};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"a\":3,\"b\":\"undefined\",\"c\":\"undefined\",\"d\":\"undefined\"}}"),
  },
  {
    id: "E47",
    title: "escape case E47",
    source: "try{return{p:eval('process.pid')}}catch(e){return{threw:e.name}}",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"threw\":\"ReferenceError\"}}"),
  },
  {
    id: "E48",
    title: "escape case E48",
    source: "const o={}; for(const k of 'Atomics SharedArrayBuffer WebAssembly WeakRef FinalizationRegistry Intl gc WebAssemblyInstance'.split(' '))o[k]=typeof globalThis[k]; try{new SharedArrayBuffer(8);o.sab='constructed'}catch(e){o.sab=e.name} return o;",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"Atomics\":\"undefined\",\"FinalizationRegistry\":\"undefined\",\"Intl\":\"undefined\",\"SharedArrayBuffer\":\"undefined\",\"WeakRef\":\"undefined\",\"WebAssembly\":\"undefined\",\"WebAssemblyInstance\":\"undefined\",\"gc\":\"undefined\",\"sab\":\"ReferenceError\"}}"),
  },
  {
    id: "E49",
    title: "escape case E49",
    source: "const t0=Date.now(); let x=0; for(let i=0;i<3000000;i++)x+=i; const t1=Date.now(); return{delta:t1-t0,same:Date.now()===new Date().getTime()&&new Date().toISOString()===new Date(Date.now()).toISOString(),perf:typeof performance};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"timeoutMs\":3000}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"delta\":0,\"perf\":\"undefined\",\"same\":true}}"),
  },
  {
    id: "E50",
    title: "escape case E50",
    source: "const target=Date.now(); const tries=[]; try{Date.now=()=>1}catch(e){tries.push('assign:'+e.name)} try{Object.defineProperty(Date,'now',{value:()=>2})}catch(e){tries.push('define:'+e.name)} class D2 extends Date{} const routes=[D2.now(),new D2().getTime(),Object.getPrototypeOf(new Date()).constructor.now(),new Date().constructor.now(),(function(){}).constructor('return Date.now()')(),Date.now()]; return{allEqual:routes.every(v=>v===target),tries};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"allEqual\":true,\"tries\":[\"assign:TypeError\",\"define:TypeError\"]}}"),
  },
  {
    id: "E51",
    title: "escape case E51",
    source: "const first=Math.random(); let threw=''; try{Math.random=()=>0.5}catch(e){threw=e.name} return{threw,pinned:Math.random()===0.5,moved:first!==Math.random()};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"moved\":true,\"pinned\":false,\"threw\":\"TypeError\"}}"),
  },
  {
    id: "E53",
    title: "escape case E53",
    source: "return JSON.parse('{\"__proto__\":{\"polluted\":1},\"x\":2}');",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"fault\":\"output_invalid\"}"),
  },
  {
    id: "E54",
    title: "escape case E54",
    source: "return undefined;",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"fault\":\"output_invalid\"}"),
    hookExpect: JSON.parse("{\"ok\":true,\"value\":null}"),
  },
  {
    id: "E55",
    title: "escape case E55",
    source: "try{null.x}catch(e){return{leaks:/\\/Users|node_modules|file:\\/\\/|quickjs-emscripten/.test(String(e.stack))}} return {};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"leaks\":false}}"),
  },
  {
    id: "E56",
    title: "escape case E56",
    source: "JSON.stringify=()=>'{\"evil\":true}'; JSON.parse=()=>({evil:true}); Promise.prototype.then=()=>{}; Array.prototype.push=()=>{}; Object.keys=()=>[]; return{good:[1,2,3]};",
    input: JSON.parse("{}"),
    limits: JSON.parse("{}"),
    expect: JSON.parse("{\"ok\":true,\"value\":{\"good\":[1,2,3]}}"),
  },
  {
    id: "E59",
    title: "escape case E59",
    source: "const a = []; for (let i = 0; i < 30; i++) a.push(new Array(200000).fill(i)); return { n: a.length };",
    input: JSON.parse("{}"),
    limits: JSON.parse("{\"memoryBytes\":16777216,\"timeoutMs\":3000}"),
    expect: JSON.parse("{\"fault\":\"memory_limit\"}"),
  },
];

function codesOf(expect: { fault: SandboxFaultCode | readonly SandboxFaultCode[] }): readonly SandboxFaultCode[] {
  return typeof expect.fault === "string" ? [expect.fault] : expect.fault;
}

function expectedText(expect: EscapeExpect): string {
  if ("fault" in expect) return `fault ${codesOf(expect).join("|")}`;
  return expect.value === undefined ? "ok" : `ok ${JSON.stringify(expect.value)}`;
}

function actualText(result: SandboxResult): string {
  if (!result.ok) return `fault ${result.fault.code}`;
  return `ok ${JSON.stringify(result.value)}`;
}

/**
 * Returns null when the result satisfies the case in the given mode, otherwise the verdict text.
 * In "hook" mode a case's hookExpect replaces its expect.
 */
export function checkEscapeCase(
  c: EscapeCase,
  result: SandboxResult,
  mode: "node" | "hook",
): string | null {
  const expect = mode === "hook" && c.hookExpect !== undefined ? c.hookExpect : c.expect;
  const pass =
    "fault" in expect
      ? !result.ok && codesOf(expect).includes(result.fault.code)
      : result.ok &&
        (expect.value === undefined || isDeepStrictEqual(result.value, expect.value));
  if (pass) return null;
  return `${c.id}: expected ${expectedText(expect)}, got ${actualText(result)}`;
}
