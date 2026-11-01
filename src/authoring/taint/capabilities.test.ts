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
import type {
  CapabilityEvidence,
  CapabilitySite,
  FlowCapabilities,
} from "./index.ts";
import { capabilityEvidence, flowCapabilities } from "./index.ts";

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

function evidence(flow: Flow, catalogue: Catalogue = C): CapabilityEvidence {
  let result: CapabilityEvidence = {
    reads_untrusted: [],
    reads_private: [],
    has_send_or_pay: [],
    unknown: [],
  };
  assert.doesNotThrow(() => {
    result = capabilityEvidence(flow, catalogue);
  });
  return result;
}

function capabilities(flow: Flow, catalogue: Catalogue = C): FlowCapabilities {
  let result: FlowCapabilities = {
    reads_untrusted: false,
    reads_private: false,
    has_send_or_pay: false,
  };
  assert.doesNotThrow(() => {
    result = flowCapabilities(flow, catalogue);
  });
  return result;
}

function site(at: string, tool: string): CapabilitySite {
  return { at, tool };
}

function oneNode(node: unknown): Flow {
  return { nodes: { a: node } } as unknown as Flow;
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

test("C-6792eb26 RF-1 and one-block flags", () => {
  assert.deepEqual(evidence(rf1), {
    reads_untrusted: [
      site("/nodes/archive/target", "n8n:archive-invoice"),
      site("/nodes/fetch_invoice/uses", "invoices.get@1"),
    ],
    reads_private: [
      site("/nodes/fetch_invoice/uses", "invoices.get@1"),
      site("/nodes/lookup_vendor/uses", "erp.lookup_vendor@1"),
    ],
    has_send_or_pay: [
      site("/nodes/archive/target", "n8n:archive-invoice"),
      site("/nodes/notify_rejection/uses", "mail.send@1"),
      site("/nodes/pay/uses", "erp.create_payment@1"),
    ],
    unknown: [],
  });

  assert.deepEqual(capabilities(rf1), {
    reads_untrusted: true,
    reads_private: true,
    has_send_or_pay: true,
  });

  const oneBlockFlags: Array<[string, [boolean, boolean, boolean]]> = [
    ["docs.fetch@1", [false, false, false]],
    ["kb.search@1", [false, true, false]],
    ["crm.update@1", [true, false, false]],
    ["http.get@1", [true, false, false]],
    ["mail.send@1", [false, false, true]],
    ["erp.create_payment@1", [false, false, true]],
  ];
  for (const [uses, expected] of oneBlockFlags) {
    const flags = capabilities(oneNode({ kind: "block", uses, with: {} }));
    assert.deepEqual(
      [flags.reads_untrusted, flags.reads_private, flags.has_send_or_pay],
      expected,
      uses,
    );
  }

  const calc = capabilities(
    oneNode({ kind: "delegate", target: "n8n", workflow: "calc", with: {} }),
  );
  assert.deepEqual(
    [calc.reads_untrusted, calc.reads_private, calc.has_send_or_pay],
    [false, false, false],
  );

  assert.deepEqual(capabilities({ nodes: {} } as unknown as Flow), {
    reads_untrusted: false,
    reads_private: false,
    has_send_or_pay: false,
  });
});

const mixed = {
  nodes: {
    s: { kind: "subflow", flow: "f@1", with: {} },
    l: {
      kind: "llm.decide",
      input: {},
      context: [
        { source: "retr://x", tier: "unreviewed" },
        { source: "retr://y", tier: "approved" },
      ],
    },
    fe2: { kind: "foreach", uses: "mail.send@1", items: "${{ inputs.rows }}", with: {} },
    fe: { kind: "foreach", subflow: "g@1", items: "${{ inputs.rows }}", with: {} },
    a: {
      kind: "end",
      pre: [
        { id: "bm", kind: "block", uses: "mail.send@1", with: {} },
        { id: "cc", kind: "code", input: {}, source: "return" },
      ],
      post: [{ id: "bh", kind: "block", uses: "http.get@1", with: {} }],
    },
    ag: {
      kind: "agent",
      input: {},
      tools: ["kb.search@1", "http.get@1", "mail.send@1"],
    },
  },
  hooks: [
    {
      id: "r",
      match: {},
      pre: { id: "rp", kind: "block", uses: "erp.lookup_vendor@1", with: {} },
    },
  ],
} as unknown as Flow;

test("C-5e5ffb19 agents hooks subflows context and order", () => {
  assert.deepEqual(evidence(mixed), {
    reads_untrusted: [
      site("/nodes/a/post/0/uses", "http.get@1"),
      site("/nodes/ag/tools/1", "http.get@1"),
      site("/nodes/fe/subflow", "g@1"),
      site("/nodes/l/context/0", "retr://x"),
      site("/nodes/s/flow", "f@1"),
    ],
    reads_private: [
      site("/hooks/0/pre/uses", "erp.lookup_vendor@1"),
      site("/nodes/ag/tools/0", "kb.search@1"),
    ],
    has_send_or_pay: [
      site("/nodes/a/pre/0/uses", "mail.send@1"),
      site("/nodes/ag/tools/2", "mail.send@1"),
      site("/nodes/fe2/uses", "mail.send@1"),
    ],
    unknown: [],
  });
});

const unknownFlow = {
  nodes: {
    a: { kind: "block", uses: "nope@1", with: {} },
    b: { kind: "mystery" },
    c: 7,
    d: { kind: "delegate", target: "x", workflow: "y", with: {} },
  },
} as unknown as Flow;

test("C-238ff645 unknown sites fail closed and catalogue errors propagate", () => {
  const unknownSites: CapabilitySite[] = [
    site("/nodes/a/uses", "nope@1"),
    site("/nodes/b/kind", "mystery"),
    site("/nodes/c/kind", ""),
    site("/nodes/d/target", "x:y"),
  ];
  assert.deepEqual(evidence(unknownFlow), {
    reads_untrusted: unknownSites,
    reads_private: unknownSites,
    has_send_or_pay: unknownSites,
    unknown: unknownSites,
  });
  assert.deepEqual(capabilities(unknownFlow), {
    reads_untrusted: true,
    reads_private: true,
    has_send_or_pay: true,
  });

  const noObjectNodes = [site("/nodes", "")];
  assert.deepEqual(evidence({ nodes: [] } as unknown as Flow), {
    reads_untrusted: noObjectNodes,
    reads_private: noObjectNodes,
    has_send_or_pay: noObjectNodes,
    unknown: noObjectNodes,
  });
  assert.deepEqual(capabilities({ nodes: [] } as unknown as Flow), {
    reads_untrusted: true,
    reads_private: true,
    has_send_or_pay: true,
  });

  const thrown = new Error("boom");
  const throwingCatalogue: Catalogue = {
    ...emptyCatalogue,
    block(): BlockDef | undefined {
      throw thrown;
    },
  };
  const flowWithBlock = oneNode({ kind: "block", uses: "a@1", with: {} });
  const caughtEvidence = capture(() => {
    capabilityEvidence(flowWithBlock, throwingCatalogue);
  });
  assert.equal(caughtEvidence, thrown);
  const caughtFlags = capture(() => {
    flowCapabilities(flowWithBlock, throwingCatalogue);
  });
  assert.equal(caughtFlags, thrown);
});

test("C-9c5fbf5b malformed hook structures are unknown sites", () => {
  const malformedHooks = {
    nodes: {
      a: { kind: "code", input: {}, pre: "oops" },
      b: { kind: "llm.extract", input: {}, post: [5] },
      c: { kind: "llm.decide", input: {}, post: [{ id: "h", kind: "mystery" }] },
      w: { kind: "code", input: {} },
    },
  } as unknown as Flow;
  const nodeSites: CapabilitySite[] = [
    site("/nodes/a/pre", ""),
    site("/nodes/b/post/0", ""),
    site("/nodes/c/post/0", ""),
  ];
  assert.deepEqual(evidence(malformedHooks), {
    reads_untrusted: nodeSites,
    reads_private: nodeSites,
    has_send_or_pay: nodeSites,
    unknown: nodeSites,
  });
  assert.deepEqual(capabilities(malformedHooks), {
    reads_untrusted: true,
    reads_private: true,
    has_send_or_pay: true,
  });

  const ruleHooks = {
    nodes: { w: { kind: "code", input: {} } },
    hooks: [
      {
        id: "r",
        match: { kind: "code" },
        pre: { id: "p", kind: "code", input: {}, source: "x" },
      },
      5,
      { id: "t", match: {}, post: { id: "q", kind: "mystery" } },
    ],
  } as unknown as Flow;
  const ruleSites: CapabilitySite[] = [
    site("/hooks/0/match/kind", ""),
    site("/hooks/1", ""),
    site("/hooks/2/post", ""),
  ];
  assert.deepEqual(evidence(ruleHooks), {
    reads_untrusted: ruleSites,
    reads_private: ruleSites,
    has_send_or_pay: ruleSites,
    unknown: ruleSites,
  });
  assert.deepEqual(capabilities(ruleHooks), {
    reads_untrusted: true,
    reads_private: true,
    has_send_or_pay: true,
  });

  const stringHooks = {
    nodes: { w: { kind: "code", input: {} } },
    hooks: "oops",
  } as unknown as Flow;
  const hookSites: CapabilitySite[] = [site("/hooks", "")];
  assert.deepEqual(evidence(stringHooks), {
    reads_untrusted: hookSites,
    reads_private: hookSites,
    has_send_or_pay: hookSites,
    unknown: hookSites,
  });
  assert.deepEqual(capabilities(stringHooks), {
    reads_untrusted: true,
    reads_private: true,
    has_send_or_pay: true,
  });
});
