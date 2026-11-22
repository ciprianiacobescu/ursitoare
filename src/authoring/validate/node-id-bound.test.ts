import assert from "node:assert/strict";
import { test } from "node:test";

import { emptyCatalogue } from "../index.ts";
import { FLOW_ERROR_CODES } from "./codes.ts";
import { validateFlow } from "./index.ts";
import { MAX_NODE_ID_LENGTH, VALIDATOR_VERSION } from "./version.ts";

type Result = ReturnType<typeof validateFlow>;

function id(n: number): string {
  return "x" + "a".repeat(n - 1);
}

function mk(end: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ursitoare: "0.1",
    flow: "bound",
    version: "1.0.0",
    inputs: { type: "object" },
    start: "go",
    nodes: {
      go: { kind: "wait", duration: "PT1S", next: end },
      [end]: { kind: "end", status: "completed" },
    },
    ...extra,
  };
}

function hook(sel: string): Record<string, unknown> {
  return {
    id: "tag_end",
    match: { nodes: [sel] },
    pre: { id: "tag_end", kind: "code", source: "return;" },
  };
}

function run(doc: unknown): Result {
  let r: Result | undefined;
  assert.doesNotThrow(() => {
    r = validateFlow(doc, emptyCatalogue);
  });
  assert.ok(r);
  return r;
}

function brief(r: Result): string[] {
  return r.errors.map((e) => `${e.layer} ${e.code} ${e.node} ${e.path} ${e.message}`);
}

const PAT = 'must match pattern "^[a-z][a-z0-9_]{0,127}$"';

function tooLong(n: number): string[] {
  const long = id(n);
  return [
    `L1 L1_PATTERN go /nodes/go/next ${PAT}`,
    `L1 L1_PATTERN ${long} /nodes/${long} node id "${long.slice(0, 32)}…" is too long: at most 128 characters`,
  ];
}

test("C-02627857 the constants are 2 and 128 and the codes stay at 47", () => {
  assert.equal(VALIDATOR_VERSION, 2);
  assert.equal(MAX_NODE_ID_LENGTH, 128);
  assert.equal(FLOW_ERROR_CODES.length, 47);
});

test("C-02627857 lengths 1, 127 and 128 validate", () => {
  assert.equal(MAX_NODE_ID_LENGTH, 128);
  for (const n of [1, 127, 128]) {
    const r = run(mk(id(n)));
    assert.equal(r.ok, true, `length ${n}`);
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.warnings, []);
    assert.deepEqual(r.layers_run, ["L1", "L2", "L3"]);
  }
});

test("C-02627857 lengths 129 and 200 fail L1 with two L1_PATTERN errors", () => {
  for (const n of [129, 200]) {
    const r = run(mk(id(n)));
    assert.equal(r.ok, false);
    assert.deepEqual(r.layers_run, ["L1"]);
    assert.deepEqual(brief(r), tooLong(n));
  }
});

test("C-02627857 a 129-character start gives one L1_PATTERN at start", () => {
  const r = run({ ...mk("done"), start: id(129) });
  assert.equal(r.ok, false);
  assert.deepEqual(r.layers_run, ["L1"]);
  assert.deepEqual(brief(r), [`L1 L1_PATTERN null /start ${PAT}`]);
});

test("C-02627857 a reference to a 129-character node gives L1_REF_SYNTAX and 128 parses", () => {
  const withRef = (r: string): Record<string, unknown> => ({
    ...mk("done"),
    nodes: {
      go: { kind: "wait", duration: "PT1S", next: "done" },
      done: {
        kind: "end",
        status: "completed",
        output: { v: "${{ nodes." + r + ".output.v }}" },
      },
    },
  });
  const ok128 = run(withRef(id(128)));
  assert.equal(ok128.ok, false);
  assert.deepEqual(ok128.layers_run, ["L1", "L2", "L3"]);
  assert.deepEqual(
    ok128.errors.map((e) => e.code),
    ["L3_REF_UNKNOWN_NODE"],
  );
  const r = run(withRef(id(129)));
  assert.deepEqual(r.layers_run, ["L1"]);
  assert.deepEqual(brief(r), [
    `L1 L1_REF_SYNTAX done /nodes/done/output/v invalid node id "${id(129)}" in reference (in "\${{ nodes.${id(129)}.output.v }}")`,
  ]);
});

test("C-02627857 an upper-case 129-character key keeps the old message", () => {
  const long = "X" + "a".repeat(128);
  const r = run(mk(long));
  assert.deepEqual(brief(r), [
    `L1 L1_PATTERN ${long} /nodes/${long} node id "${long}" is invalid: ids are snake_case and match [a-z][a-z0-9_]*`,
    `L1 L1_PATTERN go /nodes/go/next ${PAT}`,
  ]);
});

test("C-eaac02ef a selector naming the existing 128-character node passes", () => {
  assert.equal(MAX_NODE_ID_LENGTH, 128);
  const r = run(mk(id(128), { hooks: [hook(id(128))] }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.layers_run, ["L1", "L2", "L3", "H"]);
});

test("C-eaac02ef a 129-character node named by its rule stops in L1", () => {
  const r = run(mk(id(129), { hooks: [hook(id(129))] }));
  assert.equal(r.ok, false);
  assert.deepEqual(r.layers_run, ["L1"]);
  assert.deepEqual(brief(r), tooLong(129));
});

test("C-eaac02ef a 129-character selector entry no node has is H_SCHEMA", () => {
  assert.equal(MAX_NODE_ID_LENGTH, 128);
  const r = run(mk("done", { hooks: [hook(id(129))] }));
  assert.equal(r.ok, false);
  assert.deepEqual(r.layers_run, ["L1", "L2", "L3", "H"]);
  assert.deepEqual(brief(r), [
    "H H_SCHEMA null /hooks/0/match/nodes/0 invalid entry in selector member nodes",
  ]);
});

test("C-eaac02ef a selector naming the existing node done passes", () => {
  assert.equal(VALIDATOR_VERSION, 2);
  const r = run(mk("done", { hooks: [hook("done")] }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.layers_run, ["L1", "L2", "L3", "H"]);
});
