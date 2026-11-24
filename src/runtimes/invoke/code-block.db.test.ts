import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow } from "../../authoring/index.ts";
import { fixedClock } from "../../core/index.ts";
import { createWorkerSandbox } from "../../sandbox/index.ts";
import type { WorkerSandbox } from "../../sandbox/index.ts";
import type { RunRecord, StepRecord } from "../../runs/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import { approveSurface, codeBlockSurface, registerCodeBlockServerTx, surfaceDigest } from "../../tools/index.ts";
import type { CodeBlockToolInput } from "../../tools/index.ts";
import { dryHarness } from "../../../test/support/invoke-runs/dry-runs.ts";
import type { DryHarness } from "../../../test/support/invoke-runs/dry-runs.ts";
import { invokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import type { InvokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import { createCodeRunner } from "./code.ts";
import type { CodeRunner } from "./types.ts";

const SRC_WC = "return { words: input.text.trim().split(/\\s+/).length };";
const IN_T = { type: "object", properties: { text: { type: "string" } }, required: ["text"] };
const OUT_W = { type: "object", properties: { words: { type: "integer" } }, required: ["words"] };
const WC = {
  name: "word_count",
  description: "Count the words.",
  input: IN_T,
  output: OUT_W,
  source: SRC_WC,
} as unknown as CodeBlockToolInput;
const EX = {
  name: "explode",
  description: "Always fails.",
  input: IN_T,
  output: OUT_W,
  source: "throw new Error('secret_text');",
} as unknown as CodeBlockToolInput;
const CAROL = { kind: "user", id: "u_carol" } as const;

const clock = fixedClock("2026-11-06T10:00:00Z");

function grantOf(tool: string): Record<string, unknown> {
  return { subject: { kind: "role", role: "author" }, tool, scope: { kind: "any_step" }, args: [] };
}

function countFlow(name: string, node: string, uses: string, fromInvoice: boolean): Flow {
  const done = {
    kind: "end",
    status: "completed",
    output: { words: `\${{ nodes.${node}.output.words }}` },
  };
  const count = (text: string, next: string): Record<string, unknown> => ({
    kind: "block",
    uses,
    with: { text },
    next,
  });
  const nodes = fromInvoice
    ? {
        fetch: {
          kind: "block",
          uses: "acme.get@1",
          with: { invoice_id: "${{ inputs.invoice_id }}" },
          next: node,
        },
        [node]: count("${{ nodes.fetch.output.raw_text }}", "done"),
        done,
      }
    : { [node]: count("${{ inputs.text }}", "done"), done };
  return {
    ursitoare: "0.1",
    flow: name,
    version: "1.0.0",
    inputs: fromInvoice
      ? { type: "object", properties: { invoice_id: { type: "string" } }, required: ["invoice_id"] }
      : { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    start: fromInvoice ? "fetch" : node,
    nodes,
  } as unknown as Flow;
}

interface Rig {
  h: InvokeHarness;
  dry: DryHarness;
  pool: WorkerSandbox;
  seen: string[];
}

// Red: createCodeRunner is a stub, so it is built on the first call and its throw happens inside the run.
async function rig(approve: readonly CodeBlockToolInput[][], withGrants: boolean): Promise<Rig> {
  const pool = createWorkerSandbox({ size: 1 });
  const seen: string[] = [];
  let runner: CodeRunner | undefined;
  const code: CodeRunner = (call, args, ctx) => {
    seen.push((call as { source: string }).source);
    runner ??= createCodeRunner(() => pool);
    return runner(call, args, ctx);
  };
  let h: InvokeHarness | undefined;
  try {
    h = await invokeHarness({ code });
    const servers: [string, CodeBlockToolInput[]][] = [
      ["snips", [WC]],
      ["boom", [EX]],
    ];
    for (const [id, tools] of servers) {
      if (!approve.some((set) => set[0] === tools[0])) continue;
      const ctx = h.ctx;
      await withTenantTx(h.pool, ctx, (tx) => registerCodeBlockServerTx(tx, ctx, { id, tools }, CAROL, { clock }));
      await approveSurface(
        h.pool,
        ctx,
        id,
        { digest: surfaceDigest(codeBlockSurface(tools)), selfApproval: true },
        { userId: "u_carol", kind: "user" },
        { clock },
      );
    }
    if (withGrants) {
      await h.grant(grantOf("acme.get@1"));
      await h.grant(grantOf("snips.word_count@1"));
      if (approve.length > 1) {
        await h.grant(grantOf("boom.explode@1"));
      }
    }
    await h.deploy("");
    const dry = await dryHarness(h);
    return { h, dry, pool, seen };
  } catch (error) {
    await h?.close();
    await pool.close();
    throw error;
  }
}

async function closeRig(r: Rig): Promise<void> {
  await r.dry.close();
  await r.h.close();
  await r.pool.close();
}

async function runFlow(r: Rig, flow: Flow, input: unknown): Promise<{ id: string; run: RunRecord | null }> {
  await r.dry.save(flow.flow, flow);
  const post = await r.dry.post({ input, fakes: {} }, flow.flow);
  assert.equal(post.status, 202, "the dry run is accepted");
  const id = (post.body as { run: { id: string } }).run.id;
  await r.dry.execute(id);
  return { id, run: await r.h.store.getRun(r.h.ctx, id) };
}

function finalRow(steps: readonly StepRecord[], nodeId: string): StepRecord | undefined {
  return steps.filter((step) => step.nodeId === nodeId).at(-1);
}

test("C-0b23a940 C-4701952e V1 and V3 a granted block runs with no permit and its taint follows the input", async () => {
  const r = await rig([[WC]], true);
  try {
    const v1 = await runFlow(r, countFlow("count-invoice", "count", "snips.word_count@1", true), {
      invoice_id: "INV-1001",
    });
    assert.equal(v1.run?.state, "completed");
    assert.equal(v1.run?.terminalNode, "done");
    const payload = await r.h.store.getPayload(r.h.ctx, v1.run?.outputRef as string);
    assert.deepEqual(payload?.data, { words: 23 });
    const rows = await r.dry.decisions(v1.id);
    assert.equal(rows.length, 2);
    const count = rows[1];
    assert.equal(count?.nodeId, "count");
    assert.equal(count?.decision, "allow");
    assert.equal(count?.action, "invoke_tool");
    assert.equal(count?.resource, 'Block::"tenant_a/count-invoice/count"');
    assert.equal(count?.errors.length, 0);
    assert.equal(count?.reasons.length, 1);
    assert.equal(count?.permit, null);
    assert.deepEqual(
      (r.h.gateway.calls as { op: string }[]).map((c) => c.op),
      ["requestToken", "send"],
    );
    assert.equal(r.h.egress.issued().length, 1);
    assert.equal(r.h.tools.calls().length, 1);
    assert.deepEqual(r.seen, [SRC_WC]);
    const steps1 = await r.dry.steps(v1.id);
    assert.deepEqual(finalRow(steps1, "fetch")?.taint, []);
    assert.deepEqual(finalRow(steps1, "count")?.taint, ["untrusted"]);
    assert.deepEqual(finalRow(steps1, "done")?.taint, ["untrusted"]);

    const v3 = await runFlow(r, countFlow("count-text", "count", "snips.word_count@1", false), {
      text: "a b c",
    });
    assert.equal(v3.run?.state, "completed");
    const out3 = await r.h.store.getPayload(r.h.ctx, v3.run?.outputRef as string);
    assert.deepEqual(out3?.data, { words: 3 });
    const steps3 = await r.dry.steps(v3.id);
    assert.deepEqual(finalRow(steps3, "count")?.taint, []);
    assert.deepEqual(finalRow(steps3, "done")?.taint, []);
    const rows3 = await r.dry.decisions(v3.id);
    assert.equal(rows3.length, 1);
    assert.equal(rows3[0]?.permit, null);
    assert.equal(r.h.gateway.calls.length, 2);
    assert.equal(r.h.egress.issued().length, 1);
  } finally {
    await closeRig(r);
  }
});

test("C-0b23a940 C-0e290b4f V4 and V5 a failing source has fixed details and an ungranted block is denied", async () => {
  const r = await rig([[WC], [EX]], true);
  try {
    const v4 = await runFlow(r, countFlow("explode-invoice", "explode", "boom.explode@1", true), {
      invoice_id: "INV-1001",
    });
    assert.equal(v4.run?.state, "failed");
    assert.equal(v4.run?.error?.code, "INTERPRETER_TOOL_FAILED");
    assert.equal(v4.run?.error?.node, "explode");
    assert.deepEqual(v4.run?.error?.details, { stage: "code", fault: "runtime_error" });
    const rows = await r.dry.decisions(v4.id);
    assert.equal(rows.length, 2);
    assert.equal(rows[1]?.decision, "allow");
    assert.equal(rows[1]?.permit, null);
    const everything = JSON.stringify([v4.run, await r.dry.steps(v4.id), rows, r.h.logs()]);
    assert.ok(!everything.includes("secret_text"));
  } finally {
    await closeRig(r);
  }
  await deniedWithoutGrant();
});

async function deniedWithoutGrant(): Promise<void> {
  const r = await rig([[WC]], false);
  try {
    const v5 = await runFlow(r, countFlow("count-text", "count", "snips.word_count@1", false), {
      text: "a b c",
    });
    assert.equal(v5.run?.state, "failed");
    assert.equal(v5.run?.error?.code, "INTERPRETER_TOOL_DENIED");
    assert.equal(v5.run?.error?.node, "count");
    const rows = await r.dry.decisions(v5.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.decision, "deny");
    assert.deepEqual(rows[0]?.reasons, []);
    assert.deepEqual(v5.run?.error?.details, { reason: "policy", decisionId: rows[0]?.decisionId });
    assert.deepEqual(r.seen, []);
  } finally {
    await closeRig(r);
  }
}
