import assert from "node:assert/strict";
import { test } from "node:test";

import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { loadTestFlow } from "../../../test/support/catalogue/flows.ts";
import { loadHookFlow } from "../../../test/support/hook-flows/index.ts";
import type { Flow } from "../format/index.ts";
import type { HookPlacement } from "./index.ts";
import { augmentedSuccessors, declaresHooks, hookPlacements, hookRoutes } from "./index.ts";

const catalogue = loadTestCatalogue();

function onion(): Flow {
  return structuredClone(loadHookFlow("s09-onion"));
}

function placed(flow: Flow, id: string): { pre: HookPlacement[]; post: HookPlacement[] } {
  let result: { pre: HookPlacement[]; post: HookPlacement[] } = { pre: [], post: [] };
  assert.doesNotThrow(() => {
    result = hookPlacements(flow, id, catalogue);
  });
  return result;
}

function labels(list: HookPlacement[]): string[] {
  return list.map((p) => p.label);
}

test("C-9762b9cd: hookPlacements orders rules and node hooks as an onion", () => {
  const flow = onion();
  const pay = placed(flow, "pay");
  assert.deepEqual(labels(pay.pre), ["rule.rule_a", "rule.rule_b", "pay_pre_note"]);
  assert.deepEqual(pay.pre.map((p) => p.ruleId), ["rule_a", "rule_b", null]);
  assert.deepEqual(labels(pay.post), ["pay_post_note", "rule.rule_b", "rule.rule_a"]);
  assert.ok(pay.pre.every((p) => p.phase === "pre"));
  assert.ok(pay.post.every((p) => p.phase === "post"));
  const nodes = (flow as unknown as { nodes: Record<string, { pre: unknown[]; post: unknown[] }> }).nodes;
  assert.equal(pay.pre[2]?.hook, nodes["pay"]?.pre[0]);
  assert.equal(pay.post[0]?.hook, nodes["pay"]?.post[0]);
  const fetch = placed(flow, "fetch_invoice");
  assert.deepEqual(labels(fetch.pre), ["rule.rule_b"]);
  assert.deepEqual(labels(fetch.post), ["rule.rule_b"]);
  for (const id of ["extract", "done"]) {
    const p = placed(flow, id);
    assert.deepEqual(p.pre, [], id);
    assert.deepEqual(p.post, [], id);
  }
});

test("C-9762b9cd: hookPlacements skips hookless kinds, end posts and unknown ids", () => {
  const flow = onion();
  const doc = flow as unknown as { hooks: unknown[]; nodes: Record<string, unknown> };
  const code = { kind: "code", source: "return;" };
  doc.hooks.push({ id: "all", match: {}, pre: { id: "all", ...code }, post: { id: "all", ...code } });
  doc.nodes["agent_x"] = { kind: "agent", pre: [{ id: "agent_pre", ...code }] };
  doc.nodes["loop_x"] = { kind: "foreach" };
  doc.nodes["form_x"] = { kind: "human.form" };
  doc.nodes["sub_x"] = { kind: "subflow" };
  for (const id of ["done", "rejected"]) {
    const p = placed(flow, id);
    assert.deepEqual(labels(p.pre), ["rule.all"], id);
    assert.deepEqual(p.post, [], id);
  }
  const pay = placed(flow, "pay");
  assert.deepEqual(labels(pay.pre), ["rule.rule_a", "rule.rule_b", "rule.all", "pay_pre_note"]);
  assert.deepEqual(labels(pay.post), ["pay_post_note", "rule.all", "rule.rule_b", "rule.rule_a"]);
  for (const id of ["agent_x", "loop_x", "form_x", "sub_x", "missing", "__proto__"]) {
    const p = placed(flow, id);
    assert.deepEqual(p.pre, [], id);
    assert.deepEqual(p.post, [], id);
  }
});

test("C-45aac31b: hookRoutes lists the routes of post placements", () => {
  const s06 = loadHookFlow("s06-next-redirect");
  let routes: string[][] = [];
  assert.doesNotThrow(() => {
    routes = ["classify", "approval", "nope"].map((id) => hookRoutes(s06, id, catalogue));
  });
  assert.deepEqual(routes, [["approval"], [], []]);
});

test("C-45aac31b: augmentedSuccessors adds hook routes to declared successors", () => {
  const s14 = loadHookFlow("s14-unsafe-redirect");
  let map: ReadonlyMap<string, readonly string[]> = new Map();
  assert.doesNotThrow(() => {
    map = augmentedSuccessors(s14, catalogue);
  });
  const ids = Object.keys((s14 as unknown as { nodes: object }).nodes);
  assert.equal(ids.length, 11);
  assert.deepEqual([...map.keys()], ids);
  assert.deepEqual(map.get("extract"), ["lookup_vendor", "classify"]);
  assert.deepEqual(map.get("fetch_invoice"), ["extract"]);
  assert.deepEqual(map.get("done"), []);
  const expected = ["pay", "approval", "notify_rejection"];
  for (const name of ["s06-next-redirect", "n-route-target"]) {
    let m: ReadonlyMap<string, readonly string[]> = new Map();
    assert.doesNotThrow(() => {
      m = augmentedSuccessors(loadHookFlow(name), catalogue);
    });
    assert.deepEqual(m.get("classify"), expected, name);
  }
});

test("C-45aac31b: declaresHooks says whether a document uses hooks", () => {
  const docs: unknown[] = [
    {},
    null,
    { hooks: [] },
    { hooks: undefined },
    { nodes: { a: { post: [] } } },
    { nodes: { a: { pre: undefined } } },
    { nodes: { a: { kind: "end" } } },
    loadHookFlow("m-h0"),
    loadHookFlow("m-h1"),
    loadTestFlow("rf-1-invoice-intake"),
    loadHookFlow("s09-onion"),
  ];
  let got: boolean[] = [];
  assert.doesNotThrow(() => {
    got = docs.map((d) => declaresHooks(d));
  });
  assert.deepEqual(got, [false, false, true, false, true, false, false, false, true, false, true]);
});
