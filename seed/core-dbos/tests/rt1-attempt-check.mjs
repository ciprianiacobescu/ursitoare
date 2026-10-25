// Evidence for the RT-1 at-least-once window: repeat "kill right after mock-llm logs classify" until classify is re-called,
// then print both X-Ursitoare-Call headers (are they byte-identical, i.e. dedupable by an idempotent LLM gateway?).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adapter from '../adapter.mjs';
const RF1 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../shared/flows/rf-1-invoice-intake.yaml');
const j = (u, o) => fetch(u, o).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await adapter.start();
for (let attempt = 1; attempt <= 40; attempt++) {
  await Promise.all(['18901', '18902', '18903'].map((p) => j(`http://127.0.0.1:${p}/reset`, { method: 'POST' })));
  const id = await adapter.startRun(RF1, { invoice_id: 'INV-1001' });
  while ((await j('http://127.0.0.1:18901/calls?node_id=classify')).total < 1) await sleep(1);
  await adapter.kill('worker');
  await adapter.restart();
  while ((await adapter.status(id)).status !== 'waiting') await sleep(50);
  const calls = await j('http://127.0.0.1:18901/calls?node_id=classify');
  console.log(`try ${attempt}: classify calls = ${calls.total}`);
  if (calls.total >= 2) { console.log(calls.entries.map((e) => `${e.ts} ${e.call_header}`).join('\n')); break; }
}
await adapter.stop();
