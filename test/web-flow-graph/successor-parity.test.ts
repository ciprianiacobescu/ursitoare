/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { NODE_KINDS, successorFields } from "../../src/authoring/index.ts";
import {
  GRAPH_NODE_KINDS,
  successorTargets,
} from "../../web/src/flow-graph/layout.ts";

function targets(node: unknown, label: string): { path: string; id: unknown }[] {
  let result: { path: string; id: unknown }[] | undefined;
  assert.doesNotThrow(() => {
    result = successorTargets(node);
  }, `${label} is read`);
  assert.ok(result !== undefined, `${label} returns targets`);
  return result;
}

function fields(node: unknown): { path: string; id: unknown }[] {
  return successorFields(node).map(({ path, id }) => ({ path, id }));
}

function pairs(value: { path: string; id: unknown }[]): { path: string; id: unknown }[] {
  return value.map(({ path, id }) => ({ path, id }));
}

function nodeOf(kind: unknown): Record<string, unknown> {
  return {
    kind,
    next: "n1",
    on_timeout: "n2",
    default: "n3",
    cases: { "a/b": "n4", "c~d": "n5" },
  };
}

test("C-1616f6aa the successor table agrees with the format model", () => {
  assert.deepEqual(pairs(targets(nodeOf("block"), "block")), [{ path: "/next", id: "n1" }]);
  assert.deepEqual(pairs(targets(nodeOf("human.form"), "human.form")), [
    { path: "/next", id: "n1" },
    { path: "/on_timeout", id: "n2" },
  ]);
  assert.deepEqual(pairs(targets(nodeOf("switch"), "switch")), [
    { path: "/cases/a~1b", id: "n4" },
    { path: "/cases/c~0d", id: "n5" },
    { path: "/default", id: "n3" },
  ]);
  assert.deepEqual(pairs(targets(nodeOf("end"), "end")), []);

  for (const kind of NODE_KINDS) {
    const node = nodeOf(kind);
    assert.deepEqual(
      pairs(targets(node, kind)),
      fields(node),
      `${kind} has the same successor fields`,
    );
  }

  for (const [value, label] of [
    [nodeOf("mystery"), "an unknown kind"],
    [null, "null"],
    [7, "a number"],
    ["x", "a string"],
    [[], "an array"],
  ] as const) {
    assert.deepEqual(pairs(targets(value, label)), [], `${label} has no target`);
    assert.deepEqual(fields(value), [], `${label} has no successor field`);
  }

  assert.deepEqual(GRAPH_NODE_KINDS, NODE_KINDS);
});
