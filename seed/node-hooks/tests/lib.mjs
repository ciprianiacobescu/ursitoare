// Shared test plumbing: engine lifecycle (modelled on core-dbos/adapter.mjs), mock helpers, JSONL readers.
import { spawn, execFile } from 'node:child_process';
import { openSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');               // node-hooks/
export const SPIKES = path.resolve(ROOT, '..');             // ursitoare-spikes/
export const STATE = path.join(ROOT, '.state');
export const PORT = Number(process.env.ENGINE_PORT ?? 18930);
export const BASE = `http://127.0.0.1:${PORT}`;
export const LLM = process.env.MOCK_LLM_URL ?? 'http://127.0.0.1:18901';
export const TOOLS = process.env.MOCK_TOOLS_URL ?? 'http://127.0.0.1:18902';
export const N8N = process.env.MOCK_N8N_URL ?? 'http://127.0.0.1:18903';
export const POLICY_LOG = path.join(STATE, 'policy-decisions.jsonl');
export const HOOK_EXEC = path.join(STATE, 'hook-exec.jsonl');
export const RF1 = path.join(SPIKES, 'shared/flows/rf-1-invoice-intake.yaml');
export const flow = (name) => path.join(ROOT, 'flows', name.endsWith('.yaml') ? name : `${name}.yaml`);

const exec = promisify(execFile);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const j = (u, o) => fetch(u, o).then((r) => r.json());
const sh = (cmd, args) => exec(cmd, args, { cwd: ROOT });

export async function ensurePostgres() { await sh('docker', ['compose', '-p', 'us-hk', 'up', '-d', '--wait']); }
export async function resetDatabase() { // drop/recreate the system database in OUR container only
  const psql = (sql) => sh('docker', ['exec', 'us-hk-postgres', 'psql', '-U', 'dbos', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql]);
  await psql('DROP DATABASE IF EXISTS ursitoare WITH (FORCE)');
  await psql('CREATE DATABASE ursitoare');
}
export async function pgQuery(sql) {
  const r = await sh('docker', ['exec', 'us-hk-postgres', 'psql', '-U', 'dbos', '-d', 'ursitoare', '-At', '-c', sql]);
  return r.stdout.trim();
}

export class Engine {
  child = null;
  envSig = null;
  get alive() { return !!this.child && this.child.exitCode === null && !this.child.signalCode; }
  get pid() { return this.child?.pid; }
  async spawn(env = {}) {
    mkdirSync(STATE, { recursive: true });
    const out = openSync(path.join(STATE, 'engine.log'), 'a');
    this.envSig = JSON.stringify(env);
    this.child = spawn(process.execPath, ['src/main.ts'], { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', out, out] });
    for (let i = 0; i < 600; i++) {
      if (!this.alive) throw new Error('engine exited during startup; see node-hooks/.state/engine.log');
      const ok = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(1000) }).then((r) => r.ok, () => false);
      if (ok) return;
      await sleep(50);
    }
    throw new Error('engine did not become ready in 30 s');
  }
  async kill() { // external SIGKILL
    if (!this.alive) return;
    await new Promise((resolve) => { this.child.once('exit', resolve); this.child.kill('SIGKILL'); });
  }
  async waitExit(timeoutMs = 20000) { // for internal crashes: wait until the process has died by itself
    const t0 = Date.now();
    while (this.alive) { if (Date.now() - t0 > timeoutMs) throw new Error('engine did not crash in time'); await sleep(10); }
    return { signal: this.child.signalCode, code: this.child.exitCode };
  }
  async api(method, p, body) {
    const r = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  }
}

export async function resetMocks({ tools = {}, n8n = 50, llm = {} } = {}) {
  await Promise.all([
    j(`${LLM}/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(llm) }),
    j(`${TOOLS}/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ delays: tools }) }),
    j(`${N8N}/reset`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ delegate_delay_ms: n8n }) }),
  ]);
}
export async function mockHealth() {
  try { await Promise.all([j(`${LLM}/health`), j(`${TOOLS}/health`), j(`${N8N}/health`)]); return true; } catch { return false; }
}
export async function mockSnapshot() {
  const [l, t, n] = await Promise.all([j(`${LLM}/calls`), j(`${TOOLS}/calls`), j(`${N8N}/calls`)]);
  return { llm: l.counts, tools: t.by_block, tools_total: { calls: t.calls, effects: t.effects, duplicates: t.duplicates, rejected: t.rejected }, n8n: { webhook_calls: n.webhook_calls, callbacks_delivered: n.callbacks_delivered, callbacks_failed: n.callbacks_failed, gave_up: n.gave_up } };
}
export const toolCalls = async (block) => (await j(`${TOOLS}/calls?block=${encodeURIComponent(block)}`));
export const n8nCalls = async () => j(`${N8N}/calls`);

export function readJsonl(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
export function truncate(file) { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, ''); }
export function rmf(file) { rmSync(file, { force: true }); }
export const stepList = (steps) => steps.map((s) => `${s.id}:${s.name}`);
