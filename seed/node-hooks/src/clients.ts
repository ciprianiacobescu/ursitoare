// The only module that talks to the outside world (mock-tools, mock-llm, mock-n8n). Everything here is called
// exclusively from interpreter.ts `guarded()` steps, after policy.check (see lint.mjs, which enforces that).
import { RunFailure } from './errors.ts';

export const cfg = {
  llm: process.env.MOCK_LLM_URL ?? 'http://127.0.0.1:18901',
  tools: process.env.MOCK_TOOLS_URL ?? 'http://127.0.0.1:18902',
  n8n: process.env.MOCK_N8N_URL ?? 'http://127.0.0.1:18903',
  callbackBase: process.env.CALLBACK_BASE ?? 'http://127.0.0.1:18930',
};

async function post(url: string, body: unknown, headers: Record<string, string>, timeoutMs = 30000) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  const text = await r.text();
  let json: unknown; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, json };
}

export async function callBlock(block: string, args: unknown, o: { runId: string; nodeId: string; attempt: number; effect: string; idemKey: string }) {
  const headers: Record<string, string> = { 'X-Ursitoare-Call': `${o.runId}:${o.nodeId}:${o.attempt}` };
  if (o.effect !== 'read') headers['Idempotency-Key'] = o.idemKey; // stable across DBOS step retries, recovery and forks (built from the id of the run that was originally started)
  const r = await post(`${cfg.tools}/blocks/${block}`, args, headers);
  if (r.status !== 200) throw new RunFailure('block_error', `block ${block} -> HTTP ${r.status}: ${JSON.stringify(r.json)}`, o.nodeId);
  return r.json;
}

export async function callLlm(o: { runId: string; nodeId: string; attempt: number; model: string; instructions: string; input: unknown; schema: unknown }) {
  const body = {
    model: o.model,
    messages: [{ role: 'system', content: o.instructions }, { role: 'user', content: JSON.stringify(o.input) }],
    response_format: { type: 'json_schema', json_schema: { name: 'result', strict: true, schema: o.schema } },
  };
  const r = await post(`${cfg.llm}/v1/chat/completions`, body, { 'X-Ursitoare-Call': `${o.runId}:${o.nodeId}:${o.attempt}` });
  if (r.status !== 200) throw new RunFailure('llm_error', `llm HTTP ${r.status}: ${JSON.stringify(r.json)}`, o.nodeId);
  const content = (r.json as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new RunFailure('llm_error', 'llm response has no content', o.nodeId);
  try { return JSON.parse(content); } catch { throw new RunFailure('llm_bad_json', `llm content is not JSON: ${content.slice(0, 200)}`, o.nodeId); }
}

export async function callDelegate(o: { workflow: string; correlationId: string; payload: unknown }) {
  const callback_url = `${cfg.callbackBase}/callbacks/${encodeURIComponent(o.correlationId)}`;
  const r = await post(`${cfg.n8n}/webhook/${o.workflow}`, { correlation_id: o.correlationId, callback_url, payload: o.payload }, {});
  if (r.status !== 202 && r.status !== 200) throw new RunFailure('delegate_error', `n8n webhook HTTP ${r.status}: ${JSON.stringify(r.json)}`);
  return { accepted: true, callback_url };
}
