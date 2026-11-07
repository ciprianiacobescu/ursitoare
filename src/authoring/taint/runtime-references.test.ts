import assert from "node:assert/strict";
import { test } from "node:test";

import type { Ref } from "../format/index.ts";
import { scanTemplate } from "../format/index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { loadTestFlow, TEST_FLOW_NAMES } from "../../../test/support/catalogue/flows.ts";
import type { NodeTaint } from "./analyze.ts";
import { analyzeTaint } from "./analyze.ts";
import type { Taint } from "./labels.ts";
import type { HookTaintScope, ProducedTaint, TaintOf } from "./runtime.ts";
import { nodeInputTaint, referenceTaint, valueTaint } from "./runtime.ts";

assert.equal(typeof referenceTaint, "function");
assert.equal(typeof valueTaint, "function");
assert.equal(typeof nodeInputTaint, "function");

const N: Taint = [];
const E: Taint = ["extracted"];
const U: Taint = ["untrusted"];
const EU: Taint = ["extracted", "untrusted"];

const A_PRODUCED: ProducedTaint = {
  output: E,
  fields: Object.fromEntries([
    ["t", U],
    ["constructor", U],
  ]),
  outcome: N,
};

const B_PRODUCED: ProducedTaint = { output: N, fields: {}, outcome: E };

const taintOf: TaintOf = (nodeId: string): ProducedTaint | undefined => {
  if (nodeId === "a") return A_PRODUCED;
  if (nodeId === "b") return B_PRODUCED;
  return undefined;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function kindOf(node: unknown): string | undefined {
  return isRecord(node) && typeof node.kind === "string" ? node.kind : undefined;
}

function refOf(text: string): Ref {
  const segs = scanTemplate(text);
  const seg = segs[0];
  assert.ok(seg !== undefined && seg.type === "ref", `reference ${text}`);
  assert.ok(seg.ref !== undefined, `parsed reference ${text}`);
  return seg.ref;
}

function expectRef(label: string, text: string, expected: Taint, hook?: HookTaintScope): void {
  let result: Taint | undefined;
  assert.doesNotThrow(() => {
    result = referenceTaint(refOf(text), taintOf, hook);
  }, `${label}: referenceTaint`);
  assert.deepEqual(result, expected, label);
}

function expectValue(label: string, value: unknown, expected: Taint, hook?: HookTaintScope): void {
  let result: Taint | undefined;
  assert.doesNotThrow(() => {
    result = valueTaint(value, taintOf, hook);
  }, `${label}: valueTaint`);
  assert.deepEqual(result, expected, label);
}

function expectInput(label: string, node: unknown, expected: Taint): void {
  let result: Taint | undefined;
  assert.doesNotThrow(() => {
    result = nodeInputTaint(node, taintOf);
  }, `${label}: nodeInputTaint`);
  assert.deepEqual(result, expected, label);
}

test("C-d826722f referenceTaint and valueTaint", () => {
  const firstScope: HookTaintScope = { input: E, output: A_PRODUCED };
  const secondScope: HookTaintScope = { input: E, output: null };

  expectRef("inputs x", "${{ inputs.x }}", N);
  expectRef("item name", "${{ item.name }}", U);
  expectRef("item", "${{ item }}", U);

  expectRef("a output t", "${{ nodes.a.output.t }}", U);
  expectRef("a output z", "${{ nodes.a.output.z }}", E);
  expectRef("a output constructor", "${{ nodes.a.output.constructor }}", U);
  expectRef("a output toString", "${{ nodes.a.output.toString }}", E);
  expectRef("a outcome", "${{ nodes.a.outcome }}", N);
  expectRef("b outcome", "${{ nodes.b.outcome }}", E);
  expectRef("b output q", "${{ nodes.b.output.q }}", N);
  expectRef("ghost output x", "${{ nodes.ghost.output.x }}", U);

  let undefinedResult: Taint | undefined;
  assert.doesNotThrow(() => {
    undefinedResult = referenceTaint(undefined, taintOf);
  }, "undefined ref: referenceTaint");
  assert.deepEqual(undefinedResult, U, "undefined ref");

  for (const text of [
    "${{ hook.input.x }}",
    "${{ hook.output.t }}",
    "${{ hook.output.z }}",
    "${{ hook.node.id }}",
    "${{ hook.next.id }}",
    "${{ hook.from.id }}",
  ]) {
    expectRef(`no scope ${text}`, text, U);
  }

  expectRef("first scope hook input x", "${{ hook.input.x }}", E, firstScope);
  expectRef("first scope hook output t", "${{ hook.output.t }}", U, firstScope);
  expectRef("first scope hook output z", "${{ hook.output.z }}", E, firstScope);
  expectRef("first scope hook node id", "${{ hook.node.id }}", N, firstScope);
  expectRef("first scope hook next id", "${{ hook.next.id }}", N, firstScope);
  expectRef("first scope hook from id", "${{ hook.from.id }}", N, firstScope);

  expectRef("second scope hook input x", "${{ hook.input.x }}", E, secondScope);
  expectRef("second scope hook output t", "${{ hook.output.t }}", U, secondScope);
  expectRef("second scope hook output z", "${{ hook.output.z }}", U, secondScope);

  expectValue("plain", "plain", N);
  expectValue("number", 5, N);
  expectValue("null", null, N);
  expectValue("empty object", {}, N);
  expectValue("empty array", [], N);
  expectValue("inputs ref", "${{ inputs.x }}", N);
  expectValue("reference key only", { "${{ nodes.a.output.t }}": "plain" }, N);

  expectValue("text and a ref", "x ${{ nodes.a.output.t }}", U);
  expectValue("unknown ref", "${{ nope }}", U);
  expectValue("output without a path", "${{ nodes.a.output }}", U);
  expectValue("unterminated ref", "${{ nodes.a.output.t", U);

  expectValue("b outcome", "${{ nodes.b.outcome }}", E);
  expectValue(
    "array of a and b",
    ["${{ nodes.a.output.z }}", "${{ nodes.b.outcome }}"],
    E,
  );
  expectValue(
    "nested object",
    {
      a: "${{ inputs.x }}",
      b: ["${{ nodes.a.output.t }} and ${{ nodes.b.outcome }}", 5, null, true],
      c: "plain",
    },
    EU,
  );

  expectValue("hook input without scope", "${{ hook.input.x }}", U);
  expectValue("hook input with first scope", "${{ hook.input.x }}", E, firstScope);
});

test("C-39ab4de6 nodeInputTaint", () => {
  expectInput(
    "block with",
    {
      kind: "block",
      with: { one: "${{ nodes.a.output.t }}", two: "${{ inputs.x }}" },
    },
    U,
  );
  expectInput("code input b outcome", { kind: "code", input: { x: "${{ nodes.b.outcome }}" } }, E);
  expectInput("switch on", { kind: "switch", on: "${{ nodes.a.output.z }}" }, E);
  expectInput("end output", { kind: "end", output: { x: "${{ nodes.a.output.t }}" } }, U);
  expectInput(
    "human approval summary",
    { kind: "human.approval", summary: "${{ nodes.b.outcome }}" },
    E,
  );
  expectInput(
    "foreach items and with",
    {
      kind: "foreach",
      items: { x: "${{ nodes.b.outcome }}" },
      with: { y: "${{ nodes.a.output.t }}" },
    },
    EU,
  );
  expectInput("wait", { kind: "wait" }, N);

  expectInput(
    "llm extract unreviewed",
    { kind: "llm.extract", input: {}, context: [{ tier: "unreviewed" }] },
    U,
  );
  expectInput(
    "llm generate approved and unreviewed",
    { kind: "llm.generate", input: {}, context: [{ tier: "approved" }, { tier: "unreviewed" }] },
    U,
  );
  expectInput(
    "llm decide no tier",
    { kind: "llm.decide", input: {}, context: [{}] },
    U,
  );
  expectInput(
    "llm decide unreviewed",
    { kind: "llm.decide", input: {}, context: [{ tier: "unreviewed" }] },
    U,
  );
  expectInput("agent no tier", { kind: "agent", input: {}, context: [{}] }, U);
  expectInput(
    "agent unreviewed",
    { kind: "agent", input: {}, context: [{ tier: "unreviewed" }] },
    U,
  );

  expectInput(
    "llm generate approved only",
    { kind: "llm.generate", input: {}, context: [{ tier: "approved" }] },
    N,
  );
  expectInput("code unreviewed context", { kind: "code", input: {}, context: [{ tier: "unreviewed" }] }, N);
  expectInput(
    "block unreviewed context",
    { kind: "block", with: {}, context: [{ tier: "unreviewed" }] },
    N,
  );

  expectInput(
    "mystery with reference",
    { kind: "mystery", input: { x: "${{ nodes.a.output.t }}" } },
    N,
  );
  expectInput("number node", 5, N);
  expectInput("null node", null, N);

  expectInput(
    "code with pre hook reference",
    {
      kind: "code",
      input: {},
      pre: [{ kind: "code", input: { x: "${{ nodes.a.output.t }}" } }],
    },
    N,
  );
  expectInput(
    "code with unresolvable input",
    { kind: "code", input: { a: "${{ nope }}", b: "${{ item.x }}" } },
    U,
  );
});

test("C-5d24d025 analyzeTaint and the shared rules agree on RF-1 inputs and edges", () => {
  const catalogue = loadTestCatalogue();
  const expectedNodes: Record<string, number> = {
    "rf-1-invoice-intake": 11,
    "rf-1-core": 9,
    "rf-1-core-approval": 10,
  };
  const expectedEdges: Record<string, number> = {
    "rf-1-invoice-intake": 19,
    "rf-1-core": 14,
    "rf-1-core-approval": 17,
  };

  let nodeTotal = 0;
  let edgeTotal = 0;
  for (const name of TEST_FLOW_NAMES) {
    const flow = loadTestFlow(name);
    const analysis = analyzeTaint(flow, catalogue);
    const flowNodes = flow.nodes as unknown as Record<string, unknown>;

    const derived: TaintOf = (id: string): ProducedTaint | undefined => {
      const node: NodeTaint | undefined = analysis.nodes[id];
      if (node === undefined) return undefined;
      const kind = kindOf(flowNodes[id]);
      return {
        output: node.output,
        fields: node.fields,
        outcome: kind === "llm.decide" || kind === "human.approval" ? N : node.output,
      };
    };

    const ids = Object.keys(analysis.nodes);
    assert.equal(ids.length, expectedNodes[name], `${name}: node count`);
    nodeTotal += ids.length;

    for (const id of ids) {
      const staticNode: NodeTaint | undefined = analysis.nodes[id];
      assert.ok(staticNode, `${name}: node ${id}: analysis entry`);
      const node = flowNodes[id];
      let input: Taint | undefined;
      assert.doesNotThrow(() => {
        input = nodeInputTaint(node, derived);
      }, `${name}: node ${id}: nodeInputTaint`);
      assert.deepEqual(input, staticNode.input, `${name}: node ${id}: input`);
    }

    assert.equal(analysis.edges.length, expectedEdges[name], `${name}: edge count`);
    edgeTotal += analysis.edges.length;

    for (const edge of analysis.edges) {
      const seg = scanTemplate(edge.ref).find((candidate) => candidate.type === "ref");
      const ref = seg !== undefined && seg.type === "ref" ? seg.ref : undefined;
      let taint: Taint | undefined;
      assert.doesNotThrow(() => {
        taint = referenceTaint(ref, derived);
      }, `${name}: edge ${edge.ref}: referenceTaint`);
      assert.deepEqual(taint, edge.taint, `${name}: edge ${edge.ref}: taint`);
    }
  }

  assert.equal(nodeTotal, 30, "RF-1 node total");
  assert.equal(edgeTotal, 50, "RF-1 edge total");

  const intake = analyzeTaint(loadTestFlow("rf-1-invoice-intake"), catalogue);
  assert.deepEqual(intake.nodes["pay"]?.input, ["extracted"], "rf-1-invoice-intake pay input");
});
