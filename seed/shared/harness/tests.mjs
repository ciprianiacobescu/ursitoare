// RT-0 .. RT-6 exactly as in design.md section 6 (plus RT-6 from the policy-hook paragraph).
// Every test: reset mocks -> drive the run through the adapter -> the HARNESS kills -> assert via mock /calls and adapter.status.
import { mocks } from './lib/mocks.mjs';
import { waitFor, sleep } from './lib/util.mjs';

const PAY = 'erp.create_payment@1';
const MAIL = 'mail.send@1';
const isTerminal = (s) => s.status === 'completed' || s.status === 'failed';

const payEffects = (t) => t.entries.filter((e) => e.block === PAY && e.effect);

/** Assertions on the mocks' counters after a run. `want` keys are all optional. */
async function expectCounts(ctx, want, prefix = '') {
  const [l, t, n] = await Promise.all([mocks.llm(), mocks.tools(), mocks.n8n()]);
  const b = (name) => t.by_block[name] || { calls: 0, effects: 0, duplicates: 0 };
  const p = prefix ? prefix + ' ' : '';
  if ('extract' in want) ctx.eq(`${p}mock-llm extract calls`, l.counts.extract || 0, want.extract);
  if ('classify' in want) ctx.eq(`${p}mock-llm classify calls`, l.counts.classify || 0, want.classify);
  if ('payEffects' in want) ctx.eq(`${p}erp.create_payment effects`, b(PAY).effects, want.payEffects);
  if ('payCalls' in want) ctx.eq(`${p}erp.create_payment calls`, b(PAY).calls, want.payCalls);
  if ('mailEffects' in want) ctx.eq(`${p}mail.send effects`, b(MAIL).effects, want.mailEffects);
  if ('webhooks' in want) ctx.eq(`${p}mock-n8n webhook calls`, n.webhook_calls, want.webhooks);
  ctx.note(`${p}payment.duplicates`, b(PAY).duplicates);
  ctx.note(`${p}payment.calls`, b(PAY).calls);
  return { l, t, n };
}

function expectCompleted(ctx, st, wantNode, prefix = '') {
  const p = prefix ? prefix + ' ' : '';
  ctx.eq(`${p}run status`, st.status, 'completed');
  if (st.node !== undefined && st.node !== null) ctx.eq(`${p}terminal node`, st.node, wantNode);
  else ctx.note(`${p}terminal node`, `not reported by adapter (branch inferred from mock counts); expected ${wantNode}`);
}

function expectPayment(ctx, t, { amount, currency, vendor_id, reference }, st, prefix = '') {
  const p = prefix ? prefix + ' ' : '';
  const pe = payEffects(t);
  if (pe.length !== 1) return; // the count check already failed
  const inp = pe[0].input;
  ctx.eq(`${p}payment amount/currency/vendor/reference`, `${inp.amount} ${inp.currency} ${inp.vendor_id} ${inp.reference}`, `${amount} ${currency} ${vendor_id} ${reference}`);
  if (st && st.output && st.output.payment_id !== undefined) ctx.eq(`${p}run output.payment_id equals mock payment id`, st.output.payment_id, pe[0].output.payment_id);
  else ctx.note(`${p}run output.payment_id`, 'adapter reported no output; not checked');
}

async function happyPath(ctx, { label, invoice, signalFirst, wantOutcome, wantNode, pay, mail, extra }) {
  await ctx.reset();
  const runId = await ctx.start(ctx.flows.rf1, { invoice_id: invoice });
  if (signalFirst) {
    await ctx.waitWaiting(runId);
    await ctx.signal(runId, 'approval', 'approved');
  }
  const st = await ctx.waitTerminal(runId);
  expectCompleted(ctx, st, wantNode, label);
  const { l, t, n } = await expectCounts(ctx, { extract: 1, classify: 1, payEffects: pay ? 1 : 0, mailEffects: mail ? 1 : 0, webhooks: pay ? 1 : 0 }, label);
  const dec = l.entries.find((e) => e.node_id === 'classify');
  ctx.eq(`${label} classify decided`, dec?.outcome, wantOutcome);
  if (pay) expectPayment(ctx, t, extra, st, label);
  if (mail) ctx.check(`${label} rejection mail carries the invoice id`, t.entries.some((e) => e.block === MAIL && e.effect && (e.input.subject || '').includes(invoice)), JSON.stringify(t.entries.filter((e) => e.block === MAIL).map((e) => e.input.subject)));
}

export const TESTS = [
  {
    id: 'RT-0',
    title: 'Happy paths: INV-1002 auto-approve, INV-1003 reject, INV-1001 review then approved',
    async run(ctx) {
      await happyPath(ctx, { label: 'INV-1002', invoice: 'INV-1002', wantOutcome: 'auto_approve', wantNode: 'done', pay: true, extra: { amount: 120.5, currency: 'USD', vendor_id: 'V-GLOBEX', reference: 'INV-1002' } });
      await happyPath(ctx, { label: 'INV-1003', invoice: 'INV-1003', wantOutcome: 'reject', wantNode: 'rejected', pay: false, mail: true });
      await happyPath(ctx, { label: 'INV-1001', invoice: 'INV-1001', signalFirst: true, wantOutcome: 'needs_review', wantNode: 'done', pay: true, extra: { amount: 2450, currency: 'EUR', vendor_id: 'V-ACME', reference: 'INV-1001' } });
    },
  },
  {
    id: 'RT-1',
    title: 'Kill worker as soon as mock-llm records classify; restart; approve',
    async run(ctx) {
      await ctx.reset();
      const runId = await ctx.start(ctx.flows.rf1, { invoice_id: 'INV-1001' });
      const hit = await ctx.waitForCall(() => mocks.llm('?node_id=classify'), (c) => c.total >= 1, 'mock-llm to record classify', { intervalMs: 5 });
      if (ctx.opts.graceMs) await sleep(ctx.opts.graceMs);
      await ctx.kill('worker', { loggedAt: hit.entries[0].ts });
      await ctx.restart();
      await ctx.waitWaiting(runId);
      await ctx.signal(runId, 'approval', 'approved');
      const st = await ctx.waitTerminal(runId);
      expectCompleted(ctx, st, 'done');
      const { t } = await expectCounts(ctx, { extract: 1, classify: 1, payEffects: 1 });
      expectPayment(ctx, t, { amount: 2450, currency: 'EUR', vendor_id: 'V-ACME', reference: 'INV-1001' }, st);
    },
  },
  {
    id: 'RT-2',
    title: 'Restart the engine server while parked on approval; then approve (signal not lost)',
    async run(ctx) {
      await ctx.reset();
      const runId = await ctx.start(ctx.flows.rf1, { invoice_id: 'INV-1001' });
      await ctx.waitWaiting(runId);
      await ctx.kill('server');
      await ctx.restart();
      const st0 = await ctx.waitWaiting(runId);
      ctx.eq('run still waiting after restart', st0.status, 'waiting');
      await ctx.signal(runId, 'approval', 'approved');
      const st = await ctx.waitTerminal(runId);
      expectCompleted(ctx, st, 'done');
      const { t } = await expectCounts(ctx, { extract: 1, classify: 1, payEffects: 1 });
      expectPayment(ctx, t, { amount: 2450, currency: 'EUR', vendor_id: 'V-ACME', reference: 'INV-1001' }, st);
    },
  },
  {
    id: 'RT-3',
    title: 'Kill worker after mock-tools logs erp.create_payment, before the engine can record the step',
    async run(ctx) {
      const DELAY = 2000;
      await ctx.reset({ toolDelays: { erp_create_payment: DELAY } });
      const runId = await ctx.start(ctx.flows.rf1, { invoice_id: 'INV-1002' });
      const hit = await ctx.waitForCall(() => mocks.tools('?block=erp.create_payment'), (c) => c.calls >= 1, 'mock-tools to log erp.create_payment', { intervalMs: 5 });
      const k = await ctx.kill('worker', { loggedAt: hit.entries[0].ts });
      ctx.check(`kill issued inside the ${DELAY} ms response delay`, k.sinceLoggedMs < DELAY, `${k.sinceLoggedMs} ms after the effect was logged`);
      await mocks.setToolDelays({ erp_create_payment: 0 }); // the post-restart retry need not wait again
      await ctx.restart();
      const st = await ctx.waitTerminal(runId);
      expectCompleted(ctx, st, 'done');
      await expectCounts(ctx, { payEffects: 1 });
      ctx.note('extract/classify calls (informational)', `${(await mocks.llm()).counts.extract || 0}/${(await mocks.llm()).counts.classify || 0}`);
    },
  },
  {
    id: 'RT-4',
    title: 'INV-1001 approval left unanswered with timeout PT5S -> timeout branch -> notify_rejection -> rejected',
    async run(ctx) {
      await ctx.reset();
      const runId = await ctx.start(ctx.flows.timeout5s, { invoice_id: 'INV-1001' });
      await ctx.waitWaiting(runId);
      const t0 = Date.now();
      const st = await ctx.waitTerminal(runId);
      const elapsed = Date.now() - t0;
      ctx.note('seconds from first seeing waiting to terminal', (elapsed / 1000).toFixed(1));
      ctx.check('not resolved earlier than ~PT5S (>= 3.5 s after parking)', elapsed >= 3500, `${elapsed} ms`);
      ctx.check('timeout branch taken within 15 s of parking', elapsed <= 15000, `${elapsed} ms`);
      expectCompleted(ctx, st, 'rejected');
      await expectCounts(ctx, { extract: 1, classify: 1, payEffects: 0, payCalls: 0, mailEffects: 1 });
    },
  },
  {
    id: 'RT-5',
    title: 'Delegate callback arrives while the engine is down; mock-n8n retries; callback eventually accepted',
    async run(ctx) {
      await ctx.reset({ delegateDelayMs: 2000 });
      const runId = await ctx.start(ctx.flows.rf1, { invoice_id: 'INV-1002' });
      const hit = await ctx.waitForCall(() => mocks.n8n(), (c) => c.webhook_calls >= 1, 'mock-n8n to receive the archive webhook', { intervalMs: 5 });
      await ctx.kill('worker', { loggedAt: hit.entries[0].ts });
      const down = await ctx.waitForCall(() => mocks.n8n(), (c) => c.callbacks_failed >= 2, 'mock-n8n to record >=2 failed callback attempts', { timeoutMs: 20000, intervalMs: 100 });
      ctx.check('callback failed while the engine was down (>=2 failed attempts)', down.callbacks_failed >= 2, `${down.callbacks_failed}`);
      await ctx.restart();
      const st = await ctx.waitTerminal(runId, { timeoutMs: Math.max(ctx.opts.timeoutMs, 60000) });
      expectCompleted(ctx, st, 'done');
      const { n } = await expectCounts(ctx, { payEffects: 1 });
      ctx.check('callback accepted by the engine (delivered >= 1)', n.callbacks_delivered >= 1, `delivered=${n.callbacks_delivered} failed=${n.callbacks_failed} gave_up=${n.gave_up}`);
      ctx.eq('mock-n8n gave up', n.gave_up, 0);
      ctx.note('mock-n8n webhook calls (informational; 1 = engine did not re-send the delegation after restart)', n.webhook_calls);
    },
  },
  {
    id: 'RT-6',
    title: 'Policy: INV-1004 (20000 EUR) approved, then payment denied -> run fails with policy_denied, no payment',
    async run(ctx) {
      await ctx.reset();
      const runId = await ctx.start(ctx.flows.rf1, { invoice_id: 'INV-1004' });
      await ctx.waitWaiting(runId);
      await ctx.signal(runId, 'approval', 'approved');
      const st = await ctx.waitTerminal(runId);
      ctx.eq('run status', st.status, 'failed');
      ctx.check('error mentions policy_denied', JSON.stringify(st.error ?? null).includes('policy_denied'), JSON.stringify(st.error ?? null));
      await expectCounts(ctx, { extract: 1, classify: 1, payCalls: 0, payEffects: 0 });
    },
  },
];
