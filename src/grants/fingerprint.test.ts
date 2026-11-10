import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import type { BlockDef, Catalogue, Flow } from "../authoring/index.ts";
import { canonicalizeFlow, emptyCatalogue } from "../authoring/index.ts";
import { nodeFingerprint } from "./index.ts";

const BLOCKS: Record<string, BlockDef> = {
  "acme.lookup_vendor@1": {
    effect: "read",
    input: {
      type: "object",
      properties: {
        vendor_name: { type: "string" },
        limit: { type: "integer" },
        exact: { type: "boolean" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["vendor_name"],
    },
    output: {
      type: "object",
      properties: { vendor_id: { type: "string" } },
      required: ["vendor_id"],
    },
  },
  "acme.create_payment@1": {
    effect: "pay",
    input: {
      type: "object",
      properties: {
        vendor_id: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
      },
      required: ["vendor_id", "amount", "currency"],
    },
    output: { type: "object" },
  },
  "acme.odd_args@1": {
    effect: "read",
    input: {
      type: "object",
      properties: {
        "Vendor-Id": { type: "string" },
        vendor_ok: { type: "string" },
      },
    },
    output: { type: "object" },
  },
};

const catalogue: Catalogue = {
  ...emptyCatalogue,
  block(ref: string): BlockDef | undefined {
    return BLOCKS[ref];
  },
};

type Node = Record<string, unknown>;

interface FlowDoc {
  ursitoare: string;
  flow: string;
  version: string;
  inputs: Record<string, unknown>;
  start: string;
  nodes: Record<string, Node>;
  hooks?: unknown[];
}

const F1_DOC: FlowDoc = {
  ursitoare: "0.1",
  flow: "pay-run",
  version: "1.0.0",
  inputs: {
    type: "object",
    properties: {
      vendor_name: { type: "string" },
      amount: { type: "number" },
    },
    required: ["vendor_name", "amount"],
  },
  start: "lookup",
  nodes: {
    lookup: {
      kind: "block",
      uses: "acme.lookup_vendor@1",
      with: { vendor_name: "${{ inputs.vendor_name }}" },
      next: "approval",
    },
    approval: {
      kind: "human.approval",
      assignee_role: "approver",
      summary: "Pay ${{ inputs.amount }} to ${{ nodes.lookup.output.vendor_id }}?",
      timeout: "PT48H",
      cases: { approved: "pay", rejected: "stop", timeout: "stop" },
    },
    pay: {
      kind: "block",
      uses: "acme.create_payment@1",
      with: {
        vendor_id: "${{ nodes.lookup.output.vendor_id }}",
        amount: "${{ inputs.amount }}",
        currency: "EUR",
      },
      next: "done",
    },
    done: { kind: "end", status: "completed" },
    stop: { kind: "end", status: "failed" },
  },
};

const F1_EXPECTED = {
  lookup: "nf1_1cae325a646069b82abdada223d1db6ff74d04f95693980f847762c6d4cc8ea1",
  approval: "nf1_ff4578dbc61f634b272031a5d8df9388ba61b50f75a5cc5b3a48c23fe0bc23c5",
  pay: "nf1_f24d1bc261f70ccadd830e24b3acb40edec5066462531278c03adc516dfeb51d",
  done: "nf1_721060bafd2c1a979aba6975861ba5cbdf2c6a3e112c92e697f25bed9d593f3b",
  stop: "nf1_4bc9acaeb10b7d914c898456306ab822f26fc402a6311993040dabbc48b1eb2d",
} as const;

const F2_EXPECTED = {
  lookup: "nf1_1cae325a646069b82abdada223d1db6ff74d04f95693980f847762c6d4cc8ea1",
  approval: "nf1_bf70b7feafbd537096eccd66e90a11a8a769c0a766217aee42fde0a78a04c09b",
  pay: "nf1_20f87c5365e1cb05fe773dd9e4200d18670a144581e85b9f1c17918f7fda9868",
  done: "nf1_4bc9acaeb10b7d914c898456306ab822f26fc402a6311993040dabbc48b1eb2d",
  stop: "nf1_4bc9acaeb10b7d914c898456306ab822f26fc402a6311993040dabbc48b1eb2d",
} as const;

const FPA = F1_EXPECTED.pay;
const FPB = F2_EXPECTED.pay;

function nodeOf(doc: FlowDoc, id: string): Node {
  const node = doc.nodes[id];
  assert.ok(node !== undefined, `the flow has node ${id}`);
  return node;
}

function flowOf(doc: unknown): Flow {
  return canonicalizeFlow(doc) as Flow;
}

function cloneF1(): FlowDoc {
  return structuredClone(F1_DOC);
}

const F1 = flowOf(F1_DOC);

function f2Doc(): FlowDoc {
  const doc = cloneF1();
  nodeOf(doc, "lookup").next = "pay";
  nodeOf(doc, "pay").next = "approval";
  nodeOf(doc, "approval").summary = "Confirm the payment of ${{ inputs.amount }}?";
  nodeOf(doc, "approval").cases = { approved: "done", rejected: "stop", timeout: "stop" };
  return doc;
}

const F2 = flowOf(f2Doc());

function fingerprint(flow: Flow, nodeId: string): string | null {
  let result: string | null = null;
  assert.doesNotThrow(() => {
    result = nodeFingerprint(flow, nodeId, catalogue);
  });
  return result;
}

function fingerprintOf(value: unknown, nodeId: string): string | null {
  return fingerprint(value as Flow, nodeId);
}

function fingerprints(flow: Flow, ids: readonly string[]): Record<string, string | null> {
  return Object.fromEntries(ids.map((id) => [id, fingerprint(flow, id)]));
}

function payFingerprint(mutate: (doc: FlowDoc) => void): string | null {
  const doc = cloneF1();
  mutate(doc);
  return fingerprint(flowOf(doc), "pay");
}

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .reverse()
        .map(([key, child]) => [key, reverseKeys(child)]),
    );
  }
  return value;
}

test("C-87c5f285: F1 and F2 hash every node as the vectors table says", () => {
  assert.deepEqual(fingerprints(F1, Object.keys(F1_EXPECTED)), F1_EXPECTED);
  assert.deepEqual(fingerprints(F2, Object.keys(F2_EXPECTED)), F2_EXPECTED);
  assert.equal(F1_EXPECTED.pay, FPA);
  assert.equal(F2_EXPECTED.pay, FPB);
  assert.notEqual(FPA, FPB);
});

test("C-87c5f285: reversed keys and an unrelated rename change no fingerprint", () => {
  const reversed = flowOf(reverseKeys(F1_DOC));
  assert.deepEqual(fingerprints(reversed, Object.keys(F1_EXPECTED)), F1_EXPECTED);

  const renamed = cloneF1();
  const halt = nodeOf(renamed, "stop");
  renamed.nodes.halt = halt;
  delete renamed.nodes.stop;
  const approval = nodeOf(renamed, "approval");
  approval.cases = { approved: "pay", rejected: "halt", timeout: "halt" };
  const renamedFlow = flowOf(renamed);
  assert.deepEqual(fingerprints(renamedFlow, ["lookup", "approval", "pay", "done"]), {
    lookup: F1_EXPECTED.lookup,
    approval: F1_EXPECTED.approval,
    pay: F1_EXPECTED.pay,
    done: F1_EXPECTED.done,
  });
  assert.equal(fingerprint(renamedFlow, "halt"), F1_EXPECTED.stop);
});

test("C-87c5f285: a hook route and a flow rule change only the nodes they name", () => {
  const routed = cloneF1();
  nodeOf(routed, "lookup").post = [
    { id: "to_stop", kind: "code", source: "return {};", routes: ["stop"] },
  ];
  const routedFlow = flowOf(routed);
  assert.deepEqual(fingerprints(routedFlow, ["lookup", "stop", "approval", "pay", "done"]), {
    lookup: "nf1_98f17ac7f32bc59ab1f6f6c6cb1740e06049f358f434fd15eef13ee746fb5364",
    stop: "nf1_b43a0d2a6eb1775c1023f1cc67e0701c659c6143ba863cfcbf85c5962c74be14",
    approval: F1_EXPECTED.approval,
    pay: F1_EXPECTED.pay,
    done: F1_EXPECTED.done,
  });

  const ruled = cloneF1();
  ruled.hooks = [
    {
      id: "all_pay",
      match: { effect: ["pay"] },
      pre: { id: "audit_note", kind: "code", source: "return {};" },
    },
  ];
  const ruledFlow = flowOf(ruled);
  assert.deepEqual(fingerprints(ruledFlow, ["pay", "lookup", "approval", "done", "stop"]), {
    pay: "nf1_bd9a7113cc9d4bf781bfb71495be6f1ff74940d35b719596d289dab70aa7cf5a",
    lookup: F1_EXPECTED.lookup,
    approval: F1_EXPECTED.approval,
    done: F1_EXPECTED.done,
    stop: F1_EXPECTED.stop,
  });

  const noMatch = cloneF1();
  noMatch.hooks = [
    {
      id: "all_pay",
      match: { effect: ["read"], nodes: ["pay"] },
      pre: { id: "audit_note", kind: "code", source: "return {};" },
    },
  ];
  assert.deepEqual(fingerprints(flowOf(noMatch), Object.keys(F1_EXPECTED)), F1_EXPECTED);
});

test("C-87c5f285: a changed value and a pre hook change only the pay node", () => {
  const changed = cloneF1();
  nodeOf(changed, "pay").with = {
    vendor_id: "${{ nodes.lookup.output.vendor_id }}",
    amount: "5000",
    currency: "EUR",
  };
  const changedFlow = flowOf(changed);
  assert.notEqual(fingerprint(changedFlow, "pay"), F1_EXPECTED.pay);
  assert.deepEqual(fingerprints(changedFlow, ["lookup", "approval", "done", "stop"]), {
    lookup: F1_EXPECTED.lookup,
    approval: F1_EXPECTED.approval,
    done: F1_EXPECTED.done,
    stop: F1_EXPECTED.stop,
  });

  const pre = cloneF1();
  nodeOf(pre, "pay").pre = [
    { id: "bump", kind: "code", source: "return { amount: 1 };" },
  ];
  const preFlow = flowOf(pre);
  assert.deepEqual(fingerprints(preFlow, ["pay", "lookup", "approval", "done", "stop"]), {
    pay: "nf1_afe02f5e6199590af7aba0aa0c6ff1567c1a96d6d012e964e92e323eaa8ec383",
    lookup: F1_EXPECTED.lookup,
    approval: F1_EXPECTED.approval,
    done: F1_EXPECTED.done,
    stop: F1_EXPECTED.stop,
  });

  const preWhen = cloneF1();
  nodeOf(preWhen, "pay").pre = [
    {
      id: "bump",
      kind: "code",
      source: "return { amount: 1 };",
      when: { from: { nodes: ["lookup"] } },
    },
  ];
  const preWhenFlow = flowOf(preWhen);
  assert.deepEqual(fingerprints(preWhenFlow, ["pay", "lookup", "approval", "done", "stop"]), {
    pay: "nf1_bb5d8ea0e0e16c580bafed35001467496a515c08a06568603ab1dbd11d86cace",
    lookup: F1_EXPECTED.lookup,
    approval: F1_EXPECTED.approval,
    done: F1_EXPECTED.done,
    stop: F1_EXPECTED.stop,
  });
  assert.notEqual(fingerprint(preWhenFlow, "pay"), fingerprint(preFlow, "pay"));
});

test("C-87c5f285: each block hook member changes the pay fingerprint", () => {
  const base = payFingerprint((doc) => {
    nodeOf(doc, "pay").pre = [
      {
        id: "note",
        kind: "block",
        uses: "acme.lookup_vendor@1",
        with: { vendor_name: "x" },
        on_error: "continue",
      },
    ];
  });
  assert.equal(base, "nf1_f1e87a43b39a53abb6b6460c65f042c6b9748c16d4a65323a343592ad21e1f65");

  const variants = [
    "with.vendor_name",
    "on_error",
    "id",
    "post",
    "input",
  ].map((name) =>
    payFingerprint((doc) => {
      const hook: Record<string, unknown> = {
        id: "note",
        kind: "block",
        uses: "acme.lookup_vendor@1",
        with: { vendor_name: "x" },
        on_error: "continue",
      };
      if (name === "with.vendor_name") hook.with = { vendor_name: "y" };
      if (name === "on_error") hook.on_error = "fail";
      if (name === "id") hook.id = "note2";
      if (name === "input") hook.input = { amount: "${{ inputs.amount }}" };
      if (name === "post") nodeOf(doc, "pay").post = [hook];
      else nodeOf(doc, "pay").pre = [hook];
    }),
  );

  assert.ok(base !== null);
  for (const value of variants) assert.notEqual(value, base);
  assert.equal(new Set(variants).size, variants.length);
});

test("C-87c5f285: each code hook member changes the pay fingerprint", () => {
  const base = payFingerprint((doc) => {
    nodeOf(doc, "pay").pre = [
      {
        id: "cap",
        kind: "code",
        source: "return {};",
        input: { amount: "${{ inputs.amount }}" },
        max_retries: 2,
        allow_effect_retry: true,
      },
    ];
  });
  assert.equal(base, "nf1_1bc99e3357c157e2fa34d221000f11985e869d757ebce69d5c3605d68a8f72cb");

  const variants = ["input.amount", "max_retries", "allow_effect_retry", "source"].map((name) =>
    payFingerprint((doc) => {
      const hook: Record<string, unknown> = {
        id: "cap",
        kind: "code",
        source: "return {};",
        input: { amount: "${{ inputs.amount }}" },
        max_retries: 2,
        allow_effect_retry: true,
      };
      if (name === "input.amount") hook.input = { amount: "${{ inputs.vendor_name }}" };
      if (name === "max_retries") hook.max_retries = 3;
      if (name === "allow_effect_retry") hook.allow_effect_retry = false;
      if (name === "source") hook.source = "return { a: 1 };";
      nodeOf(doc, "pay").pre = [hook];
    }),
  );

  assert.ok(base !== null);
  for (const value of variants) assert.notEqual(value, base);
  assert.equal(new Set(variants).size, variants.length);
});

test("C-87c5f285: a weaker approver and the cycle change the listed nodes", () => {
  const weaker = cloneF1();
  nodeOf(weaker, "approval").assignee_role = "author";
  const weakerFlow = flowOf(weaker);
  assert.deepEqual(fingerprints(weakerFlow, ["lookup", "approval"]), {
    lookup: F1_EXPECTED.lookup,
    approval: F1_EXPECTED.approval,
  });
  assert.equal(
    fingerprint(weakerFlow, "pay"),
    "nf1_af0274ed2b9b0dee1f626b8195d3e418c2f3757c33f83c347d1dcd8a20d446ef",
  );
  assert.notEqual(fingerprint(weakerFlow, "done"), F1_EXPECTED.done);
  assert.notEqual(fingerprint(weakerFlow, "stop"), F1_EXPECTED.stop);

  const cycle = cloneF1();
  nodeOf(cycle, "pay").next = "lookup";
  const cycleFlow = flowOf(cycle);
  assert.deepEqual(fingerprints(cycleFlow, ["lookup", "done", "pay", "approval", "stop"]), {
    lookup: "nf1_8b3587087952550be9d324dcf70a8e4e3622f806ee413728b0bddfd6e1adf904",
    done: "nf1_13814de2d7bceeeb6ceec91e1214c95f28ff3b67339bcb8aace17284d332e04c",
    pay: F1_EXPECTED.pay,
    approval: F1_EXPECTED.approval,
    stop: F1_EXPECTED.stop,
  });
});

test("C-87c5f285: an unreachable node hashes its own payload and changes done", () => {
  const doc = cloneF1();
  doc.nodes.orphan = {
    kind: "block",
    uses: "acme.lookup_vendor@1",
    with: { vendor_name: "x" },
    next: "done",
  };
  const flow = flowOf(doc);
  const payload =
    '{"approvals":[],"hooks":[],"kind":"block","predecessors":[],"uses":"acme.lookup_vendor@1","v":1,"values":[["with",{"vendor_name":"x"}]]}';
  const expected = `nf1_${createHash("sha256").update(payload, "utf8").digest("hex")}`;
  assert.equal(fingerprint(flow, "orphan"), expected);
  assert.notEqual(fingerprint(flow, "done"), F1_EXPECTED.done);
  assert.deepEqual(fingerprints(flow, ["lookup", "approval", "pay", "stop"]), {
    lookup: F1_EXPECTED.lookup,
    approval: F1_EXPECTED.approval,
    pay: F1_EXPECTED.pay,
    stop: F1_EXPECTED.stop,
  });
});

test("C-87c5f285: null input never throws and gives null", () => {
  assert.equal(fingerprintOf("nope", "pay"), null);
  assert.equal(fingerprintOf(F1, "__proto__"), null);
  assert.equal(fingerprintOf(null, "a"), null);
  assert.equal(fingerprintOf(5, "a"), null);
  assert.equal(fingerprintOf({ nodes: 5 }, "a"), null);
  assert.equal(fingerprint(F1, "ghost"), null);
});
