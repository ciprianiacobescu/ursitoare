import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { caseCatalogue, flowCases } from "../../../test/support/flow-cases/index.ts";
import type { FlowCase } from "../../../test/support/flow-cases/index.ts";
import type { ValidationResult } from "./types.ts";
import { validateFlowText } from "./validate.ts";

const L2_DIR = new URL("../../../test/support/flow-cases/invalid/", import.meta.url);

function l2Cases(): FlowCase[] {
  assert.ok(existsSync(new URL("l2-unknown-block.yaml", L2_DIR)), "the l2 case files exist");
  let cases: FlowCase[] = [];
  assert.doesNotThrow(() => {
    cases = flowCases("invalid", "l2-");
  });
  return cases;
}

function validateCase(c: FlowCase): ValidationResult {
  let result: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    result = validateFlowText(c.text, c.format, caseCatalogue());
  });
  assert.ok(result, c.name);
  return result;
}

test("C-7dd08673 The l2 case files are listed with their expected codes", () => {
  const cases = l2Cases();
  assert.ok(cases.length >= 26, `at least 26 l2 case files, got ${cases.length}`);
  for (const c of cases) {
    assert.equal(c.group, "invalid");
    assert.ok(c.name.startsWith("l2-"), c.name);
    assert.ok(c.expect.length > 0, `${c.name} expects a code`);
    for (const code of c.expect) {
      assert.ok(code.startsWith("L2_"), `${c.name}: ${code}`);
    }
  }
});

test("C-7dd08673 Each l2 case yields exactly its codes in layer L2", () => {
  const cases = l2Cases();
  assert.ok(cases.length > 0);
  for (const c of cases) {
    const r = validateCase(c);
    assert.equal(r.ok, false, c.name);
    const codes = [...new Set(r.errors.map((e) => e.code))].sort();
    assert.deepEqual(codes, c.expect, c.name);
    assert.equal(r.layers_run.at(-1), "L2", c.name);
    for (const e of r.errors) {
      assert.equal(e.layer, "L2", c.name);
      assert.ok(e.code.startsWith("L2_"), c.name);
      assert.notEqual(e.message, "", c.name);
      assert.ok(e.node === null || typeof e.node === "string", c.name);
      assert.equal(typeof e.path, "string", c.name);
    }
  }
});

function codesOf(text: string, catalogue: ReturnType<typeof caseCatalogue>): string[] {
  let result: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    result = validateFlowText(text, "yaml", catalogue);
  });
  assert.ok(result);
  return [...new Set(result.errors.map((e) => e.code))].sort();
}

function caseText(name: string): string {
  let cases: FlowCase[] = [];
  assert.doesNotThrow(() => {
    cases = flowCases("invalid", name);
  });
  const found = cases.find((c) => c.name === name);
  assert.ok(found, `case file ${name} exists`);
  return found.text;
}

test("C-69e1a698 Delegate target and workflow are told apart from the catalogue", () => {
  assert.deepEqual(
    codesOf(caseText("l2-unknown-delegate-target"), caseCatalogue()),
    ["L2_UNKNOWN_DELEGATE_TARGET"],
  );
  assert.deepEqual(
    codesOf(caseText("l2-unknown-delegate-target-prototype-name"), caseCatalogue()),
    ["L2_UNKNOWN_DELEGATE_TARGET"],
  );
  assert.deepEqual(
    codesOf(caseText("l2-unknown-delegate-workflow"), caseCatalogue()),
    ["L2_UNKNOWN_DELEGATE_WORKFLOW"],
  );
  assert.deepEqual(
    codesOf(caseText("l2-unknown-delegate-workflow"), loadTestCatalogue()),
    ["L2_UNKNOWN_DELEGATE_TARGET"],
  );
  for (const name of [
    "l2-unknown-delegate-target",
    "l2-unknown-delegate-target-prototype-name",
    "l2-unknown-delegate-workflow",
  ]) {
    let result: ValidationResult | undefined;
    assert.doesNotThrow(() => {
      result = validateFlowText(caseText(name), "yaml", caseCatalogue());
    });
    assert.ok(result);
    for (const issue of result.errors) {
      assert.ok(!issue.message.includes("available"), `${name}: ${issue.message}`);
    }
  }
});
