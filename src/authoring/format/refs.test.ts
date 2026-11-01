import assert from "node:assert/strict";
import { test } from "node:test";

import type { Ref, Seg } from "./index.ts";
import {
  escapePointer,
  isSingleRef,
  parseRef,
  refToString,
  scanTemplate,
  suspiciousInterpolation,
  walkStrings,
} from "./index.ts";

function callParseRef(content: string): { ref?: Ref; error?: string } {
  let result: { ref?: Ref; error?: string } = {};
  assert.doesNotThrow(() => {
    result = parseRef(content);
  });
  return result;
}

function callScan(text: string): Seg[] {
  let result: Seg[] = [];
  assert.doesNotThrow(() => {
    result = scanTemplate(text);
  });
  return result;
}

function callSingleRef(segs: Seg[]): boolean {
  let result = false;
  assert.doesNotThrow(() => {
    result = isSingleRef(segs);
  });
  return result;
}

function callRefToString(ref: Ref): string {
  let result = "";
  assert.doesNotThrow(() => {
    result = refToString(ref);
  });
  return result;
}

function callSuspicious(text: string): string | null {
  let result: string | null = null;
  assert.doesNotThrow(() => {
    result = suspiciousInterpolation(text);
  });
  return result;
}

test("C-ef57ecc3 A reference is parsed or explained", () => {
  const valid: Array<[string, Ref]> = [
    ["inputs.invoice_id", { root: "inputs", path: ["invoice_id"] }],
    [
      "nodes.fetch.output.raw_text",
      { root: "node", id: "fetch", field: "output", path: ["raw_text"] },
    ],
    ["nodes.classify.outcome", { root: "node", id: "classify", field: "outcome", path: [] }],
    ["item", { root: "item", path: [] }],
    ["item.id", { root: "item", path: ["id"] }],
    ["hook.input.amount", { root: "hook", scope: "input", path: ["amount"] }],
    ["hook.from.id", { root: "hook", scope: "from", path: ["id"] }],
  ];

  for (const [input, expected] of valid) {
    const result = callParseRef(input);
    assert.deepEqual(result, { ref: expected }, input);
    assert.equal(callRefToString(expected), input, `${input} round-trips`);
  }

  const invalid: Array<[string, string]> = [
    ["inputs", '"inputs" needs a path, e.g. inputs.<name>'],
    [
      "nodes.a.foo",
      '"nodes.a.foo" is not a reference; use nodes.a.output.<path> or nodes.a.outcome',
    ],
    ["nodes.a.output", "nodes.a.output needs a path, e.g. nodes.a.output.<field>"],
    ["nodes.a.outcome.x", "nodes.<id>.outcome takes no further path"],
    ["nodes.A.output.x", 'invalid node id "A" in reference'],
    ["x.y", 'unknown reference root "x" (expected inputs, nodes, item or hook)'],
    [
      "hook.foo.x",
      'unknown hook scope "foo" (expected input, output, node, next or from)',
    ],
    ["hook.input", '"hook.input" needs a path, e.g. hook.input.<field>'],
    ["hook", '"hook" needs a scope and a path, e.g. hook.input.<field>'],
    ["inputs..a", 'malformed reference "inputs..a"'],
    ["inputs.a-b", 'invalid path segment in "inputs.a-b"'],
    ["", 'malformed reference ""'],
  ];

  for (const [input, expected] of invalid) {
    assert.deepEqual(callParseRef(input), { error: expected }, input);
  }
});

test("C-8c080699 Templates are scanned into segments", () => {
  const first = callScan("Pay ${{ inputs.amount }} to ${{nodes.q.output.name}}!");
  assert.deepEqual(first, [
    { type: "text", text: "Pay " },
    { type: "ref", raw: "${{ inputs.amount }}", ref: { root: "inputs", path: ["amount"] } },
    { type: "text", text: " to " },
    {
      type: "ref",
      raw: "${{nodes.q.output.name}}",
      ref: { root: "node", id: "q", field: "output", path: ["name"] },
    },
    { type: "text", text: "!" },
  ]);

  const scans: Array<[string, boolean]> = [
    ["Pay ${{ inputs.amount }} to ${{nodes.q.output.name}}!", false],
    ["${{ inputs.a }}", true],
    ["x ${{ inputs.a }}", false],
    ["plain", false],
    ["", false],
    ["${{ inputs.a", true],
    ["${{ a{b }}", true],
    ["${{ nope }}", true],
  ];

  for (const [text, expected] of scans) {
    assert.equal(callSingleRef(callScan(text)), expected, JSON.stringify(text));
  }

  assert.deepEqual(callScan(""), []);

  const unterminated = callScan("${{ inputs.a");
  assert.deepEqual(unterminated, [
    { type: "ref", raw: "${{ inputs.a", error: "unterminated ${{ (missing }})" },
  ]);

  const brace = callScan("${{ a{b }}");
  assert.deepEqual(brace, [
    { type: "ref", raw: "${{ a{b }}", error: 'unexpected brace inside reference "a{b"' },
  ]);

  const unknownRoot = callScan("${{ nope }}");
  assert.deepEqual(unknownRoot, [
    {
      type: "ref",
      raw: "${{ nope }}",
      error: 'unknown reference root "nope" (expected inputs, nodes, item or hook)',
    },
  ]);

  assert.equal(
    callSuspicious("inputs.invoice_id"),
    '"inputs.invoice_id" looks like a reference but is not wrapped in ${{ }}; it will be treated as literal text',
  );
  assert.equal(
    callSuspicious("{{ inputs.x }}"),
    '"{{ ... }}" is not reference syntax; references are written ${{ ... }}',
  );
  assert.equal(
    callSuspicious("${x}"),
    '"${ ... }" is not reference syntax; references are written ${{ ... }}',
  );
  assert.equal(callSuspicious("hello"), null);

  const visited: Array<[string, string]> = [];
  assert.doesNotThrow(() => {
    walkStrings({ "a/b": ["x", { "c~d": "y" }], n: 1 }, "", (text, path) => {
      visited.push([text, path]);
    });
  });
  assert.deepEqual(visited, [
    ["x", "/a~1b/0"],
    ["y", "/a~1b/1/c~0d"],
  ]);

  let escaped = "";
  assert.doesNotThrow(() => {
    escaped = escapePointer("a/b~");
  });
  assert.equal(escaped, "a~1b~0");
});
