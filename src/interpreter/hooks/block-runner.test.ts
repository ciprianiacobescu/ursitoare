import assert from "node:assert/strict";
import { test } from "node:test";

import type { HookPlacement, JsonValue, NodeMeta } from "../../authoring/index.ts";
import { payOnceCatalogue } from "../../../test/support/crash/pay-once.ts";
import { idemKey } from "../../runs/index.ts";
import { InterpreterError } from "../errors.ts";
import { resolveValue } from "../refs.ts";
import { memoryWorkflowOps } from "../ops.ts";
import type {
  EffectDecision,
  RunScope,
  StepContext,
  ToolCall,
  ToolInvoker,
  WorkflowOps,
} from "../types.ts";
import { blockHookRunner } from "./block-runner.ts";
import type { HookContext, HookRun, HookServices, HookStepSite } from "./types.ts";

const LOOKUP: JsonValue = { vendor_id: "v1", status: "active" };
const PAID: JsonValue = { payment_id: "pay-1", status: "paid" };
const PAY_ARGS: JsonValue = { vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" };
const PAY_ONCE_INPUT: JsonValue = { vendor: "Acme", invoice: "inv-1", amount: 120 };
const KEY_1 = "ik1_f00b9d27c51629afbd9df363751dddddcafe9d4de8ca95752c773733bae0a87e";
const KEY_2 = "ik1_800f6dd80c3dc3bc6aa5cb4779e68ef7d9d2a9b203aa23b7d2a75d0488e1200d";
const KEY_A = "ik1_" + "a".repeat(64);
const CATALOGUE = payOnceCatalogue();

const SCOPE: RunScope = {
  inputs: PAY_ONCE_INPUT,
  nodes: new Map([
    ["lookup", { output: LOOKUP, outcome: null }],
    ["pay", { output: PAID, outcome: null }],
  ]),
};

function meta(id: string, kind: string, effect: NodeMeta["effect"]): NodeMeta {
  return { id, kind, effect, tags: [] };
}

const M_PAY = meta("pay", "block", "pay");
const M_LOOKUP = meta("lookup", "block", "read");
const M_DONE = meta("done", "end", "none");

function stepContext(nodeId: string, effect: StepContext["effect"], attempt: number): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "pay-once",
    flowHash: "sha256:" + "a".repeat(64),
    nodeId,
    kind: "block",
    mode: "live",
    attempt,
    effect,
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "u_alice", kind: "human" },
    now: new Date("2026-11-02T10:00:00.000Z"),
  } as unknown as StepContext;
}

function hookContext(
  phase: "pre" | "post",
  node: NodeMeta,
  attempt: number,
  input: JsonValue,
): HookContext {
  return {
    phase,
    node,
    from: node.id === "pay" ? M_LOOKUP : null,
    next: node.id === "pay" ? M_DONE : M_PAY,
    next_candidates: [],
    input,
    output: phase === "post" ? PAID : null,
    outcome: null,
    attempt,
    feedback: null,
    args: {},
  };
}

function placement(
  phase: "pre" | "post",
  label: string,
  ruleId: string | null,
  hook: { [key: string]: unknown },
): HookPlacement {
  return { phase, hook, ruleId, label } as unknown as HookPlacement;
}

const NOTIFY_WITH = { channel: "#ap", text: "${{ hook.node.id }} paid ${{ hook.output.payment_id }}" };

function notify(over: { [key: string]: unknown } = {}): HookPlacement {
  return placement("post", "notify", null, {
    id: "notify",
    kind: "block",
    uses: "slack.post_message@1",
    with: NOTIFY_WITH,
    ...over,
  });
}

function audit(over: { [key: string]: unknown } = {}): HookPlacement {
  return placement("pre", "rule.audit", "audit", {
    id: "audit",
    kind: "block",
    uses: "invoices.get@1",
    with: { invoice_id: "${{ inputs.invoice }}" },
    ...over,
  });
}

function payhook(over: { [key: string]: unknown } = {}): HookPlacement {
  return placement("post", "payhook", null, {
    id: "payhook",
    kind: "block",
    uses: "erp.create_payment@1",
    with: PAY_ARGS,
    ...over,
  });
}

interface Setup {
  placement: HookPlacement;
  node: "pay" | "lookup";
  nodeEffect: StepContext["effect"];
  attempt: number;
  stepName: string;
  gate: "invoke" | "reuse" | "unknown";
  invokerThrows: boolean;
  invokerOutput: JsonValue | null;
  afterThrows: boolean;
  recorded: readonly JsonValue[];
}

interface Observed {
  events: string[];
  invoked: { call: ToolCall; ctx: StepContext }[];
  befores: { call: ToolCall; ctx: StepContext }[];
  afters: { call: ToolCall; ctx: StepContext; output: JsonValue }[];
  values: JsonValue[];
  run: HookRun | null;
  error: unknown;
}

function setup(over: Partial<Setup> = {}): Setup {
  return {
    placement: notify(),
    node: "pay",
    nodeEffect: "pay",
    attempt: 1,
    stepName: "pay:post:notify",
    gate: "invoke",
    invokerThrows: false,
    invokerOutput: null,
    afterThrows: false,
    recorded: [],
    ...over,
  };
}

function defaultOutput(tool: string): JsonValue {
  if (tool === "invoices.get@1") return { invoice_id: "inv-1", raw_text: "t" };
  if (tool === "slack.post_message@1") return { ts: "1.0" };
  return PAID;
}

async function execute(s: Setup): Promise<Observed> {
  const seen: Observed = {
    events: [],
    invoked: [],
    befores: [],
    afters: [],
    values: [],
    run: null,
    error: null,
  };
  const inner = memoryWorkflowOps("r_1", s.recorded);
  const ops: WorkflowOps = {
    workflowId: "r_1",
    async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
      seen.events.push(`step ${name}`);
      const value = await inner.runStep(name, fn);
      seen.values.push(value);
      return value;
    },
    sleep: (ms: number) => inner.sleep(ms),
  };
  const invoker: ToolInvoker = {
    async invoke(call, ctx) {
      seen.events.push("invoke");
      seen.invoked.push({ call, ctx });
      if (s.invokerThrows) throw new Error("secret-text");
      return { output: s.invokerOutput ?? defaultOutput(call.tool) };
    },
  };
  const effects = {
    async before(call: ToolCall, ctx: StepContext): Promise<EffectDecision> {
      seen.events.push("before");
      seen.befores.push({ call, ctx });
      if (s.gate === "reuse") {
        return { action: "reuse", idemKey: KEY_A, result: { output: { ts: "9" } } };
      }
      if (s.gate === "unknown") return { action: "unknown", idemKey: KEY_A };
      return {
        action: "invoke",
        idemKey: idemKey("tenant_a", "r_1", call.nodeId, call.effectSeq, call.generation ?? 0),
      };
    },
    async after(call: ToolCall, ctx: StepContext, result: { output: JsonValue }): Promise<void> {
      seen.events.push("after");
      seen.afters.push({ call, ctx, output: result.output });
      if (s.afterThrows) throw new Error("db-down");
    },
  };
  const services: HookServices = {
    ops,
    invoker,
    effects,
    sandbox: null,
    block: (ref: string) => CATALOGUE.block(ref),
    resolve: (value: unknown) => resolveValue(value, SCOPE),
    scope: SCOPE,
  };
  const site: HookStepSite = { fused: false, stepName: s.stepName, slot: 1 };
  const input = s.node === "pay" ? PAY_ARGS : { vendor_name: "Acme" };
  const node = s.node === "pay" ? M_PAY : M_LOOKUP;
  try {
    seen.run = await blockHookRunner.run(
      s.placement,
      hookContext(s.placement.phase, node, s.attempt, input),
      stepContext(s.node, s.nodeEffect, s.attempt),
      services,
      site,
    );
  } catch (error) {
    seen.error = error;
  }
  return seen;
}

function completed(seen: Observed): HookRun {
  assert.equal(seen.error, null, "the runner must not throw");
  assert.ok(seen.run !== null, "the runner answers a HookRun");
  return seen.run;
}

function expectedContext(
  s: Setup,
  effect: string,
  idem: string | null,
  label: string,
): { [key: string]: unknown } {
  return {
    ...stepContext(s.node, s.nodeEffect, s.attempt),
    attempt: s.attempt,
    effect,
    unsafeToRetry: false,
    idemKey: idem,
    hook: { phase: s.placement.phase, label },
  };
}

const NOTIFY_ARGS = { channel: "#ap", text: "pay paid pay-1" };

function notifyCall(attempt: number): ToolCall {
  const call: ToolCall = {
    tool: "slack.post_message@1",
    args: NOTIFY_ARGS,
    nodeId: "pay",
    effectSeq: 1,
    phase: "post",
    hookId: "notify",
  };
  if (attempt > 1) call.generation = attempt - 1;
  return call;
}

function auditCall(attempt: number): ToolCall {
  const call: ToolCall = {
    tool: "invoices.get@1",
    args: { invoice_id: "inv-1" },
    nodeId: "lookup",
    effectSeq: 1,
    phase: "pre",
    hookId: "rule.audit",
  };
  if (attempt > 1) call.generation = attempt - 1;
  return call;
}

function auditSetup(attempt: number, over: Partial<Setup> = {}): Setup {
  return setup({
    placement: audit(),
    node: "lookup",
    nodeEffect: "read",
    attempt,
    stepName: attempt > 1 ? "lookup:pre:rule.audit:r2" : "lookup:pre:rule.audit",
    ...over,
  });
}

function notifySetup(attempt: number, over: Partial<Setup> = {}): Setup {
  return setup({
    attempt,
    stepName: attempt > 1 ? "pay:post:notify:r2" : "pay:post:notify",
    ...over,
  });
}

for (const attempt of [1, 2]) {
  test(`C-81b2711b a read hook runs one step and calls the invoker once at attempt ${String(attempt)}`, async () => {
    const s = auditSetup(attempt);
    const seen = await execute(s);
    const run = completed(seen);
    assert.deepEqual(seen.events, [`step ${s.stepName}`, "invoke"]);
    assert.equal(seen.invoked.length, 1);
    assert.deepEqual(seen.invoked[0]?.call, auditCall(attempt));
    assert.deepEqual(seen.invoked[0]?.ctx, expectedContext(s, "read", null, "rule.audit"));
    assert.equal(run.outcome.action, "continue");
    assert.equal(run.entry.label, "pre:rule.audit");
    assert.equal(run.entry.kind, "block");
    assert.equal(run.entry.fused, false);
    assert.equal(run.entry.state, "completed");
    assert.equal(run.entry.attempt, attempt);
    assert.equal(run.entry.tool, "invoices.get@1");
    assert.equal(run.entry.idemKey, null);
  });

  test(`C-81b2711b an effectful hook records before invoke and after in two steps at attempt ${String(attempt)}`, async () => {
    const s = notifySetup(attempt);
    const key = attempt > 1 ? KEY_2 : KEY_1;
    const suffix = attempt > 1 ? ":r2" : "";
    const seen = await execute(s);
    const run = completed(seen);
    assert.deepEqual(seen.events, [
      `step pay:post:notify${suffix}`,
      "before",
      "invoke",
      `step pay:post:notify#done${suffix}`,
      "after",
    ]);
    assert.deepEqual(seen.befores[0]?.call, notifyCall(attempt));
    assert.deepEqual(seen.invoked[0]?.call, notifyCall(attempt));
    assert.deepEqual(seen.afters[0]?.call, notifyCall(attempt));
    assert.deepEqual(seen.befores[0]?.ctx, expectedContext(s, "send", null, "notify"));
    assert.deepEqual(seen.invoked[0]?.ctx, expectedContext(s, "send", key, "notify"));
    assert.deepEqual(seen.afters[0]?.ctx, expectedContext(s, "send", key, "notify"));
    assert.deepEqual(seen.afters[0]?.output, { ts: "1.0" });
    assert.equal(run.outcome.action, "continue");
    assert.equal(run.entry.label, "post:notify");
    assert.equal(run.entry.tool, "slack.post_message@1");
    assert.equal(run.entry.idemKey, key);
    assert.equal(run.entry.state, "completed");
    assert.equal(run.entry.error, null);
  });
}

test("C-81b2711b a reuse decision skips the invoker and hands the reused output to after", async () => {
  const seen = await execute(notifySetup(1, { gate: "reuse" }));
  const run = completed(seen);
  assert.equal(seen.invoked.length, 0);
  assert.deepEqual(seen.afters[0]?.output, { ts: "9" });
  assert.equal(seen.afters[0]?.ctx.idemKey, KEY_A);
  assert.equal(run.entry.idemKey, KEY_A);
  assert.equal(run.outcome.action, "continue");
});

test("C-81b2711b a replay over the recorded steps calls neither invoker nor gate", async () => {
  const first = await execute(notifySetup(1));
  const firstRun = completed(first);
  assert.equal(first.values.length, 2);
  assert.deepEqual(first.values[0], { ok: true, output: { ts: "1.0" }, idemKey: KEY_1 });
  const replay = await execute(notifySetup(1, { recorded: first.values }));
  assert.deepEqual(replay.events, ["step pay:post:notify", "step pay:post:notify#done"]);
  assert.equal(replay.invoked.length, 0);
  assert.equal(replay.befores.length, 0);
  assert.equal(replay.afters.length, 0);
  assert.deepEqual(completed(replay), firstRun);
});

interface Failure {
  name: string;
  setup: (over?: Partial<Setup>) => Setup;
  reason: string;
  keyed: boolean;
}

const SWALLOWED: Failure[] = [
  {
    name: "invoker failure",
    setup: (o) => notifySetup(1, { invokerThrows: true, ...o }),
    reason: "tool_failed",
    keyed: true,
  },
  {
    name: "after failure",
    setup: (o) => notifySetup(1, { afterThrows: true, ...o }),
    reason: "tool_failed",
    keyed: true,
  },
  {
    name: "bad output",
    setup: (o) => notifySetup(1, { invokerOutput: { ts: 5 }, ...o }),
    reason: "output_invalid",
    keyed: true,
  },
  {
    name: "missing text",
    setup: (o) => notifySetup(1, { placement: notify({ with: { channel: "#ap" } }), ...o }),
    reason: "input_invalid",
    keyed: false,
  },
  {
    name: "unresolved ref",
    setup: (o) =>
      notifySetup(1, {
        placement: notify({ with: { channel: "#ap", text: "${{ hook.from.nope }}" } }),
        ...o,
      }),
    reason: "args_unresolved",
    keyed: false,
  },
];

function withContinue(p: HookPlacement): HookPlacement {
  return { ...p, hook: { ...p.hook, on_error: "continue" } } as HookPlacement;
}

function assertHookError(
  seen: Observed,
  reason: string,
  label: string,
  hook: string,
  node: string,
): void {
  const error = seen.error;
  assert.ok(error instanceof InterpreterError, "InterpreterError");
  assert.equal(error.code, "HOOK_ERROR");
  assert.equal(error.node, node);
  assert.deepEqual({ ...error.details }, { hook, reason });
  assert.equal(error.message, `block hook "${label}" failed (${reason})`);
  const text = JSON.stringify({ message: error.message, details: error.details });
  assert.ok(!text.includes("secret-text") && !text.includes("db-down"));
}

test("C-d27a7d78 a failing block hook throws HOOK_ERROR with its reason and no tool text", async () => {
  for (const failure of SWALLOWED) {
    const seen = await execute(failure.setup());
    assertHookError(seen, failure.reason, "notify", "pay:post:notify", "pay");
  }
});

test("C-d27a7d78 a failing read hook throws tool_failed", async () => {
  const seen = await execute(auditSetup(1, { invokerThrows: true }));
  assertHookError(seen, "tool_failed", "audit", "lookup:pre:rule.audit", "lookup");
});

test("C-d27a7d78 block_missing effect_unknown and effect_retry throw before any call", async () => {
  const missing = await execute(
    notifySetup(1, { placement: notify({ uses: "ghost.tool@1" }) }),
  );
  assertHookError(missing, "block_missing", "notify", "pay:post:notify", "pay");
  assert.equal(missing.invoked.length, 0);

  const unknown = await execute(notifySetup(1, { gate: "unknown" }));
  assertHookError(unknown, "effect_unknown", "notify", "pay:post:notify", "pay");
  assert.equal(unknown.invoked.length, 0);
  assert.equal(unknown.afters.length, 0);

  const retry = await execute(
    setup({
      placement: payhook(),
      node: "lookup",
      nodeEffect: "read",
      attempt: 2,
      stepName: "lookup:post:payhook:r2",
    }),
  );
  assertHookError(retry, "effect_retry", "payhook", "lookup:post:payhook", "lookup");
  assert.equal(retry.invoked.length, 0);
  assert.equal(retry.befores.length, 0);
  assert.deepEqual(retry.events, ["step lookup:post:payhook:r2"]);
});

test("C-d27a7d78 a pay hook still runs at attempt 1", async () => {
  const seen = await execute(
    setup({
      placement: payhook(),
      node: "lookup",
      nodeEffect: "read",
      stepName: "lookup:post:payhook",
    }),
  );
  const run = completed(seen);
  assert.equal(seen.invoked.length, 1);
  assert.equal(run.entry.tool, "erp.create_payment@1");
  assert.equal(run.entry.label, "post:payhook");
});

test("C-d27a7d78 with on_error continue a swallowed failure is a failed entry and the step completes", async () => {
  for (const failure of SWALLOWED) {
    const base = failure.setup();
    const seen = await execute({ ...base, placement: withContinue(base.placement) });
    const run = completed(seen);
    assert.equal(run.outcome.action, "continue", failure.name);
    assert.equal(run.entry.state, "failed", failure.name);
    assert.deepEqual(
      run.entry.error,
      { code: "HOOK_ERROR", message: `block hook failed (${failure.reason})` },
      failure.name,
    );
    assert.equal(run.entry.idemKey, failure.keyed ? KEY_1 : null, failure.name);
    const text = JSON.stringify(run);
    assert.ok(!text.includes("secret-text") && !text.includes("db-down"), failure.name);
  }
});

test("C-d27a7d78 with on_error continue a failed read hook is a failed entry", async () => {
  const base = auditSetup(1, { invokerThrows: true });
  const seen = await execute({ ...base, placement: withContinue(base.placement) });
  const run = completed(seen);
  assert.equal(run.entry.state, "failed");
  assert.deepEqual(run.entry.error, {
    code: "HOOK_ERROR",
    message: "block hook failed (tool_failed)",
  });
  assert.equal(run.entry.idemKey, null);
});

test("C-d27a7d78 with on_error continue the three fail-closed reasons still throw", async () => {
  const missingBase = notifySetup(1, { placement: notify({ uses: "ghost.tool@1" }) });
  const missing = await execute({ ...missingBase, placement: withContinue(missingBase.placement) });
  assertHookError(missing, "block_missing", "notify", "pay:post:notify", "pay");

  const unknownBase = notifySetup(1, { gate: "unknown" });
  const unknown = await execute({ ...unknownBase, placement: withContinue(unknownBase.placement) });
  assertHookError(unknown, "effect_unknown", "notify", "pay:post:notify", "pay");

  const retry = await execute(
    setup({
      placement: withContinue(payhook()),
      node: "lookup",
      nodeEffect: "read",
      attempt: 2,
      stepName: "lookup:post:payhook:r2",
    }),
  );
  assertHookError(retry, "effect_retry", "payhook", "lookup:post:payhook", "lookup");
});
