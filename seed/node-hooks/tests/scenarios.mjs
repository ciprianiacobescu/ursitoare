// npm run scenarios [-- --only S06,C3] [--hook-mode fused]: the design section 10 matrix. Owns the engine lifecycle.
// Needs the shared mocks on 18901-18903 (MOCK_STATE_DIR=node-hooks/.mockstate DELEGATE_DELAY_MS=50 shared/mocks/start-all.sh).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  ROOT, STATE, POLICY_LOG, HOOK_EXEC, RF1, TOOLS, N8N, LLM, flow, sleep, j, Engine, ensurePostgres, resetDatabase, resetMocks, mockHealth,
  mockSnapshot, toolCalls, n8nCalls, readJsonl, truncate, rmf, stepList,
} from './lib.mjs';

const args = process.argv.slice(2);
const argv = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const ONLY = argv('--only')?.split(',').map((s) => s.trim().toUpperCase());
const HOOK_MODE = argv('--hook-mode') ?? 'separate';
const BASE_ENV = HOOK_MODE === 'fused' ? { HOOK_MODE: 'fused' } : {};
const INV = (id) => ({ invoice_id: id });
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const PAY = 'erp.create_payment@1';
const d1 = JSON.parse(readFileSync(path.join(ROOT, 'oracle/d1-steps.json'), 'utf8')).cases;

const engine = new Engine();

class T {
  constructor(sc) { this.sc = sc; this.runs = []; this.checks = []; this.notes = []; this.engineChanges = []; this.errors = []; }
  // ---- assertions (never weakened: every one records expected and actual) ----
  eq(name, actual, expected) { this.checks.push({ name, expected, actual, pass: deepEq(actual, expected) }); }
  ok(name, pass, actual, expected = true) { this.checks.push({ name, expected, actual, pass: !!pass }); }
  has(name, actual, sub) { this.checks.push({ name, expected: `contains ${JSON.stringify(sub)}`, actual, pass: typeof actual === 'string' ? actual.includes(sub) : JSON.stringify(actual).includes(sub) }); }
  atLeast(name, actual, min) { this.checks.push({ name, expected: `>= ${min}`, actual, pass: actual >= min }); }
  get fused() { return HOOK_MODE === 'fused'; }
  /** The recorded result of a hook (its own step in separate mode; inside the node step's record in fused mode). */
  hookRecord(steps, stepName) {
    const own = steps.find((x) => x.name === stepName);
    if (own) return own.output;
    const [node] = stepName.split('#');
    for (const st of steps.filter((x) => x.name === node)) for (const f of [...(st.output?.fused?.pre ?? []), ...(st.output?.fused?.post ?? [])]) if (f.name === stepName) return f.res;
    return undefined;
  }
  /** Hook executions of a run in the order they happened (hook-exec.jsonl line order), as step-style names. */
  hookOrder(runId) { return readJsonl(HOOK_EXEC).filter((l) => l.run === runId).map((l) => `${l.node}#${l.phase}:${l.hook}`); }
  note(s) { this.notes.push(s); }
  changed(s) { this.engineChanges.push(s); }
  // ---- engine ----
  async useEngine(env = {}) {
    const full = { ...BASE_ENV, ...env };
    if (engine.alive && engine.envSig === JSON.stringify(full)) return;
    await engine.kill();
    await engine.spawn(full);
  }
  async restart() { await engine.kill(); await engine.spawn(JSON.parse(engine.envSig)); }
  async start(flowFile, input, extra = {}) {
    const r = await engine.api('POST', '/runs', { flowPath: path.isAbsolute(flowFile) ? flowFile : flow(flowFile), input, ...extra });
    if (r.status !== 201) throw new Error(`start ${flowFile}: HTTP ${r.status} ${JSON.stringify(r.body)}`);
    this.runs.push(r.body.runId);
    return r.body.runId;
  }
  async rawStart(flowFile, input) { return engine.api('POST', '/runs', { flowPath: path.isAbsolute(flowFile) ? flowFile : flow(flowFile), input }); }
  async status(id) { return (await engine.api('GET', `/runs/${id}`)).body; }
  async until(id, pred, timeoutMs = 30000) {
    const t0 = Date.now();
    for (;;) {
      const s = await this.status(id).catch(() => ({}));
      if (pred(s)) return s;
      if (Date.now() - t0 > timeoutMs) throw new Error(`timeout waiting on ${id}; last status ${JSON.stringify(s).slice(0, 300)}`);
      await sleep(15);
    }
  }
  done(id, timeoutMs) { return this.until(id, (s) => s.status === 'completed' || s.status === 'failed', timeoutMs); }
  waiting(id, timeoutMs) { return this.until(id, (s) => s.status === 'waiting', timeoutMs); }
  async signal(id, node, payload) { const r = await engine.api('POST', `/runs/${id}/signal/${node}`, payload); if (r.status !== 200) throw new Error(`signal HTTP ${r.status}`); }
  approve(id, decision = 'approved') { return this.signal(id, 'approval', { decision, approver: 'scenario', comment: 'ok' }); }
  async steps(id) { return (await engine.api('GET', `/runs/${id}/steps`)).body; }
  async stepNames(id) { return stepList(await this.steps(id)); }
  /** Step names without ids, e.g. ["fetch_invoice", "pay#pre:@rule_a", ...]. */
  async names(id) { return (await this.steps(id)).map((s) => s.name); }
  hookCounts(runId) {
    const c = {};
    for (const l of readJsonl(HOOK_EXEC)) if (!runId || l.run === runId) { const k = `${l.node}#${l.phase}:${l.hook}`; c[k] = (c[k] ?? 0) + 1; }
    return c;
  }
  policy() { return readJsonl(POLICY_LOG); }
  tools(block) { return toolCalls(block); }
  async resetMocks(o) { await resetMocks({ ...(this.sc.mocks ?? {}), ...(o ?? {}) }); }
  async fullRun(flowFile, input, { approve, waitForPark = approve !== undefined } = {}) {
    const id = await this.start(flowFile, input);
    if (waitForPark) { await this.waiting(id); if (approve) await this.approve(id, approve); }
    return { id, s: await this.done(id) };
  }
}

const sub = (arr, from, to) => arr.slice(arr.indexOf(from), arr.indexOf(to) + 1);

// ---------------------------------------------------------------------------------------------------------------------
const SCENARIOS = [];
const sc = (id, title, run, opts = {}) => SCENARIOS.push({ id, title, run, ...opts });
/** `only` restricts a scenario to one hook mode: the fused variants of C1/C2/C4 replace the ones whose crash point does not exist when hooks are fused. */

sc('S01', 'v0.1 regression: unmodified RF-1 on INV-1002, INV-1003, INV-1001 (approve)', async (t) => {
  await t.useEngine();
  for (const [label, inv, approve, node, pays] of [['INV-1002', 'INV-1002', undefined, 'done', 1], ['INV-1003', 'INV-1003', undefined, 'rejected', 0], ['INV-1001-approve', 'INV-1001', 'approved', 'done', 1]]) {
    await t.resetMocks();
    const { id, s } = await t.fullRun(RF1, INV(inv), { approve });
    t.eq(`${label}: status`, s.status, 'completed');
    t.eq(`${label}: terminal node`, s.node, node);
    t.eq(`${label}: payment effects`, (await t.tools(PAY)).effects, pays);
    t.eq(`${label}: step list equals the D1 engine's, byte for byte (oracle/d1-steps.json)`, await t.stepNames(id), d1[label].steps);
    t.eq(`${label}: no hook executions`, t.hookCounts(id), {});
  }
});

sc('S02', 'pre mutate input, block read (lookup_vendor)', async (t) => {
  await t.useEngine();
  const { id, s } = await t.fullRun('s02-pre-mutate', INV('INV-1002'));
  t.eq('run completed at done', [s.status, s.node], ['completed', 'done']);
  const lv = (await t.tools('erp.lookup_vendor@1')).entries;
  t.eq('mock-tools erp.lookup_vendor received the mutated vendor_name', lv.map((e) => e.input.vendor_name), ['GLOBEX']);
  const step = (await t.steps(id)).find((x) => x.name === 'lookup_vendor');
  t.eq('node record input_original', step.output.input_original, { vendor_name: 'Globex' });
  t.eq('node record input', step.output.input, { vendor_name: 'GLOBEX' });
  t.ok('input_original differs from input', !deepEq(step.output.input_original, step.output.input), true);
  t.eq('hook executed once', t.hookCounts(id), { 'lookup_vendor#pre:canon_vendor': 1 });
});

sc('S03', 'post mutate output, llm.extract (currency uppercased)', async (t) => {
  await t.useEngine();
  const { id, s } = await t.fullRun('s03-post-mutate', INV('INV-1002'));
  t.eq('run completed at done', [s.status, s.node], ['completed', 'done']);
  const steps = await t.steps(id);
  t.eq('extract step record keeps the raw currency', steps.find((x) => x.name === 'extract').output.output.currency, 'usd');
  t.eq('post hook output currency', t.hookRecord(steps, 'extract#post:upper_currency').ret.output.currency, 'USD');
  t.eq('nodes.extract.output.currency seen downstream (normalize input)', steps.find((x) => x.name === 'normalize').output.input.currency, 'USD');
  t.eq('pay args currency', (await t.tools(PAY)).entries[0].input.currency, 'USD');
});

sc('S04', 'pre skip (cache hit), block read', async (t) => {
  await t.useEngine();
  const a = await t.fullRun('s04-pre-skip', INV('INV-1002'));
  t.eq('INV-1002 completed at done', [a.s.status, a.s.node], ['completed', 'done']);
  t.eq('INV-1002: erp.lookup_vendor calls', (await t.tools('erp.lookup_vendor@1')).calls, 0);
  t.ok('INV-1002: trace records skipped_by', a.s.trace.some((e) => e.event === 'skip' && e.hook === 'lookup_vendor#pre:vendor_cache'), a.s.trace);
  const names = await t.names(a.id);
  if (t.fused) t.ok('INV-1002 (fused): the node step exists but records skipped_by and made no call', (await t.steps(a.id)).find((x) => x.name === 'lookup_vendor')?.output?.skipped_by === 'lookup_vendor#pre:vendor_cache', names);
  else t.ok('INV-1002: no lookup_vendor node step, only the hook step', names.includes('lookup_vendor#pre:vendor_cache') && !names.includes('lookup_vendor'), names);
  t.eq('INV-1002: downstream saw the cached status (classify input)', (await t.steps(a.id)).find((x) => x.name === 'classify').output.input.vendor_status, 'active');
  await t.resetMocks();
  const b = await t.fullRun('s04-pre-skip', INV('INV-1001'), { approve: 'approved' });
  t.eq('INV-1001 completed at done', [b.s.status, b.s.node], ['completed', 'done']);
  t.eq('INV-1001: erp.lookup_vendor calls', (await t.tools('erp.lookup_vendor@1')).calls, 1);
});

sc('S05a', 'post retry succeeds (F-RET)', async (t) => {
  await t.useEngine();
  const { id, s } = await t.fullRun('f-ret', { query: 'refund policy' });
  t.eq('run completed', s.status, 'completed');
  const calls = (await t.tools('kb.search@1')).entries;
  t.eq('kb.search calls', calls.length, 2);
  t.eq('top_k per call', calls.map((e) => e.input.top_k), [1, 2]);
  t.eq('final output has 2 passages', s.output.passages.length, 2);
  t.eq('post hook executions', t.hookCounts(id), { 'search#post:enough_passages': 2 });
  t.eq('step sequence', await t.names(id), ['search', 'search#post:enough_passages', 'search', 'search#post:enough_passages']);
  t.ok('trace records the retry', s.trace.some((e) => e.event === 'retry' && e.attempt === 2), s.trace);
});

sc('S05b', 'post retry exhausted', async (t) => {
  await t.useEngine();
  const { s } = await t.fullRun('f-ret-exhausted', { query: 'refund policy' });
  t.eq('run failed with hook_retry_exhausted', [s.status, s.error?.code], ['failed', 'hook_retry_exhausted']);
  t.eq('kb.search calls', (await t.tools('kb.search@1')).calls, 2);
});

sc('S06', 'next-node redirect (post ctx.next, routes: [approval])', async (t) => {
  await t.useEngine();
  const a = await t.start('s06-next-redirect', INV('INV-1002'));
  const w = await t.waiting(a);
  t.eq('INV-1002 parks at approval although the LLM said auto_approve', w.node, 'approval');
  t.eq('classify outcome from the LLM was auto_approve', (await t.steps(a)).find((x) => x.name === 'classify').output.outcome, 'auto_approve');
  await t.approve(a);
  const s = await t.done(a);
  t.eq('INV-1002 completed at done after approval', [s.status, s.node], ['completed', 'done']);
  t.eq('payment effects', (await t.tools(PAY)).effects, 1);
  t.ok('trace shows redirected_by', s.trace.some((e) => e.event === 'redirect' && e.hook === 'classify#post:review_big_pay' && e.to === 'approval'), s.trace);
  await t.resetMocks();
  const b = await t.fullRun('s06-next-redirect', INV('INV-1003'));
  t.eq('INV-1003 unaffected: completed at rejected', [b.s.status, b.s.node], ['completed', 'rejected']);
  t.ok('INV-1003: no redirect in trace', !b.s.trace.some((e) => e.event === 'redirect'), b.s.trace);
  t.eq('INV-1003 payments', (await t.tools(PAY)).calls, 0);
});

sc('S07', 'next-node block hook (post block, when.next = human.approval)', async (t) => {
  await t.useEngine();
  const a = await t.start('s07-next-block-hook', INV('INV-1001'));
  await t.waiting(a);
  const slack = await t.tools('slack.post_message@1');
  t.eq('INV-1001: slack effects', slack.effects, 1);
  t.has('slack text names the next node', slack.entries[0].input.text, 'approval');
  t.has('slack idempotency key follows design 3.5', slack.entries[0].idempotency_key, `${a}:classify#post:notify_review:a1`);
  await t.approve(a);
  const sa = await t.done(a);
  t.eq('INV-1001 completed', [sa.status, sa.node], ['completed', 'done']);
  await t.resetMocks();
  const b = await t.fullRun('s07-next-block-hook', INV('INV-1002'));
  t.eq('INV-1002 completed', [b.s.status, b.s.node], ['completed', 'done']);
  t.eq('INV-1002: slack calls', (await t.tools('slack.post_message@1')).calls, 0);
  t.ok('INV-1002: no classify post step', !(await t.names(b.id)).some((n) => n.startsWith('classify#post')), await t.names(b.id));
});

sc('S08', 'previous-node logic (pre ctx.from)', async (t) => {
  await t.useEngine();
  const a = await t.fullRun('s08-from-logic', INV('INV-1003'));
  t.eq('INV-1003 completed at rejected', [a.s.status, a.s.node], ['completed', 'rejected']);
  t.has('INV-1003 subject (from classify)', (await t.tools('mail.send@1')).entries[0].input.subject, 'auto-rejected');
  await t.resetMocks();
  const b = await t.fullRun('s08-from-logic', INV('INV-1001'), { approve: 'rejected' });
  t.eq('INV-1001 reject completed at rejected', [b.s.status, b.s.node], ['completed', 'rejected']);
  t.has('INV-1001 subject (from approval)', (await t.tools('mail.send@1')).entries[0].input.subject, 'rejected by reviewer');
});

sc('S09', 'flow selectors and onion order (A = rule_a effect pay|send, B = rule_b kind block, node-level on pay)', async (t) => {
  await t.useEngine();
  const a = await t.fullRun('s09-onion', INV('INV-1002'));
  t.eq('INV-1002 completed', [a.s.status, a.s.node], ['completed', 'done']);
  const names = await t.names(a.id);
  const order = t.hookOrder(a.id);
  t.eq('hook execution order around pay (hook-exec.jsonl line order)', order.filter((n) => n.startsWith('pay#')),
    ['pay#pre:@rule_a', 'pay#pre:@rule_b', 'pay#pre:pay_pre_note', 'pay#post:pay_post_note', 'pay#post:@rule_b', 'pay#post:@rule_a']);
  t.eq('lookup_vendor has only B (hook-exec)', order.filter((n) => n.startsWith('lookup_vendor#')), ['lookup_vendor#pre:@rule_b', 'lookup_vendor#post:@rule_b']);
  t.eq('archive (delegate = send) has A only (hook-exec)', order.filter((n) => n.startsWith('archive#')), ['archive#pre:@rule_a', 'archive#post:@rule_a']);
  t.eq('extract (llm) has no hooks (hook-exec)', order.filter((n) => n.startsWith('extract#')), []);
  if (!t.fused) {
    t.eq('step order around pay', sub(names, 'pay#pre:@rule_a', 'pay#post:@rule_a'),
      ['pay#pre:@rule_a', 'pay#pre:@rule_b', 'pay#pre:pay_pre_note', 'pay', 'pay#post:pay_post_note', 'pay#post:@rule_b', 'pay#post:@rule_a']);
    t.eq('lookup_vendor has only B (steps)', sub(names, 'lookup_vendor#pre:@rule_b', 'lookup_vendor#post:@rule_b'), ['lookup_vendor#pre:@rule_b', 'lookup_vendor', 'lookup_vendor#post:@rule_b']);
    t.eq('archive (delegate = send) has A only (steps)', names.filter((n) => n.startsWith('archive#')), ['archive#pre:@rule_a', 'archive#post:@rule_a']);
  } else t.eq('fused: pay hooks are inside the pay step (no hook steps for pay)', names.filter((n) => n.startsWith('pay#')), []);
  t.note(`full step list INV-1002: ${(await t.stepNames(a.id)).join(' ')}`);
  await t.resetMocks();
  const b = await t.fullRun('s09-onion', INV('INV-1003'));
  t.eq('INV-1003 completed at rejected', [b.s.status, b.s.node], ['completed', 'rejected']);
  t.eq('notify_rejection (send) has A and B (hook-exec order)', t.hookOrder(b.id).filter((n) => n.startsWith('notify_rejection#')),
    ['notify_rejection#pre:@rule_a', 'notify_rejection#pre:@rule_b', 'notify_rejection#post:@rule_b', 'notify_rejection#post:@rule_a']);
  if (!t.fused) t.eq('notify_rejection steps', sub(await t.names(b.id), 'notify_rejection#pre:@rule_a', 'notify_rejection#post:@rule_a'),
    ['notify_rejection#pre:@rule_a', 'notify_rejection#pre:@rule_b', 'notify_rejection', 'notify_rejection#post:@rule_b', 'notify_rejection#post:@rule_a']);
});

sc('S10a', 'hooks on park nodes (human.approval, delegate)', async (t) => {
  await t.useEngine();
  const id = await t.start('s10-park-hooks', INV('INV-1001'));
  const w = await t.waiting(id);
  t.ok('waiting event summary has the [large] prefix', w.parked.summary.startsWith('[large] Approve payment'), w.parked.summary);
  await t.approve(id);
  const s = await t.done(id);
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  const hooks = (await n8nCalls()).entries.filter((e) => e.type === 'webhook');
  t.eq('n8n payload has source', hooks[0].payload.source, 'ursitoare');
  t.eq('hook executions (each once)', t.hookCounts(id), { 'approval#pre:mark_large': 1, 'approval#post:approval_seen': 1, 'archive#pre:add_source': 1, 'archive#post:archive_result_seen': 1 });
});

sc('S10b', 'post hook on the timeout exit (approval timeout PT5S, unanswered)', async (t) => {
  await t.useEngine();
  const id = await t.start('s10b-timeout-post', INV('INV-1001'));
  await t.waiting(id);
  const s = await t.done(id, 40000);
  t.eq('completed at rejected', [s.status, s.node], ['completed', 'rejected']);
  const c = t.hookCounts(id);
  t.eq('when.outcome=[timeout] hook ran once', c['approval#post:on_timeout_seen'], 1);
  t.eq('when.outcome=[approved] hook did not run', c['approval#post:on_approved_seen'], undefined);
  t.eq('mail.send effects (notify_rejection)', (await t.tools('mail.send@1')).effects, 1);
  t.eq('payment calls', (await t.tools(PAY)).calls, 0);
});

sc('S11', 'end pre mutate', async (t) => {
  await t.useEngine();
  const { s } = await t.fullRun('s11-end-pre', INV('INV-1002'));
  const pid = (await t.tools(PAY)).entries[0]?.output?.payment_id;
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  t.eq('output keys', Object.keys(s.output).sort(), ['paid', 'payment_id']);
  t.eq('output.paid', s.output.paid, true);
  t.eq('output.payment_id is the payment the mock created', s.output.payment_id, pid);
});

sc('S12a', 'fail action (post, lookup_vendor, blocked vendor)', async (t) => {
  await t.useEngine();
  const { s } = await t.fullRun('s12a-fail', INV('INV-1003'));
  t.eq('failed with hook_failed', [s.status, s.error?.code], ['failed', 'hook_failed']);
  t.has('error names the hook id', s.error?.message, 'lookup_vendor#post:stop_blocked');
  t.eq('mail.send calls', (await t.tools('mail.send@1')).calls, 0);
  t.ok('error is not policy_denied', s.error?.code !== 'policy_denied', s.error?.code);
});

sc('S12b', 'block hook on_error: continue (404 from mock-tools)', async (t) => {
  await t.useEngine();
  const { id, s } = await t.fullRun('s12b-block-onerror', INV('INV-1002'));
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  const ev = s.trace.find((e) => e.event === 'hook_error');
  t.ok('trace records the hook error', ev?.hook === 'fetch_invoice#post:lookup_missing', s.trace);
  t.has('error text', ev?.error?.message, '404');
  const step = (await t.steps(id)).find((x) => x.name === 'fetch_invoice#post:lookup_missing');
  t.ok('step record carries the error', !!step?.output?.error, step?.output);
  const inv = await t.tools('invoices.get@1');
  t.eq('invoices.get calls / rejected', [inv.calls, inv.rejected + inv.entries.filter((e) => e.status === 404).length > 0], [2, true]);
});

sc('S13', 'redirect outside routes', async (t) => {
  await t.useEngine();
  const { s } = await t.fullRun('s13-undeclared-route', INV('INV-1002'));
  t.eq('failed with hook_route_undeclared', [s.status, s.error?.code], ['failed', 'hook_route_undeclared']);
  t.eq('payment calls', (await t.tools(PAY)).calls, 0);
});

sc('S14', 'unsafe redirect: static H_DOMINANCE; with HOOKS_SKIP_STATIC=1, ref_unresolved at runtime', async (t) => {
  await t.useEngine();
  const r = await t.rawStart('s14-unsafe-redirect', INV('INV-1002'));
  t.eq('start rejected with HTTP 400 invalid_flow', [r.status, r.body.error?.code], [400, 'invalid_flow']);
  t.has('codes include H_DOMINANCE', r.body.error?.codes, 'H_DOMINANCE');
  t.eq('flagged consumers', [...new Set((r.body.error?.issues ?? []).map((i) => i.node))].sort(), ['approval', 'classify', 'pay']);
  t.eq('no run was created and nothing was called', (await mockSnapshot()).tools_total.calls, 0);
  await t.useEngine({ HOOKS_SKIP_STATIC: '1' });
  const { s } = await t.fullRun('s14-unsafe-redirect', INV('INV-1002'));
  t.eq('with static checks skipped: failed with ref_unresolved at classify', [s.status, s.error?.code, s.error?.node], ['failed', 'ref_unresolved', 'classify']);
});

sc('S14c', 'redirect cycle: static H_CYCLE', async (t) => {
  await t.useEngine();
  const r = await t.rawStart('s14c-cycle', INV('INV-1002'));
  t.eq('start rejected with HTTP 400 invalid_flow', [r.status, r.body.error?.code], [400, 'invalid_flow']);
  t.has('codes include H_CYCLE', r.body.error?.codes, 'H_CYCLE');
});

sc('S15', 'guard on every entry path (flow rule match effect pay, pre guard)', async (t) => {
  await t.useEngine();
  const a = await t.fullRun('s15-guard', INV('INV-1002'));
  t.eq('normal path completed', [a.s.status, a.s.node], ['completed', 'done']);
  t.eq('normal path: guard executions', t.hookCounts(a.id)['pay#pre:@guard_pay'], 1);
  await t.resetMocks();
  const b = await t.start('s15-guard-redirect', INV('INV-1002'));
  const w = await t.waiting(b);
  t.eq('redirect path parks at approval', w.node, 'approval');
  await t.approve(b);
  const s = await t.done(b);
  t.eq('redirect-then-approve path completed', [s.status, s.node], ['completed', 'done']);
  t.ok('redirect happened', s.trace.some((e) => e.event === 'redirect'), s.trace);
  t.eq('redirect path: guard executions', t.hookCounts(b)['pay#pre:@guard_pay'], 1);
  t.eq('payment effects', (await t.tools(PAY)).effects, 1);
});

sc('S16a', 'PEP sees mutated args (raise to 15000)', async (t) => {
  await t.useEngine();
  const { s } = await t.fullRun('s16a-raise', INV('INV-1002'));
  t.eq('failed with policy_denied', [s.status, s.error?.code], ['failed', 'policy_denied']);
  t.eq('payment calls', (await t.tools(PAY)).calls, 0);
  const e = t.policy().find((x) => x.tool === PAY);
  t.eq('policy log decision', e?.decision, 'deny');
  t.has('policy log shows the raised amount', e?.reason, '15000');
});

sc('S16b', 'PEP sees mutated args (lower to 9000): allowed, documented risk', async (t) => {
  await t.useEngine();
  const id = await t.start('s16b-lower', INV('INV-1004'));
  await t.waiting(id);
  await t.approve(id);
  const s = await t.done(id);
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  const pay = (await t.tools(PAY));
  t.eq('payment created with 9000', pay.entries.map((e) => e.input.amount), [9000]);
  const rec = (await t.steps(id)).find((x) => x.name === 'pay').output;
  t.eq('input_original.amount recorded', rec.input_original.amount, 20000);
  t.eq('input.amount recorded', rec.input.amount, 9000);
  t.eq('policy decision on the final args', t.policy().find((x) => x.tool === PAY)?.decision, 'allow');
  t.note('RISK (documented, not a failure per design S16b): a pre-hook that lowers an amount moves a 20000 payment under the 10000 PEP limit; the PEP sees only the final arguments.');
});

sc('S17', 'taint through hooks', async (t) => {
  await t.useEngine();
  const { id, s } = await t.fullRun('s17-taint', INV('INV-1002'));
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  const san = t.hookRecord(await t.steps(id), 'fetch_invoice#post:sanitise_text').ret.output;
  t.eq('the sanitise hook ran and marked the output', san.sanitised, true);
  const pol = t.policy();
  const hookEntry = pol.find((x) => x.kind === 'hook' && x.node === 'fetch_invoice');
  t.has('policy entry for the slack hook carries untrusted:fetch_invoice', hookEntry?.taint, 'untrusted:fetch_invoice');
  const ext = pol.find((x) => x.node === 'extract');
  t.has('recorded fetch_invoice taint survived the hook (extract policy entry)', ext?.taint, 'untrusted:fetch_invoice');
  t.eq('slack hook tool', hookEntry?.tool, 'slack.post_message@1');
  const snap = await mockSnapshot();
  const outbound = Object.values(snap.llm).reduce((a, b) => a + b, 0) + snap.tools_total.calls + snap.n8n.webhook_calls;
  t.eq('policy decisions equal outbound calls (runtime coverage)', pol.length, outbound);
});

sc('S18a', 'forbidden: skip a human gate', async (t) => {
  await t.useEngine();
  const { id, s } = await t.fullRun('s18a-skip-human', INV('INV-1001'));
  t.eq('failed with hook_action_forbidden', [s.status, s.error?.code], ['failed', 'hook_action_forbidden']);
  t.eq('payment calls', (await t.tools(PAY)).calls, 0);
  t.eq('the approval was never opened (no DBOS.recv step)', (await t.names(id)).includes('DBOS.recv'), false);
});

sc('S18b', 'forbidden: rewrite a human decision', async (t) => {
  await t.useEngine();
  const { s } = await t.fullRun('s18b-rewrite-decision', INV('INV-1001'), { approve: 'rejected' });
  t.eq('failed with hook_action_forbidden', [s.status, s.error?.code], ['failed', 'hook_action_forbidden']);
  t.eq('payment calls', (await t.tools(PAY)).calls, 0);
});

sc('S18c', 'forbidden: skip an effect node', async (t) => {
  await t.useEngine();
  const { s } = await t.fullRun('s18c-skip-effect', INV('INV-1002'));
  t.eq('failed with hook_action_forbidden', [s.status, s.error?.code], ['failed', 'hook_action_forbidden']);
  t.eq('payment calls', (await t.tools(PAY)).calls, 0);
});

sc('S18d', 'static: routes on a human node', async (t) => {
  await t.useEngine();
  const r = await t.rawStart('s18d-routes-on-human', INV('INV-1001'));
  t.eq('start rejected with HTTP 400 invalid_flow', [r.status, r.body.error?.code], [400, 'invalid_flow']);
  t.has('codes include H_ROUTE_HUMAN', r.body.error?.codes, 'H_ROUTE_HUMAN');
});

sc('S19', 'block hook through the PEP', async (t) => {
  await t.useEngine();
  const { s } = await t.fullRun('s19-block-hook-pep', INV('INV-1002'));
  t.eq('failed with policy_denied', [s.status, s.error?.code], ['failed', 'policy_denied']);
  t.has('error names the hook', s.error?.message, 'lookup_vendor#post:sneaky_payment');
  t.eq('payment calls', (await t.tools(PAY)).calls, 0);
  const e = t.policy().find((x) => x.kind === 'hook' && x.tool === PAY);
  t.eq('policy log: kind hook, deny', [e?.kind, e?.decision], ['hook', 'deny']);
  let lintOut = '', lintOk = false;
  try { lintOut = execFileSync('node', ['tests/lint.mjs'], { cwd: ROOT, encoding: 'utf8' }); lintOk = true; } catch (err) { lintOut = String(err.stdout ?? err); }
  t.ok('lint: every outbound call site sits after policy.check', lintOk && lintOut.includes('LINT PASS'), lintOut.split('\n').filter((l) => /outbound call sites|LINT/.test(l)).join(' | '));
});

// ---- crash / kill scenarios -------------------------------------------------------------------------------------------
const crashEnv = (id, step) => ({ CRASH_BEFORE_STEP: step, CRASH_MARKER: path.join(STATE, `crash-${id}.marker`) });
const allOnce = (counts) => Object.values(counts).every((n) => n === 1);

sc('C1', 'crash after node, before the post hook (internal, once)', async (t) => {
  rmf(path.join(STATE, 'crash-C1.marker'));
  await t.useEngine(crashEnv('C1', 'pay#post:pay_post_note'));
  const id = await t.start('s09-onion', INV('INV-1002'));
  const x = await engine.waitExit();
  t.eq('engine died by SIGKILL at the crash point', x.signal, 'SIGKILL');
  const before = t.hookCounts(id);
  t.eq('pre-crash: payment calls', (await t.tools(PAY)).calls, 1);
  await t.restart();
  const s = await t.done(id);
  t.eq('after restart: completed at done', [s.status, s.node], ['completed', 'done']);
  const pay = await t.tools(PAY);
  t.eq('payment calls / effects', [pay.calls, pay.effects], [1, 1]);
  const counts = t.hookCounts(id);
  t.ok('every hook step executed exactly once (hook-exec.jsonl)', allOnce(counts), counts);
  t.ok('pre-crash hook execs were not repeated', Object.entries(before).every(([k, n]) => counts[k] === n), { before, after: counts });
  const hookSteps = (await t.names(id)).filter((n) => n.includes('#'));
  t.eq('hook steps in the step list = distinct hook execs', hookSteps.length, Object.keys(counts).length);
}, { only: 'separate' });

sc('C2', 'external kill during an effect post-hook (slack, 1500 ms mock delay)', async (t) => {
  await t.useEngine();
  const id = await t.start('c2-effect-post-hook', INV('INV-1002'));
  const t0 = Date.now();
  while ((await t.tools('slack.post_message@1')).calls < 1) { if (Date.now() - t0 > 20000) throw new Error('slack call never logged'); await sleep(5); }
  await engine.kill();
  await j(`${TOOLS}/config`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ delays: { slack_post_message: 0 } }) });
  await engine.spawn(JSON.parse(engine.envSig));
  const s = await t.done(id);
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  const slack = await t.tools('slack.post_message@1');
  t.eq('slack effects', slack.effects, 1);
  t.note(`slack calls=${slack.calls} duplicates=${slack.duplicates} (duplicate absorbed by the hook idempotency key)`);
  t.atLeast('slack duplicates', slack.duplicates, 0);
  t.eq('slack keys are one and the same', [...new Set(slack.entries.map((e) => e.idempotency_key))], [`${id}:pay#post:announce_payment:a1`]);
  const pay = await t.tools(PAY);
  t.eq('payment effects / calls', [pay.effects, pay.calls], [1, 1]);
}, { mocks: { tools: { slack_post_message: 1500 } } });

sc('C3', 'crash after a redirect (before the approval node)', async (t) => {
  rmf(path.join(STATE, 'crash-C3.marker'));
  await t.useEngine(crashEnv('C3', 'approval'));
  const id = await t.start('s06-next-redirect', INV('INV-1002'));
  const x = await engine.waitExit();
  t.eq('engine died by SIGKILL', x.signal, 'SIGKILL');
  await t.restart();
  const w = await t.waiting(id);
  t.eq('after restart it parks at approval (same route)', w.node, 'approval');
  t.eq('classify post hook executions', t.hookCounts(id)['classify#post:review_big_pay'], 1);
  await t.approve(id);
  const s = await t.done(id);
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  t.ok('redirect is still in the trace after replay', s.trace.some((e) => e.event === 'redirect' && e.to === 'approval'), s.trace);
  t.eq('payment effects', (await t.tools(PAY)).effects, 1);
  t.eq('classify LLM calls', (await mockSnapshot()).llm.classify, 1);
});

sc('C4', 'crash between pre mutate and the node (pay, INV-1004, cap 9000)', async (t) => {
  rmf(path.join(STATE, 'crash-C4.marker'));
  await t.useEngine(crashEnv('C4', 'pay'));
  const id = await t.start('s16b-lower', INV('INV-1004'));
  await t.waiting(id);
  await t.approve(id);
  const x = await engine.waitExit();
  t.eq('engine died by SIGKILL', x.signal, 'SIGKILL');
  t.eq('pre-crash: the pre hook ran once', t.hookCounts(id)['pay#pre:cap_amount'], 1);
  t.eq('pre-crash: no payment yet', (await t.tools(PAY)).calls, 0);
  await t.restart();
  const s = await t.done(id);
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  const pay = await t.tools(PAY);
  t.eq('payment calls / amounts', [pay.calls, pay.entries.map((e) => e.input.amount)], [1, [9000]]);
  t.eq('pay pre exec', t.hookCounts(id)['pay#pre:cap_amount'], 1);
}, { only: 'separate' });


sc('C1f', 'fused mode: crash before the pay node step (no node/post boundary exists when pure post hooks are fused)', async (t) => {
  rmf(path.join(STATE, 'crash-C1f.marker'));
  await t.useEngine(crashEnv('C1f', 'pay'));
  const id = await t.start('s09-onion', INV('INV-1002'));
  const x = await engine.waitExit();
  t.eq('engine died by SIGKILL at the crash point', x.signal, 'SIGKILL');
  t.eq('pre-crash: no pay hook has run (they live inside the pay step)', Object.keys(t.hookCounts(id)).filter((k) => k.startsWith('pay#')), []);
  await t.restart();
  const s = await t.done(id);
  t.eq('after restart: completed at done', [s.status, s.node], ['completed', 'done']);
  const pay = await t.tools(PAY);
  t.eq('payment calls / effects', [pay.calls, pay.effects], [1, 1]);
  const counts = t.hookCounts(id);
  t.ok('every hook executed exactly once', allOnce(counts), counts);
}, { only: 'fused' });

sc('C2f', 'fused mode: external kill during the pay call, fused pure hooks live in the same step (documented trade-off)', async (t) => {
  await t.useEngine();
  const id = await t.start('s09-onion', INV('INV-1002'));
  const t0 = Date.now();
  while ((await t.tools(PAY)).calls < 1) { if (Date.now() - t0 > 20000) throw new Error('payment call never logged'); await sleep(5); }
  await engine.kill();
  await j(`${TOOLS}/config`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ delays: { erp_create_payment: 0 } }) });
  await engine.spawn(JSON.parse(engine.envSig));
  const s = await t.done(id);
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  const pay = await t.tools(PAY);
  t.eq('payment effects (the duplicate key absorbs the re-executed step)', pay.effects, 1);
  const c = t.hookCounts(id);
  t.eq('fused pre-hooks of pay ran again (their step had not committed)', ['pay#pre:@rule_a', 'pay#pre:@rule_b', 'pay#pre:pay_pre_note'].map((k) => c[k]), [2, 2, 2]);
  t.eq('fused post-hooks of pay ran once (after the commit)', ['pay#post:pay_post_note', 'pay#post:@rule_b', 'pay#post:@rule_a'].map((k) => c[k]), [1, 1, 1]);
  t.note(`payment calls=${pay.calls} duplicates=${pay.duplicates}; completed hook executions are repeated only for pure code hooks inside the uncommitted step`);
}, { only: 'fused', mocks: { tools: { erp_create_payment: 1500 } } });

sc('C4f', 'fused mode: crash before the pay node step (pre mutate is fused into it)', async (t) => {
  rmf(path.join(STATE, 'crash-C4f.marker'));
  await t.useEngine(crashEnv('C4f', 'pay'));
  const id = await t.start('s16b-lower', INV('INV-1004'));
  await t.waiting(id);
  await t.approve(id);
  const x = await engine.waitExit();
  t.eq('engine died by SIGKILL', x.signal, 'SIGKILL');
  t.eq('pre-crash: the fused pre hook has not run', t.hookCounts(id)['pay#pre:cap_amount'], undefined);
  await t.restart();
  const s = await t.done(id);
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  const pay = await t.tools(PAY);
  t.eq('payment calls / amounts', [pay.calls, pay.entries.map((e) => e.input.amount)], [1, [9000]]);
  t.eq('pay pre exec', t.hookCounts(id)['pay#pre:cap_amount'], 1);
}, { only: 'fused' });

sc('C5', 'kill while parked with pre done (S10a, INV-1001)', async (t) => {
  await t.useEngine();
  const id = await t.start('s10-park-hooks', INV('INV-1001'));
  await t.waiting(id);
  t.eq('before kill: approval pre exec', t.hookCounts(id)['approval#pre:mark_large'], 1);
  await engine.kill();
  await engine.spawn(JSON.parse(engine.envSig));
  const w = await t.waiting(id);
  t.has('still waiting after restart, with the mutated summary', w.parked?.summary, '[large]');
  await t.approve(id);
  const s = await t.done(id);
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  t.eq('approval pre exec after recovery', t.hookCounts(id)['approval#pre:mark_large'], 1);
  t.eq('payment effects', (await t.tools(PAY)).effects, 1);
});

sc('C6', 'retry on an effect node, external kill during attempt 2 (mail.send, 1500 ms mock delay)', async (t) => {
  await t.useEngine();
  const id = await t.start('f-eff', {});
  const t0 = Date.now();
  while ((await t.tools('mail.send@1')).calls < 2) { if (Date.now() - t0 > 30000) throw new Error('second mail.send never logged'); await sleep(5); }
  await engine.kill();
  await j(`${TOOLS}/config`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ delays: { mail_send: 0 } }) });
  await engine.spawn(JSON.parse(engine.envSig));
  const s = await t.done(id);
  t.eq('completed', s.status, 'completed');
  const mail = await t.tools('mail.send@1');
  t.eq('mail.send effects (attempt 1 and attempt 2, not 3)', mail.effects, 2);
  t.atLeast('mail.send duplicates after recovery', mail.duplicates, 1);
  t.eq('idempotency keys', [...new Set(mail.entries.map((e) => e.idempotency_key))].sort(), [`${id}:send`, `${id}:send:r2`].sort());
  t.eq('subjects of the two effects', mail.entries.filter((e) => e.effect).map((e) => e.input.subject), ['draft', 'corrected']);
  t.note(`mail.send calls=${mail.calls} effects=${mail.effects} duplicates=${mail.duplicates}`);
}, { mocks: { tools: { mail_send: 1500 } } });

sc('F1', 'fork from a node with pre-hooks (fork-node pay, S09 flow)', async (t) => {
  await t.useEngine();
  const a = await t.fullRun('s09-onion', INV('INV-1002'));
  t.eq('original completed', [a.s.status, a.s.node], ['completed', 'done']);
  const before = await mockSnapshot();
  const origSteps = await t.stepNames(a.id);
  const f = await engine.api('POST', `/runs/${a.id}/fork-node`, { node: 'pay' });
  t.eq('fork-node HTTP status', f.status, 201);
  const first = t.fused ? 'pay' : 'pay#pre:@rule_a';
  t.eq('fork starts at the first pay step (first pre-hook step; the node step when hooks are fused)', f.body.startStepName, first);
  t.eq('fork start step id equals that step id in the original', f.body.startStep, Number(origSteps.find((x) => x.endsWith(`:${first}`)).split(':')[0]));
  t.runs.push(f.body.runId);
  const s = await t.done(f.body.runId);
  t.eq('fork completed at done', [s.status, s.node], ['completed', 'done']);
  const after = await mockSnapshot();
  const forkSteps = await t.stepNames(f.body.runId);
  t.note(`original steps: ${origSteps.join(' ')}`);
  t.note(`fork steps:     ${forkSteps.join(' ')}`);
  const fc = t.hookCounts(f.body.runId);
  t.eq('fork: pay pre-hooks executed once each', ['pay#pre:@rule_a', 'pay#pre:@rule_b', 'pay#pre:pay_pre_note'].map((k) => fc[k]), [1, 1, 1]);
  t.eq('fork: hooks before pay not re-executed', Object.keys(fc).filter((k) => /^(fetch_invoice|lookup_vendor)#/.test(k)), []);
  t.eq('llm counts unchanged for nodes before pay', [after.llm.extract, after.llm.classify], [before.llm.extract, before.llm.classify]);
  t.eq('invoices.get / lookup_vendor calls unchanged', [after.tools['invoices.get@1'].calls, after.tools['erp.lookup_vendor@1'].calls], [before.tools['invoices.get@1'].calls, before.tools['erp.lookup_vendor@1'].calls]);
  t.eq('payment effects stay 1', after.tools[PAY].effects, 1);
  t.eq('payment duplicates +1 (lineage key)', after.tools[PAY].duplicates, before.tools[PAY].duplicates + 1);
  t.eq('fork steps before the start step equal the original', forkSteps.slice(0, f.body.startStep), origSteps.slice(0, f.body.startStep));
});

// ---- extra probes beyond the design matrix ----------------------------------------------------------------------------
sc('X1', 'extra: retry on an effect node (pay) pays again; the retry input still goes through the PEP', async (t) => {
  await t.useEngine();
  const a = await t.fullRun('x1a-retry-pay', INV('INV-1002'));
  t.eq('x1a completed', [a.s.status, a.s.node], ['completed', 'done']);
  const pay = await t.tools(PAY);
  t.eq('x1a: two distinct payments (keys :pay and :pay:r2)', [pay.effects, [...new Set(pay.entries.map((e) => e.idempotency_key))].sort()], [2, [`${a.id}:pay`, `${a.id}:pay:r2`].sort()]);
  t.note('By design, allow_effect_retry authorises a second effect. The engine cannot tell a deliberate second payment from a duplicate; the author-level opt-in is the only guard.');
  await t.resetMocks();
  const b = await t.fullRun('x1b-retry-raise', INV('INV-1002'));
  t.eq('x1b failed with policy_denied on the retried call', [b.s.status, b.s.error?.code], ['failed', 'policy_denied']);
  const pay2 = await t.tools(PAY);
  t.eq('x1b: the first attempt paid, the raised retry was denied before the mock', [pay2.effects, pay2.calls], [1, 1]);
});

sc('X2', 'extra: a skipped llm.extract keeps the untrusted label (no laundering)', async (t) => {
  await t.useEngine();
  const { id, s } = await t.fullRun('x2-skip-taint', INV('INV-1002'));
  t.eq('completed at done', [s.status, s.node], ['completed', 'done']);
  t.eq('extract was never called', (await mockSnapshot()).llm.extract, undefined);
  const e = t.policy().find((x) => x.node === 'lookup_vendor');
  t.has('policy taint of the lookup_vendor call carries untrusted:fetch_invoice', e?.taint, 'untrusted:fetch_invoice');
  t.ok('and is not relabelled extracted:', !JSON.stringify(e?.taint).includes('extracted:'), e?.taint);
  void id;
});

sc('X3', 'extra: a declared route can skip a human gate (gap in the closed-route rule)', async (t) => {
  await t.useEngine();
  const r = await t.rawStart('x3-gate-bypass', INV('INV-1001'));
  t.eq('the static checker accepts the flow (no rule flags the bypass)', r.status, 201);
  if (r.status === 201) t.runs.push(r.body.runId);
  const s = await t.done(r.body.runId);
  t.eq('INV-1001 (needs_review) completed at done WITHOUT an approval', [s.status, s.node], ['completed', 'done']);
  t.eq('payment effects without a human decision', (await t.tools(PAY)).effects, 1);
  const nm = await t.names(r.body.runId);
  t.eq('classify is followed directly by its post hook and then pay: no approval step in between', nm.slice(nm.indexOf('classify'), nm.indexOf('classify') + 3), ['classify', 'classify#post:around_gate', 'pay']);
  t.note('FINDING: R4 as written (no PEP bypass, no undeclared route, no taint clearing, no forbidden action on a human/effect node) is not triggered, yet routing around a human gate is possible with a declared route. A static rule is needed (see REPORT).');
});

// ---------------------------------------------------------------------------------------------------------------------
async function runScenario(S) {
  const t = new T(S);
  const t0 = Date.now();
  truncate(POLICY_LOG); truncate(HOOK_EXEC);
  await resetMocks(S.mocks ?? {});
  let error = null;
  try { await S.run(t); } catch (e) { error = String(e?.stack ?? e).split('\n').slice(0, 4).join(' | '); }
  // evidence: step lists, hook counts and mock counters
  const stepsByRun = {};
  try {
    if (!engine.alive) await engine.spawn(JSON.parse(engine.envSig ?? '{}'));
    for (const id of t.runs) stepsByRun[id] = await t.stepNames(id);
  } catch { /* ignore */ }
  const record = {
    id: S.id, title: S.title, pass: !error && t.checks.length > 0 && t.checks.every((c) => c.pass), error, ms: Date.now() - t0,
    assertions: t.checks, notes: t.notes,
    steps: stepsByRun, hook_exec: Object.fromEntries(t.runs.map((id) => [id, t.hookCounts(id)])), mocks: await mockSnapshot().catch(() => null),
    engine_changes_beyond_spec: [...t.engineChanges, ...(ENGINE_CHANGES[S.id] ?? [])],
  };
  // leave no pending run behind
  for (const id of t.runs) {
    try { const s = await t.status(id); if (s.status !== 'completed' && s.status !== 'failed') await engine.api('POST', `/runs/${id}/cancel`); } catch { /* ignore */ }
  }
  return record;
}

/** Engine changes beyond design sections 3-6 that a scenario needed (feeds R6). Filled in as found; empty means none were needed. */
const ENGINE_CHANGES = {
  S14: ['visit() attaches the node id to a ref_unresolved RunFailure (D1 raised it without a node), so the error can say "at classify"'],
  X2: ['found by this probe, fixed after seeing it fail: a skipped node keeps exactly its input taint (the first version also added the extracted: relabel that a skip has not earned). Section 5 does not say what a skip output carries'],
};

const wanted = SCENARIOS.filter((S) => (!ONLY || ONLY.includes(S.id.toUpperCase())) && (!S.only || S.only === HOOK_MODE));
if (!(await mockHealth())) { console.error('mocks are not up on 18901-18903; start them with shared/mocks/start-all.sh (see REPORT.md)'); process.exit(2); }
await ensurePostgres();
await engine.kill();
await resetDatabase();
mkdirSync(path.join(ROOT, 'results'), { recursive: true });
const results = [];
for (const S of wanted) {
  const r = await runScenario(S);
  results.push(r);
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  ${r.title}  (${r.ms} ms)`);
  for (const c of r.assertions) if (!c.pass) console.log(`        - ${c.name}: expected ${JSON.stringify(c.expected)} actual ${JSON.stringify(c.actual)}`.slice(0, 600));
  if (r.error) console.log(`        ERROR ${r.error}`.slice(0, 600));
}
await engine.kill();
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const tag = argv('--tag') ?? (ONLY ? 'partial' : 'full');
const out = { ts, hook_mode: HOOK_MODE, host: { node: process.version }, passed: results.filter((r) => r.pass).length, total: results.length, results };
writeFileSync(path.join(ROOT, 'results', `${ts}-${tag}.json`), JSON.stringify(out, null, 2));
const md = [`# Scenario results ${ts} (${tag}, hook mode ${HOOK_MODE})`, '', `${out.passed}/${out.total} passed`, '', '| id | result | assertions | scenario |', '|---|---|---|---|',
  ...results.map((r) => `| ${r.id} | ${r.pass ? 'PASS' : 'FAIL'} | ${r.assertions.filter((c) => c.pass).length}/${r.assertions.length} | ${r.title} |`), ''];
for (const r of results) {
  md.push(`## ${r.id} ${r.pass ? 'PASS' : 'FAIL'}: ${r.title}`, '');
  if (r.error) md.push(`ERROR: ${r.error}`, '');
  for (const c of r.assertions) md.push(`- ${c.pass ? 'ok  ' : 'FAIL'} ${c.name}: expected \`${JSON.stringify(c.expected)}\` actual \`${JSON.stringify(c.actual)}\``);
  for (const n of r.notes) md.push(`- note: ${n}`);
  md.push(`- engine changes beyond design 3-6: ${r.engine_changes_beyond_spec.length ? r.engine_changes_beyond_spec.join('; ') : 'none'}`);
  md.push(`- hook-exec: \`${JSON.stringify(r.hook_exec)}\``);
  md.push(`- mocks: \`${JSON.stringify(r.mocks)}\``);
  for (const [id, st] of Object.entries(r.steps)) md.push(`- steps ${id.slice(0, 8)}: \`${st.join(' ')}\``);
  md.push('');
}
writeFileSync(path.join(ROOT, 'results', `${ts}-${tag}.md`), md.join('\n'));
console.log(`${out.passed}/${out.total} passed; results/${ts}-${tag}.{json,md}`);
process.exit(out.passed === out.total ? 0 : 1);
