// RT-2b (extra, M2 only): restart the Postgres container while a run is parked on `approval` (engine process keeps running), then approve.
// Variant B (--engine-restart): additionally SIGKILL+restart the engine after Postgres is back.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import adapter from '../adapter.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RF1 = path.resolve(HERE, '../../shared/flows/rf-1-invoice-intake.yaml');
const LLM = process.env.MOCK_LLM_URL ?? 'http://127.0.0.1:18901', TOOLS = process.env.MOCK_TOOLS_URL ?? 'http://127.0.0.1:18902';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = (u, o) => fetch(u, o).then((r) => r.json());
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '   [' + detail + ']' : ''}`); };

async function until(pred, what, timeoutMs = 60000) {
  const t0 = Date.now();
  for (;;) {
    try { const v = await pred(); if (v) return v; } catch { /* engine/DB still coming back */ }
    if (Date.now() - t0 > timeoutMs) throw new Error('timeout waiting for ' + what);
    await sleep(100);
  }
}

await adapter.start();
await Promise.all([j(`${LLM}/reset`, { method: 'POST' }), j(`${TOOLS}/reset`, { method: 'POST' })]);
const runId = await adapter.startRun(RF1, { invoice_id: 'INV-1001' });
await until(async () => (await adapter.status(runId)).status === 'waiting', 'waiting');
const enginePid = adapter._pid();
console.log('parked on approval; restarting the Postgres container');
const t0 = Date.now();
if (process.argv.includes('--kill')) { execFileSync('docker', ['kill', 'us-m2-postgres']); execFileSync('docker', ['start', 'us-m2-postgres']); } // hard crash: WAL replay on start
else execFileSync('docker', ['restart', 'us-m2-postgres']);
console.log(`postgres ${process.argv.includes('--kill') ? 'killed (SIGKILL) and started' : 'restarted'} in ${Date.now() - t0} ms`);
check('engine process survived the DB restart', adapter._pid() === enginePid);
const st = await until(async () => { const s = await adapter.status(runId); return s.status === 'waiting' ? s : null; }, 'run reporting waiting again after DB restart');
check('run still waiting after Postgres restart (no engine restart)', st.status === 'waiting', `recovered after ${Date.now() - t0} ms`);
if (process.argv.includes('--engine-restart')) { await adapter.kill('server'); await adapter.restart(); await until(async () => (await adapter.status(runId)).status === 'waiting', 'waiting after engine restart'); }
await until(async () => { await adapter.signal(runId, 'approval', { decision: 'approved', approver: 'rt2b', comment: 'after postgres restart' }); return true; }, 'signal accepted');
const fin = await until(async () => { const s = await adapter.status(runId); return s.status === 'completed' || s.status === 'failed' ? s : null; }, 'terminal', 30000);
check('run completed', fin.status === 'completed', JSON.stringify(fin));
const l = await j(`${LLM}/calls`), t = await j(`${TOOLS}/calls`);
check('extract=1 classify=1', l.counts.extract === 1 && l.counts.classify === 1, JSON.stringify(l.counts));
check('exactly one payment effect', t.by_block['erp.create_payment@1']?.effects === 1, JSON.stringify(t.by_block['erp.create_payment@1']));
await adapter.stop();
console.log(results.every(Boolean) ? 'RT-2b PASS' : 'RT-2b FAIL');
process.exit(results.every(Boolean) ? 0 : 1);
