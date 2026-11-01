import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { loadTestFlow } from "../../../test/support/catalogue/flows.ts";
import type { FlowFormat } from "../format/index.ts";
import type { ValidationResult } from "./types.ts";
import { validateFlowText } from "./validate.ts";

const CASES_DIR = new URL("../../../test/support/flow-cases/invalid/", import.meta.url);

function caseText(name: string): string {
  const url = new URL(`${name}.yaml`, CASES_DIR);
  assert.ok(existsSync(url), `case file ${name} exists`);
  return readFileSync(url, "utf8");
}

function check(text: string, format: FlowFormat): ValidationResult {
  let result: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    result = validateFlowText(text, format, loadTestCatalogue());
  });
  assert.ok(result, "a result is returned");
  return result;
}

function assertParseFailure(result: ValidationResult, prefix: string): void {
  assert.equal(result.ok, false);
  assert.deepEqual(result.layers_run, ["L1"]);
  assert.equal(result.errors.length, 1);
  assert.deepEqual(result.warnings, []);
  const issue = result.errors[0];
  assert.ok(issue);
  assert.equal(issue.code, "L1_PARSE");
  assert.equal(issue.layer, "L1");
  assert.equal(issue.node, null);
  assert.ok(issue.message.startsWith(prefix), `message starts with ${prefix}: ${issue.message}`);
}

test("C-9c15634e A custom YAML tag is one L1_PARSE error", () => {
  const text = caseText("l1-parse-custom-tag");
  assertParseFailure(check(text, "yaml"), "FORMAT_UNSUPPORTED_TAG: ");
});

test("C-9c15634e A duplicate YAML key is one L1_PARSE error", () => {
  const text = caseText("l1-parse-duplicate-key");
  assertParseFailure(check(text, "yaml"), "FORMAT_DUPLICATE_KEY: ");
});

test("C-9c15634e Invalid YAML is one L1_PARSE error", () => {
  const text = caseText("l1-parse-invalid-yaml");
  assertParseFailure(check(text, "yaml"), "FORMAT_YAML_SYNTAX: ");
});

test("C-9c15634e Broken JSON text is one L1_PARSE error", () => {
  assertParseFailure(check("{", "json"), "FORMAT_JSON_SYNTAX: ");
});

test("C-9c15634e RF-1 as JSON text validates like RF-1 as YAML", () => {
  const flow = loadTestFlow("rf-1-invoice-intake");
  const fromJson = check(JSON.stringify(flow), "json");
  const fromYaml = check(readFileSync(
    new URL("../../../test/support/catalogue/flows/rf-1-invoice-intake.yaml", import.meta.url),
    "utf8",
  ), "yaml");
  assert.equal(fromJson.layers_run[0], "L1");
  assert.deepEqual(fromJson.errors, fromYaml.errors);
  assert.deepEqual(fromJson.warnings, fromYaml.warnings);
});
