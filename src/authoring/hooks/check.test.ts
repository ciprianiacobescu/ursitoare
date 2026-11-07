import assert from "node:assert/strict";
import { test } from "node:test";

import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { hookFlowNames, loadHookFlow } from "../../../test/support/hook-flows/index.ts";
import type { Catalogue } from "../format/index.ts";
import { checkHooks } from "./index.ts";

const catalogue = loadTestCatalogue();

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
interface Found {
  errors: { layer: string; code: string; node: string | null; path: string; message: string }[];
  warnings: { layer: string; code: string; node: string | null; path: string; message: string }[];
}

function run(doc: unknown, cat: Catalogue = catalogue): Found {
  let result: Found = { errors: [], warnings: [] };
  assert.doesNotThrow(() => {
    result = checkHooks(doc, cat) as Found;
  });
  return result;
}

function rows(list: Found["errors"]): string[] {
  return list.map((e) => `${e.code} ${String(e.node)} ${e.path}`).sort();
}

function code(id: string, extra: Doc = {}): Doc {
  return { id, kind: "code", source: "return;", ...extra };
}

function base(): Doc {
  return {
    ursitoare: "0.1",
    flow: "hook-case",
    version: "1.0.0",
    inputs: {
      type: "object",
      properties: { vendor: { type: "string" }, amount: { type: "number" } },
      required: ["vendor", "amount"],
    },
    start: "lookup",
    nodes: {
      lookup: {
        kind: "block",
        uses: "erp.lookup_vendor@1",
        with: { vendor_name: "${{ inputs.vendor }}" },
        next: "gate",
      },
      gate: {
        kind: "switch",
        on: "${{ nodes.lookup.output.status }}",
        cases: { active: "pay" },
        default: "rejected",
      },
      pay: {
        kind: "block",
        uses: "erp.create_payment@1",
        with: {
          vendor_id: "${{ nodes.lookup.output.vendor_id }}",
          amount: "${{ inputs.amount }}",
          currency: "EUR",
          reference: "inv-1",
        },
        next: "done",
      },
      done: {
        kind: "end",
        status: "completed",
        output: { payment_id: "${{ nodes.pay.output.payment_id }}" },
      },
      rejected: { kind: "end", status: "failed" },
    },
  };
}

function x3(routes: string[] = ["pay"]): Doc {
  const doc = base();
  doc.nodes.lookup.post = [code("around_gate", { routes })];
  return doc;
}

function x1(flag = true): Doc {
  const doc = base();
  doc.nodes.pay.post = [
    code("pay_again", flag ? { max_retries: 1, allow_effect_retry: true } : { max_retries: 1 }),
  ];
  return doc;
}

const PAY_AS: Record<string, { uses: string; with: Doc }> = {
  mail: { uses: "mail.send@1", with: { to: "a@example.com", subject: "s", body: "b" } },
  docs: { uses: "docs.create@1", with: { title: "t", content: "c" } },
  read: { uses: "erp.lookup_vendor@1", with: { vendor_name: "x" } },
};

function payAs(doc: Doc, kind: string): Doc {
  const spec = PAY_AS[kind] as { uses: string; with: Doc };
  doc.nodes.pay.uses = spec.uses;
  doc.nodes.pay.with = structuredClone(spec.with);
  delete doc.nodes.done.output;
  return doc;
}

const ROUTE_X3 = "H_ROUTE_EFFECT lookup /nodes/lookup/post/0/routes/0";
const RETRY_PAY_MAX = "H_RETRY_SCOPE pay /nodes/pay/post/0/max_retries";

const flowRows: Record<string, { errors: string[]; warnings?: string[] }> = {
  "n-block": { errors: ["H_BLOCK classify /nodes/classify/post/0/with"] },
  "n-dominance-hook": {
    errors: [
      "H_DOMINANCE extract /hooks/0/pre/input/x",
      "H_DOMINANCE fetch_invoice /hooks/0/pre/input/x",
    ],
  },
  "n-no-match": { errors: [], warnings: ["W_NO_MATCH null /hooks/0"] },
  "n-retry-scope": { errors: ["H_RETRY_SCOPE pay /nodes/pay/post/0/max_retries"] },
  "n-retry-scope-human": {
    errors: ["H_RETRY_SCOPE approval /nodes/approval/post/0/max_retries"],
  },
  "n-route-self": {
    errors: [
      "H_CYCLE null /nodes",
      "H_ROUTE_TARGET classify /nodes/classify/post/0/routes/0",
    ],
  },
  "n-route-target": { errors: ["H_ROUTE_TARGET classify /nodes/classify/post/0/routes/0"] },
  "n-schema": { errors: ["H_SCHEMA lookup_vendor /nodes/lookup_vendor/pre/0/frobnicate"] },
  "n-schema-routes-pre": {
    errors: ["H_SCHEMA lookup_vendor /nodes/lookup_vendor/pre/0/routes"],
  },
  "s14-unsafe-redirect": {
    errors: [
      "H_DOMINANCE approval /nodes/approval/summary",
      "H_DOMINANCE classify /nodes/classify/input/amount",
      "H_DOMINANCE classify /nodes/classify/input/is_large",
      "H_DOMINANCE classify /nodes/classify/input/vendor_status",
      "H_DOMINANCE pay /nodes/pay/with/amount",
      "H_DOMINANCE pay /nodes/pay/with/currency",
      "H_DOMINANCE pay /nodes/pay/with/vendor_id",
    ],
  },
  "s14c-cycle": { errors: ["H_CYCLE null /nodes"] },
  "s18d-routes-on-human": {
    errors: [
      "H_ROUTE_HUMAN approval /nodes/approval/post/0/routes",
      "H_ROUTE_EFFECT approval /nodes/approval/post/0/routes/0",
    ],
  },
  "x1a-retry-pay": { errors: ["H_RETRY_SCOPE pay /nodes/pay/post/0/allow_effect_retry"] },
  "x1b-retry-raise": { errors: ["H_RETRY_SCOPE pay /nodes/pay/post/0/allow_effect_retry"] },
  "x3-gate-bypass": { errors: ["H_ROUTE_EFFECT classify /nodes/classify/post/0/routes/0"] },
};

test("C-53971bc2: the 15 flagged hook flows give their rows and the other 30 are clean", () => {
  const names = hookFlowNames();
  assert.equal(names.length, 45);
  for (const name of names) {
    const found = run(loadHookFlow(name));
    const want = flowRows[name] ?? { errors: [] };
    assert.deepEqual(rows(found.errors), [...want.errors].sort(), `${name} errors`);
    assert.deepEqual(rows(found.warnings), [...(want.warnings ?? [])].sort(), `${name} warnings`);
    for (const issue of [...found.errors, ...found.warnings]) assert.equal(issue.layer, "H");
  }
  const cycle = run(loadHookFlow("s14c-cycle")).errors[0];
  assert.match(cycle?.message ?? "", /extract -> lookup_vendor -> normalize -> extract/);
  const self = run(loadHookFlow("n-route-self")).errors.find((e) => e.code === "H_CYCLE");
  assert.match(self?.message ?? "", /classify -> classify/);
});

test("C-82781d52: an X3 route into pay and an X1 retry of pay give one error each", () => {
  const route = run(x3());
  assert.deepEqual(rows(route.errors), [ROUTE_X3]);
  assert.deepEqual(route.warnings, []);
  const retry = run(x1());
  assert.deepEqual(rows(retry.errors), ["H_RETRY_SCOPE pay /nodes/pay/post/0/allow_effect_retry"]);
  assert.deepEqual(retry.warnings, []);
});

test("C-82781d52: routes to an end or a switch pass and routes to send or write nodes fail", () => {
  assert.deepEqual(rows(run(x3(["pay"])).errors), [ROUTE_X3]);
  assert.deepEqual(run(x3(["rejected"])), { errors: [], warnings: [] });
  assert.deepEqual(run(x3(["gate"])), { errors: [], warnings: [] });
  assert.deepEqual(rows(run(payAs(x3(), "mail")).errors), [ROUTE_X3]);
  assert.deepEqual(rows(run(payAs(x3(), "docs")).errors), [ROUTE_X3]);
});

test("C-82781d52: a route to a node of unknown effect is H_ROUTE_EFFECT", () => {
  const doc = x3();
  doc.nodes.pay.uses = "erp.unknown@1";
  assert.deepEqual(rows(run(doc).errors), [ROUTE_X3]);
});

test("C-82781d52: retries on a send or write pay node need the flag, a read node needs none", () => {
  assert.deepEqual(run(payAs(x1(true), "mail")), { errors: [], warnings: [] });
  assert.deepEqual(run(payAs(x1(true), "docs")), { errors: [], warnings: [] });
  assert.deepEqual(run(payAs(x1(false), "read")), { errors: [], warnings: [] });
  assert.deepEqual(rows(run(payAs(x1(false), "mail")).errors), [RETRY_PAY_MAX]);
  assert.deepEqual(rows(run(payAs(x1(false), "docs")).errors), [RETRY_PAY_MAX]);
  assert.deepEqual(rows(run(x1(false)).errors), [RETRY_PAY_MAX]);
});

function chain(hook: Doc, retry: Doc): Doc {
  const doc = base();
  doc.nodes.lookup.post = [hook, retry];
  return doc;
}

const PAY_NOW: Doc = {
  id: "pay_now",
  kind: "block",
  uses: "erp.create_payment@1",
  with: {
    vendor_id: "${{ nodes.lookup.output.vendor_id }}",
    amount: "${{ inputs.amount }}",
    currency: "EUR",
    reference: "inv-2",
  },
};
const TELL: Doc = {
  id: "tell",
  kind: "block",
  uses: "mail.send@1",
  with: { to: "ap@example.com", subject: "paid", body: "ok" },
};

test("C-82781d52: a pay block hook in a retried post chain is refused even with the flag", () => {
  const found = run(chain(PAY_NOW, code("retry_lookup", { max_retries: 1, allow_effect_retry: true })));
  assert.deepEqual(rows(found.errors), [
    "H_RETRY_SCOPE lookup /nodes/lookup/post/1/allow_effect_retry",
  ]);
});

test("C-82781d52: a send block hook in a retried post chain needs the flag", () => {
  const without = run(chain(TELL, code("retry_lookup", { max_retries: 1 })));
  assert.deepEqual(rows(without.errors), ["H_RETRY_SCOPE lookup /nodes/lookup/post/1/max_retries"]);
  const flagged = run(chain(TELL, code("retry_lookup", { max_retries: 1, allow_effect_retry: true })));
  assert.deepEqual(flagged, { errors: [], warnings: [] });
});

test("C-0c093690: a throwing catalogue gives H_BLOCK and null effects, and a deep chain stays clean", () => {
  const doc = base();
  doc.nodes.lookup.post = [
    {
      id: "peek",
      kind: "block",
      uses: "erp.lookup_vendor@1",
      with: { vendor_name: "x" },
    },
    code("jump", { routes: ["gate", "pay"] }),
    code("retry_lookup", { max_retries: 1 }),
  ];
  const thrower = (): never => {
    throw new Error("boom");
  };
  const throwing = {
    block: thrower,
    modelProfile: () => undefined,
    role: () => undefined,
    delegateTarget: () => undefined,
    flow: () => undefined,
  } as unknown as Catalogue;
  const found = run(doc, throwing);
  assert.deepEqual(found.warnings, []);
  assert.deepEqual(
    found.errors.map((e) => `${e.code} ${String(e.node)} ${e.path}`),
    [
      "H_BLOCK lookup /nodes/lookup/post/0/uses",
      "H_ROUTE_EFFECT lookup /nodes/lookup/post/1/routes/1",
      "H_RETRY_SCOPE lookup /nodes/lookup/post/2/max_retries",
    ],
  );

  const nodes: Doc = {};
  for (let i = 0; i < 5000; i += 1) {
    nodes[`n${i}`] = {
      kind: "switch",
      on: "${{ inputs.k }}",
      cases: {},
      default: i === 4999 ? "e" : `n${i + 1}`,
    };
  }
  nodes.e = { kind: "end", status: "completed" };
  nodes.n0.post = [code("jump", { routes: ["e"] })];
  const deep = run({ ursitoare: "0.1", start: "n0", nodes });
  assert.deepEqual(deep, { errors: [], warnings: [] });
});
