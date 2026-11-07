import assert from "node:assert/strict";
import { test } from "node:test";

import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { loadHookFlow } from "../../../test/support/hook-flows/index.ts";
import { FLOW_ERROR_CODES, FLOW_RESERVED_CODES, FLOW_WARNING_CODES } from "../validate/index.ts";
import type { Flow } from "../format/index.ts";
import type { NodeMeta } from "./index.ts";
import {
  HOOKLESS_KINDS,
  HOOK_ERROR_CODES,
  HOOK_WARNING_CODES,
  nodeMeta,
  selectorMatches,
  whenMatches,
} from "./index.ts";

const catalogue = loadTestCatalogue();

function onion(): Flow {
  return structuredClone(loadHookFlow("s09-onion"));
}

function nodesOf(flow: Flow): Record<string, unknown> {
  return (flow as unknown as { nodes: Record<string, unknown> }).nodes;
}

function metaOf(flow: Flow, id: string): NodeMeta | null {
  let meta: NodeMeta | null = null;
  assert.doesNotThrow(() => {
    meta = nodeMeta(flow, id, catalogue);
  });
  return meta;
}

function sel(value: unknown): Parameters<typeof selectorMatches>[0] {
  return value as Parameters<typeof selectorMatches>[0];
}

test("C-8f577367: nodeMeta describes nodes and answers null for non-nodes", () => {
  const flow = onion();
  const nodes = nodesOf(flow);
  (nodes["pay"] as { tags?: string[] }).tags = ["finance", "eu"];
  nodes["five"] = 5;
  (nodes["lookup_vendor"] as { uses?: string }).uses = "erp.unknown@1";
  const meta = (id: string): NodeMeta | null => metaOf(flow, id);
  assert.deepEqual(meta("pay"), { id: "pay", kind: "block", effect: "pay", tags: ["finance", "eu"] });
  assert.deepEqual(meta("archive"), { id: "archive", kind: "delegate", effect: "send", tags: [] });
  assert.deepEqual(meta("approval"), { id: "approval", kind: "human.approval", effect: "human", tags: [] });
  assert.deepEqual(meta("done"), { id: "done", kind: "end", effect: "none", tags: [] });
  assert.deepEqual(meta("extract"), { id: "extract", kind: "llm.extract", effect: "read", tags: [] });
  for (const id of ["__proto__", "constructor", "missing", "five"]) {
    assert.equal(meta(id), null, id);
  }
  assert.deepEqual(meta("lookup_vendor"), { id: "lookup_vendor", kind: "block", effect: null, tags: [] });
});

test("C-8f577367: selectorMatches ANDs the selector fields", () => {
  const flow = onion();
  (nodesOf(flow)["pay"] as { tags?: string[] }).tags = ["finance", "eu"];
  (nodesOf(flow)["lookup_vendor"] as { uses?: string }).uses = "erp.unknown@1";
  const P = metaOf(flow, "pay");
  const U = metaOf(flow, "lookup_vendor");
  assert.ok(P !== null && U !== null);
  const m = (s: unknown, meta: NodeMeta | null): boolean => {
    let out = false;
    assert.doesNotThrow(() => {
      out = selectorMatches(sel(s), meta);
    });
    return out;
  };
  for (const s of [
    undefined,
    {},
    { effect: ["pay", "send"] },
    { kind: ["block"], effect: ["pay"] },
    { nodes: ["pay"] },
    { tags: ["eu", "zz"] },
  ]) {
    assert.equal(m(s, P), true, JSON.stringify(s));
  }
  for (const s of [
    { effect: ["read"] },
    { kind: ["block"], effect: ["read"] },
    { nodes: ["x"] },
    { tags: ["zz"] },
    { effect: [] },
    { kind: "block" },
  ]) {
    assert.equal(m(s, P), false, JSON.stringify(s));
  }
  assert.equal(m({}, null), false);
  assert.equal(m(undefined, null), false);
  assert.equal(m({ effect: ["read"] }, U), false);
  assert.equal(m({ kind: ["block"] }, U), true);
});

test("C-71097b3f: whenMatches applies from, next and outcome", () => {
  const flow = onion();
  const LV = metaOf(flow, "lookup_vendor");
  const CL = metaOf(flow, "classify");
  const AP = metaOf(flow, "approval");
  const PA = metaOf(flow, "pay");
  assert.ok(LV !== null && CL !== null && AP !== null && PA !== null);
  const w = (
    when: unknown,
    from: NodeMeta | null,
    next: NodeMeta | null,
    outcome: string | null,
  ): boolean => {
    let out = false;
    assert.doesNotThrow(() => {
      out = whenMatches(when as Parameters<typeof whenMatches>[0], from, next, outcome);
    });
    return out;
  };
  assert.equal(w(undefined, null, null, null), true);
  assert.equal(w({}, null, null, null), true);
  assert.equal(w({ from: { kind: ["block"] } }, null, PA, null), false);
  assert.equal(w({ from: { kind: ["block"] } }, LV, PA, null), true);
  assert.equal(w({ next: { effect: ["pay"] } }, LV, PA, null), true);
  assert.equal(w({ next: { effect: ["pay"] } }, LV, null, null), false);
  assert.equal(w({ outcome: ["approved"] }, null, null, "approved"), true);
  assert.equal(w({ outcome: ["approved"] }, null, null, "rejected"), false);
  assert.equal(w({ outcome: ["approved"] }, null, null, null), false);
  const full = { from: { kind: ["llm.decide"] }, next: { effect: ["human"] }, outcome: ["needs_review"] };
  assert.equal(w(full, CL, AP, "needs_review"), true);
  assert.equal(w(full, CL, AP, "reject"), false);
  assert.equal(w(full, CL, PA, "needs_review"), false);
});

test("C-d672ebad: the hook code lists and HOOKLESS_KINDS are exact and apart from the flow lists", () => {
  assert.deepEqual(
    [...HOOK_ERROR_CODES],
    [
      "H_SCHEMA",
      "H_BLOCK",
      "H_ROUTE_TARGET",
      "H_ROUTE_HUMAN",
      "H_ROUTE_EFFECT",
      "H_RETRY_SCOPE",
      "H_CYCLE",
      "H_DOMINANCE",
    ],
  );
  assert.deepEqual([...HOOK_WARNING_CODES], ["W_NO_MATCH"]);
  assert.deepEqual([...HOOKLESS_KINDS], ["agent", "foreach", "human.form", "subflow"]);
  const flowCodes = new Set<string>([...FLOW_ERROR_CODES, ...FLOW_WARNING_CODES, ...FLOW_RESERVED_CODES]);
  for (const code of [...HOOK_ERROR_CODES, ...HOOK_WARNING_CODES]) {
    assert.equal(flowCodes.has(code), false, code);
  }
});
