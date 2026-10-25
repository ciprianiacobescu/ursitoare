#!/usr/bin/env node
// Engine-agnostic recovery harness. The harness is the killer: it polls the mocks, then calls adapter.kill().
// Usage: node shared/harness/run.mjs --adapter <adapter.mjs> --tests RT-0,RT-1,...   (see README.md)
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mocks } from './lib/mocks.mjs';
import { waitFor, sleep } from './lib/util.mjs';
import { TESTS } from './tests.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = path.resolve(HERE, '..');
const FLOWS = {
  rf1: path.join(SHARED, 'flows', 'rf-1-invoice-intake.yaml'),
  timeout5s: path.join(HERE, 'flows', 'rf-1-timeout-5s.yaml'),
};

const { values: args } = parseArgs({
  options: {
    adapter: { type: 'string' },
    tests: { type: 'string' },
    'timeout-ms': { type: 'string' },
    'grace-ms': { type: 'string' },
    'results-dir': { type: 'string' },
    'start-mocks': { type: 'boolean', default: false },
    'keep-engine': { type: 'boolean', default: false },
    list: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

function usage(code = 2) {
  console.error(`usage: node shared/harness/run.mjs --adapter <adapter.mjs> [--tests RT-0,RT-1,...|all] [--timeout-ms N] [--grace-ms N]
                                    [--results-dir DIR] [--start-mocks] [--keep-engine] [--list]
  --timeout-ms  per-wait timeout (default $HARNESS_TIMEOUT_MS or 60000)
  --grace-ms    RT-1 only: wait this long after the classify call is observed before killing (default 0 = as soon as)
  --start-mocks run shared/mocks/start-all.sh first and stop-all.sh at the end
  --keep-engine do not call adapter.stop() at the end`);
  process.exit(code);
}
if (args.help) usage(0);
if (args.list) { for (const t of TESTS) console.log(`${t.id}  ${t.title}`); process.exit(0); }
if (!args.adapter) usage();

const opts = {
  timeoutMs: Number(args['timeout-ms'] || process.env.HARNESS_TIMEOUT_MS || 60000),
  graceMs: Number(args['grace-ms'] || 0),
};
const wanted = !args.tests || args.tests === 'all' ? TESTS.map((t) => t.id) : args.tests.split(',').map((s) => s.trim().toUpperCase());
for (const w of wanted) if (!TESTS.some((t) => t.id === w)) { console.error(`unknown test ${w}; known: ${TESTS.map((t) => t.id).join(', ')}`); process.exit(2); }

const fmt = (v) => (typeof v === 'string' ? v : JSON.stringify(v));
const line = (s) => console.log(s);

// ---------- preflight ----------
function checkVariantFlow() {
  const rf1 = fs.readFileSync(FLOWS.rf1, 'utf8');
  const variant = fs.readFileSync(FLOWS.timeout5s, 'utf8').split('\n').filter((l, i, a) => !(l.startsWith('#') && a.slice(0, i).every((x) => x.startsWith('#')))).join('\n');
  const expected = rf1.replace('flow: invoice-intake\n', 'flow: invoice-intake-timeout-5s\n').replace('timeout: PT48H', 'timeout: PT5S');
  return variant === expected;
}

let startedMocks = false;
async function ensureMocks() {
  let h = await mocks.health();
  if (!Object.values(h).every(Boolean) && args['start-mocks']) {
    const r = spawnSync('bash', [path.join(SHARED, 'mocks', 'start-all.sh')], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('start-all.sh failed');
    startedMocks = true;
    h = await mocks.health();
  }
  const down = Object.entries(h).filter(([, v]) => !v).map(([k]) => `${k} (${mocks.urls[k]})`);
  if (down.length) throw new Error(`mocks not reachable: ${down.join(', ')}. Start them with:  shared/mocks/start-all.sh   (or pass --start-mocks)`);
}

// ---------- test context ----------
class Ctx {
  constructor(adapter, test) {
    this.adapter = adapter; this.opts = opts; this.flows = FLOWS; this.test = test;
    this.checks = []; this.notes = {}; this.events = [];
    this.engineDown = false; this.runIds = [];
  }
  ev(msg) { this.events.push({ t: Date.now(), msg }); if (process.env.HARNESS_VERBOSE) line(`      . ${msg}`); }
  check(name, pass, detail) {
    this.checks.push({ name, pass: !!pass, detail: detail === undefined ? undefined : fmt(detail) });
    line(`    ${pass ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? `   [${fmt(detail)}]` : ''}`);
    return !!pass;
  }
  eq(name, actual, expected) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    this.checks.push({ name, pass, expected, actual });
    line(`    ${pass ? 'PASS' : 'FAIL'}  ${name}: ${fmt(actual)}${pass ? '' : `   (expected ${fmt(expected)})`}`);
    return pass;
  }
  note(k, v) { this.notes[k] = v; line(`    info  ${k}: ${fmt(v)}`); }
  async reset(o) { await mocks.reset(o); this.ev(`mocks reset ${o ? JSON.stringify(o) : ''}`); }
  async start(flowPath, input) {
    const runId = await this.adapter.startRun(flowPath, input);
    if (!runId) throw new Error('adapter.startRun returned no run id');
    this.runIds.push(runId); this.ev(`startRun ${path.basename(flowPath)} ${JSON.stringify(input)} -> ${runId}`);
    return runId;
  }
  async waitForCall(fetcher, pred, label, o = {}) {
    return waitFor(async () => { const c = await fetcher(); return pred(c) ? c : null; }, { timeoutMs: o.timeoutMs ?? this.opts.timeoutMs, intervalMs: o.intervalMs ?? 10, label });
  }
  async waitStatus(runId, pred, label, o = {}) {
    let last;
    try {
      return await waitFor(async () => { last = await this.adapter.status(runId); return pred(last) ? last : null; }, { timeoutMs: o.timeoutMs ?? this.opts.timeoutMs, intervalMs: o.intervalMs ?? 100, label });
    } catch (e) { throw new Error(`${e.message}; last adapter.status = ${JSON.stringify(last)}`); }
  }
  async waitWaiting(runId, o) {
    const st = await this.waitStatus(runId, (s) => s.status === 'waiting' || s.status === 'failed' || s.status === 'completed', 'run to park on the approval (status waiting)', o);
    this.ev(`status ${JSON.stringify(st)}`);
    if (st.status !== 'waiting') throw new Error(`run did not park on approval, status = ${JSON.stringify(st)}`);
    if (st.node !== undefined && st.node !== 'approval') this.check('parked node is approval', false, st.node);
    return st;
  }
  async waitTerminal(runId, o) {
    const st = await this.waitStatus(runId, (s) => s.status === 'completed' || s.status === 'failed', 'run to reach completed|failed', o);
    this.ev(`status ${JSON.stringify(st)}`);
    return st;
  }
  async signal(runId, nodeId, decision) {
    const payload = { decision, approver: 'harness', comment: `harness ${decision}` };
    let err;
    for (let i = 0; i < 5; i++) {
      try { await this.adapter.signal(runId, nodeId, payload); this.ev(`signal ${nodeId} ${decision}`); return; } catch (e) { err = e; await sleep(1000); }
    }
    throw new Error(`adapter.signal failed 5 times: ${err.message}`);
  }
  /** External kill. `loggedAt` (ISO ts of the mock's log entry that triggered the kill) gives sinceLoggedMs. */
  async kill(target, { loggedAt } = {}) {
    const t0 = Date.now();
    const sinceLoggedMs = loggedAt ? t0 - Date.parse(loggedAt) : null;
    this.engineDown = true;
    await this.adapter.kill(target);
    const ms = Date.now() - t0;
    this.ev(`kill(${target}) issued ${sinceLoggedMs ?? '?'} ms after trigger was logged; adapter.kill took ${ms} ms`);
    this.note(`kill(${target})`, `issued ${sinceLoggedMs ?? '?'} ms after the mock logged the trigger; adapter.kill took ${ms} ms`);
    return { sinceLoggedMs, ms };
  }
  async restart() {
    const t0 = Date.now();
    await this.adapter.restart();
    this.engineDown = false;
    this.ev(`restart() took ${Date.now() - t0} ms`);
    this.note('restart', `${Date.now() - t0} ms`);
  }
}

// ---------- main ----------
async function main() {
  const adapterPath = path.resolve(args.adapter);
  const adapter = (await import(pathToFileURL(adapterPath).href)).default;
  for (const m of ['start', 'kill', 'restart', 'startRun', 'signal', 'status']) if (typeof adapter?.[m] !== 'function') throw new Error(`adapter is missing method ${m}()`);
  if (!adapter.name) throw new Error('adapter.name is required');
  if (!checkVariantFlow()) throw new Error('flows/rf-1-timeout-5s.yaml has drifted from shared/flows/rf-1-invoice-intake.yaml (expected only the flow id and approval.timeout to differ)');
  await ensureMocks();

  const startedAt = new Date();
  line(`harness: adapter=${adapter.name} tests=${wanted.join(',')} timeout=${opts.timeoutMs}ms grace=${opts.graceMs}ms`);
  const t0 = Date.now();
  await adapter.start();
  line(`adapter started in ${Date.now() - t0} ms\n`);

  const results = [];
  let engineDown = false;
  for (const id of wanted) {
    const test = TESTS.find((t) => t.id === id);
    const ctx = new Ctx(adapter, test);
    if (engineDown) { line('  (engine was left down by the previous test; restarting)'); await adapter.restart(); engineDown = false; }
    line(`${test.id}  ${test.title}`);
    const ts = Date.now();
    let error;
    try {
      await Promise.race([
        test.run(ctx),
        new Promise((_, rej) => setTimeout(() => rej(new Error('test exceeded overall limit')), opts.timeoutMs * 4 + 30000).unref()),
      ]);
    } catch (e) {
      error = e.message || String(e);
      line(`    ERROR ${error}`);
    }
    engineDown = ctx.engineDown;
    let snapshot; try { snapshot = await mocks.snapshot(); } catch { snapshot = null; }
    const failed = ctx.checks.filter((c) => !c.pass).length;
    const status = error ? 'error' : failed ? 'fail' : ctx.checks.length ? 'pass' : 'error';
    line(`  => ${test.id} ${status === 'pass' ? 'PASS' : status.toUpperCase()}  (${((Date.now() - ts) / 1000).toFixed(1)} s, ${ctx.checks.length - failed}/${ctx.checks.length} checks)\n`);
    results.push({ id: test.id, title: test.title, status, error, duration_ms: Date.now() - ts, run_ids: ctx.runIds, checks: ctx.checks, notes: ctx.notes, mocks_snapshot: snapshot, events: ctx.events.map((e) => ({ t: new Date(e.t).toISOString(), msg: e.msg })) });
  }

  if (!args['keep-engine'] && typeof adapter.stop === 'function') { try { await adapter.stop(); } catch (e) { line(`adapter.stop() failed: ${e.message}`); } }
  if (startedMocks) spawnSync('bash', [path.join(SHARED, 'mocks', 'stop-all.sh')], { stdio: 'inherit' });

  const summary = { passed: results.filter((r) => r.status === 'pass').length, failed: results.filter((r) => r.status === 'fail').length, errors: results.filter((r) => r.status === 'error').length, total: results.length };
  const out = { adapter: adapter.name, adapter_path: adapterPath, started_at: startedAt.toISOString(), finished_at: new Date().toISOString(), options: opts, node: process.version, summary, results };
  const dir = path.resolve(args['results-dir'] || path.join(HERE, 'results'));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${adapter.name}-${startedAt.toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));

  line('summary:');
  for (const r of results) line(`  ${r.id.padEnd(5)} ${r.status === 'pass' ? 'PASS' : r.status.toUpperCase()}`);
  line(`${summary.passed}/${summary.total} passed, ${summary.failed} failed, ${summary.errors} errored`);
  line(`results: ${file}`);
  process.exit(summary.failed || summary.errors ? 1 : 0);
}

main().catch((e) => { console.error(`harness error: ${e.message}`); process.exit(2); });
