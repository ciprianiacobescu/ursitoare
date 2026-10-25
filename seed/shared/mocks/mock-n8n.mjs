#!/usr/bin/env node
// mock-n8n: webhook in, delayed callback out, retrying (design.md section 5 and RT-5).
import { JsonlLog, readJson, send, serve, bindHost, hash } from './lib/common.mjs';

const PORT = Number(process.env.MOCK_N8N_PORT || 18903);
const ENV_DELAY = Number(process.env.DELEGATE_DELAY_MS || 500);
const RETRY_MS = Number(process.env.CALLBACK_RETRY_MS || 1000);
const RETRY_WINDOW_MS = Number(process.env.CALLBACK_RETRY_WINDOW_MS || 30000);
const ATTEMPT_TIMEOUT_MS = Number(process.env.CALLBACK_ATTEMPT_TIMEOUT_MS || 2000);

const log = new JsonlLog('n8n-calls.jsonl');
let entries = [];
let seq = 0;
let epoch = 0; // bumped by /reset to cancel in-flight deliveries
let delayOverride = null; // POST /reset {delegate_delay_ms: N}
let deliveries = new Map(); // delivery id -> {correlation_id, state}
const delay = () => (delayOverride ?? ENV_DELAY);

function record(e) { e.seq = ++seq; e.ts = new Date().toISOString(); entries.push(e); log.append(e); return e; }

async function deliver(id, myEpoch, { correlation_id, callback_url, workflow, payload }) {
  const result = { archived: true, workflow, archive_id: `ARC-${hash(correlation_id, 8).toUpperCase()}`, payload };
  const body = JSON.stringify({ correlation_id, result });
  const started = Date.now();
  let attempt = 0;
  for (;;) {
    if (myEpoch !== epoch) return;
    attempt++;
    let outcome;
    try {
      const r = await fetch(callback_url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
      await r.text().catch(() => {});
      outcome = r.status >= 200 && r.status < 300 ? { state: 'delivered', http_status: r.status } : { state: 'failed', http_status: r.status };
    } catch (e) {
      outcome = { state: 'failed', error: String(e.cause?.code || e.message || e) };
    }
    if (myEpoch !== epoch) return;
    record({ type: 'callback_attempt', delivery: id, correlation_id, workflow, callback_url, attempt, ...outcome });
    deliveries.set(id, { correlation_id, state: outcome.state });
    if (outcome.state === 'delivered') return;
    if (Date.now() - started + RETRY_MS > RETRY_WINDOW_MS) {
      record({ type: 'callback_gave_up', delivery: id, correlation_id, workflow, callback_url, attempts: attempt });
      deliveries.set(id, { correlation_id, state: 'gave_up' });
      return;
    }
    await new Promise((r) => setTimeout(r, RETRY_MS));
  }
}

function summary() {
  const att = entries.filter((e) => e.type === 'callback_attempt');
  return {
    webhook_calls: entries.filter((e) => e.type === 'webhook').length,
    callback_attempts: att.length,
    callbacks_failed: att.filter((e) => e.state === 'failed').length,
    callbacks_delivered: att.filter((e) => e.state === 'delivered').length,
    gave_up: entries.filter((e) => e.type === 'callback_gave_up').length,
    pending: [...deliveries.values()].filter((d) => d.state === 'pending' || d.state === 'failed').length,
    delegate_delay_ms: delay(),
  };
}

await serve({
  name: 'mock-n8n', port: PORT, host: bindHost(),
  async handler(req, res, url) {
    const p = url.pathname;
    if (req.method === 'POST' && p.startsWith('/webhook/')) {
      const workflow = decodeURIComponent(p.slice('/webhook/'.length));
      const body = await readJson(req);
      if (!body.correlation_id || !body.callback_url) {
        record({ type: 'webhook', workflow, status: 400, error: 'correlation_id and callback_url are required', body });
        return send(res, 400, { error: 'invalid_request', message: 'body must be {correlation_id, callback_url, payload}' });
      }
      const dup = entries.some((e) => e.type === 'webhook' && e.status === 202 && e.correlation_id === body.correlation_id);
      const id = `d${seq + 1}`;
      record({ type: 'webhook', workflow, status: 202, correlation_id: body.correlation_id, callback_url: body.callback_url, duplicate: dup, payload: body.payload ?? null, delay_ms: delay() });
      deliveries.set(id, { correlation_id: body.correlation_id, state: 'pending' });
      const myEpoch = epoch;
      setTimeout(() => deliver(id, myEpoch, { correlation_id: body.correlation_id, callback_url: body.callback_url, workflow, payload: body.payload ?? null }), delay());
      return send(res, 202, { accepted: true, correlation_id: body.correlation_id, execution_id: id });
    }
    if (req.method === 'GET' && p === '/health') return send(res, 200, { ok: true, name: 'mock-n8n', pid: process.pid });
    if (req.method === 'GET' && p === '/calls') {
      const corr = url.searchParams.get('correlation_id');
      const list = corr ? entries.filter((e) => e.correlation_id === corr) : entries;
      return send(res, 200, { ...summary(), entries: list });
    }
    if (req.method === 'POST' && p === '/reset') {
      const body = await readJson(req);
      epoch++; entries = []; seq = 0; deliveries = new Map(); log.clear();
      delayOverride = Number.isFinite(Number(body.delegate_delay_ms)) && body.delegate_delay_ms !== undefined ? Number(body.delegate_delay_ms) : null;
      return send(res, 200, { ok: true, delegate_delay_ms: delay() });
    }
    return send(res, 404, { error: 'not_found', path: p });
  },
});
