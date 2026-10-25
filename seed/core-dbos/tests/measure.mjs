// Design section 7 measurements. Run via tests/measure.sh (takes the measurement mutex). Output: JSON on stdout.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adapter from '../adapter.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RF1 = path.resolve(HERE, '../../shared/flows/rf-1-invoice-intake.yaml');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = (u, o) => fetch(u, o).then((r) => r.json());
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8' }).trim();
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)]; };
const med = (a) => pct(a, 50);
const toMiB = (s) => { const m = /([\d.]+)\s*(B|KiB|MiB|GiB)/.exec(s); const v = +m[1]; return m[2] === 'GiB' ? v * 1024 : m[2] === 'MiB' ? v : m[2] === 'KiB' ? v / 1024 : v / 1048576; };
const engineRssMiB = () => +sh('ps', ['-o', 'rss=', '-p', String(adapter._pid())]) / 1024;
const pgMemMiB = () => toMiB(sh('docker', ['stats', '--no-stream', '--format', '{{.MemUsage}}', 'us-m2-postgres']).split('/')[0]);
function neighbours() {
  const rows = sh('docker', ['stats', '--no-stream', '--format', '{{.Name}}|{{.MemUsage}}']).split('\n').filter(Boolean);
  const mine = rows.filter((r) => r.startsWith('us-m2'));
  const total = rows.reduce((a, r) => a + toMiB(r.split('|')[1].split('/')[0]), 0);
  return { containers_running: +sh('sh', ['-c', 'docker ps -q | wc -l']), total_mem_MiB: Math.round(total), my_containers: mine.length };
}
async function resetMocks(delegateMs) {
  await Promise.all([j('http://127.0.0.1:18901/reset', { method: 'POST' }), j('http://127.0.0.1:18902/reset', { method: 'POST' }),
    j('http://127.0.0.1:18903/reset', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ delegate_delay_ms: delegateMs }) })]);
}
async function oneRun(inv = 'INV-1002') {
  const t0 = performance.now();
  const id = await adapter.startRun(RF1, { invoice_id: inv });
  for (;;) { const s = await adapter.status(id); if (s.status === 'completed' || s.status === 'failed') { if (s.status !== 'completed') throw new Error('run failed ' + JSON.stringify(s)); return performance.now() - t0; } await sleep(5); }
}
async function pool(n, conc) { // n runs, conc at a time
  const lat = []; let next = 0; const t0 = performance.now();
  await Promise.all(Array.from({ length: conc }, async () => { while (next++ < n) lat.push(await oneRun()); }));
  return { lat, elapsed_s: (performance.now() - t0) / 1000 };
}

const reps = +(process.argv[2] ?? 3), N = 100;
const out = { neighbours_before: neighbours(), reps: [] };
for (let r = 0; r < reps; r++) {
  const rep = {};
  // cold start: stack from stopped containers + engine
  execFileSync('docker', ['compose', '-p', 'us-m2', 'stop'], { cwd: path.resolve(HERE, '..'), stdio: 'ignore' });
  let t0 = performance.now();
  await adapter.start(); // compose up --wait + engine kill + DB reset + engine spawn/ready
  rep.cold_start_full_stack_s = (performance.now() - t0) / 1000;
  await adapter.kill();
  t0 = performance.now();
  await adapter.restart(); // postgres already up; engine spawn -> /health ok
  rep.cold_start_engine_s = (performance.now() - t0) / 1000;
  await sleep(3000);
  rep.idle_rss_engine_MiB = engineRssMiB(); rep.idle_mem_postgres_MiB = pgMemMiB();
  await resetMocks(50);
  const c4 = await pool(N, 4);
  rep.c4_runs = N; rep.c4_elapsed_s = c4.elapsed_s; rep.c4_runs_per_min = N / c4.elapsed_s * 60;
  rep.c4_latency_ms = { p50: pct(c4.lat, 50), p95: pct(c4.lat, 95), min: Math.min(...c4.lat), max: Math.max(...c4.lat) };
  rep.after100_rss_engine_MiB = engineRssMiB(); rep.after100_mem_postgres_MiB = pgMemMiB();
  const c1 = await pool(40, 1);
  rep.c1_latency_ms = { p50: pct(c1.lat, 50), p95: pct(c1.lat, 95), min: Math.min(...c1.lat), max: Math.max(...c1.lat) };
  rep.c1_runs_per_min = 40 / c1.elapsed_s * 60;
  const mocks = await Promise.all([j('http://127.0.0.1:18902/calls'), j('http://127.0.0.1:18903/calls')]);
  rep.sanity = { payment_effects: mocks[0].by_block['erp.create_payment@1'].effects, expected: N + 40, n8n_delivered: mocks[1].callbacks_delivered };
  out.reps.push(rep); console.error('rep', r + 1, JSON.stringify(rep));
}
const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => typeof v === 'object' ? keys(v, p + k + '.') : [p + k]);
const get = (o, k) => k.split('.').reduce((a, x) => a[x], o);
out.summary = Object.fromEntries(keys(out.reps[0]).filter((k) => !k.startsWith('sanity')).map((k) => { const v = out.reps.map((x) => get(x, k)); return [k, { median: med(v), min: Math.min(...v), max: Math.max(...v) }]; }));
out.neighbours_after = neighbours();
await adapter.stop();
console.log(JSON.stringify(out, null, 2));
