/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalizeFlow, parseFlowText } from "../../../src/authoring/index.ts";
import { graphView } from "./graph-model.ts";
import {
  flowRuleText,
  hookBadgeText,
  hookOverlay,
  hookRoutePaths,
  hookRouteText,
  hookSectionView,
} from "./hook-overlay.ts";
import type {
  FlowRuleRow,
  HookBadge,
  HookOverlay,
  HookRouteEdge,
  HookSectionView,
} from "./hook-overlay.ts";
import { layoutFlow } from "./layout.ts";
import type { GraphLayout } from "./layout.ts";

const DEMO_HOOKS = `ursitoare: "0.1"
flow: demo-hooks
version: 1.0.0
inputs:
  type: object
  properties: { vendor_name: { type: string }, amount: { type: number } }
  required: [vendor_name, amount]
start: lookup
nodes:
  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "\${{ inputs.vendor_name }}" }, next: normalize }
  normalize:
    kind: code
    language: js
    input: { amount: "\${{ inputs.amount }}", status: "\${{ nodes.lookup.output.status }}" }
    source: "return { amount: Math.round(input.amount * 100) / 100, route: input.status === 'active' ? 'pay' : 'blocked' };"
    output_schema:
      type: object
      properties: { amount: { type: number }, route: { type: string, enum: [pay, blocked] } }
      required: [amount, route]
    next: route
  route: { kind: switch, on: "\${{ nodes.normalize.output.route }}", cases: { pay: pay }, default: blocked }
  pay:
    kind: block
    uses: erp.create_payment@1
    with: { vendor_id: "\${{ nodes.lookup.output.vendor_id }}", amount: "\${{ nodes.normalize.output.amount }}", currency: EUR, reference: demo }
    pre:
      - { id: guard, kind: code, source: "if (ctx.input.amount > 10000) return { action: 'fail', reason: 'over limit' };" }
    post:
      - { id: notify, kind: block, uses: slack.post_message@1, with: { channel: ap, text: "paid \${{ hook.output.payment_id }}" }, on_error: continue }
    next: done
  done: { kind: end, status: completed, output: { payment_id: "\${{ nodes.pay.output.payment_id }}" } }
  blocked: { kind: end, status: failed }
`;

const DEMO_X3 = `ursitoare: "0.1"
flow: demo-x3
version: 1.0.0
inputs:
  type: object
  properties: { vendor_name: { type: string }, amount: { type: number } }
  required: [vendor_name, amount]
start: lookup
hooks:
  - { id: audit, match: { kind: [code] }, post: { kind: code, source: "return;" } }
nodes:
  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "\${{ inputs.vendor_name }}" }, next: classify }
  classify:
    kind: code
    language: js
    input: { amount: "\${{ inputs.amount }}" }
    source: "return { amount: input.amount };"
    output_schema:
      type: object
      properties: { amount: { type: number } }
      required: [amount]
    post:
      - { id: rush, kind: code, routes: [pay], source: "return { action: 'redirect', to: 'pay' };" }
    next: review
  review:
    kind: code
    language: js
    input: { amount: "\${{ nodes.classify.output.amount }}" }
    source: "return { approved: input.amount < 10000 };"
    output_schema:
      type: object
      properties: { approved: { type: boolean } }
      required: [approved]
    next: pay
  pay:
    kind: block
    uses: erp.create_payment@1
    with: { vendor_id: "\${{ nodes.lookup.output.vendor_id }}", amount: "\${{ nodes.classify.output.amount }}", currency: EUR, reference: demo }
    next: done
  done: { kind: end, status: completed, output: { payment_id: "\${{ nodes.pay.output.payment_id }}" } }
`;

function flowOf(text: string, label: string): unknown {
  const result = parseFlowText(text, "yaml");
  if (!result.ok) {
    assert.fail(`${label} parses: ${result.error.code}`);
  }
  return canonicalizeFlow(result.doc);
}

function rulesDoc(): unknown {
  return {
    start: "a",
    nodes: {
      a: {
        kind: "block",
        next: "b",
        post: [
          { id: "tidy", kind: "code", source: "x", routes: ["b", "ghost", "ghost", "a"] },
          { id: "tidy2", kind: "code", source: "x", routes: ["b"] },
        ],
      },
      b: { kind: "end", pre: [{ id: "w" }, { kind: "code" }, 5, { id: "" }] },
    },
    hooks: [
      {
        id: "audit",
        match: { kind: ["block"], effect: ["pay", "send"] },
        pre: { kind: "code", source: "x" },
      },
      { id: "all", post: { kind: "block", uses: "x@1", with: {} } },
      { id: "", pre: {} },
      5,
      {
        id: "named",
        match: { nodes: ["a", "b"], tags: ["t1"] },
        pre: { kind: "code" },
        post: { kind: "code", routes: ["b", "a"] },
      },
    ],
  };
}

function largeDoc(): unknown {
  const pre: unknown[] = [];
  for (let index = 1; index <= 17; index += 1) {
    pre.push({ id: `h${index}`, kind: "code", source: "x" });
  }
  const rules: unknown[] = [{ id: "r".repeat(70) }];
  for (let index = 1; index <= 16; index += 1) {
    rules.push({ id: `rule${index}` });
  }
  return { start: "a", nodes: { a: { kind: "end", pre } }, hooks: rules };
}

function layoutOf(doc: unknown, label: string): GraphLayout {
  const result = layoutFlow(doc);
  assert.ok(result.status === "ok", `${label} has a layout`);
  return result.layout;
}

function overlayOf(doc: unknown, layout: GraphLayout, label: string): HookOverlay {
  let overlay: HookOverlay | undefined;
  assert.doesNotThrow(() => {
    overlay = hookOverlay(doc, layout);
  }, `${label} does not throw`);
  assert.ok(overlay !== undefined, `${label} returns an overlay`);
  return overlay;
}

function badgeAt(overlay: HookOverlay, index: number): HookBadge {
  const badge = overlay.badges[index];
  assert.ok(badge !== undefined, `there is a badge at ${index}`);
  return badge;
}

function routeAt(overlay: HookOverlay, index: number): HookRouteEdge {
  const route = overlay.routes[index];
  assert.ok(route !== undefined, `there is a route at ${index}`);
  return route;
}

function ruleAt(overlay: HookOverlay, index: number): FlowRuleRow {
  const rule = overlay.rules[index];
  assert.ok(rule !== undefined, `there is a rule at ${index}`);
  return rule;
}

function sectionOf(doc: unknown, layout: GraphLayout | null, label: string): HookSectionView | null {
  let section: HookSectionView | null | undefined;
  assert.doesNotThrow(() => {
    section = hookSectionView(doc, layout);
  }, `${label} does not throw`);
  assert.ok(section !== undefined, `${label} returns a section view`);
  return section;
}

function badgeTextOf(badge: HookBadge): string {
  let text: string | undefined;
  assert.doesNotThrow(() => {
    text = hookBadgeText(badge);
  }, "hookBadgeText does not throw");
  assert.ok(text !== undefined, "hookBadgeText returns text");
  return text;
}

function routeTextOf(route: HookRouteEdge): string {
  let text: string | undefined;
  assert.doesNotThrow(() => {
    text = hookRouteText(route);
  }, "hookRouteText does not throw");
  assert.ok(text !== undefined, "hookRouteText returns text");
  return text;
}

function ruleTextOf(rule: FlowRuleRow): string {
  let text: string | undefined;
  assert.doesNotThrow(() => {
    text = flowRuleText(rule);
  }, "flowRuleText does not throw");
  assert.ok(text !== undefined, "flowRuleText returns text");
  return text;
}

function pathsOf(
  edges: readonly HookRouteEdge[],
  layout: GraphLayout,
): { key: string; d: string; className: "hook-route" }[] {
  let paths: { key: string; d: string; className: "hook-route" }[] | undefined;
  assert.doesNotThrow(() => {
    paths = hookRoutePaths(edges, layout);
  }, "hookRoutePaths does not throw");
  assert.ok(paths !== undefined, "hookRoutePaths returns paths");
  return paths;
}

function deepFreeze(value: unknown): unknown {
  if (typeof value === "object" && value !== null) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function spyOn(doc: unknown): { value: unknown; reads: () => number } {
  const state = { reads: 0 };
  const value = new Proxy(doc as object, {
    get(target, key, receiver) {
      state.reads += 1;
      return Reflect.get(target, key, receiver);
    },
    has(target, key) {
      state.reads += 1;
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      state.reads += 1;
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, key) {
      state.reads += 1;
      return Reflect.getOwnPropertyDescriptor(target, key);
    },
  });
  return { value, reads: () => state.reads };
}

test("C-740bc49b hookOverlay badges routes rules and missing of HOOKED X3 and RULES", () => {
  const hooked = flowOf(DEMO_HOOKS, "DEMO_HOOKS");
  const x3 = flowOf(DEMO_X3, "DEMO_X3");
  const rules = rulesDoc();

  const hookedOverlay = overlayOf(hooked, layoutOf(hooked, "HOOKED"), "HOOKED");
  assert.deepEqual(hookedOverlay, {
    badges: [{ nodeId: "pay", pre: ["guard"], post: ["notify"] }],
    routes: [],
    rules: [],
    missing: [],
  });
  assert.equal(badgeTextOf(badgeAt(hookedOverlay, 0)), "pay: pre guard; post notify");

  const x3Overlay = overlayOf(x3, layoutOf(x3, "X3"), "X3");
  assert.deepEqual(x3Overlay, {
    badges: [{ nodeId: "classify", pre: [], post: ["rush"] }],
    routes: [{ from: "classify", to: "pay", hook: "rush" }],
    rules: [{ id: "audit", match: "kind code", pre: null, post: "rule.audit" }],
    missing: [],
  });
  assert.equal(badgeTextOf(badgeAt(x3Overlay, 0)), "classify: pre none; post rush");
  assert.equal(
    routeTextOf(routeAt(x3Overlay, 0)),
    "hook rush: classify may route to pay",
  );
  assert.equal(
    ruleTextOf(ruleAt(x3Overlay, 0)),
    "audit: match kind code; pre none; post rule.audit",
  );

  const rulesOverlay = overlayOf(rules, layoutOf(rules, "RULES"), "RULES");
  assert.deepEqual(rulesOverlay, {
    badges: [
      { nodeId: "a", pre: [], post: ["tidy", "tidy2"] },
      { nodeId: "b", pre: ["w"], post: [] },
    ],
    routes: [
      { from: "a", to: "b", hook: "tidy" },
      { from: "a", to: "a", hook: "tidy" },
      { from: "a", to: "b", hook: "tidy2" },
    ],
    rules: [
      {
        id: "audit",
        match: "kind block and effect pay, send",
        pre: "rule.audit",
        post: null,
      },
      { id: "all", match: "all nodes", pre: null, post: "rule.all" },
      {
        id: "named",
        match: "nodes a, b and tags t1",
        pre: "rule.named",
        post: "rule.named routes b, a",
      },
    ],
    missing: ["ghost"],
  });
  assert.equal(badgeTextOf(badgeAt(rulesOverlay, 0)), "a: pre none; post tidy, tidy2");
  assert.equal(badgeTextOf(badgeAt(rulesOverlay, 1)), "b: pre w; post none");
  assert.equal(
    routeTextOf(routeAt(rulesOverlay, 0)),
    "hook tidy: a may route to b",
  );
  assert.equal(
    routeTextOf(routeAt(rulesOverlay, 1)),
    "hook tidy: a may route to a",
  );
  assert.equal(
    ruleTextOf(ruleAt(rulesOverlay, 0)),
    "audit: match kind block and effect pay, send; pre rule.audit; post none",
  );
  assert.equal(
    ruleTextOf(ruleAt(rulesOverlay, 2)),
    "named: match nodes a, b and tags t1; pre rule.named; post rule.named routes b, a",
  );
  assert.equal(rulesOverlay.missing.filter((id) => id === "ghost").length, 1);
});

test("C-740bc49b hookRoutePaths of X3 and hookSectionView of the fixtures", () => {
  const hooked = flowOf(DEMO_HOOKS, "DEMO_HOOKS");
  const x3 = flowOf(DEMO_X3, "DEMO_X3");
  const rules = rulesDoc();
  const hookedLayout = layoutOf(hooked, "HOOKED");
  const x3Layout = layoutOf(x3, "X3");
  const rulesLayout = layoutOf(rules, "RULES");
  const x3Overlay = overlayOf(x3, x3Layout, "X3");

  assert.deepEqual(pathsOf(x3Overlay.routes, x3Layout), [
    { key: "classify>pay:rush", d: "M 112 168 L 112 328", className: "hook-route" },
  ]);
  assert.deepEqual(pathsOf(overlayOf(hooked, hookedLayout, "HOOKED").routes, hookedLayout), []);

  assert.deepEqual(sectionOf(hooked, hookedLayout, "HOOKED"), {
    hooks: ["pay: pre guard; post notify"],
    routes: [],
    rules: [],
    missing: null,
  });
  assert.deepEqual(sectionOf(x3, x3Layout, "X3"), {
    hooks: ["classify: pre none; post rush"],
    routes: ["hook rush: classify may route to pay"],
    rules: ["audit: match kind code; pre none; post rule.audit"],
    missing: null,
  });
  assert.deepEqual(sectionOf(rules, rulesLayout, "RULES"), {
    hooks: ["a: pre none; post tidy, tidy2", "b: pre w; post none"],
    routes: [
      "hook tidy: a may route to b",
      "hook tidy: a may route to a",
      "hook tidy2: a may route to b",
    ],
    rules: [
      "audit: match kind block and effect pay, send; pre rule.audit; post none",
      "all: match all nodes; pre none; post rule.all",
      "named: match nodes a, b and tags t1; pre rule.named; post rule.named routes b, a",
    ],
    missing: "Hook routes name nodes that do not exist: ghost.",
  });
  assert.deepEqual(sectionOf(null, hookedLayout, "null document"), {
    hooks: [],
    routes: [],
    rules: [],
    missing: null,
  });
});

test("C-67dea741 hookOverlay of odd documents and limits", () => {
  const rules = rulesDoc();
  const rulesLayout = layoutOf(rules, "RULES");
  const empty = { badges: [], routes: [], rules: [], missing: [] };

  assert.deepEqual(overlayOf(null, rulesLayout, "null"), empty);
  assert.deepEqual(overlayOf({ nodes: 5, hooks: "x" }, rulesLayout, "odd"), empty);

  const frozen = deepFreeze(rulesDoc());
  const before = structuredClone(frozen);
  const frozenOverlay = overlayOf(frozen, rulesLayout, "frozen RULES");
  assert.deepEqual(frozen, before);
  assert.equal(frozenOverlay.badges.length, 2);
  assert.deepEqual(frozenOverlay.missing, ["ghost"]);

  const large = largeDoc();
  const largeOverlay = overlayOf(large, layoutOf(large, "large"), "large");
  const expectedHooks = Array.from({ length: 16 }, (_, index) => `h${index + 1}`);
  assert.deepEqual(badgeAt(largeOverlay, 0), {
    nodeId: "a",
    pre: expectedHooks,
    post: [],
  });
  assert.equal(largeOverlay.rules.length, 16);
  assert.equal(ruleAt(largeOverlay, 0).id, `${"r".repeat(63)}…`);

  const hooked = flowOf(DEMO_HOOKS, "DEMO_HOOKS");
  const x3 = flowOf(DEMO_X3, "DEMO_X3");
  const stripped = structuredClone(hooked) as Record<string, unknown>;
  const strippedNodes = stripped["nodes"] as Record<string, Record<string, unknown>>;
  for (const node of Object.values(strippedNodes)) {
    delete node["pre"];
    delete node["post"];
  }

  assert.deepEqual(layoutOf(hooked, "HOOKED"), layoutOf(stripped, "stripped"));
  assert.equal(
    graphView(hooked, true).message,
    "Flow graph: 6 nodes, 5 edges, 5 layers.",
  );
  assert.equal(graphView(x3, true).message, "Flow graph: 5 nodes, 4 edges, 5 layers.");
});

test("C-67dea741 hookRoutePaths skips self routes and routes to unknown nodes", () => {
  const rules = rulesDoc();
  const rulesLayout = layoutOf(rules, "RULES");
  assert.deepEqual(
    pathsOf(
      [
        { from: "a", to: "a", hook: "t" },
        { from: "a", to: "zz", hook: "t" },
      ],
      rulesLayout,
    ),
    [],
  );
});

test("C-67dea741 hookSectionView skips a document without a layout", () => {
  const hooked = flowOf(DEMO_HOOKS, "DEMO_HOOKS");

  const nodes: Record<string, unknown> = {};
  for (let index = 0; index < 201; index += 1) {
    nodes[`n${index}`] = { kind: "end" };
  }
  nodes["n0"] = {
    kind: "block",
    next: "n1",
    post: [{ id: "h", kind: "code", source: "x", routes: ["n1"] }],
  };
  const doc201 = {
    start: "n0",
    nodes,
    hooks: [{ id: "r", post: { kind: "code", source: "x" } }],
  };

  const large = layoutFlow(doc201);
  assert.equal(large.status, "too_large");
  assert.deepEqual(large, { status: "too_large", count: 201, limit: 200 });
  const largeView = graphView(doc201, true);
  assert.equal(largeView.state, "too_large");
  assert.equal(largeView.layout, null);
  const largeSpy = spyOn(doc201);
  assert.equal(sectionOf(largeSpy.value, largeView.layout, "DOC201"), null);
  assert.equal(largeSpy.reads(), 0);

  const small = { start: "a", nodes: { a: { kind: "end" } } };
  const smallLayout = graphView(small, true).layout;
  assert.ok(smallLayout !== null);
  const smallSpy = spyOn(small);
  assert.deepEqual(sectionOf(smallSpy.value, smallLayout, "SMALL"), {
    hooks: [],
    routes: [],
    rules: [],
    missing: null,
  });
  assert.ok(smallSpy.reads() > 0);

  const nullLayouts = [
    graphView(hooked, false).layout,
    graphView(null, true).layout,
    graphView({ nodes: {} }, true).layout,
  ];
  for (const layout of nullLayouts) {
    assert.equal(layout, null);
    assert.equal(sectionOf(hooked, layout, "hooked without layout"), null);
  }
});
