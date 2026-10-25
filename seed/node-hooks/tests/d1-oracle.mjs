// One-off: capture D1's real step lists (core-dbos engine, run read-only from here, own database d1_oracle in OUR container,
// port 18930, no file written inside core-dbos/) so S01 can compare byte-for-byte. Output: oracle/d1-steps.json
import { spawn, execFileSync } from 'node:child_process';
import { openSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, SPIKES, BASE, RF1, STATE, ensurePostgres, resetMocks, sleep } from './lib.mjs';

await ensurePostgres();
const psql = (sql) => execFileSync('docker', ['exec', 'us-hk-postgres', 'psql', '-U', 'dbos', '-d', 'postgres', '-c', sql], { encoding: 'utf8' });
psql('DROP DATABASE IF EXISTS d1_oracle WITH (FORCE)'); psql('CREATE DATABASE d1_oracle');
mkdirSync(STATE, { recursive: true });
mkdirSync(path.join(ROOT, 'oracle'), { recursive: true });
const out = openSync(path.join(STATE, 'd1-oracle-engine.log'), 'a');
const child = spawn(process.execPath, ['src/main.ts'], { cwd: path.join(SPIKES, 'core-dbos'), stdio: ['ignore', out, out],
  env: { ...process.env, ENGINE_PORT: '18930', DBOS_DATABASE_URL: 'postgres://dbos:dbos-spike-local@127.0.0.1:55436/d1_oracle', CALLBACK_BASE: BASE, POLICY_LOG: path.join(STATE, 'd1-policy.jsonl') } });
const api = async (m, p, b) => { const r = await fetch(BASE + p, { method: m, headers: { 'content-type': 'application/json' }, body: b === undefined ? undefined : JSON.stringify(b) }); return r.json(); };
for (let i = 0; i < 200 && !(await fetch(`${BASE}/health`).then((r) => r.ok, () => false)); i++) await sleep(100);
const res = {};
try {
  for (const [label, inv, approve] of [['INV-1002', 'INV-1002'], ['INV-1003', 'INV-1003'], ['INV-1001-approve', 'INV-1001', 'approved']]) {
    await resetMocks();
    const { runId } = await api('POST', '/runs', { flowPath: RF1, input: { invoice_id: inv } });
    if (approve) { for (let i = 0; i < 300; i++) { const s = await api('GET', `/runs/${runId}`); if (s.status === 'waiting') break; await sleep(20); } await api('POST', `/runs/${runId}/signal/approval`, { decision: approve, approver: 'oracle', comment: 'ok' }); }
    let s; for (let i = 0; i < 600; i++) { s = await api('GET', `/runs/${runId}`); if (s.status === 'completed' || s.status === 'failed') break; await sleep(20); }
    const steps = await api('GET', `/runs/${runId}/steps`);
    res[label] = { status: s.status, node: s.node, steps: steps.map((x) => `${x.id}:${x.name}`) };
    console.log(label, s.status, s.node, res[label].steps.join(' '));
  }
} finally { child.kill('SIGKILL'); }
writeFileSync(path.join(ROOT, 'oracle/d1-steps.json'), JSON.stringify({ captured_from: 'core-dbos/src/main.ts (unmodified), DBOS-TS 5.3.0', cases: res }, null, 2));
