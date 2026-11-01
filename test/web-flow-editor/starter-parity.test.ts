/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  emptyCatalogue,
  parseFlowText,
  validateFlow,
} from "../../src/authoring/index.ts";
import type { ParseResult } from "../../src/authoring/index.ts";
import type { ValidationResult } from "../../src/authoring/index.ts";
import { detectFormat, starterText } from "../../web/src/flows/versions.ts";
import type { FlowFormat } from "../../web/src/flows/versions.ts";

const STARTER = `ursitoare: "0.1"
flow: demo-flow
version: 1.0.0
inputs:
  type: object
  properties: {}
start: done
nodes:
  done:
    kind: end
    status: completed
`;

function starter(flowId: string, label: string): string {
  let text: string | undefined;
  assert.doesNotThrow(() => {
    text = starterText(flowId);
  }, `${label} is built without throwing`);
  assert.ok(text !== undefined, `${label} produced a text`);
  return text;
}

function detected(text: string, label: string): FlowFormat {
  let format: FlowFormat | undefined;
  assert.doesNotThrow(() => {
    format = detectFormat(text);
  }, `${label} is detected without throwing`);
  assert.ok(format !== undefined, `${label} produced a format`);
  return format;
}

function parsed(text: string, label: string): ParseResult {
  let result: ParseResult | undefined;
  assert.doesNotThrow(() => {
    result = parseFlowText(text, "yaml");
  }, `${label} is parsed without throwing`);
  assert.ok(result !== undefined, `${label} produced a parse result`);
  return result;
}

function validated(doc: unknown, label: string): ValidationResult {
  let result: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    result = validateFlow(doc, emptyCatalogue);
  }, `${label} is validated without throwing`);
  assert.ok(result !== undefined, `${label} produced a validation result`);
  return result;
}

test("C-f4c862cb starterText returns the reference document for demo-flow", () => {
  assert.equal(starter("demo-flow", "the demo-flow starter"), STARTER);
});

test("C-f4c862cb starterText refuses a bad flow id", () => {
  assert.throws(() => starterText("Bad_Name"), RangeError, "a bad flow id is refused");
});

test("C-f4c862cb detectFormat reads JSON only when the first non-space is a brace", () => {
  assert.equal(detected('  {"flow": "x"}', "the padded JSON text"), "json");
  assert.equal(detected("flow: x", "the YAML text"), "yaml");
  assert.equal(detected("", "the empty text"), "yaml");
});

test("C-f4c862cb the starter text is a valid flow for the engine", () => {
  const text = starter("demo-flow", "the demo-flow starter");
  const result = parsed(text, "the demo-flow starter");
  assert.equal(result.ok, true, "the starter text parses");
  if (result.ok) {
    assert.equal((result.doc as { flow?: unknown }).flow, "demo-flow");
  }
  const check = validated(result.ok ? result.doc : null, "the demo-flow starter");
  assert.equal(check.ok, true, "the starter text validates");
  assert.deepEqual(check.errors, [], "the starter text has no error");
});
