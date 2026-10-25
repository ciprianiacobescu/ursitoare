// M2 adapter for the shared recovery harness (shared/harness/README.md). The engine is ONE Node process
// (API + DBOS worker + callback receiver) in front of the us-m2 Postgres container; kill() SIGKILLs it.
import { spawn, execFile } from 'node:child_process';
import { openSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const exec = promisify(execFile);
const PORT = Number(process.env.ENGINE_PORT ?? 18910);
const BASE = `http://127.0.0.1:${PORT}`;
const STATE = path.join(HERE, '.state');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let child = null;
const alive = () => child && child.exitCode === null && !child.signalCode;
process.on('exit', () => { try { child?.kill('SIGKILL'); } catch {} });

async function sh(cmd, args) { return exec(cmd, args, { cwd: HERE }); }

async function ensurePostgres() {
  await sh('docker', ['compose', '-p', 'us-m2', 'up', '-d', '--wait']);
}

async function resetDatabase() { // clean slate: drop/recreate the system database (our own container only)
  const psql = (sql) => sh('docker', ['exec', 'us-m2-postgres', 'psql', '-U', 'dbos', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
  await psql('DROP DATABASE IF EXISTS ursitoare WITH (FORCE)');
  await psql('CREATE DATABASE ursitoare');
}

async function spawnEngine() {
  mkdirSync(STATE, { recursive: true });
  const out = openSync(path.join(STATE, 'engine.log'), 'a');
  child = spawn(process.execPath, ['src/main.ts'], { cwd: HERE, env: { ...process.env }, stdio: ['ignore', out, out] });
  for (let i = 0; i < 600; i++) {
    if (!alive()) throw new Error('engine exited during startup; see core-dbos/.state/engine.log');
    const ok = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(1000) }).then((r) => r.ok, () => false);
    if (ok) return;
    await sleep(50);
  }
  throw new Error('engine did not become ready in 30 s');
}

async function killEngine() {
  if (!alive()) return;
  await new Promise((resolve) => { child.once('exit', resolve); child.kill('SIGKILL'); });
}

async function api(method, p, body) {
  const r = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

export default {
  name: 'dbos-ts',
  async start() {
    await ensurePostgres();
    await killEngine();
    await resetDatabase();
    await spawnEngine();
  },
  async kill(_target = 'worker') { await killEngine(); }, // single process: worker == server
  async restart() {
    await ensurePostgres();
    await killEngine();
    await spawnEngine();
  },
  async startRun(flowPath, input) {
    const r = await api('POST', '/runs', { flowPath, input });
    if (r.status !== 201) throw new Error(`startRun HTTP ${r.status}: ${JSON.stringify(r.body)}`);
    return r.body.runId;
  },
  async signal(runId, nodeId, payload) {
    const r = await api('POST', `/runs/${runId}/signal/${nodeId}`, payload);
    if (r.status !== 200) throw new Error(`signal HTTP ${r.status}: ${JSON.stringify(r.body)}`);
  },
  async status(runId) {
    const r = await api('GET', `/runs/${runId}`);
    if (r.status === 404) return { status: 'failed', error: { code: 'run_not_found' } };
    const { status, node, output, error } = r.body;
    return { status, node, output, error };
  },
  async stop() { await killEngine(); },
  // test-only helpers (not part of the harness contract)
  _api: api,
  _pid: () => child?.pid,
};
