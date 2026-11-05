import assert from "node:assert/strict";
import { test } from "node:test";

import { emptyCatalogue } from "../authoring/index.ts";
import type { Catalogue, Flow, FlowNode } from "../authoring/index.ts";
import {
  PAY_ONCE_PAID_OUTPUT,
  payOnceCatalogue,
  payOnceVersion,
} from "../../test/support/crash/pay-once.ts";
import { checkMocks } from "./mocks.ts";
import type { MockProblem, TestMocks } from "./mocks.ts";

const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = PAY_ONCE_PAID_OUTPUT;
const MOCKS = { lookup: [{ output: LOOKUP_OK }], pay: [{ output: PAID }] };

interface CheckResult {
  mocks: TestMocks | null;
  problems: MockProblem[];
}

function flowOf(): Flow {
  let value: Flow | undefined;
  assert.doesNotThrow(() => {
    value = payOnceVersion().flow;
  });
  assert.ok(value !== undefined, "payOnceVersion answered a flow");
  return value;
}

function catalogueOf(): Catalogue {
  let value: Catalogue | undefined;
  assert.doesNotThrow(() => {
    value = payOnceCatalogue();
  });
  assert.ok(value !== undefined, "payOnceCatalogue answered a catalogue");
  return value;
}

function check(flow: Flow, catalogue: Catalogue, mocks: unknown): CheckResult {
  let value: CheckResult | undefined;
  assert.doesNotThrow(() => {
    value = checkMocks(flow, catalogue, mocks);
  });
  assert.ok(value !== undefined, "checkMocks answered");
  return value;
}

function rows(problems: readonly MockProblem[]): string[] {
  return problems.map(
    (problem) =>
      `${problem.nodeId} ${problem.index === null ? "null" : String(problem.index)} ${problem.reason}`,
  );
}

function details(problems: readonly MockProblem[]): string[] {
  return problems.map((problem) => problem.detail);
}

test("C-3e0e5412: valid mocks pass and are copied", () => {
  const flow = flowOf();
  const catalogue = catalogueOf();
  const result = check(flow, catalogue, MOCKS);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.mocks, MOCKS);
  assert.notEqual(result.mocks, MOCKS);
  assert.ok(result.mocks !== null);
  const lookup = result.mocks["lookup"];
  assert.ok(lookup !== undefined, "the copied mocks hold lookup");
  assert.notEqual(lookup, MOCKS.lookup);
  const entry = lookup[0];
  assert.ok(entry !== undefined && "output" in entry, "lookup has an output entry");
  (entry.output as unknown as { status: string }).status = "x";
  assert.equal(MOCKS.lookup[0]?.output.status, "active");
});

test("C-3e0e5412: an unreachable block node needs no mock", () => {
  const flow = flowOf();
  const catalogue = catalogueOf();
  const orphan: FlowNode = {
    kind: "block",
    uses: "erp.flag_vendor@1",
    with: { vendor_id: "v1", reason: "r" },
    next: "done",
  };
  const withOrphan: Flow = { ...flow, nodes: { ...flow.nodes, orphan } };

  const bare = check(withOrphan, catalogue, MOCKS);
  assert.deepEqual(bare.problems, []);

  const mocked = check(withOrphan, catalogue, {
    ...MOCKS,
    orphan: [{ output: { flag_id: "f1" } }],
  });
  assert.deepEqual(mocked.problems, []);
});

test("C-3e0e5412: an error entry is a well formed mock", () => {
  const result = check(flowOf(), catalogueOf(), {
    ...MOCKS,
    pay: [{ error: { code: "E_DOWN", message: "down" } }, { output: PAID }],
  });
  assert.deepEqual(result.problems, []);
  assert.ok(result.mocks !== null);
  assert.deepEqual(result.mocks["pay"], [
    { error: { code: "E_DOWN", message: "down" } },
    { output: PAID },
  ]);
});

test("C-3e0e5412: a block the catalogue lacks is not schema checked", () => {
  const result = check(flowOf(), emptyCatalogue, {
    lookup: [{ output: 5 }],
    pay: [{ output: 6 }],
  });
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.mocks, { lookup: [{ output: 5 }], pay: [{ output: 6 }] });
});

test("C-3fb317e4: absent and empty mock lists are missing problems", () => {
  const flow = flowOf();
  const catalogue = catalogueOf();

  const empty = check(flow, catalogue, {});
  assert.equal(empty.mocks, null);
  assert.deepEqual(rows(empty.problems), ["lookup null missing", "pay null missing"]);
  assert.deepEqual(details(empty.problems), ["no mock entry", "no mock entry"]);

  const noLookup = check(flow, catalogue, { lookup: [], pay: [{ output: PAID }] });
  assert.equal(noLookup.mocks, null);
  assert.deepEqual(rows(noLookup.problems), ["lookup null missing"]);
  assert.deepEqual(details(noLookup.problems), ["no mock entry"]);
});

test("C-3fb317e4: unknown nodes and non block nodes are problems", () => {
  const flow = flowOf();
  const catalogue = catalogueOf();
  const value = JSON.parse(
    '{"lookup":[{"output":{"vendor_id":"v1","status":"active"}}],"pay":[{"output":{"payment_id":"pay-1","status":"paid"}}],"ghost":[],"route":[],"__proto__":[]}',
  ) as unknown;

  const result = check(flow, catalogue, value);
  assert.equal(result.mocks, null);
  assert.deepEqual(rows(result.problems), [
    "__proto__ null unknown_node",
    "ghost null unknown_node",
    "route null not_a_block",
  ]);
  assert.deepEqual(details(result.problems), [
    "no such node",
    "no such node",
    "node is not a block",
  ]);
});

test("C-3fb317e4: schema and entry shape problems", () => {
  const flow = flowOf();
  const catalogue = catalogueOf();

  const schema = check(flow, catalogue, {
    lookup: [{ output: { status: "active" } }],
    pay: [{ output: PAID }],
  });
  assert.equal(schema.mocks, null);
  assert.deepEqual(rows(schema.problems), ["lookup 0 schema"]);
  assert.equal(schema.problems[0]?.detail, "/ required");
  assert.equal(schema.problems[0]?.detail.includes("active"), false);

  const shaped = check(flow, catalogue, {
    lookup: "x",
    pay: [
      { output: PAID, error: { code: "E", message: "m" } },
      { error: { code: "bad code", message: "m" } },
      5,
    ],
  });
  assert.equal(shaped.mocks, null);
  assert.deepEqual(rows(shaped.problems), [
    "lookup null shape",
    "pay 0 shape",
    "pay 1 shape",
    "pay 2 shape",
  ]);
  assert.deepEqual(details(shaped.problems), [
    "entries must be an array",
    "entry must be {output} or {error: {code, message}}",
    "entry must be {output} or {error: {code, message}}",
    "entry must be {output} or {error: {code, message}}",
  ]);
});

test("C-3fb317e4: a non object mocks value is one shape problem", () => {
  const flow = flowOf();
  const catalogue = catalogueOf();

  for (const mocks of [[], null] as unknown[]) {
    const result = check(flow, catalogue, mocks);
    assert.equal(result.mocks, null);
    assert.deepEqual(result.problems, [
      { nodeId: "", index: null, reason: "shape", detail: "mocks must be an object" },
    ]);
  }
});

test("C-3fb317e4: the problem list is capped at fifty", () => {
  const flow = flowOf();
  const catalogue = catalogueOf();
  const lookup = Array.from({ length: 51 }, () => ({ output: {} }));
  const result = check(flow, catalogue, { lookup, pay: [{ output: PAID }] });

  assert.equal(result.mocks, null);
  assert.equal(result.problems.length, 50);
  assert.deepEqual(
    rows(result.problems),
    Array.from({ length: 50 }, (_, index) => `lookup ${String(index)} schema`),
  );
  assert.ok(result.problems.every((problem) => problem.detail === "/ required"));
});

test("C-3fb317e4: outputs that are not JSON are shape problems", () => {
  const flow = flowOf();
  const cycle: Record<string, unknown> = {};
  cycle["self"] = cycle;
  const mocks = {
    lookup: [
      { output: () => 1 },
      { output: undefined },
      { output: new Date(0) },
      { output: cycle },
      { output: NaN },
      { output: { n: 1 } },
    ],
    pay: [{ output: PAID }],
  };

  const result = check(flow, emptyCatalogue, mocks);
  assert.equal(result.mocks, null);
  assert.deepEqual(rows(result.problems), [
    "lookup 0 shape",
    "lookup 1 shape",
    "lookup 2 shape",
    "lookup 3 shape",
    "lookup 4 shape",
  ]);
  assert.ok(result.problems.every((problem) => problem.detail === "output is not JSON"));
});
