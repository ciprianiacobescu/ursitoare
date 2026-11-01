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
import { analyzeTaint } from "./index.ts";

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

function nodeAt(result: TaintAnalysis, id: string): NodeTaint {
  const node = result.nodes[id];
  assert.ok(node !== undefined, `node ${id} exists`);
  return node;
}

function edgeAt(result: TaintAnalysis, path: string): TaintEdge {
  const edge = result.edges.find((candidate) => candidate.path === path);
  assert.ok(edge !== undefined, `edge ${path} exists`);
  return edge;
}

const sources = {
  nodes: {
    h: { kind: "block", uses: "http.get@1", with: {} },
    w: { kind: "block", uses: "crm.update@1", with: { id: "${{ inputs.id }}" } },
    ag: { kind: "agent", input: {}, tools: ["kb.search@1", "http.get@1"] },
    ag2: { kind: "agent", input: {}, tools: ["kb.search@1"] },
    sf: { kind: "subflow", flow: "f@1", with: {} },
    d1: { kind: "delegate", target: "n8n", workflow: "archive-invoice", with: {} },
    d2: { kind: "delegate", target: "n8n", workflow: "calc", with: {} },
    d3: { kind: "delegate", target: "n8n", workflow: "zzz", with: {} },
    fe1: {
      kind: "foreach",
      uses: "kb.search@1",
      items: "${{ nodes.h.output.rows }}",
      with: { q: "${{ item.name }}" },
    },
    fe2: {
      kind: "foreach",
      uses: "kb.search@1",
      items: "${{ inputs.rows }}",
      with: { q: "${{ item.name }}" },
    },
    fe3: {
      kind: "foreach",
      items: "${{ inputs.rows }}",
      subflow: "f@1",
      with: {},
    },
    dec: { kind: "llm.decide", input: { a: "${{ nodes.h.output.body }}" } },
    use: {
      kind: "code",
      input: {
        o: "${{ nodes.dec.outcome }}",
        r: "${{ nodes.dec.output.rationale }}",
        p: "${{ nodes.dec.output.outcome }}",
      },
    },
    ap: { kind: "human.approval", summary: "${{ nodes.h.output.body }}" },
    after: { kind: "code", input: { o: "${{ nodes.ap.outcome }}" } },
  },
} as unknown as Flow;

test("C-9543ab61 sources of untrusted data and the closed outcome", () => {
  const result = analyze(sources);

  for (const id of ["h", "ag", "sf", "d1", "d3", "fe1", "fe3", "dec", "ap"]) {
    assert.deepEqual(nodeAt(result, id).output, ["untrusted"], `${id} output`);
  }
  for (const id of ["w", "ag2", "d2", "fe2", "after"]) {
    assert.deepEqual(nodeAt(result, id).output, [], `${id} output`);
  }

  assert.deepEqual(nodeAt(result, "w").fields, { notes: ["untrusted"] });
  assert.deepEqual(nodeAt(result, "dec").fields, { outcome: [] });

  assert.deepEqual(edgeAt(result, "/nodes/use/input/o").taint, []);
  assert.deepEqual(edgeAt(result, "/nodes/use/input/p").taint, []);
  assert.deepEqual(edgeAt(result, "/nodes/use/input/r").taint, ["untrusted"]);

  const fe1 = edgeAt(result, "/nodes/fe1/with/q");
  assert.equal(fe1.ref, "item.name");
  assert.deepEqual(fe1.taint, ["untrusted"]);
  assert.equal(fe1.resolved, true);
  assert.deepEqual(edgeAt(result, "/nodes/fe2/with/q").taint, []);

  assert.deepEqual(nodeAt(result, "after").input, []);
});

const contexts = {
  nodes: {
    a: {
      kind: "llm.extract",
      input: {},
      context: [{ source: "retr://a", tier: "unreviewed" }],
    },
    b: {
      kind: "llm.generate",
      input: {},
      context: [
        { source: "retr://b1", tier: "approved" },
        { source: "retr://b2", tier: "unreviewed" },
      ],
    },
    c: {
      kind: "llm.generate",
      input: {},
      context: [{ source: "retr://c", tier: "approved" }],
    },
    d: {
      kind: "llm.generate",
      input: {},
      context: [{ source: "retr://d" }],
    },
  },
} as unknown as Flow;

test("C-6b3829ee context sources are untrusted unless approved", () => {
  const result = analyze(contexts);

  assert.deepEqual(nodeAt(result, "a").input, ["untrusted"]);
  assert.deepEqual(nodeAt(result, "a").output, ["extracted"]);
  assert.deepEqual(nodeAt(result, "b").input, ["untrusted"]);
  assert.deepEqual(nodeAt(result, "b").output, ["untrusted"]);
  assert.deepEqual(nodeAt(result, "c").input, []);
  assert.deepEqual(nodeAt(result, "c").output, []);
  assert.deepEqual(nodeAt(result, "d").input, ["untrusted"]);
  assert.deepEqual(nodeAt(result, "d").output, ["untrusted"]);
});
