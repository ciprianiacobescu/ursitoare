// Harness SELF-TEST adapter (durable fake). Proves the harness logic; it is NOT a candidate engine.
// See fake-adapter-volatile.mjs for the negative control and README.md for the adapter contract.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function makeFakeAdapter(mode, name) {
  const stateDir = path.join(HERE, '.fake-state', mode);
  let child = null;
  let base = null;

  const killChild = (sig = 'SIGKILL') => new Promise((resolve) => {
    if (!child || child.exitCode !== null || child.signalCode) return resolve();
    child.once('exit', () => resolve());
    child.kill(sig);
  });
  process.on('exit', () => { try { child?.kill('SIGKILL'); } catch {} });

  async function spawnEngine() {
    fs.mkdirSync(stateDir, { recursive: true });
    const out = fs.openSync(path.join(stateDir, 'engine.log'), 'a');
    child = spawn(process.execPath, [path.join(HERE, 'fake-engine.mjs')], { env: { ...process.env, FAKE_MODE: mode, FAKE_STATE_DIR: stateDir }, stdio: ['ignore', out, out] });
    const portFile = path.join(stateDir, 'port');
    for (let i = 0; i < 100; i++) {
      await new Promise((r) => setTimeout(r, 50));
      if (!fs.existsSync(portFile)) continue;
      base = `http://127.0.0.1:${fs.readFileSync(portFile, 'utf8')}`;
      const ok = await fetch(`${base}/health`).then((r) => r.ok, () => false);
      if (ok) return;
    }
    throw new Error('fake engine did not become ready');
  }

  const call = async (method, p, body) => {
    const r = await fetch(base + p, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(5000) });
    return { status: r.status, body: await r.json() };
  };

  return {
    name,
    async start() { fs.rmSync(stateDir, { recursive: true, force: true }); await spawnEngine(); },
    async kill(target = 'worker') { await killChild('SIGKILL'); }, // single process: worker == server
    async restart() { await killChild('SIGKILL'); await spawnEngine(); },
    async startRun(flowPath, input) { return (await call('POST', '/runs', { flow: flowPath, input })).body.run_id; },
    async signal(runId, nodeId, payload) {
      const r = await call('POST', `/runs/${runId}/signal`, payload);
      if (r.status !== 200) throw new Error(`signal HTTP ${r.status}`);
    },
    async status(runId) {
      const r = await call('GET', `/runs/${runId}`);
      if (r.status === 404) return { status: 'failed', error: { code: 'run_not_found' } };
      return r.body;
    },
    async stop() { await killChild('SIGTERM'); },
  };
}

export default makeFakeAdapter('durable', process.env.FAKE_BUG ? `fake-bug-${process.env.FAKE_BUG}` : 'fake');
