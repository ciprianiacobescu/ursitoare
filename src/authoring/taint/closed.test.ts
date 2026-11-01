import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  BlockDef,
  Catalogue,
  DelegateTargetDef,
  Effect,
  Flow,
} from "../format/index.ts";
import { emptyCatalogue } from "../format/index.ts";
import type { NodeTaint, TaintAnalysis, TaintEdge } from "./index.ts";
import { TAINT_LIMITS, TaintError, analyzeTaint } from "./index.ts";

function block(effect: Effect, extra: Partial<Omit<BlockDef, "effect">> = {}): BlockDef {
  return { effect, input: {}, output: {}, ...extra };
}

const C: Catalogue = {
  ...emptyCatalogue,
  block(ref: string): BlockDef | undefined {
    switch (ref) {
      case "invoices.get@1":
        return block("read", { untrusted_fields: ["raw_text", "vendor_name"] });
      case "erp.lookup_vendor@1":
        return block("read", { data_class: "private" });
      case "erp.create_payment@1":
        return block("pay");
      case "mail.send@1":
        return block("send");
      case "http.get@1":
        return block("read", { untrusted_result: true, data_class: "public" });
      case "docs.fetch@1":
        return block("read", { data_class: "public" });
      case "kb.search@1":
        return block("read");
      case "crm.update@1":
        return block("write", { untrusted_fields: ["notes"] });
      default:
        return undefined;
    }
  },
  delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined {
    if (target === "n8n" && workflow === "archive-invoice") {
      return { effect: "send", untrusted_result: true };
    }
    if (target === "n8n" && workflow === "calc") {
      return { effect: "read", untrusted_result: false };
    }
    return undefined;
  },
};

function analyze(flow: Flow, catalogue: Catalogue = C): TaintAnalysis {
  let result: TaintAnalysis = { nodes: {}, edges: [] };
  assert.doesNotThrow(() => {
    result = analyzeTaint(flow, catalogue);
  });
  return result;
}

function capture(run: () => void): unknown {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  return caught;
}

function nodeAt(result: TaintAnalysis, id: string): NodeTaint {
  const node = result.nodes[id];
  assert.ok(node !== undefined, `node ${id} exists`);
  return node;
}

function edgeByRef(result: TaintAnalysis, ref: string): TaintEdge {
  const edge = result.edges.find((candidate) => candidate.ref === ref);
  assert.ok(edge !== undefined, `edge for ${ref} exists`);
  return edge;
}

const closedFlow = {
  nodes: {
    u: { kind: "block", uses: "nope@1", with: { a: "${{ inputs.a }}" } },
    d: {
      kind: "code",
      input: {
        a: "${{ nodes.ghost.output.x }}",
        b: "${{ item.x }}",
        c: "${{ nope }}",
        d: "${{ inputs.ok }}",
      },
    },
    k: { kind: "mystery" },
    n: 5,
    c: { kind: "code", input: { a: "${{ nodes.u.output.x }}" } },
    m: { kind: "block", uses: "mail.send@1", with: { a: "plain ${{ inputs.a }}" } },
    x: { kind: "delegate", target: "n8n", workflow: "zzz", with: {} },
    fetch: { kind: "block", uses: "invoices.get@1", with: {} },
    e: { kind: "code", input: { a: "${{ nodes.fetch.output }}" } },
  },
} as unknown as Flow;

test("C-96450187 unknown and malformed input fails closed", () => {
  const result = analyze(closedFlow);

  for (const id of ["u", "k", "n", "x"]) {
    assert.deepEqual(nodeAt(result, id).input, [], `${id} input`);
    assert.deepEqual(nodeAt(result, id).output, ["untrusted"], `${id} output`);
  }
  for (const id of ["d", "c", "e"]) {
    assert.deepEqual(nodeAt(result, id).input, ["untrusted"], `${id} input`);
    assert.deepEqual(nodeAt(result, id).output, ["untrusted"], `${id} output`);
  }
  assert.deepEqual(nodeAt(result, "m"), { input: [], output: [], fields: {} });
  assert.deepEqual(nodeAt(result, "fetch"), {
    input: [],
    output: [],
    fields: { raw_text: ["untrusted"], vendor_name: ["untrusted"] },
  });

  assert.deepEqual(edgeByRef(result, "${{ nodes.fetch.output }}"), {
    to: "e",
    path: "/nodes/e/input/a",
    ref: "${{ nodes.fetch.output }}",
    from: null,
    taint: ["untrusted"],
    resolved: false,
    hook: null,
  });

  assert.deepEqual(edgeByRef(result, "nodes.ghost.output.x"), {
    to: "d",
    path: "/nodes/d/input/a",
    ref: "nodes.ghost.output.x",
    from: null,
    taint: ["untrusted"],
    resolved: false,
    hook: null,
  });
  assert.deepEqual(edgeByRef(result, "item.x"), {
    to: "d",
    path: "/nodes/d/input/b",
    ref: "item.x",
    from: null,
    taint: ["untrusted"],
    resolved: false,
    hook: null,
  });
  assert.deepEqual(edgeByRef(result, "${{ nope }}"), {
    to: "d",
    path: "/nodes/d/input/c",
    ref: "${{ nope }}",
    from: null,
    taint: ["untrusted"],
    resolved: false,
    hook: null,
  });
  assert.deepEqual(edgeByRef(result, "inputs.ok"), {
    to: "d",
    path: "/nodes/d/input/d",
    ref: "inputs.ok",
    from: null,
    taint: [],
    resolved: true,
    hook: null,
  });

  assert.deepEqual(analyze({ nodes: [] } as unknown as Flow), { nodes: {}, edges: [] });

  const parsed = JSON.parse(
    '{"nodes":{"__proto__":{"kind":"end"},"a":{"kind":"end"}}}',
  ) as Flow;
  const protoResult = analyze(parsed);
  assert.deepEqual(Object.keys(protoResult.nodes), ["__proto__", "a"]);
  assert.equal(Object.hasOwn(protoResult.nodes, "__proto__"), true);

  const thrown = new Error("boom");
  const throwingCatalogue: Catalogue = {
    ...emptyCatalogue,
    block(): BlockDef | undefined {
      throw thrown;
    },
  };
  const caught = capture(() => {
    analyzeTaint({ nodes: { only: { kind: "block", uses: "a@1", with: {} } } } as unknown as Flow, throwingCatalogue);
  });
  assert.equal(caught, thrown);
});

function endNodes(count: number): { [id: string]: unknown } {
  const nodes: { [id: string]: unknown } = {};
  for (let i = 0; i < count; i += 1) {
    nodes[`n${String(i).padStart(4, "0")}`] = { kind: "end" };
  }
  return nodes;
}

function rule(id: string, withValue: { [name: string]: string } = {}): unknown {
  return { id, match: {}, pre: { id: `${id}p`, kind: "block", uses: "mail.send@1", with: withValue } };
}

test("C-0309b412 size limits", () => {
  const tooManyNodes = capture(() => {
    analyzeTaint({ nodes: endNodes(5001) } as unknown as Flow, C);
  });
  assert.ok(tooManyNodes instanceof TaintError, "5001 nodes throws TaintError");
  assert.equal(tooManyNodes.code, "TAINT_TOO_LARGE");
  assert.equal(tooManyNodes.message, "taint analysis limit exceeded: nodes 5001 > 5000");

  const tooManyPairs = capture(() => {
    const hooks = Array.from({ length: 41 }, (_, i) => rule(`r${i}`));
    analyzeTaint({ nodes: endNodes(5000), hooks } as unknown as Flow, C);
  });
  assert.ok(tooManyPairs instanceof TaintError, "205000 hook pairs throws TaintError");
  assert.equal(tooManyPairs.code, "TAINT_TOO_LARGE");
  assert.equal(tooManyPairs.message, "taint analysis limit exceeded: hook pairs 205000 > 200000");

  const tooManyEdges = capture(() => {
    const hooks = [rule("r", { r: "${{ inputs.a }}".repeat(101) })];
    analyzeTaint({ nodes: endNodes(1000), hooks } as unknown as Flow, C);
  });
  assert.ok(tooManyEdges instanceof TaintError, "101000 edges throws TaintError");
  assert.equal(tooManyEdges.code, "TAINT_TOO_LARGE");
  assert.equal(tooManyEdges.message, "taint analysis limit exceeded: edges 101000 > 100000");

  const noRules = analyze({ nodes: endNodes(5000) } as unknown as Flow);
  assert.deepEqual(noRules.edges, []);

  const fortyRules = analyze({
    nodes: endNodes(5000),
    hooks: Array.from({ length: 40 }, (_, i) => rule(`r${i}`)),
  } as unknown as Flow);
  assert.deepEqual(fortyRules.edges, []);

  const atEdgeLimit = analyze({
    nodes: endNodes(1000),
    hooks: [rule("r", { r: "${{ inputs.a }}".repeat(100) })],
  } as unknown as Flow);
  assert.equal(atEdgeLimit.edges.length, 100000);

  assert.deepEqual(TAINT_LIMITS, {
    maxNodes: 5000,
    maxHookPairs: 200000,
    maxEdges: 100000,
  });
  assert.equal(Object.isFrozen(TAINT_LIMITS), true);
});
