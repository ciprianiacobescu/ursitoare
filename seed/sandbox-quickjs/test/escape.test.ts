import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { runCode, MAX_STACK_BYTES, diagnostics } from '../src/index.ts';
import type { RunResult, Limits, RunCodeOptions, FetchRecord } from '../src/index.ts';
import { startStub, STUB_ORIGIN } from './stub-server.ts';
import type { Stub } from './stub-server.ts';

const LIMITS: Limits = { timeoutMs: 400, memoryBytes: 16 << 20, maxStackBytes: 64 << 10, maxOutputBytes: 100_000 };
const NOW = '2026-10-24T12:00:00.000Z';
const NOW_MS = Date.parse(NOW);

function run(source: string, extra: Partial<RunCodeOptions> = {}): Promise<RunResult> {
  return runCode({ source, input: {}, limits: LIMITS, seed: 1, nowIso: NOW, ...extra });
}
const summarize = (r: RunResult) => (r.ok ? `ok ${JSON.stringify(r.output)}` : `error ${r.error.code}: ${r.error.message}`).slice(0, 220);

interface Row { id: string; case: string; expected: string; actual: string; pass: boolean }
const rows: Row[] = [];
let stub: Stub;
const HOST_PROTO_KEYS_BEFORE = Object.getOwnPropertyNames(Object.prototype).sort().join(',');

before(async () => { stub = await startStub(); });
after(async () => {
  // The host's own Object.prototype must be bit-for-bit untouched after the whole suite.
  assert.equal(Object.getOwnPropertyNames(Object.prototype).sort().join(','), HOST_PROTO_KEYS_BEFORE);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  await stub.close();
  writeFileSync(new URL('../results/escape-suite.json', import.meta.url), JSON.stringify(rows, null, 2));
  writeFileSync(new URL('../results/escape-diagnostics.json', import.meta.url), JSON.stringify({ moduleResetsDuringSuite: diagnostics.moduleResets, note: 'each reset = a Wasm instance abandoned after an emscripten abort / V8 stack fault and replaced' }, null, 2));
});

/** Registers a case. `check` returns [pass, actualText]; a throw counts as a failure. */
function c(id: string, title: string, expected: string, fn: () => Promise<[boolean, string]>): void {
  test(`${id} ${title}`, async () => {
    let pass = false;
    let actual = '';
    try {
      [pass, actual] = await fn();
    } catch (e) {
      actual = `TEST THREW ${(e as Error).message}`;
    }
    rows.push({ id, case: title, expected, actual, pass });
    assert.ok(pass, `${id} ${title}: ${actual}`);
  });
}
const expectErr = (code: string, re?: RegExp) => (r: RunResult): [boolean, string] => [!r.ok && r.error.code === code && (!re || re.test(r.error.message)), summarize(r)];

// ---------------------------------------------------------------- host access
c('E01', 'typeof process/require/module/Buffer/global/window/self/setTimeout/setInterval/setImmediate/queueMicrotask/console/structuredClone/TextEncoder/URL/performance/navigator',
  'every name is "undefined"', async () => {
    const names = ['process', 'require', 'module', 'exports', 'Buffer', 'global', 'window', 'self', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'console', 'structuredClone', 'TextEncoder', 'URL', 'performance', 'navigator', '__dirname', '__filename', 'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker', 'std', 'os', '__hf', 'hostFetch'];
    const r = await run(`const n = ${JSON.stringify(names)}; const o = {}; for (const k of n) o[k] = typeof globalThis[k]; return o;`);
    return [r.ok && Object.values(r.output).every((v) => v === 'undefined'), summarize(r)];
  });
c('E02', 'process.env.HOME', 'runtime_error ReferenceError: process is not defined', async () => {
  const r = await run(`return { home: process.env.HOME };`);
  return expectErr('runtime_error', /ReferenceError: '?process'? is not defined/)(r);
});
c('E03', "require('fs')", 'runtime_error ReferenceError: require is not defined', async () => expectErr('runtime_error', /ReferenceError: '?require'? is not defined/)(await run(`const fs = require('fs'); return { x: fs.readdirSync('/') };`)));
c('E04', "await import('fs') (dynamic import)", 'runtime_error (no module loader: could not load module)', async () => expectErr('runtime_error', /could not load module/)(await run(`const m = await import('fs'); return { k: Object.keys(m) };`)));
c('E05', "import fs from 'fs' (static import in body)", 'syntax_error', async () => expectErr('syntax_error')(await run(`import fs from 'fs'; return {};`)));
c('E06', 'import.meta / new.target at top of body', 'syntax_error', async () => expectErr('syntax_error')(await run(`return { u: import.meta.url };`)));
c('E07', 'Object.getOwnPropertyNames(globalThis) equals the ES-builtin snapshot', 'exactly the 58 ES builtins listed in README (no host names)', async () => {
  const r = await run(`return { g: Object.getOwnPropertyNames(globalThis).sort() };`);
  const EXPECTED = ['AggregateError', 'Array', 'ArrayBuffer', 'BigInt', 'BigInt64Array', 'BigUint64Array', 'Boolean', 'DataView', 'Date', 'Error', 'EvalError', 'Float16Array', 'Float32Array', 'Float64Array', 'Function', 'Infinity', 'Int16Array', 'Int32Array', 'Int8Array', 'InternalError', 'Iterator', 'JSON', 'Map', 'Math', 'NaN', 'Number', 'Object', 'Promise', 'Proxy', 'RangeError', 'ReferenceError', 'Reflect', 'RegExp', 'Set', 'String', 'Symbol', 'SyntaxError', 'TypeError', 'URIError', 'Uint16Array', 'Uint32Array', 'Uint8Array', 'Uint8ClampedArray', 'WeakMap', 'WeakSet', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'eval', 'globalThis', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'undefined', 'unescape'];
  const got = r.ok ? (r.output.g as string[]) : [];
  const extra = got.filter((x) => !EXPECTED.includes(x));
  const missing = EXPECTED.filter((x) => !got.includes(x));
  return [r.ok && extra.length === 0 && missing.length === 0, r.ok ? `${got.length} globals; extra=${JSON.stringify(extra)} missing=${JSON.stringify(missing)}` : summarize(r)];
});
c('E08', "(function(){}).constructor('return typeof process')() and Function('return globalThis')()", 'ok: reaches only the sandbox global; process undefined', async () => {
  const r = await run(`const F = (function(){}).constructor; const g = F('return globalThis')(); return { a: F('return typeof process')(), b: typeof g.process, c: g === globalThis, d: typeof g.require };`);
  return [r.ok && r.output.a === 'undefined' && r.output.b === 'undefined' && r.output.c === true && r.output.d === 'undefined', summarize(r)];
});
c('E09', "({}).constructor.constructor('return process')() chain", 'runtime_error ReferenceError: process is not defined', async () => expectErr('runtime_error', /'?process'? is not defined/)(await run(`return { p: ({}).constructor.constructor('return process')() };`)));
c('E10', 'AsyncFunction / GeneratorFunction constructors to reach host', 'ok: still sandbox global only', async () => {
  const r = await run(`const AF = Object.getPrototypeOf(async function(){}).constructor; const GF = Object.getPrototypeOf(function*(){}).constructor; return { a: await AF('return typeof process')(), g: typeof GF('return typeof require')().next().value };`);
  return [r.ok && r.output.a === 'undefined' && r.output.g === 'string', summarize(r)];
});
c('E11', 'Crawl every object reachable from globalThis (props, prototypes, constructors) for host-looking names', 'no property named process/require/__hf/hostFetch/Buffer/fs/child_process; crawl size reported', async () => {
  const r = await run(`
    const deny = new Set(['process','require','__hf','hostFetch','Buffer','fs','child_process','module','__proto_host__']);
    const seen = new Set(); const q = [globalThis]; const hits = []; let n = 0;
    while (q.length && n < 20000) {
      const o = q.shift(); if (seen.has(o)) continue; seen.add(o); n++;
      let names = []; try { names = Reflect.ownKeys(o); } catch {}
      for (const k of names) {
        if (typeof k === 'string' && deny.has(k)) hits.push(k);
        let d; try { d = Object.getOwnPropertyDescriptor(o, k); } catch { continue; }
        if (!d) continue;
        for (const v of [d.value, d.get, d.set]) if ((typeof v === 'object' && v !== null) || typeof v === 'function') q.push(v);
      }
      try { const p = Object.getPrototypeOf(o); if (p) q.push(p); } catch {}
    }
    return { hits, crawled: n };`, { limits: { ...LIMITS, timeoutMs: 2000 } });
  return [r.ok && (r.output.hits as string[]).length === 0, summarize(r)];
});
c('E12', 'E11 crawl again with fetch enabled (the bridge function must not be reachable)', 'no __hf/hostFetch reachable', async () => {
  const r = await run(`
    const seen = new Set(); const q = [globalThis]; const hits = []; let n = 0;
    while (q.length && n < 20000) {
      const o = q.shift(); if (seen.has(o)) continue; seen.add(o); n++;
      for (const k of Reflect.ownKeys(o)) {
        let d; try { d = Object.getOwnPropertyDescriptor(o, k); } catch { continue; }
        if (!d) continue;
        for (const v of [d.value, d.get, d.set]) {
          if (typeof v === 'function' && (v.name === '__hf' || v.name === 'hostFetch')) hits.push(v.name);
          if ((typeof v === 'object' && v !== null) || typeof v === 'function') q.push(v);
        }
      }
      const p = Object.getPrototypeOf(o); if (p) q.push(p);
    }
    return { hits, crawled: n, hasFetch: typeof fetch };`, { fetchAllowlist: [STUB_ORIGIN], limits: { ...LIMITS, timeoutMs: 2000 } });
  return [r.ok && (r.output.hits as string[]).length === 0 && r.output.hasFetch === 'function', summarize(r)];
});
c('E13', 'top-level `this` and `arguments.callee`, `with` in strict wrapper', '`this` is undefined; `with` is a syntax_error', async () => {
  const a = await run(`return { t: typeof this };`);
  const b = await run(`with ({}) { return {}; }`);
  return [a.ok && a.output.t === 'undefined' && !b.ok && b.error.code === 'syntax_error', `${summarize(a)} | ${summarize(b)}`];
});

// ---------------------------------------------------------------- pollution / isolation
c('E14', 'prototype pollution via input (naive deep merge of {"__proto__":{"polluted":true}}), then check host Object.prototype', 'guest sees pollution only inside its own context; host Object.prototype untouched', async () => {
  const input = JSON.parse('{"__proto__":{"polluted":"yes"},"a":1}');
  const r = await run(`
    function merge(t, s) { for (const k in s) { if (s[k] && typeof s[k] === 'object') { t[k] = merge(t[k] || {}, s[k]); } else { t[k] = s[k]; } } return t; }
    merge({}, input);
    return { guestSees: ({}).polluted ?? null, hadOwnProto: Object.hasOwn(input, '__proto__') };`, { input });
  const hostClean = ({} as Record<string, unknown>).polluted === undefined && !Object.hasOwn(Object.prototype, 'polluted');
  return [r.ok && r.output.guestSees === 'yes' && hostClean, `${summarize(r)} hostClean=${hostClean}`];
});
c('E15', 'fresh context per run: globals, prototype edits and Math.random override in run A are invisible to run B', 'run B sees none of run A\'s state and the original seeded random sequence', async () => {
  const a = await run(`globalThis.secret = 'S3CR3T'; Object.prototype.leak = 1; Array.prototype.leak = 2; String.prototype.leak = 3; Date.prototype.leak = 4; try { Math.random = () => 4; } catch (e) {} return { ok: 1 };`);
  const b = await run(`return { secret: typeof globalThis.secret, o: ({}).leak ?? null, ar: [].leak ?? null, s: 'x'.leak ?? null, d: new Date().leak ?? null, rnd: Math.random() };`);
  const ref = await run(`return { rnd: Math.random() };`);
  return [a.ok && b.ok && b.output.secret === 'undefined' && b.output.o === null && b.output.ar === null && b.output.s === null && b.output.d === null && ref.ok && b.output.rnd === ref.output.rnd, `A: ${summarize(a)} | B: ${summarize(b)}`];
});
c('E16', 'input is a JSON copy: guest mutation of input does not touch the host object; host mutation after the call is irrelevant', 'caller-side object unchanged; guest saw a deep copy', async () => {
  const input = { n: { deep: [1, 2, 3] }, s: 'x' };
  const snapshot = JSON.stringify(input);
  const r = await run(`input.n.deep.push(99); input.s = 'changed'; delete input.n; return { len: Object.keys(input).length };`, { input });
  return [r.ok && JSON.stringify(input) === snapshot, `${summarize(r)} host input after: ${JSON.stringify(input)}`];
});
c('E17', 'host input that cannot be JSON-copied faithfully: function, undefined, BigInt, Date, cycle, getter, NaN', 'input_invalid for each', async () => {
  const cyc: Record<string, unknown> = {}; cyc.self = cyc;
  const bad: unknown[] = [{ f: () => 1 }, { u: undefined }, { b: 1n }, { d: new Date() }, cyc, { get g() { return 1; } }, { n: NaN }, [1, , 3]];
  const codes: string[] = [];
  for (const input of bad) { const r = await run(`return {};`, { input }); codes.push(r.ok ? 'ok!' : r.error.code); }
  return [codes.every((x) => x === 'input_invalid'), codes.join(',')];
});

// ---------------------------------------------------------------- resource limits
c('E18', 'infinite loop for(;;){}', 'timeout within ~timeoutMs+250ms', async () => {
  const t = performance.now(); const r = await run(`for(;;){}`); const dt = performance.now() - t;
  return [!r.ok && r.error.code === 'timeout' && dt < LIMITS.timeoutMs + 250, `${summarize(r)} wall=${dt.toFixed(0)}ms (limit ${LIMITS.timeoutMs})`];
});
c('E19', 'infinite loop wrapped in try/catch inside while(true)', 'timeout (interrupt is uncatchable)', async () => expectErr('timeout')(await run(`while (true) { try { for(;;){} } catch (e) {} }`)));
c('E20', 'infinite microtask chain (Promise.then re-queues itself) + await never-resolving promise', 'ends in timeout, memory_limit or never_settled (promise chain grows until the heap cap); bounded wall time', async () => {
  let ticks = 0; const iv = setInterval(() => ticks++, 20);
  const r = await run(`const f = () => Promise.resolve().then(f); f(); await new Promise(() => {}); return {};`);
  clearInterval(iv);
  return [!r.ok && (r.error.code === 'timeout' || r.error.code === 'memory_limit' || r.error.code === 'never_settled'), `${summarize(r)} (host timers fired during run: ${ticks}; 0 is expected: the pump is synchronous)`];
});
c('E21', 'infinite loop inside a then-callback and in a getter', 'timeout', async () => {
  const a = await run(`await Promise.resolve().then(() => { for(;;){} }); return {};`);
  const b = await run(`const o = { get x() { for(;;){} } }; return { v: o.x };`);
  return [!a.ok && a.error.code === 'timeout' && !b.ok && b.error.code === 'timeout', `${summarize(a)} | ${summarize(b)}`];
});
c('E22', 'catastrophic regex /(a+)+$/ on 40 a\'s + "!"', 'timeout (regex engine honours the interrupt handler)', async () => {
  const t = performance.now(); const r = await run(`return { m: /(a+)+$/.test('a'.repeat(40) + '!') };`); const dt = performance.now() - t;
  return [!r.ok && r.error.code === 'timeout' && dt < LIMITS.timeoutMs + 250, `${summarize(r)} wall=${dt.toFixed(0)}ms`];
});
c('E23', 'second ReDoS shape: /^(([a-z])+.)+[A-Z]([a-z])+$/ and String.replace with nested quantifier', 'timeout', async () => {
  const a = await run(`return { m: /^(([a-z])+.)+[A-Z]([a-z])+$/.test('a'.repeat(60) + '!') };`);
  const b = await run(`return { m: ('a'.repeat(50) + 'b').replace(/(x+x+)+y/g, '') .length + /(a|aa)+$/.test('a'.repeat(60) + 'b') };`);
  return [!a.ok && a.error.code === 'timeout' && !b.ok && b.error.code === 'timeout', `${summarize(a)} | ${summarize(b)}`];
});
c('E24', 'deep recursion function f(){return f()+1}', 'stack_overflow (clean guest RangeError)', async () => expectErr('stack_overflow')(await run(`function f(n) { return f(n + 1) + 1; } return { v: f(0) };`)));
c('E25', 'deep recursion caught by user code', 'ok: user can catch it, run stays contained', async () => {
  const r = await run(`let depth = 0; function f() { depth++; return f() + 1; } try { f(); } catch (e) { return { name: e.name, deepEnough: depth > 100 }; }`);
  return [r.ok && /^(InternalError|RangeError)$/.test(String(r.output.name)) && r.output.deepEnough === true, summarize(r)];
});
c('E26', 'native-recursion bombs at the max stack: JSON.parse nesting, JSON.stringify nesting, Array.flat, toString of nested arrays, Proxy chain, getter chain', 'never sandbox_crash; each fails as a guest error or succeeds', async () => {
  const bodies: Record<string, string> = {
    jsonParse: `const s = '['.repeat(200000) + ']'.repeat(200000); return { v: JSON.parse(s).length };`,
    jsonStringify: `let a = []; for (let i = 0; i < 200000; i++) a = [a]; return { v: JSON.stringify(a).length };`,
    flat: `let a = []; for (let i = 0; i < 200000; i++) a = [a]; return { v: a.flat(Infinity).length };`,
    toString: `let a = []; for (let i = 0; i < 200000; i++) a = [a]; return { v: String(a).length };`,
    proxy: `let p = {}; for (let i = 0; i < 100000; i++) p = new Proxy(p, {}); return { v: typeof p.x };`,
    getter: `let o = { get x() { return o.x; } }; return { v: o.x };`,
    apply: `function f() { return f.apply(null, []); } return { v: f() };`,
    bind: `let f = function () { return 1; }; for (let i = 0; i < 100000; i++) f = f.bind(null); return { v: f() };`,
    promiseChain: `let p = Promise.resolve(1); for (let i = 0; i < 200000; i++) p = p.then(x => x + 1); return { v: await p };`,
    sortCmp: `function f(){ [2,1].sort(() => f()); } f(); return {};`,
  };
  const out: string[] = []; let okAll = true;
  for (const [k, body] of Object.entries(bodies)) {
    const r = await run(body, { limits: { ...LIMITS, maxStackBytes: MAX_STACK_BYTES, timeoutMs: 2000, memoryBytes: 64 << 20 } });
    out.push(`${k}=${r.ok ? 'ok' : r.error.code}`);
    if (!r.ok && (r.error.code === 'sandbox_crash')) okAll = false;
  }
  const after = await run(`return { alive: 1 };`);
  return [okAll && after.ok, `${out.join(' ')} | next run: ${summarize(after)}`];
});
c('E27', 'requested maxStackBytes of 512 MB is clamped; recursion still gives stack_overflow, not a Wasm/V8 crash', 'stack_overflow', async () => expectErr('stack_overflow')(await run(`function f(n) { return f(n + 1) + 1; } return { v: f(0) };`, { limits: { ...LIMITS, maxStackBytes: 512 << 20 } })));
c('E28', 'memory bomb: push 100k-element arrays forever', 'memory_limit', async () => {
  const r = await run(`const a = []; for (;;) a.push(new Array(100000).fill(1));`, { limits: { ...LIMITS, timeoutMs: 5000 } });
  return expectErr('memory_limit')(r);
});
c('E29', 'memory bomb: string doubling s += s; new Array(2**32-1).fill(0); 2n**100000000n; new Uint8Array(2**31)', 'each ends in memory_limit or runtime_error (RangeError / string too long); never a host crash', async () => {
  const bodies = [`let s = 'x'; for (;;) s += s;`, `return { v: new Array(2 ** 32 - 1).fill(0).length };`, `return { v: String(2n ** 100000000n).length };`, `return { v: new Uint8Array(2 ** 31).length };`, `return { v: 'x'.repeat(2 ** 30).length };`];
  const codes: string[] = [];
  for (const b of bodies) { const r = await run(b, { limits: { ...LIMITS, timeoutMs: 3000 } }); codes.push(r.ok ? 'ok!' : r.error.code); }
  return [codes.every((x) => x === 'memory_limit' || x === 'runtime_error'), codes.join(',')];
});
c('E30', 'guest catches OOM and keeps allocating', 'terminates (memory_limit or timeout), never ok', async () => {
  const r = await run(`const keep = []; for (;;) { try { keep.push(new Array(50000).fill(2)); } catch (e) { /* swallow */ } }`, { limits: { ...LIMITS, timeoutMs: 600 } });
  return [!r.ok && (r.error.code === 'timeout' || r.error.code === 'memory_limit'), summarize(r)];
});
c('E31', 'huge output: 2 MB string with maxOutputBytes=100000', 'output_too_large', async () => {
  const r = await run(`return { big: 'x'.repeat(2000000) };`, { limits: { ...LIMITS, memoryBytes: 64 << 20 } });
  return expectErr('output_too_large')(r);
});
c('E32', 'huge output built from many small keys / multi-byte characters (UTF-8 > UTF-16 length)', 'output_too_large', async () => {
  const a = await run(`const o = {}; for (let i = 0; i < 20000; i++) o['k' + i] = i; return o;`);
  const b = await run(`return { s: '€'.repeat(40000) };`); // 40k UTF-16 units but 120k UTF-8 bytes
  return [!a.ok && a.error.code === 'output_too_large' && !b.ok && b.error.code === 'output_too_large', `${summarize(a)} | ${summarize(b)}`];
});

// ---------------------------------------------------------------- fetch gateway
c('E33', 'fetch with no fetchAllowlist (default)', 'fetch is not defined: runtime_error ReferenceError', async () => expectErr('runtime_error', /'?fetch'? is not defined/)(await run(`const r = await fetch('http://localhost:18930/ok'); return { s: r.status };`)));
c('E34', 'fetch to a non-allowlisted host (https://example.com, http://169.254.169.254/latest/meta-data)', 'fetch_denied; zero network traffic', async () => {
  stub.reset();
  const a = await run(`const r = await fetch('https://example.com/'); return { s: r.status };`, { fetchAllowlist: [STUB_ORIGIN] });
  const b = await run(`const r = await fetch('http://169.254.169.254/latest/meta-data/'); return { s: r.status };`, { fetchAllowlist: [STUB_ORIGIN] });
  return [!a.ok && a.error.code === 'fetch_denied' && !b.ok && b.error.code === 'fetch_denied' && stub.total() === 0, `${summarize(a)} | ${summarize(b)} | stubHits=${stub.total()}`];
});
c('E35', 'allowlist is an exact-origin match: 127.0.0.1:18930, localhost:18931, https://localhost:18930, userinfo trick, subdomain trick', 'fetch_denied for all; stub never hit', async () => {
  stub.reset();
  const urls = ['http://127.0.0.1:18930/ok', 'http://localhost:18931/ok', 'https://localhost:18930/ok', 'http://localhost:18930@evil.example/ok', 'http://localhost:18930.evil.example/ok', 'http://localhost:18930:80/ok', 'HTTP://LOCALHOST:18930@127.0.0.1:18930/ok', '//localhost:18930/ok', '/ok', 'localhost:18930/ok'];
  const codes: string[] = [];
  for (const u of urls) { const r = await run(`await fetch(${JSON.stringify(u)}); return {};`, { fetchAllowlist: [STUB_ORIGIN] }); codes.push(r.ok ? 'ALLOWED!' : r.error.code); }
  return [codes.every((x) => x === 'fetch_denied') && stub.total() === 0, `${codes.join(',')} stubHits=${stub.total()}`];
});
c('E36', 'redirect to a non-allowlisted origin (302 -> http://127.0.0.1:18930/secret)', 'not followed: guest gets the 302 + location header; /secret is never requested', async () => {
  stub.reset();
  const r = await run(`const r = await fetch('${STUB_ORIGIN}/redirect-evil'); return { status: r.status, loc: r.headers.get('location'), redirected: r.redirected, body: await r.text() };`, { fetchAllowlist: [STUB_ORIGIN] });
  return [r.ok && r.output.status === 302 && r.output.redirected === false && stub.hits['/secret'] === undefined && stub.hits['/redirect-evil'] === 1, `${summarize(r)} stubHits=${JSON.stringify(stub.hits)}`];
});
c('E37', 'redirect to a path on the allowlisted origin (302 -> /secret)', 'also not followed (redirects are never followed)', async () => {
  stub.reset();
  const r = await run(`const r = await fetch('${STUB_ORIGIN}/redirect-internal'); return { status: r.status, loc: r.headers.get('location') };`, { fetchAllowlist: [STUB_ORIGIN] });
  return [r.ok && r.output.status === 302 && stub.hits['/secret'] === undefined, `${summarize(r)} stubHits=${JSON.stringify(stub.hits)}`];
});
c('E38', 'file:///etc/passwd, data:, ftp:, javascript:, blob:, ws:, gopher: URLs', 'fetch_denied (scheme not allowed)', async () => {
  const urls = ['file:///etc/passwd', 'data:text/plain,hi', 'ftp://localhost:18930/x', 'javascript:alert(1)', 'blob:http://localhost:18930/uuid', 'ws://localhost:18930/', 'gopher://localhost:18930/'];
  const codes: string[] = [];
  for (const u of urls) { const r = await run(`await fetch(${JSON.stringify(u)}); return {};`, { fetchAllowlist: [STUB_ORIGIN] }); codes.push(r.ok ? 'ALLOWED!' : `${r.error.code}`); }
  return [codes.every((x) => x === 'fetch_denied'), codes.join(',')];
});
c('E39', 'allowlisted GET and POST work and are recorded', 'ok; two FetchRecords with status 200', async () => {
  stub.reset();
  const r = await run(`const a = await fetch('${STUB_ORIGIN}/ok'); const j = await a.json(); const b = await fetch('${STUB_ORIGIN}/echo', { method: 'POST', body: JSON.stringify({ q: 1 }), headers: { 'Content-Type': 'application/json' } }); return { hello: j.hello, echoed: await b.text(), ct: a.headers.get('content-type') };`, { fetchAllowlist: [STUB_ORIGIN] });
  const log = r.fetchLog;
  return [r.ok && r.output.hello === 'world' && r.output.echoed === '{"q":1}' && log.length === 2 && log[0].response?.status === 200 && log[1].requestBody === '{"q":1}', `${summarize(r)} log=${log.length}`];
});
c('E40', 'forbidden headers (host, content-length), bad method, oversized response, too many requests', 'fetch_denied / fetch_failed', async () => {
  const a = await run(`await fetch('${STUB_ORIGIN}/ok', { headers: { Host: 'evil' } }); return {};`, { fetchAllowlist: [STUB_ORIGIN] });
  const b = await run(`await fetch('${STUB_ORIGIN}/ok', { method: 'TRACE' }); return {};`, { fetchAllowlist: [STUB_ORIGIN] });
  const d = await run(`await fetch('${STUB_ORIGIN}/big'); return {};`, { fetchAllowlist: [STUB_ORIGIN], fetchMaxResponseBytes: 1_000_000 });
  const e = await run(`for (let i = 0; i < 5; i++) await fetch('${STUB_ORIGIN}/ok'); return {};`, { fetchAllowlist: [STUB_ORIGIN], fetchMaxRequests: 3 });
  return [!a.ok && a.error.code === 'fetch_denied' && !b.ok && b.error.code === 'fetch_denied' && !d.ok && d.error.code === 'fetch_failed' && !e.ok && e.error.code === 'fetch_failed', `${a.ok ? 'ok' : a.error.code},${b.ok ? 'ok' : b.error.code},${d.ok ? 'ok' : d.error.code},${e.ok ? 'ok' : e.error.code}`];
});
c('E41', 'slow upstream (2 s) with timeoutMs=300', 'timeout; in-flight request aborted', async () => {
  const t = performance.now();
  const r = await run(`const r = await fetch('${STUB_ORIGIN}/slow'); return { s: r.status };`, { fetchAllowlist: [STUB_ORIGIN], limits: { ...LIMITS, timeoutMs: 300 } });
  const dt = performance.now() - t;
  return [!r.ok && r.error.code === 'timeout' && dt < 800, `${summarize(r)} wall=${dt.toFixed(0)}ms`];
});
c('E42', 'guest can catch the denial and keep going (denial is an exception, not a crash)', 'ok with caught:true; denied attempt visible in fetchLog', async () => {
  const r = await run(`try { await fetch('https://evil.example/x'); return { caught: false }; } catch (e) { return { caught: true, name: e.name }; }`, { fetchAllowlist: [STUB_ORIGIN] });
  return [r.ok && r.output.caught === true && r.output.name === 'FetchDeniedError' && r.fetchLog[0]?.error?.name === 'FetchDeniedError', `${summarize(r)} log0=${JSON.stringify(r.fetchLog[0]?.error)}`];
});
c('E43', 'allowlist http://localhost:18902 (the brief\'s value) with an injected fetchImpl: 18902 passes policy, 18930 is denied', 'policy allows 18902 only; no real network used', async () => {
  const seen: string[] = [];
  const fake = (async (u: string | URL | Request) => { seen.push(String(u)); return new Response('{"from":"fake"}', { status: 200 }); }) as typeof fetch;
  const a = await run(`const r = await fetch('http://localhost:18902/blocks/x@1', { method: 'POST', body: '{}' }); return await r.json();`, { fetchAllowlist: ['http://localhost:18902'], fetchImpl: fake });
  const b = await run(`await fetch('${STUB_ORIGIN}/ok'); return {};`, { fetchAllowlist: ['http://localhost:18902'], fetchImpl: fake });
  return [a.ok && a.output.from === 'fake' && !b.ok && b.error.code === 'fetch_denied' && seen.length === 1, `${summarize(a)} | ${summarize(b)} fakeSaw=${seen.join(',')}`];
});
c('E44', 'replay mode: recorded responses are returned with the network unreachable', 'identical output, zero stub hits; mismatched call -> replay_mismatch', async () => {
  stub.reset();
  const src = `const a = await fetch('${STUB_ORIGIN}/nondeterministic'); const j = await a.json(); return { n: j.n, t: j.t, r: j.r, c: a.headers.get('x-counter') };`;
  const live = await run(src, { fetchAllowlist: [STUB_ORIGIN] });
  const hitsAfterLive = stub.total();
  const rec: FetchRecord[] = live.fetchLog;
  const replay1 = await run(src, { fetchAllowlist: [STUB_ORIGIN], fetchReplay: rec });
  const replay2 = await run(src, { fetchAllowlist: [STUB_ORIGIN], fetchReplay: rec });
  const live2 = await run(src, { fetchAllowlist: [STUB_ORIGIN] });
  const mism = await run(`await fetch('${STUB_ORIGIN}/ok'); return {};`, { fetchAllowlist: [STUB_ORIGIN], fetchReplay: rec });
  const exhausted = await run(`await fetch('${STUB_ORIGIN}/nondeterministic'); await fetch('${STUB_ORIGIN}/nondeterministic'); return {};`, { fetchAllowlist: [STUB_ORIGIN], fetchReplay: rec });
  const same = live.ok && replay1.ok && replay2.ok && JSON.stringify(live.output) === JSON.stringify(replay1.output) && JSON.stringify(replay1.output) === JSON.stringify(replay2.output);
  const differsLive = live2.ok && live.ok && JSON.stringify(live2.output) !== JSON.stringify(live.output);
  return [same && differsLive && stub.total() === hitsAfterLive + 1 && !mism.ok && mism.error.code === 'replay_mismatch' && !exhausted.ok && exhausted.error.code === 'replay_mismatch',
    `live=${summarize(live)} replay=${summarize(replay1)} live2(differs)=${summarize(live2)} hitsAfterLive=${hitsAfterLive} totalAfterAll=${stub.total()} mism=${summarize(mism)} exhausted=${summarize(exhausted)}`];
});
c('E45', '12 concurrent runs with fetch (shared Wasm module, interleaved awaits)', 'all ok and identical', async () => {
  const src = `const rs = await Promise.all([1,2,3].map(i => fetch('${STUB_ORIGIN}/ok?i=' + i).then(r => r.json()))); return { n: rs.length, h: rs[0].hello, r: Math.random() };`;
  const all = await Promise.all(Array.from({ length: 12 }, () => run(src, { fetchAllowlist: [STUB_ORIGIN] })));
  const outs = new Set(all.map((r) => (r.ok ? JSON.stringify(r.output) : 'ERR ' + summarize(r))));
  return [outs.size === 1 && all[0].ok, `${[...outs][0]} (distinct outputs: ${outs.size})`];
});

// ---------------------------------------------------------------- eval, wasm, atomics, time
c('E46', 'eval and new Function inside the sandbox', 'allowed but contained: arithmetic works, process unreachable', async () => {
  const r = await run(`return { a: eval('1 + 2'), b: new Function('return typeof process')(), c: (0, eval)('typeof require'), d: eval('typeof globalThis.__hf') };`);
  return [r.ok && r.output.a === 3 && r.output.b === 'undefined' && r.output.c === 'undefined' && r.output.d === 'undefined', summarize(r)];
});
c('E47', 'eval cannot name host bindings: eval("process")', 'runtime_error ReferenceError', async () => expectErr('runtime_error', /'?process'? is not defined/)(await run(`return { p: eval('process.pid') };`)));
c('E48', 'Atomics, SharedArrayBuffer, WebAssembly, WeakRef, FinalizationRegistry, Intl, SIMD', 'all absent (typeof undefined); new SharedArrayBuffer -> ReferenceError', async () => {
  const r = await run(`const o = {}; for (const k of ['Atomics','SharedArrayBuffer','WebAssembly','WeakRef','FinalizationRegistry','Intl','gc','WebAssemblyInstance']) o[k] = typeof globalThis[k]; return o;`);
  const s = await run(`return { b: new SharedArrayBuffer(8).byteLength };`);
  return [r.ok && Object.values(r.output).every((v) => v === 'undefined') && !s.ok && /'?SharedArrayBuffer'? is not defined/.test(s.error.message), `${summarize(r)} | ${summarize(s)}`];
});
c('E49', 'timing attack via Date: busy loop delta, repeated Date.now(), new Date(), Date() string, performance', 'every reading equals nowIso; delta is exactly 0', async () => {
  const r = await run(`const t0 = Date.now(); let x = 0; for (let i = 0; i < 3000000; i++) x += i; const t1 = Date.now(); return { delta: t1 - t0, now: Date.now(), ctor: new Date().getTime(), perf: typeof performance, str: Date(), iso: new Date().toISOString() };`, { limits: { ...LIMITS, timeoutMs: 3000 } });
  return [r.ok && r.output.delta === 0 && r.output.now === NOW_MS && r.output.ctor === NOW_MS && r.output.iso === NOW && r.output.perf === 'undefined', summarize(r)];
});
c('E50', 'try to un-freeze the clock: assign Date.now, redefine, subclass, Date.prototype.constructor, reach the real Date via prototype chains', 'real clock unreachable: every route still returns nowIso', async () => {
  const r = await run(`
    const tries = [];
    try { Date.now = () => 1; } catch (e) { tries.push('assign:' + e.name); }
    try { Object.defineProperty(Date, 'now', { value: () => 2 }); } catch (e) { tries.push('define:' + e.name); }
    class D2 extends Date {}
    const viaSub = D2.now(); const viaSubNew = new D2().getTime();
    const viaProto = Object.getPrototypeOf(new Date()).constructor.now();
    const viaCtor = new Date().constructor.now();
    const viaF = (function(){}).constructor('return Date.now()')();
    return { tries, viaSub, viaSubNew, viaProto, viaCtor, viaF, nowStill: Date.now() };`);
  const o = r.ok ? r.output : {};
  const target = NOW_MS;
  return [r.ok && [o.viaSub, o.viaSubNew, o.viaProto, o.viaCtor, o.viaF, o.nowStill].every((v) => v === target), summarize(r)];
});
c('E51', 'Math.random cannot be made nondeterministic: attempts to reassign, or reach another Math', 'sequence still equals the seeded PRNG / assignment throws', async () => {
  const a = await run(`const first = Math.random(); let threw = ''; try { Math.random = () => 0.5; } catch (e) { threw = e.name; } return { first, second: Math.random(), threw };`, { seed: 7 });
  const b = await run(`return { first: Math.random(), second: Math.random() };`, { seed: 7 });
  return [a.ok && b.ok && a.output.first === b.output.first && a.output.threw === 'TypeError' && a.output.second === b.output.second, `${summarize(a)} | ${summarize(b)}`];
});
c('E52', 'host timezone must not leak: new Date(y,m,d), getTimezoneOffset, toString, local getters, legacy date strings, in a process with TZ=America/Los_Angeles', 'UTC results regardless of the process TZ', async () => {
  const { execFileSync } = await import('node:child_process');
  const probe = `import { runCode } from './src/index.ts';
    const r = await runCode({ source: "return { off: new Date().getTimezoneOffset(), h: new Date(2020,5,1,12).getHours(), s: String(new Date(2020,0,1)), p: Date.parse('2020-06-01T12:00:00'), l: String(Date.parse('Jun 1 2020 12:00')), d: new Date(0).getDate() };", input: {}, limits: { timeoutMs: 500, memoryBytes: 16<<20, maxStackBytes: 128<<10, maxOutputBytes: 10000 }, seed: 1, nowIso: '${NOW}' });
    console.log(JSON.stringify(r.ok ? r.output : r.error));`;
  const outs = ['UTC', 'America/Los_Angeles', 'Asia/Kolkata', 'Pacific/Auckland'].map((tz) => execFileSync(process.execPath, ['--input-type=module', '-e', probe], { env: { ...process.env, TZ: tz }, cwd: new URL('..', import.meta.url).pathname }).toString().trim());
  return [new Set(outs).size === 1 && outs[0].includes('"off":0') && outs[0].includes('"h":12'), `4 TZs -> ${new Set(outs).size} distinct output: ${outs[0]}`];
});

// ---------------------------------------------------------------- output validation
c('E53', 'output carrying "__proto__" key via JSON.parse; Object.prototype.toJSON pollution', 'output_invalid; host prototype clean', async () => {
  const a = await run(`return JSON.parse('{"__proto__":{"polluted":1},"x":2}');`);
  const b = await run(`Object.prototype.toJSON = () => ({ evil: 1 }); return { a: 1 };`);
  const clean = ({} as Record<string, unknown>).polluted === undefined && !('toJSON' in {});
  return [!a.ok && a.error.code === 'output_invalid' && !b.ok && b.error.code === 'output_invalid' && clean, `${summarize(a)} | ${summarize(b)} hostClean=${clean}`];
});
c('E54', 'non-serializable outputs: function, undefined member, BigInt, NaN, Infinity, Date, Map, Symbol, cycle, getter, sparse array, class instance, array/primitive/null/undefined top-level', 'output_invalid for each', async () => {
  const bodies = [`return { f() {} };`, `return { u: undefined };`, `return { b: 1n };`, `return { n: NaN };`, `return { n: Infinity };`, `return { d: new Date() };`, `return { m: new Map() };`, `return { s: Symbol('x') };`, `const o = {}; o.o = o; return o;`, `return { get g() { return 1; } };`, `return { a: [1, , 3] };`, `class A {} return { a: new A() };`, `return [1, 2];`, `return 5;`, `return null;`, `return undefined;`, `return 'str';`, `let a = {}; let cur = a; for (let i = 0; i < 100; i++) { cur.n = {}; cur = cur.n; } return a;`];
  const codes: string[] = [];
  for (const b of bodies) { const r = await run(b); codes.push(r.ok ? 'OK!' : r.error.code); }
  return [codes.every((x) => x === 'output_invalid'), codes.join(',')];
});
c('E55', 'thrown values: Error, string, object, null; error stack does not leak host paths', 'runtime_error; stack contains no /Users, node_modules or file://', async () => {
  const a = await run(`throw new Error('boom');`);
  const b = await run(`throw 'just a string';`);
  const c1 = await run(`throw { code: 42 };`);
  const d = await run(`throw null;`);
  const s = await run(`try { null.x; } catch (e) { return { stack: String(e.stack) }; }`);
  const leaks = s.ok && /\/Users|node_modules|file:\/\/|quickjs-emscripten/.test(String(s.output.stack));
  return [[a, b, c1, d].every((r) => !r.ok && r.error.code === 'runtime_error') && s.ok && !leaks, `${summarize(a)} | ${summarize(b)} | ${summarize(c1)} | ${summarize(d)} | stack=${s.ok ? JSON.stringify(s.output.stack) : summarize(s)}`];
});
c('E56', 'user code overrides JSON.stringify / Promise.prototype.then / Symbol.iterator / Array.prototype.push before returning', 'host still receives validated JSON for the returned object (driver uses captured natives)', async () => {
  const r = await run(`JSON.stringify = () => '{"evil":true}'; JSON.parse = () => ({ evil: true }); Promise.prototype.then = () => {}; Array.prototype.push = () => {}; Object.keys = () => []; return { good: [1, 2, 3] };`);
  return [r.ok && JSON.stringify(r.output) === '{"good":[1,2,3]}', summarize(r)];
});
c('E57', 'sandbox_crash recovery: after the whole abuse sequence the engine still runs RF-1 normalize correctly', 'ok and correct', async () => {
  const r = await run(`return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };`, { input: { amount: 1234.567, currency: 'eur' } });
  return [r.ok && JSON.stringify(r.output) === '{"amount":1234.57,"currency":"EUR","is_large":true}', summarize(r)];
});

// ---------------------------------------------------------------- memory ceiling (see REPORT.md "memory limit finding")
c('E58', 'memory bombs with memoryBytes=32 MiB: 3 allocation patterns x 3 runs; RSS growth and wall time', 'memory_limit each time, < 300 ms each, total RSS growth < 200 MiB, module still healthy', async () => {
  const pats = [`const a=[];for(;;)a.push(new Array(100000).fill(1));`, `const a=[];for(let i=0;;i++)a.push("x".repeat(1000)+i);`, `const a=[];for(let i=0;;i++)a.push({i, s: "v" + i});`];
  const rss0 = process.memoryUsage().rss; const codes: string[] = []; let maxMs = 0;
  for (let k = 0; k < 3; k++) for (const p of pats) {
    const r = await run(p, { limits: { ...LIMITS, memoryBytes: 32 << 20, timeoutMs: 5000 } });
    codes.push(r.ok ? 'ok!' : r.error.code); maxMs = Math.max(maxMs, r.stats.ms);
  }
  const growthMiB = Math.round((process.memoryUsage().rss - rss0) / 2 ** 20);
  const after = await run(`return { alive: 1 };`);
  return [codes.every((x) => x === 'memory_limit') && maxMs < 300 && growthMiB < 200 && after.ok, `${codes.join(',')} maxMs=${maxMs.toFixed(0)} rssGrowthMiB=${growthMiB} next=${summarize(after)}`];
});
c('E59', 'memoryBytes buckets are isolated: a 16 MiB run cannot use the memory of a 256 MiB run, and a legit 100 MiB allocation works with memoryBytes=256 MiB', 'small bucket -> memory_limit, big bucket -> ok', async () => {
  const alloc = `const a = []; for (let i = 0; i < 30; i++) a.push(new Array(200000).fill(i)); return { n: a.length };`; // ~ 48 MiB of array slots
  const small = await run(alloc, { limits: { ...LIMITS, memoryBytes: 16 << 20, timeoutMs: 3000 } });
  const big = await run(alloc, { limits: { ...LIMITS, memoryBytes: 256 << 20, timeoutMs: 3000 } });
  return [!small.ok && small.error.code === 'memory_limit' && big.ok, `small=${summarize(small)} big=${summarize(big)}`];
});
