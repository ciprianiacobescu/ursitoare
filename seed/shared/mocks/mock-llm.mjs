#!/usr/bin/env node
// mock-llm: deterministic, counting, OpenAI-compatible chat-completions mock (design.md section 5).
import { JsonlLog, parseCallHeader, readJson, send, serve, bindHost, sleep } from './lib/common.mjs';
import { fillSchema } from './lib/schema.mjs';
import { INVOICES, LARGE_THRESHOLD, findInvoiceId } from './lib/fixtures.mjs';

const PORT = Number(process.env.MOCK_LLM_PORT || 18901);
const MODE = process.env.MOCK_LLM_MODE || 'mock'; // 'mock' | 'ollama' (demos only, never for measurements)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/v1/chat/completions';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:2b';

const log = new JsonlLog('llm-calls.jsonl');
let entries = [];
let seq = 0;
let rejected = 0;
let delays = {}; // node_id -> ms, set via POST /reset {delays:{classify:500}} (optional, default none)

function messageText(m) {
  if (typeof m.content === 'string') return m.content;
  if (Array.isArray(m.content)) return m.content.map((p) => (typeof p === 'string' ? p : p?.text ?? '')).join('\n');
  return '';
}

/** Last `key: value` / `"key": value` occurrence in the text (JSON, YAML-ish or escaped JSON). */
function field(text, key) {
  const re = new RegExp(`(?<![A-Za-z0-9_])\\\\?["']?${key}\\\\?["']?\\s*[:=]\\s*\\\\?["']?([A-Za-z0-9_.\\-]+)`, 'gi');
  let last = null;
  for (const m of text.matchAll(re)) last = m[1];
  return last;
}

/** Design section 5 decide rules, computed from the request's input content. */
function computeDecision(text) {
  const vs = field(text, 'vendor_status');
  const large = field(text, 'is_large');
  const amountStr = field(text, 'amount');
  const invId = findInvoiceId(text);
  if (vs && vs.toLowerCase() === 'blocked') return { outcome: 'reject', why: 'vendor_status=blocked', via: 'fields' };
  if (large !== null) {
    return large.toLowerCase() === 'true'
      ? { outcome: 'needs_review', why: 'is_large=true', via: 'fields' }
      : { outcome: 'auto_approve', why: `vendor_status=${vs ?? 'n/a'}, is_large=false`, via: 'fields' };
  }
  if (amountStr !== null && !Number.isNaN(Number(amountStr))) {
    return Number(amountStr) > LARGE_THRESHOLD
      ? { outcome: 'needs_review', why: `amount ${amountStr} > ${LARGE_THRESHOLD}`, via: 'fields' }
      : { outcome: 'auto_approve', why: `amount ${amountStr} <= ${LARGE_THRESHOLD}`, via: 'fields' };
  }
  if (invId) return { outcome: INVOICES[invId].outcome, why: `fixture ${invId}`, via: 'invoice_fixture' };
  if (vs) return { outcome: 'auto_approve', why: `vendor_status=${vs}, no amount info`, via: 'fields' };
  return null;
}

/** Fill an extract/generate schema from invoice fixtures found anywhere in the messages. */
function extractHints(text) {
  const id = findInvoiceId(text);
  if (!id) return { id: null, hints: {} };
  const f = INVOICES[id];
  const hints = {
    invoice_id: id, invoice_number: id, id,
    vendor_name: f.vendor_name, vendor: f.vendor_name, supplier: f.vendor_name, supplier_name: f.vendor_name, company: f.vendor_name,
    amount: f.amount, total: f.amount, total_amount: f.amount, gross_amount: f.amount, amount_due: f.amount,
    currency: f.currency, currency_code: f.currency,
    due_date: f.due_date, due: f.due_date,
    vendor_status: f.vendor_status,
    is_large: f.amount > LARGE_THRESHOLD,
  };
  return { id, hints };
}

function envelope(model, message, finish) {
  return {
    id: `chatcmpl-mock-${String(seq).padStart(6, '0')}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, message, finish_reason: finish }],
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

function record(entry) {
  entry.seq = ++seq;
  entry.ts = new Date().toISOString();
  entries.push(entry);
  log.append(entry);
  return entry;
}

async function chat(req, res) {
  const rawHeader = req.headers['x-ursitoare-call'];
  const call = parseCallHeader(rawHeader);
  if (!call) {
    rejected++;
    return send(res, 400, {
      error: { message: 'X-Ursitoare-Call header is required, format <run_id>:<node_id>:<attempt>', type: 'invalid_request_error', code: 'missing_call_header' },
    });
  }
  const body = await readJson(req);
  if (body.stream) {
    rejected++;
    return send(res, 400, { error: { message: 'stream=true is not supported by mock-llm', type: 'invalid_request_error', code: 'stream_unsupported' } });
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const allText = messages.map(messageText).join('\n');
  const inputText = messages.filter((m) => m.role !== 'system').map(messageText).join('\n') || allText;
  const schema = body.response_format?.json_schema?.schema ?? body.response_format?.schema ?? null;
  const tools = Array.isArray(body.tools) ? body.tools : [];
  const hasToolResult = messages.some((m) => m.role === 'tool' || m.role === 'function');
  const model = body.model || 'mock-llm';
  const base = { ...call, call_header: rawHeader, model, n_messages: messages.length, has_tools: tools.length > 0, has_schema: !!schema };

  if (MODE === 'ollama') {
    const t0 = Date.now();
    try {
      const r = await fetch(OLLAMA_URL, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, model: OLLAMA_MODEL }),
        signal: AbortSignal.timeout(Number(process.env.OLLAMA_TIMEOUT_MS || 120000)),
      });
      const text = await r.text();
      record({ ...base, kind: 'ollama_forward', status: r.status, elapsed_ms: Date.now() - t0 });
      return send(res, r.status, text);
    } catch (e) {
      record({ ...base, kind: 'ollama_forward', status: 502, error: String(e.message || e) });
      return send(res, 502, { error: { message: `ollama forward failed: ${e.message}`, type: 'upstream_error' } });
    }
  }

  // --- agent tool-calling script: first tool once, then final JSON ---
  if (tools.length > 0 && !hasToolResult) {
    const fn = tools[0].function || tools[0];
    const { id: invId, hints } = extractHints(inputText);
    const args = fillSchema(fn.parameters || { type: 'object', properties: {} }, { hints, stringDefault: 'placeholder' });
    record({ ...base, kind: 'tool_call', status: 200, tool: fn.name, invoice_id: invId });
    if (delays[call.node_id]) await sleep(delays[call.node_id]);
    return send(res, 200, envelope(model, {
      role: 'assistant', content: null,
      tool_calls: [{ id: `call_mock_${String(seq).padStart(6, '0')}`, type: 'function', function: { name: fn.name, arguments: JSON.stringify(args) } }],
    }, 'tool_calls'));
  }

  const isDecide = Array.isArray(schema?.properties?.outcome?.enum);
  let content;
  let extra;
  if (isDecide) {
    const decision = computeDecision(inputText);
    const enumVals = schema.properties.outcome.enum;
    const fail = (message) => {
      record({ ...base, kind: 'decide', status: 422, error: message });
      return send(res, 422, { error: { message, type: 'mock_decide_unresolvable', code: 'decide_unresolvable', allowed_outcomes: enumVals } });
    };
    if (!decision) return fail('mock-llm decide: found no vendor_status / is_large / amount / known invoice id in the request messages, cannot apply the section-5 rules');
    if (!enumVals.includes(decision.outcome)) return fail(`mock-llm decide: rule result "${decision.outcome}" (${decision.why}) is not in the schema outcome enum ${JSON.stringify(enumVals)}`);
    const out = fillSchema(schema, { stringDefault: 'n/a' });
    out.outcome = decision.outcome;
    out.rationale = `mock rule: ${decision.why}`;
    content = out;
    extra = { kind: 'decide', outcome: decision.outcome, via: decision.via, why: decision.why };
  } else if (schema) {
    const { id, hints } = extractHints(inputText);
    content = fillSchema(schema, { hints, stringDefault: 'n/a' });
    extra = { kind: tools.length ? 'agent_final' : 'extract', invoice_id: id, output: content };
  } else {
    content = tools.length ? { result: 'done' } : null;
    extra = { kind: tools.length ? 'agent_final' : 'text' };
  }
  record({ ...base, status: 200, ...extra });
  if (delays[call.node_id]) await sleep(delays[call.node_id]);
  const text = content === null ? 'OK' : JSON.stringify(content);
  return send(res, 200, envelope(model, { role: 'assistant', content: text }, 'stop'));
}

function countsFor(list) {
  const counts = {};
  for (const e of list) counts[e.node_id] = (counts[e.node_id] || 0) + 1;
  return counts;
}

await serve({
  name: 'mock-llm', port: PORT, host: bindHost(),
  async handler(req, res, url) {
    const p = url.pathname;
    if (req.method === 'POST' && (p === '/v1/chat/completions' || p === '/chat/completions')) return chat(req, res);
    if (req.method === 'GET' && p === '/health') return send(res, 200, { ok: true, name: 'mock-llm', mode: MODE, pid: process.pid });
    if (req.method === 'GET' && (p === '/v1/models' || p === '/models')) return send(res, 200, { object: 'list', data: [{ id: 'mock-llm', object: 'model' }] });
    if (req.method === 'GET' && p === '/calls') {
      const runId = url.searchParams.get('run_id');
      const nodeId = url.searchParams.get('node_id');
      let list = entries;
      if (runId) list = list.filter((e) => e.run_id === runId);
      if (nodeId) list = list.filter((e) => e.node_id === nodeId);
      const byRun = {};
      for (const e of list) (byRun[e.run_id] ||= {})[e.node_id] = (byRun[e.run_id][e.node_id] || 0) + 1;
      return send(res, 200, { run_id: runId, total: list.length, rejected, counts: countsFor(list), by_run: byRun, entries: list });
    }
    if (req.method === 'POST' && p === '/reset') {
      const body = await readJson(req);
      entries = []; seq = 0; rejected = 0; log.clear();
      delays = body.delays && typeof body.delays === 'object' ? { ...body.delays } : {};
      return send(res, 200, { ok: true, delays });
    }
    return send(res, 404, { error: 'not_found', path: p });
  },
});
