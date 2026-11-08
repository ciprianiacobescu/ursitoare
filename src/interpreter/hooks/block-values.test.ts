import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type {
  Flow,
  HookDef,
  HookPlacement,
  JsonValue,
  NodeMeta,
} from "../../authoring/index.ts";
import { hookPlacements } from "../../authoring/index.ts";
import { createFaultPoints } from "../../config/index.ts";
import { payOnceCatalogue, payOnceVersion } from "../../../test/support/crash/pay-once.ts";
import { InterpreterError } from "../errors.ts";
import type { RunScope } from "../types.ts";
import type { HookValues } from "./block-runner.ts";
import { hookBlockRefs, hookMockKey, resolveHookValue } from "./block-runner.ts";

const LOOKUP: JsonValue = { vendor_id: "v1", status: "active" };
const PAID: JsonValue = { payment_id: "pay-1", status: "paid" };
const PAY_ARGS: JsonValue = {
  vendor_id: "v1",
  amount: 120,
  currency: "EUR",
  reference: "inv-1",
};
const PAY_ONCE_INPUT: JsonValue = { vendor: "Acme", invoice: "inv-1", amount: 120 };

const AUDIT: HookDef = {
  id: "audit",
  kind: "block",
  uses: "invoices.get@1",
  with: { invoice_id: "${{ inputs.invoice }}" },
};
const NOTIFY: HookDef = {
  id: "notify",
  kind: "block",
  uses: "slack.post_message@1",
  with: { channel: "#ap", text: "${{ hook.node.id }} paid ${{ hook.output.payment_id }}" },
};
const TAG: HookDef = { id: "tag", kind: "code", source: "return;" };

function hookedFlow(): Flow {
  const flow = payOnceVersion().flow;
  const pay = flow.nodes["pay"];
  if (pay === undefined || pay.kind !== "block") {
    throw new Error("pay-once has no pay block");
  }
  return {
    ...flow,
    hooks: [{ id: "audit", match: { nodes: ["lookup"] }, pre: AUDIT }],
    nodes: { ...flow.nodes, pay: { ...pay, post: [NOTIFY, TAG] } },
  };
}

const HOOKED = hookedFlow();
const CATALOGUE = payOnceCatalogue();

function scope(): RunScope {
  return {
    inputs: PAY_ONCE_INPUT,
    nodes: new Map([
      ["lookup", { output: LOOKUP, outcome: null }],
      ["pay", { output: PAID, outcome: null }],
    ]),
  };
}

function meta(id: string, kind: string, effect: NodeMeta["effect"]): NodeMeta {
  return { id, kind, effect, tags: [] };
}

function hookValues(): HookValues {
  return {
    input: PAY_ARGS,
    output: PAID,
    node: meta("pay", "block", "pay"),
    next: meta("done", "end", "none"),
    from: meta("lookup", "block", "read"),
  };
}

function run<T>(fn: () => T): T | undefined {
  let value: T | undefined;
  assert.doesNotThrow(() => {
    value = fn();
  });
  return value;
}

function unresolvedRef(fn: () => unknown): string | undefined {
  let error: unknown;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof InterpreterError, "InterpreterError");
  assert.equal(error.code, "INTERPRETER_REF_UNRESOLVED");
  return error.details["ref"] as string | undefined;
}

function placement(
  flow: Flow,
  nodeId: string,
  phase: "pre" | "post",
  index: number,
): HookPlacement {
  const placed = hookPlacements(flow, nodeId, CATALOGUE);
  const list = phase === "pre" ? placed.pre : placed.post;
  const found = list[index];
  assert.ok(found !== undefined, `${nodeId} ${phase} ${index}`);
  return found;
}

test("C-7f69652d hookMockKey equals the hook step name and both keys arm as fault points", () => {
  const notify = placement(HOOKED, "pay", "post", 0);
  const audit = placement(HOOKED, "lookup", "pre", 0);
  const keys = [
    run(() => hookMockKey("pay", notify)),
    run(() => hookMockKey("lookup", audit)),
  ];
  assert.deepEqual(keys, ["pay:post:notify", "lookup:pre:rule.audit"]);
  const markerDir = mkdtempSync(join(tmpdir(), "block-values-"));
  for (const key of keys) {
    assert.doesNotThrow(() => {
      createFaultPoints({ armed: [`after:${String(key)}`], markerDir, kill: () => {} });
    });
  }
});

test("C-7f69652d hookBlockRefs lists sorted unique block hook uses and skips malformed entries", () => {
  assert.deepEqual(run(() => hookBlockRefs(HOOKED)), [
    "invoices.get@1",
    "slack.post_message@1",
  ]);
  assert.deepEqual(run(() => hookBlockRefs(payOnceVersion().flow)), []);
  const malformed = {
    nodes: { a: { pre: [null, { kind: "block", uses: 5 }, 7], post: "x" }, b: null },
    hooks: [
      null,
      "junk",
      { pre: { kind: "block", uses: "x.y@1" } },
      { post: { kind: "code" } },
    ],
  } as unknown as Flow;
  assert.deepEqual(run(() => hookBlockRefs(malformed)), ["x.y@1"]);
});

test("C-7f69652d resolveHookValue resolves every hook root", () => {
  const values = [
    "${{ hook.input.amount }}",
    "${{ hook.output.payment_id }}",
    "${{ hook.node.id }}",
    "${{ hook.node.effect }}",
    "${{ hook.node.tags }}",
    "${{ hook.next.id }}",
    "${{ hook.from.kind }}",
  ].map((value) => run(() => resolveHookValue(value, scope(), hookValues())));
  assert.deepEqual(values, [120, "pay-1", "pay", "pay", [], "done", "block"]);
});

test("C-7f69652d resolveHookValue resolves hook refs inside a nested value", () => {
  const value = {
    a: [
      "${{ inputs.vendor }}",
      "x ${{ hook.node.id }} y ${{ nodes.pay.output.status }}",
      5,
      null,
      true,
    ],
  };
  const got = run(() => resolveHookValue(value, scope(), hookValues()));
  assert.deepEqual(got, { a: ["Acme", "x pay y paid", 5, null, true] });
});

test("C-7f69652d resolveHookValue copies the meta tags it returns", () => {
  const values = hookValues();
  const got = run(() => resolveHookValue("${{ hook.node.tags }}", scope(), values));
  assert.deepEqual(got, []);
  assert.ok(Array.isArray(got));
  (got as JsonValue[]).push("changed");
  assert.deepEqual(values.node.tags, []);
});

test("C-7f69652d resolveHookValue fails unresolved hook refs with the ref", () => {
  const cases: readonly [string, HookValues, string][] = [
    ["${{ hook.from.id }}", { ...hookValues(), from: null }, "hook.from.id"],
    ["${{ hook.next.id }}", { ...hookValues(), next: null }, "hook.next.id"],
    ["${{ hook.input.x }}", { ...hookValues(), input: null }, "hook.input.x"],
    [
      "${{ hook.output.payment_id }}",
      { ...hookValues(), output: null },
      "hook.output.payment_id",
    ],
    ["${{ hook.input.nope }}", hookValues(), "hook.input.nope"],
    ["${{ hook.node.nope }}", hookValues(), "hook.node.nope"],
    ["${{ nodes.ghost.output.a }}", hookValues(), "nodes.ghost.output.a"],
    ["${{ hook.bogus.x }}", hookValues(), "hook.bogus.x"],
    ["${{ hook.node.__proto__ }}", hookValues(), "hook.node.__proto__"],
    ["${{ hook.input.constructor }}", hookValues(), "hook.input.constructor"],
  ];
  for (const [value, values, ref] of cases) {
    assert.equal(unresolvedRef(() => resolveHookValue(value, scope(), values)), ref);
  }
});
