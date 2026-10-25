// C2 runtime check: the number of logged policy decisions equals the number of outbound tool/LLM/delegate calls the mocks saw.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import adapter from '../adapter.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const RF1 = path.resolve(HERE, '../../shared/flows/rf-1-invoice-intake.yaml');
const LOG = path.resolve(HERE, '../.state/policy-decisions.jsonl');
const j = (u, o) => fetch(u, o).then((r) => r.json());
await adapter.start();
let ok = true;
for (const [inv, approve] of [['INV-1002'], ['INV-1003'], ['INV-1001', true], ['INV-1004', true]]) {
  await Promise.all(['18901', '18902', '18903'].map((p) => j(`http://127.0.0.1:${p}/reset`, { method: 'POST' })));
  writeFileSync(LOG, '');
  const id = await adapter.startRun(RF1, { invoice_id: inv });
  if (approve) { for (;;) { if ((await adapter.status(id)).status === 'waiting') break; await new Promise((r) => setTimeout(r, 50)); } await adapter.signal(id, 'approval', { decision: 'approved', approver: 'cov' }); }
  let s; for (;;) { s = await adapter.status(id); if (s.status === 'completed' || s.status === 'failed') break; await new Promise((r) => setTimeout(r, 50)); }
  const [l, t, n] = await Promise.all([j('http://127.0.0.1:18901/calls'), j('http://127.0.0.1:18902/calls'), j('http://127.0.0.1:18903/calls')]);
  const decisions = readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean).map((x) => JSON.parse(x));
  const outbound = l.total + t.calls + n.webhook_calls;
  const denies = decisions.filter((d) => d.decision === 'deny').length;
  const pass = decisions.length - denies === outbound;
  ok &&= pass;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${inv}: ${decisions.length} policy decisions (${denies} deny) vs ${outbound} outbound calls (llm ${l.total}, tools ${t.calls}, n8n ${n.webhook_calls}); final ${s.status}${s.error ? ' ' + s.error.code : ''}`);
}
await adapter.stop();
process.exit(ok ? 0 : 1);
