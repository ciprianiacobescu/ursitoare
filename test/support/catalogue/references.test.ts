import assert from "node:assert/strict";
import { test } from "node:test";

import type { Catalogue } from "../../../src/authoring/index.ts";
import { loadTestCatalogue } from "./loader.ts";
import { canReach, unresolvedReferences } from "./references.ts";

function shippedCatalogue(): Catalogue {
  let result: Catalogue | undefined;
  assert.doesNotThrow(() => {
    result = loadTestCatalogue();
  });
  assert.ok(result !== undefined);
  return result;
}

function references(flow: unknown, catalogue: Catalogue): string[] {
  let result: string[] | undefined;
  assert.doesNotThrow(() => {
    result = unresolvedReferences(flow, catalogue);
  });
  assert.ok(result !== undefined);
  return result;
}

function reach(flow: unknown, target: string, avoid?: string): boolean {
  let result: boolean | undefined;
  assert.doesNotThrow(() => {
    result = avoid === undefined ? canReach(flow, target) : canReach(flow, target, avoid);
  });
  assert.ok(result !== undefined);
  return result;
}

test("C-5c24e56a Unknown names are listed known names are not", () => {
  const cat = shippedCatalogue();

  const unknownFlow = {
    start: "start",
    nodes: {
      do_ghost: { kind: "block", uses: "ghost.do@1", with: {} },
      send_mail: {
        kind: "block",
        uses: "mail.send@1",
        with: {},
        post: [{ id: "h", kind: "block", uses: "ghost.hook@1", with: {} }],
      },
      approve: {
        kind: "human.approval",
        assignee_role: "finance-approver",
        summary: "Approve",
        timeout: "PT1H",
        cases: { approved: "done", rejected: "done", timeout: "done" },
      },
      extract: {
        kind: "llm.extract",
        model_profile: "slow",
        input: {},
        instructions: "Extract",
        output_schema: { type: "object" },
      },
      archive: {
        kind: "delegate",
        target: "n8n",
        workflow: "ghost",
        with: {},
        callback_timeout: "PT1H",
      },
      sub: { kind: "subflow", flow: "notify-customer@2", with: {} },
      each: {
        kind: "foreach",
        uses: "ghost.each@1",
        subflow: "notify-customer",
        with: {},
      },
      agent: {
        kind: "agent",
        goal: "Find",
        input: {},
        tools: ["mail.send@1", "ghost.tool@1"],
        max_steps: 3,
        output_schema: { type: "object" },
      },
    },
    hooks: [
      {
        id: "r",
        match: {},
        pre: { id: "r", kind: "block", uses: "ghost.rule@1", with: {} },
      },
    ],
  };

  assert.deepEqual(references(unknownFlow, cat), [
    "block:ghost.do@1",
    "block:ghost.each@1",
    "block:ghost.hook@1",
    "block:ghost.rule@1",
    "block:ghost.tool@1",
    "delegate:n8n/ghost",
    "flow:notify-customer",
    "flow:notify-customer@2",
    "model_profile:slow",
    "role:finance-approver",
  ]);

  const knownFlow = {
    start: "a",
    nodes: {
      a: { kind: "block", uses: "mail.send@1", with: {}, next: "b" },
      b: {
        kind: "human.approval",
        assignee_role: "approver",
        summary: "Approve",
        timeout: "PT1H",
        cases: { approved: "c", rejected: "c", timeout: "c" },
      },
      c: {
        kind: "llm.extract",
        model_profile: "default",
        input: {},
        instructions: "Extract",
        output_schema: { type: "object" },
        next: "d",
      },
      d: {
        kind: "delegate",
        target: "n8n",
        workflow: "archive-invoice",
        with: {},
        callback_timeout: "PT1H",
        next: "e",
      },
      e: { kind: "subflow", flow: "notify-customer@1", with: {} },
    },
    hooks: [],
  };

  assert.deepEqual(references(knownFlow, cat), []);
  assert.deepEqual(references(null, cat), []);
  assert.deepEqual(references("x", cat), []);
  assert.deepEqual(references({}, cat), []);
  assert.deepEqual(references({ nodes: 5 }, cat), []);
});

test("C-f90d0cf1 Reachability follows successors and avoids a node", () => {
  const flow = {
    start: "a",
    nodes: {
      a: {
        kind: "switch",
        on: "route",
        cases: { p: "b", q: "c" },
        default: "c",
      },
      b: { kind: "block", uses: "mail.send@1", with: {}, next: "c" },
      c: { kind: "end", status: "completed" },
      d: { kind: "end", status: "failed" },
    },
  };

  assert.equal(reach(flow, "c"), true);
  assert.equal(reach(flow, "c", "b"), true);
  assert.equal(reach(flow, "b", "b"), false);
  assert.equal(reach(flow, "d"), false);
  assert.equal(reach(flow, "a"), true);
  assert.equal(reach(flow, "c", "a"), false);
  assert.equal(reach(flow, "ghost"), false);
  assert.equal(reach(flow, "c", "ghost"), true);

  const cycle = {
    start: "a",
    nodes: {
      a: { kind: "block", uses: "mail.send@1", with: {}, next: "b" },
      b: { kind: "block", uses: "mail.send@1", with: {}, next: "a" },
    },
  };
  assert.equal(reach(cycle, "z"), false);

  assert.equal(reach(null, "a"), false);
});
