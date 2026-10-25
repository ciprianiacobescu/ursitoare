// Sanity checks for the `code` runtime (the rigorous escape/determinism suite belongs to M7).
import { runSandboxed } from '../src/sandbox.ts';
let bad = 0; const ck = (n: string, ok: boolean, d?: unknown) => { if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d === undefined ? '' : '  ' + JSON.stringify(d)}`); };
const a = await runSandboxed('return { n: Math.random(), t: Date.now(), d: new Date().toISOString() };', {}, 'k1') as any;
const b = await runSandboxed('return { n: Math.random(), t: Date.now(), d: new Date().toISOString() };', {}, 'k1') as any;
const c = await runSandboxed('return { n: Math.random() };', {}, 'k2') as any;
ck('same seed -> same Math.random', a.n === b.n, a.n); ck('different seed -> different', a.n !== c.n);
ck('Date frozen', a.t === b.t && a.d === '2026-01-01T00:00:00.000Z', a.d);
const esc = await runSandboxed('return { p: typeof process, r: typeof require, f: typeof fetch, g: typeof globalThis.constructor.constructor("return typeof process")() , c: new Date().constructor.now() };', {}, 'k') as any;
ck('no process/require/fetch', esc.p === 'undefined' && esc.r === 'undefined' && esc.f === 'undefined', esc);
ck('Date.constructor.now frozen', esc.c === a.t);
let threw = false; try { await runSandboxed('while(true){}', {}, 'k'); } catch (e) { threw = true; }
ck('infinite loop interrupted (2 s deadline)', threw);
const rf1 = await runSandboxed('return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };', { amount: 120.5, currency: 'usd' }, 'k') as any;
ck('RF-1 normalize', rf1.amount === 120.5 && rf1.currency === 'USD' && rf1.is_large === false, rf1);
process.exit(bad ? 1 : 0);
