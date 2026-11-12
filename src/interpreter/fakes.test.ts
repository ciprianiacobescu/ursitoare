import assert from "node:assert/strict";
import { test } from "node:test";

import type { Catalogue, Flow } from "../authoring/index.ts";
import {
  PAY_ONCE_PAID_OUTPUT,
  payOnceCatalogue,
  payOnceVersion,
} from "../../test/support/crash/pay-once.ts";
import { checkFakes } from "./fakes.ts";
import type { DryRunFakes, FakeProblem } from "./fakes.ts";
import { checkMocks } from "./mocks.ts";

const ID = "C-a750a5ed";
const PAID = PAY_ONCE_PAID_OUTPUT;
const LOOKUP1 = { vendor_id: "v1", status: "active" };
const FK = { pay: [{ output: PAID }] };
const ENT = "entry must be {output} or {error: {code, message}}";
const NE = "only write, send and pay take a fake";
const NN = "no such node or hook";
const MI = "no fake entry";

const HOOK = {
  id: "payhook",
  kind: "block",
  uses: "erp.create_payment@1",
  with: { vendor_id: "v1", amount: 1, currency: "EUR", reference: "r" },
};

interface CheckResult {
  fakes: DryRunFakes | null;
  problems: FakeProblem[];
}

function flowOf(): Flow {
  return payOnceVersion().flow;
}

function withNodes(extra: Record<string, unknown>, patch: Record<string, unknown> = {}): Flow {
  const flow = flowOf();
  const nodes = { ...(flow.nodes as unknown as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch)) {
    nodes[key] = { ...(nodes[key] as object), ...(value as object) };
  }
  return { ...flow, nodes: { ...nodes, ...extra } } as unknown as Flow;
}

function check(flow: Flow, catalogue: Catalogue, fakes: unknown): CheckResult {
  let value: CheckResult | undefined;
  assert.doesNotThrow(() => {
    value = checkFakes(flow, catalogue, fakes);
  });
  assert.ok(value !== undefined, "checkFakes answered");
  return value;
}

function rows(problems: readonly FakeProblem[]): string[] {
  return problems.map(
    (p) => `${p.key} ${p.index === null ? "null" : String(p.index)} ${p.reason} ${p.detail}`,
  );
}

test(`${ID}: F1 a valid row returns a copy of its input`, () => {
  const result = check(flowOf(), payOnceCatalogue(), FK);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.fakes, FK);
  assert.notEqual(result.fakes, FK);
  const entry = result.fakes?.["pay"]?.[0];
  assert.ok(entry !== undefined && "output" in entry, "pay has an output entry");
  (entry.output as unknown as { status: string }).status = "x";
  assert.equal((FK.pay[0]?.output as { status: string }).status, "paid");
});

test(`${ID}: F2 F3 an effect node with no or an empty list is missing`, () => {
  const empty = check(flowOf(), payOnceCatalogue(), {});
  assert.equal(empty.fakes, null);
  assert.deepEqual(rows(empty.problems), [`pay null missing ${MI}`]);
  const none = check(flowOf(), payOnceCatalogue(), { pay: [] });
  assert.deepEqual(rows(none.problems), [`pay null missing ${MI}`]);
});

test(`${ID}: F4 a read or switch node takes no fake`, () => {
  const read = check(flowOf(), payOnceCatalogue(), { ...FK, lookup: [{ output: LOOKUP1 }] });
  assert.deepEqual(rows(read.problems), [`lookup null not_an_effect ${NE}`]);
  const sw = check(flowOf(), payOnceCatalogue(), { ...FK, route: [{ output: {} }] });
  assert.deepEqual(rows(sw.problems), [`route null not_an_effect ${NE}`]);
});

test(`${ID}: F5 unknown keys are sorted and __proto__ is one`, () => {
  const fakes: unknown = JSON.parse(
    '{"pay":[{"output":{"payment_id":"pay-1","status":"paid"}}],"ghost":[],"__proto__":[]}',
  );
  const result = check(flowOf(), payOnceCatalogue(), fakes);
  assert.deepEqual(rows(result.problems), [
    `__proto__ null unknown_node ${NN}`,
    `ghost null unknown_node ${NN}`,
  ]);
});

test(`${ID}: F6 an output that breaks the output schema is a schema problem`, () => {
  const required = check(flowOf(), payOnceCatalogue(), {
    pay: [{ output: { payment_id: "pay-1" } }],
  });
  assert.deepEqual(rows(required.problems), ["pay 0 schema / required"]);
  const typed = check(flowOf(), payOnceCatalogue(), {
    pay: [{ output: { payment_id: 5, status: "paid" } }],
  });
  assert.deepEqual(rows(typed.problems), ["pay 0 schema /payment_id type"]);
});

test(`${ID}: F7 malformed lists, entries and fakes are shape problems`, () => {
  const list = check(flowOf(), payOnceCatalogue(), { pay: "x" });
  assert.deepEqual(rows(list.problems), ["pay null shape entries must be an array"]);
  const entries = check(flowOf(), payOnceCatalogue(), {
    pay: [
      { output: PAID },
      { nope: 1 },
      { output: PAID, error: { code: "E", message: "m" } },
      { error: { code: "bad code", message: "m" } },
    ],
  });
  assert.deepEqual(rows(entries.problems), [
    `pay 1 shape ${ENT}`,
    `pay 2 shape ${ENT}`,
    `pay 3 shape ${ENT}`,
  ]);
  for (const bad of [[], null, "x"]) {
    const result = check(flowOf(), payOnceCatalogue(), bad);
    assert.equal(result.fakes, null);
    assert.deepEqual(
      result.problems.map((p) => [p.key, p.index, p.reason, p.detail]),
      [["", null, "shape", "fakes must be an object"]],
    );
  }
  const ok = check(flowOf(), payOnceCatalogue(), {
    pay: [{ error: { code: "E_DOWN", message: "down" } }, { output: PAID }],
  });
  assert.deepEqual(ok.problems, []);
  assert.ok(ok.fakes !== null);
});

test(`${ID}: F8 an unreachable effect node needs no fake`, () => {
  const orphan = {
    orphan: {
      kind: "block",
      uses: "erp.flag_vendor@1",
      with: { vendor_id: "v1", reason: "r" },
      next: "done",
    },
  };
  const flow = withNodes(orphan);
  assert.deepEqual(check(flow, payOnceCatalogue(), FK).problems, []);
  const given = { ...FK, orphan: [{ output: { flag_id: "f1" } }] };
  const result = check(flow, payOnceCatalogue(), given);
  assert.deepEqual(result.problems, []);
  assert.ok(result.fakes !== null && "orphan" in result.fakes, "the copy holds orphan");
});

test(`${ID}: F9 every reachable effect node is required`, () => {
  const flag = {
    flag: {
      kind: "block",
      uses: "erp.flag_vendor@1",
      with: { vendor_id: "v1", reason: "r" },
      next: "done",
    },
  };
  const flow = withNodes(flag, { pay: { next: "flag" } });
  const result = check(flow, payOnceCatalogue(), {});
  assert.deepEqual(rows(result.problems), [`flag null missing ${MI}`, `pay null missing ${MI}`]);
});

test(`${ID}: F10 at most 50 problems`, () => {
  const fakes: Record<string, unknown> = { ...FK };
  for (let i = 0; i < 60; i += 1) {
    fakes[`g${String(i).padStart(2, "0")}`] = [];
  }
  const result = check(flowOf(), payOnceCatalogue(), fakes);
  assert.equal(result.problems.length, 50);
  assert.equal(rows(result.problems)[0], `g00 null unknown_node ${NN}`);
  assert.equal(result.problems[49]?.key, "g49");
});

test(`${ID}: F11 entry rules equal those of checkMocks`, () => {
  const entries: unknown[] = [
    { output: PAID },
    { output: { payment_id: "pay-1" } },
    { nope: 1 },
    { output: PAID, error: { code: "E", message: "m" } },
    { error: { code: "bad code", message: "m" } },
    { error: { code: "E_DOWN", message: "down" } },
  ];
  let reached = 0;
  for (const entry of entries) {
    const mocks = checkMocks(flowOf(), payOnceCatalogue(), {
      lookup: [{ output: LOOKUP1 }],
      pay: [entry],
    });
    const result = check(flowOf(), payOnceCatalogue(), { pay: [entry] });
    assert.deepEqual(
      result.problems.map((p) => [p.reason, p.detail]),
      mocks.problems.map((p) => [p.reason, p.detail]),
    );
    reached += 1;
  }
  assert.equal(reached, 6);
  const schema = check(flowOf(), payOnceCatalogue(), { pay: [entries[1]] });
  assert.deepEqual(rows(schema.problems), ["pay 0 schema / required"]);
});

test(`${ID}: F12b a pay hook on a read node needs its own fake when reachable`, () => {
  const ph = withNodes({}, { lookup: { post: [HOOK] } });
  const missing = check(ph, payOnceCatalogue(), FK);
  assert.deepEqual(rows(missing.problems), [`lookup:post:payhook null missing ${MI}`]);
  const both = check(ph, payOnceCatalogue(), {});
  assert.deepEqual(rows(both.problems), [
    `lookup:post:payhook null missing ${MI}`,
    `pay null missing ${MI}`,
  ]);
  const given = { ...FK, "lookup:post:payhook": [{ output: PAID }] };
  const ok = check(ph, payOnceCatalogue(), given);
  assert.deepEqual(ok.problems, []);
  assert.deepEqual(ok.fakes, given);
  const peek = {
    peek: {
      kind: "block",
      uses: "erp.lookup_vendor@1",
      with: { vendor_name: "x" },
      next: "done",
      post: [HOOK],
    },
  };
  const unreachable = withNodes(peek);
  assert.deepEqual(check(unreachable, payOnceCatalogue(), FK).problems, []);
  const extra = check(unreachable, payOnceCatalogue(), {
    ...FK,
    "peek:post:payhook": [{ output: PAID }],
  });
  assert.deepEqual(extra.problems, []);
  assert.ok(extra.fakes !== null && "peek:post:payhook" in extra.fakes);
});

test(`${ID}: F13 a throwing catalogue gives one shape problem and null fakes`, () => {
  const base = payOnceCatalogue();
  const throwing: Catalogue = {
    ...base,
    block() {
      throw new Error("catalogue down");
    },
  };
  const result = check(flowOf(), throwing, FK);
  assert.equal(result.fakes, null);
  assert.deepEqual(
    result.problems.map((p) => [p.key, p.index, p.reason, p.detail]),
    [["", null, "shape", "fakes cannot be checked"]],
  );
});
