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

const rf1 = {
  nodes: {
    fetch_invoice: {
      kind: "block",
      uses: "invoices.get@1",
      with: { invoice_id: "${{ inputs.invoice_id }}" },
    },
    extract: {
      kind: "llm.extract",
      input: { text: "${{ nodes.fetch_invoice.output.raw_text }}" },
    },
    lookup_vendor: {
      kind: "block",
      uses: "erp.lookup_vendor@1",
      with: { vendor_name: "${{ nodes.extract.output.vendor_name }}" },
    },
    normalize: {
      kind: "code",
      input: {
        amount: "${{ nodes.extract.output.amount }}",
        currency: "${{ nodes.extract.output.currency }}",
      },
    },
    classify: {
      kind: "llm.decide",
      input: {
        vendor_status: "${{ nodes.lookup_vendor.output.status }}",
        amount: "${{ nodes.normalize.output.amount }}",
        is_large: "${{ nodes.normalize.output.is_large }}",
      },
    },
    approval: {
      kind: "human.approval",
      summary:
        "Approve ${{ nodes.normalize.output.amount }} ${{ nodes.normalize.output.currency }} to ${{ nodes.extract.output.vendor_name }}?",
    },
    pay: {
      kind: "block",
      uses: "erp.create_payment@1",
      with: {
        vendor_id: "${{ nodes.lookup_vendor.output.vendor_id }}",
        amount: "${{ nodes.normalize.output.amount }}",
        currency: "${{ nodes.normalize.output.currency }}",
        reference: "${{ inputs.invoice_id }}",
      },
    },
    archive: {
      kind: "delegate",
      target: "n8n",
      workflow: "archive-invoice",
      with: {
        invoice_id: "${{ inputs.invoice_id }}",
        payment_id: "${{ nodes.pay.output.payment_id }}",
      },
    },
    notify_rejection: {
      kind: "block",
      uses: "mail.send@1",
      with: {
        to: "ap@example.com",
        subject: "Invoice ${{ inputs.invoice_id }} rejected",
        body: "Rejected.",
      },
    },
    done: {
      kind: "end",
      status: "completed",
      output: { payment_id: "${{ nodes.pay.output.payment_id }}" },
    },
    rejected: { kind: "end", status: "failed" },
  },
} as unknown as Flow;

test("C-feb77bd3 RF-1 labels and edges", () => {
  const result = analyze(rf1);

  assert.deepEqual(nodeAt(result, "fetch_invoice"), {
    input: [],
    output: [],
    fields: { raw_text: ["untrusted"], vendor_name: ["untrusted"] },
  });
  assert.deepEqual(nodeAt(result, "extract"), {
    input: ["untrusted"],
    output: ["extracted"],
    fields: {},
  });
  for (const id of ["lookup_vendor", "normalize", "approval", "pay"]) {
    assert.deepEqual(
      nodeAt(result, id),
      { input: ["extracted"], output: ["extracted"], fields: {} },
      id,
    );
  }
  assert.deepEqual(nodeAt(result, "classify"), {
    input: ["extracted"],
    output: ["extracted"],
    fields: { outcome: [] },
  });
  assert.deepEqual(nodeAt(result, "archive"), {
    input: ["extracted"],
    output: ["extracted", "untrusted"],
    fields: {},
  });
  assert.deepEqual(nodeAt(result, "notify_rejection"), {
    input: [],
    output: [],
    fields: {},
  });
  assert.deepEqual(nodeAt(result, "done"), {
    input: ["extracted"],
    output: ["extracted"],
    fields: {},
  });
  assert.deepEqual(nodeAt(result, "rejected"), { input: [], output: [], fields: {} });

  assert.equal(result.edges.length, 19);
  assert.deepEqual(
    result.edges.map((edge) => edge.to),
    [
      "approval",
      "approval",
      "approval",
      "archive",
      "archive",
      "classify",
      "classify",
      "classify",
      "done",
      "extract",
      "fetch_invoice",
      "lookup_vendor",
      "normalize",
      "normalize",
      "notify_rejection",
      "pay",
      "pay",
      "pay",
      "pay",
    ],
  );

  assert.deepEqual(edgeAt(result, "/nodes/pay/with/amount"), {
    to: "pay",
    path: "/nodes/pay/with/amount",
    ref: "nodes.normalize.output.amount",
    from: "normalize",
    taint: ["extracted"],
    resolved: true,
    hook: null,
  });

  const extractText = edgeAt(result, "/nodes/extract/input/text");
  assert.equal(extractText.from, "fetch_invoice");
  assert.deepEqual(extractText.taint, ["untrusted"]);

  const invoiceId = edgeAt(result, "/nodes/fetch_invoice/with/invoice_id");
  assert.equal(invoiceId.ref, "inputs.invoice_id");
  assert.equal(invoiceId.from, null);
  assert.deepEqual(invoiceId.taint, []);
});

test("C-7e5f540a Code does not launder and fields are precise", () => {
  const flow = {
    nodes: {
      fetch: {
        kind: "block",
        uses: "invoices.get@1",
        with: { id: "${{ inputs.id }}" },
      },
      c: {
        kind: "code",
        input: { t: "${{ nodes.fetch.output.raw_text }}" },
      },
      ids: {
        kind: "code",
        input: { i: "${{ nodes.fetch.output.invoice_id }}" },
      },
      x: {
        kind: "llm.extract",
        input: { t: "${{ nodes.fetch.output.raw_text }}" },
      },
      t: { kind: "llm.extract", input: {} },
      g: {
        kind: "llm.generate",
        input: {
          a: "${{ nodes.x.output.s }}",
          b: "${{ nodes.fetch.output.vendor_name }}",
        },
      },
      m: {
        kind: "block",
        uses: "mail.send@1",
        with: { body: "${{ nodes.c.output.t }}" },
      },
    },
  } as unknown as Flow;

  const result = analyze(flow);

  assert.deepEqual(nodeAt(result, "c").output, ["untrusted"]);
  assert.deepEqual(nodeAt(result, "ids").output, []);
  assert.deepEqual(nodeAt(result, "x").output, ["extracted"]);
  assert.deepEqual(nodeAt(result, "t").output, ["extracted"]);
  assert.deepEqual(nodeAt(result, "g").output, ["extracted", "untrusted"]);
  assert.deepEqual(nodeAt(result, "m").input, ["untrusted"]);

  const body = edgeAt(result, "/nodes/m/with/body");
  assert.equal(body.from, "c");
  assert.deepEqual(body.taint, ["untrusted"]);

  assert.deepEqual(edgeAt(result, "/nodes/ids/input/i").taint, []);
});

const cycleRule = {
  id: "r",
  match: {},
  post: { id: "h", kind: "block", uses: "mail.send@1", with: {} },
};

const cycleNodes = {
  a: { kind: "code", input: { x: "${{ nodes.b.output.y }}" } },
  b: {
    kind: "code",
    input: {
      y: "${{ nodes.a.output.x }}",
      z: "${{ nodes.src.output.raw_text }}",
    },
  },
  src: { kind: "block", uses: "invoices.get@1", with: {} },
  p: { kind: "llm.extract", input: { x: "${{ nodes.q.output.y }}" } },
  q: {
    kind: "code",
    input: {
      y: "${{ nodes.p.output.x }}",
      z: "${{ nodes.src.output.raw_text }}",
    },
  },
  s1: { kind: "code", input: { x: "${{ nodes.s1.output.x }}" } },
  s2: {
    kind: "code",
    input: {
      x: "${{ nodes.s2.output.x }}",
      y: "${{ nodes.src.output.raw_text }}",
    },
  },
};

test("C-382d778d Cycles self-references and order", () => {
  const forward = { nodes: cycleNodes, hooks: [cycleRule] } as unknown as Flow;
  const reverseNodes = Object.fromEntries(Object.entries(cycleNodes).reverse());
  const reverse = { nodes: reverseNodes, hooks: [cycleRule] } as unknown as Flow;

  const forwardResult = analyze(forward);
  const reverseResult = analyze(reverse);

  assert.equal(JSON.stringify(forwardResult), JSON.stringify(reverseResult));

  for (const id of ["a", "b", "s2"]) {
    assert.deepEqual(nodeAt(forwardResult, id).input, ["untrusted"], `${id} input`);
    assert.deepEqual(nodeAt(forwardResult, id).output, ["untrusted"], `${id} output`);
  }
  assert.deepEqual(nodeAt(forwardResult, "p").input, ["extracted", "untrusted"]);
  assert.deepEqual(nodeAt(forwardResult, "p").output, ["extracted"]);
  assert.deepEqual(nodeAt(forwardResult, "q").input, ["extracted", "untrusted"]);
  assert.deepEqual(nodeAt(forwardResult, "q").output, ["extracted", "untrusted"]);
  assert.deepEqual(nodeAt(forwardResult, "s1").input, []);
  assert.deepEqual(nodeAt(forwardResult, "s1").output, []);

  assert.deepEqual(Object.keys(forwardResult.nodes), Object.keys(cycleNodes).sort());
});
