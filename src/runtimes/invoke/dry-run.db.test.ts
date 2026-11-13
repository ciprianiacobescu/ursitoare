// The live proof: a dry run reads live through the invoke path and stubs every effect.

import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow } from "../../authoring/index.ts";
import { getIntent, idemKey } from "../../runs/index.ts";
import type { RunRecord, RunStore, StepRecord } from "../../runs/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import { dryHarness } from "../../../test/support/invoke-runs/dry-runs.ts";
import type { DryAnswer, DryHarness } from "../../../test/support/invoke-runs/dry-runs.ts";
import { invokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import type { InvokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import { loadInvokeRun } from "../../../test/support/invoke-runs/index.ts";

const S = "87caf624-f579-8435-9540-24d6eb57aeff";
const D_LV = "ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad";
const D_PAY = "af25dc0c3f8ca575c8b06c393f52c90967511a03d6db13a277b748379e77d4f8";
const INPUT = { vendor_name: "Acme GmbH", amount: 12.5 };
const RUN_0 = "run_00000000-0000-7000-8000-000000000000";
const PAID = { payment_id: "PAY-1", status: "created" };
const FK2 = { pay: [{ output: PAID }] };
const ALLOW_ALL =
  '@id("t-allow-all") permit (principal, action == Action::"invoke_tool", resource);';

const V1 = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.lookup_vendor@1",
  bodyDigest: D_LV,
  serviceId: S,
  ttlSeconds: 60,
};

const V2 = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.create_payment@1",
  bodyDigest: D_PAY,
  serviceId: S,
  ttlSeconds: 60,
};

const G_LOOKUP = {
  subject: { kind: "role", role: "author" },
  tool: "acme.lookup_vendor@1",
  scope: { kind: "any_step" },
  args: [],
};

const G_PAY = {
  subject: { kind: "role", role: "author" },
  tool: "acme.create_payment@1",
  scope: { kind: "node", flowId: "read-then-pay", nodeId: "pay" },
  args: [],
};

const LOOKUP_RESOURCE = 'Block::"tenant_a/read-then-pay/lookup"';
const PAY_RESOURCE = 'Block::"tenant_a/read-then-pay/pay"';

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function settled<T>(what: string, fn: () => Promise<T>): Promise<T> {
  let value: T | undefined;
  let done = false;
  await assert.doesNotReject(async () => {
    value = await fn();
    done = true;
  }, what);
  assert.ok(done, `${what} resolved`);
  return value as T;
}

function finalRowOf(steps: readonly StepRecord[], nodeId: string): StepRecord | undefined {
  let found: StepRecord | undefined;
  for (const step of steps) {
    if (step.nodeId === nodeId) {
      found = step;
    }
  }
  return found;
}

interface Field {
  field: string;
  message: string;
}

function fieldsOf(answer: DryAnswer): Field[] {
  const body = answer.body as { error?: { details?: { fields?: unknown } } };
  const fields = body.error?.details?.fields;
  assert.ok(Array.isArray(fields), "the error names fields");
  return fields as Field[];
}

// `store` is added to InvokeHarness by this task's green step; red reaches it through a cast.
type HarnessWithStore = InvokeHarness & { store: RunStore };

async function storedRun(h: InvokeHarness, runId: string): Promise<RunRecord> {
  const store = (h as HarnessWithStore).store;
  const run = await settled(`run ${runId} is stored`, () => store.getRun(h.ctx, runId));
  assert.ok(run !== null, `run ${runId} is stored`);
  return run;
}

async function intentOf(
  h: InvokeHarness,
  key: string,
): Promise<{ state: string; mode: string } | null> {
  return settled("the intent is stored", () =>
    withTenantTx(h.pool, h.ctx, async (tx) => {
      const found = await getIntent(tx, h.ctx, key);
      return found === null ? null : { state: found.state, mode: found.mode };
    }),
  );
}

async function openDry(
  init?: (h: InvokeHarness) => Promise<void>,
): Promise<{ h: InvokeHarness; dry: DryHarness }> {
  const h = await settled("invokeHarness resolves", () => invokeHarness());
  try {
    if (init !== undefined) {
      await settled("the harness is prepared", () => init(h));
    }
    const dry = await settled("dryHarness resolves", () => dryHarness(h));
    return { h, dry };
  } catch (error) {
    await h.close();
    throw error;
  }
}

async function closeDry(opened: { h: InvokeHarness; dry: DryHarness }): Promise<void> {
  await opened.dry.close();
  await opened.h.close();
}

function readPayHook(): Flow {
  const base = structuredClone(loadInvokeRun("read-then-pay"));
  const lookup = base.nodes["lookup"] as unknown as Record<string, unknown>;
  lookup["post"] = [
    {
      id: "payhook",
      kind: "block",
      uses: "acme.create_payment@1",
      with: { vendor_id: "V-ACME", amount: 1, currency: "EUR", reference: "r" },
    },
  ];
  return { ...base, flow: "read-pay-hook" };
}

function hookedPaySoft(): Flow {
  const base = structuredClone(loadInvokeRun("hooked-pay"));
  const pay = base.nodes["pay"] as unknown as Record<string, unknown>;
  const post = structuredClone(pay["post"]) as unknown as Record<string, unknown>[];
  const notify = post[0] as unknown as Record<string, unknown>;
  notify["on_error"] = "continue";
  pay["post"] = post;
  return { ...base, flow: "hooked-pay-soft" };
}

test("C-716d6625 read-then-pay dry run makes one live call, no pay call, and records both permits", async () => {
  let gLookupId = "";
  let gPayId = "";
  const opened = await openDry(async (h) => {
    gLookupId = (await h.grant(G_LOOKUP)).id;
    gPayId = (await h.grant({ ...G_PAY, versionHash: h.hashes.H1 })).id;
    await h.deploy("");
  });
  const { h, dry } = opened;
  try {
    const refused = await dry.post({ input: INPUT, fakes: {} });
    assert.equal(refused.status, 400);
    assert.deepEqual(fieldsOf(refused), [
      { field: "body/fakes/pay", message: "missing: no fake entry" },
    ]);
    const missing = await settled("no run exists", () =>
      (h as HarnessWithStore).store.getRun(h.ctx, RUN_0),
    );
    assert.equal(missing, null);
    assert.deepEqual(h.tools.calls(), []);
    assert.deepEqual(h.egress.issued(), []);

    const post = await dry.post({ input: INPUT, fakes: FK2 });
    assert.equal(post.status, 202);
    const body = post.body as { run: Record<string, unknown> };
    assert.deepEqual(Object.keys(body), ["run"]);
    assert.equal(body.run["id"], RUN_0);
    assert.equal(body.run["mode"], "stub");

    await dry.execute(RUN_0);

    const run = await storedRun(h, RUN_0);
    assert.equal(run.state, "completed");
    assert.equal(run.terminalNode, "done");
    assert.ok(run.outputRef !== null, "the run has an output");
    const payload = await settled("the output payload is stored", () =>
      (h as HarnessWithStore).store.getPayload(h.ctx, run.outputRef as string),
    );
    assert.ok(payload !== null, "the output payload is stored");
    assert.deepEqual(payload.data, { payment_id: "PAY-1" });

    const calls = h.tools.calls();
    assert.equal(calls.length, 1);
    const lookupCall = calls[0];
    assert.ok(lookupCall !== undefined);
    assert.equal(lookupCall.ref, "erp.lookup_vendor@1");
    assert.equal(lookupCall.method, "POST");
    assert.equal(lookupCall.host, "tools.fake.test");
    assert.equal(lookupCall.path, "/blocks/erp.lookup_vendor@1");
    assert.equal(lookupCall.callHeader, `${RUN_0}:lookup:1`);
    assert.equal(lookupCall.bodySha256, D_LV);
    assert.deepEqual(h.tools.calls({ ref: "erp.create_payment@1" }), []);

    const tokens = h.egress.issued();
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0]?.serviceId, S);
    assert.equal(tokens[0]?.ttlSeconds, 60);
    const forwards = h.egress.requests();
    assert.equal(forwards.length, 1);
    assert.equal(forwards[0]?.outcome, "allowed");

    const intents = await settled("the intents are read", () =>
      withTenantTx(h.pool, h.ctx, async (tx) => ({
        pay: await getIntent(tx, h.ctx, idemKey("tenant_a", RUN_0, "pay", 0)),
        lookup: await getIntent(tx, h.ctx, idemKey("tenant_a", RUN_0, "lookup", 0)),
      })),
    );
    assert.ok(intents.pay !== null, "the pay intent exists");
    assert.equal(intents.pay.state, "done");
    assert.equal(intents.pay.mode, "stub");
    assert.equal(intents.lookup, null);

    const rows = await dry.decisions(RUN_0);
    assert.equal(rows.length, 2);
    const lookupRow = rows[0];
    const payRow = rows[1];
    assert.ok(lookupRow !== undefined && payRow !== undefined);
    for (const row of [lookupRow, payRow]) {
      assert.equal(row.decision, "allow");
      assert.equal(row.action, "invoke_tool");
      assert.equal(row.principal, 'User::"tenant_a/alice"');
      assert.deepEqual(row.errors, []);
    }
    assert.equal(lookupRow.nodeId, "lookup");
    assert.equal(lookupRow.resource, LOOKUP_RESOURCE);
    assert.deepEqual(lookupRow.reasons, [gLookupId]);
    assert.deepEqual(lookupRow.permit, V1);
    assert.equal(payRow.nodeId, "pay");
    assert.equal(payRow.resource, PAY_RESOURCE);
    assert.deepEqual(payRow.reasons, [gPayId]);
    assert.deepEqual(payRow.permit, V2);

    const read = await dry.get(`/api/v1/runs/${RUN_0}/decisions`);
    assert.equal(read.status, 200);
    const page = read.body as { items: Record<string, unknown>[]; next_cursor: unknown };
    assert.deepEqual(
      page.items.map((item) => item["decisionId"]),
      rows.map((row) => row.decisionId),
    );
    assert.equal(page.next_cursor, null);

    const steps = await dry.steps(RUN_0);
    const lookupStep = finalRowOf(steps, "lookup");
    const payStep = finalRowOf(steps, "pay");
    const doneStep = finalRowOf(steps, "done");
    assert.ok(lookupStep !== undefined && payStep !== undefined && doneStep !== undefined);
    assert.equal(lookupStep.policyDecisionId, lookupRow.decisionId);
    assert.equal(payStep.policyDecisionId, payRow.decisionId);
    assert.equal(doneStep.policyDecisionId, null);
  } finally {
    await closeDry(opened);
  }
});

test("C-a924afdf without a grant the read is denied and nothing else happens", async () => {
  const opened = await openDry();
  const { h, dry } = opened;
  try {
    const post = await dry.post({ input: INPUT, fakes: FK2 });
    assert.equal(post.status, 202);
    await dry.execute(RUN_0);

    const run = await storedRun(h, RUN_0);
    assert.equal(run.state, "failed");
    const rows = await dry.decisions(RUN_0);
    assert.equal(rows.length, 1);
    const deny = rows[0];
    assert.ok(deny !== undefined);
    assert.equal(deny.decision, "deny");
    assert.deepEqual(deny.reasons, []);
    assert.equal(deny.permit, null);
    assert.deepEqual(run.error, {
      code: "INTERPRETER_TOOL_DENIED",
      message: 'tool call of "lookup" is not permitted (policy)',
      node: "lookup",
      details: { reason: "policy", decisionId: deny.decisionId },
    });
    assert.deepEqual(h.tools.calls(), []);
    assert.deepEqual(h.egress.issued(), []);
    assert.equal(await h.intents(RUN_0), 0);
  } finally {
    await closeDry(opened);
  }
});

test("C-a924afdf a fake error fails the node and its message reaches no error or row", async () => {
  const opened = await openDry(async (h) => {
    await h.grant(G_LOOKUP);
    await h.grant({ ...G_PAY, versionHash: h.hashes.H1 });
    await h.deploy("");
  });
  const { h, dry } = opened;
  try {
    const post = await dry.post({
      input: INPUT,
      fakes: { pay: [{ error: { code: "E_DOWN", message: "payment desk is down" } }] },
    });
    assert.equal(post.status, 202);
    await dry.execute(RUN_0);

    const run = await storedRun(h, RUN_0);
    assert.equal(run.state, "failed");
    assert.deepEqual(run.error, {
      code: "INTERPRETER_TOOL_FAILED",
      message: "dry run fake_error",
      node: "pay",
      details: { reason: "fake_error", fakeCode: "E_DOWN" },
    });
    const rows = await dry.decisions(RUN_0);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.ok(row !== undefined);
      assert.equal(row.decision, "allow");
    }
    assert.equal(h.tools.calls().length, 1);
    assert.ok(!JSON.stringify(run.error).includes("payment desk is down"));
    for (const step of await dry.steps(RUN_0)) {
      assert.ok(!JSON.stringify(step).includes("payment desk is down"), step.nodeId);
    }
  } finally {
    await closeDry(opened);
  }
});

test("C-906311c3 a block hook is stubbed by its own effect and needs its own fake", async () => {
  // H1: hooked-pay (a send hook on pay).
  {
    const opened = await openHookDry();
    const { h, dry } = opened;
    try {
      const refused = await dry.post({ input: INPUT, fakes: FK2 }, "hooked-pay");
      assert.equal(refused.status, 400);
      assert.deepEqual(fieldsOf(refused), [
        { field: "body/fakes/pay:post:notify", message: "missing: no fake entry" },
      ]);

      const post = await dry.post(
        { input: INPUT, fakes: { ...FK2, "pay:post:notify": [{ output: { ts: "1.0" } }] } },
        "hooked-pay",
      );
      assert.equal(post.status, 202);
      await dry.execute(RUN_0);

      const run = await storedRun(h, RUN_0);
      assert.equal(run.state, "completed");
      const calls = h.tools.calls();
      assert.equal(calls.length, 1);
      assert.equal(calls[0]?.ref, "erp.lookup_vendor@1");
      assert.deepEqual(h.tools.calls({ ref: "erp.create_payment@1" }), []);
      assert.deepEqual(h.tools.calls({ ref: "slack.post_message@1" }), []);
      assert.equal(h.egress.issued().length, 1);

      const rows = await dry.decisions(RUN_0);
      assert.equal(rows.length, 3);
      assert.deepEqual(
        rows.map((row) => row.resource).sort(),
        [
          'Block::"tenant_a/hooked-pay/lookup"',
          'Block::"tenant_a/hooked-pay/pay"',
          'Block::"tenant_a/hooked-pay/pay:post:notify"',
        ],
      );
      const hookRow = rows.find(
        (row) => row.resource === 'Block::"tenant_a/hooked-pay/pay:post:notify"',
      );
      assert.ok(hookRow !== undefined);
      assert.equal(hookRow.decision, "allow");
      assert.deepEqual(hookRow.reasons, ["t-allow-all"]);
      assert.ok(hookRow.permit !== null, "the hook decision holds a permit");
      assert.equal(hookRow.permit["path"], "/blocks/slack.post_message@1");

      const read = await dry.get(`/api/v1/runs/${RUN_0}/decisions`);
      assert.equal(read.status, 200);
      const page = read.body as { items: Record<string, unknown>[]; next_cursor: unknown };
      assert.deepEqual(
        page.items.map((item) => item["decisionId"]),
        rows.map((row) => row.decisionId),
      );
    } finally {
      await closeDry(opened);
    }
  }

  // H2: read-pay-hook (a pay hook on the read node lookup).
  {
    const opened = await openHookDry();
    const { h, dry } = opened;
    try {
      const hash = await settled("read-pay-hook is saved", () =>
        dry.save("read-pay-hook", readPayHook()),
      );
      assert.equal(typeof hash, "string");

      const refused = await dry.post({ input: INPUT, fakes: { pay: FK2.pay } }, "read-pay-hook");
      assert.equal(refused.status, 400);
      assert.deepEqual(fieldsOf(refused), [
        { field: "body/fakes/lookup:post:payhook", message: "missing: no fake entry" },
      ]);

      const post = await dry.post(
        {
          input: INPUT,
          fakes: { ...FK2, "lookup:post:payhook": [{ output: PAID }] },
        },
        "read-pay-hook",
      );
      assert.equal(post.status, 202);
      await dry.execute(RUN_0);

      const run = await storedRun(h, RUN_0);
      assert.equal(run.state, "completed");
      assert.equal(h.tools.calls().length, 1);
      assert.deepEqual(h.tools.calls({ ref: "erp.create_payment@1" }), []);
      assert.equal(h.egress.issued().length, 1);

      const rows = await dry.decisions(RUN_0);
      assert.deepEqual(
        rows.map((row) => row.resource).sort(),
        [
          'Block::"tenant_a/read-pay-hook/lookup"',
          'Block::"tenant_a/read-pay-hook/lookup:post:payhook"',
          'Block::"tenant_a/read-pay-hook/pay"',
        ],
      );
      const hookRow = rows.find(
        (row) => row.resource === 'Block::"tenant_a/read-pay-hook/lookup:post:payhook"',
      );
      assert.ok(hookRow !== undefined);
      assert.ok(hookRow.permit !== null, "the hook decision holds a permit");
      assert.equal(hookRow.permit["path"], "/blocks/erp.create_payment@1");

      const hookIntent = await intentOf(h, idemKey("tenant_a", RUN_0, "lookup", 1));
      assert.ok(hookIntent !== null, "the hook intent exists");
      assert.equal(hookIntent.state, "done");
      assert.equal(hookIntent.mode, "stub");
    } finally {
      await closeDry(opened);
    }
  }
});

test("C-906311c3 a hook fake error follows on_error and reaches no error or row", async () => {
  // H3: hooked-pay, hook fake error, on_error fail (the default).
  {
    const opened = await openHookDry();
    const { h, dry } = opened;
    try {
      const post = await dry.post(
        {
          input: INPUT,
          fakes: {
            ...FK2,
            "pay:post:notify": [{ error: { code: "E_DOWN", message: "slack is down" } }],
          },
        },
        "hooked-pay",
      );
      assert.equal(post.status, 202);
      await dry.execute(RUN_0);

      const run = await storedRun(h, RUN_0);
      assert.equal(run.state, "failed");
      assert.deepEqual(run.error, {
        code: "HOOK_ERROR",
        message: 'block hook "notify" failed (tool_failed)',
        node: "pay",
        details: { hook: "pay:post:notify", reason: "tool_failed" },
      });
      assert.equal(h.tools.calls().length, 1);
      const rows = await dry.decisions(RUN_0);
      assert.equal(rows.length, 3);
      for (const row of rows) {
        assert.ok(row !== undefined);
        assert.equal(row.decision, "allow");
      }
      assert.ok(!JSON.stringify(run.error).includes("slack is down"));
      for (const step of await dry.steps(RUN_0)) {
        assert.ok(!JSON.stringify(step).includes("slack is down"), step.nodeId);
      }
    } finally {
      await closeDry(opened);
    }
  }

  // H4: hooked-pay-soft, hook fake error, on_error continue.
  {
    const opened = await openHookDry();
    const { h, dry } = opened;
    try {
      const hash = await settled("hooked-pay-soft is saved", () =>
        dry.save("hooked-pay-soft", hookedPaySoft()),
      );
      assert.equal(typeof hash, "string");

      const post = await dry.post(
        {
          input: INPUT,
          fakes: {
            ...FK2,
            "pay:post:notify": [{ error: { code: "E_DOWN", message: "slack is down" } }],
          },
        },
        "hooked-pay-soft",
      );
      assert.equal(post.status, 202);
      await dry.execute(RUN_0);

      const run = await storedRun(h, RUN_0);
      assert.equal(run.state, "completed");
      const steps = await dry.steps(RUN_0);
      const payStep = finalRowOf(steps, "pay");
      assert.ok(payStep !== undefined);
      assert.ok(payStep.hooks !== undefined, "the pay step records hook entries");
      const entries = payStep.hooks.entries;
      assert.equal(entries.length, 1);
      const entry = entries[0];
      assert.ok(entry !== undefined);
      assert.equal(entry.tool, "acme.post_message@1");
      assert.equal(entry.state, "failed");
      assert.deepEqual(entry.error, {
        code: "HOOK_ERROR",
        message: "block hook failed (tool_failed)",
      });
      assert.equal(h.tools.calls().length, 1);
      assert.ok(!JSON.stringify(run.error ?? {}).includes("slack is down"));
      for (const step of steps) {
        assert.ok(!JSON.stringify(step).includes("slack is down"), step.nodeId);
      }
    } finally {
      await closeDry(opened);
    }
  }
});

async function openHookDry(): Promise<{ h: InvokeHarness; dry: DryHarness }> {
  return openDry(async (h) => {
    await h.deploy(ALLOW_ALL);
  });
}
