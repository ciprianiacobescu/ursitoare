import assert from "node:assert/strict";
import { test } from "node:test";

import type { HookPlacement, JsonValue, NodeMeta } from "../../authoring/index.ts";
import { payOnceCatalogue } from "../../../test/support/crash/pay-once.ts";
import { idemKey } from "../../runs/index.ts";
import { InterpreterError, toInterpreterError } from "../errors.ts";
import { resolveValue } from "../refs.ts";
import { memoryWorkflowOps } from "../ops.ts";
import type {
  CallAuthorization,
  EffectDecision,
  RunScope,
  StepContext,
  ToolCall,
  ToolInvoker,
  WorkflowOps,
} from "../types.ts";
import { blockHookRunner } from "./block-runner.ts";
import type { HookContext, HookRun, HookServices, HookStepSite } from "./types.ts";

const PAID: JsonValue = { payment_id: "pay-1", status: "paid" };
const PAY_ARGS: JsonValue = { vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" };
const KEY_1 = "ik1_f00b9d27c51629afbd9df363751dddddcafe9d4de8ca95752c773733bae0a87e";
const CATALOGUE = payOnceCatalogue();

const SCOPE: RunScope = {
  inputs: { vendor: "Acme", invoice: "inv-1", amount: 120 },
  nodes: new Map([
    ["lookup", { output: { vendor_id: "v1", status: "active" }, outcome: null }],
    ["pay", { output: PAID, outcome: null }],
  ]),
};

const PERMIT = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/slack.post_message@1",
  bodyDigest: `sha256:${"c".repeat(64)}`,
  serviceId: "S_1",
  ttlSeconds: 60,
};

const ANSWER: CallAuthorization = { decisionId: "dec_h1", permit: PERMIT };

const DENIAL = {
  code: "INTERPRETER_TOOL_DENIED",
  message: 'tool call of "pay" is not permitted (policy)',
  node: "pay",
  details: { reason: "policy", decisionId: "dec_3" },
};

const NOTIFY_WITH = { channel: "#ap", text: "${{ hook.node.id }} paid ${{ hook.output.payment_id }}" };

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
    now: new Date("2026-11-06T10:00:00.000Z"),
  } as unknown as StepContext;
}

const STEP_CTX = stepContext("pay", "pay", 1);

function hookContext(phase: "pre" | "post", node: NodeMeta, attempt: number, input: JsonValue): HookContext {
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

function notify(): HookPlacement {
  return {
    phase: "post",
    ruleId: null,
    label: "notify",
    hook: {
      id: "notify",
      kind: "block",
      uses: "slack.post_message@1",
      with: NOTIFY_WITH,
    },
  } as unknown as HookPlacement;
}

function withContinue(p: HookPlacement): HookPlacement {
  return { ...p, hook: { ...p.hook, on_error: "continue" } } as HookPlacement;
}

type AuthorizeCtx = StepContext & {
  taint?: readonly string[];
  authorization?: CallAuthorization;
  approvals?: readonly never[];
};

interface Setup {
  onContinue: boolean;
  authorizeFailure: unknown;
  argsTaint: ((value: unknown) => readonly string[]) | undefined;
  withAuthorize: boolean;
}

interface Observed {
  events: string[];
  phases: string[];
  authorizeCtxs: AuthorizeCtx[];
  invokeCtxs: AuthorizeCtx[];
  befores: AuthorizeCtx[];
  afters: AuthorizeCtx[];
  taintCalls: unknown[];
  values: JsonValue[];
  run: HookRun | null;
  error: unknown;
}

function invokerFor(s: Setup, seen: Observed): ToolInvoker {
  const invoke = async (_call: ToolCall, ctx: StepContext): Promise<{ output: JsonValue }> => {
    seen.phases.push("invoke");
    seen.invokeCtxs.push(ctx as AuthorizeCtx);
    return { output: { ts: "1.0" } };
  };
  if (!s.withAuthorize) return { invoke };
  return {
    invoke,
    async authorize(_call: ToolCall, ctx: StepContext): Promise<CallAuthorization> {
      seen.phases.push("authorize");
      seen.authorizeCtxs.push(ctx as AuthorizeCtx);
      if (s.authorizeFailure !== undefined) throw s.authorizeFailure;
      return ANSWER;
    },
  };
}

async function execute(s: Setup): Promise<Observed> {
  const seen: Observed = {
    events: [],
    phases: [],
    authorizeCtxs: [],
    invokeCtxs: [],
    befores: [],
    afters: [],
    taintCalls: [],
    values: [],
    run: null,
    error: null,
  };
  const inner = memoryWorkflowOps("r_1");
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
  const effects = {
    async before(call: ToolCall, ctx: StepContext): Promise<EffectDecision> {
      seen.events.push("before");
      seen.befores.push(ctx as AuthorizeCtx);
      return {
        action: "invoke",
        idemKey: idemKey("tenant_a", "r_1", call.nodeId, call.effectSeq, call.generation ?? 0),
      };
    },
    async after(_call: ToolCall, ctx: StepContext, _result: { output: JsonValue }): Promise<void> {
      seen.events.push("after");
      seen.afters.push(ctx as AuthorizeCtx);
    },
  };
  const services = {
    ops,
    invoker: invokerFor(s, seen),
    effects,
    sandbox: null,
    block: (ref: string) => CATALOGUE.block(ref),
    resolve: (value: unknown) => resolveValue(value, SCOPE),
    scope: SCOPE,
    ...(s.argsTaint === undefined
      ? {}
      : {
          argsTaint: (value: unknown) => {
            seen.taintCalls.push(value);
            return s.argsTaint?.(value) ?? ["untrusted"];
          },
        }),
  } as HookServices;
  const site: HookStepSite = { fused: false, stepName: "pay:post:notify", slot: 1 };
  const placement = s.onContinue ? withContinue(notify()) : notify();
  try {
    seen.run = await blockHookRunner.run(
      placement,
      hookContext("post", M_PAY, 1, PAY_ARGS),
      STEP_CTX,
      services,
      site,
    );
  } catch (error) {
    seen.error = error;
  }
  return seen;
}

const COMPLETED_RUN: HookRun = {
  outcome: { action: "continue" },
  entry: {
    label: "post:notify",
    kind: "block",
    fused: false,
    attempt: 1,
    state: "completed",
    action: "continue",
    mutated: null,
    to: null,
    error: null,
    tool: "slack.post_message@1",
    idemKey: KEY_1,
  },
};

function authorizeCtx(taint: readonly string[]): AuthorizeCtx {
  return { ...STEP_CTX, hook: { phase: "post", label: "notify" }, taint };
}

function invokeCtx(idem: string | null): AuthorizeCtx {
  return {
    ...STEP_CTX,
    attempt: 1,
    effect: "send",
    unsafeToRetry: false,
    idemKey: idem,
    hook: { phase: "post", label: "notify" },
  };
}

function assertInterpreterError(seen: Observed): void {
  const copied = toInterpreterError(seen.error);
  assert.ok(copied !== null, `expected an InterpreterError, got ${String(seen.error)}`);
  assert.equal(copied.code, "INTERPRETER_TOOL_DENIED");
  assert.equal(copied.message, 'tool call of "pay" is not permitted (policy)');
  assert.equal(copied.node, "pay");
  assert.deepEqual(copied.details, { reason: "policy", decisionId: "dec_3" });
}

function assertHookError(seen: Observed): void {
  const error = seen.error;
  assert.ok(error instanceof InterpreterError, "InterpreterError");
  assert.equal(error.code, "HOOK_ERROR");
  assert.equal(error.node, "pay");
  assert.deepEqual({ ...error.details }, { hook: "pay:post:notify", reason: "tool_failed" });
  assert.equal(error.message, `block hook "notify" failed (tool_failed)`);
  const text = JSON.stringify({ message: error.message, details: error.details });
  assert.ok(!text.includes("db down"), "no db text in the hook error");
}

test("C-6ebe4f56 a send hook authorizes before the gate and the M5 path is unchanged", async () => {
  const seen = await execute({
    onContinue: false,
    authorizeFailure: undefined,
    argsTaint: undefined,
    withAuthorize: true,
  });
  assert.equal(seen.error, null, "the runner must not throw");
  assert.deepEqual(seen.events, [
    "step pay:post:notify",
    "authorize",
    "before",
    "invoke",
    "step pay:post:notify#done",
    "after",
  ]);
  assert.deepEqual(seen.phases, ["authorize", "invoke"]);
  assert.deepEqual(seen.authorizeCtxs[0], authorizeCtx(["untrusted"]));
  assert.deepEqual(seen.invokeCtxs[0], { ...invokeCtx(KEY_1), authorization: ANSWER });
  assert.deepEqual(seen.befores[0], invokeCtx(null));
  assert.deepEqual(seen.values[0], { ok: true, output: { ts: "1.0" }, idemKey: KEY_1 });
  assert.deepEqual(seen.values[1], COMPLETED_RUN);
  const plain = await execute({
    onContinue: false,
    authorizeFailure: undefined,
    argsTaint: undefined,
    withAuthorize: false,
  });
  assert.equal(plain.error, null, "the plain runner must not throw");
  assert.deepEqual(plain.events, [
    "step pay:post:notify",
    "before",
    "invoke",
    "step pay:post:notify#done",
    "after",
  ]);
  assert.deepEqual(plain.invokeCtxs[0], invokeCtx(KEY_1));
  const m5 = plain.invokeCtxs[0];
  assert.ok(m5 !== undefined);
  assert.ok(!("taint" in m5));
  assert.ok(!("authorization" in m5));
  assert.ok(!("approvals" in m5));
  assert.deepEqual(plain.values[0], { ok: true, output: { ts: "1.0" }, idemKey: KEY_1 });
  assert.deepEqual(plain.values[1], COMPLETED_RUN);
});

test("C-6ebe4f56 argsTaint of the raw with value supplies the authorize taint", async () => {
  const seen = await execute({
    onContinue: false,
    authorizeFailure: undefined,
    argsTaint: () => ["extracted"],
    withAuthorize: true,
  });
  assert.equal(seen.error, null, "the runner must not throw");
  assert.deepEqual(seen.phases, ["authorize", "invoke"]);
  assert.deepEqual(seen.taintCalls, [NOTIFY_WITH]);
  assert.deepEqual(seen.authorizeCtxs[0], authorizeCtx(["extracted"]));
  assert.deepEqual(seen.values[1], COMPLETED_RUN);
});

test("C-6ebe4f56 an authorize denial fails the hook whatever on_error says", async () => {
  for (const onContinue of [false, true]) {
    const seen = await execute({
      onContinue,
      authorizeFailure: DENIAL,
      argsTaint: undefined,
      withAuthorize: true,
    });
    assertInterpreterError(seen);
    assert.deepEqual(seen.events, ["step pay:post:notify", "authorize"]);
    assert.deepEqual(seen.phases, ["authorize"]);
    assert.equal(seen.befores.length, 0);
    assert.equal(seen.afters.length, 0);
    assert.deepEqual(seen.values, []);
  }
});

test("C-6ebe4f56 a generic authorize failure is tool_failed under fail and continue", async () => {
  const fail = await execute({
    onContinue: false,
    authorizeFailure: new Error("db down"),
    argsTaint: undefined,
    withAuthorize: true,
  });
  assertHookError(fail);
  assert.deepEqual(fail.phases, ["authorize"]);
  assert.equal(fail.befores.length, 0);
  assert.equal(fail.afters.length, 0);
  const swallow = await execute({
    onContinue: true,
    authorizeFailure: new Error("db down"),
    argsTaint: undefined,
    withAuthorize: true,
  });
  const run = swallow.run;
  assert.ok(run !== null, "the swallowed run answers a HookRun");
  assert.equal(run.outcome.action, "continue");
  assert.equal(run.entry.state, "failed");
  assert.deepEqual(run.entry.error, { code: "HOOK_ERROR", message: "block hook failed (tool_failed)" });
  assert.equal(run.entry.idemKey, null);
  const text = JSON.stringify(run);
  assert.ok(!text.includes("db down"), "no db text in the failed entry");
});
