#!/usr/bin/env node
// Hermetic self-test of the three mocks: spawns them on 18901-18903 (fails if the ports are busy),
// exercises every contract in design.md section 5, kills them. Usage: node selftest.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillSchema, validate } from './lib/schema.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalogue = JSON.parse(fs.readFileSync(path.resolve(here, '../catalogue/blocks.v0.json'), 'utf8'));
const L = 'http://127.0.0.1:18901', T = 'http://127.0.0.1:18902', N = 'http://127.0.0.1:18903';
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mocks-selftest-'));
const children = [];
let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  -> ' + detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const j = async (url, init = {}) => { const r = await fetch(url, init); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t; } return { status: r.status, body: b, headers: r.headers }; };
const post = (url, body, headers = {}) => j(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body ?? {}) });

async function startMocks() {
  for (const p of [18901, 18902, 18903]) {
    const up = await fetch(`http://127.0.0.1:${p}/health`).then(() => true, () => false);
    if (up) { console.error(`port ${p} already in use; run shared/mocks/stop-all.sh first`); process.exit(2); }
  }
  for (const n of ['mock-llm', 'mock-tools', 'mock-n8n']) {
    const c = spawn('node', [path.join(here, `${n}.mjs`)], { env: { ...process.env, MOCK_STATE_DIR: stateDir, MOCK_HOST: '127.0.0.1' }, stdio: 'ignore' });
    children.push(c);
  }
  for (let i = 0; i < 50; i++) {
    const all = await Promise.all([L, T, N].map((u) => fetch(u + '/health').then((r) => r.ok, () => false)));
    if (all.every(Boolean)) return;
    await sleep(100);
  }
  throw new Error('mocks did not start');
}

const decideSchema = { type: 'object', properties: { outcome: { type: 'string', enum: ['auto_approve', 'needs_review', 'reject'] }, rationale: { type: 'string' } }, required: ['outcome', 'rationale'] };
const llm = (node, content, schema, extra = {}) => post(`${L}/v1/chat/completions`, {
  model: 'x', messages: [{ role: 'system', content: 'Reject blocked vendors. Send large amounts for review. Auto-approve the rest.' }, { role: 'user', content }],
  ...(schema ? { response_format: { type: 'json_schema', json_schema: { name: 's', schema } } } : {}), ...extra,
}, { 'X-Ursitoare-Call': `st-run:${node}:1` });
const parsed = (r) => JSON.parse(r.body.choices[0].message.content);

async function testLlm() {
  console.log('\n== mock-llm ==');
  await post(`${L}/reset`);
  ok('missing X-Ursitoare-Call -> 400', (await post(`${L}/v1/chat/completions`, { messages: [] })).status === 400);
  ok('malformed X-Ursitoare-Call -> 400', (await post(`${L}/v1/chat/completions`, { messages: [] }, { 'X-Ursitoare-Call': 'nope' })).status === 400);
  const cases = [
    ['blocked -> reject', { vendor_status: 'blocked', amount: 300, is_large: false }, 'reject'],
    ['blocked+large -> reject', { vendor_status: 'blocked', amount: 5000, is_large: true }, 'reject'],
    ['large -> needs_review', { vendor_status: 'active', amount: 2450, is_large: true }, 'needs_review'],
    ['small -> auto_approve', { vendor_status: 'active', amount: 120.5, is_large: false }, 'auto_approve'],
    ['is_large as string "true"', { vendor_status: 'active', amount: 5, is_large: 'true' }, 'needs_review'],
  ];
  for (const [name, input, want] of cases) { const r = await llm('classify', JSON.stringify(input), decideSchema); ok(`decide: ${name}`, r.status === 200 && parsed(r).outcome === want, JSON.stringify(r.body)); }
  const yamlish = await llm('classify', 'vendor_status: active\namount: 20000\nis_large: true', decideSchema);
  ok('decide: key: value text input', parsed(yamlish).outcome === 'needs_review');
  const byFixture = await llm('classify', 'please look at INV-1003', decideSchema);
  ok('decide: fixture fallback by invoice id (INV-1003 -> reject)', parsed(byFixture).outcome === 'reject');
  const noSignal = await llm('classify', 'hello', decideSchema);
  ok('decide: no signal -> 422', noSignal.status === 422);
  const badEnum = await llm('classify', JSON.stringify({ vendor_status: 'active', is_large: true }), { type: 'object', properties: { outcome: { type: 'string', enum: ['yes', 'no'] } } });
  ok('decide: outcome not in enum -> 422', badEnum.status === 422);

  const exSchema = { type: 'object', properties: { vendor_name: { type: 'string' }, amount: { type: 'number' }, currency: { type: 'string' }, due_date: { type: 'string' }, note: { type: 'string' }, flag: { type: 'boolean' }, items: { type: 'array', items: { type: 'string' } } }, required: ['vendor_name', 'amount', 'currency'] };
  for (const [id, v, a, c] of [['INV-1001', 'Acme GmbH', 2450, 'EUR'], ['INV-1002', 'Globex', 120.5, 'usd'], ['INV-1003', 'Blocked Co', 300, 'EUR'], ['INV-1004', 'Acme GmbH', 20000, 'EUR']]) {
    const raw = (await post(`${T}/blocks/invoices.get@1`, { invoice_id: id })).body.raw_text;
    const r = await llm('extract', JSON.stringify({ text: raw }), exSchema);
    const o = parsed(r);
    ok(`extract ${id} from tools raw_text`, o.vendor_name === v && o.amount === a && o.currency === c && o.flag === false && Array.isArray(o.items) && validate(exSchema, o).length === 0, JSON.stringify(o));
  }
  const tool = [{ type: 'function', function: { name: 'erp_lookup_vendor', parameters: { type: 'object', properties: { vendor_name: { type: 'string' } }, required: ['vendor_name'] } } }];
  const t1 = await llm('agent', 'find vendor', null, { tools: tool });
  ok('agent: first call returns tool_calls for first tool', t1.body.choices[0].finish_reason === 'tool_calls' && t1.body.choices[0].message.tool_calls[0].function.name === 'erp_lookup_vendor' && typeof JSON.parse(t1.body.choices[0].message.tool_calls[0].function.arguments).vendor_name === 'string');
  const t2 = await post(`${L}/v1/chat/completions`, { messages: [{ role: 'user', content: 'x' }, { role: 'tool', content: '{}' }], tools: tool, response_format: { type: 'json_schema', json_schema: { schema: { type: 'object', properties: { answer: { type: 'string' } } } } } }, { 'X-Ursitoare-Call': 'st-run:agent:2' });
  ok('agent: after tool result returns final JSON', t2.body.choices[0].finish_reason === 'stop' && 'answer' in parsed(t2));
  const calls = (await j(`${L}/calls?run_id=st-run`)).body;
  ok('GET /calls?run_id= returns per-node counts', calls.counts.extract === 4 && calls.counts.agent === 2 && calls.counts.classify >= 8, JSON.stringify(calls.counts));
  const lines = fs.readFileSync(path.join(stateDir, 'llm-calls.jsonl'), 'utf8').trim().split('\n').length;
  ok('llm-calls.jsonl has one line per recorded call', lines === calls.total, `${lines} vs ${calls.total}`);
  await post(`${L}/reset`);
  ok('POST /reset clears state', (await j(`${L}/calls`)).body.total === 0 && fs.readFileSync(path.join(stateDir, 'llm-calls.jsonl'), 'utf8') === '');
}

async function testTools() {
  console.log('\n== mock-tools ==');
  await post(`${T}/reset`);
  const names = Object.keys(catalogue.blocks);
  let schemaOk = 0; const bad = [];
  for (const name of names) {
    const def = catalogue.blocks[name];
    const hints = { invoice_id: 'INV-1001', vendor_name: 'Acme GmbH', email: 'jane@example.com' };
    const input = fillSchema(def.input, { hints, stringDefault: 'x' });
    const headers = def.effect === 'read' ? {} : { 'Idempotency-Key': `st:${name}` };
    const r = await post(`${T}/blocks/${name}`, input, headers);
    const errs = r.status === 200 ? validate(def.output, r.body) : [{ message: `HTTP ${r.status} ${JSON.stringify(r.body)}` }];
    errs.length ? bad.push(`${name}: ${JSON.stringify(errs)}`) : schemaOk++;
  }
  ok(`all ${names.length} catalogue blocks return schema-valid output`, schemaOk === names.length, bad.join('; '));
  const nonRead = names.filter((n) => catalogue.blocks[n].effect !== 'read');
  let all400 = true;
  for (const n of nonRead) { const r = await post(`${T}/blocks/${n}`, fillSchema(catalogue.blocks[n].input, { stringDefault: 'x' })); if (r.status !== 400) all400 = false; }
  ok(`all ${nonRead.length} effect!=read blocks require Idempotency-Key (400)`, all400);
  ok('unknown block -> 404', (await post(`${T}/blocks/nope@1`, {})).status === 404);
  ok('invalid input -> 400', (await post(`${T}/blocks/erp.lookup_vendor@1`, {})).status === 400);
  ok('vendors: Acme/Globex active, Blocked Co blocked', (await Promise.all(['Acme GmbH', 'Globex', 'Blocked Co'].map((v) => post(`${T}/blocks/erp.lookup_vendor@1`, { vendor_name: v })))).map((r) => r.body.status).join() === 'active,active,blocked');
  await post(`${T}/reset`);
  const pay = { vendor_id: 'V-ACME', amount: 2450, currency: 'EUR', reference: 'INV-1001' };
  const a = await post(`${T}/blocks/erp.create_payment@1`, pay, { 'Idempotency-Key': 'k1' });
  const b = await post(`${T}/blocks/erp.create_payment@1`, pay, { 'Idempotency-Key': 'k1' });
  const c = await post(`${T}/blocks/erp.create_payment@1`, pay, { 'Idempotency-Key': 'k2' });
  const s = (await j(`${T}/calls?block=erp.create_payment`)).body;
  ok('same key -> identical stored result', JSON.stringify(a.body) === JSON.stringify(b.body) && a.body.payment_id !== c.body.payment_id);
  ok('effects counted separately from calls (calls=3, effects=2, duplicates=1)', s.calls === 3 && s.effects === 2 && s.duplicates === 1, JSON.stringify({ calls: s.calls, effects: s.effects, duplicates: s.duplicates }));
  await post(`${T}/reset`, { delays: { erp_create_payment: 600 } });
  const t0 = Date.now();
  const pending = post(`${T}/blocks/erp.create_payment@1`, pay, { 'Idempotency-Key': 'kd' });
  await sleep(250);
  const mid = (await j(`${T}/calls?block=erp.create_payment`)).body;
  ok('delay: effect committed and logged while the response is still delayed', mid.effects === 1);
  await pending;
  ok('delay: response arrives after DELAY_MS', Date.now() - t0 >= 550, `${Date.now() - t0}ms`);
  await post(`${T}/reset`);
  ok('reset reverts runtime delays and clears idempotency store', (await post(`${T}/blocks/erp.create_payment@1`, pay, { 'Idempotency-Key': 'kd' })).headers.get('x-mock-duplicate') === 'false');
  await post(`${T}/reset`);
}

async function freePort() {
  return new Promise((resolve) => { const s = http.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
}

async function listener(port, onBody) {
  return new Promise((resolve) => {
    const srv = http.createServer((q, s) => { let b = ''; q.on('data', (c) => (b += c)); q.on('end', () => { onBody(JSON.parse(b)); s.end('ok'); }); });
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

async function testN8n() {
  console.log('\n== mock-n8n ==');
  await post(`${N}/reset`, { delegate_delay_ms: 100 });
  const cbPort = await freePort(); // ephemeral: the self-test must not bind ports outside 18901-18903 by choice
  const got = [];
  const srv = await listener(cbPort, (b) => got.push(b));
  const r = await post(`${N}/webhook/archive-invoice`, { correlation_id: 'c1', callback_url: `http://127.0.0.1:${cbPort}/cb`, payload: { invoice_id: 'INV-1002' } });
  ok('webhook -> 202', r.status === 202);
  ok('webhook without callback_url -> 400', (await post(`${N}/webhook/x`, { correlation_id: 'c' })).status === 400);
  await sleep(500);
  ok('callback delivered with {correlation_id, result:{archived:true}}', got.length === 1 && got[0].correlation_id === 'c1' && got[0].result.archived === true, JSON.stringify(got));
  srv.close();
  // retry: callback target down for ~2.3 s, then comes up
  await post(`${N}/reset`, { delegate_delay_ms: 100 });
  await post(`${N}/webhook/archive-invoice`, { correlation_id: 'c2', callback_url: `http://127.0.0.1:${cbPort}/cb`, payload: {} });
  await sleep(2300);
  const mid = (await j(`${N}/calls`)).body;
  ok('callback to a dead target fails and is retried (>=2 failed attempts in 2.3 s)', mid.callbacks_failed >= 2 && mid.callbacks_delivered === 0, JSON.stringify({ f: mid.callbacks_failed, d: mid.callbacks_delivered }));
  const got2 = [];
  const srv2 = await listener(cbPort, (b) => got2.push(b));
  await sleep(1500);
  const end = (await j(`${N}/calls`)).body;
  ok('retry eventually delivered once the target is back', got2.length === 1 && end.callbacks_delivered === 1 && end.pending === 0, JSON.stringify({ got2: got2.length, ...end, entries: undefined }));
  srv2.close();
  await post(`${N}/reset`);
}

try {
  await startMocks();
  await testLlm(); await testTools(); await testN8n();
} catch (e) {
  fail++; console.error('selftest crashed:', e);
} finally {
  for (const c of children) c.kill('SIGKILL');
  fs.rmSync(stateDir, { recursive: true, force: true });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
