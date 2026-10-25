#!/usr/bin/env node
// SELF-TEST ONLY. A tiny hard-coded RF-1 "engine" used to prove the harness logic. Not a design proposal.
//   FAKE_MODE=durable   journals every step to FAKE_STATE_DIR and resumes unfinished runs on start (at-least-once, like a naive checkpointing engine)
//   FAKE_BUG=rerun-llm     (negative control) llm step results are not journaled, so a crash re-calls the LLM  -> RT-1 must FAIL on counts
//   FAKE_BUG=fresh-key     (negative control) idempotency key changes per attempt, so a crash double-pays       -> RT-3 must FAIL on effects
//   FAKE_MODE=volatile  keeps everything in memory; a kill loses all runs (negative control: durability tests must FAIL)
// Listens on an OS-assigned port (first start), persisted in FAKE_STATE_DIR/port and reused on restart so callback URLs stay valid.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const MODE = process.env.FAKE_MODE || 'durable';
const DIR = process.env.FAKE_STATE_DIR;
const LLM = process.env.MOCK_LLM_URL || 'http://127.0.0.1:18901';
const TOOLS = process.env.MOCK_TOOLS_URL || 'http://127.0.0.1:18902';
const N8N = process.env.MOCK_N8N_URL || 'http://127.0.0.1:18903';
const durable = MODE === 'durable';
const BUG = process.env.FAKE_BUG || '';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runs = new Map();
const runFile = (id) => path.join(DIR, `run-${id}.json`);
function persist(run) { if (durable) fs.writeFileSync(runFile(run.id), JSON.stringify(run)); }

function parseDuration(iso) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) throw new Error(`unsupported duration ${iso}`);
  return (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) * 1000;
}

async function post(url, body, headers) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (!r.ok) throw Object.assign(new Error(`${url} -> HTTP ${r.status} ${text.slice(0, 200)}`), { code: 'step_failed' });
  return json;
}

async function step(run, node, fn) {
  if (run.steps[node] !== undefined) return run.steps[node];
  run.node = node; run.attempts[node] = (run.attempts[node] || 0) + 1; persist(run);
  const v = await fn(run.attempts[node]);
  if (BUG === 'rerun-llm' && (node === 'extract' || node === 'classify')) { run.steps_volatile ??= {}; run.steps_volatile[node] = v; return v; }
  run.steps[node] = v; persist(run);
  return v;
}

const llm = async (run, node, attempt, messages, schema) => {
  const r = await post(`${LLM}/v1/chat/completions`, { model: 'mock', messages, response_format: { type: 'json_schema', json_schema: { name: node, schema } } }, { 'X-Ursitoare-Call': `${run.id}:${node}:${attempt}` });
  return JSON.parse(r.choices[0].message.content);
};
const tool = (run, node, block, body, key) => post(`${TOOLS}/blocks/${block}`, body, { 'X-Ursitoare-Call': `${run.id}:${node}:${run.attempts[node]}`, ...(key ? { 'Idempotency-Key': key } : {}) });

/** The policy hook stub from design section 6: deny erp.create_payment@1 when amount > 10000. */
function policyCheck({ tool: t, args }) {
  if (t === 'erp.create_payment@1' && args.amount > 10000) return { decision: 'deny', reason: `amount ${args.amount} > 10000` };
  return { decision: 'allow' };
}

async function exec(run) {
  try {
    const S = run.steps;
    const inv = await step(run, 'fetch_invoice', () => tool(run, 'fetch_invoice', 'invoices.get@1', { invoice_id: run.input.invoice_id }));
    const ex = await step(run, 'extract', (a) => llm(run, 'extract', a, [{ role: 'user', content: JSON.stringify({ text: inv.raw_text }) }], { type: 'object', properties: { vendor_name: { type: 'string' }, amount: { type: 'number' }, currency: { type: 'string' }, due_date: { type: 'string' } }, required: ['vendor_name', 'amount', 'currency'] }));
    const vendor = await step(run, 'lookup_vendor', () => tool(run, 'lookup_vendor', 'erp.lookup_vendor@1', { vendor_name: ex.vendor_name }));
    const norm = await step(run, 'normalize', async () => ({ amount: Math.round(ex.amount * 100) / 100, currency: ex.currency.toUpperCase(), is_large: ex.amount > 1000 }));
    const cls = await step(run, 'classify', (a) => llm(run, 'classify', a, [{ role: 'system', content: 'Reject blocked vendors. Send large amounts for review. Auto-approve the rest.' }, { role: 'user', content: JSON.stringify({ vendor_status: vendor.status, amount: norm.amount, is_large: norm.is_large }) }], { type: 'object', properties: { outcome: { type: 'string', enum: ['auto_approve', 'needs_review', 'reject'] }, rationale: { type: 'string' } }, required: ['outcome', 'rationale'] }));

    let approved = cls.outcome === 'auto_approve';
    if (cls.outcome === 'needs_review') {
      run.node = 'approval'; run.status = 'waiting';
      run.deadline ??= Date.now() + run.approval_timeout_ms; persist(run);
      while (!run.signal && Date.now() < run.deadline) await sleep(50);
      approved = run.signal?.decision === 'approved';
      run.status = 'running'; persist(run);
    }
    if (!approved) {
      await step(run, 'notify_rejection', () => tool(run, 'notify_rejection', 'mail.send@1', { to: 'ap@example.com', subject: `Invoice ${run.input.invoice_id} rejected`, body: 'Rejected by policy or by the reviewer.' }, `${run.id}:notify_rejection`));
      return finish(run, 'completed', 'rejected');
    }
    const payArgs = { vendor_id: vendor.vendor_id, amount: norm.amount, currency: norm.currency, reference: run.input.invoice_id };
    const pay = await step(run, 'pay', async () => {
      const verdict = policyCheck({ tool: 'erp.create_payment@1', args: payArgs });
      if (verdict.decision === 'deny') throw Object.assign(new Error(verdict.reason), { code: 'policy_denied' });
      return tool(run, 'pay', 'erp.create_payment@1', payArgs, `${run.id}:pay${BUG === 'fresh-key' ? ':' + run.attempts.pay : ''}`);
    });
    if (!run.delegate_sent) {
      await post(`${N8N}/webhook/archive-invoice`, { correlation_id: `${run.id}:archive`, callback_url: `http://127.0.0.1:${PORT}/callback/${run.id}`, payload: { invoice_id: run.input.invoice_id, payment_id: pay.payment_id } });
      run.delegate_sent = true; run.node = 'archive'; persist(run);
    }
    while (!run.callback) await sleep(50);
    return finish(run, 'completed', 'done', { payment_id: pay.payment_id });
  } catch (e) {
    return finish(run, 'failed', run.node, undefined, { code: e.code || 'step_failed', message: e.message });
  }
}

function finish(run, status, node, output, error) {
  run.status = status; run.node = node; run.output = output; run.error = error; run.done = true; persist(run);
}

let PORT = 0;
function view(run) {
  const { status, node, output, error } = run;
  return { status: status === 'waiting' ? 'waiting' : run.done ? status : 'running', node, output, error };
}

const json = (res, code, body) => { const s = JSON.stringify(body); res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(s) }); res.end(s); };
const server = http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  const u = new URL(req.url, 'http://x');
  const m = /^\/(runs|callback)\/([^/]+)(?:\/(signal))?$/.exec(u.pathname);
  if (u.pathname === '/health') return json(res, 200, { ok: true, mode: MODE });
  if (req.method === 'POST' && u.pathname === '/runs') {
    const id = `fake-${Date.now().toString(36)}-${runs.size + 1}`;
    const flowText = fs.readFileSync(body.flow, 'utf8');
    const t = /approval:[\s\S]*?timeout:\s*(PT\S+)/.exec(flowText);
    const run = { id, input: body.input, flow: body.flow, approval_timeout_ms: parseDuration(t ? t[1] : 'PT48H'), status: 'running', node: 'fetch_invoice', steps: {}, attempts: {}, done: false };
    runs.set(id, run); persist(run); exec(run);
    return json(res, 200, { run_id: id });
  }
  if (m && m[1] === 'runs' && req.method === 'GET') { const r = runs.get(m[2]); return r ? json(res, 200, view(r)) : json(res, 404, { error: 'run_not_found' }); }
  if (m && m[1] === 'runs' && m[3] === 'signal' && req.method === 'POST') {
    const r = runs.get(m[2]);
    if (!r) return json(res, 404, { error: 'run_not_found' });
    r.signal = body; persist(r); return json(res, 200, { ok: true });
  }
  if (m && m[1] === 'callback' && req.method === 'POST') {
    const r = runs.get(m[2]);
    if (!r) return json(res, 404, { error: 'run_not_found' });
    r.callback = body.result; persist(r); return json(res, 200, { ok: true });
  }
  json(res, 404, { error: 'not_found' });
});

const portFile = path.join(DIR, 'port');
const wantPort = fs.existsSync(portFile) ? Number(fs.readFileSync(portFile, 'utf8')) : 0;
server.listen(wantPort, '127.0.0.1', () => {
  PORT = server.address().port;
  fs.writeFileSync(portFile, String(PORT));
  if (durable) {
    for (const f of fs.readdirSync(DIR).filter((x) => x.startsWith('run-'))) {
      const run = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      runs.set(run.id, run);
      if (!run.done) { run.signal ??= undefined; exec(run); }
    }
  }
  console.log(`fake-engine ${MODE} listening on ${PORT}`);
});
