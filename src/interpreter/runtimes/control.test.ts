import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  EndNode,
  JsonValue,
  NodeKind,
  SwitchNode,
} from "../../authoring/index.ts";
import { nodeRuntimeFor } from "../index.ts";
import type { NodeRuntime, RunScope } from "../index.ts";
import { runConformance } from "../../../test/support/node-conformance.ts";
import type { ConformanceCase } from "../../../test/support/node-conformance.ts";

assert.equal(typeof nodeRuntimeFor, "function");
assert.equal(typeof runConformance, "function");

const SW: SwitchNode = {
  kind: "switch",
  on: "${{ inputs.k }}",
  cases: { "2": "two", gold: "g", "true": "yes" },
  default: "dflt",
};

const END_OUT: EndNode = {
  kind: "end",
  status: "completed",
  output: { id: "${{ inputs.k }}" },
};

const END_OK: EndNode = { kind: "end", status: "completed" };
const END_FAILED: EndNode = { kind: "end", status: "failed" };

interface Verdict {
  name: string;
  ok: boolean;
  detail: string;
}

function runtimeFor(kind: NodeKind): NodeRuntime {
  const runtime = nodeRuntimeFor(kind);
  assert.ok(runtime !== undefined, `no runtime registered for ${kind}`);
  assert.equal(typeof runtime.execute, "function");
  return runtime;
}

function scope(k: JsonValue): RunScope {
  return { inputs: { k }, nodes: new Map() };
}

async function run(
  kind: NodeKind,
  runtime: NodeRuntime,
  cases: ConformanceCase[],
): Promise<Verdict[]> {
  let verdicts: Verdict[] | undefined;
  await assert.doesNotReject(async () => {
    verdicts = await runConformance(kind, runtime, cases);
  });
  assert.ok(verdicts !== undefined, "runConformance returned verdicts");
  const got = verdicts;
  assert.deepEqual(
    got.map((verdict) => verdict.name),
    cases.map((entry) => entry.name),
    "verdicts come back in case order",
  );
  return got;
}

test("C-7961e8d0 switch routes own keys and falls back to the default", async () => {
  const runtime = runtimeFor("switch");
  const cases: ConformanceCase[] = [
    {
      name: "number key",
      node: SW,
      scope: scope(2),
      mode: "mock",
      expect: {
        outcome: { output: null, outcome: "2", next: "two", end: null },
      },
    },
    {
      name: "string key",
      node: SW,
      scope: scope("gold"),
      mode: "mock",
      expect: {
        outcome: { output: null, outcome: "gold", next: "g", end: null },
      },
    },
    {
      name: "boolean key",
      node: SW,
      scope: scope(true),
      mode: "mock",
      expect: {
        outcome: { output: null, outcome: "true", next: "yes", end: null },
      },
    },
    {
      name: "null key",
      node: SW,
      scope: scope(null),
      mode: "mock",
      expect: {
        outcome: { output: null, outcome: "default", next: "dflt", end: null },
      },
    },
    {
      name: "object key",
      node: SW,
      scope: scope({ a: 1 }),
      mode: "mock",
      expect: {
        outcome: { output: null, outcome: "default", next: "dflt", end: null },
      },
    },
    {
      name: "inherited key",
      node: SW,
      scope: scope("constructor"),
      mode: "mock",
      expect: {
        outcome: { output: null, outcome: "default", next: "dflt", end: null },
      },
    },
    {
      name: "missing input",
      node: SW,
      scope: { inputs: {}, nodes: new Map() },
      mode: "mock",
      expect: { error: "INTERPRETER_REF_UNRESOLVED" },
    },
  ];

  const verdicts = await run("switch", runtime, cases);
  for (const verdict of verdicts) {
    assert.equal(verdict.ok, true, `${verdict.name}: ${verdict.detail}`);
    assert.equal(verdict.detail, "");
  }
});

test("C-7961e8d0 end returns its status and its resolved output", async () => {
  const runtime = runtimeFor("end");
  const cases: ConformanceCase[] = [
    {
      name: "completed with output",
      node: END_OUT,
      scope: scope("gold"),
      mode: "mock",
      expect: {
        outcome: {
          output: { id: "gold" },
          outcome: null,
          next: null,
          end: { status: "completed" },
        },
      },
    },
    {
      name: "completed without output",
      node: END_OK,
      scope: scope("gold"),
      mode: "mock",
      expect: {
        outcome: {
          output: null,
          outcome: null,
          next: null,
          end: { status: "completed" },
        },
      },
    },
    {
      name: "failed without output",
      node: END_FAILED,
      scope: scope("gold"),
      mode: "mock",
      expect: {
        outcome: {
          output: null,
          outcome: null,
          next: null,
          end: { status: "failed" },
        },
      },
    },
  ];

  const verdicts = await run("end", runtime, cases);
  for (const verdict of verdicts) {
    assert.equal(verdict.ok, true, `${verdict.name}: ${verdict.detail}`);
    assert.equal(verdict.detail, "");
  }
});
