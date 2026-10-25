// Design section 8 measurements (Q2). Run via tests/measure.sh, which holds the measurement mutex.
// RF-1, INV-1002 (auto-approve path), DELEGATE_DELAY_MS=50; variants H0/H1/H2 x mode separate/fused.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, HOOK_EXEC, Engine, ensurePostgres, resetDatabase, resetMocks, flow, sleep, pgQuery, readJsonl, truncate, mockSnapshot, j, N8N } from './lib.mjs';

const REPS = Number(process.argv[2] ?? 3);
const WARM = 5, SEQ = 30, CONC_N = 100, CONC = 4;
const sh = (c, a) => execFileSync(c, a, { encoding: 'utf8' }).trim();
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)]; };
const med = (a) => pct(a, 50);
const engine = new Engine();
const hostLoad = () => ({ containers_running: Number(sh('sh', ['-c', 'docker ps -q | wc -l'])), uptime: sh('uptime') });

async function oneRun(flowFile) {
  const t0 = performance.now();
  const r = await engine.api('POST', '/runs', { flowPath: flowFile, input: { invoice_id: 'INV-1002' } });
  if (r.status !== 201) throw new Error(`start failed ${JSON.stringify(r.body)}`);
  const id = r.body.runId;
  for (;;) {
    const s = (await engine.api('GET', `/runs/${id}`)).body;
    if (s.status === 'completed') return { ms: performance.now() - t0, id };
    if (s.status === 'failed') throw new Error('run failed ' + JSON.stringify(s));
    await sleep(1);
  }
}
async function pool(flowFile, n, conc) {
  const lat = []; let next = 0; const t0 = performance.now();
  await Promise.all(Array.from({ length: conc }, async () => { while (next++ < n) lat.push((await oneRun(flowFile)).ms); }));
  return { lat, elapsed_s: (performance.now() - t0) / 1000 };
}
const commits = async () => Number(await pgQuery("select xact_commit from pg_stat_database where datname='ursitoare'"));
const rssMiB = () => Number(sh('ps', ['-o', 'rss=', '-p', String(engine.pid)])) / 1024;

async function measure(variant, mode) {
  await engine.kill();
  await engine.spawn(mode === 'fused' ? { HOOK_MODE: 'fused' } : {});
  await resetMocks({ n8n: 50 });
  const file = flow(`m-${variant.toLowerCase()}`);
  for (let i = 0; i < WARM; i++) await oneRun(file);
  // idle baseline of commits (DBOS background polling), 3 s
  await sleep(1500); const c0 = await commits(); await sleep(3000); await sleep(1200); const c1 = await commits();
  const idle_per_s = (c1 - c0) / 4.2;
  // sequential
  truncate(HOOK_EXEC);
  await sleep(1200); const cs0 = await commits(); const tS = performance.now();
  const seq = []; let sampleId;
  for (let i = 0; i < SEQ; i++) { const r = await oneRun(file); seq.push(r.ms); sampleId = r.id; }
  const seqElapsed = (performance.now() - tS) / 1000;
  await sleep(1500); const cs1 = await commits();
  const steps = (await engine.api('GET', `/runs/${sampleId}/steps`)).body.length;
  const hookExecs = readJsonl(HOOK_EXEC).filter((l) => l.run === sampleId).length;
  // concurrent
  const conc = await pool(file, CONC_N, CONC);
  const rss = rssMiB();
  const nm = await mockSnapshot();
  return {
    variant, mode,
    seq_ms: { p50: med(seq), p95: pct(seq, 95), min: Math.min(...seq), max: Math.max(...seq) },
    conc4_ms: { p50: med(conc.lat), p95: pct(conc.lat, 95) }, conc4_runs_per_min: CONC_N / conc.elapsed_s * 60,
    steps_per_run: steps, hook_execs_per_run: hookExecs,
    xact_commit_per_run_raw: (cs1 - cs0) / SEQ, xact_commit_per_run_net_of_idle: (cs1 - cs0 - idle_per_s * (seqElapsed + 1.5)) / SEQ, idle_commits_per_s: idle_per_s,
    engine_rss_after_conc_MiB: rss,
    payments: nm.tools['erp.create_payment@1'], 
  };
}

mkdirSync(path.join(ROOT, 'results'), { recursive: true });
await ensurePostgres();
await engine.kill();
await resetDatabase();
const out = { design: '8', reps: REPS, host_before: hostLoad(), d1_reference: 'p50 101.7 ms and 2,306 runs/min at 4 concurrent (different day, different neighbours; indicative only)', rounds: [] };
const plan = [['H0', 'separate'], ['H1', 'separate'], ['H1', 'fused'], ['H2', 'separate'], ['H2', 'fused']];
for (let r = 0; r < REPS; r++) {
  const round = [];
  for (const [v, m] of plan) {
    const x = await measure(v, m);
    round.push(x);
    console.error(`rep ${r + 1} ${v}/${m}: seq p50 ${x.seq_ms.p50.toFixed(1)} p95 ${x.seq_ms.p95.toFixed(1)} ms | conc4 p50 ${x.conc4_ms.p50.toFixed(1)} p95 ${x.conc4_ms.p95.toFixed(1)} ${x.conc4_runs_per_min.toFixed(0)}/min | steps ${x.steps_per_run} hooks ${x.hook_execs_per_run} | commits/run ${x.xact_commit_per_run_raw.toFixed(1)} (net ${x.xact_commit_per_run_net_of_idle.toFixed(1)}) | rss ${x.engine_rss_after_conc_MiB.toFixed(0)} MiB`);
  }
  out.rounds.push(round);
}
await engine.kill();
out.host_after = hostLoad();
// summary: median over reps of each metric, per variant/mode
const keys = [['seq_p50_ms', (x) => x.seq_ms.p50], ['seq_p95_ms', (x) => x.seq_ms.p95], ['conc4_p50_ms', (x) => x.conc4_ms.p50], ['conc4_p95_ms', (x) => x.conc4_ms.p95], ['conc4_runs_per_min', (x) => x.conc4_runs_per_min], ['steps_per_run', (x) => x.steps_per_run], ['hook_execs_per_run', (x) => x.hook_execs_per_run], ['xact_commit_per_run_raw', (x) => x.xact_commit_per_run_raw], ['xact_commit_per_run_net', (x) => x.xact_commit_per_run_net_of_idle], ['engine_rss_MiB', (x) => x.engine_rss_after_conc_MiB]];
out.summary = {};
for (const [v, m] of plan) {
  const xs = out.rounds.map((round) => round.find((x) => x.variant === v && x.mode === m));
  out.summary[`${v}/${m}`] = Object.fromEntries(keys.map(([k, f]) => { const vals = xs.map(f); return [k, { median: med(vals), min: Math.min(...vals), max: Math.max(...vals), all: vals }]; }));
}
const H0 = out.summary['H0/separate'];
const calc = (v, m) => { const s = out.summary[`${v}/${m}`]; const dp50 = s.seq_p50_ms.median - H0.seq_p50_ms.median; return { added_p50_ms: dp50, hook_execs: s.hook_execs_per_run.median, ms_per_hook_execution: dp50 / s.hook_execs_per_run.median }; };
out.added_cost = { 'H1/separate': calc('H1', 'separate'), 'H1/fused': calc('H1', 'fused'), 'H2/separate': calc('H2', 'separate'), 'H2/fused': calc('H2', 'fused') };
// R2 is evaluated per the pre-registered text on the rep medians; the per-rep spread is reported next to it
const perRep = (v, m) => out.rounds.map((round) => { const h0 = round.find((y) => y.variant === 'H0').seq_ms.p50; const x = round.find((y) => y.variant === v && y.mode === m); return (x.seq_ms.p50 - h0) / x.hook_execs_per_run; });
out.ms_per_hook_exec_per_rep = Object.fromEntries([['H1', 'separate'], ['H1', 'fused'], ['H2', 'separate'], ['H2', 'fused']].map(([v, m]) => [`${v}/${m}`, perRep(v, m)]));
out.r2_inputs = { ms_per_hook_exec_H2_separate_per_rep: perRep('H2', 'separate'), ms_per_hook_exec_H2_separate_median_of_reps: med(perRep('H2', 'separate')), ms_per_hook_exec_H2_separate_from_median_p50s: out.added_cost['H2/separate'].ms_per_hook_execution, H2_separate_conc4_runs_per_min_median: out.summary['H2/separate'].conc4_runs_per_min.median, H2_separate_conc4_runs_per_min_all: out.summary['H2/separate'].conc4_runs_per_min.all };
const ts = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(path.join(ROOT, 'results', `measure-${ts}.json`), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ summary: out.summary, added_cost: out.added_cost, r2_inputs: out.r2_inputs, host_before: out.host_before, host_after: out.host_after }, null, 2));
