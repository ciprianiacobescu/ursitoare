// Extra R5 evidence (not part of the design matrix): kill the engine with SIGKILL at a random moment of an S09 run
// (rules A and B plus node-level hooks, INV-1002), restart, let DBOS recover, and compare effects and hook executions.
// Usage: node tests/stress-kill.mjs [N=30]
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, HOOK_EXEC, Engine, ensurePostgres, resetDatabase, resetMocks, flow, sleep, toolCalls, readJsonl, truncate, n8nCalls } from './lib.mjs';

const N = Number(process.argv[2] ?? 30);
const engine = new Engine();
await ensurePostgres(); await engine.kill(); await resetDatabase();
const rows = [];
for (let i = 0; i < N; i++) {
  await resetMocks({ n8n: 50 }); truncate(HOOK_EXEC);
  await engine.spawn({});
  const r = await engine.api('POST', '/runs', { flowPath: flow('s09-onion'), input: { invoice_id: 'INV-1002' } });
  const id = r.body.runId;
  const delay = Math.random() * 130;
  await sleep(delay);
  const committedBefore = ((await engine.api('GET', `/runs/${id}/steps`)).body ?? []).map((x) => x.name); // steps whose checkpoint was already visible just before the kill
  await engine.kill();
  await engine.spawn({});
  let s; for (let k = 0; k < 600; k++) { s = (await engine.api('GET', `/runs/${id}`)).body; if (s.status === 'completed' || s.status === 'failed') break; await sleep(25); }
  const pay = await toolCalls('erp.create_payment@1');
  const counts = {}; for (const l of readJsonl(HOOK_EXEC).filter((x) => x.run === id)) { const k = `${l.node}#${l.phase}:${l.hook}`; counts[k] = (counts[k] ?? 0) + 1; }
  const repeated = Object.entries(counts).filter(([, n]) => n > 1).map(([k, n]) => `${k}=${n}`);
  const repeatedCommitted = Object.entries(counts).filter(([k, n]) => n > 1 && committedBefore.includes(k)).map(([k]) => k); // R5 violation: a step whose checkpoint existed was executed again
  const n8n = await n8nCalls();
  rows.push({ i, kill_after_ms: Math.round(delay), status: s.status, node: s.node, payment_effects: pay.effects, payment_calls: pay.calls, hook_steps_run: Object.keys(counts).length, repeated_hook_execs: repeated, repeated_although_committed: repeatedCommitted, committed_steps_at_kill: committedBefore.length, webhook_calls: n8n.webhook_calls });
  console.log(JSON.stringify(rows.at(-1)));
  await engine.kill();
}
const summary = {
  runs: N, all_completed: rows.every((r) => r.status === 'completed' && r.node === 'done'),
  payment_effects_values: [...new Set(rows.map((r) => r.payment_effects))], runs_with_payment_duplicate_calls: rows.filter((r) => r.payment_calls > 1).length,
  runs_with_a_repeated_hook_exec: rows.filter((r) => r.repeated_hook_execs.length).length, repeated_examples: rows.filter((r) => r.repeated_hook_execs.length).slice(0, 5).map((r) => ({ kill_after_ms: r.kill_after_ms, repeated: r.repeated_hook_execs })),
  runs_with_a_committed_hook_step_executed_again: rows.filter((r) => r.repeated_although_committed.length).length,
  runs_that_never_started_before_kill: rows.filter((r) => r.hook_steps_run === 0).length,
};
console.log(JSON.stringify(summary));
writeFileSync(path.join(ROOT, 'results', `stress-kill-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify({ summary, rows }, null, 2));
