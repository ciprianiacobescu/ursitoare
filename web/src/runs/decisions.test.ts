/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { decisionRows, parseDecisions, permitText } from "./decisions.ts";
import type { DecisionViewWeb } from "./decisions.ts";
import type { RunView, StepView } from "./types.ts";

type Permit = NonNullable<DecisionViewWeb["permit"]>;

function P(path: string): Permit {
  return {
    method: "POST",
    host: "tools.fake.test",
    path,
    serviceId: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01",
    ttlSeconds: 60,
  };
}

function R(n: string): string {
  return `Block::"tenant_a/demo-grants/${n}"`;
}

const LOOK = {
  decisionId: "dec_2",
  nodeId: "lookup",
  resource: R("lookup"),
  decision: "allow",
  reasons: ["g-lookup"],
  permit: P("/blocks/erp.lookup_vendor@1"),
};

function parse(raw: unknown): DecisionViewWeb[] | null {
  let out: DecisionViewWeb[] | null | undefined;
  assert.doesNotThrow(() => {
    out = parseDecisions(raw);
  });
  return out as DecisionViewWeb[] | null;
}

test("C-320b7d94 a page keeps the shown members and an empty page is empty", () => {
  const page = [
    {
      ...LOOK,
      permit: { ...P("/blocks/a@1"), bodyDigest: "9".repeat(64) },
      decidedAt: "2026-11-06T10:00:02.000000Z",
      policySetVersion: "v1",
    },
  ];
  assert.deepEqual(parse(page), [{ ...LOOK, permit: P("/blocks/a@1") }]);
  assert.deepEqual(parse([]), []);
  assert.equal(
    permitText(P("/blocks/erp.lookup_vendor@1")),
    "POST tools.fake.test/blocks/erp.lookup_vendor@1",
  );
});

test("C-320b7d94 malformed values make the whole page unreadable", () => {
  const withOver = (over: Record<string, unknown>): unknown[] => [{ ...LOOK, ...over }];
  assert.deepEqual(parse([LOOK]), [LOOK]);
  const bad: unknown[] = [
    null,
    {},
    [null],
    withOver({ decision: "maybe" }),
    withOver({ decisionId: "a b" }),
    withOver({ permit: { ...LOOK.permit, ttlSeconds: 0 } }),
    withOver({ permit: { ...LOOK.permit, ttlSeconds: 3601 } }),
    withOver({ permit: { ...LOOK.permit, method: "post" } }),
    withOver({ permit: { ...LOOK.permit, path: "x" } }),
    withOver({ reasons: [5] }),
    withOver({ resource: "" }),
    withOver({ nodeId: "" }),
    withOver({ permit: "x" }),
    withOver({ reasons: "x" }),
    withOver({ resource: 'Block::"tenant_a/demo-grants/lo\u0007okup"' }),
    withOver({ nodeId: "lookup\n" }),
    withOver({ reasons: ["g-\u009Blookup"] }),
    withOver({ permit: { ...LOOK.permit, host: "[2001:db8::1]:8443" } }),
  ];
  for (const raw of bad) {
    assert.equal(parse(raw), null, JSON.stringify(raw));
  }
});

const HASH = "sha256:" + "a".repeat(64);
const RUN: RunView = {
  id: "run_1",
  flowId: "demo-grants",
  flowHash: HASH,
  mode: "stub",
  trigger: "test",
  state: "completed",
  ownerTeam: "finance",
  principal: { userId: "u_alice", kind: "human" },
  terminalNode: "done",
  error: null,
  inputRef: null,
  outputRef: null,
  createdAt: "2026-11-06T10:00:00.000000Z",
  startedAt: "2026-11-06T10:00:01.000000Z",
  endedAt: "2026-11-06T10:00:02.000000Z",
};

function step(seq: number, nodeId: string, kind: string, over: Record<string, unknown> = {}): StepView {
  return {
    seq,
    nodeId,
    kind,
    effectSeq: 0,
    attempt: 1,
    state: "completed",
    outcome: null,
    error: null,
    inputRef: null,
    outputRef: null,
    idemKey: null,
    policyDecisionId: null,
    taint: [],
    startedAt: "2026-11-06T10:00:01.000000Z",
    endedAt: "2026-11-06T10:00:01.500000Z",
    ...over,
  } as StepView;
}

function dec(
  decisionId: string,
  nodeId: string | null,
  resource: string,
  decision: "allow" | "deny",
  reasons: string[],
  permit: Permit | null,
): DecisionViewWeb {
  return { decisionId, nodeId, resource, decision, reasons, permit };
}

const R1 = dec("dec_1", "lookup", R("lookup"), "deny", [], null);
const R2 = dec("dec_2", "lookup", R("lookup"), "allow", ["g-lookup"], P("/blocks/erp.lookup_vendor@1"));
const R3 = dec("dec_3", "pay", R("pay"), "allow", ["g-pay"], P("/blocks/erp.create_payment@1"));
const R4 = dec("dec_4", "pay", R("pay:post:notify"), "allow", ["g-hook"], P("/blocks/slack.post_message@1"));
const R5 = dec("dec_5", "pay", R("pay:pre:audit"), "allow", [], P("/blocks/kb.search@1"));
const R6 = dec("dec_6", "ghost", R("ghost"), "allow", [], P("/blocks/erp.flag_vendor@1"));
const R7 = dec("dec_7", null, 'User::"x"', "deny", [], null);

const KEY = "ik1_" + "d".repeat(64);
function hookEntry(label: string, idemKey: string | null): Record<string, unknown> {
  return {
    label,
    kind: "block",
    fused: false,
    attempt: 1,
    state: "completed",
    action: null,
    mutated: null,
    to: null,
    error: null,
    tool: "x@1",
    idemKey,
  };
}
const STEPS: StepView[] = [
  step(0, "lookup", "block"),
  step(1, "pay", "block", {
    idemKey: KEY,
    hooks: {
      inputOriginalRef: null,
      entries: [hookEntry("pre:audit", null), hookEntry("post:notify", "ik1_" + "e".repeat(64))],
    },
  }),
];

function rows(run: RunView, steps: StepView[], ds: DecisionViewWeb[]): ReturnType<typeof decisionRows> {
  let out: ReturnType<typeof decisionRows> | undefined;
  assert.doesNotThrow(() => {
    out = decisionRows(run, steps, ds);
  });
  return out as ReturnType<typeof decisionRows>;
}

const PAY_TEXT = "pay · allow · POST tools.fake.test/blocks/erp.create_payment@1";

test("C-0930141b each decision is one row with its node, outcome, permit and stub label", () => {
  const out = rows(RUN, STEPS, [R1, R2, R3, R4, R5, R6, R7]);
  assert.deepEqual(
    out.map((r) => r.text),
    [
      "lookup · deny",
      "lookup · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1",
      "pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1",
      "pay:post:notify · allow · stubbed · POST tools.fake.test/blocks/slack.post_message@1",
      "pay:pre:audit · allow · POST tools.fake.test/blocks/kb.search@1",
      "ghost · allow · POST tools.fake.test/blocks/erp.flag_vendor@1",
      "(unknown) · deny",
    ],
  );
  assert.equal(out[3]?.nodeId, "pay:post:notify");
  assert.equal(out[6]?.nodeId, "(unknown)");
});

test("C-0930141b the details name the decision, resource, reasons, service and lifetime", () => {
  const out = rows(RUN, STEPS, [R3, R1, R7, R5]);
  const none = "No grant or policy allows this call.";
  assert.deepEqual(out[0]?.details, [
    { term: "Decision id", value: "dec_3" },
    { term: "Resource", value: R("pay") },
    { term: "Reasons", value: "g-pay" },
    { term: "Service", value: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01" },
    { term: "Token lifetime", value: "60 s" },
  ]);
  assert.deepEqual(out[1]?.details, [
    { term: "Decision id", value: "dec_1" },
    { term: "Resource", value: R("lookup") },
    { term: "Reasons", value: none },
  ]);
  assert.deepEqual(out[2]?.details, [
    { term: "Decision id", value: "dec_7" },
    { term: "Resource", value: 'User::"x"' },
    { term: "Reasons", value: none },
  ]);
  assert.equal(out[3]?.details.find((d) => d.term === "Reasons")?.value, "none");
});

test("C-0930141b the stub label needs a stub run, a block step and a key on the last step", () => {
  const keyed = step(1, "pay", "block", { idemKey: KEY });
  const text = (run: RunView, steps: StepView[]): string | undefined => rows(run, steps, [R3])[0]?.text;
  assert.equal(text(RUN, [keyed]), "pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1");
  assert.equal(text({ ...RUN, mode: "live" }, [keyed]), PAY_TEXT);
  assert.equal(text(RUN, []), PAY_TEXT);
  assert.equal(text(RUN, [step(1, "pay", "switch", { idemKey: KEY })]), PAY_TEXT);
  assert.equal(text(RUN, [keyed, step(2, "pay", "block")]), PAY_TEXT);
  assert.equal(
    text(RUN, [step(1, "pay", "block"), step(2, "pay", "block", { idemKey: KEY })]),
    "pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1",
  );
});
