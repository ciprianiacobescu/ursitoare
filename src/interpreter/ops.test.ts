import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../authoring/index.ts";
import { memoryWorkflowOps, NO_EFFECT_GATE } from "./index.ts";
import type {
  EffectDecision,
  MemoryWorkflowOps,
  StepContext,
  ToolCall,
} from "./index.ts";

assert.equal(typeof memoryWorkflowOps, "function");
assert.equal(typeof NO_EFFECT_GATE.before, "function");
assert.equal(typeof NO_EFFECT_GATE.after, "function");

function makeOps(workflowId: string, recorded?: readonly JsonValue[]): MemoryWorkflowOps {
  let ops: MemoryWorkflowOps | undefined;
  assert.doesNotThrow(() => {
    ops = memoryWorkflowOps(workflowId, recorded);
  });
  assert.ok(ops !== undefined, "memoryWorkflowOps returned ops");
  return ops;
}

test("C-9272817b recorded steps replay by position without calling their callbacks", async () => {
  const recorded: JsonValue[] = [{ a: 1 }, { b: 2 }];
  const ops = makeOps("r_1", recorded);
  const called: string[] = [];

  assert.equal(ops.workflowId, "r_1");
  assert.deepEqual(ops.executed, []);
  assert.deepEqual(ops.slept, []);

  let first: JsonValue | undefined;
  await assert.doesNotReject(async () => {
    first = await ops.runStep("first", async (): Promise<JsonValue> => {
      called.push("first");
      return { other: 9 };
    });
  });
  assert.deepEqual(first, { a: 1 });

  let second: JsonValue | undefined;
  await assert.doesNotReject(async () => {
    second = await ops.runStep("a different name", async (): Promise<JsonValue> => {
      called.push("second");
      return { other: 8 };
    });
  });
  assert.deepEqual(second, { b: 2 });

  assert.deepEqual(called, [], "recorded steps never run their callback");
  assert.deepEqual(ops.executed, [], "recorded steps leave the executed list empty");

  const firstCopy = first as unknown as { a: number };
  firstCopy.a = 99;
  assert.deepEqual(recorded[0], { a: 1 }, "a recorded result is copied");
});

test("C-9272817b later steps run once and are listed in execution order", async () => {
  const ops = makeOps("r_1");
  const called: string[] = [];

  let result: JsonValue | undefined;
  await assert.doesNotReject(async () => {
    result = await ops.runStep("third", async (): Promise<JsonValue> => {
      called.push("third");
      return { fresh: { ok: true } };
    });
  });

  assert.deepEqual(result, { fresh: { ok: true } });
  assert.deepEqual(called, ["third"]);
  assert.deepEqual(ops.executed, ["third"]);

  let marker: JsonValue | undefined;
  await assert.doesNotReject(async () => {
    marker = await ops.runStep("marker", async (): Promise<JsonValue> => null);
  });
  assert.equal(marker, null, "a marker step returns null");
  assert.deepEqual(ops.executed, ["third", "marker"]);
});

test("C-9272817b sleep records milliseconds and consumes no recorded step", async () => {
  const ops = makeOps("r_2", [{ value: 1 }]);

  await assert.doesNotReject(async () => {
    await ops.sleep(1500);
  });
  await assert.doesNotReject(async () => {
    await ops.sleep(2000);
  });
  assert.deepEqual(ops.slept, [1500, 2000]);

  let replayed: JsonValue | undefined;
  await assert.doesNotReject(async () => {
    replayed = await ops.runStep("after the sleeps", async (): Promise<JsonValue> => ({ value: 2 }));
  });
  assert.deepEqual(replayed, { value: 1 }, "a sleep does not take a recorded slot");
  assert.deepEqual(ops.executed, []);

  let executed: JsonValue | undefined;
  await assert.doesNotReject(async () => {
    executed = await ops.runStep("beyond the recording", async (): Promise<JsonValue> => ({ value: 3 }));
  });
  assert.deepEqual(executed, { value: 3 });
  assert.deepEqual(ops.executed, ["beyond the recording"]);
});

test("NO_EFFECT_GATE invokes without a key and accepts an after result", async () => {
  const call: ToolCall = {
    tool: "erp.lookup_vendor@1",
    args: { vendor_name: "Acme" },
    nodeId: "lookup",
    effectSeq: 0,
  };
  const ctx = {} as StepContext;

  let decision: EffectDecision | undefined;
  await assert.doesNotReject(async () => {
    decision = await NO_EFFECT_GATE.before(call, ctx);
  });
  assert.deepEqual(decision, { action: "invoke", idemKey: null });

  await assert.doesNotReject(async () => {
    await NO_EFFECT_GATE.after(call, ctx, { output: { vendor_id: "v1" } });
  });
});
