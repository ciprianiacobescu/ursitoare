import assert from "node:assert/strict";
import { test } from "node:test";

import type { SuccessorField, ValueField } from "./index.ts";
import {
  hookValueFields,
  requiredSuccessorFields,
  successorFields,
  valueFields,
} from "./index.ts";

function callValueFields(node: unknown): ValueField[] {
  let result: ValueField[] = [];
  assert.doesNotThrow(() => {
    result = valueFields(node);
  });
  return result;
}

function callHookValueFields(hook: unknown): ValueField[] {
  let result: ValueField[] = [];
  assert.doesNotThrow(() => {
    result = hookValueFields(hook);
  });
  return result;
}

function callSuccessorFields(node: unknown): SuccessorField[] {
  let result: SuccessorField[] = [];
  assert.doesNotThrow(() => {
    result = successorFields(node);
  });
  return result;
}

function callRequiredSuccessorFields(kind: string): string[] {
  let result: string[] = [];
  assert.doesNotThrow(() => {
    result = requiredSuccessorFields(kind);
  });
  return result;
}

test("C-b2c430f1 Value fields per node kind", () => {
  const block = {
    kind: "block",
    uses: "invoices.get@1",
    with: { invoice_id: "${{ inputs.invoice_id }}" },
    next: "b",
  };
  assert.deepEqual(callValueFields(block), [{ field: "with", value: block.with }]);

  const foreach = {
    kind: "foreach",
    items: "${{ inputs.rows }}",
    uses: "invoices.get@1",
    with: { invoice_id: "${{ item.id }}" },
    next: "b",
  };
  assert.deepEqual(callValueFields(foreach), [
    { field: "items", value: foreach.items },
    { field: "with", value: foreach.with },
  ]);

  const endWithOutput = { kind: "end", status: "completed", output: { ok: true } };
  assert.deepEqual(callValueFields(endWithOutput), [
    { field: "output", value: endWithOutput.output },
  ]);

  const endWithoutOutput = { kind: "end", status: "completed" };
  assert.deepEqual(callValueFields(endWithoutOutput), []);

  const approval = {
    kind: "human.approval",
    assignee_role: "approver",
    summary: "Approve ${{ inputs.invoice_id }}",
    timeout: "PT1H",
    cases: { approved: "a", rejected: "r", timeout: "t" },
  };
  assert.deepEqual(callValueFields(approval), [{ field: "summary", value: approval.summary }]);

  const switchNode = {
    kind: "switch",
    on: "${{ nodes.q.outcome }}",
    cases: { k: "a" },
    default: "d",
  };
  assert.deepEqual(callValueFields(switchNode), [{ field: "on", value: switchNode.on }]);

  const decide = {
    kind: "llm.decide",
    input: { text: "${{ inputs.text }}" },
    instructions: "Classify the text",
    outcomes: ["ok", "no"],
    cases: { ok: "a", no: "b" },
  };
  assert.deepEqual(callValueFields(decide), [{ field: "input", value: decide.input }]);

  const agent = {
    kind: "agent",
    input: { question: "${{ inputs.question }}" },
    goal: "Answer the question",
    tools: [],
    max_steps: 3,
    output_schema: { type: "object" },
  };
  assert.deepEqual(callValueFields(agent), [{ field: "input", value: agent.input }]);

  assert.deepEqual(callValueFields({ kind: "nope" }), []);
  assert.deepEqual(callValueFields(null), []);
  assert.deepEqual(callValueFields("x"), []);
});

test("C-b2c430f1 Value fields per hook kind", () => {
  const codeHook = {
    id: "h1",
    kind: "code",
    input: { amount: "${{ inputs.amount }}" },
    source: "return 1",
  };
  assert.deepEqual(callHookValueFields(codeHook), [
    { field: "input", value: codeHook.input },
  ]);

  const blockHook = {
    id: "h2",
    kind: "block",
    input: { amount: "${{ inputs.amount }}" },
    uses: "invoices.get@1",
    with: { invoice_id: "${{ hook.input.id }}" },
  };
  assert.deepEqual(callHookValueFields(blockHook), [
    { field: "input", value: blockHook.input },
    { field: "with", value: blockHook.with },
  ]);

  assert.deepEqual(callHookValueFields({ kind: "block" }), []);
});

test("C-b2c430f1 Successor fields per node kind", () => {
  assert.deepEqual(callSuccessorFields({ kind: "block", with: {}, next: "b" }), [
    { path: "/next", id: "b", producesOutput: true },
  ]);

  assert.deepEqual(
    callSuccessorFields({ kind: "human.form", next: "a", on_timeout: "t" }),
    [
      { path: "/next", id: "a", producesOutput: true },
      { path: "/on_timeout", id: "t", producesOutput: false },
    ],
  );

  assert.deepEqual(
    callSuccessorFields({ kind: "llm.decide", cases: { ok: "a", "x/y": "b" } }),
    [
      { path: "/cases/ok", id: "a", producesOutput: true },
      { path: "/cases/x~1y", id: "b", producesOutput: true },
    ],
  );

  assert.deepEqual(
    callSuccessorFields({ kind: "switch", cases: { k: "a" }, default: "d" }),
    [
      { path: "/cases/k", id: "a", producesOutput: true },
      { path: "/default", id: "d", producesOutput: true },
    ],
  );

  assert.deepEqual(
    callSuccessorFields({
      kind: "human.approval",
      cases: { approved: "a", rejected: "r", timeout: "t" },
    }),
    [
      { path: "/cases/approved", id: "a", producesOutput: true },
      { path: "/cases/rejected", id: "r", producesOutput: true },
      { path: "/cases/timeout", id: "t", producesOutput: false },
    ],
  );

  assert.deepEqual(callSuccessorFields({ kind: "end", status: "completed" }), []);
  assert.deepEqual(callSuccessorFields({ kind: "block", with: {} }), []);
  assert.deepEqual(callSuccessorFields(null), []);
});

test("C-b2c430f1 Required successor fields per node kind", () => {
  assert.deepEqual(callRequiredSuccessorFields("block"), ["next"]);
  assert.deepEqual(callRequiredSuccessorFields("human.form"), ["next", "on_timeout"]);
  assert.deepEqual(callRequiredSuccessorFields("delegate"), ["next", "on_timeout"]);
  assert.deepEqual(callRequiredSuccessorFields("switch"), []);
  assert.deepEqual(callRequiredSuccessorFields("end"), []);
});
