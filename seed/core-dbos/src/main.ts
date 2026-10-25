// Engine process: DBOS runtime (worker) + HTTP API on one port. SIGKILL-able; recovery happens in DBOS.launch().
import { DBOS } from '@dbos-inc/dbos-sdk';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { parse as parseYaml } from 'yaml';
import { runFlow, loadFlow, type RunInput } from './interpreter.ts';
import { RunFailure } from './errors.ts';

const PORT = Number(process.env.ENGINE_PORT ?? 18910);
const DB_URL = process.env.DBOS_DATABASE_URL ?? 'postgres://dbos:dbos-spike-local@127.0.0.1:55432/ursitoare';
const T0 = Date.now();

DBOS.setConfig({
  name: 'ursitoare-core',
  systemDatabaseUrl: DB_URL,
  applicationVersion: process.env.APP_VERSION ?? 'spike-1', // stable across restarts so recovery picks runs up
  logLevel: process.env.DBOS_LOG_LEVEL ?? 'warn',
  enableOTLP: false,
});

const json = (res: ServerResponse, code: number, body: unknown) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const readBody = (req: IncomingMessage) => new Promise<any>((resolve, reject) => {
  const chunks: Buffer[] = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => { try { const t = Buffer.concat(chunks).toString(); resolve(t ? JSON.parse(t) : {}); } catch (e) { reject(e); } });
  req.on('error', reject);
});

function parseError(raw: unknown): { code: string; message: string; node?: string; detail?: unknown } {
  const msg = typeof raw === 'object' && raw && 'message' in raw ? String((raw as Error).message) : String(raw);
  try { const j = JSON.parse(msg); if (j && typeof j.code === 'string') return j; } catch { /* not ours */ }
  return { code: 'engine_error', message: msg };
}

async function runStatus(id: string, detail = false) {
  const ws = await DBOS.getWorkflowStatus(id);
  if (!ws || ws.workflowName !== 'runFlow') return null;
  const ri = (ws.input?.[0] ?? {}) as Partial<RunInput>;
  const base = { runId: id, flow: ri.def?.flow, flow_version: ri.def?.version, flow_hash: ri.hash, dbos_status: ws.status };
  if (ws.status === 'SUCCESS') {
    const o = ws.output as { node: string; output: unknown };
    return { ...base, status: 'completed', node: o.node, output: o.output };
  }
  if (ws.status === 'ERROR') { const e = parseError(ws.error); return { ...base, status: 'failed', node: e.node, error: e }; }
  if (ws.status === 'CANCELLED' || ws.status === 'MAX_RECOVERY_ATTEMPTS_EXCEEDED') return { ...base, status: 'failed', error: { code: ws.status.toLowerCase(), message: ws.status } };
  const ev = await DBOS.getEvent<{ status: string; node?: string }>(id, 'state', { timeoutSeconds: 0 }).catch(() => null);
  const out: Record<string, unknown> = { ...base, status: ev?.status === 'waiting' ? 'waiting' : 'running', node: ev?.status === 'waiting' ? ev.node : undefined };
  if (ev?.status === 'waiting') out.parked = ev;
  if (detail) { const steps = (await DBOS.listWorkflowSteps(id)) ?? []; out.last_completed_step = steps.at(-1)?.name; }
  return out;
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://x');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  try {
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, uptime_ms: Date.now() - T0 });
    if (req.method === 'POST' && url.pathname === '/runs') {
      const b = await readBody(req);
      if (typeof b.flowPath !== 'string') return json(res, 400, { error: 'flowPath required' });
      const text = readFileSync(b.flowPath, 'utf8');
      const def = loadFlow(text, parseYaml(text));
      const hash = createHash('sha256').update(text).digest('hex'); // content hash pinned on the run (the parsed definition itself is the workflow input)
      const runId = b.runId ?? randomUUID();
      const input: RunInput = { def, hash, inputs: b.input ?? {}, principal: b.principal ?? 'user:spike', origin: runId };
      await DBOS.startWorkflow(runFlow, { workflowID: runId, workflowAttributes: { flow: def.flow, flow_version: def.version, flow_hash: hash } })(input);
      return json(res, 201, { runId, flow: def.flow, flow_version: def.version, flow_hash: hash });
    }
    if (req.method === 'GET' && parts[0] === 'runs' && parts.length === 2) {
      const s = await runStatus(parts[1]!, url.searchParams.has('detail'));
      return s ? json(res, 200, s) : json(res, 404, { status: 'failed', error: { code: 'run_not_found' } });
    }
    if (req.method === 'GET' && parts[0] === 'runs' && parts[2] === 'steps') {
      const steps = await DBOS.listWorkflowSteps(parts[1]!);
      return steps ? json(res, 200, steps.map((s) => ({ id: s.functionID, name: s.name, output: s.output, error: s.error?.message ?? null, started: s.startedAtEpochMs, completed: s.completedAtEpochMs }))) : json(res, 404, { error: 'run_not_found' });
    }
    if (req.method === 'POST' && parts[0] === 'runs' && parts[2] === 'signal' && parts.length === 4) {
      const body = await readBody(req);
      if (!(await DBOS.getWorkflowStatus(parts[1]!))) return json(res, 404, { error: 'run_not_found' });
      await DBOS.send(parts[1]!, body, parts[3]!); // durable: queued in the system DB until the run recv()s it
      return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && parts[0] === 'runs' && parts[2] === 'fork' && parts.length === 3) {
      const b = await readBody(req); // {step: <DBOS function id>, runId?}
      const h = await DBOS.forkWorkflow(parts[1]!, Number(b.step), { newWorkflowID: b.runId });
      return json(res, 201, { runId: h.workflowID, forkedFrom: parts[1], startStep: Number(b.step) });
    }
    if (req.method === 'POST' && parts[0] === 'callbacks' && parts.length === 2) {
      const body = await readBody(req);
      const corr = parts[1]!;
      const runId = corr.slice(0, corr.lastIndexOf(':'));
      if (!(await DBOS.getWorkflowStatus(runId))) return json(res, 404, { error: 'run_not_found' });
      await DBOS.send(runId, { correlation_id: corr, result: body.result }, corr, `cb:${corr}`); // 2xx only after the result is durably stored; idempotent per correlation id
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'not_found' });
  } catch (e) {
    if (e instanceof RunFailure) return json(res, 400, { error: e.toJSON() });
    console.error('request error', e);
    return json(res, 500, { error: String((e as Error).message ?? e) });
  }
}

await DBOS.launch();
const server = createServer((req, res) => { void handle(req, res); });
server.listen(PORT, '127.0.0.1', () => console.log(JSON.stringify({ ready: true, port: PORT, start_ms: Date.now() - T0 })));
