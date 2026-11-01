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

function hookEdges(result: TaintAnalysis): TaintEdge[] {
  return result.edges.filter((edge) => edge.hook !== null);
}

const hookSample = {
  nodes: {
    fetch: {
      kind: "block",
      uses: "invoices.get@1",
      with: { id: "${{ inputs.id }}" },
      post: [
        {
          id: "tell",
          kind: "block",
          uses: "mail.send@1",
          with: {
            text: "${{ hook.output.raw_text }}",
            id: "${{ hook.output.id }}",
            who: "${{ hook.node.id }}",
          },
        },
      ],
    },
    ex: {
      kind: "llm.extract",
      input: { t: "${{ nodes.fetch.output.raw_text }}" },
      post: [{ id: "tidy", kind: "code", source: "return" }],
    },
    ex2: {
      kind: "llm.extract",
      input: { t: "${{ nodes.fetch.output.raw_text }}" },
      pre: [
        {
          id: "note",
          kind: "block",
          uses: "mail.send@1",
          with: { z: "${{ hook.input.t }}" },
        },
      ],
    },
    lk: {
      kind: "block",
      uses: "erp.lookup_vendor@1",
      with: { v: "${{ inputs.v }}" },
    },
    pay: {
      kind: "block",
      uses: "erp.create_payment@1",
      with: { a: "${{ inputs.a }}" },
    },
    done: { kind: "end" },
  },
  hooks: [
    {
      id: "guard",
      match: { effect: ["pay"] },
      pre: {
        id: "g",
        kind: "code",
        input: { raw: "${{ nodes.fetch.output.raw_text }}" },
        source: "return",
      },
    },
    {
      id: "audit",
      match: { kind: ["end"] },
      pre: {
        id: "a",
        kind: "block",
        uses: "mail.send@1",
        with: {
          v: "${{ nodes.fetch.output.raw_text }}",
          s: "${{ hook.input.x }}",
        },
      },
    },
    {
      id: "idle",
      match: { nodes: ["nope"] },
      post: {
        id: "i",
        kind: "code",
        input: { raw: "${{ nodes.fetch.output.raw_text }}" },
        source: "return",
      },
    },
  ],
} as unknown as Flow;

test("C-be8bdbfa Hook references widening and flow rules", () => {
  const result = analyze(hookSample);

  assert.deepEqual(nodeAt(result, "ex"), {
    input: ["untrusted"],
    output: ["extracted", "untrusted"],
    fields: {},
  });
  assert.deepEqual(nodeAt(result, "ex2"), {
    input: ["untrusted"],
    output: ["extracted"],
    fields: {},
  });
  assert.deepEqual(nodeAt(result, "pay"), {
    input: ["untrusted"],
    output: ["untrusted"],
    fields: {},
  });
  assert.deepEqual(nodeAt(result, "fetch"), {
    input: [],
    output: [],
    fields: { raw_text: ["untrusted"], vendor_name: ["untrusted"] },
  });
  for (const id of ["lk", "done"]) {
    assert.deepEqual(nodeAt(result, id), { input: [], output: [], fields: {} }, id);
  }

  assert.equal(result.edges.length, 12);

  const edges = hookEdges(result);
  assert.deepEqual(
    edges.map((edge) => ({
      to: edge.to,
      path: edge.path,
      ref: edge.ref,
      from: edge.from,
      taint: edge.taint,
      hook: edge.hook,
    })),
    [
      {
        to: "done",
        path: "/hooks/1/pre/with/v",
        ref: "nodes.fetch.output.raw_text",
        from: "fetch",
        taint: ["untrusted"],
        hook: "a",
      },
      {
        to: "done",
        path: "/hooks/1/pre/with/s",
        ref: "hook.input.x",
        from: null,
        taint: [],
        hook: "a",
      },
      {
        to: "ex2",
        path: "/nodes/ex2/pre/0/with/z",
        ref: "hook.input.t",
        from: null,
        taint: ["untrusted"],
        hook: "note",
      },
      {
        to: "fetch",
        path: "/nodes/fetch/post/0/with/text",
        ref: "hook.output.raw_text",
        from: "fetch",
        taint: ["untrusted"],
        hook: "tell",
      },
      {
        to: "fetch",
        path: "/nodes/fetch/post/0/with/id",
        ref: "hook.output.id",
        from: "fetch",
        taint: [],
        hook: "tell",
      },
      {
        to: "fetch",
        path: "/nodes/fetch/post/0/with/who",
        ref: "hook.node.id",
        from: null,
        taint: [],
        hook: "tell",
      },
      {
        to: "pay",
        path: "/hooks/0/pre/input/raw",
        ref: "nodes.fetch.output.raw_text",
        from: "fetch",
        taint: ["untrusted"],
        hook: "g",
      },
    ],
  );
  assert.ok(
    edges.every((edge) => edge.resolved),
    "every hook edge is resolved",
  );
});

const malformedNodeHooks = {
  nodes: {
    a: { kind: "code", input: {}, pre: "oops" },
    b: { kind: "llm.extract", input: {}, post: [5] },
    c: { kind: "llm.decide", input: {}, post: [{ id: "h", kind: "mystery" }] },
    w: { kind: "code", input: {} },
  },
} as unknown as Flow;

const malformedMatchRule = {
  id: "r",
  match: { kind: "code" },
  pre: {
    id: "p",
    kind: "code",
    input: { r: "${{ nodes.src.output.raw_text }}" },
    source: "x",
  },
};

const malformedMatchFlow = {
  nodes: {
    src: { kind: "block", uses: "invoices.get@1", with: {} },
    z: { kind: "code", input: {} },
    y: { kind: "end" },
  },
  hooks: [malformedMatchRule],
} as unknown as Flow;

const selectorMatchFlow = {
  nodes: {
    src: { kind: "block", uses: "invoices.get@1", with: {} },
    z: { kind: "code", input: {} },
    y: { kind: "end" },
  },
  hooks: [{ ...malformedMatchRule, match: { kind: ["code"] } }],
} as unknown as Flow;

const malformedHooksField = {
  nodes: { w: { kind: "code", input: {} } },
  hooks: "oops",
} as unknown as Flow;

test("C-218f2fa6 Malformed hook structures fail closed", () => {
  const nodeHooks = analyze(malformedNodeHooks);
  assert.deepEqual(nodeAt(nodeHooks, "a"), {
    input: ["untrusted"],
    output: ["untrusted"],
    fields: {},
  });
  assert.deepEqual(nodeAt(nodeHooks, "b"), {
    input: ["untrusted"],
    output: ["extracted", "untrusted"],
    fields: {},
  });
  assert.deepEqual(nodeAt(nodeHooks, "c"), {
    input: ["untrusted"],
    output: ["untrusted"],
    fields: { outcome: [] },
  });
  assert.deepEqual(nodeAt(nodeHooks, "w"), { input: [], output: [], fields: {} });
  assert.deepEqual(nodeHooks.edges, []);

  const malformedMatch = analyze(malformedMatchFlow);
  assert.deepEqual(nodeAt(malformedMatch, "y").input, ["untrusted"]);
  assert.deepEqual(nodeAt(malformedMatch, "z").input, ["untrusted"]);
  assert.deepEqual(nodeAt(malformedMatch, "src").input, ["untrusted"]);

  const selectorMatch = analyze(selectorMatchFlow);
  assert.deepEqual(nodeAt(selectorMatch, "z").input, ["untrusted"]);
  assert.deepEqual(nodeAt(selectorMatch, "y").input, []);
  assert.deepEqual(nodeAt(selectorMatch, "src").input, []);

  const malformedField = analyze(malformedHooksField);
  assert.deepEqual(nodeAt(malformedField, "w").input, ["untrusted"]);
  assert.deepEqual(nodeAt(malformedField, "w").output, ["untrusted"]);
});
