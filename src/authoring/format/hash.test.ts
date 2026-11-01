import assert from "node:assert/strict";
import { test } from "node:test";

import YAML from "yaml";

import { contentHash, isContentHash, parseFlowText } from "../index.ts";

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

const tinyFlow = {
  ursitoare: "0.1",
  flow: "tiny",
  version: "1.0.0",
  inputs: { type: "object" },
  start: "done",
  nodes: { done: { kind: "end", status: "completed" } },
};

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

function hash(doc: unknown): string {
  let result = "";
  assert.doesNotThrow(() => {
    result = contentHash(doc);
  });
  return result;
}

function isHash(value: unknown): boolean {
  let result = false;
  assert.doesNotThrow(() => {
    result = isContentHash(value);
  });
  return result;
}

function parseYaml(text: string): unknown {
  const result = parseFlowText(text, "yaml");
  if (!result.ok) assert.fail(`the YAML sample parses: ${result.error.message}`);
  return result.doc;
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

function withoutReferenceSpaces(doc: SampleFlow): SampleFlow {
  const copy = structuredClone(doc);
  const extract = copy.nodes.extract;
  if (extract === undefined) assert.fail("the sample has the extract node");
  extract.input = { text: "Total ${{nodes.fetch.output.raw_text}} due" };
  return copy;
}

test("C-eaddbece contentHash of the golden documents", () => {
  assert.equal(
    hash({ a: 1 }),
    "sha256:015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862",
  );
  assert.equal(
    hash({}),
    "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  );
  assert.equal(
    hash(tinyFlow),
    "sha256:0d2c3f8cef5b486e5c594843f5712c8ce7e9e234206ad8adeefa1a6fff70f1c9",
  );
});

test("C-eaddbece contentHash differs for a real change", () => {
  assert.notEqual(hash(tinyFlow), hash({ ...tinyFlow, description: "x" }));
});

test("C-eaddbece contentHash ignores surface key order and reference spacing", () => {
  const fromYaml = hash(parseYaml(YAML.stringify(sample)));
  const fromReversedJson = hash(JSON.parse(JSON.stringify(reverseKeys(sample))));
  const fromNoSpaces = hash(withoutReferenceSpaces(sample));

  assert.equal(fromYaml, fromReversedJson);
  assert.equal(fromReversedJson, fromNoSpaces);

  assert.notEqual(fromYaml, hash({ ...sample, expose: "mcp" }));
});

test("C-eaddbece isContentHash accepts only the sha256 content hash form", () => {
  const golden = hash({ a: 1 });
  assert.equal(isHash(golden), true);
  assert.equal(isHash(hash(tinyFlow)), true);
  assert.equal(isHash(hash(sample)), true);

  const upperDigits = `sha256:${golden.slice("sha256:".length).toUpperCase()}`;
  assert.equal(isHash(upperDigits), false);
  assert.equal(isHash(`sha256:${"a".repeat(63)}`), false);
  assert.equal(isHash(golden.slice("sha256:".length)), false);
  assert.equal(isHash(`${golden}\n`), false);
  assert.equal(isHash(42), false);
  assert.equal(isHash(null), false);
});
