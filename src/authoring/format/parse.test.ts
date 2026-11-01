import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  FlowFormat,
  FormatErrorCode,
  ParseError,
  ParseLimits,
  ParseResult,
} from "./index.ts";
import { formatOf, parseFlowText } from "./index.ts";

function callParse(
  text: string,
  format: FlowFormat,
  limits?: Partial<ParseLimits>,
): ParseResult {
  let result: ParseResult = {
    ok: false,
    error: { code: "FORMAT_JSON_SYNTAX", message: "parseFlowText was not called" },
  };
  assert.doesNotThrow(() => {
    result = parseFlowText(text, format, limits);
  });
  return result;
}

function expectOk(text: string, format: FlowFormat, limits?: Partial<ParseLimits>): unknown {
  const result = callParse(text, format, limits);
  if (!result.ok) {
    assert.fail(`expected success, got ${result.error.code}: ${result.error.message}`);
  }
  return result.doc;
}

function expectError(
  text: string,
  format: FlowFormat,
  code: FormatErrorCode,
  limits?: Partial<ParseLimits>,
): ParseError {
  const result = callParse(text, format, limits);
  if (result.ok) assert.fail(`expected ${code}, got a successful parse`);
  assert.equal(result.error.code, code);
  assert.ok(result.error.message.length > 0, "the error message is non-empty");
  assert.equal(result.error.message.includes("\n"), false, "the message has no newline");
  return result.error;
}

function callFormatOf(fileName: string): FlowFormat {
  let result: FlowFormat = "yaml";
  assert.doesNotThrow(() => {
    result = formatOf(fileName);
  });
  return result;
}

const outputSchema = {
  type: "object",
  properties: { total: { type: "number" } },
};

const sampleYaml = [
  "# four node sample",
  'ursitoare: "0.1"',
  "flow: invoice-intake",
  'version: "1.0.0"',
  "description: Intake an invoice",
  "inputs:",
  "  type: object",
  "  properties:",
  "    invoice_id:",
  "      type: string",
  "start: fetch",
  "nodes:",
  "  fetch:",
  "    kind: block",
  "    uses: invoices.get@1",
  "    with:",
  '      invoice_id: "${{ inputs.invoice_id }}"',
  "    next: extract",
  "  extract:",
  "    kind: llm.extract",
  "    input:",
  '      text: "${{ nodes.fetch.output.raw_text }}"',
  "    instructions: Extract the total",
  "    output_schema: &o",
  "      type: object",
  "      properties:",
  "        total:",
  "          type: number",
  "    next: generate",
  "  generate:",
  "    kind: llm.generate",
  "    input:",
  '      total: "${{ nodes.extract.output.total }}"',
  "    instructions: Write a summary",
  "    output_schema: *o",
  "    next: classify",
  "  classify:",
  "    kind: agent",
  "    input:",
  '      summary: "${{ nodes.generate.output.text }}"',
  "    goal: Classify the invoice",
  "    tools: []",
  "    max_steps: 3",
  "    output_schema: *o",
].join("\n");

const expectedDoc = {
  ursitoare: "0.1",
  flow: "invoice-intake",
  version: "1.0.0",
  description: "Intake an invoice",
  inputs: {
    type: "object",
    properties: { invoice_id: { type: "string" } },
  },
  start: "fetch",
  nodes: {
    fetch: {
      kind: "block",
      uses: "invoices.get@1",
      with: { invoice_id: "${{ inputs.invoice_id }}" },
      next: "extract",
    },
    extract: {
      kind: "llm.extract",
      input: { text: "${{ nodes.fetch.output.raw_text }}" },
      instructions: "Extract the total",
      output_schema: structuredClone(outputSchema),
      next: "generate",
    },
    generate: {
      kind: "llm.generate",
      input: { total: "${{ nodes.extract.output.total }}" },
      instructions: "Write a summary",
      output_schema: structuredClone(outputSchema),
      next: "classify",
    },
    classify: {
      kind: "agent",
      input: { summary: "${{ nodes.generate.output.text }}" },
      goal: "Classify the invoice",
      tools: [],
      max_steps: 3,
      output_schema: structuredClone(outputSchema),
    },
  },
};

test("C-5a870b6a YAML and JSON parse to the same document", () => {
  assert.deepEqual(callParse(sampleYaml, "yaml"), { ok: true, doc: expectedDoc });

  const json = JSON.stringify(expectedDoc);
  assert.deepEqual(callParse(json, "json"), { ok: true, doc: expectedDoc });
  assert.deepEqual(callParse(`\uFEFF${json}`, "json"), { ok: true, doc: expectedDoc });

  assert.deepEqual(callParse("", "yaml"), { ok: true, doc: null });

  assert.equal(callFormatOf("flow.JSON"), "json");
  assert.equal(callFormatOf("flow.yaml"), "yaml");
  assert.equal(callFormatOf("flow.yml"), "yaml");
  assert.equal(callFormatOf("flow"), "yaml");
});

test("C-b34a6605 Malformed text is refused with a code and a position", () => {
  const broken = expectError("a: 1\nb: [1, 2\n", "yaml", "FORMAT_YAML_SYNTAX");
  assert.equal(broken.line, 3);
  assert.equal(broken.column, 1);

  const duplicate = expectError("a: 1\na: 2\n", "yaml", "FORMAT_DUPLICATE_KEY");
  assert.equal(duplicate.line, 2);
  assert.equal(duplicate.column, 1);

  const tag = expectError("a: !foo 1\n", "yaml", "FORMAT_UNSUPPORTED_TAG");
  assert.equal(tag.line, 1);
  assert.equal(tag.column, 4);

  expectError("a: 1\n---\nb: 2\n", "yaml", "FORMAT_YAML_SYNTAX");

  const json = expectError('{"a": 1,}', "json", "FORMAT_JSON_SYNTAX");
  assert.equal(json.line, undefined);
});

test("C-9b479b34 Values that are not JSON are refused", () => {
  const cases: Array<[string, FlowFormat, string]> = [
    ["a: !!binary abc", "yaml", "/a"],
    ["a: !!timestamp 2020-01-01", "yaml", "/a"],
    ["a: !!set {x}", "yaml", "/a"],
    ["a: .nan", "yaml", "/a"],
    ["l: [1, .inf]", "yaml", "/l/1"],
    ['a: "x\\u0000y"', "yaml", "/a"],
    ['a: "\\ud800"', "yaml", "/a"],
    ['{"a":"\\ud800"}', "json", "/a"],
  ];

  for (const [text, format, path] of cases) {
    const error = expectError(text, format, "FORMAT_NOT_JSON");
    assert.equal(error.path, path, text);
  }
});

test("C-f9d80fce Size is measured in bytes before parsing", () => {
  const atLimit = "#" + "a".repeat(1048575);
  assert.deepEqual(callParse(atLimit, "yaml"), { ok: true, doc: null });
  assert.deepEqual(callParse(atLimit, "yaml", { maxBytes: -1 }), { ok: true, doc: null });

  const overLimit = "#" + "a".repeat(1048576);
  expectError(overLimit, "yaml", "FORMAT_TOO_LARGE");
  expectError(overLimit, "yaml", "FORMAT_TOO_LARGE", { maxBytes: 5000000 });

  expectError("#éééé", "yaml", "FORMAT_TOO_LARGE", { maxBytes: 8 });
  assert.deepEqual(callParse("#éééé", "yaml", { maxBytes: 9 }), { ok: true, doc: null });
});

test("C-9f520db7 Deep and self-referencing documents are refused", () => {
  expectOk("a: " + "[".repeat(63) + "]".repeat(63), "yaml");
  expectError("a: " + "[".repeat(64) + "]".repeat(64), "yaml", "FORMAT_TOO_DEEP");

  expectOk("[".repeat(64) + "]".repeat(64), "json");
  expectError("[".repeat(65) + "]".repeat(65), "json", "FORMAT_TOO_DEEP");

  expectError("a: " + "[".repeat(100000) + "]".repeat(100000), "yaml", "FORMAT_TOO_DEEP");
  expectError("[".repeat(100000) + "]".repeat(100000), "json", "FORMAT_TOO_DEEP");

  expectError("a: &x [*x]", "yaml", "FORMAT_TOO_DEEP");

  expectOk('{"a":[[[1]]]}', "json", { maxDepth: 4 });
  expectError('{"a":[[[1]]]}', "json", "FORMAT_TOO_DEEP", { maxDepth: 3 });
});

test("C-e189e07d Alias expansion is bounded", () => {
  let bomb = "l0: &l0 [1, 2, 3, 4, 5, 6, 7, 8, 9]\n";
  for (let i = 1; i <= 9; i += 1) {
    bomb += `l${i}: &l${i} [${Array(9).fill(`*l${i - 1}`).join(", ")}]\n`;
  }
  expectError(bomb, "yaml", "FORMAT_ALIAS_LIMIT");

  const tenAliases = "a: &x 1\nb: [" + Array(10).fill("*x").join(", ") + "]\n";
  assert.deepEqual(callParse(tenAliases, "yaml"), {
    ok: true,
    doc: { a: 1, b: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  });

  expectError("a: &x 1\nb: *x\n", "yaml", "FORMAT_ALIAS_LIMIT", { maxAliasCount: 0 });
  assert.deepEqual(callParse("a: &x 1\nb: *x\n", "yaml"), {
    ok: true,
    doc: { a: 1, b: 1 },
  });
});
