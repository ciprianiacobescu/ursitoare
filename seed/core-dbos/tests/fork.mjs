// Debuggability probe: fork a completed RF-1 run from the `classify` step and report what happens (steps, mock counts).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adapter from '../adapter.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RF1 = path.resolve(HERE, '../../shared/flows/rf-1-invoice-intake.yaml');
const LLM = 'http://127.0.0.1:18901', TOOLS = 'http://127.0.0.1:18902', N8N = 'http://127.0.0.1:18903';
const j = (u, o) => fetch(u, o).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function done(id) { for (let i = 0; i < 200; i++) { const s = await adapter.status(id); if (s.status === 'completed' || s.status === 'failed') return s; await sleep(100); } throw new Error('timeout'); }
const counts = async () => { const [l, t, n] = await Promise.all([j(`${LLM}/calls`), j(`${TOOLS}/calls`), j(`${N8N}/calls`)]); return { llm: l.counts, pay: t.by_block['erp.create_payment@1'], webhooks: n.webhook_calls }; };

await adapter.start();
await Promise.all([LLM, TOOLS, N8N].map((u) => j(`${u}/reset`, { method: 'POST' })));
const id = await adapter.startRun(RF1, { invoice_id: 'INV-1002' });
console.log('original run', id, JSON.stringify(await done(id)));
console.log('mock counts after original', JSON.stringify(await counts()));
const steps = (await adapter._api('GET', `/runs/${id}/steps`)).body;
console.log('steps:', steps.map((s) => `${s.id}:${s.name}`).join(' '));
const classify = steps.find((s) => s.name === 'classify').id;
const f = await adapter._api('POST', `/runs/${id}/fork`, { step: classify });
console.log('fork ->', JSON.stringify(f));
const fid = f.body.runId;
console.log('forked run result', JSON.stringify(await done(fid)));
console.log('forked steps:', (await adapter._api('GET', `/runs/${fid}/steps`)).body.map((s) => `${s.id}:${s.name}`).join(' '));
console.log('mock counts after fork', JSON.stringify(await counts()));
const t = await j(`${TOOLS}/calls?block=erp.create_payment`);
console.log('payment idempotency keys:', t.entries.map((e) => e.idempotency_key).join(' | '));
await adapter.stop();
