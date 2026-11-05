import assert from "node:assert/strict";
import { test } from "node:test";

import type { SwitchNode } from "../../src/authoring/index.ts";
import type { NodeRuntime, RunScope } from "../../src/interpreter/index.ts";
import { runConformance } from "./node-conformance.ts";
import type { ConformanceCase } from "./node-conformance.ts";

assert.equal(typeof runConformance, "function");

interface Verdict {
  name: string;
  ok: boolean;
  detail: string;
}

const SW: SwitchNode = {
  kind: "switch",
  on: "${{ inputs.k }}",
  cases: { "2": "two", gold: "g", "true": "yes" },
  default: "dflt",
};

const R: NodeRuntime = {
  async execute(node, _ctx, services) {
    if (node.kind !== "switch") {
      throw new Error("unexpected node");
    }
    services.resolve(node.on);
    return { output: null, outcome: "a", next: "x", end: null };
  },
};

const BOOM: NodeRuntime = {
  async execute() {
    throw new Error("boom");
  },
};

const RESOLVING: RunScope = { inputs: { k: "gold" }, nodes: new Map() };
const EMPTY: RunScope = { inputs: {}, nodes: new Map() };

function verdictAt(verdicts: readonly Verdict[], index: number): Verdict {
  const found = verdicts[index];
  assert.ok(found !== undefined, `verdict ${index} is present`);
  return found;
}

test("C-b758e565 kit reports each outcome and error verdict in case order", async () => {
  const matching: ConformanceCase["expect"] = {
    outcome: { output: null, outcome: "a", next: "x", end: null },
  };
  const cases: ConformanceCase[] = [
    { name: "matching outcome", node: SW, scope: RESOLVING, mode: "mock", expect: matching },
    {
      name: "wrong next",
      node: SW,
      scope: RESOLVING,
      mode: "mock",
      expect: { outcome: { output: null, outcome: "a", next: "d", end: null } },
    },
    {
      name: "expected ref error on a resolving scope",
      node: SW,
      scope: RESOLVING,
      mode: "mock",
      expect: { error: "INTERPRETER_REF_UNRESOLVED" },
    },
    {
      name: "expected ref error on an empty scope",
      node: SW,
      scope: EMPTY,
      mode: "mock",
      expect: { error: "INTERPRETER_REF_UNRESOLVED" },
    },
    {
      name: "wrong error on an empty scope",
      node: SW,
      scope: EMPTY,
      mode: "mock",
      expect: { error: "INTERPRETER_INPUT_INVALID" },
    },
  ];

  let verdicts: Verdict[] | undefined;
  await assert.doesNotReject(async () => {
    verdicts = await runConformance("switch", R, cases);
  });
  assert.ok(verdicts !== undefined, "runConformance returned verdicts");
  const got = verdicts;

  assert.deepEqual(
    got.map((verdict) => verdict.name),
    cases.map((entry) => entry.name),
    "verdicts come back in case order",
  );

  const first = verdictAt(got, 0);
  assert.equal(first.ok, true);
  assert.equal(first.detail, "");

  const second = verdictAt(got, 1);
  assert.equal(second.ok, false);
  assert.match(second.detail, /x/);
  assert.match(second.detail, /d/);

  const third = verdictAt(got, 2);
  assert.equal(third.ok, false);
  assert.match(third.detail, /INTERPRETER_REF_UNRESOLVED/);

  const fourth = verdictAt(got, 3);
  assert.equal(fourth.ok, true);
  assert.equal(fourth.detail, "");

  const fifth = verdictAt(got, 4);
  assert.equal(fifth.ok, false);
  assert.match(fifth.detail, /INTERPRETER_REF_UNRESOLVED/);
  assert.match(fifth.detail, /INTERPRETER_INPUT_INVALID/);
});

test("C-b758e565 kit reports a foreign runtime error as unexpected", async () => {
  const cases: ConformanceCase[] = [
    {
      name: "boom",
      node: SW,
      scope: RESOLVING,
      mode: "mock",
      expect: { outcome: { output: null, outcome: "a", next: "x", end: null } },
    },
  ];

  let verdicts: Verdict[] | undefined;
  await assert.doesNotReject(async () => {
    verdicts = await runConformance("switch", BOOM, cases);
  });
  assert.ok(verdicts !== undefined, "runConformance returned verdicts");
  const only = verdictAt(verdicts, 0);
  assert.equal(only.ok, false);
  assert.match(only.detail, /^unexpected error/);
  assert.match(only.detail, /boom/);
});
