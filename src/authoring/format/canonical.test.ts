import assert from "node:assert/strict";
import { test } from "node:test";

import YAML from "yaml";

import type { FormatErrorCode } from "./index.ts";
import {
  FormatError,
  canonicalEqual,
  canonicalJson,
  canonicalizeFlow,
  parseFlowText,
} from "./index.ts";

interface SampleFlow {
  ursitoare: string;
  flow: string;
  version: string;
  description?: string;
  inputs: Record<string, unknown>;
  start: string;
  nodes: Record<string, Record<string, unknown>>;
  hooks?: Array<Record<string, unknown>>;
  expose?: "mcp";
}

const sample: SampleFlow = {
  ursitoare: "0.1",
  flow: "canonical-sample",
  version: "1.0.0",
  description: "d ${{  inputs.x }}",
  inputs: {
    type: "object",
    properties: { invoice_id: { type: "string" } },
  },
  start: "fetch",
  nodes: {
    fetch: {
      kind: "block",
      uses: "invoices.get@1",
      with: { invoice_id: "${{inputs.invoice_id}}" },
      post: [
        {
          id: "post-1",
          kind: "block",
          uses: "invoices.get@1",
          with: { text: "${{hook.output.summary}}" },
        },
      ],
      next: "extract",
    },
    extract: {
      kind: "llm.extract",
      input: { text: "Total ${{  nodes.fetch.output.raw_text }} due" },
      instructions: "keep   ${{ spaced }}   as is",
      output_schema: { type: "object" },
      next: "classify",
    },
    classify: {
      kind: "llm.decide",
      input: { text: "${{ nodes.extract.output.text }}" },
      instructions: "Choose an outcome",
      outcomes: ["ok", "no"],
      cases: { ok: "done", no: "done" },
    },
    done: {
      kind: "end",
      status: "completed",
    },
  },
  hooks: [
    {
      id: "rule-1",
      match: { kind: ["block"] },
      pre: {
        id: "pre-1",
        kind: "code",
        input: { a: "${{inputs.x}}" },
        source: "return   ${{ b }}",
        routes: ["ok"],
      },
    },
  ],
};

function requireNode(doc: SampleFlow, id: string): Record<string, unknown> {
  const node = doc.nodes[id];
  if (node === undefined) assert.fail(`the sample has node ${id}`);
  return node;
}

function requireHookPre(doc: SampleFlow): Record<string, unknown> {
  const rule = doc.hooks?.[0];
  if (rule === undefined) assert.fail("the sample has a hook rule");
  const pre = rule.pre;
  if (typeof pre !== "object" || pre === null || Array.isArray(pre)) {
    assert.fail("the sample hook rule has a pre hook");
  }
  return pre as Record<string, unknown>;
}

function makeChanged(mutate: (doc: SampleFlow) => void): SampleFlow {
  const copy = structuredClone(sample);
  mutate(copy);
  return copy;
}

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => reverseKeys(item));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, child]) => [key, reverseKeys(child)]),
    );
  }
  return value;
}

function parseYamlDoc(text: string): unknown {
  const result = parseFlowText(text, "yaml");
  if (!result.ok) assert.fail(`the YAML sample parses: ${result.error.message}`);
  return result.doc;
}

function canonical(doc: unknown): string {
  let result = "";
  assert.doesNotThrow(() => {
    result = canonicalJson(doc);
  });
  return result;
}

function equalPair(a: unknown, b: unknown): boolean {
  let result = false;
  assert.doesNotThrow(() => {
    result = canonicalEqual(a, b);
  });
  return result;
}

function canonicalTree(doc: unknown): unknown {
  let result: unknown = null;
  assert.doesNotThrow(() => {
    result = canonicalizeFlow(doc);
  });
  return result;
}

function expectFormatError(value: unknown, code: FormatErrorCode, path?: string): void {
  let caught: unknown;
  assert.throws(
    () => {
      canonicalJson(value);
    },
    (error: unknown) => {
      caught = error;
      return error instanceof FormatError;
    },
  );
  if (!(caught instanceof FormatError)) assert.fail("expected a FormatError");
  assert.equal(caught.code, code);
  if (path !== undefined) assert.equal(caught.path, path);
}

test("C-dd8c9820 Canonical JSON ignores order surface and reference spacing", () => {
  const yamlDoc = parseYamlDoc(YAML.stringify(sample));
  const reversedJsonDoc: unknown = JSON.parse(JSON.stringify(reverseKeys(sample)));
  const nodesReversed: SampleFlow = {
    ...sample,
    nodes: {
      done: requireNode(sample, "done"),
      classify: requireNode(sample, "classify"),
      extract: requireNode(sample, "extract"),
      fetch: requireNode(sample, "fetch"),
    },
  };

  const fromYaml = canonical(yamlDoc);
  const fromJson = canonical(reversedJsonDoc);
  const fromObject = canonical(nodesReversed);

  assert.equal(fromYaml, fromJson);
  assert.equal(fromJson, fromObject);

  for (const text of [fromYaml, fromJson, fromObject]) {
    assert.ok(text.includes("${{ inputs.invoice_id }}"), text);
    assert.ok(text.includes("${{ nodes.fetch.output.raw_text }}"), text);
    assert.ok(text.includes("${{ hook.output.summary }}"), text);
    assert.ok(text.includes("${{ inputs.x }}"), text);
    assert.ok(text.includes("keep   ${{ spaced }}   as is"), text);
    assert.ok(text.includes("return   ${{ b }}"), text);
    assert.ok(text.includes("d ${{  inputs.x }}"), text);
  }

  assert.equal(equalPair(yamlDoc, reversedJsonDoc), true);
  assert.equal(equalPair(reversedJsonDoc, nodesReversed), true);
  assert.equal(equalPair(yamlDoc, nodesReversed), true);
});

test("C-c52ba109 Canonical JSON keeps real differences and unusual keys", () => {
  const original = canonical(sample);

  const changes: Array<[string, SampleFlow]> = [
    [
      "a with literal",
      makeChanged((doc) => {
        requireNode(doc, "fetch").with = { invoice_id: "literal" };
      }),
    ],
    [
      "the order of outcomes",
      makeChanged((doc) => {
        requireNode(doc, "classify").outcomes = ["no", "ok"];
      }),
    ],
    [
      "a trailing space in source",
      makeChanged((doc) => {
        requireHookPre(doc).source = "return   ${{ b }} ";
      }),
    ],
    [
      "the description deleted",
      makeChanged((doc) => {
        delete doc.description;
      }),
    ],
    [
      "expose added",
      makeChanged((doc) => {
        doc.expose = "mcp";
      }),
    ],
    [
      "a routes entry",
      makeChanged((doc) => {
        requireHookPre(doc).routes = ["no"];
      }),
    ],
  ];

  for (const [label, changed] of changes) {
    assert.notEqual(canonical(changed), original, label);
    assert.equal(equalPair(sample, changed), false, label);
  }

  const protoDoc: unknown = JSON.parse('{"__proto__":{"x":1},"a":1}');
  assert.equal(canonical(protoDoc), '{"__proto__":{"x":1},"a":1}');
  const plain = canonical({ a: 1 });
  assert.equal(plain, '{"a":1}');
  assert.notEqual(canonical(protoDoc), plain);

  const before = structuredClone(sample);
  const tree = canonicalTree(sample);
  assert.deepEqual(sample, before);
  assert.notStrictEqual(tree, sample);
});

test("C-c757def3 Canonical form refuses what is not JSON", () => {
  expectFormatError({ a: NaN }, "FORMAT_NOT_JSON", "/a");
  expectFormatError({ a: [1, Infinity] }, "FORMAT_NOT_JSON", "/a/1");
  expectFormatError({ a: 10n }, "FORMAT_NOT_JSON", "/a");
  expectFormatError({ a: new Date(0) }, "FORMAT_NOT_JSON", "/a");
  expectFormatError({ a: new Uint8Array(1) }, "FORMAT_NOT_JSON", "/a");
  expectFormatError({ a: "x\u0000" }, "FORMAT_NOT_JSON", "/a");
  expectFormatError({ a: "\ud800" }, "FORMAT_NOT_JSON", "/a");
  expectFormatError({ a: [undefined] }, "FORMAT_NOT_JSON", "/a/0");

  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  expectFormatError(cycle, "FORMAT_TOO_DEEP");

  let deep: unknown = 1;
  for (let i = 0; i < 65; i += 1) deep = [deep];
  expectFormatError(deep, "FORMAT_TOO_DEEP");

  assert.equal(canonical({ a: undefined, b: 1 }), '{"b":1}');
});
