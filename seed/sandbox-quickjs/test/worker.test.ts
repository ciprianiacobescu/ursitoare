import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { WorkerSandbox } from '../src/worker-sandbox.ts';
import { runCode } from '../src/index.ts';
import type { Limits } from '../src/index.ts';
import { startStub, STUB_ORIGIN } from './stub-server.ts';

const LIMITS: Limits = { timeoutMs: 200, memoryBytes: 32 << 20, maxStackBytes: 256 << 10, maxOutputBytes: 100_000 };
const NOW = '2026-10-24T12:00:00.000Z';
const ws = new WorkerSandbox(2);
const evidence: Record<string, unknown> = {};
after(async () => { await ws.close(); writeFileSync(new URL('../results/worker-mode.json', import.meta.url), JSON.stringify(evidence, null, 2)); });

const NORMALIZE = `return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };`;

test('worker mode: normalize works and matches the in-process result byte for byte', async () => {
  const a = await ws.run({ source: NORMALIZE, input: { amount: 1234.567, currency: 'eur' }, limits: LIMITS, seed: 1, nowIso: NOW });
  const b = await runCode({ source: NORMALIZE, input: { amount: 1234.567, currency: 'eur' }, limits: LIMITS, seed: 1, nowIso: NOW });
  assert.ok(a.ok && b.ok);
  assert.equal(JSON.stringify(a.output), JSON.stringify(b.output));
});

test('non-interruptible native op (BigInt multiply, ~1.2 s) is killed by the watchdog at timeout+grace', async () => {
  const src = `const x = 3n ** 100000n; return { l: (x*x*x*x).toString().length };`;
  const lim = { ...LIMITS, timeoutMs: 50 };
  const t = performance.now();
  const inproc = await runCode({ source: src, input: {}, limits: { ...lim, maxStackBytes: 64 << 10 }, seed: 1, nowIso: NOW });
  const inprocMs = performance.now() - t;
  const t2 = performance.now();
  const before = ws.respawns;
  const w = await ws.run({ source: src, input: {}, limits: lim, seed: 1, nowIso: NOW });
  const wMs = performance.now() - t2;
  assert.ok(!inproc.ok && inproc.error.code === 'timeout');
  assert.ok(!w.ok && w.error.code === 'timeout');
  assert.ok(wMs < lim.timeoutMs + 250 + 150, `watchdog took ${wMs}`);
  assert.equal(ws.respawns, before + 1);
  evidence.nativeOpOvershoot = { timeoutMs: lim.timeoutMs, inProcessWallMs: Math.round(inprocMs), workerWallMs: Math.round(wMs), inProcessCode: inproc.ok ? 'ok' : inproc.error.code, workerCode: w.ok ? 'ok' : w.error.code, graceMs: 250 };
  const after_ = await ws.run({ source: NORMALIZE, input: { amount: 1, currency: 'usd' }, limits: LIMITS, seed: 1, nowIso: NOW });
  assert.ok(after_.ok, 'pool recovered after the kill');
});

test('stack bombs never crash at the worker cap (4 MB V8 stack, 256 KiB guest stack)', async () => {
  const bodies: Record<string, string> = {
    plain: `function f(n) { return f(n + 1) + 1; } return { v: f(0) };`,
    jsonParse: `const s = '['.repeat(200000) + ']'.repeat(200000); return { v: JSON.parse(s).length };`,
    jsonStringify: `let a = []; for (let i = 0; i < 200000; i++) a = [a]; return { v: JSON.stringify(a).length };`,
    flat: `let a = []; for (let i = 0; i < 200000; i++) a = [a]; return { v: a.flat(Infinity).length };`,
    toString: `let a = []; for (let i = 0; i < 200000; i++) a = [a]; return { v: String(a).length };`,
    getter: `let o = { get x() { return o.x; } }; return { v: o.x };`,
    newRec: `function F(){ new F(); } new F(); return {};`,
    proxy: `let p = {}; for (let i = 0; i < 100000; i++) p = new Proxy(p, {}); return { v: typeof p.x };`,
    mapCb: `function f(){ [1].map(() => f()); } f(); return {};`,
    depth: `let d = 0; function f() { d++; f(); } try { f(); } catch (e) {} return { d };`,
  };
  const codes: Record<string, string> = {};
  for (const [k, src] of Object.entries(bodies)) {
    const r = await ws.run({ source: src, input: {}, limits: { ...LIMITS, timeoutMs: 3000, memoryBytes: 64 << 20 }, seed: 1, nowIso: NOW });
    codes[k] = r.ok ? `ok${k === 'depth' ? ' depth=' + r.output.d : ''}` : r.error.code;
  }
  evidence.stackBombsAt256K = codes;
  assert.ok(Object.values(codes).every((c) => c !== 'sandbox_crash'), JSON.stringify(codes));
});

test('fetch gateway works through the worker (live and replay)', async () => {
  const stub = await startStub();
  try {
    const src = `const r = await fetch('${STUB_ORIGIN}/nondeterministic'); const j = await r.json(); return { n: j.n, t: j.t };`;
    const live = await ws.run({ source: src, input: {}, limits: LIMITS, seed: 1, nowIso: NOW, fetchAllowlist: [STUB_ORIGIN] });
    assert.ok(live.ok, JSON.stringify(live));
    const replay = await ws.run({ source: src, input: {}, limits: LIMITS, seed: 1, nowIso: NOW, fetchAllowlist: [STUB_ORIGIN], fetchReplay: live.fetchLog });
    assert.ok(replay.ok);
    assert.equal(JSON.stringify(replay.output), JSON.stringify(live.output));
    const denied = await ws.run({ source: `await fetch('https://example.com/'); return {};`, input: {}, limits: LIMITS, seed: 1, nowIso: NOW, fetchAllowlist: [STUB_ORIGIN] });
    assert.ok(!denied.ok && denied.error.code === 'fetch_denied');
  } finally { await stub.close(); }
});

test('infinite loop and memory bomb still map to timeout / memory_limit inside the worker', async () => {
  const a = await ws.run({ source: `for(;;){}`, input: {}, limits: LIMITS, seed: 1, nowIso: NOW });
  const b = await ws.run({ source: `const a = []; for (;;) a.push(new Array(100000).fill(1));`, input: {}, limits: { ...LIMITS, timeoutMs: 3000 }, seed: 1, nowIso: NOW });
  assert.ok(!a.ok && a.error.code === 'timeout');
  assert.ok(!b.ok && b.error.code === 'memory_limit');
});
